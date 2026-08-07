# Notes & Tones

Short, interactive essays on ideas worth poking at — with sliders you can
drag, tables you can break, and numbers you can poke.

Static site built with [Eleventy](https://www.11ty.dev/): essays are HTML
bodies with front matter, and the shared chrome, home page, feed and sitemap
are generated at build time. Deployed via GitHub Pages.

## Structure

```text
index.njk           Home page template — builds the essay cards from front matter
styles.css          Shared, site-wide styles (all pages link to this)
404.html            Custom not-found page (GitHub Pages picks it up)
robots.txt          Crawler policy + sitemap pointer
sitemap.njk         Sitemap template — one entry per page, generated
feed.njk            Atom feed template, newest first, generated
eleventy.config.js  Eleventy config (passthrough copies, filters)
_includes/
  layouts/essay.njk Shared essay chrome (head, top nav, footer, scripts)
_data/
  site.json         Site-wide data (base URL, analytics id)
assets/
  og-card.png       Social-share card (source: tools/og-card.html)
essays/
  unicorns.html     The Genetics of Unicorns          + unicorns.js
  ancestry.html     How Much Italian Are You?         + ancestry.js
  monty-hall.html   To Switch, or Not to Switch?      + monty-hall.js
  confidence.html   Ninety-Five Per Cent Confident?   + confidence.js
  anova.html        Signal or Noise?                  + anova.js
  fourier.html      Drawn by Circles                  + fourier.js
  rudolph.html      Drawing Rudolph with Maths        + rudolph/ (assets, build script)
  carbon.html       When Should I Run My Dishwasher?  + carbon.js (+ carbon-snapshot.json)
  income/           Income: Perception vs Reality — d3 scrollytelling data essay
  immigration/      Immigration: Perception vs Reality — d3 scrollytelling data essay
  template.html     Skeleton to copy when adding a new essay
tools/
  income/           Builds the income essay's JSON from the marimo HBAI data (not served)
  immigration/      Data pipeline + research for the immigration essay (not served)
  carbon/           Refreshes carbon-snapshot.json (the live-API fallback) — not served
```

Each single-file essay in `essays/` is a front matter block plus the hero and
main body; `_includes/layouts/essay.njk` wraps it with the head, top nav and
footer. If it has interactive widgets, its own `<slug>.js` sits next to it
(`has_script: true`). The two folder essays (income, immigration) keep their
bespoke HTML.

## Adding a new essay

1. Copy `essays/template.html` to `essays/<slug>.html`.
2. Fill in the front matter (title, description, emoji, date, `order` for the
   home-page position, dek, footer links) and the hero + prose sections.
3. If it has widgets, add `essays/<slug>.js` and set `has_script: true`. Put
   any bespoke widget styles in `styles.css`.

The home page card, `feed.xml` and `sitemap.xml` are generated from the front
matter — no manual edits.

## Run locally

```bash
npm install
npm run serve    # dev server with live reload
npm run build    # one-off build into _site/
```

## Deploy

Pushing to `main` runs `.github/workflows/pages.yml`, which runs
`npm run build` and publishes `_site/` (so no `docs/`, `tools/`, README, or
`essays/template.html`) to GitHub Pages. Live at
<https://philippeguyard.github.io/notes-and-tones/>.

## Licence

Code is MIT (see `LICENSE`); essay text and figures are
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
