"use client";

import { useEffect, useRef } from "react";
import { faqAnchor } from "@/lib/faq-anchor";
import type { Faq } from "@/lib/content";

/**
 * One FAQ question. It has its own anchor (`#faq-<id>`): when the page is opened at it (a search result, a shared link) or the anchor changes while on the page, the
 * question opens, scrolls to the middle of the window and flashes briefly.
 */
export function FaqItem({ faq, locale }: { faq: Faq; locale: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const id = faqAnchor(faq.id);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reveal = () => {
      const el = ref.current;
      if (!el || window.location.hash !== `#${id}`) return;
      el.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.dataset.flash = "1";
      clearTimeout(timer);
      timer = setTimeout(() => delete el.dataset.flash, 2200);
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => {
      window.removeEventListener("hashchange", reveal);
      clearTimeout(timer);
    };
  }, [id]);
  return (
    <details
      ref={ref}
      id={id}
      className="group scroll-mt-28 border-b border-line py-5 transition-colors duration-500 first:pt-1 last:border-b-0 data-[flash=1]:bg-amber/15"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[1.0625rem] font-semibold leading-snug">
        {faq.question}
        <span aria-hidden className="mt-0.5 text-2xl leading-none text-slate transition-transform duration-200 group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="rte mt-3 text-slate" dangerouslySetInnerHTML={{ __html: faq.answerHtml }} />
    </details>
  );
}
