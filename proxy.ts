import { NextResponse, type NextRequest } from "next/server";
import { localeOfCatalogRoot } from "@/lib/i18n";
import { SEGMENT_COOKIE, segmentsFromParams } from "@/lib/segments";
import { CLIENT_COOKIE, makeClientId, URL_HEADER } from "@/lib/visitor-edge";
import { parsePinned, pinnedHost, VSE_COOKIE, VSE_COOKIE_EXPIRED, VSE_COOKIE_OPTIONS, VSE_HOST } from "@/lib/vse";

/**
 * Locale routing. English (default) has clean URLs and is rewritten internally to /en/...;
 * French lives under /fr. An explicit /en prefix redirects to the clean URL so each page has one address.
 */
function route(request: NextRequest, forwarded: Headers) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];

  // Catalog URLs are translated (/products/..., /fr/produits/...). The route lives at /products, so another root is rewritten onto it
  // and the requested root travels in a header (see requestedCatalogRoot in lib/catalog-route.ts).
  const catalogRewrite = (prefix: string, rest: string) => {
    const seg = rest.split("/")[1];
    if (!seg || seg === "products" || !localeOfCatalogRoot(seg)) return null;
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/products${rest.slice(seg.length + 1)}`;
    const headers = new Headers(forwarded);
    headers.set("x-catalog-root", seg);
    return NextResponse.rewrite(url, { request: { headers } });
  };

  if (first === "fr") return catalogRewrite("/fr", pathname.slice(3) || "/") ?? NextResponse.next({ request: { headers: forwarded } });

  if (first === "en") {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/en/, "") || "/";
    return NextResponse.redirect(url, 308);
  }

  const rewritten = catalogRewrite("/en", pathname);
  if (rewritten) return rewritten;
  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { request: { headers: forwarded } });
}

/**
 * Preview deployments can pin a session to other content:
 *  - `?vse=<domain>`: Amplience preview apps pass a virtual staging domain frozen at the date or edition being previewed;
 *  - `?time=<date or ISO time>`: travel to that moment yourself (needs `AMPLIENCE_TIME_TOKEN`; the banner then lets you move on);
 *  - `?vse=reset` or `?time=now`: back to the latest saved content.
 * Stored in a cookie so the whole session reads that content. Ignored in production.
 */
export function proxy(request: NextRequest) {
  // Visitor identity for Constructor (personalization, A/B tests, analytics): create the client id cookie on the first request and hand it,
  // and the page URL, to the server components of this same request (the Set-Cookie only reaches the browser afterwards).
  const existing = request.cookies.get(CLIENT_COOKIE)?.value;
  const fresh = existing ? undefined : makeClientId();
  const forwarded = new Headers(request.headers);
  if (fresh) forwarded.set("cookie", [request.headers.get("cookie"), `${CLIENT_COOKIE}=${fresh}`].filter(Boolean).join("; "));
  forwarded.set(URL_HEADER, request.url);
  // `?segment=garage` (several allowed, `segment=none` clears) picks the visitor's demo segments: keep them in a cookie and let this request see them.
  const chosen = segmentsFromParams(request.nextUrl.searchParams.getAll("segment"));
  if (chosen) {
    const others = (forwarded.get("cookie") ?? "").split(/;\s*/).filter((c) => c && !c.startsWith(`${SEGMENT_COOKIE}=`));
    forwarded.set("cookie", [...others, ...(chosen.length ? [`${SEGMENT_COOKIE}=${chosen.join(",")}`] : [])].join("; "));
  }
  const response = handle(request, forwarded);
  if (chosen) response.headers.append("set-cookie", `${SEGMENT_COOKIE}=${chosen.join(",")}; Path=/; Max-Age=${chosen.length ? 86400 : 0}; SameSite=Lax`);
  // The Constructor browser library reads this cookie (same name and format) and keeps using the id.
  if (fresh) response.headers.append("set-cookie", `${CLIENT_COOKIE}=${fresh}; Path=/; Max-Age=31536000; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return response;
}

function handle(request: NextRequest, forwarded: Headers) {
  if (!process.env.AMPLIENCE_DELIVERY_HOST?.includes("staging")) return route(request, forwarded);
  const params = request.nextUrl.searchParams;
  const vse = params.get("vse");
  const time = params.get("time");
  if (!vse && !time) return route(request, forwarded);

  // Apply the parameter once, then redirect to the clean URL: later requests (including Server Actions posted to
  // this URL) must not re-apply it over a time chosen in the banner.
  const clean = request.nextUrl.clone();
  clean.searchParams.delete("vse");
  clean.searchParams.delete("time");
  const response = NextResponse.redirect(clean, 307);
  if (vse === "reset" || time === "now") {
    response.cookies.set(VSE_COOKIE, "", VSE_COOKIE_EXPIRED);
  } else if (vse && VSE_HOST.test(vse)) {
    response.cookies.set(VSE_COOKIE, vse, VSE_COOKIE_OPTIONS);
  } else if (time) {
    const ts = Date.parse(time);
    const base = process.env.AMPLIENCE_DELIVERY_HOST.split(".")[0];
    const token = parsePinned(request.cookies.get(VSE_COOKIE)?.value ?? "")?.token ?? process.env.AMPLIENCE_TIME_TOKEN;
    if (!Number.isNaN(ts) && token) response.cookies.set(VSE_COOKIE, pinnedHost(base, token, ts), VSE_COOKIE_OPTIONS);
  }
  return response;
}

export const config = {
  // Skip Next internals, the Amplience visualization route and any path with a file extension (images, favicon, etc.)
  matcher: ["/((?!_next|api|preview|.*\\..*).*)"],
};
