"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import * as tracker from "@/lib/cio-tracker";
import type { PageData, TrackerConfig } from "@/lib/cio-tracker";

type Ctx = TrackerConfig & { enabled: boolean };
const TrackingContext = createContext<Ctx>({ enabled: false, apiKey: "", debug: false });

/**
 * Switches Constructor tracking on for the whole site (see `trackingEnabled` in the layout) and reports clicks on product cards
 * (`data-cio-item`) of the listing on screen.
 */
export function CioTrackingProvider({ enabled, apiKey, debug, children }: Ctx & { children: ReactNode }) {
  const cfg = useMemo(() => ({ apiKey, debug }), [apiKey, debug]);
  useEffect(() => {
    if (!enabled) return;
    const onClick = (e: MouseEvent) => {
      const card = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cio-item]");
      if (card?.dataset.cioItem) tracker.itemClick(cfg, card.dataset.cioItem, card.dataset.cioName ?? "");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [enabled, cfg]);
  return <TrackingContext.Provider value={{ enabled, apiKey, debug }}>{children}</TrackingContext.Provider>;
}

/** Reports the page that renders it: a search or browse result set, a product, or nothing for other pages. */
export function CioPageView({ data }: { data: PageData }) {
  const { enabled, apiKey, debug } = useContext(TrackingContext);
  const pathname = usePathname();
  const key = JSON.stringify(data);
  useEffect(() => {
    if (enabled) tracker.pageView({ apiKey, debug }, JSON.parse(key));
  }, [enabled, apiKey, debug, key, pathname]);
  return null;
}

/** Event helpers bound to the site's tracking settings (no-ops when tracking is off). Stable between renders. */
export function useTracker() {
  const { enabled, apiKey, debug } = useContext(TrackingContext);
  return useMemo(() => {
    const cfg = { apiKey, debug };
    const on = <A extends unknown[]>(fn: (cfg: TrackerConfig, ...a: A) => void) => (...a: A) => {
      if (enabled) fn(cfg, ...a);
    };
    return {
      inputFocus: on(tracker.inputFocus),
      autocompleteSelect: on(tracker.autocompleteSelect),
      searchSubmit: on(tracker.searchSubmit),
      addToCart: on(tracker.addToCart),
      purchase: on(tracker.purchase),
    };
  }, [enabled, apiKey, debug]);
}
