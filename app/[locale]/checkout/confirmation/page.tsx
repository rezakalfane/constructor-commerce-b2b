import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PurchaseTracker } from "@/components/purchase-tracker";
import { decodeOrder, ORDER_COOKIE } from "@/lib/demo-order";
import { formatMoney, getMessages, isLocale, localePath } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout/confirmation">): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? getMessages(locale).orderThanks : "Thank you", robots: { index: false } };
}

/** The demo order's confirmation. It sends the Constructor conversion page view (once per order) with the order's basket. */
export default async function ConfirmationPage({ params }: PageProps<"/[locale]/checkout/confirmation">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const order = decodeOrder((await cookies()).get(ORDER_COOKIE)?.value);
  if (!order) redirect(localePath(locale, "/cart"));
  const money = (value: number) => formatMoney(locale, { value, currencyCode: order.currency });

  return (
    <div className="page py-10 md:py-14">
      <PurchaseTracker order={order} />
      <h1>{t.orderThanks}</h1>
      <p className="mt-4 text-lg text-slate">
        {t.orderNumber}: <strong className="font-semibold text-ink">{order.id}</strong>
      </p>
      <p role="note" className="mt-5 max-w-3xl rounded-[4px] bg-bench px-4 py-3 text-[0.95rem]">{t.orderDemoNote}</p>

      <section aria-label={t.orderItems} className="mt-10 max-w-3xl">
        <h2 className="font-sans text-lg font-semibold [font-stretch:100%]">{t.orderItems}</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {order.lines.map((l) => (
            <li key={`${l.productId}-${l.sku}`} className="flex items-baseline justify-between gap-6 py-4">
              <span className="min-w-0 text-[0.95rem]">
                <span className="font-semibold">{l.name}</span>
                <span className="block text-sm text-slate">{t.sku} {l.sku} · {l.quantity} × {money(l.unit)}</span>
              </span>
              <span className="font-semibold">{money(l.unit * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between text-base font-bold">
          <span>{t.checkoutTotal}</span>
          <span>{money(order.total)}</span>
        </p>
      </section>

      <Link href={localePath(locale, "/products")} className="btn btn-primary mt-10 inline-block px-6 py-3.5">
        {t.continueShopping}
      </Link>
    </div>
  );
}
