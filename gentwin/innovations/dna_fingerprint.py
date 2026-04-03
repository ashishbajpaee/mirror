"""
dna_fingerprint.py
==================
Layer 4+ innovations: create per-attack cyber DNA signatures based on
stable topological metrics for retrieval and deduplication.
"""

from __future__ import annotations

import hashlib
import os
import sys
import json
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import MODELS_SAVE_DIR


def _hash_payload(values: np.ndarray) -> str:
    rounded = np.round(values.astype(float), 4)
    raw = ",".join(map(str, rounded.tolist())).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:20]


def build_dna_fingerprints(
    attack_csv: str | None = None,
    out_csv: str | None = None,
) -> pd.DataFrame:
    attack_csv = attack_csv or os.path.join(MODELS_SAVE_DIR, "attack_library.csv")
    out_csv = out_csv or os.path.join(MODELS_SAVE_DIR, "attack_dna.csv")

    df = pd.read_csv(attack_csv)

    dna = []
    for _, row in df.iterrows():
        vals = np.array(json.loads(str(row["sensor_values"])), dtype=float)
        dna.append(
            {
                "attack_id": row["attack_id"],
                "target_stage": row.get("target_stage", "Unknown"),
                "attack_type": row.get("attack_type", "Unknown"),
                "dna_hash": _hash_payload(vals),
                "mean": float(vals.mean()),
                "std": float(vals.std()),
                "max": float(vals.max()),
                "min": float(vals.min()),
            }
        )

    out = pd.DataFrame(dna)
    os.makedirs(os.path.dirname(out_csv), exist_ok=True)
    out.to_csv(out_csv, index=False)
    return out


if __name__ == "__main__":
    out = build_dna_fingerprints()
    print(f"Saved attack DNA -> {os.path.join(MODELS_SAVE_DIR, 'attack_dna.csv')}")
