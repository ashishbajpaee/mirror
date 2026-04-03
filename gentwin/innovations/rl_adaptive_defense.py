"""
rl_adaptive_defense.py
======================
Layer 4+ (Person 2 innovations): simple tabular Q-learning defender
that learns mitigation actions against detected attack states.
"""

from __future__ import annotations

import os
import sys
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import MODELS_SAVE_DIR


STATES = ["normal", "low", "medium", "high", "critical"]
ACTIONS = ["monitor", "raise_alert", "isolate_stage", "safe_shutdown"]


def discretize_risk(score: float) -> str:
    if score < 20:
        return "low"
    if score < 50:
        return "medium"
    if score < 75:
        return "high"
    return "critical"


def train_q_agent(
    impact_csv: str | None = None,
    episodes: int = 200,
    alpha: float = 0.2,
    gamma: float = 0.9,
    epsilon: float = 0.2,
    out_csv: str | None = None,
) -> pd.DataFrame:
    impact_csv = impact_csv or os.path.join(MODELS_SAVE_DIR, "impact_analysis.csv")
    out_csv = out_csv or os.path.join(MODELS_SAVE_DIR, "rl_q_table.csv")

    df = pd.read_csv(impact_csv)
    risks = [discretize_risk(s) for s in df["impact_score"].tolist()]

    q = pd.DataFrame(0.0, index=STATES, columns=ACTIONS)

    def reward(state: str, action: str) -> float:
        base = {
            ("low", "monitor"): 1.0,
            ("medium", "raise_alert"): 1.5,
            ("high", "isolate_stage"): 2.0,
            ("critical", "safe_shutdown"): 3.0,
        }
        return base.get((state, action), -0.5)

    rng = np.random.default_rng(42)

    for _ in range(episodes):
        for state in risks:
            if rng.random() < epsilon:
                action = rng.choice(ACTIONS)
            else:
                action = q.loc[state].idxmax()

            r = reward(state, action)
            next_state = state
            q.loc[state, action] = q.loc[state, action] + alpha * (
                r + gamma * q.loc[next_state].max() - q.loc[state, action]
            )

    os.makedirs(os.path.dirname(out_csv), exist_ok=True)
    q.to_csv(out_csv)
    return q


if __name__ == "__main__":
    table = train_q_agent()
    print(f"Saved RL Q-table -> {os.path.join(MODELS_SAVE_DIR, 'rl_q_table.csv')}")
