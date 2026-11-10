import { NextResponse, type NextRequest } from "next/server";
import { cioSearch, constructorConfigured, debugEnabled } from "@/lib/constructor";
import { getBcProducts } from "@/lib/bigcommerce";
import { AB_SEGMENT, SEGMENT_COOKIE, abTestOn, parseSegments } from "@/lib/segments";
import { CLIENT_COOKIE, SESSION_COOKIE, sessionIdOf, type Visitor } from "@/lib/visitor";

/**
 * Debug panel, A/B tab: the same search for group A (control) and group B (the experiment segment), side by side.
 * Only available when the debug panel is (development or CIO_DEBUG=1). Uses the visitor's own client id, session and segments.
 */
export async function GET(request: NextRequest) {
  if (!debugEnabled() || !constructorConfigured()) return NextResponse.json({ error: "off" }, { status: 404 });
  const q = (request.nextUrl.searchParams.get("q") ?? "battery").trim().slice(0, 80) || "battery";
  const base = parseSegments(request.cookies.get(SEGMENT_COOKIE)?.value).filter((s) => s !== AB_SEGMENT);
  const visitor = (segments: string[]): Visitor => ({
    clientId: request.cookies.get(CLIENT_COOKIE)?.value ?? "",
    sessionId: sessionIdOf(request.cookies.get(SESSION_COOKIE)?.value),
    segments,
    url: request.headers.get("referer") ?? "",
  });
  try {
    const [a, b] = await Promise.all([
      cioSearch({ q, rows: 10, visitor: visitor(base) }, "search (group A)"),
      cioSearch({ q, rows: 10, visitor: visitor([...base, AB_SEGMENT]) }, "search (group B)"),
    ]);
    const cards = await getBcProducts([...new Set([...a.pids, ...b.pids])], "en");
    const row = (id: number) => ({ id, name: cards.get(id)?.name ?? `#${id}`, brand: cards.get(id)?.brand ?? "" });
    return NextResponse.json({ q, enabled: abTestOn(), a: a.pids.map(row), b: b.pids.map(row), calls: [...a.calls, ...b.calls] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
