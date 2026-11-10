"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { addPageCalls, clearPageCalls } from "@/lib/cio-debug-store";
import type { CioCall } from "@/lib/cio-types";

/**
 * Publishes the server-side Constructor calls of this page to the debug panel (which lives in the layout, on every page). When the page re-runs its
 * search (a filter, a sort, a segment chosen in the panel) the new call is added to the list instead of replacing it.
 */
export function CioDebugPageCalls({ calls }: { calls: CioCall[] }) {
  const path = usePathname();
  useEffect(() => addPageCalls(path, calls), [path, calls]);
  useEffect(() => clearPageCalls, []);
  return null;
}
