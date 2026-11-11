import { NextResponse, type NextRequest } from "next/server";
import { constructorConfigured, debugEnabled } from "@/lib/constructor";
import { CLIENT_COOKIE, SESSION_COOKIE, sessionIdOf } from "@/lib/visitor";

/**
 * Debug panel, A/B tab: which group Constructor's own A/B test (Analytics → A/B Testing) puts this visitor in.
 * One search with the visitor's own client id; the response says in `request.features` whether the tested global rules are switched off for
 * this visitor (`disable_test_only_global_rules_search`: true = group B, the rule is off; false = group A or no test running).
 * Only available when the debug panel is (development or CIO_DEBUG=1).
 */
export async function GET(request: NextRequest) {
  if (!debugEnabled() || !constructorConfigured()) return NextResponse.json({ error: "off" }, { status: 404 });
  const clientId = request.cookies.get(CLIENT_COOKIE)?.value ?? "";
  if (!clientId) return NextResponse.json({ clientId: "", group: null });
  const qs = new URLSearchParams({
    key: process.env.CONSTRUCTOR_INDEX_KEY ?? "",
    i: clientId,
    s: String(sessionIdOf(request.cookies.get(SESSION_COOKIE)?.value)),
    c: "storefront-debug",
    section: "Products",
    num_results_per_page: "1",
  });
  try {
    const res = await fetch(`https://ac.cnstrc.com/search/battery?${qs}`, { cache: "no-store" });
    const json = (await res.json()) as { request?: { features?: Record<string, boolean> } };
    const features = json.request?.features ?? {};
    const off = features.disable_test_only_global_rules_search;
    return NextResponse.json({ clientId, group: off === undefined ? null : off ? "b" : "a", features: { disable_test_only_global_rules_search: off, a_a_test: features.a_a_test } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
