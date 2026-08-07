#!/usr/bin/env bash
# Snapshot the pre-migration deployable site for diff-verification during the
# Eleventy migration. Mirrors the assemble step in .github/workflows/pages.yml.
# Builds from the last pre-migration commit (not the working tree) so later
# migration edits (front matter, 11tydata files) can never poison the baseline.
# git archive only includes tracked files, so local cruft (.venv, .DS_Store)
# is excluded, matching a fresh CI checkout.
set -euo pipefail
cd "$(dirname "$0")/.."
repo="$(pwd)"

BASELINE_REF="3a37148"  # last commit before the eleventy migration

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git archive "$BASELINE_REF" | tar -x -C "$tmp"

cd "$tmp"
mkdir _site_baseline
cp index.html 404.html styles.css robots.txt sitemap.xml feed.xml _site_baseline/
cp -R assets essays _site_baseline/
rm _site_baseline/essays/template.html

rm -rf "$repo/_site_baseline"
mv _site_baseline "$repo/_site_baseline"
