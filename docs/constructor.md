# Constructor search

How the storefront uses Constructor. Loading and configuring the index is in [constructor-catalog.md](constructor-catalog.md);
the reasons behind the choices are in [decisions.md](decisions.md) (D40 to D47).

## The split

| Constructor | BigCommerce |
|---|---|
| which products match, in what order, facets and counts, redirects, autocomplete, learning from events | live card data (name, image, price, localized path), cart, checkout, category tree |

Item ids in the index are **BigCommerce product ids**. Item groups (categories) have slug ids and carry `data.bc_category_id`; `lib/constructor.ts`
reads that tree once (cached 10 minutes) to translate a BigCommerce category id into a group id.

## Server calls (`lib/constructor.ts`)

| Function | API | Used for |
|---|---|---|
| `cioSearch` | `GET /search/{q}` (text) or `GET /browse/group_id/{id}` (no text; `all` for the whole catalog) | listing and category pages; a text search inside a category adds `filters[group_id]` |
| `cioSearchSmart` | search, then Autocomplete when nothing matched | partial words ("exi" finds Exide) |
| `cioSuggest` | `GET /autocomplete/{q}` | type-ahead products and Search Suggestions |

Parameters on every call: `key` (index key), `c` (client label), `i` (client id), `s` (session id), `us` (segments), `section=Products`.
Filters: `filters[brand]=A&filters[brand]=B` (OR within a facet, AND across facets), `filters[price]=min-max`, `sort_by` + `sort_order`,
`num_results_per_page` + `page`. The result carries `result_id`, which tracking events must repeat.

## Visitor identity (`lib/visitor.ts`, `proxy.ts`)

`ConstructorioID_client_id` is created by the proxy on the first request (so the first server-rendered search has a visitor) and reused by the browser
library. The browser library is asked to keep the session in a cookie (`ConstructorioID_session_id`) so the server can send the same `s`; on the very
first request it falls back to `1`. Segments (`cio_segments` cookie, `?segment=garage`, or the debug panel's Segments tab) go out as `us`.

## Tracking (`lib/cio-tracker.ts`, `components/cio-tracking.tsx`)

Official client library (`@constructor-io/constructorio-client-javascript`). On only in production, or with `CIO_TRACKING=on`.

| What happens | Event |
|---|---|
| first page of a visit | `session_start` |
| listing page shown | `search_result_load` (term, result id, ids on the page, page, count) or `browse_result_load` (`group_id`) |
| click on a product card (`data-cio-item`) | search or browse result click |
| product page shown | `item_detail_load` |
| add to cart | `conversion` of type `add_to_cart` |
| suggestion or product chosen in the type-ahead | `autocomplete_select` (section `Search Suggestions` or `Products`) |
| Enter or "See all results" | `search_submit` |
| demo order placed | `purchase` (once per order) |

The server builds the page data (`lib/cio-page.ts`) from the Search/Browse result, so the browser reports the real `result_id` and item ids.

## Debug panel (`CIO_DEBUG=1`, always in development)

Tabs: **This page** (server calls behind the page), **Search box** (calls behind each keystroke), **Events** (every tracking event this browser sent),
**Segments**. Each call shows the request (key hidden), parameters, timing, raw response and a curl command.

## Not carried over from Bloomreach

Media rule banners and grid tiles, the "Showing results for" notice (Constructor corrects typos silently), audiences from the URL (replaced by `us`
segments), content catalog sync and the Data Hub content types (content search stays local), the Bloomreach pixel debug flag.

## A/B test (`CIO_AB_TEST=battery`)

Two tests exist, and they are separate:

- **Constructor's own** (dashboard: Analytics → A/B Testing, Global Search/Browse A/B test): measures **global rules** (Searchandizing → Global Rules; no API for those). Constructor buckets by client id (`i`). Seen from outside in `request.features.disable_test_only_global_rules_search` of a Search response (`true` = group B, rule off). The debug panel's A/B tab shows it (`/api/ab-native`). Started 2026-11-11: "Start Stop" (boost start-stop 7%, add-to-carts, 50/50). First samples showed about 8% in B, not 50%: recheck.
- **The storefront's own** (below): for query-level, segment-targeted tests, which the native one cannot do (no experiment API). Leave `CIO_AB_TEST` unset while a native test runs, so the two do not overlap.

- **Split**: a visitor's client id is hashed (FNV-1a) into group A or B, 50/50 and stable. Group B also gets the segment `ab-battery-b` (`lib/segments.ts`: `abBucket`, `withExperiment`). `cio_ab=a|b` forces a group in one browser.
- **Variant**: a campaign targeted at that segment (`scripts/constructor/configure-segment-campaigns.mjs`, `request_tag_name: user_segment`) puts start-stop batteries first on "battery". Group A is the control.
- **Where the segment goes**: `us` on Search, Browse, Autocomplete and the type-ahead (`lib/visitor.ts`, `app/api/suggest/route.ts`), and the `segments` option of the browser tracker, so events carry it (`lib/cio-tracker.ts`). The tracker reads it when it starts: changing group reloads the page.
- **Debug panel, A/B tab** (`components/cio-ab-tab.tsx`): on/off, what changes, this browser's group with a force switch, both groups' results side by side (`/api/ab-compare`, debug only), a split check. No counts are kept: read results in the dashboard (if it can slice by segment) or from the events.
- Verified in a browser: forcing B changes the segment and 8 of 10 positions for "battery". Not verified: that an event carries the segment, and the dashboard report.
