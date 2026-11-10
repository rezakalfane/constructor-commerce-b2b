// The visitor identity Constructor needs for personalization, A/B tests and analytics: client id (`i`), session id (`s`) and segments (`us`).
// The same client and session ids go to the browser tracker and to every Search/Browse/Autocomplete call.
import { cookies, headers } from "next/headers";
import { AB_COOKIE, SEGMENT_COOKIE, abTestOn, parseAbGroup, parseSegments, withExperiment } from "./segments";
import { CLIENT_COOKIE, SESSION_COOKIE, URL_HEADER } from "./visitor-edge";

export { CLIENT_COOKIE, SESSION_COOKIE, URL_HEADER, makeClientId } from "./visitor-edge";

/** What the APIs want to know about the visitor. */
export type Visitor = { clientId: string; sessionId: number; segments: string[]; url: string };

export const sessionIdOf = (value: string | undefined | null) => parseInt(value ?? "", 10) || 1;

/** The visitor of the current page request (server components). */
export async function getVisitor(): Promise<Visitor> {
  const [jar, h] = await Promise.all([cookies(), headers()]);
  const clientId = jar.get(CLIENT_COOKIE)?.value ?? "";
  return {
    clientId,
    sessionId: sessionIdOf(jar.get(SESSION_COOKIE)?.value),
    segments: withExperiment(parseSegments(jar.get(SEGMENT_COOKIE)?.value), clientId, abTestOn(), parseAbGroup(jar.get(AB_COOKIE)?.value)),
    url: h.get(URL_HEADER) ?? "",
  };
}
