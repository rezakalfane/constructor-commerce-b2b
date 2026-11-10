"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { normalizeSegment, parseSegments, SEGMENT_COOKIE, SEGMENTS } from "@/lib/segments";

const EVENT = "cio-segments-changed";
const read = () => {
  const m = document.cookie.match(new RegExp(`(?:^|; )${SEGMENT_COOKIE}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
};
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};

/** Stores the chosen segments (1 day) and tells every listener. */
function writeSegments(ids: string[]) {
  document.cookie = ids.length ? `${SEGMENT_COOKIE}=${ids.join(",")}; Path=/; Max-Age=86400; SameSite=Lax` : `${SEGMENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  window.dispatchEvent(new Event(EVENT));
}

/** The segments chosen in this browser (the `cio_segments` cookie), as ids. */
export const useSegments = () => parseSegments(useSyncExternalStore(subscribe, read, () => ""));

/**
 * Debug-panel tab: tick one or more customer segments. They are stored in the `cio_segments` cookie and sent to every Search, Browse and Autocomplete call as the `us` parameter, so a rule or campaign targeting a segment of that name applies.
 */
export function CioSegmentsTab() {
  const router = useRouter();
  const selected = useSegments();
  const [draft, setDraft] = useState("");
  const [bad, setBad] = useState(false);
  const custom = selected.filter((id) => !SEGMENTS.some((s) => s.id === id));
  const add = () => {
    const id = normalizeSegment(draft);
    setBad(!id);
    if (!id) return;
    setDraft("");
    if (!selected.includes(id)) set([...selected, id]);
  };

  const set = (ids: string[]) => {
    writeSegments(ids);
    router.refresh();
  };

  return (
    <div className="space-y-4 p-4">
      <p className="max-w-3xl text-white/70">
        Pick the customer segments of this visitor. Each one is sent as <code className="rounded bg-black/40 px-1">us=&lt;id&gt;</code> with every Constructor call, so merchandising rules and
        personalization that target a segment of that name apply. You can also use <code className="rounded bg-black/40 px-1">?segment=garage</code> on any URL
        (<code className="rounded bg-black/40 px-1">?segment=none</code> clears).
      </p>
      <ul className="grid gap-2 md:grid-cols-2">
        {SEGMENTS.map((s) => {
          const on = selected.includes(s.id);
          return (
            <li key={s.id}>
              <label className={`flex cursor-pointer items-start gap-3 rounded border px-3 py-2.5 ${on ? "border-amber bg-white/10" : "border-white/20 hover:bg-white/5"}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => set(on ? selected.filter((x) => x !== s.id) : [...selected, s.id])}
                  className="mt-1 h-4 w-4 accent-[#f7b500]"
                />
                <span>
                  <span className="block font-semibold">{s.label}</span>
                  <span className="block text-white/60">{s.hint}</span>
                  <code className="mt-1 block text-[12px] text-amber">us={s.id}</code>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="max-w-3xl space-y-2 rounded border border-white/20 p-3">
        <label htmlFor="custom-segment" className="block font-semibold">
          Custom segment
        </label>
        <p className="text-white/60">
          Any name (lowercase letters, digits, - or _), for example <code className="rounded bg-black/40 px-1">vip</code>. Then define the segment <code className="rounded bg-black/40 px-1">vip</code> in the Constructor dashboard and target it from a rule.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="custom-segment"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setBad(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder="vip"
            autoComplete="off"
            aria-invalid={bad}
            className="w-56 rounded border border-white/30 bg-black/30 px-3 py-1.5 text-white placeholder:text-white/40 focus:border-amber focus:outline-none"
          />
          <button type="button" onClick={add} className="rounded bg-white px-3 py-1.5 font-semibold text-[#0f1b26] hover:bg-white/90">
            Add segment
          </button>
          {bad && <span className="text-red-300">Use lowercase letters, digits, - or _ (up to 32 characters).</span>}
        </div>
        {custom.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {custom.map((id) => (
              <li key={id}>
                <button type="button" onClick={() => set(selected.filter((x) => x !== id))} aria-label={`Remove segment ${id}`} className="flex items-center gap-2 rounded-full border border-amber bg-white/10 px-3 py-1">
                  <code>us={id}</code>
                  <span aria-hidden>×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {selected.length > 0 && (
        <button type="button" onClick={() => set([])} className="rounded border border-white/25 px-3 py-1.5 hover:bg-white/10">
          Clear segments
        </button>
      )}
    </div>
  );
}
