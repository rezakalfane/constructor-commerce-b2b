"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useTracker } from "./cio-tracking";
import type { SuggestResponse } from "@/app/api/suggest/route";
import { pushTypeaheadCalls } from "@/lib/cio-debug-store";

type Labels = { suggestions: string; products: string; brands: string; attributes: string; redirect: string; content: string; kinds: Record<"faq" | "guide" | "post", string>; categories: string; seeAll: string; none: string; searching: string };

type Item =
  | { kind: "query"; text: string }
  | { kind: "product"; href: string; title: string; id: number }
  | { kind: "redirect"; url: string }
  | { kind: "content"; href: string }
  | { kind: "brand"; name: string }
  | { kind: "attribute"; name: string; value: string }
  | { kind: "category"; href: string; name: string }
  | { kind: "all" };

const MIN_CHARS = 2;
const DEBOUNCE_MS = 120;

/** Bolds the parts of `text` that match the words of `query`. */
function highlight(text: string, query: string): ReactNode {
  const words = query.trim().split(/\s+/).filter((w) => w.length > 1).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return text;
  return text.split(new RegExp(`(${words.join("|")})`, "ig")).map((part, i) =>
    i % 2 ? (
      <strong key={i} className="font-bold text-ink">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

/**
 * Advanced type-ahead for the product search box (Constructor). While you type it shows query suggestions, the top products
 * (photo, brand, price), and the brands and categories the matches fall in. Arrow keys move through the list, Enter opens the
 * highlighted entry (or runs the search), Escape closes. Partial words work ("exi" finds Exide). Without JavaScript the box is
 * a plain search field in the surrounding GET form.
 */
export function TypeaheadSearch({
  name,
  value,
  action,
  locale,
  placeholder,
  label,
  clearLabel,
  labels,
  size = "md",
  hint,
  clearOnSearch = false,
}: {
  name: string;
  value?: string;
  action: string;
  locale: string;
  placeholder: string;
  label: string;
  clearLabel: string;
  labels: Labels;
  /** `lg` is the big field used in the site header. */
  size?: "md" | "lg";
  /** A keyboard hint shown at the right of an empty field, e.g. "/". */
  hint?: string;
  /** Empty the field once a search or a shortcut from the dropdown has been triggered (the results page shows it as a chip). */
  clearOnSearch?: boolean;
}) {
  const router = useRouter();
  const { autocompleteSelect } = useTracker();
  const listId = useId();
  const [text, setText] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [store, setStore] = useState<Record<string, SuggestResponse>>({});
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const lastValue = useRef(value ?? "");

  // Follow the URL when the search was changed by something other than typing (a filter chip, "Clear all").
  useEffect(() => {
    if ((value ?? "") !== lastValue.current) {
      lastValue.current = value ?? "";
      setText(value ?? "");
      setOpen(false);
    }
  }, [value]);

  // Fetch suggestions shortly after typing stops; a newer keystroke cancels the older request. Results are kept per query.
  const q = text.trim();
  const key = `${locale}|${q.toLowerCase()}`;
  const data = q.length >= MIN_CHARS ? (store[key] ?? null) : null;
  const loading = q.length >= MIN_CHARS && !data;
  useEffect(() => {
    if (q.length < MIN_CHARS || store[key]) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}&locale=${locale}`, { signal: ctrl.signal });
        const json = (await res.json()) as SuggestResponse;
        setStore((prev) => ({ ...prev, [key]: json }));
        if (json.debug?.length) pushTypeaheadCalls(q, json.debug);
      } catch {
        // Aborted by a newer keystroke, or the network failed: the panel stays on "searching" until the next keystroke.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, key, locale, store]);

  // Close when focus or a click leaves the component.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const items: Item[] = useMemo(() => {
    if (!data) return [];
    return [
      ...(data.redirect ? [{ kind: "redirect", url: data.redirect.url } as Item] : []),
      ...data.queries.map((t): Item => ({ kind: "query", text: t })),
      ...(data.attributes ?? []).map((a): Item => ({ kind: "attribute", name: a.name, value: a.value })),
      ...data.brands.map((b): Item => ({ kind: "brand", name: b.name })),
      ...data.categories.map((c): Item => ({ kind: "category", href: c.href, name: c.name })),
      ...data.products.map((p): Item => ({ kind: "product", href: p.href, title: p.title, id: p.id })),
      ...(data.content ?? []).map((c): Item => ({ kind: "content", href: c.href })),
      ...(data.total ? [{ kind: "all" } as Item] : []),
    ];
  }, [data]);

  const submitSearch = (q: string) => {
    setOpen(false);
    setText(q);
    // Let React write the new value into the input, then submit the surrounding form (the listing re-runs the query).
    setTimeout(() => {
      input.current?.form?.requestSubmit();
      if (clearOnSearch) setText("");
    }, 0);
  };

  const run = (item: Item) => {
    const q = (data?.usedQuery || text).trim();
    const typed = text.trim();
    // Autocomplete select events: the entry chosen, what the visitor had typed, and the Autocomplete section it came from.
    setOpen(false);
    if (clearOnSearch && item.kind !== "query" && item.kind !== "all") setText(""); // those two submit the form first (see submitSearch)
    if (item.kind === "query") {
      autocompleteSelect(item.text, typed, "Search Suggestions");
      submitSearch(item.text);
    }
    else if (item.kind === "all") submitSearch(text.trim());
    else if (item.kind === "product") {
      autocompleteSelect(item.title, typed, "Products", String(item.id));
      router.push(item.href);
    }
    else if (item.kind === "content") {
      // a link to an anchor on the page we are already on (a FAQ question while on the FAQ page) changes the hash instead of navigating
      const u = new URL(item.href, window.location.href);
      if (u.hash && u.pathname === window.location.pathname) window.location.assign(u.hash);
      else router.push(item.href);
    }
    else if (item.kind === "redirect") {
      // A redirect rule points to a page: stay in the app for our own pages, otherwise leave.
      const u = new URL(item.url, window.location.href);
      if (u.origin === window.location.origin) router.push(u.pathname + u.search);
      else window.location.assign(u.href);
    } else if (item.kind === "attribute") {
      router.push(`${action}?${new URLSearchParams({ [`f.${item.name}`]: item.value })}`);
    } else if (item.kind === "category") {
      router.push(`${item.href}?${new URLSearchParams({ [name]: q })}`);
    } else {
      router.push(`${action}?${new URLSearchParams({ [name]: q, brand: item.name })}`);
    }
  };

  // Index of each entry in the flat keyboard order.
  let n = -1;
  const next = () => ++n;
  const optionId = (i: number) => `${listId}-${i}`;
  const showPanel = open && q.length >= MIN_CHARS;
  // The panel fits the room left below the search box (the window is not always tall), and scrolls inside it.
  useEffect(() => {
    if (!showPanel) return;
    const fit = () => {
      const b = box.current?.getBoundingClientRect();
      if (b && panel.current) panel.current.style.maxHeight = `${Math.round(Math.max(260, Math.min(window.innerHeight - b.bottom - 24, window.innerHeight * 0.85)))}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("scroll", fit, true);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("scroll", fit, true);
    };
  }, [showPanel]);
  // The left column (suggestions, filters, brands, categories) is only drawn when it has something in it.
  const hasLeft = Boolean(data && (data.redirect || data.queries.length || (data.attributes?.length ?? 0) || data.brands.length || data.categories.length));
  const row = (i: number) =>
    `flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-[0.95rem] ${active === i ? "bg-bench" : "hover:bg-bench"}`;

  return (
    <div ref={box} className="relative">
      <label className="sr-only" htmlFor={`${name}-box`}>
        {label}
      </label>
      <div className="relative">
        <svg aria-hidden width="18" height="18" viewBox="0 0 20 20" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate">
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          ref={input}
          id={`${name}-box`}
          name={name}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && items.length) {
              e.preventDefault();
              setOpen(true);
              setActive((a) => (a + 1) % items.length);
            } else if (e.key === "ArrowUp" && items.length) {
              e.preventDefault();
              setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
            } else if (e.key === "Enter") {
              if (open && active >= 0 && items[active]) {
                e.preventDefault();
                run(items[active]);
              } else {
                // The filter form has no submit button and several fields, so the browser would not submit it on Enter.
                e.preventDefault();
                setOpen(false);
                input.current?.form?.requestSubmit();
                if (clearOnSearch) setText("");
              }
            } else if (e.key === "Escape") {
              if (open) e.preventDefault(); // a search input would also clear its text
              setOpen(false);
              setActive(-1);
            }
          }}
          className={`field w-full pl-11 pr-11 [&::-webkit-search-cancel-button]:hidden ${size === "lg" ? "py-[0.95rem] text-[1.05rem]" : "py-3"}`}
        />
        {!text && hint && (
          <kbd aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded-[4px] border-[1.5px] border-line bg-bench px-2 py-0.5 text-xs font-semibold text-slate sm:block">
            {hint}
          </kbd>
        )}
        {text && (
          <button
            type="button"
            aria-label={clearLabel}
            onClick={() => {
              setText("");
              setOpen(false);
              input.current?.focus();
              if (value) setTimeout(() => input.current?.form?.requestSubmit(), 0);
            }}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate hover:bg-bench hover:text-ink"
          >
            <svg aria-hidden width="12" height="12" viewBox="0 0 12 12">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {showPanel && (
        <div
          ref={panel}
          id={listId}
          role="listbox"
          // Keep focus in the input while clicking entries.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[70vh] overflow-y-auto overscroll-contain rounded-[6px] border-[1.5px] border-line bg-white shadow-xl"
        >
          {!items.length ? (
            <p className="px-4 py-3 text-sm text-slate">{loading ? labels.searching : labels.none.replace("{q}", text.trim())}</p>
          ) : (
            <div className={`grid ${hasLeft ? "md:grid-cols-[minmax(0,15rem)_1fr]" : ""}`}>
              <div className={`border-line py-2 md:border-r-[1.5px] ${hasLeft ? "" : "hidden"}`}>
                {data!.redirect && (
                  <section>
                    <h3 className="px-4 pb-1 pt-2 text-[0.85rem] font-bold uppercase tracking-wide text-ink/80">{labels.redirect}</h3>
                    {(() => {
                      const i = next();
                      const u = new URL(data!.redirect.url, "https://x.invalid");
                      return (
                        <button id={optionId(i)} role="option" aria-selected={active === i} type="button" onClick={() => run({ kind: "redirect", url: data!.redirect!.url })} className={row(i)}>
                          <span className="flex-1 font-semibold">{u.pathname === "/" ? u.hostname : u.pathname}</span>
                          <span aria-hidden>→</span>
                        </button>
                      );
                    })()}
                  </section>
                )}
                {data!.queries.length > 0 && (
                  <section>
                    <h3 className="px-4 pb-1 pt-2 text-[0.85rem] font-bold uppercase tracking-wide text-ink/80">{labels.suggestions}</h3>
                    {data!.queries.map((t) => {
                      const i = next();
                      return (
                        <button key={t} id={optionId(i)} role="option" aria-selected={active === i} type="button" onClick={() => run({ kind: "query", text: t })} className={row(i)}>
                          <svg aria-hidden width="14" height="14" viewBox="0 0 20 20" className="shrink-0 text-slate">
                            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
                            <path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          <span>{highlight(t, text)}</span>
                        </button>
                      );
                    })}
                  </section>
                )}
                {(data!.attributes?.length ?? 0) > 0 && (
                  <section>
                    <h3 className="px-4 pb-1 pt-3 text-[0.85rem] font-bold uppercase tracking-wide text-ink/80">{labels.attributes}</h3>
                    {data!.attributes!.map((a) => {
                      const i = next();
                      return (
                        <button key={`${a.name}:${a.value}`} id={optionId(i)} role="option" aria-selected={active === i} type="button" onClick={() => run({ kind: "attribute", name: a.name, value: a.value })} className={row(i)}>
                          <span className="flex-1">
                            <span className="text-slate">{a.label}: </span>
                            {highlight(a.display, data!.usedQuery)}
                          </span>
                          <span className="text-sm text-slate">{a.count}</span>
                        </button>
                      );
                    })}
                  </section>
                )}
                {data!.brands.length > 0 && (
                  <section>
                    <h3 className="px-4 pb-1 pt-3 text-[0.85rem] font-bold uppercase tracking-wide text-ink/80">{labels.brands}</h3>
                    {data!.brands.map((b) => {
                      const i = next();
                      return (
                        <button key={b.name} id={optionId(i)} role="option" aria-selected={active === i} type="button" onClick={() => run({ kind: "brand", name: b.name })} className={row(i)}>
                          <span className="flex-1">{b.name}</span>
                          <span className="text-sm text-slate">{b.count}</span>
                        </button>
                      );
                    })}
                  </section>
                )}
                {data!.categories.length > 0 && (
                  <section>
                    <h3 className="px-4 pb-1 pt-3 text-[0.85rem] font-bold uppercase tracking-wide text-ink/80">{labels.categories}</h3>
                    {data!.categories.map((c) => {
                      const i = next();
                      return (
                        <button key={c.href} id={optionId(i)} role="option" aria-selected={active === i} type="button" onClick={() => run({ kind: "category", href: c.href, name: c.name })} className={row(i)}>
                          <span className="flex-1">{c.name}</span>
                          <span className="text-sm text-slate">{c.count}</span>
                        </button>
                      );
                    })}
                  </section>
                )}
              </div>

              <div className="py-2">
                {data!.products.length > 0 && (
                  <section>
                    <h3 className="px-4 pb-1 pt-2 text-[0.85rem] font-bold uppercase tracking-wide text-ink/80">{labels.products}</h3>
                    {data!.products.map((p) => {
                      const i = next();
                      return (
                        <button key={p.id} id={optionId(i)} role="option" aria-selected={active === i} type="button" onClick={() => run({ kind: "product", href: p.href, title: p.title, id: p.id })} className={row(i)}>
                          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-bench">
                            {p.image && <Image src={p.image} alt="" width={56} height={56} className="h-14 w-14 object-contain mix-blend-multiply" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            {p.brand && <span className="block text-xs text-slate">{p.brand}</span>}
                            <span className="line-clamp-2 leading-snug">{highlight(p.title, data!.usedQuery)}</span>
                          </span>
                          <span className="shrink-0 font-bold">{p.price}</span>
                        </button>
                      );
                    })}
                  </section>
                )}
                {(data!.content?.length ?? 0) > 0 && (
                  <section>
                    <h3 className="px-4 pb-1 pt-3 text-[0.85rem] font-bold uppercase tracking-wide text-ink/80">{labels.content}</h3>
                    {data!.content!.map((c) => {
                      const i = next();
                      return (
                        <button key={`${c.kind}:${c.href}:${c.title}`} id={optionId(i)} role="option" aria-selected={active === i} type="button" onClick={() => run({ kind: "content", href: c.href })} className={row(i)}>
                          <span className="w-16 shrink-0 self-start rounded-[4px] bg-bench px-1.5 py-0.5 text-center text-[0.7rem] font-bold uppercase tracking-wide text-ink/80">{labels.kinds[c.kind]}</span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 font-medium leading-snug">{highlight(c.title, data!.usedQuery)}</span>
                            <span className="line-clamp-1 text-sm text-slate">{highlight(c.snippet, data!.usedQuery)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </section>
                )}
                {data!.total > 0 &&
                  (() => {
                    const i = next();
                    return (
                      <button id={optionId(i)} role="option" aria-selected={active === i} type="button" onClick={() => run({ kind: "all" })} className={`${row(i)} sticky bottom-0 z-10 mt-1 border-t-[1.5px] border-line ${active === i ? "" : "bg-white"} font-semibold`}>
                        {labels.seeAll.replace("{count}", String(data!.total)).replace("{q}", data!.usedQuery)}
                      </button>
                    );
                  })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
