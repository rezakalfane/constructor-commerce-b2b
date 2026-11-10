"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { deleteCart, getCart } from "@/lib/bigcommerce";
import { encodeOrder, newOrderId, ORDER_COOKIE, orderTotal, type DemoOrderLine } from "@/lib/demo-order";
import { DEFAULT_LOCALE, isLocale, localePath } from "@/lib/i18n";

const CART_COOKIE = "bc_cart_id";

/**
 * Places the DEMO order: nothing is charged and nothing is sent anywhere. The cart is snapshotted into the order cookie, deleted in
 * BigCommerce, and the visitor lands on the confirmation page (which sends the Constructor conversion event). The checkout form's
 * fields are deliberately not read: no personal data reaches the server.
 */
export async function placeDemoOrderAction(locale: string) {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  const cart = cartId ? await getCart(cartId, loc) : null;
  if (!cart || !cart.lines.length) redirect(localePath(loc, "/cart"));

  const lines: DemoOrderLine[] = cart.lines.slice(0, 20).map((l) => ({
    productId: l.productId,
    sku: l.sku,
    name: l.name,
    quantity: l.quantity,
    unit: l.unitPrice?.value ?? 0,
  }));
  const currency = cart.lines.find((l) => l.unitPrice)?.unitPrice?.currencyCode ?? cart.subtotal?.currencyCode ?? "GBP";
  jar.set(ORDER_COOKIE, encodeOrder({ id: newOrderId(), currency, lines, total: orderTotal(lines) }), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 });

  try {
    await deleteCart(cart.id);
  } catch (err) {
    console.error("[checkout] could not delete the cart:", err instanceof Error ? err.message : err);
  }
  jar.delete(CART_COOKIE);
  revalidatePath("/", "layout");
  redirect(localePath(loc, "/checkout/confirmation"));
}
