"""Add the battery blog posts (data/content_batteries.py, EN + FR) to Amplience and publish them. Nothing else is touched.

    python3 scripts/amplience/add_posts.py --check        # validate the data and show the plan; no network, no credentials
    python3 scripts/amplience/add_posts.py                # create or update the 5 posts (and their text items), then publish them
    python3 scripts/amplience/add_posts.py --no-publish   # leave them as drafts

Idempotent: items are upserted by label ("Post: <slug>", "Post text: <slug>"), so a rerun updates them in place.
Reuses the guide photos and the authors that seed.py already created (it never uploads or edits them).
Needs AMPLIENCE_PAT, AMPLIENCE_HUB_ID and AMPLIENCE_HUB_NAME in .env.local (or the environment) unless --check.
The hub is shared by every storefront that reads it, so published posts appear on all of them.
"""
import re
import sys
import textwrap
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from data.content import AUTHORS  # noqa: E402
from data.content_batteries import POSTS_BATTERIES  # noqa: E402


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def shorten(s, n=180):
    return textwrap.shorten(s, n, placeholder="…")


def md(intro, s1, s2, tk, heading):
    bullets = "\n".join(f"- {t}" for t in tk)
    return f"{intro}\n\n## {s1[0]}\n\n{s1[1]}\n\n## {s2[0]}\n\n{s2[1]}\n\n## {heading}\n\n{bullets}\n"


def validate():
    seen = set()
    for p in POSTS_BATTERIES:
        en, fr = p["en"], p["fr"]
        assert len(en) == 5 and len(fr) == 5, f"{en[0]}: each language needs (title, intro, section, section, takeaways)"
        assert len(en[4]) == len(fr[4]), f"{en[0]}: takeaways differ between EN and FR"
        slug = slugify(en[0])
        assert slug not in seen, f"duplicate slug {slug}"
        seen.add(slug)
        date.fromisoformat(p["date"])
        assert 0 <= p["author"] < len(AUTHORS)
    return seen


def main():
    slugs = validate()
    publish = "--no-publish" not in sys.argv
    if "--check" in sys.argv:
        for p in POSTS_BATTERIES:
            en = p["en"]
            words = len(en[1].split()) + len(en[2][1].split()) + len(en[3][1].split())
            print(f"  blog/{slugify(en[0])}  {p['date']}  {AUTHORS[p['author']]['name']}  ~{words} words  image {p['image']}")
        print(f"{len(slugs)} posts OK (EN + FR). Nothing was sent.")
        return

    from lib import CONTENT_REPO, L, Items, clink  # noqa: E402  (needs credentials)

    items = Items()

    def find(label):
        it = items.existing.get((CONTENT_REPO, label))
        if not it:
            raise SystemExit(f"missing in the hub: '{label}'. Run seed.py first (it creates the authors and the guide photos).")
        return it["id"]

    ids = []
    for p in POSTS_BATTERIES:
        (title, intro, s1, s2, tk), (title_f, intro_f, s1f, s2f, tkf) = p["en"], p["fr"]
        slug = slugify(title)
        author = find(f"Author: {AUTHORS[p['author']]['name']}")
        image = find(f"Image: {p['image']}")
        text = items.upsert("text", f"Post text: {slug[:70]}", {"text": L(md(intro, s1, s2, tk, "Key takeaways"), md(intro_f, s1f, s2f, tkf, "À retenir"))})
        words = len(intro.split()) + len(s1[1].split()) + len(s2[1].split())
        ids.append(items.upsert("blogpost", f"Post: {slug[:80]}", {
            "_meta": {"deliveryKey": f"blog/{slug}"},
            "account": "Commerce B2B",
            "title": L(title, title_f),
            "authors": [clink("author", author)],
            "date": p["date"],
            "category": "Various",
            "description": L(shorten(intro), shorten(intro_f)),
            "image": clink("image", image),
            "tags": ["batteries", "b2b commerce"],
            "readTime": max(3, round(words * 3 / 200)),
            "content": [clink("text", text)],
        }))
        print(f"  blog/{slug}")
    print(f"{len(ids)} posts upserted")

    # "Latest articles" on the blog page is a hand-curated list of links, not a query: point it at the newest posts by date.
    from lib import rest  # noqa: E402

    dated = []
    for (repo, label), it in items.existing.items():
        if repo == CONTENT_REPO and label.startswith("Post: "):
            body = it.get("body") or rest("GET", f"/content-items/{it['id']}")["body"]
            dated.append((body.get("date", ""), it["id"], label))
    newest = sorted(dated, reverse=True)[:3]
    items.upsert("post-grid", "Blog latest articles", {"title": L("Latest articles", "Derniers articles"), "posts": [clink("blogpost", i) for _, i, _ in newest]})
    print("latest articles:", ", ".join(f"{d} {l[6:50]}" for d, _, l in newest))

    if publish:
        print("== publishing")
        items.publish_all()
        print("done")
    else:
        print("left as drafts (--no-publish)")


if __name__ == "__main__":
    main()
