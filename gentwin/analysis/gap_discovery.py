"""
gap_discovery.py
================
Layer 4 (Person 2): identify security gaps where physical impact is high
but detector confidence is low.
"""

from __future__ import annotations

import os
import sys
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import MODELS_SAVE_DIR


def identify_security_gaps(
    impact_csv: str | None = None,
    attack_csv: str | None = None,
    impact_threshold: float = 70.0,
    detection_threshold: float = 0.30,
    out_csv: str | None = None,
) -> pd.DataFrame:
    impact_csv = impact_csv or os.path.join(MODELS_SAVE_DIR, "impact_analysis.csv")
    attack_csv = attack_csv or os.path.join(MODELS_SAVE_DIR, "attack_library.csv")
    out_csv = out_csv or os.path.join(MODELS_SAVE_DIR, "security_gaps.csv")

    impact = pd.read_csv(impact_csv)
    attack = pd.read_csv(attack_csv)[[
        "attack_id",
        "target_stage",
        "attack_type",
        "blindspot_score",
        "stealth_score",
        "severity_score",
        "sensor_values",
    ]]

    merged = impact.merge(attack, on="attack_id", how="left", suffixes=("", "_attack"))

    # Proxy detector success from stealth score + blindspot score.
    # Higher stealth/blindspot -> lower detection probability.
    norm_blindspot = merged["blindspot_score"].fillna(0) / 10.0
    stealth = merged["stealth_score"].fillna(0)
    merged["detection_rate_proxy"] = (1.0 - (0.6 * stealth + 0.4 * norm_blindspot)).clip(0, 1)

    gaps = merged[
        (merged["impact_score"] >= impact_threshold)
        & (merged["detection_rate_proxy"] <= detection_threshold)
    ].copy()

    if gaps.empty:
        # Fallback: pick most concerning candidates by impact↑ and detectability↓.
        merged = merged.copy()
        merged["risk_rank"] = (
            merged["impact_score"].fillna(0) * 0.7
            + (1.0 - merged["detection_rate_proxy"].fillna(1.0)) * 100.0 * 0.3
        )
        gaps = merged.sort_values("risk_rank", ascending=False).head(50).copy()

    gaps["gap_reason"] = (
        "High physical impact with low expected detector sensitivity"
    )

    gaps = gaps.sort_values(["impact_score", "blindspot_score"], ascending=[False, False])
    os.makedirs(os.path.dirname(out_csv), exist_ok=True)
    gaps.to_csv(out_csv, index=False)
    return gaps


if __name__ == "__main__":
    g = identify_security_gaps()
    print(f"Identified {len(g)} security gaps -> {os.path.join(MODELS_SAVE_DIR, 'security_gaps.csv')}")
