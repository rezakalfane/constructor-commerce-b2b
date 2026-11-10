"use client";

import { useEffect } from "react";
import type { DemoOrder } from "@/lib/demo-order";
import { useTracker } from "./cio-tracking";

/**
 * The Constructor purchase event for a placed order: order id, revenue (the sum of the lines) and the items. Constructor attributes the
 * revenue to the searches, clicks and add-to-carts that led to it. Sent once per order: a reload of the confirmation page does not repeat it.
 */
export function PurchaseTracker({ order }: { order: DemoOrder }) {
  const { purchase } = useTracker();
  useEffect(() => {
    const key = `cio_purchase_${order.id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // storage unavailable: send anyway
    }
    purchase(order.id, order.total, order.lines.map((l) => ({ itemId: String(l.productId), itemName: l.name, price: l.unit, count: l.quantity })));
  }, [order, purchase]);
  return null;
}
