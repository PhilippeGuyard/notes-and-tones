#!/usr/bin/env bash
# Snapshot the current deployable site for diff-verification during the
# Eleventy migration. Mirrors the assemble step in .github/workflows/pages.yml.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf _site_baseline && mkdir _site_baseline
cp index.html 404.html styles.css robots.txt sitemap.xml feed.xml _site_baseline/
cp -R assets essays _site_baseline/
rm _site_baseline/essays/template.html
# CI builds from a fresh checkout, so gitignored local files never deploy.
rm -rf _site_baseline/essays/rudolph/.venv
find _site_baseline -name '.DS_Store' -delete
