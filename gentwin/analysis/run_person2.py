"""
run_person2.py
==============
Person 2 unified runner:
1) SimPy simulation
2) Gap discovery
3) SHAP + LIME explainability
4) Innovations: RL, immunity, DNA, timeline
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import MODELS_SAVE_DIR
from twin.simpy_simulator import simulate_attack_library
from analysis.gap_discovery import identify_security_gaps
from analysis.explainability_suite import build_gap_explanations
from innovations.rl_adaptive_defense import train_q_agent
from innovations.immunity_score import compute_immunity_score
from innovations.dna_fingerprint import build_dna_fingerprints
from innovations.timeline_builder import build_timeline


def main() -> None:
    os.makedirs(MODELS_SAVE_DIR, exist_ok=True)

    print("[1/7] SimPy impact simulation...")
    impact = simulate_attack_library(sample_n=300, duration_sec=120)
    print(f"  -> impact rows: {len(impact)}")

    print("[2/7] Security gap discovery...")
    gaps = identify_security_gaps()
    if len(gaps) == 0:
        # Fallback to relaxed thresholds for richer analysis artifacts.
        gaps = identify_security_gaps(impact_threshold=40.0, detection_threshold=0.60)
    print(f"  -> gaps found: {len(gaps)}")

    print("[3/7] SHAP/LIME explanations...")
    explained = build_gap_explanations(max_rows=50)
    print(f"  -> explained rows: {len(explained)}")

    print("[4/7] RL adaptive defense table...")
    q = train_q_agent()
    print(f"  -> q-table shape: {q.shape}")

    print("[5/7] Immunity scoring...")
    imm = compute_immunity_score()
    print(f"  -> stage immunity rows: {len(imm)}")

    print("[6/7] Cyber DNA fingerprints...")
    dna = build_dna_fingerprints()
    print(f"  -> dna rows: {len(dna)}")

    print("[7/7] Incident timeline...")
    timeline = build_timeline()
    print(f"  -> timeline rows: {len(timeline)}")

    print("\nPerson 2 pipeline complete.")


if __name__ == "__main__":
    main()
