"""
immunity_score.py
=================
Layer 4+ innovations: immunity scoring for plant resilience.
"""

from __future__ import annotations

import os
import sys
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import MODELS_SAVE_DIR


def compute_immunity_score(
    explained_csv: str | None = None,
    out_csv: str | None = None,
) -> pd.DataFrame:
    explained_csv = explained_csv or os.path.join(MODELS_SAVE_DIR, "security_gaps_explained.csv")
    out_csv = out_csv or os.path.join(MODELS_SAVE_DIR, "immunity_scores.csv")

    df = pd.read_csv(explained_csv)

    grouped = (
        df.groupby("target_stage", dropna=False)
        .agg(
            n_gaps=("attack_id", "count"),
            mean_impact=("impact_score", "mean"),
            mean_detect=("detection_rate_proxy", "mean"),
        )
        .reset_index()
    )

    # Higher detect rate and lower impact -> better immunity.
    grouped["immunity_score"] = (
        (grouped["mean_detect"].clip(0, 1) * 60.0)
        + ((100 - grouped["mean_impact"].clip(0, 100)) * 0.4)
        - (grouped["n_gaps"].clip(lower=0) * 0.5)
    ).clip(0, 100)

    os.makedirs(os.path.dirname(out_csv), exist_ok=True)
    grouped.to_csv(out_csv, index=False)
    return grouped


if __name__ == "__main__":
    out = compute_immunity_score()
    print(f"Saved immunity scores -> {os.path.join(MODELS_SAVE_DIR, 'immunity_scores.csv')}")
