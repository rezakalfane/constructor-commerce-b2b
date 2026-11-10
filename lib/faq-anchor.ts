// The page anchor of one FAQ question (the `id` of its element), so a link can open it: /faq#faq-<id>.
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const faqAnchor = (faqId: string) => `faq-${slugify(faqId)}`;
