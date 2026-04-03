"""
data_loader.py — Full SWaT Data Pipeline
==========================================
5-stage pipeline: Load → Clean → Separate → Normalize → Output

Usage:
    from data.data_loader import get_data
    X_normal, X_attack, y_normal, y_attack, sensor_names, actuator_names, scaler = get_data()
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import MinMaxScaler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import (
    NORMAL_CSV_PATH,
    ATTACK_CSV_PATH,
    TIMESTAMP_COL,
    ATTACK_LABEL_COL,
    MODELS_SAVE_DIR,
)

SCALER_PATH = os.path.join(MODELS_SAVE_DIR, "scaler.pkl")

_HR = "=" * 65


# ══════════════════════════════════════════════════════════════════════
# STAGE 1 — LOADING
# ══════════════════════════════════════════════════════════════════════
def _load_raw_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load real CSVs if they exist, otherwise fall back to dummy data."""

    print(f"\n{_HR}")
    print("  STAGE 1 / 5 — LOADING DATA")
    print(_HR)

    if os.path.exists(NORMAL_CSV_PATH) and os.path.exists(ATTACK_CSV_PATH):
        print(f"  ✅  Found real CSV files:")
        print(f"      Normal → {NORMAL_CSV_PATH}")
        print(f"      Attack → {ATTACK_CSV_PATH}")

        normal_df = pd.read_csv(NORMAL_CSV_PATH, encoding="utf-8", encoding_errors="replace")
        attack_df = pd.read_csv(ATTACK_CSV_PATH, encoding="utf-8", encoding_errors="replace")

        # Strip whitespace from column names (common SWaT quirk)
        normal_df.columns = normal_df.columns.str.strip()
        attack_df.columns = attack_df.columns.str.strip()

    else:
        print("  ⚠️  WARNING: Using DUMMY synthetic data.")
        print("      Replace with real SWaT CSVs in data_files/ when available.")
        from data.dummy_data_generator import generate_dummy_swat_data
        normal_df, attack_df = generate_dummy_swat_data()

    print(f"\n  Normal set  → {normal_df.shape[0]:>8,} rows × {normal_df.shape[1]} cols")
    print(f"  Attack set  → {attack_df.shape[0]:>8,} rows × {attack_df.shape[1]} cols")
    print(f"\n  Columns ({len(normal_df.columns)}):")
    for i in range(0, len(normal_df.columns), 8):
        chunk = normal_df.columns[i : i + 8].tolist()
        print(f"    {chunk}")
    print(f"\n  Dtypes:\n{normal_df.dtypes.value_counts().to_string()}")

    return normal_df, attack_df


# ══════════════════════════════════════════════════════════════════════
# STAGE 2 — CLEANING
# ══════════════════════════════════════════════════════════════════════
def _clean(df: pd.DataFrame, name: str) -> tuple[pd.DataFrame, pd.Series]:
    """
    Returns (features_df, labels_series) after:
      • Parsing & dropping the Timestamp column
      • Converting the label column to int (0/1)
      • Missing-value report + forward-fill
      • Duplicate removal
      • Constant-column detection
    """
    print(f"\n  ── Cleaning [{name}] ──")
    df = df.copy()

    # --- Timestamps ---
    if TIMESTAMP_COL in df.columns:
        df[TIMESTAMP_COL] = pd.to_datetime(df[TIMESTAMP_COL], dayfirst=True, errors="coerce")
        print(f"  Timestamp range: {df[TIMESTAMP_COL].min()} → {df[TIMESTAMP_COL].max()}")
        df.drop(columns=[TIMESTAMP_COL], inplace=True)
        print(f"  Dropped '{TIMESTAMP_COL}' column.")

    # --- Label mapping ---
    if ATTACK_LABEL_COL in df.columns:
        raw = df[ATTACK_LABEL_COL]
        if raw.dtype == object:
            label_map = {"Normal": 0, "Attack": 1, "A ttack": 1}
            df[ATTACK_LABEL_COL] = raw.str.strip().map(label_map).fillna(0).astype(int)
        labels = df.pop(ATTACK_LABEL_COL)
    else:
        labels = pd.Series(np.zeros(len(df), dtype=int), name=ATTACK_LABEL_COL)

    print(f"  Label distribution:  0 (Normal)={int((labels == 0).sum()):,}  "
          f"| 1 (Attack)={int((labels == 1).sum()):,}")

    # --- Missing values ---
    missing = df.isnull().sum()
    total_missing = int(missing.sum())
    if total_missing > 0:
        cols_with_na = missing[missing > 0]
        print(f"  ⚠  Missing values found ({total_missing} total):")
        for col, cnt in cols_with_na.items():
            print(f"      {col}: {cnt}")
        df.ffill(inplace=True)
        df.bfill(inplace=True)  # catch leading NaNs
        print(f"  → Forward-filled (then back-filled).")
    else:
        print(f"  ✓  No missing values.")

    # --- Duplicates ---
    n_dup = int(df.duplicated().sum())
    if n_dup > 0:
        df.drop_duplicates(inplace=True)
        labels = labels.loc[df.index]
        print(f"  Removed {n_dup:,} duplicate rows.")
    else:
        print(f"  ✓  No duplicate rows.")

    # --- Constant columns ---
    nunique = df.nunique()
    constant_cols = nunique[nunique <= 1].index.tolist()
    if constant_cols:
        print(f"  ⚠  Constant columns (never change): {constant_cols}")
    else:
        print(f"  ✓  No constant columns detected.")

    # Ensure everything is numeric
    df = df.apply(pd.to_numeric, errors="coerce")
    df.fillna(0, inplace=True)

    print(f"  Final shape: {df.shape}")
    return df, labels


# ══════════════════════════════════════════════════════════════════════
# STAGE 3 — SEPARATION (binary actuators vs continuous sensors)
# ══════════════════════════════════════════════════════════════════════
def _separate_columns(df: pd.DataFrame) -> tuple[list[str], list[str]]:
    """Auto-detect binary (0/1-only) vs continuous columns."""

    print(f"\n{_HR}")
    print("  STAGE 3 / 5 — COLUMN SEPARATION")
    print(_HR)

    actuator_names = []
    sensor_names = []

    for col in df.columns:
        unique_vals = df[col].dropna().unique()
        if set(unique_vals).issubset({0.0, 1.0, 0, 1}):
            actuator_names.append(col)
        else:
            sensor_names.append(col)

    print(f"\n  Binary actuators ({len(actuator_names)}):")
    for i in range(0, len(actuator_names), 8):
        print(f"    {actuator_names[i:i+8]}")

    print(f"\n  Continuous sensors ({len(sensor_names)}):")
    for i in range(0, len(sensor_names), 8):
        print(f"    {sensor_names[i:i+8]}")

    return sensor_names, actuator_names


# ══════════════════════════════════════════════════════════════════════
# STAGE 4 — NORMALIZATION
# ══════════════════════════════════════════════════════════════════════
def _normalize(
    normal_df: pd.DataFrame,
    attack_df: pd.DataFrame,
) -> tuple[np.ndarray, np.ndarray, MinMaxScaler]:
    """
    Fit MinMaxScaler on NORMAL data only → transform both sets.
    Saves the fitted scaler to models_saved/scaler.pkl.
    """

    print(f"\n{_HR}")
    print("  STAGE 4 / 5 — NORMALIZATION  (MinMaxScaler)")
    print(_HR)

    scaler = MinMaxScaler()

    # Fit on normal data ONLY to avoid data leakage
    X_normal = scaler.fit_transform(normal_df.values)
    print(f"  Scaler FIT on normal data: {normal_df.shape}")

    X_attack = scaler.transform(attack_df.values)
    print(f"  Scaler TRANSFORMED attack data: {attack_df.shape}")

    # Persist the scaler
    os.makedirs(os.path.dirname(SCALER_PATH), exist_ok=True)
    joblib.dump(scaler, SCALER_PATH)
    print(f"  Scaler saved → {SCALER_PATH}")

    print(f"\n  Normal X  range: [{X_normal.min():.4f}, {X_normal.max():.4f}]")
    print(f"  Attack X  range: [{X_attack.min():.4f}, {X_attack.max():.4f}]")

    return X_normal, X_attack, scaler


# ══════════════════════════════════════════════════════════════════════
# STAGE 5 — OUTPUT
# ══════════════════════════════════════════════════════════════════════
def get_data() -> tuple[
    np.ndarray,   # X_normal
    np.ndarray,   # X_attack
    np.ndarray,   # y_normal
    np.ndarray,   # y_attack
    list[str],    # sensor_names
    list[str],    # actuator_names
    MinMaxScaler, # fitted scaler
]:
    """
    Run the full 5-stage pipeline and return everything needed
    for downstream model training and evaluation.

    Returns
    -------
    X_normal       : np.ndarray  — scaled normal features
    X_attack       : np.ndarray  — scaled attack features
    y_normal       : np.ndarray  — labels (all 0s)
    y_attack       : np.ndarray  — labels (0s and 1s)
    sensor_names   : list[str]   — continuous sensor column names
    actuator_names : list[str]   — binary actuator column names
    scaler         : MinMaxScaler — fitted on normal data
    """

    # --- Stage 1: Load ---
    normal_raw, attack_raw = _load_raw_data()

    # --- Stage 2: Clean ---
    print(f"\n{_HR}")
    print("  STAGE 2 / 5 — CLEANING")
    print(_HR)
    normal_clean, y_normal = _clean(normal_raw, "Normal")
    attack_clean, y_attack = _clean(attack_raw, "Attack")

    # Ensure both DataFrames have the same columns in the same order
    common_cols = sorted(set(normal_clean.columns) & set(attack_clean.columns))
    normal_clean = normal_clean[common_cols]
    attack_clean = attack_clean[common_cols]

    # --- Stage 3: Separate ---
    sensor_names, actuator_names = _separate_columns(normal_clean)

    # --- Stage 4: Normalize ---
    X_normal, X_attack, scaler = _normalize(normal_clean, attack_clean)

    # Convert labels to numpy
    y_normal = y_normal.values
    y_attack = y_attack.values

    # --- Stage 5: Summary ---
    print(f"\n{_HR}")
    print("  STAGE 5 / 5 — FINAL SUMMARY")
    print(_HR)
    print(f"  X_normal : {X_normal.shape}   dtype={X_normal.dtype}")
    print(f"  X_attack : {X_attack.shape}   dtype={X_attack.dtype}")
    print(f"  y_normal : {y_normal.shape}   unique={np.unique(y_normal)}")
    print(f"  y_attack : {y_attack.shape}   unique={np.unique(y_attack)}")
    print(f"  sensors  : {len(sensor_names)} columns")
    print(f"  actuators: {len(actuator_names)} columns")
    print(f"  scaler   : MinMaxScaler (saved to {SCALER_PATH})")
    print(f"{_HR}\n")

    return X_normal, X_attack, y_normal, y_attack, sensor_names, actuator_names, scaler


# ═══════════════════════════════════════════════════════════════════════
# Quick self-test
# ═══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    X_normal, X_attack, y_normal, y_attack, sensors, actuators, scaler = get_data()
