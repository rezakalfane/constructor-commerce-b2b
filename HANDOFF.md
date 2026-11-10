# Handoff

Where the Constructor storefront stands (10 November 2026). Read this first, then [docs/constructor.md](docs/constructor.md) and [HISTORY.md](HISTORY.md).

## What this is

A port of `Workspaces/BloomReach/bloomreach-commerce-b2b` ("Commerce B2B", Next.js 16): same pages, images and UI, **BigCommerce** for products, cart and
checkout, **Amplience** for editorial content, and **Constructor** (index `Reza`, key in `.env.local`) for listing, search, facets, sort, paging,
type-ahead and behavioral tracking. Every Bloomreach file, variable and call is gone. The original is untouched.

| Thing | Where |
|---|---|
| Live site | https://constructor-commerce-b2b.vercel.app (and `/fr`) |
| GitHub | `rezakalfane/constructor-commerce-b2b` (private); `main` deploys to production on Vercel (`rza-kalfanes-projects`) |
| Code | `Workspaces/ConstructorIO/constructor-commerce-b2b` |
| Index loader and config scripts | `scripts/constructor/` (copied from `Workspaces/ConstructorIO/scripts/`) |
| Index data | `Workspaces/ConstructorIO/data/catalog/` (150 items, 19 groups, built from BigCommerce) |
| Knowledge base for agents | the `constructor-search` skill (`~/.claude/skills/constructor-search`) |

## State of play

**Works, checked locally on 10 Nov** (dev server, real index): listing, category pages (browse), text search, brand and attribute facets (price filter,
sort, paging), the "jump starter" redirect rule, facet campaigns (the chargers page shows 6 facets), the type-ahead (products, completed words,
brands, categories), and in a real browser (Playwright with `navigator.webdriver` hidden) the events `session_start`, `search_result_load`,
`item_detail_load`, `conversion` (add to cart), `autocomplete select`, `search`, result click-through all reach `ac.cnstrc.com`. `tsc` and `eslint` are clean.

**Not done or not checked**
- Production variables: `BIGCOMMERCE_*`, `AMPLIENCE_HUB_NAME`, `CONSTRUCTOR_INDEX_KEY`, `CIO_DEBUG=1` (the debug panel is public). `AMPLIENCE_DELIVERY_HOST` is unset on purpose (published content).
- The `purchase` event (demo checkout confirmation) and browse result click were not exercised in a browser.
- Events were confirmed to be **sent**; whether Constructor's dashboard (Tracking monitor / Integration check) accepts them was not looked at.
- French pages render, but French search text does not match (the index has English fields only).
- Content (FAQ, guides, blog) is searched by the in-memory index, not by Constructor.
- Search Suggestions in Autocomplete are empty until Constructor learns from searches (the type-ahead covers this with products and completions).

## Resume

```bash
cd Workspaces/ConstructorIO/constructor-commerce-b2b
npm install
cp .env.example .env.local        # CONSTRUCTOR_INDEX_KEY, BIGCOMMERCE_*, AMPLIENCE_HUB_NAME ...
npm run dev                       # CIO_TRACKING=on to send events locally
npx tsc --noEmit && npm run lint && npm run build
```

Index scripts (need `CONSTRUCTOR_API_TOKEN` in `.env.local`): `node scripts/constructor/configure-index.mjs --dry-run`, see
[docs/constructor-catalog.md](docs/constructor-catalog.md).

## Next steps

1. **Deployed 10 Nov** (checked live: pages, EN/FR, search, category, filters, redirect, `/api/suggest`, events from the live site, no secrets in the HTML). Remember: production deploys by hand are run by the user (`vercel deploy --prod`); a push to `main` deploys on its own.
2. Check the events in the Constructor dashboard, then try an **A/B test** or a **personalization** rule with a segment (Segments tab, `us`).
3. **Content search**: add a `Content` section to the index from `lib/content-search.ts` documents (or keep local).
4. Add `newest` / `best selling` sorts only if the catalog gains those fields.
5. Fix the "Fiam" brand record in BigCommerce (the index already says FIAMM).

## Gotchas

See [docs/constructor-catalog.md](docs/constructor-catalog.md) (index loading) and decisions D43, D45, D47. In short: Search does not match partial words, Autocomplete does;
the browser library drops events from bots and before the first interaction; the session id must come from the cookie; item groups use `parent_ids`;
index changes take 5 to 15 minutes to show.
