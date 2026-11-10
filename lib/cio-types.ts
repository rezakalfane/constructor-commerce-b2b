/** One recorded call to a Constructor API (or tracking event; the index key redacted). Shown in the debug panel. */
export type CioCall = {
  id: string;
  /** What the call was for, e.g. "search", "autocomplete", "event: search-results". */
  label: string;
  /** ISO time the call started. */
  at: string;
  ms: number;
  status: number;
  /** The request URL with the key replaced by a placeholder. */
  url: string;
  params: Record<string, string[]>;
  /** One line: result count, facets, suggestions, redirects. */
  summary: string;
  /** Pretty-printed response body, cut at `RESPONSE_LIMIT` characters. */
  response: string;
  truncated: boolean;
  /** A curl command that repeats the call. */
  curl: string;
};
