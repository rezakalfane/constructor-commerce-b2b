// The demo checkout's "order": a snapshot of the cart taken when the demo order is placed, kept for an hour in a cookie so the confirmation
// page can show it and send the Constructor conversion event after the cart itself has been emptied. It holds no personal data
// (the demo checkout form is never submitted) and nothing is stored on a server.

export const ORDER_COOKIE = "demo_order";

export type DemoOrderLine = { productId: number; sku: string; name: string; quantity: number; unit: number };
export type DemoOrder = { id: string; currency: string; lines: DemoOrderLine[]; total: number };

export const orderTotal = (lines: DemoOrderLine[]) => Math.round(lines.reduce((sum, l) => sum + l.unit * l.quantity, 0) * 100) / 100;

/** A readable, unique-enough demo order number, e.g. DEMO-20261008-48213. */
export const newOrderId = () => `DEMO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(10000 + Math.random() * 90000)}`;

export function encodeOrder(order: DemoOrder): string {
  const compact = { i: order.id, c: order.currency, l: order.lines.map((l) => [l.productId, l.sku, l.name.slice(0, 80), l.quantity, l.unit]) };
  return Buffer.from(JSON.stringify(compact)).toString("base64url");
}

/** Reads the cookie back; anything malformed is treated as "no order". */
export function decodeOrder(raw: string | undefined): DemoOrder | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as { i: string; c: string; l: [number, string, string, number, number][] };
    if (typeof c.i !== "string" || typeof c.c !== "string" || !Array.isArray(c.l) || !c.l.length) return null;
    const lines = c.l.map(([productId, sku, name, quantity, unit]) => ({ productId: Number(productId), sku: String(sku), name: String(name), quantity: Number(quantity), unit: Number(unit) }));
    if (lines.some((l) => !Number.isFinite(l.productId) || !(l.quantity > 0) || !Number.isFinite(l.unit))) return null;
    return { id: c.i, currency: c.c, lines, total: orderTotal(lines) };
  } catch {
    return null;
  }
}
