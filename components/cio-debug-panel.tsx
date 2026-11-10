"use client";

import { useEffect, useState } from "react";
import { clearEvents, clearTypeaheadCalls, usePageCalls, useEvents, useTypeaheadCalls } from "@/lib/cio-debug-store";
import { CioAbTab } from "./cio-ab-tab";
import { CioSegmentsTab, useSegments } from "./cio-segments-tab";
import type { CioCall } from "@/lib/cio-types";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour12: false });

function Badge({ call }: { call: CioCall }) {
  if (call.status === 0) return <span className="rounded bg-slate-500/40 px-1.5 py-0.5 text-[11px]">{call.label.startsWith("event") ? "event" : "local"}</span>;
  const ok = call.status >= 200 && call.status < 300;
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${ok ? "bg-emerald-500/25 text-emerald-300" : "bg-red-500/30 text-red-300"}`}>{call.status}</span>;
}

function CallRow({ call }: { call: CioCall }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <li className="border-b border-white/10">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-white/5">
        <span className="mt-0.5 w-4 shrink-0 text-white/50">{open ? "▾" : "▸"}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <Badge call={call} />
            <span className="font-semibold">{call.label}</span>
            <span className="text-white/50">{call.status ? `${call.ms} ms` : ""}</span>
            <span className="text-white/40">{time(call.at)}</span>
          </span>
          <span className="mt-0.5 block text-white/70">{call.summary}</span>
        </span>
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4 pl-11 text-[12px]">
          <div>
            <p className="mb-1 text-white/50">Request (index key hidden)</p>
            <p className="break-all rounded bg-black/40 p-2 font-mono">{call.url}</p>
            {call.curl && (
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(call.curl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="mt-1 rounded border border-white/25 px-2 py-0.5 hover:bg-white/10"
              >
                {copied ? "Copied" : "Copy as curl"}
              </button>
            )}
          </div>
          {Object.keys(call.params).length > 0 && (
            <div>
              <p className="mb-1 text-white/50">Parameters</p>
              <table className="w-full border-collapse font-mono">
                <tbody>
                  {Object.entries(call.params)
                    .filter(([k]) => !["c"].includes(k))
                    .map(([k, vs]) => (
                      <tr key={k} className="border-t border-white/10 align-top">
                        <td className="w-40 py-1 pr-3 text-white/60">{k}</td>
                        <td className="break-all py-1">{vs.join("  ·  ")}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          <div>
            <p className="mb-1 text-white/50">Response{call.truncated ? " (cut)" : ""}</p>
            <pre className="max-h-72 overflow-auto rounded bg-black/40 p-2 font-mono leading-snug">{call.response}</pre>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * Debug panel for the Constructor APIs. Lists every call behind the page (Search or Browse, server side, at load) and behind the search box
 * as you type (via /api/suggest), plus the tracking events this browser sent: the request, its parameters, timing and the raw response.
 * Rendered only when the server records calls (development, or CIO_DEBUG=1).
 */
export function CioDebugPanel({ abTest = false }: { abTest?: boolean }) {
  const calls = usePageCalls();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"page" | "typeahead" | "events" | "segments" | "ab">("page");
  const segments = useSegments();
  const typeahead = useTypeaheadCalls();
  const events = useEvents();

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const typeaheadCount = typeahead.reduce((n, e) => n + e.calls.length, 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-[60] rounded-full bg-[#0f1b26] px-4 py-2 text-sm font-semibold text-white shadow-lg ring-1 ring-white/20 hover:bg-[#1a2b3a]"
      >
        Constructor debug · {calls.length + typeaheadCount + events.length}{segments.length ? ` · ${segments.length} seg` : ""}
      </button>
      {open && <div aria-hidden onClick={() => setOpen(false)} className="fixed inset-x-0 top-0 bottom-[60vh] z-[58]" />}
      {open && (
        <section aria-label="Constructor debug" className="fixed inset-x-0 bottom-0 z-[59] flex h-[60vh] flex-col bg-[#0f1b26] text-[13px] text-white shadow-[0_-8px_30px_rgba(0,0,0,0.35)]">
          <header className="flex flex-wrap items-center gap-3 border-b border-white/15 px-4 py-2">
            <h2 className="mr-2 text-sm font-bold">Constructor</h2>
            {(["page", "typeahead", "events", "segments", "ab"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded px-2.5 py-1 ${tab === t ? "bg-white text-[#0f1b26] font-semibold" : "hover:bg-white/10"}`}
              >
                {t === "page" ? `This page (${calls.length})` : t === "typeahead" ? `Search box (${typeaheadCount})` : t === "events" ? `Events (${events.length})` : t === "ab" ? `A/B${abTest ? " · on" : ""}` : `Segments${segments.length ? ` (${segments.length})` : ""}`}
              </button>
            ))}
            <span className="ml-auto hidden text-white/50 md:inline">Esc or a click above closes this panel.</span>
            {((tab === "typeahead" && typeahead.length > 0) || (tab === "events" && events.length > 0)) && (
              <button type="button" onClick={tab === "events" ? clearEvents : clearTypeaheadCalls} className="rounded border border-white/25 px-2 py-1 hover:bg-white/10">
                Clear
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded px-2 py-1 text-lg leading-none hover:bg-white/10">
              ×
            </button>
          </header>
          <div className="flex-1 overflow-y-auto">
            {tab === "ab" ? (
              <CioAbTab enabled={abTest} />
            ) : tab === "segments" ? (
              <CioSegmentsTab />
            ) : tab === "page" ? (
              calls.length ? (
                <ul>{calls.map((c) => <CallRow key={c.id} call={c} />)}</ul>
              ) : (
                <p className="p-4 text-white/60">No Constructor calls were made to render this page.</p>
              )
            ) : tab === "events" ? (
              events.length ? (
                <ul>{events.map((c) => <CallRow key={c.id} call={c} />)}</ul>
              ) : (
                <p className="p-4 text-white/60">No tracking event sent yet in this browser. Tracking is on in production (or with CIO_TRACKING=on); ad blockers hide it.</p>
              )
            ) : typeahead.length ? (
              <ul>
                {typeahead.map((e) => (
                  <li key={e.at}>
                    <p className="bg-white/5 px-4 py-1.5 text-white/60">Typed “{e.query}”</p>
                    <ul>{e.calls.map((c) => <CallRow key={c.id} call={c} />)}</ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-white/60">Type in the search box: each suggestion request appears here.</p>
            )}
          </div>
        </section>
      )}
    </>
  );
}
