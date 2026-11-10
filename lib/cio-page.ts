// The tracking data of a listing page (search or browse), built on the server from the Constructor result so the browser can report the
// right result id and the ids on screen. Types only: safe to import from server components.
import type { CatalogResult } from "./bigcommerce";
import type { PageData } from "./cio-tracker";

export function listingPageData(result: CatalogResult, o: { q?: string; groupName: string; page: number }): PageData {
  const base = { resultId: result.resultId, total: result.total, items: result.itemIds ?? [], page: o.page };
  return o.q ? { kind: "search", term: o.q, ...base } : { kind: "browse", groupId: result.groupId ?? "all", groupName: o.groupName, ...base };
}
