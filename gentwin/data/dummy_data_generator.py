"""
dummy_data_generator.py — Synthetic SWaT Data
===============================================
Generates placeholder DataFrames that mimic the real SWaT dataset
structure so every downstream script can run before the real CSVs
are available.

Usage:
    from data.dummy_data_generator import generate_dummy_swat_data
    normal_df, attack_df = generate_dummy_swat_data()
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Import project-wide constants
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import (
    SENSOR_NAMES,
    BINARY_ACTUATORS,
    TIMESTAMP_COL,
    ATTACK_LABEL_COL,
    RANDOM_SEED,
    DUMMY_NORMAL_ROWS,
    DUMMY_ATTACK_ROWS,
    DUMMY_ATTACK_RATIO,
)


def _generate_timestamps(n_rows: int, start: str = "2015-12-28 10:00:00") -> pd.Series:
    """Create evenly-spaced 1-second timestamps."""
    base = datetime.strptime(start, "%Y-%m-%d %H:%M:%S")
    return pd.Series([base + timedelta(seconds=i) for i in range(n_rows)])


def _generate_sensor_values(
    n_rows: int,
    rng: np.random.Generator,
) -> pd.DataFrame:
    """
    Build a DataFrame with one column per SWaT sensor/actuator.
    • Continuous sensors → random floats in [0.0, 1.0] (as if already scaled).
    • Binary actuators   → random 0 or 1.
    """
    data = {}
    for name in SENSOR_NAMES:
        if name in BINARY_ACTUATORS:
            data[name] = rng.integers(0, 2, size=n_rows).astype(float)
        else:
            data[name] = rng.uniform(0.0, 1.0, size=n_rows).astype(np.float32)
    return pd.DataFrame(data)


def generate_dummy_swat_data(
    n_normal: int = DUMMY_NORMAL_ROWS,
    n_attack: int = DUMMY_ATTACK_ROWS,
    attack_ratio: float = DUMMY_ATTACK_RATIO,
    seed: int = RANDOM_SEED,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Returns
    -------
    normal_df : pd.DataFrame   (n_normal rows, 53 cols)
        All rows labelled 0 (Normal).
    attack_df : pd.DataFrame   (n_attack rows, 53 cols)
        ~attack_ratio fraction of rows labelled 1 (Attack).

    Columns: [Timestamp] + 51 sensor/actuator columns + [Normal/Attack]
    """
    rng = np.random.default_rng(seed)

    # ---- Normal dataset ----
    normal_sensors = _generate_sensor_values(n_normal, rng)
    normal_sensors.insert(0, TIMESTAMP_COL, _generate_timestamps(n_normal))
    normal_sensors[ATTACK_LABEL_COL] = 0  # all normal

    # ---- Attack dataset ----
    attack_sensors = _generate_sensor_values(n_attack, rng)
    attack_start = "2015-12-28 10:00:00"  # different start for clarity
    attack_sensors.insert(
        0, TIMESTAMP_COL, _generate_timestamps(n_attack, start=attack_start)
    )

    # Randomly assign ~attack_ratio of rows as attacks
    labels = np.zeros(n_attack, dtype=int)
    n_attack_labels = int(n_attack * attack_ratio)
    attack_indices = rng.choice(n_attack, size=n_attack_labels, replace=False)
    labels[attack_indices] = 1
    attack_sensors[ATTACK_LABEL_COL] = labels

    print(f"[DummyData] Generated normal set : {n_normal:,} rows  (all label=0)")
    print(
        f"[DummyData] Generated attack set : {n_attack:,} rows  "
        f"({n_attack_labels:,} labelled as attack)"
    )

    return normal_sensors, attack_sensors


# ---------------------------------------------------------------------------
# Quick self-test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    normal_df, attack_df = generate_dummy_swat_data()
    print(f"\nnormal_df shape: {normal_df.shape}")
    print(f"attack_df shape: {attack_df.shape}")
    print(f"\nColumns ({len(normal_df.columns)}):")
    print(list(normal_df.columns))
    print(f"\nAttack label distribution:\n{attack_df[ATTACK_LABEL_COL].value_counts()}")
