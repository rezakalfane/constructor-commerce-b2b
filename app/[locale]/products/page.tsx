import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plp } from "@/components/plp";
import { getTileLinks, parseCatalogParams, searchCatalog } from "@/lib/bigcommerce";
import { searchContent } from "@/lib/content-search";
import { CioPageView } from "@/components/cio-tracking";
import { listingPageData } from "@/lib/cio-page";
import { getVisitor } from "@/lib/visitor";
import { ensureCatalogRoot, followSearchRedirect, requestedCatalogRoot } from "@/lib/catalog-route";
import { alternatesFromPaths, CATALOG_ROOT, categoryLabel, getMessages, isLocale, localePath } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/products">): Promise<Metadata> {
  const { locale } = await params;
  const root = await requestedCatalogRoot();
  if (!isLocale(locale) || root !== CATALOG_ROOT[locale]) return {};
  return {
    title: getMessages(locale).allProducts,
    alternates: alternatesFromPaths(locale, { en: localePath("en", "/products"), fr: localePath("fr", "/products") }),
  };
}

export default async function ProductsPage({ params, searchParams }: PageProps<"/[locale]/products">) {
  const { locale } = await params;
  const root = await requestedCatalogRoot();
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  if (!(await ensureCatalogRoot(locale, root, [], sp))) notFound();
  const t = getMessages(locale);
  const query = parseCatalogParams(sp);
  const visitor = await getVisitor();
  const [result, tiles, content] = await Promise.all([searchCatalog(locale, { ...query, visitor }), getTileLinks(locale), query.q ? searchContent(locale, query.q, 4) : []]);
  await followSearchRedirect(result, sp, locale);

  return (
    <div className="page py-10 md:py-14">
      <CioPageView data={listingPageData(result, { q: query.q, groupName: t.products, page: Math.floor(Number(query.after ?? query.before ?? 0) / 24) + 1 })} />
      <h1>{t.allProducts}</h1>
      <p className="mt-4 max-w-[52ch] text-lg text-slate">{t.productsIntro}</p>

      <nav aria-label={t.shopByCategory} className="mt-8 flex flex-wrap gap-2">
        {tiles.map((c) => (
          <Link
            key={c.path}
            href={c.href}
            className="rounded-full border-[1.5px] border-line px-4 py-1.5 text-[0.95rem] font-medium hover:border-ink"
          >
            {c.label ?? categoryLabel(locale, c.name)}
          </Link>
        ))}
      </nav>

      <Plp locale={locale} basePath={`/${root}`} result={result} params={query} content={content} />
    </div>
  );
}
