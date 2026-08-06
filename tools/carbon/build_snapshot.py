"""Fetch a 48-hour regional carbon-intensity forecast and vendor it.

The essay (essays/carbon.html) fetches live data from the National Grid
Carbon Intensity API on load. This script grabs one snapshot so the page
still works if that API is ever unreachable: essays/carbon.js falls back to
the vendored file and tells the reader it is showing a saved forecast.

Run: python3 tools/carbon/build_snapshot.py
Pure stdlib, no dependencies. Re-run any time to refresh the fallback.
"""

import json
import ssl
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "essays" / "carbon-snapshot.json"

API = "https://api.carbonintensity.org.uk/regional/intensity/{frm}/{to}"
SRC_NOTE = (
    "National Grid ESO Carbon Intensity API (regional forecast); "
    "gCO2/kWh, half-hourly, by GB region."
)
SRC_URL = "https://carbonintensity.org.uk/"


def fetch(frm, to):
    url = API.format(frm=frm, to=to)
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
        return json.load(r)


def main():
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    frm = now.strftime("%Y-%m-%dT%H:%MZ")
    to = (now + timedelta(hours=48)).strftime("%Y-%m-%dT%H:%MZ")

    data = fetch(frm, to)
    intervals = data["data"]

    # regionid -> {id, name, series:[{t, f, i}]}
    regions = {}
    for iv in intervals:
        t = iv["from"]
        for reg in iv["regions"]:
            rid = reg["regionid"]
            r = regions.setdefault(
                rid, {"id": rid, "name": reg["shortname"], "series": []}
            )
            r["series"].append(
                {
                    "t": t,
                    "f": reg["intensity"]["forecast"],
                    "i": reg["intensity"]["index"],
                }
            )

    out = {
        "source": SRC_NOTE,
        "url": SRC_URL,
        "generated": frm,
        "from": frm,
        "to": to,
        "regions": sorted(regions.values(), key=lambda r: r["id"]),
    }
    OUT.write_text(json.dumps(out, separators=(",", ":")))

    npts = len(next(iter(regions.values()))["series"])
    print(f"wrote {OUT}")
    print(f"  {len(regions)} regions x {npts} half-hours  ({frm} -> {to})")
    print(f"  {OUT.stat().st_size/1024:.0f} KB")


if __name__ == "__main__":
    main()
