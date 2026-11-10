// Browser side of Constructor tracking (behavioral events), through the official client library. Search, Browse and Autocomplete only learn
// (ranking, personalization, A/B test results, "Search Suggestions") when the storefront reports what visitors see, click and buy.
// The library keeps the visitor in cookies: `ConstructorioID_client_id` (created by the proxy so the server uses the same id) and, because we
// ask for cookie storage, `ConstructorioID_session_id` (so the server can send the browser's session id on its own calls).
import ConstructorIO from "@constructor-io/constructorio-client-javascript";
import { pushEvent } from "./cio-debug-store";
import { AB_COOKIE, SEGMENT_COOKIE, parseAbGroup, parseSegments, withExperiment } from "./segments";
import { CLIENT_COOKIE } from "./visitor-edge";

export const SECTION = "Products";

export type TrackerConfig = { apiKey: string; debug: boolean };
type Client = InstanceType<typeof ConstructorIO>;

let client: Client | undefined;
let abOn = false;

/** Turns the storefront A/B test on for tracking events (the client is created on the first event, so call this before). */
export function configureExperiment(on: boolean) { abOn = on; }

const cookie = (name: string) => document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1] ?? "";
let clientKey = "";

function getClient(cfg: TrackerConfig): Client | undefined {
  if (typeof window === "undefined" || !cfg.apiKey) return undefined;
  if (client && clientKey === cfg.apiKey) return client;
  try {
    client = new ConstructorIO({
      apiKey: cfg.apiKey,
      sendTrackingEvents: true,
      segments: withExperiment(parseSegments(cookie(SEGMENT_COOKIE)), cookie(CLIENT_COOKIE), abOn, parseAbGroup(cookie(AB_COOKIE))),
      idOptions: { session_id_storage_location: "cookie", cookie_samesite: "Lax" },
    });
    clientKey = cfg.apiKey;
    client.tracker.on("error", (data: unknown) => console.warn("[constructor] tracking error", data));
  } catch (err) {
    console.warn("[constructor] tracker failed to start:", err);
    client = undefined;
  }
  return client;
}

// The library drops every event until the visitor has done something human (mouse, scroll, key, touch), which would lose the page view of a
// first load. Events wait here until then, in order, and are sent on the first interaction.
type Job = () => void;
let waiting: Job[] = [];
let armed = false;
const HUMAN_EVENTS = ["mousemove", "mouseover", "scroll", "keydown", "touchmove", "click", "focus"];

function isBot(c: Client): boolean {
  const humanity = (c.tracker as unknown as { requests?: { humanity?: { isBot?: () => boolean } } }).requests?.humanity;
  return humanity?.isBot ? humanity.isBot() : false;
}

function whenHuman(c: Client, job: Job) {
  if (!isBot(c)) return job();
  waiting.push(job);
  if (armed) return;
  armed = true;
  const flush = () => {
    // The library's own listeners (capture phase, registered first) have marked the visitor human by now.
    setTimeout(() => {
      if (isBot(c)) return; // still not human (an automated browser): keep waiting
      HUMAN_EVENTS.forEach((e) => document.removeEventListener(e, flush, true));
      armed = false;
      const jobs = waiting;
      waiting = [];
      jobs.forEach((j) => j());
    }, 0);
  };
  HUMAN_EVENTS.forEach((e) => document.addEventListener(e, flush, true));
}

/**
 * Runs one tracking call. Tracking must never break the page, so errors are swallowed. With debugging on, every event is also recorded
 * (name, parameters) for the debug panel's Events tab.
 */
function send(cfg: TrackerConfig, name: string, summary: string, params: unknown, run: (tracker: Client["tracker"]) => unknown) {
  const c = getClient(cfg);
  if (!c) return;
  whenHuman(c, () => {
    let status = 200;
    try {
      const r = run(c.tracker);
      if (r instanceof Error) {
        status = 0;
        console.warn(`[constructor] ${name}:`, r.message);
      }
    } catch (err) {
      status = 0;
      console.warn(`[constructor] ${name} failed:`, err);
    }
    if (cfg.debug) {
      const at = Date.now();
      pushEvent({
        id: `event-${at}-${Math.random().toString(36).slice(2, 6)}`,
        label: `event: ${name}`,
        at: new Date(at).toISOString(),
        ms: 0,
        status,
        url: "tracker → ac.cnstrc.com/v2/behavioral_action/…",
        params: {},
        summary,
        response: JSON.stringify(params, null, 2),
        truncated: false,
        curl: "",
      });
    }
  });
}

/** What the page that is showing tells the tracker. The server fills it in from the Search/Browse result (result id, item ids). */
export type PageData =
  | { kind: "search"; term: string; resultId?: string; total: number; items: string[]; page: number; filters?: Record<string, string[]> }
  | { kind: "browse"; groupId: string; groupName: string; resultId?: string; total: number; items: string[]; page: number; filters?: Record<string, string[]> }
  | { kind: "product"; itemId: string; itemName: string }
  | { kind: "other" };

/** The listing on screen, so a click on a product card knows which search or browse page it came from. */
let context: PageData = { kind: "other" };
const SESSION_FLAG = "cio_session_started";

let lastView = "";

export function pageView(cfg: TrackerConfig, data: PageData) {
  context = data;
  const url = location.href;
  // React strict mode runs effects twice in development: report a view once.
  const key = `${url}|${JSON.stringify(data)}`;
  if (key === lastView) return;
  lastView = key;
  try {
    if (!sessionStorage.getItem(SESSION_FLAG)) {
      sessionStorage.setItem(SESSION_FLAG, "1");
      send(cfg, "session_start", "first page of the visit", {}, (t) => t.trackSessionStart());
    }
  } catch {
    // storage unavailable: skip session_start
  }
  const items = (ids: string[]) => ids.map((itemId) => ({ itemId }));
  if (data.kind === "search") {
    send(cfg, "search-results", `"${data.term}" · ${data.total} results`, data, (t) =>
      t.trackSearchResultsLoaded(data.term, {
        url,
        items: items(data.items),
        resultCount: data.total,
        resultPage: data.page,
        resultId: data.resultId,
        selectedFilters: data.filters,
        section: SECTION,
      }),
    );
  } else if (data.kind === "browse") {
    send(cfg, "browse-results", `${data.groupName} · ${data.total} results`, data, (t) =>
      t.trackBrowseResultsLoaded({
        url,
        filterName: "group_id",
        filterValue: data.groupId,
        items: items(data.items),
        resultCount: data.total,
        resultPage: data.page,
        resultId: data.resultId,
        selectedFilters: data.filters,
        section: SECTION,
      }),
    );
  } else if (data.kind === "product") {
    send(cfg, "item-detail", `product ${data.itemId}`, data, (t) => t.trackItemDetailLoad({ itemId: data.itemId, itemName: data.itemName, url }));
  }
}

// The search that led to a product: remembered when the visitor clicks a search result (or picks a product in the type-ahead), so the
// add-to-cart on the product page can carry the search term and Constructor can attribute the conversion to that search.
const TERM_KEY = "cio_search_term";
function rememberTerm(itemId: string, term: string) {
  try {
    sessionStorage.setItem(TERM_KEY, JSON.stringify({ itemId, term }));
  } catch {
    // storage unavailable: the conversion is sent without a term
  }
}
function recallTerm(itemId: string): string {
  try {
    const v = JSON.parse(sessionStorage.getItem(TERM_KEY) ?? "null") as { itemId?: string; term?: string } | null;
    if (v?.itemId === itemId && v.term) return v.term;
  } catch {
    // ignore
  }
  return "TERM_UNKNOWN";
}

/** A click on a product card of the current listing. */
export function itemClick(cfg: TrackerConfig, itemId: string, itemName: string) {
  const c = context;
  if (c.kind === "search") {
    rememberTerm(itemId, c.term);
    send(cfg, "search-result-click", `product ${itemId} from "${c.term}"`, { itemId, term: c.term, resultId: c.resultId }, (t) =>
      t.trackSearchResultClick(c.term, { itemId, itemName, resultId: c.resultId, section: SECTION }),
    );
  } else if (c.kind === "browse") {
    send(cfg, "browse-result-click", `product ${itemId} from ${c.groupName}`, { itemId, groupId: c.groupId, resultId: c.resultId }, (t) =>
      t.trackBrowseResultClick({ filterName: "group_id", filterValue: c.groupId, itemId, itemName, resultId: c.resultId, section: SECTION }),
    );
  }
}

/** The visitor focused the search box. */
export function inputFocus(cfg: TrackerConfig) {
  send(cfg, "focus", "search box focused", {}, (t) => t.trackInputFocus());
}

/** A suggestion (or product) was chosen in the type-ahead; `section` is the Autocomplete section it came from. */
export function autocompleteSelect(cfg: TrackerConfig, term: string, originalQuery: string, section: string, itemId?: string) {
  if (itemId) rememberTerm(itemId, originalQuery);
  send(cfg, "autocomplete-select", `"${originalQuery}" → ${term} (${section})`, { term, originalQuery, section, itemId }, (t) =>
    t.trackAutocompleteSelect(term, { originalQuery, section, itemId }),
  );
}

/** A search was submitted (Enter, or "See all results"). */
export function searchSubmit(cfg: TrackerConfig, term: string, originalQuery: string) {
  send(cfg, "search-submit", `"${term}"`, { term, originalQuery }, (t) => t.trackSearchSubmit(term, { originalQuery }));
}

/** A product was added to the cart: a conversion of type add_to_cart. */
export function addToCart(cfg: TrackerConfig, itemId: string, itemName: string, revenue: number, quantity: number) {
  send(cfg, "add-to-cart", `product ${itemId} × ${quantity}`, { itemId, revenue, quantity }, (t) =>
    t.trackConversion(recallTerm(itemId), { itemId, itemName, revenue, type: "add_to_cart", section: SECTION }),
  );
}

/** An order was placed. Revenue is the sum of the lines (Constructor attributes it to the searches and clicks that led there). */
export function purchase(cfg: TrackerConfig, orderId: string, revenue: number, lines: { itemId: string; itemName: string; price: number; count: number }[]) {
  send(cfg, "purchase", `order ${orderId} · ${revenue.toFixed(2)}`, { orderId, revenue, lines }, (t) =>
    t.trackPurchase({ orderId, revenue, section: SECTION, items: lines.map((l) => ({ itemId: l.itemId, itemName: l.itemName, price: l.price, count: l.count })) }),
  );
}
