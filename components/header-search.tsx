"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTracker } from "./cio-tracking";
import { TypeaheadSearch } from "./typeahead-search";

type Labels = React.ComponentProps<typeof TypeaheadSearch>["labels"];

/**
 * The site-wide product search in the header: Constructor Autocomplete on every page. Enter (or "See all results") opens the
 * catalog filtered by the text, and the field empties (the results page shows the search as a chip). Press "/" anywhere to focus it.
 */
export function HeaderSearch({
  locale,
  productsPath,
  placeholder,
  label,
  clearLabel,
  labels,
}: {
  locale: string;
  productsPath: string;
  placeholder: string;
  label: string;
  clearLabel: string;
  labels: Labels;
}) {
  const router = useRouter();
  const { searchSubmit } = useTracker();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      e.preventDefault();
      document.getElementById("q-box")?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      action={productsPath}
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        const text = String(new FormData(e.currentTarget).get("q") ?? "").trim();
        if (text) searchSubmit(text, text);
        router.push(text ? `${productsPath}?${new URLSearchParams({ q: text })}` : productsPath);
      }}
    >
      <TypeaheadSearch name="q" action={productsPath} locale={locale} placeholder={placeholder} label={label} clearLabel={clearLabel} labels={labels} size="lg" hint="/" clearOnSearch />
    </form>
  );
}
