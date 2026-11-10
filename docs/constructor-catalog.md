# Importing the Batteries & Chargers catalog into Constructor

How the "Reza" index (`key_fWBvGxve8KzBSkXm`) was cleared and loaded, plus a sample request for every kind of call used.
Status of each call is marked: **verified** (run against the live index on 2026-10-30) or **not run** (taken from the docs, untested).

## Setup

```bash
cd Workspaces/ConstructorIO
set -a; . ./.env.local; set +a          # CONSTRUCTOR_API_TOKEN
export K=key_fWBvGxve8KzBSkXm           # index key
export B=https://ac.cnstrc.com
```

- **Auth:** HTTP Basic, the API token as the username and no password: `curl -u "$CONSTRUCTOR_API_TOKEN:" ...`. Public calls (search, browse, autocomplete) need only `key`.
- `section=Products` is required on **item** calls and **must be left off item-group calls** (`section: extra fields not permitted`).
- `c=<client>` is a free label identifying the caller; the scripts use `cio-demo-loader`.
- Every write returns `{"task_id": N}`. Poll it (see "Tasks"). The search index then rebuilds in the background; **allow 3 to 10 minutes** before results change.

| Where | What |
|---|---|
| `scripts/build-catalog.mjs` | BigCommerce channel -> `data/catalog/items.jsonl` + `item_groups.jsonl` (read-only on BigCommerce) |
| `scripts/configure-index.mjs` | facets, searchabilities, sort options, synonyms (idempotent; `--dry-run` prints without sending) |
| `scripts/explore-bc.mjs` | read-only summary of the BigCommerce data |
| `data/backup-before-replace/` | the 100 sample fashion items that were in the index before |

## 1. Build the files (verified)

```bash
node scripts/build-catalog.mjs ../Elasticsearch/.env.local data/catalog
```

Reads BigCommerce channel `BC_CHANNEL_ID`, writes 150 items (130 Battery, 20 Charger) and 19 groups. Every BigCommerce custom field becomes a
snake_case key under `data` (`voltage`, `technology`, `capacity_ah`, `cca`, ...) and numeric twins are added (`voltage_v`, `capacity_ah`, `cca_a`,
`capacity_mah`) for range facets and numeric sorts. No variations: every product has a single BigCommerce variant.

Item shape:

```json
{"id":"377","name":"Exide AGM G34 EK508 Start-Stop Car Battery 12V 50Ah 800A",
 "data":{"active":true,"sku":"VC9596","mpn":"EK508","gtin":"3661024036481","brand":"Exide","product_type":"Battery",
         "price":165.6,"in_stock":true,"url":"/products/automotive-batteries/car-batteries/...","image_url":"https://...",
         "group_ids":["car-batteries"],"voltage":"12 V","voltage_v":12,"capacity_ah":50,"cca":"800 A (EN)","cca_a":800,"technology":"AGM"}}
```

Group shape (v2 uses `parent_ids`, an array):

```json
{"id":"car-batteries","name":"Car Batteries","parent_ids":["automotive-batteries"],"data":{"url":"/products/automotive-batteries/car-batteries/"}}
```

## 2. Back up, then clear and load

### Back up what is there (verified)

```bash
for r in items variations item_groups; do
  curl -s -u "$CONSTRUCTOR_API_TOKEN:" "$B/v2/$r?key=$K&num_results_per_page=100&page=1" > data/backup-before-replace/$r.json
done
```

### Full replace = clear + load in one step (verified)

`PUT /v1/catalog` deletes every record not in the files and upserts the ones that are. Constructor refuses a sync that would remove more than 50%
of the catalog unless `force=true`; replacing the 100 sample items needed it.

```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -X PUT \
  "$B/v1/catalog?key=$K&section=Products&format=jsonl&force=true&c=cio-demo-loader" \
  -F "items=@data/catalog/items.jsonl" -F "item_groups=@data/catalog/item_groups.jsonl"
# {"task_id":479592583,"task_status_path":"/v1/task/479592583"}
```

Result of the real run: `items_deleted 100, items_updated 150, item_groups_updated 19`. A file you leave out is left untouched (no variations file was sent).

### Clear only, by keeping nothing (not run)

IDs mode with empty files deletes all records of that type. Destructive; the catalog is empty until the next load.

```bash
: > /tmp/empty.jsonl
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -X PUT "$B/v1/catalog?key=$K&section=Products&format=jsonl&mode=ids&force=true" -F "items=@/tmp/empty.jsonl"
```

### Delta upload from files (not run)

`PATCH /v1/catalog` adds or updates only the records in the files (a delta needs the whole record; a patch delta changes only the fields given).

```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -X PATCH "$B/v1/catalog?key=$K&section=Products&format=jsonl" -F "items=@data/new-items.jsonl"
# patch delta: add &patch_delta=true&on_missing=CREATE   (or IGNORE)
```

## 3. Tasks (verified)

```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" "$B/v1/task/479592583?key=$K"
# {"status":"DONE","result":{"changelog":{"sections":{"Products":{"items_deleted":100,"items_updated":150}}},"index_built":false}}
curl -s -u "$CONSTRUCTOR_API_TOKEN:" "$B/v1/tasks?key=$K&num_results_per_page=5"      # recent tasks
```

Status goes `DONE` or `FAILED` within seconds. `DONE` means the data is stored, **not** that search sees it yet.

## 4. Items (single products)

All v2 item calls take **arrays** (up to 10,000). Add `&section=Products`.

### Read (verified)

```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" "$B/v2/items?key=$K&section=Products&num_results_per_page=10&page=1"   # list + total_count
curl -s -u "$CONSTRUCTOR_API_TOKEN:" "$B/v2/items/377?key=$K&section=Products"                               # one item
```

### Add a product (verified)

```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -H "Content-Type: application/json" -X PATCH \
  "$B/v2/items?key=$K&section=Products&on_missing=CREATE&c=cio-demo-loader" -d '{"items":[{
    "id":"demo-001","name":"Demo Battery 12V 7Ah",
    "data":{"active":true,"sku":"DEMO-001","brand":"Demo","product_type":"Battery","price":19.9,"url":"/products/demo-001/",
            "image_url":"https://example.com/demo.png","description":"...","group_ids":["car-batteries"],"voltage":"12 V","voltage_v":12,"capacity_ah":7}}]}'
```

`group_ids` must name groups that already exist (an unknown id is dropped, the item is stored with `group_ids: null`). Without `on_missing=CREATE` an unknown id is an error.

### Update some fields of a product (verified)

Other fields are kept.

```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -H "Content-Type: application/json" -X PATCH \
  "$B/v2/items?key=$K&section=Products" -d '{"items":[{"id":"demo-001","data":{"price":17.5}}]}'
```

### Delete products (verified)

```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -H "Content-Type: application/json" -X DELETE \
  "$B/v2/items?key=$K&section=Products" -d '{"items":[{"id":"demo-001"}]}'
```

To keep an item's learnings but hide it, set `"active": false` instead of deleting.

> **Danger:** `PUT /v2/items` is "create or replace": it **replaces the whole item list** with the array you send. Use `PATCH` for single products.

## 5. Item groups (categories)

The v1 group endpoints are **disabled on this account** ("multiple item group parents feature enabled"), so use v2 with `parent_ids`. **No `section` parameter.**

### List (verified)

```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" "$B/v2/item_groups?key=$K&num_results_per_page=50"
```

### Create a group (verified)

v2 has no single-create. `PUT /v2/item_groups` **replaces the whole tree**, so send every existing group plus the new one:

```bash
# build the full list from the source file, add the new group, PUT it
python3 -I -c "import json;g=[json.loads(l) for l in open('data/catalog/item_groups.jsonl')];g.append({'id':'demo-group','name':'Demo Group','parent_ids':['all'],'data':{}});print(json.dumps({'item_groups':g}))" > /tmp/groups.json
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -H "Content-Type: application/json" -X PUT "$B/v2/item_groups?key=$K&c=cio-demo-loader" -d @/tmp/groups.json
```

Also add the group to `data/catalog/item_groups.jsonl`, or the next full sync deletes it.

### Rename / change a group (verified)

`PATCH` updates existing groups only (no `on_missing`).

```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -H "Content-Type: application/json" -X PATCH "$B/v2/item_groups?key=$K" \
  -d '{"item_groups":[{"id":"demo-group","name":"Demo Group (renamed)"}]}'
```

### Delete a group (verified)

```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -H "Content-Type: application/json" -X DELETE "$B/v2/item_groups?key=$K" -d '{"item_groups":[{"id":"demo-group"}]}'
```

## 6. Variations (not run)

None are loaded. If a product ever gets variants (size, colour), send a `variations.jsonl` in the catalog PUT, or use `PATCH /v2/variations`.
Shared fields stay on the item, variant-specific ones (SKU, price) go on the variation; see the docs page "Items & variations".

## 7. Configuration

Run all of it with `node scripts/configure-index.mjs`. The calls it makes:

### Facets (verified)

20 facets, replaced as a whole. Types: `multiple`, `range`, `hierarchical`. A facet's `path_in_metadata` is the key under `data`.

```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -H "Content-Type: application/json" -X PUT "$B/v2/facets?key=$K&section=Products" -d '{"facets":[
  {"name":"brand","path_in_metadata":"brand","type":"multiple","display_name":"Brand","sort_order":"value"},
  {"name":"capacity_ah","path_in_metadata":"capacity_ah","type":"range","display_name":"Capacity (Ah)",
   "range_type":"static","range_format":"boundaries","range_limits":[10,30,50,70,100,150,200],"range_inclusive":"above"},
  {"name":"un_code","path_in_metadata":"un_code","type":"multiple","hidden":true}]}'
curl -s -u "$CONSTRUCTOR_API_TOKEN:" "$B/v2/facets?key=$K&num_results_per_page=100"        # read back
```

Maximum 25 facets in the PUT. Not run: single-facet create/update/delete (`POST/PATCH/DELETE /v2/facets/{name}`) and facet options (`/v1/facets/{name}/options`).

### Searchabilities (verified)

Upsert, up to 60 per call. `fuzzy_searchable` (typos), `exact_searchable` (IDs such as SKU/MPN/GTIN), `displayable` (returned in results), `hidden` (indexed, not returned).

```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -H "Content-Type: application/json" -X PATCH "$B/v2/searchabilities?key=$K&section=Products" -d '{"searchabilities":[
  {"name":"brand","fuzzy_searchable":true,"displayable":true},
  {"name":"mpn","exact_searchable":true,"displayable":true}]}'
curl -s -u "$CONSTRUCTOR_API_TOKEN:" "$B/v2/searchabilities?key=$K&num_results_per_page=200"   # read back
# add &skip_rebuild=true to batch several changes before one rebuild
```

### Sort options (verified)

```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -H "Content-Type: application/json" -X PUT "$B/v1/sort_options?key=$K&section=Products" -d '{"sort_options":[
  {"display_name":"Price: Low to High","path_in_metadata":"price","sort_by":"price","sort_order":"ascending","position":1}]}'
```

Use: `sort_by=price&sort_order=ascending` on Search or Browse.

### Synonym groups (verified)

```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -H "Content-Type: application/json" -X POST "$B/v1/synonym_groups?key=$K&section=Products" -d '{"synonyms":["cca","cold cranking amps"]}'
curl -s -u "$CONSTRUCTOR_API_TOKEN:" "$B/v1/synonym_groups?key=$K&section=Products&num_results_per_page=100"
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -X DELETE "$B/v1/synonym_groups/<id>?key=$K&section=Products"
```

Not run: one-way synonyms (`POST /v2/one_way_synonyms/{parent_phrase}` with `{"child_phrases":[{"phrase":"..."}]}`).

## 8. Check it (verified, public calls, no token)

```bash
q() { curl -s "$B$1&key=$K&c=cio-demo&i=demo-client&s=1"; }
q "/search/agm%20battery%2012v?num_results_per_page=4"                       # search
q "/search/exide%20batery?num_results_per_page=3"                            # typo tolerance
q "/search/cold%20cranking%20amps?num_results_per_page=3"                    # synonym of cca
q "/browse/group_id/car-batteries?num_results_per_page=3"                    # browse a group
q "/search/battery?filters%5Bbrand%5D=Exide&sort_by=price&sort_order=ascending"
curl -s "$B/autocomplete/exi?key=$K&c=cio-demo&i=demo-client&s=1&num_results=4"
```

`i` (client id) and `s` (session) are required by Search/Browse/Autocomplete.

## 9. Search, Autosuggest, Browse and facet rules

Scripts: `scripts/configure-rules.mjs` (redirects + query rules) and `scripts/configure-browse-facet-rules.mjs` (browse + facet rules). Both are re-runnable.

**Limit of the public API:** there is no endpoint for a rule that applies to *every* query (the dashboard's "global" rules) and none for Autosuggest-only rules.
Redirect rules apply to Search and Autosuggest; the rest are per search term, per browse page or per facet value.

### Keyword redirects (created and read back; **not seen firing yet**)
```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -H "Content-Type: application/json" -X POST "$B/v1/redirect_rules?key=$K" -d '{
  "url":"/products/chargers-accessories/jump-starters-boosters/",
  "matches":[{"pattern":"jump starter","match_type":"EXACT"},{"pattern":"booster","match_type":"EXACT"}],
  "metadata":{"source":"cio-demo-loader"}}'
curl -s -u "$CONSTRUCTOR_API_TOKEN:" "$B/v1/redirect_rules?key=$K"                      # list
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -X DELETE "$B/v1/redirect_rules/<id>?key=$K"       # delete
```
`match_type`: `EXACT`, `PHRASE`, `UNORDERED`. Two rules exist (jump starters, lithium). They do fire (`response.redirect` replaces the results), but a created rule took
over 15 minutes to go live and a deleted one lingers just as long.

**No redirect for "charger":** I first redirected "charger(s)" to the chargers category, which made the "charger" search page unreachable and hid its query rule and
facet campaign. That redirect was deleted. A redirect replaces the whole results page, so only redirect terms that have no search page of their own.

### Query rules (verified)
`POST /v1/refined_queries?section=Products` with `query` plus any of `boost_rules`, `blacklist_rules`, `whitelist_rule`, `slot_rules`. Rules are addressed by **numeric id** (a 409 on create tells you the id, `GET /v1/refined_queries` lists them): replace with `PUT /v1/refined_queries/{id}`, delete with `DELETE /v1/refined_queries/{id}`. `scripts/configure-rules.mjs` looks the id up and replaces or creates.
```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -H "Content-Type: application/json" -X POST "$B/v1/refined_queries?key=$K&section=Products" -d '{
  "query":"charger","whitelist_rule":{"rule":{"filters":{"product_type":["Charger"]}}}}'
```
Live: `battery` boosts `product_type=Battery` (+5), `charger` allowlists `product_type=Charger` (38 results became 20), `start stop` boosts `start_stop=Yes` (+5). Filters use facet keys.

### Browse rules (verified)
`PUT /v1/refined_filters/{filter_name}/{filter_value}?section=Products`. A category page is `group_id/<group id>`; a facet page is `<facet>/<value>`. Same rule types as query rules.
```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -H "Content-Type: application/json" -X PUT "$B/v1/refined_filters/group_id/battery-chargers?key=$K&section=Products" \
  -d '{"slot_rules":[{"rule":{"item_id":"507","position":1}}]}'
curl -s -u "$CONSTRUCTOR_API_TOKEN:" "$B/v1/refined_filters?key=$K&section=Products"       # list
```
Live: chargers page pins CTEK (507) first; `brand/Exide` pins 377 first; `car-batteries` boosts `technology=AGM` (+3, a moderate lift, not a hard sort);
`lithium-lifepo4-batteries` boosts `warranty=24 months` (+3).

### Facet rules (verified: saved and read back)
`PATCH /v1/facets/{facet}/options?section=Products` with an array: `value`, `display_name`, `position`, `hidden`.
```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -H "Content-Type: application/json" -X PATCH "$B/v1/facets/start_stop/options?key=$K&section=Products" \
  -d '[{"value":"Yes","display_name":"Start-Stop compatible"},{"value":"No","hidden":true}]'
curl -s -u "$CONSTRUCTOR_API_TOKEN:" "$B/v1/facets/voltage/options?key=$K&section=Products"
```
Set: `voltage` (12 V, 24 V, 6 V first), `brand` (Exide, Varta, Bosch first), `start_stop` (readable label, "No" hidden). Their effect on the response is not visible while the
`facets` array stays empty (open issue above).

### Facet campaigns: which facets show on a page (created and read back; live effect checked once, see State)
`POST /v1/facet_rule_campaigns?section=Products`. A campaign has a `name`, the pages it applies to (`refined_queries` = search terms, `refined_filters` = browse pages) and facet rules:
`blacklist_rules` hide a facet, `slot_rules` pin a facet to a position. List with `GET`, delete with `DELETE /v1/facet_rule_campaigns/{id}`. `scripts/configure-facet-campaigns.mjs` is re-runnable.
```bash
curl -s -u "$CONSTRUCTOR_API_TOKEN:" -H "Content-Type: application/json" -X POST "$B/v1/facet_rule_campaigns?key=$K&section=Products" -d '{
  "name":"Car batteries: fitment facets first",
  "refined_filters":[{"filter_name":"group_id","filter_value":"car-batteries"}],
  "slot_rules":[{"target":"facet_group","rule":{"name":"start_stop","position":1}},{"target":"facet_group","rule":{"name":"cca_a","position":2}}]}'
```
Two campaigns: chargers (search "charger" + the chargers page) hide `cca_a`, `capacity_ah`, `polarity`, `terminal_type`, `hold_down`, `layout`, `case_size`; car batteries slot `start_stop`, `cca_a`, `capacity_ah` first.
To hide one facet *value* (not a whole facet) use the facet options call above.

## State on 2026-10-30

Works (checked live): 150 items, 19 groups, search, typo tolerance, synonyms, browse by group, brand filter, autocomplete, 7 sort options, 17 visible facets
(20 with hidden), the capacity range filter (`50-70` returns 13), keyword redirects (`chargers` returns a `redirect` object), query rules, browse slot/boost rules,
and the chargers facet campaign (that page shows 6 facets).

**Open:**
- **Exact search on custom ID fields.** `sku`, `mpn` and `gtin` are `exact_searchable` (same config) but return 0 for values that are not also in the product name
  (`VC9596`, `TMSG65`, GTIN `3661024036481`). The built-in `id` field works (`377` finds product 377). An earlier note here said MPN worked: that was wrong, `EK508`
  matched because it is in the product name. A second ingest of the same files (after the config existed) did not fix it within 6 minutes; not diagnosed.
  Workaround to try: add the SKU/MPN to `keywords` (fuzzy searchable), or ask Constructor support.
- **Not yet seen live:** the facet value rules (brand order, "Start-Stop compatible" label, hiding "No") and the car-batteries facet order. Both are saved and read back correctly;
  they may need more time. Recheck, and use the dashboard (Facets) if they never apply.

Changes took 5 to 15 minutes to appear in search; facets and redirects were the slowest.

## Gotchas

- The docs site (`docs.constructor.com`) returns a bot challenge after a burst of requests; fetch pages one at a time.
- Searchability and facet changes take effect only after an index rebuild (minutes), and the first build after a catalog replace took about 3 minutes.
- `force=true` is needed when a sync or delete would remove more than 50% of a catalog part.
- `PUT` on items, groups, facets and sort options replaces the whole set; `PATCH` updates.
- Never commit `.env.local` (it holds the API token).
