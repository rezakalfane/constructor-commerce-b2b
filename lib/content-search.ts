// Site-wide content search: FAQ answers, buying guides and blog posts (Amplience content), next to the Constructor product search.
// Products are searched by Constructor Discovery; this content is not in a Constructor catalog, so it is matched here, over a small
// in-memory index per language (built from the Amplience delivery content, cached for a few minutes). Words match by prefix, so it
// works as you type.
import { getGuides, getPage, getPosts } from "./content";
import { faqAnchor } from "./faq-anchor";
import type { Locale } from "./i18n";

export type ContentKind = "faq" | "guide" | "post";
export type ContentHit = { kind: ContentKind; title: string; href: string; snippet: string };

type Doc = ContentHit & { titleWords: string[]; text: string; words: Set<string> };

const TTL_MS = 5 * 60_000;
const cache = new Map<Locale, { at: number; docs: Doc[] }>();

export const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2);

function doc(kind: ContentKind, title: string, href: string, body: string, summary = ""): Doc {
  const text = plain(`${summary} ${body}`);
  return { kind, title, href, snippet: "", text, titleWords: words(title), words: new Set(words(`${title} ${text}`)) };
}

async function buildIndex(locale: Locale): Promise<Doc[]> {
  const docs: Doc[] = [];
  const [posts, guides, faqPage] = await Promise.all([
    getPosts(locale).catch(() => []),
    getGuides(locale).catch(() => []),
    getPage("faq", locale).catch(() => undefined),
  ]);
  for (const p of posts) {
    const body = p.blocks.flatMap((b) => (b.type === "text" ? [b.html] : [])).join(" ");
    docs.push(doc("post", p.title, p.url, body, p.description));
  }
  for (const g of guides) {
    const body = [...g.steps.map((s) => `${s.title}. ${s.body}`), ...g.checklist].join(" ");
    docs.push(doc("guide", g.title, g.url, body, g.summary));
  }
  for (const block of faqPage?.blocks ?? []) {
    if (block.type !== "faqs") continue;
    for (const f of block.items) docs.push(doc("faq", f.question, `/faq#${faqAnchor(f.id)}`, f.answerHtml));
  }
  return docs;
}

async function getIndex(locale: Locale): Promise<Doc[]> {
  const hit = cache.get(locale);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.docs;
  const docs = await buildIndex(locale);
  if (docs.length) cache.set(locale, { at: Date.now(), docs });
  return docs;
}

/** How many documents of each kind are indexed (shown in the debug panel). */
export async function contentIndexStats(locale: Locale): Promise<Record<ContentKind, number>> {
  const stats: Record<ContentKind, number> = { faq: 0, guide: 0, post: 0 };
  for (const d of await getIndex(locale)) stats[d.kind]++;
  return stats;
}

/** A short passage of the text around the first matching word. */
function snippetOf(d: Doc, tokens: string[]) {
  const lower = d.text.toLowerCase();
  const at = tokens.map((t) => lower.search(new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (at === undefined) return d.text.slice(0, 140) + (d.text.length > 140 ? "…" : "");
  const from = Math.max(0, at - 50);
  return (from > 0 ? "…" : "") + d.text.slice(from, from + 150).trim() + (from + 150 < d.text.length ? "…" : "");
}

/**
 * Content matching the text: every word of the query must start a word of the title or text. Title matches rank first
 * (whole words before prefixes), then how often the words occur in the text.
 */
export async function searchContent(locale: Locale, q: string, limit = 4): Promise<ContentHit[]> {
  const tokens = words(q);
  if (!tokens.length) return [];
  const docs = await getIndex(locale);
  const scored: { d: Doc; score: number }[] = [];
  for (const d of docs) {
    let score = 0;
    let all = true;
    for (const t of tokens) {
      const inTitle = d.titleWords.some((w) => w === t) ? 8 : d.titleWords.some((w) => w.startsWith(t)) ? 5 : 0;
      const inText = inTitle ? 0 : [...d.words].some((w) => w.startsWith(t)) ? 1 : 0;
      if (!inTitle && !inText) {
        all = false;
        break;
      }
      score += inTitle + inText;
    }
    if (all) scored.push({ d, score });
  }
  const order: Record<ContentKind, number> = { guide: 0, faq: 1, post: 2 };
  return scored
    .sort((a, b) => b.score - a.score || order[a.d.kind] - order[b.d.kind])
    .slice(0, limit)
    .map(({ d }) => ({ kind: d.kind, title: d.title, href: d.href, snippet: snippetOf(d, tokens) }));
}
