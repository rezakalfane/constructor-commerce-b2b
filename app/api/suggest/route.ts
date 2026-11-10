import { NextResponse, type NextRequest } from "next/server";
import { cioSearch, cioSuggest, completeFrom, constructorConfigured, debugEnabled, localStep } from "@/lib/constructor";
import type { CioCall } from "@/lib/cio-types";
import { FACET_NAMES, formatPrice, getBcProducts, getCategoryTree, productHref, type CategoryNode } from "@/lib/bigcommerce";
import { contentIndexStats, searchContent, type ContentHit } from "@/lib/content-search";
import { AB_COOKIE, SEGMENT_COOKIE, abTestOn, parseAbGroup, parseSegments, withExperiment } from "@/lib/segments";
import { CLIENT_COOKIE, SESSION_COOKIE, sessionIdOf, type Visitor } from "@/lib/visitor";
import { DEFAULT_LOCALE, isLocale, localePath, localizeRedirect, translateSpec } from "@/lib/i18n";

export type SuggestResponse = {
  q: string;
  /** The query the products were found with (the typed text, or its completion when it was a partial word). */
  usedQuery: string;
  total: number;
  queries: string[];
  products: { id: number; title: string; brand?: string; price: string; image?: string; href: string }[];
  brands: { name: string; count: number }[];
  /** Attribute values that match what was typed, e.g. Technology: Alkaline. `name` is the filter's attribute, `value` the raw value. */
  attributes: { name: string; label: string; value: string; display: string; count: number }[];
  categories: { name: string; count: number; href: string }[];
  /** FAQ answers, buying guides and blog posts matching the text (links already in the visitor's language). */
  content: ContentHit[];
  /** A redirect rule matched what was typed: offer the page it points to. */
  redirect?: { url: string };
  /** The Constructor calls made for this request (only when debugging is on). */
  debug?: CioCall[];
};

/** Facet values (Technology, Voltage, Warranty) that contain a word of the query: "alkaline" -> Technology: Alkaline, "12v" -> Voltage: 12 V. */
function matchingAttributes(facets: Record<string, { name: string; count: number }[]>, query: string, locale: Parameters<typeof translateSpec>[0]) {
  const squash = (x: string) => x.toLowerCase().replace(/[\s/-]+/g, "");
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 2).map(squash);
  return FACET_NAMES.flatMap((name) =>
    (facets[name.toLowerCase()] ?? [])
      .filter((v) => words.some((w) => squash(v.name).includes(w)))
      .map((v) => ({ name, label: translateSpec(locale, name, "").name, value: v.name, display: translateSpec(locale, name, v.name).value, count: v.count })),
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

const flatten = (nodes: CategoryNode[]): CategoryNode[] => nodes.flatMap((n) => [n, ...flatten(n.children)]);

/**
 * Type-ahead for the search box: query suggestions (Autocomplete, else completions of the word being typed), the top
 * products (Constructor order, BigCommerce card data), and the brands and categories the matches fall in.
 * Credentials never leave the server.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const localeParam = request.nextUrl.searchParams.get("locale") ?? DEFAULT_LOCALE;
  const locale = isLocale(localeParam) ? localeParam : DEFAULT_LOCALE;
  const empty: SuggestResponse = { q, usedQuery: q, total: 0, queries: [], products: [], brands: [], attributes: [], content: [], categories: [] };
  if (q.length < 2 || !constructorConfigured()) return NextResponse.json(empty);

  try {
    // The visitor of the search box: the cookies travel with this request.
    const clientId = request.cookies.get(CLIENT_COOKIE)?.value ?? "";
    const visitor: Visitor = {
      clientId,
      sessionId: sessionIdOf(request.cookies.get(SESSION_COOKIE)?.value),
      segments: withExperiment(parseSegments(request.cookies.get(SEGMENT_COOKIE)?.value), clientId, abTestOn(), parseAbGroup(request.cookies.get(AB_COOKIE)?.value)),
      url: request.headers.get("referer") ?? "",
    };
    // Autocomplete matches prefixes, so its products also tell us how to complete a partial word ("exi" -> "exide").
    const suggested = await cioSuggest(q, visitor, 10);
    const completions = completeFrom(q, suggested.products);
    const lastWord = q.toLowerCase().split(/\s+/).pop() ?? "";
    const isWord = suggested.products.some((p) => `${p.brand} ${p.name}`.toLowerCase().split(/[^a-z0-9]+/).includes(lastWord));
    const queries = [...new Set([...suggested.queries, ...completions])].slice(0, 5);

    // Products for what was typed; for a partial word ("exi") use its best completion ("exide"), which is also what Enter would
    // find. A complete word is searched as typed.
    let usedQuery = !isWord && completions[0] ? completions[0] : q;
    const calls: CioCall[] = [...suggested.calls];
    if (debugEnabled()) {
      calls.push(localStep("completion", `"${q}" ${isWord ? "is a catalog word" : "is a partial word"} → ${completions.length ? completions.slice(0, 3).join(", ") : "no completions"}`, { typed: q, isWord, completions }));
    }
    let result = await cioSearch({ q: usedQuery, rows: 5, visitor }, "type-ahead search");
    calls.push(...result.calls);
    if (!result.total && completions[0] && usedQuery !== completions[0]) {
      usedQuery = completions[0];
      result = await cioSearch({ q: usedQuery, rows: 5, visitor }, "type-ahead search (retry with completion)");
      calls.push(...result.calls);
    }

    // Product suggestions from Autocomplete (it matches partial words); otherwise the top search results.
    const pids = suggested.pids.length ? suggested.pids.slice(0, 5) : result.pids;
    const [cards, tree, content] = await Promise.all([getBcProducts(pids, locale), getCategoryTree(locale), searchContent(locale, usedQuery, 4)]);
    if (debugEnabled()) {
      const indexed = await contentIndexStats(locale);
      calls.push(localStep("content search (FAQ, guides, blog)", `${content.length} match${content.length === 1 ? "" : "es"} for "${usedQuery}" in ${indexed.faq} FAQ, ${indexed.guide} guides, ${indexed.post} posts`, { indexed, content }));
    }
    const byId = new Map(flatten(tree).map((n) => [n.entityId, n]));

    return NextResponse.json({
      q,
      usedQuery,
      total: result.total,
      queries,
      products: pids.flatMap((id) => {
        const p = cards.get(id);
        return p
          ? [{ id, title: p.name, brand: p.brand, price: formatPrice(locale, p.salePrice ?? p.price), image: p.image?.url, href: localePath(locale, productHref(p.path)) }]
          : [];
      }),
      brands: (result.facets.brand ?? []).slice(0, 4),
      attributes: matchingAttributes(result.facets, usedQuery, locale),
      redirect: result.redirect ? { url: localizeRedirect(result.redirect.url, locale, request.headers.get("host") ?? undefined) } : undefined,
      content: content.map((c) => ({ ...c, href: localePath(locale, c.href) })),
      // Only categories that actually narrow the matches: skip the root and the ones that hold every match.
      categories: result.categories
        .filter((c) => byId.has(c.id) && c.count < result.total)
        .slice(0, 4)
        .map((c) => ({ name: byId.get(c.id)!.name, count: c.count, href: localePath(locale, productHref(byId.get(c.id)!.path)) })),
      debug: debugEnabled() ? calls : undefined,
    } satisfies SuggestResponse);
  } catch (err) {
    console.error("[suggest] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(empty);
  }
}
