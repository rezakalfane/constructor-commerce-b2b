"use client";

import { useState } from "react";
import { AB_COOKIE, AB_SEGMENT, abBucket, abGroup, parseAbGroup, parseSegments, SEGMENT_COOKIE, withExperiment, type AbGroup } from "@/lib/segments";
import { CLIENT_COOKIE } from "@/lib/visitor-edge";

const cookie = (name: string) => {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
};

/** Forces this browser into a group (or back to the one its id gives). The browser tracker reads segments when it starts, so reload: server calls and events then agree. */
function forceGroup(g: AbGroup | undefined) {
  document.cookie = g ? `${AB_COOKIE}=${g}; Path=/; Max-Age=86400; SameSite=Lax` : `${AB_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  window.location.reload();
}

type Row = { id: number; name: string; brand: string };
type Compare = { q: string; enabled: boolean; a: Row[]; b: Row[] } | { error: string };

const code = "rounded bg-black/40 px-1";

/** What the experiment changes, in words. Keep in step with scripts/constructor/configure-segment-campaigns.mjs. */
const VARIANT = { rule: "start-stop batteries first", queries: "“battery” and “car battery”" };

/**
 * Debug-panel tab for the storefront A/B test (CIO_AB_TEST=battery): is it on, which group this browser is in, a switch to force a group,
 * the same search for both groups side by side, and a check that the split is even.
 */
export function CioAbTab({ enabled }: { enabled: boolean }) {
  // This tab only mounts after a click in the panel, so reading the cookies here cannot cause a hydration mismatch.
  const [info] = useState(() => ({ clientId: cookie(CLIENT_COOKIE), forced: parseAbGroup(cookie(AB_COOKIE)), segments: parseSegments(cookie(SEGMENT_COOKIE)) }));
  const [q, setQ] = useState("battery");
  const [cmp, setCmp] = useState<Compare | null>(null);
  const [busy, setBusy] = useState(false);


  const run = async () => {
    setBusy(true);
    try {
      const r = await fetch(`/api/ab-compare?q=${encodeURIComponent(q)}`);
      setCmp(r.ok ? ((await r.json()) as Compare) : { error: `HTTP ${r.status}` });
    } catch (e) {
      setCmp({ error: String(e) });
    } finally {
      setBusy(false);
    }
  };

  const natural = info.clientId ? abBucket(info.clientId) : undefined;
  const group = abGroup(info.clientId, info.forced);
  const sent = withExperiment(info.segments, info.clientId, enabled, info.forced);
  // Split check: how a thousand made-up client ids would fall.
  const inB = Array.from({ length: 1000 }, (_, i) => abBucket(`sample-${i}`)).filter((g) => g === "b").length;

  return (
    <div className="space-y-4 p-4">
      <div className={`max-w-3xl rounded border p-3 ${enabled ? "border-green-400/60 bg-green-400/10" : "border-amber/60 bg-amber/10"}`}>
        <p className="font-semibold">{enabled ? "A/B test is ON" : "A/B test is OFF"}</p>
        <p className="text-white/70">
          {enabled ? (
            <>Visitors are split 50/50 by client id. Group B also gets <code className={code}>us={AB_SEGMENT}</code>.</>
          ) : (
            <>
              Set <code className={code}>CIO_AB_TEST=battery</code> and restart or redeploy to run it. While off, nobody gets <code className={code}>{AB_SEGMENT}</code> and the rest of this tab only shows what would happen.
            </>
          )}
        </p>
      </div>

      <section className="max-w-3xl space-y-2 rounded border border-white/20 p-3">
        <h3 className="font-semibold">What the test changes</h3>
        <ul className="list-disc space-y-1 pl-5 text-white/80">
          <li><b>Group A (control):</b> the normal ranking.</li>
          <li><b>Group B:</b> {VARIANT.rule} on {VARIANT.queries}, through a Constructor campaign targeted at the segment <code className={code}>{AB_SEGMENT}</code>.</li>
          <li>Both groups send the same tracking events (page views, clicks, add to cart, purchase), carrying their segments, so conversions can be compared by group.</li>
        </ul>
      </section>

      <section className="max-w-3xl space-y-3 rounded border border-white/20 p-3">
        <h3 className="font-semibold">This browser</h3>
        <dl className="grid grid-cols-[10rem_1fr] gap-y-1 font-mono text-[12px]">
          <dt className="text-white/50">client id</dt><dd className="break-all">{info.clientId || "(none yet: reload once)"}</dd>
          <dt className="text-white/50">group from id</dt><dd>{natural ? natural.toUpperCase() : "-"}</dd>
          <dt className="text-white/50">forced group</dt><dd>{info.forced ? info.forced.toUpperCase() : "no"}</dd>
          <dt className="text-white/50">group in use</dt><dd className="font-bold text-amber">{enabled ? (group ? group.toUpperCase() : "-") : "none (test off)"}</dd>
          <dt className="text-white/50">segments sent (us)</dt><dd>{sent.length ? sent.join(", ") : "(none)"}</dd>
        </dl>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-white/60">Force a group:</span>
          {([undefined, "a", "b"] as const).map((g) => (
            <button
              key={g ?? "natural"}
              type="button"
              onClick={() => forceGroup(g)}
              aria-pressed={info.forced === g}
              className={`rounded border px-3 py-1 ${info.forced === g ? "border-amber bg-white/10 font-semibold" : "border-white/25 hover:bg-white/10"}`}
            >
              {g ? `Group ${g.toUpperCase()}` : "From my id"}
            </button>
          ))}
          <span className="text-white/50">Reloads the page. Lasts a day.</span>
        </div>
      </section>

      <section className="max-w-4xl space-y-3 rounded border border-white/20 p-3">
        <h3 className="font-semibold">Compare the two groups</h3>
        <p className="text-white/60">Runs the same search twice, once as each group, with your own client id and segments. Positions that differ are highlighted.</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), run())}
            aria-label="Search to compare"
            className="w-56 rounded border border-white/30 bg-black/30 px-3 py-1.5 text-white focus:border-amber focus:outline-none"
          />
          <button type="button" onClick={run} disabled={busy || !q.trim()} className="rounded bg-white px-3 py-1.5 font-semibold text-[#0f1b26] hover:bg-white/90 disabled:opacity-50">
            {busy ? "Running…" : "Compare"}
          </button>
        </div>
        {cmp && "error" in cmp && <p className="text-red-300">Could not compare: {cmp.error}</p>}
        {cmp && "a" in cmp && <CompareTable data={cmp} />}
      </section>

      <section className="max-w-3xl space-y-1 rounded border border-white/20 p-3">
        <h3 className="font-semibold">Is the split even?</h3>
        <p className="text-white/70">Of 1000 sample client ids, <b>{inB / 10}%</b> fall in group B and <b>{(1000 - inB) / 10}%</b> in group A.</p>
      </section>

      <section className="max-w-3xl space-y-1 rounded border border-white/20 p-3">
        <h3 className="font-semibold">Reading the results</h3>
        <p className="text-white/70">
          Open the Events tab to see the tracking events this browser sends. Compare conversions of visitors with <code className={code}>{AB_SEGMENT}</code> against the others in the Constructor dashboard
          (if its reports can be sliced by segment) or from the events themselves. The storefront keeps no counts of its own.
        </p>
      </section>
    </div>
  );
}

function CompareTable({ data }: { data: { q: string; a: Row[]; b: Row[] } }) {
  const n = Math.max(data.a.length, data.b.length);
  const differing = Array.from({ length: n }, (_, i) => data.a[i]?.id !== data.b[i]?.id).filter(Boolean).length;
  const posA = new Map(data.a.map((r, i) => [r.id, i + 1]));
  return (
    <div className="space-y-2">
      <p className={differing ? "text-amber" : "text-white/60"}>
        {differing ? `${differing} of ${n} positions differ for “${data.q}”.` : `Same order for “${data.q}”: the test changes nothing for this search.`}
      </p>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="text-left text-white/50">
            <th className="w-8 py-1">#</th>
            <th>Group A (control)</th>
            <th>Group B (experiment)</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: n }, (_, i) => {
            const a = data.a[i];
            const b = data.b[i];
            const differs = a?.id !== b?.id;
            const was = b ? posA.get(b.id) : undefined;
            const move = b && differs ? (was == null ? "new" : was > i + 1 ? `▲${was - (i + 1)}` : `▼${i + 1 - was}`) : "";
            return (
              <tr key={i} className={`border-t border-white/10 ${differs ? "bg-amber/10" : ""}`}>
                <td className="py-1 text-white/50">{i + 1}</td>
                <td>{a?.name} <span className="text-white/40">#{a?.id}</span></td>
                <td>
                  {b?.name} <span className="text-white/40">#{b?.id}</span> {move && <b className="text-amber">{move}</b>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
