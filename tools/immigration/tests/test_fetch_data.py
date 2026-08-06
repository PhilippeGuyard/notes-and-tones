"""Tests for the pure transform helpers in scripts/fetch_data.py."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from fetch_data import jsonstat_unpack, parse_ye_period


def test_parse_ye_period_basic():
    assert parse_ye_period("YE Jun 12") == "2012-06-30"
    assert parse_ye_period("YE Dec 25") == "2025-12-31"


def test_parse_ye_period_with_flag_suffix():
    # ONS marks provisional/revised periods with a trailing P or R
    assert parse_ye_period("YE Dec 25 P") == "2025-12-31"
    assert parse_ye_period("YE Mar 23 R") == "2023-03-31"


def test_jsonstat_unpack_two_dims():
    d = {
        "id": ["geo", "time"],
        "size": [2, 2],
        "dimension": {
            "geo": {"category": {"index": {"DE": 0, "FR": 1}}},
            "time": {"category": {"index": {"2023": 0, "2024": 1}}},
        },
        # flat index = geo_idx * 2 + time_idx
        "value": {"0": 10, "1": 11, "2": 20, "3": 21},
    }
    recs = {(r["geo"], r["time"]): r["value"] for r in jsonstat_unpack(d)}
    assert recs[("DE", "2023")] == 10
    assert recs[("DE", "2024")] == 11
    assert recs[("FR", "2023")] == 20
    assert recs[("FR", "2024")] == 21


def test_jsonstat_unpack_sparse_values():
    d = {
        "id": ["geo"],
        "size": [3],
        "dimension": {"geo": {"category": {"index": {"A": 0, "B": 1, "C": 2}}}},
        "value": {"2": 99},  # only C present
    }
    recs = jsonstat_unpack(d)
    assert recs == [{"geo": "C", "value": 99}]
