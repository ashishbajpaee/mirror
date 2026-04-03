"""
eda.py — Deep Exploratory Data Analysis for SWaT
==================================================
Produces 5 analysis outputs + summary report.

All plots/files saved to:  data/eda_outputs/

Usage:
    python data/eda.py          # from gentwin/ directory
"""

import os
import sys
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")          # non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns
import networkx as nx
import joblib
from itertools import combinations

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import (
    NORMAL_CSV_PATH,
    ATTACK_CSV_PATH,
    TIMESTAMP_COL,
    ATTACK_LABEL_COL,
    SENSOR_NAMES,
    MODELS_SAVE_DIR,
)

# ── Output directories ──────────────────────────────────────────────
EDA_DIR = os.path.join(os.path.dirname(__file__), "eda_outputs")
os.makedirs(EDA_DIR, exist_ok=True)
os.makedirs(MODELS_SAVE_DIR, exist_ok=True)

_HR = "=" * 65


# ═══════════════════════════════════════════════════════════════════
# Helper — load raw DataFrames WITH Timestamp & labels kept
# ═══════════════════════════════════════════════════════════════════
def _load_raw() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return raw (normal_df, attack_df) with timestamps and labels."""

    if os.path.exists(NORMAL_CSV_PATH) and os.path.exists(ATTACK_CSV_PATH):
        print("  Loading REAL CSV data …")
        normal_df = pd.read_csv(NORMAL_CSV_PATH, encoding="utf-8",
                                encoding_errors="replace")
        attack_df = pd.read_csv(ATTACK_CSV_PATH, encoding="utf-8",
                                encoding_errors="replace")
        normal_df.columns = normal_df.columns.str.strip()
        attack_df.columns = attack_df.columns.str.strip()
        # Parse timestamps
        for df in (normal_df, attack_df):
            if TIMESTAMP_COL in df.columns:
                df[TIMESTAMP_COL] = pd.to_datetime(
                    df[TIMESTAMP_COL], dayfirst=True, errors="coerce"
                )
        # Map labels
        for df in (normal_df, attack_df):
            if df[ATTACK_LABEL_COL].dtype == object:
                lmap = {"Normal": 0, "Attack": 1, "A ttack": 1}
                df[ATTACK_LABEL_COL] = (
                    df[ATTACK_LABEL_COL].str.strip().map(lmap).fillna(0).astype(int)
                )
    else:
        print("  ⚠️  Using DUMMY data (real CSVs not found).")
        from data.dummy_data_generator import generate_dummy_swat_data
        normal_df, attack_df = generate_dummy_swat_data()

    return normal_df, attack_df


def _sensor_cols(df: pd.DataFrame) -> list[str]:
    """Return only the 51 sensor/actuator column names present in df."""
    return [c for c in df.columns
            if c not in (TIMESTAMP_COL, ATTACK_LABEL_COL)]


# ═══════════════════════════════════════════════════════════════════
# 1. BASIC STATISTICS — sensor distribution plots
# ═══════════════════════════════════════════════════════════════════
def analysis_1_distributions(normal_df: pd.DataFrame,
                             attack_df: pd.DataFrame) -> None:
    print(f"\n{_HR}")
    print("  1 / 5 — SENSOR DISTRIBUTION PLOTS")
    print(_HR)

    sensors = _sensor_cols(normal_df)
    n = len(sensors)
    cols_per_row = 6
    rows = (n + cols_per_row - 1) // cols_per_row

    fig, axes = plt.subplots(rows, cols_per_row,
                             figsize=(cols_per_row * 3.2, rows * 2.8))
    axes = axes.flatten()

    for i, sensor in enumerate(sensors):
        ax = axes[i]
        if sensor in normal_df.columns:
            ax.hist(normal_df[sensor].dropna(), bins=50, alpha=0.6,
                    color="#2196F3", label="Normal", density=True)
        if sensor in attack_df.columns:
            ax.hist(attack_df[sensor].dropna(), bins=50, alpha=0.5,
                    color="#F44336", label="Attack", density=True)
        ax.set_title(sensor, fontsize=8, fontweight="bold")
        ax.tick_params(labelsize=6)

    # hide unused subplots
    for j in range(i + 1, len(axes)):
        axes[j].set_visible(False)

    # shared legend
    handles = [mpatches.Patch(color="#2196F3", alpha=0.6, label="Normal"),
               mpatches.Patch(color="#F44336", alpha=0.5, label="Attack")]
    fig.legend(handles=handles, loc="upper right", fontsize=9)
    fig.suptitle("Sensor Distributions — Normal vs Attack", fontsize=14,
                 fontweight="bold", y=1.01)
    plt.tight_layout()

    path = os.path.join(EDA_DIR, "sensor_distributions.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  ✅  Saved → {path}")


# ═══════════════════════════════════════════════════════════════════
# 2. ATTACK ANALYSIS — per-window sensor impact
# ═══════════════════════════════════════════════════════════════════
def analysis_2_attack_windows(normal_df: pd.DataFrame,
                              attack_df: pd.DataFrame) -> pd.DataFrame:
    print(f"\n{_HR}")
    print("  2 / 5 — ATTACK WINDOW ANALYSIS")
    print(_HR)

    sensors = _sensor_cols(normal_df)
    labels = attack_df[ATTACK_LABEL_COL].values

    # Identify contiguous attack windows
    attack_mask = labels == 1
    diff = np.diff(attack_mask.astype(int), prepend=0)
    starts = np.where(diff == 1)[0]
    ends = np.where(diff == -1)[0]
    if len(ends) < len(starts):
        ends = np.append(ends, len(labels))

    print(f"  Found {len(starts)} attack window(s)\n")

    # Normal-data standard deviations (baseline)
    normal_std = normal_df[sensors].std()
    normal_std = normal_std.replace(0, 1e-9)  # avoid div-by-zero

    records = []
    for idx, (s, e) in enumerate(zip(starts, ends), 1):
        window = attack_df.iloc[s:e]
        window_std = window[sensors].std()
        std_ratio = window_std / normal_std

        top5 = std_ratio.nlargest(5)
        ts_start = (window[TIMESTAMP_COL].iloc[0]
                    if TIMESTAMP_COL in window.columns else s)
        ts_end = (window[TIMESTAMP_COL].iloc[-1]
                  if TIMESTAMP_COL in window.columns else e)

        print(f"  Attack {idx:>2d}  |  rows {s}–{e}  |  "
              f"{ts_start} → {ts_end}")
        print(f"    Top 5 affected sensors (std ratio):")
        for sensor_name, ratio in top5.items():
            print(f"      {sensor_name:>10s}:  {ratio:.3f}×")
            records.append({
                "attack_id": idx,
                "start": str(ts_start),
                "end": str(ts_end),
                "sensor": sensor_name,
                "std_ratio": round(ratio, 4),
            })
        print()

    impact_df = pd.DataFrame(records)
    csv_path = os.path.join(EDA_DIR, "attack_sensor_impact.csv")
    impact_df.to_csv(csv_path, index=False)
    print(f"  ✅  Saved → {csv_path}")

    return impact_df


# ═══════════════════════════════════════════════════════════════════
# 3. CORRELATION HEATMAP (Normal data only)
# ═══════════════════════════════════════════════════════════════════
def analysis_3_correlation(normal_df: pd.DataFrame) -> pd.DataFrame:
    print(f"\n{_HR}")
    print("  3 / 5 — CORRELATION HEATMAP")
    print(_HR)

    sensors = _sensor_cols(normal_df)
    corr = normal_df[sensors].corr(method="pearson")

    fig, ax = plt.subplots(figsize=(18, 15))
    sns.heatmap(corr, cmap="RdBu_r", center=0, vmin=-1, vmax=1,
                xticklabels=True, yticklabels=True,
                linewidths=0.1, ax=ax,
                cbar_kws={"shrink": 0.8, "label": "Pearson r"})
    ax.set_title("Sensor Correlation Matrix (Normal data)",
                 fontsize=14, fontweight="bold", pad=15)
    ax.tick_params(labelsize=6)
    plt.tight_layout()

    path = os.path.join(EDA_DIR, "correlation_heatmap.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  ✅  Saved → {path}")

    return corr


# ═══════════════════════════════════════════════════════════════════
# 4. SENSOR DEPENDENCY GRAPH
# ═══════════════════════════════════════════════════════════════════
def analysis_4_dependency_graph(corr: pd.DataFrame) -> nx.Graph:
    print(f"\n{_HR}")
    print("  4 / 5 — SENSOR DEPENDENCY GRAPH  (threshold ≥ 0.75)")
    print(_HR)

    THRESHOLD = 0.75
    G = nx.Graph()
    sensors = corr.columns.tolist()
    G.add_nodes_from(sensors)

    for s1, s2 in combinations(sensors, 2):
        r = abs(corr.loc[s1, s2])
        if r >= THRESHOLD:
            G.add_edge(s1, s2, weight=round(r, 4))

    print(f"  Nodes: {G.number_of_nodes()}")
    print(f"  Edges: {G.number_of_edges()}")

    # Connected components → sensor clusters
    components = list(nx.connected_components(G))
    print(f"\n  Connected components (sensor clusters): {len(components)}")
    for i, comp in enumerate(components, 1):
        print(f"    Cluster {i}: {sorted(comp)}")

    # Draw
    fig, ax = plt.subplots(figsize=(16, 12))
    pos = nx.spring_layout(G, seed=42, k=1.8)

    # Color by component
    color_palette = plt.cm.Set3(np.linspace(0, 1, max(len(components), 1)))
    node_colors = []
    for node in G.nodes():
        for ci, comp in enumerate(components):
            if node in comp:
                node_colors.append(color_palette[ci % len(color_palette)])
                break

    # Edge weights → widths
    edges = G.edges(data=True)
    widths = [d.get("weight", 0.75) * 2 for _, _, d in edges]

    nx.draw_networkx_nodes(G, pos, node_size=500, node_color=node_colors,
                           edgecolors="#333", linewidths=1.2, ax=ax)
    nx.draw_networkx_edges(G, pos, width=widths, alpha=0.4,
                           edge_color="#888", ax=ax)
    nx.draw_networkx_labels(G, pos, font_size=7, font_weight="bold", ax=ax)

    ax.set_title("Sensor Dependency Graph  (|r| ≥ 0.75)",
                 fontsize=14, fontweight="bold")
    ax.axis("off")
    plt.tight_layout()

    path = os.path.join(EDA_DIR, "sensor_dependency_graph.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"\n  ✅  Plot saved → {path}")

    pkl_path = os.path.join(MODELS_SAVE_DIR, "sensor_graph.pkl")
    joblib.dump(G, pkl_path)
    print(f"  ✅  Graph saved → {pkl_path}")

    return G


# ═══════════════════════════════════════════════════════════════════
# 5. TEMPORAL PATTERNS
# ═══════════════════════════════════════════════════════════════════
def analysis_5_temporal(attack_df: pd.DataFrame,
                        normal_df: pd.DataFrame) -> None:
    print(f"\n{_HR}")
    print("  5 / 5 — TEMPORAL PATTERNS")
    print(_HR)

    sensors = _sensor_cols(attack_df)

    # Pick top-10 most variable sensors (by std in attack data)
    variability = attack_df[sensors].std().nlargest(10)
    top10 = variability.index.tolist()
    print(f"  Top 10 most variable sensors: {top10}")

    labels = attack_df[ATTACK_LABEL_COL].values
    time_axis = np.arange(len(attack_df))

    fig, axes = plt.subplots(10, 1, figsize=(18, 24), sharex=True)

    for i, sensor in enumerate(top10):
        ax = axes[i]
        vals = attack_df[sensor].values

        # Plot sensor values
        ax.plot(time_axis, vals, color="#1976D2", linewidth=0.5,
                alpha=0.8, label=sensor)

        # Highlight attack windows in red
        attack_mask = labels == 1
        ax.fill_between(time_axis, ax.get_ylim()[0] if i > 0 else vals.min(),
                        vals.max() * 1.05,
                        where=attack_mask, color="#F44336", alpha=0.15,
                        label="Attack window")

        ax.set_ylabel(sensor, fontsize=8, fontweight="bold")
        ax.tick_params(labelsize=6)

        if i == 0:
            ax.legend(loc="upper right", fontsize=7)

    axes[-1].set_xlabel("Time step (row index)", fontsize=10)
    fig.suptitle("Temporal Patterns — Top 10 Variable Sensors\n"
                 "(red = attack windows)",
                 fontsize=14, fontweight="bold", y=1.01)
    plt.tight_layout()

    path = os.path.join(EDA_DIR, "temporal_patterns.png")
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  ✅  Saved → {path}")


# ═══════════════════════════════════════════════════════════════════
# SUMMARY REPORT
# ═══════════════════════════════════════════════════════════════════
def print_summary(corr: pd.DataFrame, G: nx.Graph,
                  impact_df: pd.DataFrame) -> None:
    print(f"\n{'╔' + '═' * 63 + '╗'}")
    print(f"{'║':<2}{'SUMMARY REPORT':^61}{'║':>2}")
    print(f"{'╚' + '═' * 63 + '╝'}")

    sensors = corr.columns.tolist()
    components = list(nx.connected_components(G))

    # 1. Sensor clusters
    print(f"\n  🔗 Sensor Clusters Found: {len(components)}")
    for i, comp in enumerate(components, 1):
        print(f"     Cluster {i} ({len(comp)} sensors): {sorted(comp)}")

    # 2. Top-10 most correlated pairs
    print(f"\n  📊 Top 10 Most Correlated Sensor Pairs:")
    pairs = []
    for s1, s2 in combinations(sensors, 2):
        r = corr.loc[s1, s2]
        pairs.append((s1, s2, abs(r), r))
    pairs.sort(key=lambda x: x[2], reverse=True)
    for s1, s2, absr, r in pairs[:10]:
        print(f"     {s1:>10s} ↔ {s2:<10s}  r = {r:+.4f}")

    # 3. Most isolated sensors
    print(f"\n  🏝️  Most Isolated Sensors (lowest avg |correlation|):")
    avg_corr = corr.abs().mean().sort_values()
    for sensor, val in avg_corr.head(10).items():
        print(f"     {sensor:>10s}  avg|r| = {val:.4f}")

    # 4. Sensors most affected across ALL attacks
    print(f"\n  🎯 Sensors Most Affected Across All Attacks "
          f"(highest mean std ratio):")
    if not impact_df.empty:
        agg = (impact_df
               .groupby("sensor")["std_ratio"]
               .agg(["mean", "count"])
               .sort_values("mean", ascending=False))
        for sensor, row in agg.head(10).iterrows():
            print(f"     {sensor:>10s}  mean_ratio={row['mean']:.3f}×  "
                  f"(appeared in {int(row['count'])} windows)")
    else:
        print("     (no attack windows detected)")

    # Output files list
    print(f"\n  📁 Output Files:")
    for f in sorted(os.listdir(EDA_DIR)):
        fpath = os.path.join(EDA_DIR, f)
        size = os.path.getsize(fpath)
        print(f"     {f:<35s}  {size / 1024:.1f} KB")
    print()


# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print(f"\n{'━' * 65}")
    print("  GenTwin — Exploratory Data Analysis")
    print(f"{'━' * 65}")

    # Load raw data (with timestamps & labels intact)
    normal_df, attack_df = _load_raw()
    print(f"  Normal: {normal_df.shape}   Attack: {attack_df.shape}\n")

    # Run all 5 analyses
    analysis_1_distributions(normal_df, attack_df)
    impact_df = analysis_2_attack_windows(normal_df, attack_df)
    corr = analysis_3_correlation(normal_df)
    G = analysis_4_dependency_graph(corr)
    analysis_5_temporal(attack_df, normal_df)

    # Summary
    print_summary(corr, G, impact_df)

    print("  ✅  EDA complete. All outputs in data/eda_outputs/\n")
