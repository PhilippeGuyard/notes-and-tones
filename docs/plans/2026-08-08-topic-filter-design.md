# Home-page topic filter — design

Date: 2026-08-08
Status: approved

## Problem

The home page is a single chronological card list. With 18 essays and more coming,
readers have no way to browse by subject.

## Decision

Topic filter pills on the home page. No new pages, no search library.

## Taxonomy

Five topics, defined once in `_data/topics.js` (slug, display label, pill order):

| Slug | Label | Essays |
|---|---|---|
| `probability` | Probability & statistics | anova, birthday, confidence, monty-hall, screening, urn, unicorns |
| `climate` | Climate & energy | climate, footprint, summer, carbon |
| `society` | Society | immigration, income, tax |
| `genetics` | Genetics | ancestry, unicorns |
| `maths-physics` | Maths & physics | fourier, rudolph, bulge |

Essays can carry multiple topics (`topics: ["genetics", "probability"]` in front matter).

## Build-time validation

An Eleventy filter (`topicList`) renders each card's `data-topics` attribute and
throws on an essay with no `topics` or an unknown slug, so a typo or a topicless
new essay fails the build instead of silently vanishing from filters.

## Home page UI

- Pill row under the site title: **All** plus the five topics, real `<button>`s
  with `aria-pressed`.
- Each card gets `data-topics="..."`; a small inline script (no libraries)
  toggles card visibility.
- Filter state mirrors into the URL hash (`#topic=climate`) — shareable,
  survives reload; unknown hash falls back to All.
- A visually hidden `aria-live="polite"` status announces the shown count.
- Without JS: the nav is `hidden` (the script un-hides it), so the page is
  unchanged — all cards visible.

## Out of scope

Search, per-topic index pages, topic labels on essay pages themselves.

## Testing

Build-time slug validation is the safety net. Manual: serve `_site`, check pill
counts, hash deep-link, back/forward, and the no-JS view.
