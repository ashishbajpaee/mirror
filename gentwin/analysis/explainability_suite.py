"""
explainability_suite.py
=======================
Layer 4 (Person 2): SHAP + LIME analysis for gap attacks.
Uses existing data.explainability SHAP stack, and optional LIME fallback.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Dict, Any

import numpy as np
import pandas as pd
import torch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import MODELS_SAVE_DIR, WINDOW_SIZE, DEVICE
from data.data_loader import get_data
from data.sequence_builder import get_flat_sequences
from data.explainability import setup_explainer, explain_anomaly
from models.vae import VAE


try:
    from lime.lime_tabular import LimeTabularExplainer
    HAS_LIME = True
except Exception:
    HAS_LIME = False


def _load_vae() -> VAE:
    model = VAE(input_dim=WINDOW_SIZE * 51, latent_dim=16).to(DEVICE)
    path = os.path.join(MODELS_SAVE_DIR, "vae_best.pth")
    model.load_state_dict(torch.load(path, map_location=DEVICE))
    model.eval()
    return model


def _predict_mse_fn(model: VAE):
    def _fn(x_np: np.ndarray) -> np.ndarray:
        with torch.no_grad():
            x = torch.tensor(x_np, dtype=torch.float32, device=DEVICE)
            r, _, _ = model(x)
            mse = torch.mean((x - r) ** 2, dim=1)
            return mse.detach().cpu().numpy()
    return _fn


def build_gap_explanations(
    gaps_csv: str | None = None,
    out_csv: str | None = None,
    max_rows: int = 50,
) -> pd.DataFrame:
    gaps_csv = gaps_csv or os.path.join(MODELS_SAVE_DIR, "security_gaps.csv")
    out_csv = out_csv or os.path.join(MODELS_SAVE_DIR, "security_gaps_explained.csv")

    if not os.path.exists(gaps_csv):
        raise FileNotFoundError(f"Missing gaps file: {gaps_csv}")

    gaps = pd.read_csv(gaps_csv).head(max_rows).copy()

    X_normal, *_ = get_data()
    flat_norm = get_flat_sequences(X_normal, WINDOW_SIZE)

    vae = _load_vae()
    shap_explainer = setup_explainer(vae, flat_norm[:1000])

    lime_explainer = None
    predict_fn = _predict_mse_fn(vae)

    if HAS_LIME:
        lime_explainer = LimeTabularExplainer(
            training_data=flat_norm[:1000],
            mode="regression",
            feature_names=[f"f{i}" for i in range(WINDOW_SIZE * 51)],
            random_state=42,
            discretize_continuous=True,
        )

    shap_texts, lime_texts = [], []

    for _, row in gaps.iterrows():
        vec = np.array(json.loads(row["sensor_values"]), dtype=float)
        flat = np.tile(vec, WINDOW_SIZE)

        shap_res: Dict[str, Any] = explain_anomaly(shap_explainer, flat)
        shap_texts.append(shap_res["explanation_text"])

        if lime_explainer is not None:
            exp = lime_explainer.explain_instance(flat, predict_fn, num_features=6)
            lime_texts.append(" | ".join([f"{a}: {b:.4f}" for a, b in exp.as_list()]))
        else:
            lime_texts.append("LIME unavailable: install 'lime' to enable local surrogate explanations.")

    gaps["shap_explanation"] = shap_texts
    gaps["lime_explanation"] = lime_texts

    os.makedirs(os.path.dirname(out_csv), exist_ok=True)
    gaps.to_csv(out_csv, index=False)
    return gaps


if __name__ == "__main__":
    df = build_gap_explanations()
    print(f"Generated explanations for {len(df)} gap attacks -> {os.path.join(MODELS_SAVE_DIR, 'security_gaps_explained.csv')}")
