# Notes & Tones

Short, interactive essays on how science actually works — with sliders you can
drag, tables you can break, and numbers you can poke.

Static site: hand-written HTML/CSS/JS, no build step. Deployed via GitHub Pages.

## Structure

```text
index.html          Home page — lists the essays as cards
styles.css          Shared, site-wide styles (all pages link to this)
essays/
  unicorns.html     The Genetics of Unicorns          + unicorns.js
  ancestry.html     How Much Italian Are You?         + ancestry.js
  monty-hall.html   To Switch, or Not to Switch?      + monty-hall.js
  confidence.html   Ninety-Five Per Cent Confident?   + confidence.js
  anova.html        Signal or Noise?                  + anova.js
  fourier.html      Drawn by Circles                  + fourier.js
  rudolph.html      Drawing Rudolph with Maths        + rudolph/ (assets, build script)
  immigration/      Perception vs Reality — d3 scrollytelling data essay
  template.html     Skeleton to copy when adding a new essay
tools/
  immigration/      Data pipeline + research for the immigration essay (not served)
```

Each essay is a self-contained page in `essays/` that links back to
`../styles.css` and, if it has interactive widgets, its own `<slug>.js`
sitting next to it. There are no dates anywhere — essays are a collection,
not a dated feed.

## Adding a new essay

1. Copy `essays/template.html` to `essays/<slug>.html`.
2. Fill in the title, meta tags, hero, and prose sections.
3. Pick a favicon emoji in the `<link rel="icon">` line.
4. If it has widgets, add `essays/<slug>.js` and uncomment the `<script>` tag
   at the bottom of the page. Put any bespoke widget styles in `styles.css`.
5. Add a card for it on the home page (`index.html`, inside `.essay-list`).

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Pushing to `main` triggers the GitHub Pages build. Live at
<https://philippeguyard.github.io/notes-and-tones/>.
