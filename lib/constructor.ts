// Server-only Constructor client: Search, Browse and Autocomplete APIs (listing, facets, filters, sort, type-ahead).
// Constructor decides *which* products match and in what order; BigCommerce still renders the cards (live price, image, localized path).
// Item ids in the Constructor index are BigCommerce product ids, category (item group) ids are slugs carrying `data.bc_category_id`.
// The index key is public (it is also used by the browser tracker); the API token is never needed by the storefront.
// Every call is recorded (request, timing, response) so the debug panel can show exactly what was asked.
import type { CioCall } from "./cio-types";
import type { Visitor } from "./visitor";

const BASE = "https://ac.cnstrc.com";
const SECTION = "Products";
const RESPONSE_LIMIT = 60_000;

/** The debug panel is on in development and when CIO_DEBUG=1. Calls are only recorded (and sent to the browser) when it is. */
export const debugEnabled = () => process.env.CIO_DEBUG === "1" || process.env.NODE_ENV !== "production";

export const constructorConfigured = () => Boolean(process.env.CONSTRUCTOR_INDEX_KEY);

export type CioSort = "relevance" | "price_asc" | "price_desc" | "name_asc";
const SORT: Record<CioSort, { by: string; order: string } | undefined> = {
  relevance: undefined,
  price_asc: { by: "price", order: "ascending" },
  price_desc: { by: "price", order: "descending" },
  name_asc: { by: "name", order: "ascending" },
};

export type CioQuery = {
  q?: string;
  /** BigCommerce category id; mapped to the Constructor item group (which includes its subcategories). */
  categoryId?: number;
  brands?: string[];
  /** Attribute facet values keyed by facet name (lowercase), e.g. { technology: ["AGM"] }. */
  attrs?: Record<string, string[]>;
  min?: number;
  max?: number;
  sort?: CioSort;
  start?: number;
  rows?: number;
  /** Who is asking: client id, session id and segments (personalization, A/B tests and analytics depend on it). */
  visitor?: Visitor;
};

export type CioFacetValue = { name: string; count: number };
export type CioCategory = { id: number; name: string; count: number };
export type CioResult = {
  total: number;
  /** BigCommerce product ids, in Constructor's order. */
  pids: number[];
  facets: Record<string, CioFacetValue[]>;
  /** Facet names in the order Constructor returned them (facet rules and campaigns decide it). */
  order: string[];
  /** Item groups the matches fall in (search only; a browse page has its own category). */
  categories: CioCategory[];
  /** A redirect rule matched the query: send the visitor to this URL instead of listing results. */
  redirect?: { url: string };
  /** Id of this result set: tracking events must carry it so Constructor can attribute clicks and purchases. */
  resultId?: string;
  /** The Constructor group (category) this page browses, when it did. */
  groupId?: string;
  /** The calls made to produce this result (empty unless debugging is on). */
  calls: CioCall[];
};

type RawItem = { value?: string; data?: { id?: string; group_id?: string; [k: string]: unknown } };
type RawFacet = {
  name: string;
  type: string;
  options?: { value: string; count: number; display_name?: string }[];
};
type RawGroup = { group_id: string; display_name: string; count?: number; data?: { bc_category_id?: number }; children?: RawGroup[] };
type RawResponse = {
  response?: {
    total_num_results?: number;
    results?: RawItem[];
    facets?: RawFacet[];
    groups?: RawGroup[];
    redirect?: { data?: { url?: string } };
  };
  result_id?: string;
  sections?: Record<string, RawItem[]>;
  total_num_results_per_section?: Record<string, number>;
};

const flattenGroups = (gs: RawGroup[]): RawGroup[] => gs.flatMap((g) => [g, ...flattenGroups(g.children ?? [])]);

function params(extra: Record<string, string | string[] | undefined>, visitor?: Visitor) {
  const qs = new URLSearchParams({
    key: process.env.CONSTRUCTOR_INDEX_KEY ?? "",
    c: "cio-b2b-storefront",
    // The browser tracker uses the same client id (cookie `ConstructorioID_client_id`); the session id follows the tracker's session cookie.
    i: visitor?.clientId || "server",
    s: String(visitor?.sessionId || 1),
  });
  for (const seg of visitor?.segments ?? []) qs.append("us", seg);
  for (const [k, v] of Object.entries(extra)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) qs.append(k, x);
  return qs;
}

// ------------------------------------------------------------------ recorded fetch
const shell = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

function summarize(j: RawResponse | null): string {
  if (!j) return "no JSON body";
  const parts: string[] = [];
  const r = j.response;
  if (r) {
    parts.push(`${r.total_num_results ?? 0} results, ${r.results?.length ?? 0} returned`);
    parts.push(`facets: ${(r.facets ?? []).map((f) => f.name).join(", ") || "none"}`);
    if (r.redirect?.data?.url) parts.push(`REDIRECT rule → ${r.redirect.data.url}`);
  }
  if (j.sections) parts.push(Object.entries(j.sections).map(([s, items]) => `${items.length} ${s}`).join(", "));
  return parts.join(" · ");
}

async function cioFetch(label: string, path: string, qs: URLSearchParams): Promise<{ status: number; json: RawResponse | null; call?: CioCall }> {
  const started = Date.now();
  const res = await fetch(`${BASE}${path}?${qs}`, { cache: "no-store" });
  const text = await res.text();
  const ms = Date.now() - started;
  let json: RawResponse | null = null;
  try {
    json = JSON.parse(text) as RawResponse;
  } catch {
    // not JSON (an error page); the raw text is kept in the call
  }
  if (!debugEnabled()) return { status: res.status, json };

  const shown: Record<string, string[]> = {};
  for (const [k, v] of qs) (shown[k] ??= []).push(k === "key" ? "•••" : v);
  const pretty = json ? JSON.stringify(json, null, 2) : text;
  const call: CioCall = {
    id: `${started}-${Math.random().toString(36).slice(2, 7)}`,
    label,
    at: new Date(started).toISOString(),
    ms,
    status: res.status,
    url: `${BASE}${path}?${qs}`.replace(/key=[^&]*/, "key=•••"),
    params: shown,
    summary: summarize(json),
    response: pretty.slice(0, RESPONSE_LIMIT),
    truncated: pretty.length > RESPONSE_LIMIT,
    curl: `curl -G ${shell(`${BASE}${path}`)} \\\n${[...qs].map(([k, v]) => `  --data-urlencode ${shell(`${k}=${v}`)}`).join(" \\\n")}`,
  };
  return { status: res.status, json, call };
}

// ------------------------------------------------------------------ BigCommerce category <-> item group
let tree: { at: number; byBc: Map<number, string>; byGroup: Map<string, number> } | undefined;

/** Item groups carry the BigCommerce category id (`data.bc_category_id`); read the tree once and cache it. */
async function groupTree() {
  if (tree && Date.now() - tree.at < 10 * 60_000) return tree;
  const byBc = new Map<number, string>();
  const byGroup = new Map<string, number>();
  try {
    const qs = params({ section: SECTION, num_results_per_page: "1", "fmt_options[groups_max_depth]": "4", "fmt_options[groups_start]": "current" });
    const res = await fetch(`${BASE}/browse/group_id/all?${qs}`, { cache: "no-store" });
    if (res.ok) {
      const j = (await res.json()) as RawResponse;
      for (const g of flattenGroups(j.response?.groups ?? [])) {
        const id = g.data?.bc_category_id;
        if (id) {
          byBc.set(id, g.group_id);
          byGroup.set(g.group_id, id);
        }
      }
    }
  } catch (err) {
    console.error("[constructor] group tree failed:", err instanceof Error ? err.message : err);
  }
  if (byBc.size) tree = { at: Date.now(), byBc, byGroup };
  return { at: Date.now(), byBc, byGroup };
}

// ------------------------------------------------------------------ search and browse
/**
 * Search (text) or Browse (a category alone). Brands and attribute values of one facet combine with OR, different facets with AND.
 * A text search inside a category filters on `group_id`.
 */
export async function cioSearch(opts: CioQuery, label = "search"): Promise<CioResult> {
  const { q, categoryId, brands, attrs, min, max, sort = "relevance", start = 0, rows = 24, visitor } = opts;
  const groupId = categoryId ? (await groupTree()).byBc.get(categoryId) : undefined;
  // No text: browse the category, or the root group "all" for the whole catalog.
  const browse = !q;
  const browseId = groupId ?? "all";

  const extra: Record<string, string | string[] | undefined> = {
    section: SECTION,
    num_results_per_page: String(rows),
    page: String(Math.floor(start / rows) + 1),
    // Groups (with counts) for the "categories that narrow the matches" suggestions, two levels below the root.
    "fmt_options[groups_max_depth]": "2",
    "fmt_options[groups_start]": "current",
  };
  const s = SORT[sort];
  if (s) {
    extra.sort_by = s.by;
    extra.sort_order = s.order;
  }
  if (brands?.length) extra["filters[brand]"] = brands;
  for (const [name, values] of Object.entries(attrs ?? {})) if (values.length) extra[`filters[${name}]`] = values;
  if (min != null || max != null) extra["filters[price]"] = `${min ?? "-inf"}-${max ?? "inf"}`;
  if (q && groupId) extra["filters[group_id]"] = groupId;

  const path = browse ? `/browse/group_id/${encodeURIComponent(browseId)}` : `/search/${encodeURIComponent(q || "*")}`;
  const { status, json: j, call } = await cioFetch(label, path, params(extra, visitor));
  if (status < 200 || status >= 300 || !j) throw new Error(`Constructor ${browse ? "browse" : "search"} ${status}`);

  const r = j.response ?? {};
  const out: CioResult = {
    total: r.total_num_results ?? 0,
    pids: (r.results ?? []).map((d) => Number(d.data?.id)).filter(Number.isFinite),
    facets: {},
    order: [],
    categories: [],
    redirect: r.redirect?.data?.url ? { url: r.redirect.data.url } : undefined,
    resultId: j.result_id,
    groupId: browse ? browseId : undefined,
    calls: call ? [call] : [],
  };
  for (const f of r.facets ?? []) {
    // Range facets (price, capacity, CCA) have no options; the storefront's price filter is its own form.
    if (f.type === "range" || !f.options?.length) continue;
    out.facets[f.name] = f.options.map((o) => ({ name: o.value, count: o.count }));
    out.order.push(f.name);
  }
  const byGroup = (await groupTree()).byGroup;
  out.categories = flattenGroups(r.groups ?? [])
    .filter((g) => g.group_id !== "all" && byGroup.has(g.group_id))
    .map((g) => ({ id: byGroup.get(g.group_id)!, name: g.display_name, count: g.count ?? 0 }));
  return out;
}

// ------------------------------------------------------------------ autocomplete
export type CioSuggestion = { queries: string[]; pids: number[]; products: { id: number; name: string; brand: string }[]; calls: CioCall[] };

/**
 * Autocomplete: Search Suggestions (learned from searches and behavior; empty until there are some) and Products (prefix matching, so a
 * partial word like "exi" already finds Exide). Never throws.
 */
export async function cioSuggest(q: string, visitor?: Visitor, productCount = 5): Promise<CioSuggestion> {
  const none: CioSuggestion = { queries: [], pids: [], products: [], calls: [] };
  try {
    const qs = params({ [`num_results_${SECTION}`]: String(productCount), "num_results_Search Suggestions": "5" }, visitor);
    const { status, json: j, call } = await cioFetch("autocomplete", `/autocomplete/${encodeURIComponent(q)}`, qs);
    const calls = call ? [call] : [];
    if (status < 200 || status >= 300 || !j) return { ...none, calls };
    const items = j.sections?.[SECTION] ?? [];
    return {
      queries: [...new Set((j.sections?.["Search Suggestions"] ?? []).map((s) => String(s.value ?? "").trim()).filter(Boolean))],
      pids: items.map((d) => Number(d.data?.id)).filter(Number.isFinite),
      products: items.map((d) => ({ id: Number(d.data?.id), name: String(d.value ?? ""), brand: String(d.data?.brand ?? "") })).filter((p) => Number.isFinite(p.id)),
      calls,
    };
  } catch (err) {
    console.error("[constructor] autocomplete failed:", err instanceof Error ? err.message : err);
    return none;
  }
}

// ------------------------------------------------------------------ partial-word completion
// Search matches whole words ("exi" finds nothing, "exide" does) while Autocomplete matches prefixes. To search for what Enter would find,
// the word being typed is completed from the names and brands of the products Autocomplete returns.
const STOP = new Set(["the", "for", "and", "with", "from", "pack", "set"]);

/** Completes the last word of `q` ("agm bat" -> ["agm battery", "agm batteries"]) from the suggested products, most common first. */
export function completeFrom(q: string, products: { name: string; brand: string }[], max = 5): string[] {
  const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const last = tokens.pop();
  if (!last || last.length < 2) return [];
  const counts = new Map<string, number>();
  for (const p of products) {
    const seen = new Set<string>();
    for (const w of `${p.brand} ${p.name}`.toLowerCase().split(/[^a-z0-9]+/)) {
      if (w.length >= 3 && /[a-z]/.test(w) && !STOP.has(w) && w.startsWith(last) && w !== last && !seen.has(w)) {
        seen.add(w);
        counts.set(w, (counts.get(w) ?? 0) + 1);
      }
    }
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .slice(0, max)
    .map(([w]) => [...tokens, w].join(" "));
}

/** A debug entry for work done inside the storefront, not by a Constructor call (e.g. completing a partial word). */
export function localStep(label: string, summary: string, detail: unknown): CioCall {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label,
    at: new Date().toISOString(),
    ms: 0,
    status: 0,
    url: "(computed in the storefront, no request)",
    params: {},
    summary,
    response: JSON.stringify(detail, null, 2),
    truncated: false,
    curl: "",
  };
}

/** Search, and if the text matches nothing (a partial word), search again with its best completion from Autocomplete. */
export async function cioSearchSmart(opts: CioQuery): Promise<CioResult & { usedQuery?: string }> {
  const first = await cioSearch(opts);
  if (first.total || !opts.q) return { ...first, usedQuery: opts.q };
  const suggested = await cioSuggest(opts.q, opts.visitor, 10);
  const [alt] = completeFrom(opts.q, suggested.products);
  if (!alt) return { ...first, calls: [...first.calls, ...suggested.calls], usedQuery: opts.q };
  const second = await cioSearch({ ...opts, q: alt }, "search (retry with completed word)");
  const note = debugEnabled() ? [localStep("completion", `"${opts.q}" found nothing → searching "${alt}"`, { typed: opts.q, completed: alt })] : [];
  return { ...second, calls: [...first.calls, ...suggested.calls, ...note, ...second.calls], usedQuery: alt };
}
