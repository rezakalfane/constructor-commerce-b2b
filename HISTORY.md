# History

Newest first. Each entry: the request and what came of it.

## 10 November 2026: port to Constructor

**Request.** Use the Bloomreach storefront to create a `constructor-commerce-b2b` storefront, still using BigCommerce for products, replacing and removing
all Bloomreach code and features with Constructor.

**Result.** Copied the repo (without `node_modules`, `.next`, `.git`, `.vercel`, `.env.local`). Replaced `lib/bloomreach.ts` with `lib/constructor.ts`
(Search, Browse, Autocomplete), the Bloomreach pixel with the Constructor client library (`lib/cio-tracker.ts`), `_br_uid_2` with the Constructor
client id and session cookies, audiences-by-URL with `us` segments, the Bloomreach debug panel with a Constructor one (calls and events). Removed media
rules, the "showing results for" notice, the content export route and Data Hub content documents. Docs rewritten. Index scripts from the earlier
Constructor loading work copied into `scripts/constructor/`. Verified against the live index and in a browser (see HANDOFF.md).

The earlier history of the Amplience and Bloomreach storefronts is in `Workspaces/BloomReach/bloomreach-commerce-b2b/HISTORY.md`.
