# Eleventy Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Notes & Tones to Eleventy so essay chrome lives in one layout and index.html, feed.xml and sitemap.xml are generated from front matter, with zero change to deployed URLs or rendered output.

**Architecture:** Eleventy v3 builds from the repo root into `_site/`, replacing the hand-rolled copy step in `.github/workflows/pages.yml`. Single-file essays become front matter + body wrapped by `_includes/layouts/essay.njk`; the two folder-based essays (immigration, income) keep their bespoke HTML and only gain front matter so collections can see them. `htmlTemplateEngine` is disabled so essay HTML is never run through Liquid/Nunjucks (protects inline JS/braces); only `.njk` files and layouts are templated.

**Verification strategy (the "tests"):** Before touching anything, snapshot the current deployable site into `_site_baseline/` using the exact same copy commands as the current workflow. Every task ends by diffing Eleventy's output against that baseline. Target: byte-identical output, tolerating only HTML-entity-equivalent differences from Nunjucks autoescaping (e.g. `"` → `&quot;` inside attributes). Any other diff is a bug — stop and fix before committing.

**Tech Stack:** Eleventy v3 (`@11ty/eleventy`), Nunjucks layouts, Node 20 (installed), GitHub Actions Pages deploy (already in place).

**Critical constraint — subpath hosting:** The site is served at `https://philippeguyard.github.io/notes-and-tones/`. NEVER emit root-absolute URLs (`/essays/...`) in HTML. In templates, use `{{ essay.url.slice(1) }}` for relative links and `{{ site.url }}{{ page.url }}` for absolute ones.

**Commit policy:** Commit locally after each task (per-essay during Task 4). Do not push — the user reviews and pushes. Never mention Claude/AI in commit messages.

---

## Task 0: Baseline snapshot

**Files:**
- Create: `tools/build-baseline.sh`

**Step 1: Write the snapshot script** (mirrors the "Assemble site" step in `.github/workflows/pages.yml` exactly)

```bash
#!/usr/bin/env bash
# Snapshot the current deployable site for diff-verification during the
# Eleventy migration. Mirrors the assemble step in .github/workflows/pages.yml.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf _site_baseline && mkdir _site_baseline
cp index.html 404.html styles.css robots.txt sitemap.xml feed.xml _site_baseline/
cp -R assets essays _site_baseline/
rm _site_baseline/essays/template.html
```

**Step 2: Run it from a clean tree**

```bash
git status --porcelain   # must be empty before snapshotting
chmod +x tools/build-baseline.sh && tools/build-baseline.sh
ls _site_baseline        # expect: 404.html assets essays feed.xml index.html robots.txt sitemap.xml styles.css
```

**Step 3: Commit**

```bash
git add tools/build-baseline.sh
git commit -m "tooling: add baseline snapshot script for eleventy migration"
```

(`_site_baseline/` itself is gitignored in Task 1 — do not commit it.)

---

## Task 1: Eleventy scaffold (passthrough-only build)

Goal: `npm run build` reproduces the baseline exactly, before any templating.

**Files:**
- Create: `package.json`, `eleventy.config.js`, `.eleventyignore`, `essays/essays.11tydata.js`, `_data/site.json`
- Modify: `.gitignore`, `404.html` (front matter only)

**Step 1: Inventory the folder essays** so the passthrough list is complete:

```bash
ls essays/immigration essays/income essays/rudolph
```

Expect subfolders like `css/ js/ data/` for immigration/income and asset files for rudolph. Adjust the passthrough globs in Step 3 to cover everything found EXCEPT `immigration/index.html` and `income/index.html` (those are templates).

**Step 2: `package.json`**

```json
{
  "name": "notes-and-tones",
  "private": true,
  "scripts": {
    "build": "eleventy",
    "serve": "eleventy --serve"
  },
  "devDependencies": {
    "@11ty/eleventy": "^3.0.0"
  }
}
```

Run `npm install`.

**Step 3: `eleventy.config.js`** (CommonJS; adjust passthrough list per Step 1 inventory)

```js
module.exports = function (eleventyConfig) {
  // Essay HTML must never be run through a template engine (inline JS, braces).
  // Only .njk files and layouts are templated.
  eleventyConfig.setTemplateFormats(["html", "njk"]);

  for (const p of [
    "styles.css",
    "robots.txt",
    "assets",
    "essays/*.js",
    "essays/carbon-snapshot.json",
    "essays/rudolph",
    "essays/immigration/css",
    "essays/immigration/js",
    "essays/immigration/data",
    "essays/income/css",
    "essays/income/js",
    "essays/income/data",
  ]) {
    eleventyConfig.addPassthroughCopy(p);
  }

  // "6 August 2026" — matches the hand-written dates exactly
  eleventyConfig.addFilter("essayDate", (d) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    })
  );

  return {
    htmlTemplateEngine: false,
    markdownTemplateEngine: false,
  };
};
```

**Step 4: `.eleventyignore`**

```
README.md
docs/
tools/
essays/template.html
_site_baseline/
```

**Step 5: `essays/essays.11tydata.js`** — keeps flat `essays/<slug>.html` URLs (Eleventy's default would be `essays/<slug>/index.html`) and tags everything into the `essay` collection:

```js
module.exports = {
  tags: ["essay"],
  permalink: (data) => `essays/${data.page.fileSlug}.html`,
};
```

(The folder essays inherit this too; their own front matter overrides the permalink in Task 5.)

**Step 6: `_data/site.json`**

```json
{
  "url": "https://philippeguyard.github.io/notes-and-tones",
  "name": "Notes & Tones",
  "author": "Philippe Guyard",
  "goatcounter": "https://notesandtones.goatcounter.com/count"
}
```

**Step 7: Front matter on `404.html`** — without it, Eleventy outputs `404/index.html` and GitHub Pages stops serving the custom 404. Prepend:

```yaml
---
permalink: "404.html"
---
```

**Step 8: Fix the folder-essay permalinks now** (they'd otherwise collide with the 11tydata permalink as `essays/immigration.html`). Prepend to `essays/immigration/index.html`:

```yaml
---
permalink: "essays/immigration/index.html"
---
```

and the equivalent to `essays/income/index.html`.

**Step 9: `.gitignore`** — add:

```
node_modules/
_site/
_site_baseline/
package-lock.json is NOT ignored — commit it
```

(i.e. add `node_modules/`, `_site/`, `_site_baseline/`; keep `package-lock.json` tracked.)

**Step 10: Build and diff**

```bash
npm run build
diff -r _site_baseline _site
```

Expected diffs at this stage, and ONLY these:
- `feed.xml` and `sitemap.xml` missing from `_site` (generated in Tasks 7–8; still hand-maintained in repo root but root .xml files aren't template formats, so they don't copy — this is fine, they're replaced soon)
- Nothing else. `essays/*.html`, `index.html`, `404.html` must be byte-identical (no front matter added to essays yet, `htmlTemplateEngine` is off, so content passes through untouched apart from stripped front matter on the three files edited above).

If essay HTML differs in any way, stop and investigate before proceeding.

**Step 11: Commit**

```bash
git add package.json package-lock.json eleventy.config.js .eleventyignore \
  essays/essays.11tydata.js _data/site.json 404.html \
  essays/immigration/index.html essays/income/index.html .gitignore
git commit -m "build: add eleventy scaffold with passthrough-identical output"
```

---## Task 2: Essay layout + pilot migration (anova)

**Files:**
- Create: `_includes/layouts/essay.njk`
- Modify: `essays/anova.html`

**Step 1: Create the layout.** This must reproduce the existing chrome byte-for-byte (same attribute order, same self-closing slashes, same entities). Copy the skeleton from the current `essays/anova.html` head, replacing per-page values:

```njk
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{{ title }}</title>
<meta name="description" content="{{ description }}" />
<meta property="og:title" content="{{ og_title }}" />
<meta property="og:description" content="{{ og_description }}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="{{ site.url }}{{ page.url }}" />
<meta property="og:site_name" content="Notes &amp; Tones" />
<meta property="og:image" content="{{ site.url }}/assets/og-card.png" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="canonical" href="{{ site.url }}{{ page.url }}" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E{{ emoji | urlencode }}%3C/text%3E%3C/svg%3E" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..900;1,9..144,400..800&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400..500&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="../styles.css" />
</head>
<body>
<div class="grain" aria-hidden="true"></div>
<div class="sparkles" aria-hidden="true"></div>

<nav class="topnav">
  <a href="../index.html" class="topnav-home">&larr; Notes &amp; Tones</a>
  {%- if nav %}
  <a href="{{ nav.href }}">{{ nav.text }} &rarr;</a>
  {%- endif %}
</nav>

{{ content | safe }}

<footer class="site-foot">
  <p>An essay from Notes &amp; Tones.</p>
  {%- if foot_tagline %}
  <p class="foot-meta">{{ foot_tagline }} <span aria-hidden="true">{{ emoji }}</span></p>
  {%- endif %}
  <p class="foot-meta">{% if foot_link %}<a href="{{ foot_link.href }}">{{ foot_link.emoji }} Read: {{ foot_link.text }}</a> &nbsp;&middot;&nbsp; {% endif %}<a href="../index.html">&larr; All essays</a></p>
  <p class="foot-meta">Published {{ date | essayDate }}</p>
</footer>

{%- if has_script %}
<script src="{{ page.fileSlug }}.js"></script>
{%- endif %}
<script data-goatcounter="{{ site.goatcounter }}" async src="https://gc.zgo.at/count.js"></script>
</body>
</html>
```

IMPORTANT — before finalizing, open the real `essays/anova.html` and match its literal characters exactly: the current files use literal `←`, `→`, `·` (not entities) and `&amp;` in "Notes &amp; Tones". Reproduce whichever form the current files use so the diff is clean. Adjust the layout above accordingly (the entity forms shown here are placeholders; trust the existing files, not this plan).

**Step 2: Convert `essays/anova.html`.** Extract every per-page value from the existing file into front matter, then delete everything the layout now provides (doctype→`</head>`, body openers, nav, footer, scripts, closing tags). Keep `<header class="hero">` through `</main>` as the body. The `updated` timestamp comes from this essay's entry in the current `feed.xml`; `order` is its position on the current `index.html` (anova = 7); `dek` is the card text from `index.html`.

```yaml
---
layout: layouts/essay.njk
title: "Signal or Noise? The Analysis of Variance, made visual"
og_title: "Signal or Noise?"
description: "<exact meta description from the file>"
og_description: "<exact og:description from the file>"
emoji: "⚖️"
date: 2026-08-06
updated: "2026-08-06T12:00:00Z"   # exact value from feed.xml entry
order: 7
dek: "<exact card dek from index.html>"
nav: { href: "confidence.html", text: "Also: Ninety-Five Per Cent Confident?" }
foot_tagline: "<exact tagline from the file's footer>"
foot_link: { href: "confidence.html", emoji: "🎯", text: "<exact footer link text>" }
has_script: true
---
<header class="hero">
...unchanged...
</main>
```

**Step 3: Build and diff the pilot**

```bash
npm run build
diff _site_baseline/essays/anova.html _site/essays/anova.html
```

Expected: empty, or entity-equivalent-only differences (e.g. a straight quote inside a description attribute becoming `&quot;`). Iterate on the layout until this is true. Verify the favicon emoji survived: `grep -o 'font-size=.90.%3E[^%]*%' _site/essays/anova.html` should show the same percent-encoding as the baseline.

**Step 4: Spot-check in a browser**

```bash
npx eleventy --serve
```

Open `http://localhost:8080/essays/anova.html` — widgets must work (drag a slider). Note: if Chrome is occluded, rAF is suspended and animations look frozen — bring the window to front; hard-reload to defeat cache.

**Step 5: Commit**

```bash
git add _includes/layouts/essay.njk essays/anova.html
git commit -m "feat: add essay layout, migrate anova as pilot"
```

---

## Task 3: Migrate the remaining 10 single-file essays

Same recipe as Task 2 Step 2, one essay at a time, one commit each. Extract values from each essay's own head/nav/footer — do not invent or "improve" any text. Checklist (with `order` from current index position):

1. `unicorns.html` (order 1 — nav text uses "Next:" not "Also:", keep it)
2. `ancestry.html` (order 2)
3. `monty-hall.html` (order 3)
4. `confidence.html` (order 4)
5. `screening.html` (order 5)
6. `birthday.html` (order 6)
7. `fourier.html` (order 8)
8. `rudolph.html` (order 9)
9. `carbon.html` (order 10)
10. `bulge.html` (order 13 — has NO nav cross-link: omit `nav` entirely)

Per essay:

```bash
npm run build && diff _site_baseline/essays/<slug>.html _site/essays/<slug>.html
git add essays/<slug>.html && git commit -m "refactor: migrate <slug> to essay layout"
```

Watch for per-essay quirks the layout doesn't cover (the survey found none beyond nav/footer variation, but verify via the diff, not assumption). If an essay genuinely deviates, prefer a front-matter flag over a second layout.

---

## Task 4: Front matter for folder essays

**Files:**
- Modify: `essays/immigration/index.html`, `essays/income/index.html` (extend the front matter added in Task 1)

These keep their full bespoke HTML — front matter exists only so index/feed/sitemap can see them. Extend each file's front matter (values from current `index.html` cards and `feed.xml`):

```yaml
---
permalink: "essays/income/index.html"
title: "Income: perception vs reality"
emoji: "💷"
date: 2026-08-06
updated: "2026-08-06T15:00:00Z"   # exact value from feed.xml
order: 11
dek: "<exact card dek from index.html>"
card_url: "essays/income/"
---
```

(immigration: order 12, its own values.) `card_url` records the trailing-slash URL used by the current cards/feed/sitemap.

Build, then `diff _site_baseline/essays/income/index.html _site/essays/income/index.html` — identical (front matter strips, content untouched). Same for immigration. Commit: `refactor: add collection front matter to folder essays`.

---

## Task 5: Generated home page

**Files:**
- Create: `index.njk`
- Delete: `index.html`

**Step 1:** Copy the current `index.html` verbatim into `index.njk`, then replace ONLY the `<ul class="essay-list">` contents with:

```njk
<ul class="essay-list">
{%- for essay in collections.essay | sort(false, false, "data.order") %}
  <li class="essay-card">
    <a href="{{ essay.data.card_url or essay.url.slice(1) }}">
      <span class="essay-emoji" aria-hidden="true">{{ essay.data.emoji }}</span>
      <h2 class="essay-title">{{ essay.data.og_title or essay.data.title }}</h2>
      <p class="essay-dek">{{ essay.data.dek }}</p>
      <span class="essay-date">{{ essay.data.date | essayDate }}</span>
      <span class="essay-go">Read &rarr;</span>
    </a>
  </li>
{%- endfor %}
</ul>
```

CHECK against the real cards first: card titles may not equal `og_title` everywhere (e.g. immigration's card title vs og:title). If any card text can't be derived, give that essay an explicit front-matter field (`card_title`) rather than bending the shared fields. As in Task 2, match the file's literal `→` vs entity usage.

**Step 2:** `git rm index.html`, build, then:

```bash
diff _site_baseline/index.html _site/index.html
```

Expected: identical modulo entity-equivalents. Card order must match exactly — 13 cards, unicorns first, bulge last.

**Step 3:** Commit: `feat: generate home page from essay collection`

---

## Task 6: Generated Atom feed

**Files:**
- Create: `feed.njk`
- Delete: `feed.xml`

**Step 1: `feed.njk`** — reproduce the current structure exactly (compare with the real `feed.xml` while writing):

```njk
---
permalink: "feed.xml"
eleventyExcludeFromCollections: true
---
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>{{ site.name }}</title>
  <subtitle>Short, interactive essays on ideas worth poking at.</subtitle>
  <link href="{{ site.url }}/" />
  <link rel="self" href="{{ site.url }}/feed.xml" />
  <id>{{ site.url }}/</id>
  {%- set newest = collections.essay | sort(true, false, "data.updated") | first %}
  <updated>{{ newest.data.updated }}</updated>
  <author><name>{{ site.author }}</name></author>
{% for essay in collections.essay | sort(true, false, "data.updated") %}
  <entry>
    <title>{{ essay.data.og_title or essay.data.title }}</title>
    <link href="{{ site.url }}/{{ essay.data.card_url or essay.url.slice(1) }}" />
    <id>{{ site.url }}/{{ essay.data.card_url or essay.url.slice(1) }}</id>
    <updated>{{ essay.data.updated }}</updated>
    <summary>{{ essay.data.dek }}</summary>
  </entry>
{% endfor %}
</feed>
```

CHECK: current feed entry titles and summaries against `og_title`/`dek` — where they differ, add explicit `feed_title`/`feed_summary` front matter to that essay instead of changing shared fields. Entry order in the current feed is newest-first; ties (same timestamp) must keep the current relative order — if the sort is unstable for ties, adjust `updated` seconds in front matter to disambiguate rather than reordering the feed.

**Step 2:** `git rm feed.xml`, build, `diff _site_baseline/feed.xml _site/feed.xml`. Expected: identical modulo entity-equivalents and possibly trailing whitespace from Nunjucks control tags — tune `{%-` trimming until clean.

**Step 3:** Commit: `feat: generate atom feed from essay collection`

---

## Task 7: Generated sitemap

**Files:**
- Create: `sitemap.njk`
- Delete: `sitemap.xml`

```njk
---
permalink: "sitemap.xml"
eleventyExcludeFromCollections: true
---
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>{{ site.url }}/</loc><lastmod>{{ (collections.essay | sort(true, false, "data.updated") | first).data.updated.slice(0, 10) }}</lastmod></url>
{%- for essay in collections.essay | sort(false, false, "data.order") %}
  <url><loc>{{ site.url }}/{{ essay.data.card_url or essay.url.slice(1) }}</loc><lastmod>{{ essay.data.updated.slice(0, 10) }}</lastmod></url>
{%- endfor %}
</urlset>
```

Note the current sitemap orders entries by index position (not date) and folder essays use trailing-slash URLs — the above reproduces both. `git rm sitemap.xml`, build, `diff _site_baseline/sitemap.xml _site/sitemap.xml`, tune whitespace, commit: `feat: generate sitemap from essay collection`.

---

## Task 8: New-essay template + docs

**Files:**
- Rewrite: `essays/template.html`
- Modify: `README.md` (if it documents the add-an-essay flow)

Rewrite `essays/template.html` as the new starter: front matter block (all fields from Task 2 with placeholder values and one-line comments) + a skeleton `<header class="hero">`/`<main>` body. Update its checklist comment: adding an essay is now (1) copy template to `essays/<slug>.html`, (2) fill front matter + body, (3) add `essays/<slug>.js` if it has widgets (`has_script: true`) — index, feed and sitemap update themselves. Remove the "add a card to index.html" step. It stays in `.eleventyignore` so it never builds.

Check README for stale instructions (manual feed/sitemap/index editing) and update. Commit: `docs: update essay template and README for eleventy workflow`.

---

## Task 9: Deploy workflow

**Files:**
- Modify: `.github/workflows/pages.yml`

Replace the "Assemble site" step with:

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Build site
        run: npm run build
```

(Keep checkout, upload-pages-artifact with `path: _site`, and deploy steps unchanged.) Commit: `build: deploy via eleventy build`.

---

## Task 10: Final verification

**Step 1: Full-site diff**

```bash
rm -rf _site && npm run build
diff -r _site_baseline _site
```

Review every remaining line. Acceptable: entity-equivalent attribute escaping only. Confirm no files are missing and none extra (`template.html` must NOT be in `_site`).

**Step 2: File inventory check**

```bash
(cd _site_baseline && find . -type f | sort) > /tmp/baseline-files.txt
(cd _site && find . -type f | sort) > /tmp/site-files.txt
diff /tmp/baseline-files.txt /tmp/site-files.txt   # expect empty
```

**Step 3: Serve and click through** — `npm run serve`; check home page cards, one code-along essay (carbon), one d3 folder essay (immigration), the 404, and view-source on one essay to sanity-check the head.

**Step 4: Hand back to the user** — summarize the diff review, then STOP. The user reviews and pushes; the first real deploy is the production test. Do not push. After a successful deploy, `rm -rf _site_baseline` and delete `tools/build-baseline.sh` in a cleanup commit if the user agrees.
