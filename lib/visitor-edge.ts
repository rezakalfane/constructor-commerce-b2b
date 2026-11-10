// Edge-safe parts of the visitor identity (used by proxy.ts); the server-component helpers are in lib/visitor.ts.
// Constructor's browser library keeps the visitor in these cookies; the proxy creates the client id on a first request so even the first
// server-rendered search carries it, and the tracker then keeps using the same value.
export const CLIENT_COOKIE = "ConstructorioID_client_id";
export const SESSION_COOKIE = "ConstructorioID_session_id";
export const URL_HEADER = "x-cio-url";

/** A new anonymous client id (the library generates a UUID). */
export const makeClientId = () => crypto.randomUUID();
