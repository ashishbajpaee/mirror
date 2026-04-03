"""
timeline_builder.py
===================
Layer 4+ innovations: build chronological incident timeline artifacts
from impact + gap outputs.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import MODELS_SAVE_DIR


def build_timeline(
    impact_csv: str | None = None,
    gaps_csv: str | None = None,
    out_csv: str | None = None,
) -> pd.DataFrame:
    impact_csv = impact_csv or os.path.join(MODELS_SAVE_DIR, "impact_analysis.csv")
    gaps_csv = gaps_csv or os.path.join(MODELS_SAVE_DIR, "security_gaps.csv")
    out_csv = out_csv or os.path.join(MODELS_SAVE_DIR, "incident_timeline.csv")

    impact = pd.read_csv(impact_csv)
    gaps = pd.read_csv(gaps_csv)[["attack_id"]].drop_duplicates()
    merged = impact.merge(gaps.assign(is_gap=True), on="attack_id", how="left")
    merged["is_gap"] = merged["is_gap"].fillna(False)

    t0 = datetime.now().replace(microsecond=0)
    merged = merged.reset_index(drop=True)
    merged["event_time"] = [t0 + timedelta(seconds=i * 10) for i in range(len(merged))]
    merged["event_type"] = merged["is_gap"].map(lambda x: "critical_gap" if x else "impact_event")

    timeline = merged[[
        "event_time",
        "event_type",
        "attack_id",
        "target_stage",
        "attack_type",
        "impact_score",
        "total_violations",
    ]].sort_values("event_time")

    os.makedirs(os.path.dirname(out_csv), exist_ok=True)
    timeline.to_csv(out_csv, index=False)
    return timeline


if __name__ == "__main__":
    tl = build_timeline()
    print(f"Saved incident timeline -> {os.path.join(MODELS_SAVE_DIR, 'incident_timeline.csv')}")
