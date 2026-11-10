import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { placeDemoOrderAction } from "@/app/actions/checkout";
import { PlaceOrderButton } from "@/components/place-order-button";
import { getCart } from "@/lib/bigcommerce";
import { formatMoney, getMessages, isLocale, localePath } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? getMessages(locale).checkoutTitle : "Checkout", robots: { index: false } };
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block text-sm">
    <span className="mb-1 block text-slate">{label}</span>
    {children}
  </label>
);

/**
 * A DEMO checkout in the site's style, instead of BigCommerce's hosted page: it shows the real cart and a form that is never submitted
 * (its inputs have no `name`, so nothing personal reaches the server), and "Place demo order" empties the cart and opens the confirmation
 * page, which sends the Constructor conversion event.
 */
export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const cartId = (await cookies()).get("bc_cart_id")?.value;
  const cart = cartId ? await getCart(cartId, locale) : null;
  if (!cart || !cart.lines.length) redirect(localePath(locale, "/cart"));
  const total = cart.subtotal;

  return (
    <div className="page py-10 md:py-14">
      <h1>{t.checkoutTitle}</h1>
      <p role="note" className="mt-5 max-w-3xl rounded-[4px] bg-bench px-4 py-3 text-[0.95rem]">{t.checkoutDemoNotice}</p>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_24rem]">
        <form id="checkout" action={placeDemoOrderAction.bind(null, locale)} className="space-y-10">
          <fieldset className="space-y-4">
            <legend className="mb-1 font-sans text-lg font-semibold [font-stretch:100%]">{t.checkoutContact}</legend>
            <Field label={t.checkoutEmail}>
              <input type="email" autoComplete="off" defaultValue="buyer@example.com" className="field w-full" />
            </Field>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-1 font-sans text-lg font-semibold [font-stretch:100%]">{t.checkoutDelivery}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.checkoutName}>
                <input autoComplete="off" defaultValue="Alex Demo" className="field w-full" />
              </Field>
              <Field label={t.checkoutCompany}>
                <input autoComplete="off" defaultValue="Demo Garage Ltd" className="field w-full" />
              </Field>
            </div>
            <Field label={t.checkoutAddress}>
              <input autoComplete="off" defaultValue="1 Example Road" className="field w-full" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.checkoutCity}>
                <input autoComplete="off" defaultValue="London" className="field w-full" />
              </Field>
              <Field label={t.checkoutPostcode}>
                <input autoComplete="off" defaultValue="AB1 2CD" className="field w-full" />
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-1 font-sans text-lg font-semibold [font-stretch:100%]">{t.checkoutPayment}</legend>
            <label className="flex items-center gap-3 rounded-[4px] border-[1.5px] border-ink px-4 py-3.5 text-[0.95rem]">
              <input type="radio" defaultChecked readOnly className="h-4 w-4 accent-[#0f1b26]" />
              {t.checkoutPayOnAccount}
            </label>
          </fieldset>

          <div className="flex flex-wrap items-center gap-6">
            <div className="w-full sm:w-72">
              <PlaceOrderButton label={t.checkoutPlaceOrder} pendingLabel={t.checkoutPlacing} />
            </div>
            <Link href={localePath(locale, "/cart")} className="text-sm font-semibold underline decoration-amber decoration-2 underline-offset-4">
              {t.checkoutBackToCart}
            </Link>
          </div>
        </form>

        <aside aria-label={t.checkoutSummary} className="h-fit rounded-[4px] bg-bench p-6">
          <h2 className="font-sans text-lg font-semibold [font-stretch:100%]">{t.checkoutSummary}</h2>
          <ul className="mt-5 divide-y divide-line">
            {cart.lines.map((l) => (
              <li key={l.id} className="flex gap-4 py-4 first:pt-0">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-paper">
                  {l.image && <Image src={l.image} alt="" width={64} height={64} className="h-16 w-16 object-contain mix-blend-multiply" />}
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="line-clamp-2 font-semibold leading-snug">{l.name}</span>
                  <span className="mt-0.5 block text-slate">{t.sku} {l.sku} · {l.quantity} ×</span>
                </span>
                <span className="text-sm font-semibold">{formatMoney(locale, l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate">{t.subtotal}</dt>
              <dd>{formatMoney(locale, total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate">{t.checkoutShipping}</dt>
              <dd>{t.checkoutFree}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
              <dt>{t.checkoutTotal}</dt>
              <dd>{formatMoney(locale, total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
