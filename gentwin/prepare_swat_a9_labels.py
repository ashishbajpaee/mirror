"""
Create SWaT_Normal.csv and SWaT_Attack.csv from SWaT A9 Nov 2022 data.

The script:
1) Loads both A9 CSV files.
2) Loads attack rules from Attack Patterns.txt.
3) Removes rules listed in invalid_attack_patterns_20xx.txt files.
4) Labels each row as Attack/Normal based on rule matching.
5) Exports files expected by this repository:
   - data_files/SWaT_Normal.csv
   - data_files/SWaT_Attack.csv

Usage:
python prepare_swat_a9_labels.py --dataset-dir "C:/Users/Asus/projects/IITK_PS6/swat/SWaT.A9_Nov 2022"
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple

import numpy as np
import pandas as pd

from config import SENSOR_NAMES

Rule = Tuple[Tuple[str, int], ...]

STATUS_TEXT_MAP = {
    "Active": 1,
    "Inactive": 0,
    "Bad Input": np.nan,
}

DEFAULT_CSVS = [
    "10-Nov-2022_1100_1200.csv",
    "11-Nov-2022_0900_1143.csv",
]

INVALID_RULE_FILES = [
    "invalid_attack_patterns_2015.txt",
    "invalid_attack_patterns_2019.txt",
    "invalid_attack_patterns_2020.txt",
]


def parse_rule_line(line: str) -> Optional[Rule]:
    line = line.strip()
    if not line:
        return None

    conditions: Dict[str, int] = {}
    for side in line.split("=="):
        for token in side.split(","):
            token = token.strip()
            if not token or "=" not in token:
                continue

            var, value_text = token.split("=", 1)
            var = var.strip()
            value_text = value_text.strip()

            try:
                value = int(float(value_text))
            except ValueError:
                continue

            if value not in (0, 1):
                continue

            if var in conditions and conditions[var] != value:
                return None

            conditions[var] = value

    if not conditions:
        return None

    return tuple(sorted(conditions.items()))


def load_rules(path: Path) -> Set[Rule]:
    rules: Set[Rule] = set()
    with path.open("r", encoding="utf-8", errors="replace") as f:
        for line in f:
            parsed = parse_rule_line(line)
            if parsed is not None:
                rules.add(parsed)
    return rules


def read_a9_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, encoding="utf-8", encoding_errors="replace")
    df.columns = df.columns.str.strip()
    return df


def to_numeric(series: pd.Series) -> pd.Series:
    if series.dtype == object:
        series = series.replace(STATUS_TEXT_MAP)
    return pd.to_numeric(series, errors="coerce")


def status_to_binary(series: pd.Series) -> pd.Series:
    s = to_numeric(series)
    s_non_na = s.dropna()
    if s_non_na.empty:
        return pd.Series(np.zeros(len(s), dtype=np.uint8), index=s.index)

    # A9 historian commonly uses 1/2 states where 2 means ON/OPEN.
    if float(s_non_na.max()) > 1.0:
        out = (s >= 2.0).astype(np.uint8)
    else:
        out = (s >= 1.0).astype(np.uint8)

    return out


def find_source_column(df: pd.DataFrame, var: str) -> Optional[str]:
    candidates = [f"{var}.Status", f"{var}.Pv", var]
    for c in candidates:
        if c in df.columns:
            return c
    return None


def build_rule_binary_df(df: pd.DataFrame, rule_vars: Iterable[str]) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)

    for var in rule_vars:
        src = find_source_column(df, var)
        if src is None:
            out[var] = 0
            continue

        if src.endswith(".Status"):
            out[var] = status_to_binary(df[src])
        else:
            s = to_numeric(df[src]).fillna(0)
            if var.startswith("FIT"):
                out[var] = (s > 0.5).astype(np.uint8)
            else:
                out[var] = (s > 0).astype(np.uint8)

    return out


def build_mask_value_map(valid_rules: Set[Rule], var_index: Dict[str, int]) -> Dict[int, Set[int]]:
    by_mask: Dict[int, Set[int]] = {}

    for rule in valid_rules:
        mask = 0
        value = 0
        usable = True

        for var, val in rule:
            if var not in var_index:
                usable = False
                break

            bit = 1 << var_index[var]
            mask |= bit
            if val == 1:
                value |= bit

        if not usable or mask == 0:
            continue

        if mask not in by_mask:
            by_mask[mask] = set()
        by_mask[mask].add(value)

    return by_mask


def encode_states(binary_df: pd.DataFrame, var_index: Dict[str, int]) -> np.ndarray:
    states = np.zeros(len(binary_df), dtype=np.uint32)

    for var, idx in var_index.items():
        bits = binary_df[var].to_numpy(dtype=np.uint32)
        states |= (bits << np.uint32(idx))

    return states


def label_attack_rows(states: np.ndarray, by_mask: Dict[int, Set[int]]) -> np.ndarray:
    unique_states = np.unique(states)
    flagged = np.zeros(unique_states.shape[0], dtype=bool)

    for mask, values in by_mask.items():
        masked = unique_states & np.uint32(mask)
        valid_values = np.fromiter(values, dtype=np.uint32)
        if valid_values.size == 0:
            continue

        flagged |= np.isin(masked, valid_values)
        if flagged.all():
            break

    attack_states = set(unique_states[flagged].tolist())
    labels = np.isin(states, list(attack_states))
    return labels


def convert_features_for_output(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)

    if "t_stamp" in df.columns:
        out["Timestamp"] = pd.to_datetime(df["t_stamp"], errors="coerce")
    elif "Timestamp" in df.columns:
        out["Timestamp"] = pd.to_datetime(df["Timestamp"], errors="coerce")
    else:
        raise KeyError("No timestamp column found (expected t_stamp or Timestamp).")

    for sensor in SENSOR_NAMES:
        src = find_source_column(df, sensor)
        if src is None:
            out[sensor] = 0
            continue

        if src.endswith(".Status"):
            out[sensor] = status_to_binary(df[src])
        else:
            out[sensor] = to_numeric(df[src])

    out = out.ffill().bfill().fillna(0)

    out_cols = ["Timestamp"] + list(SENSOR_NAMES)
    return out[out_cols]


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare labeled SWaT A9 CSVs for GenTwin")
    parser.add_argument("--dataset-dir", required=True, help="Folder containing SWaT A9 CSV/TXT files")
    parser.add_argument(
        "--output-dir",
        default="data_files",
        help="Output folder where SWaT_Normal.csv and SWaT_Attack.csv will be written",
    )
    parser.add_argument(
        "--combined-output",
        default="SWaT_A9_Labeled.csv",
        help="Combined labeled CSV filename (written inside output-dir)",
    )
    parser.add_argument(
        "--fallback-normal-file",
        default=None,
        help=(
            "Optional fallback source CSV name to mark as Normal if rule matching "
            "finds zero normal rows (for example: 10-Nov-2022_1100_1200.csv)."
        ),
    )
    args = parser.parse_args()

    dataset_dir = Path(args.dataset_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    attack_patterns_path = dataset_dir / "Attack Patterns.txt"
    if not attack_patterns_path.exists():
        raise FileNotFoundError(f"Missing attack pattern file: {attack_patterns_path}")

    print("Loading CSV files...")
    frames: List[pd.DataFrame] = []
    for name in DEFAULT_CSVS:
        path = dataset_dir / name
        if not path.exists():
            raise FileNotFoundError(f"Missing CSV file: {path}")
        df = read_a9_csv(path)
        df["__source"] = name
        frames.append(df)

    raw = pd.concat(frames, ignore_index=True)
    print(f"Rows loaded: {len(raw)}")

    print("Loading rules...")
    attack_rules = load_rules(attack_patterns_path)
    invalid_rules: Set[Rule] = set()
    for name in INVALID_RULE_FILES:
        path = dataset_dir / name
        if path.exists():
            invalid_rules |= load_rules(path)

    valid_rules = attack_rules - invalid_rules
    if not valid_rules:
        raise RuntimeError("No valid rules remain after filtering invalid rules.")

    print(f"Attack rules total: {len(attack_rules)}")
    print(f"Invalid rules total: {len(invalid_rules)}")
    print(f"Valid rules used: {len(valid_rules)}")

    rule_vars = sorted({var for rule in valid_rules for var, _ in rule})
    print(f"Rule variables ({len(rule_vars)}): {', '.join(rule_vars)}")

    binary_df = build_rule_binary_df(raw, rule_vars)
    var_index = {var: i for i, var in enumerate(rule_vars)}
    by_mask = build_mask_value_map(valid_rules, var_index)

    print(f"Unique masks for matching: {len(by_mask)}")

    states = encode_states(binary_df, var_index)
    attack_flags = label_attack_rows(states, by_mask)

    if attack_flags.all() and args.fallback_normal_file:
        fallback_source = args.fallback_normal_file
        source_mask = (raw["__source"] == fallback_source).to_numpy()
        if source_mask.any():
            print(
                "Rule matching found zero normal rows. "
                f"Applying fallback-normal source: {fallback_source}"
            )
            attack_flags = ~source_mask
        else:
            print(
                f"WARNING: fallback source '{fallback_source}' not found in loaded CSVs. "
                "Keeping rule-based labels."
            )

    output_df = convert_features_for_output(raw)
    output_df["Normal/Attack"] = np.where(attack_flags, "Attack", "Normal")

    normal_df = output_df[output_df["Normal/Attack"] == "Normal"].copy()
    attack_df = output_df[output_df["Normal/Attack"] == "Attack"].copy()

    combined_path = output_dir / args.combined_output
    normal_path = output_dir / "SWaT_Normal.csv"
    attack_path = output_dir / "SWaT_Attack.csv"

    output_df.to_csv(combined_path, index=False)
    normal_df.to_csv(normal_path, index=False)
    attack_df.to_csv(attack_path, index=False)

    print("\nDone.")
    print(f"Combined labeled CSV: {combined_path} ({len(output_df)} rows)")
    print(f"Normal CSV: {normal_path} ({len(normal_df)} rows)")
    print(f"Attack CSV: {attack_path} ({len(attack_df)} rows)")

    if len(normal_df) == 0:
        print("WARNING: No Normal rows were found by rule matching.")
    if len(attack_df) == 0:
        print("WARNING: No Attack rows were found by rule matching.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
