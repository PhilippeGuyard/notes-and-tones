# Immigration data pipeline

Build tooling for the **Immigration: Perception vs Reality** essay
(`essays/immigration/`). Not part of the served site.

`scripts/fetch_data.py` fetches and bakes the datasets the page fetches into
`essays/immigration/data/*.json`. Hand-curated datasets in
`essays/immigration/data/static/` are never overwritten.

## Refresh the data

```sh
uv sync
uv run python tools/immigration/scripts/fetch_data.py            # use cached raw downloads
uv run python tools/immigration/scripts/fetch_data.py --refresh  # re-download everything
```

Raw downloads cache to `tools/immigration/data/raw/` (gitignored, regenerable).
Source landing pages and the research behind the essay's claims live in
`research/`. ONS/Home Office/Frontex file URLs churn each release — update them
in `scripts/fetch_data.py`.

## Tests

```sh
uv run pytest tools/immigration/tests
```
