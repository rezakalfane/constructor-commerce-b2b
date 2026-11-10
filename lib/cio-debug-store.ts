"use client";

import { useSyncExternalStore } from "react";
import type { CioCall } from "./cio-types";

/** Calls the browser's type-ahead triggered (via /api/suggest), newest first, for the debug panel. */
type Entry = { query: string; calls: CioCall[]; at: number };
let entries: Entry[] = [];
const listeners = new Set<() => void>();

// The lists survive full page loads (the cart's Checkout button, a reload): they are kept in this tab's session storage.
// Responses are cut when saved so a long session cannot fill the storage; the live entries keep the full text.
const KEY = "cio_debug_store_v1";
const slim = (c: CioCall): CioCall => ({ ...c, response: c.response.slice(0, 3000), truncated: c.truncated || c.response.length > 3000 });
function load<T>(field: "typeahead" | "events", fallback: T): T {
  try {
    const raw = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(KEY);
    return raw ? ((JSON.parse(raw) as Record<string, T>)[field] ?? fallback) : fallback;
  } catch {
    return fallback;
  }
}
let restored = false;
/** Reads the saved lists once, on first use in the browser (the constants above must exist before this runs). */
function restore() {
  if (restored || typeof window === "undefined") return;
  restored = true;
  entries = load<Entry[]>("typeahead", entries);
  events = load<CioCall[]>("events", events);
}
function save() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ typeahead: entries.map((e) => ({ ...e, calls: e.calls.map(slim) })), events: events.map(slim) }));
  } catch {
    // storage full or unavailable: keep working in memory
  }
}

export function pushTypeaheadCalls(query: string, calls: CioCall[]) {
  restore();
  entries = [{ query, calls, at: Date.now() }, ...entries].slice(0, 30);
  save();
  listeners.forEach((l) => l());
}

export function clearTypeaheadCalls() {
  restore();
  entries = [];
  save();
  listeners.forEach((l) => l());
}

/** Server-side calls behind the page being shown (set by the listing pages, empty elsewhere). */
let pageCalls: CioCall[] = [];
const EMPTY: CioCall[] = [];
const EMPTY_ENTRIES: Entry[] = [];
let pageKey = "";
/**
 * Adds the server-side calls behind the page. While the visitor stays on the same page (a filter, a sort, a segment change re-runs the search)
 * the new calls are added on top of the earlier ones; a different page starts a new list.
 */
export function addPageCalls(key: string, calls: CioCall[]) {
  const fresh = calls.filter((c) => !pageCalls.some((p) => p.id === c.id));
  if (key === pageKey && !fresh.length) return;
  pageCalls = key === pageKey ? [...fresh, ...pageCalls].slice(0, 30) : calls;
  pageKey = key;
  listeners.forEach((l) => l());
}
export function clearPageCalls() {
  pageCalls = [];
  pageKey = "";
  listeners.forEach((l) => l());
}
export const usePageCalls = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => pageCalls,
    () => EMPTY,
  );

/** Tracking events this browser sent to Constructor, newest first. Mapped to the same shape as an API call. */
let events: CioCall[] = [];
export function pushEvent(call: CioCall) {
  restore();
  if (events.some((c) => c.id === call.id)) return;
  events = [call, ...events].slice(0, 100);
  save();
  listeners.forEach((l) => l());
}
export function clearEvents() {
  restore();
  events = [];
  save();
  listeners.forEach((l) => l());
}
export const useEvents = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (restore(), events),
    () => EMPTY,
  );

export const useTypeaheadCalls = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (restore(), entries),
    () => EMPTY_ENTRIES,
  );
