"""
simpy_simulator.py
==================
Layer 3 (Person 2): SimPy-based SWaT digital twin simulation.

Takes attack vectors (51-dim), runs simplified process dynamics for P1..P6,
computes safety-violation-driven impact scores (0-100), and exports results.
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass, asdict
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import simpy

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import MODELS_SAVE_DIR, SENSOR_NAMES


SAFE_RANGES = {
    "tank_level_mm": (200.0, 1200.0, 10.0),
    "chlorine_ppm": (0.5, 2.5, 7.0),
    "pressure_bar": (0.0, 6.0, 8.0),
    "ph": (6.5, 8.5, 6.0),
    "conductivity_us_cm": (0.0, 500.0, 5.0),
}

STAGE_SENSOR_MAP = {
    "P1": ["FIT101", "LIT101", "MV101", "P101", "P102"],
    "P2": ["AIT201", "AIT202", "AIT203", "FIT201", "MV201", "P201", "P202", "P203", "P204", "P205", "P206"],
    "P3": ["DPIT301", "FIT301", "LIT301", "MV301", "MV302", "MV303", "MV304", "P301", "P302"],
    "P4": ["AIT401", "AIT402", "FIT401", "LIT401", "P401", "P402", "P403", "P404", "UV401"],
    "P5": ["AIT501", "AIT502", "AIT503", "AIT504", "FIT501", "FIT502", "FIT503", "FIT504", "P501", "P502", "PIT501", "PIT502", "PIT503"],
    "P6": ["FIT601", "P601", "P602", "P603"],
}


@dataclass
class Violation:
    parameter: str
    value: float
    min_allowed: float
    max_allowed: float
    weight: float


@dataclass
class AttackSimulationResult:
    attack_id: str
    source: str
    target_stage: str
    attack_type: str
    impact_score: float
    total_violations: int
    max_violation_weight: float
    violations: List[Dict]


def _denorm(sensor_values: np.ndarray) -> Dict[str, float]:
    # Quick interpretable projections from normalized [0,1] values.
    idx = {name: i for i, name in enumerate(SENSOR_NAMES)}

    tank_level = 200 + sensor_values[idx.get("LIT101", 0)] * 1200
    chlorine = sensor_values[idx.get("AIT201", 0)] * 4
    pressure = sensor_values[idx.get("PIT501", idx.get("DPIT301", 0))] * 8
    ph = 4 + sensor_values[idx.get("AIT202", idx.get("AIT504", 0))] * 6
    cond = sensor_values[idx.get("AIT501", 0)] * 900

    return {
        "tank_level_mm": float(tank_level),
        "chlorine_ppm": float(chlorine),
        "pressure_bar": float(pressure),
        "ph": float(ph),
        "conductivity_us_cm": float(cond),
    }


def _scan_violations(metrics: Dict[str, float]) -> List[Violation]:
    out: List[Violation] = []
    for name, value in metrics.items():
        min_v, max_v, weight = SAFE_RANGES[name]
        if value < min_v or value > max_v:
            out.append(
                Violation(
                    parameter=name,
                    value=float(value),
                    min_allowed=float(min_v),
                    max_allowed=float(max_v),
                    weight=float(weight),
                )
            )
    return out


class SWaTSimPyTwin:
    """Simplified 1-second timestep SWaT process simulation driven by SimPy."""

    def __init__(self, duration_sec: int = 300):
        self.duration_sec = duration_sec

    def run_attack(self, row: pd.Series) -> AttackSimulationResult:
        env = simpy.Environment()
        attack_vector = np.array(json.loads(row["sensor_values"]), dtype=float)

        state = {
            "violation_log": [],
            "max_weight": 0.0,
        }

        def process_loop():
            for _ in range(self.duration_sec):
                metrics = _denorm(np.clip(attack_vector + np.random.normal(0, 0.01, size=51), 0, 1))
                violations = _scan_violations(metrics)
                for v in violations:
                    state["violation_log"].append(asdict(v))
                    state["max_weight"] = max(state["max_weight"], v.weight)
                yield env.timeout(1)

        env.process(process_loop())
        env.run(until=self.duration_sec)

        # Impact scoring: bounded weighted violation density (0..100)
        weighted = sum(v["weight"] for v in state["violation_log"])
        norm = max(1.0, self.duration_sec * 10.0)
        impact_score = min(100.0, (weighted / norm) * 100.0)

        return AttackSimulationResult(
            attack_id=str(row.get("attack_id", "unknown")),
            source=str(row.get("source", "unknown")),
            target_stage=str(row.get("target_stage", "Unknown")),
            attack_type=str(row.get("attack_type", "Unknown")),
            impact_score=float(impact_score),
            total_violations=len(state["violation_log"]),
            max_violation_weight=float(state["max_weight"]),
            violations=state["violation_log"][:100],  # truncate for portability
        )


def simulate_attack_library(
    attack_csv: str | None = None,
    out_csv: str | None = None,
    sample_n: int | None = 300,
    duration_sec: int = 300,
) -> pd.DataFrame:
    attack_csv = attack_csv or os.path.join(MODELS_SAVE_DIR, "attack_library.csv")
    out_csv = out_csv or os.path.join(MODELS_SAVE_DIR, "impact_analysis.csv")

    if not os.path.exists(attack_csv):
        raise FileNotFoundError(f"Attack library not found: {attack_csv}")

    df = pd.read_csv(attack_csv)
    if sample_n is not None and len(df) > sample_n:
        df = df.sample(sample_n, random_state=42).reset_index(drop=True)

    twin = SWaTSimPyTwin(duration_sec=duration_sec)
    rows = [asdict(twin.run_attack(r)) for _, r in df.iterrows()]

    out = pd.DataFrame(rows)
    os.makedirs(os.path.dirname(out_csv), exist_ok=True)
    out.to_csv(out_csv, index=False)
    return out


if __name__ == "__main__":
    results = simulate_attack_library()
    print(f"Simulated {len(results)} attacks -> {os.path.join(MODELS_SAVE_DIR, 'impact_analysis.csv')}")
