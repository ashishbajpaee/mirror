# Person 2 — GenTwin Analysis & Innovations Pipeline

**Status**: ✅ Fully Implemented

Person 2 builds on Person 1's foundation (data preprocessing, model training) to deliver **advanced threat analysis and defensive innovations** for the GenTwin cybersecurity digital twin.

---

## 🎯 Overview

Person 2 implements **Layers 3-4** and **Core Innovations** from the GenTwin specification:

### **Layer 3: Digital Twin Simulation**
- **3.1 SimPy Plant Simulation** (`twin/simpy_simulator.py`)
- **3.2 Cascade Mapper** (integrated into impact scoring)

### **Layer 4: Explainability & Analysis**
- **4.1 Blindspot Scorer** (integrated into gap discovery)
- **4.2 SHAP Explanations** (`analysis/explainability_suite.py`)
- **4.3 LIME Explanations** (`analysis/explainability_suite.py`)
- **4.4 Kill Chain Mapper** (integrated into timeline)

### **Core Innovations (Section 6)**
- **6.1 RL Red/Blue Teams** (`innovations/rl_adaptive_defense.py`)
- **6.2 Immunity System** (`innovations/immunity_score.py`)
- **6.3 Attack DNA** (`innovations/dna_fingerprint.py`)
- **6.4 Predictive Failure Timeline** (`innovations/timeline_builder.py`)

---

## 📂 Architecture

```
gentwin/
├── twin/
│   └── simpy_simulator.py       # SimPy-based SWaT process simulation
├── analysis/
│   ├── run_person2.py           # 🚀 MAIN RUNNER (Person 2 pipeline)
│   ├── gap_discovery.py         # Security gap identification
│   └── explainability_suite.py  # SHAP/LIME explanations
├── innovations/
│   ├── rl_adaptive_defense.py   # Q-learning defense agent
│   ├── immunity_score.py        # Plant resilience scoring
│   ├── dna_fingerprint.py       # Attack signature hashing
│   └── timeline_builder.py      # Chronological incident timeline
├── models_saved/                # 📊 Person 1 outputs (required inputs)
│   ├── attack_library.csv       # From Person 1
│   ├── vae_best.pth            # Trained VAE model
│   └── ...
└── data/, models/               # Person 1 modules
```

---

## 🔧 Prerequisites

### Person 1 Outputs (Required)
Person 2 **depends on** Person 1 artifacts in `models_saved/`:

| Artifact | Source | Purpose |
|----------|--------|---------|
| `attack_library.csv` | Person 1 attack generation | Input for simulation |
| `vae_best.pth` | Person 1 VAE training | SHAP/LIME explainability |
| Normal data sequences | Person 1 preprocessing | Baseline for explainability |

**If missing**: Person 2 uses **robust fallbacks** (relaxed thresholds, synthetic data) to still produce analysis artifacts.

### Python Dependencies
All requirements are in `requirements.txt`:
```bash
pip install -r requirements.txt
```

Key libraries:
- `simpy>=4.0.1` — Discrete-event simulation
- `shap>=0.42.0` — SHAP explanations
- `lime>=0.2.0.1` — LIME local surrogate
- `torch>=2.0.0` — VAE model loading
- `networkx>=3.1` — Graph analysis
- `pandas`, `numpy`, `scikit-learn` — Data processing

---

## 🚀 Quick Start

### Run Full Person 2 Pipeline
```bash
cd C:\Users\panka\GAMES\dev\gentwin
python analysis/run_person2.py
```

**Expected Output**:
```
[1/7] SimPy impact simulation...
  -> impact rows: 300
[2/7] Security gap discovery...
  -> gaps found: 47
[3/7] SHAP/LIME explanations...
  -> explained rows: 47
[4/7] RL adaptive defense table...
  -> q-table shape: (5, 4)
[5/7] Immunity scoring...
  -> stage immunity rows: 6
[6/7] Cyber DNA fingerprints...
  -> dna rows: 1500
[7/7] Incident timeline...
  -> timeline rows: 300

Person 2 pipeline complete.
```

**Artifacts Created** (in `models_saved/`):
1. `impact_analysis.csv` — SimPy simulation results
2. `security_gaps.csv` — High-impact, low-detection attacks
3. `security_gaps_explained.csv` — SHAP/LIME insights
4. `rl_q_table.csv` — Q-learning defense policy
5. `immunity_scores.csv` — Per-stage resilience metrics
6. `attack_dna.csv` — SHA-256 attack fingerprints
7. `incident_timeline.csv` — Chronological event log

---

## 📊 Individual Module Usage

### 1. SimPy Simulation
```bash
python -c "from twin.simpy_simulator import simulate_attack_library; simulate_attack_library(sample_n=100, duration_sec=120)"
```

**Output**: `models_saved/impact_analysis.csv`

Columns:
- `attack_id`, `target_stage`, `attack_type`
- `impact_score` (0-100): Weighted violation density
- `total_violations`: Count of safety limit breaches
- `max_violation_weight`: Most severe violation detected
- `violations`: List of safety parameter breaches

### 2. Security Gap Discovery
```bash
python analysis/gap_discovery.py
```

**Output**: `models_saved/security_gaps.csv`

Identifies attacks with:
- **High physical impact** (default: ≥70/100)
- **Low detector confidence** (default: ≤0.30)

**Fallback**: If no gaps found, ranks by risk score (`impact × (1 - detectability)`).

### 3. SHAP/LIME Explainability
```bash
python analysis/explainability_suite.py
```

**Output**: `models_saved/security_gaps_explained.csv`

Adds columns:
- `shap_explanation`: Top contributing features from SHAP
- `lime_explanation`: Local surrogate model insights

**Requirements**: Trained VAE model (`vae_best.pth`) + normal data

### 4. RL Adaptive Defense
```bash
python innovations/rl_adaptive_defense.py
```

**Output**: `models_saved/rl_q_table.csv`

Q-learning policy mapping:
- **States**: `normal`, `low`, `medium`, `high`, `critical`
- **Actions**: `monitor`, `raise_alert`, `isolate_stage`, `safe_shutdown`

### 5. Immunity Scoring
```bash
python innovations/immunity_score.py
```

**Output**: `models_saved/immunity_scores.csv`

Per-stage (P1-P6) metrics:
- `n_gaps`: Number of security gaps
- `mean_impact`: Average impact severity
- `mean_detect`: Average detection probability
- `immunity_score` (0-100): Composite resilience score

### 6. Cyber DNA Fingerprints
```bash
python innovations/dna_fingerprint.py
```

**Output**: `models_saved/attack_dna.csv`

SHA-256 hashes + statistical features for:
- Attack deduplication
- Similarity retrieval
- Signature-based detection

### 7. Incident Timeline
```bash
python innovations/timeline_builder.py
```

**Output**: `models_saved/incident_timeline.csv`

Chronological event log with:
- `event_time`: Timestamp
- `event_type`: `impact_event` | `critical_gap`
- Attack metadata + impact scores

---

## 🔍 Verification Commands

### Quick Health Check
```bash
# Verify all Person 2 modules import successfully
python -c "from analysis.run_person2 import main; print('✅ Person 2 imports OK')"
```

### Check Person 1 Artifacts
```bash
# Windows PowerShell
Get-ChildItem models_saved\*.csv, models_saved\*.pth | Select-Object Name, Length

# Expected files from Person 1:
# - attack_library.csv
# - vae_best.pth
# - lstm_ae_best.pth (optional)
```

### Run Comprehensive Tests
```bash
python test_pipeline.py
```

Look for Person 2 test groups:
- **Group 10**: SimPy Simulator
- **Group 11**: Gap Discovery + Explainability
- **Group 12**: Innovations (RL, Immunity, DNA, Timeline)

---

## 🎨 Advanced Configuration

### Adjusting Gap Discovery Thresholds
```python
from analysis.gap_discovery import identify_security_gaps

# More strict (fewer gaps)
gaps = identify_security_gaps(
    impact_threshold=85.0,
    detection_threshold=0.20
)

# More relaxed (more gaps)
gaps = identify_security_gaps(
    impact_threshold=50.0,
    detection_threshold=0.50
)
```

### RL Hyperparameter Tuning
```python
from innovations.rl_adaptive_defense import train_q_agent

q_table = train_q_agent(
    episodes=500,      # More training iterations
    alpha=0.15,        # Learning rate
    gamma=0.95,        # Discount factor
    epsilon=0.10       # Exploration rate
)
```

### SimPy Simulation Duration
```python
from twin.simpy_simulator import simulate_attack_library

# Longer simulation = more violation opportunities
results = simulate_attack_library(
    sample_n=500,      # Number of attacks to simulate
    duration_sec=600   # 10 minutes per attack (default: 300)
)
```

---

## 🛡️ Fallback Behavior

Person 2 is designed to **gracefully degrade** when Person 1 artifacts are missing:

| Missing Artifact | Fallback Behavior |
|------------------|-------------------|
| `attack_library.csv` | ❌ **Critical** — Simulation cannot proceed |
| `vae_best.pth` | ⚠️ **Warning** — SHAP/LIME step skipped |
| Normal sequences | ⚠️ Explanations use synthetic baseline |
| `impact_analysis.csv` | Generated on first run |

**Relaxed Thresholds**: If gap discovery returns 0 results, automatically relaxes criteria to ensure analysis artifacts are still produced.

---

## 🔗 Integration with Person 1

### Data Flow
```
Person 1:
  data/run_all.py
    ↓
  models/train_vae.py
    ↓
  models_saved/
    ├── attack_library.csv
    └── vae_best.pth

Person 2:
  analysis/run_person2.py
    ↓ (reads Person 1 outputs)
  models_saved/
    ├── impact_analysis.csv
    ├── security_gaps_explained.csv
    ├── rl_q_table.csv
    └── ... (7 new artifacts)
```

### Recommended Workflow
```bash
# 1. Generate baseline data (Person 1)
python data/run_all.py

# 2. Train models (Person 1)
python models/train_vae.py

# 3. Run Person 2 analysis pipeline
python analysis/run_person2.py

# 4. Comprehensive validation
python test_pipeline.py
```

---

## 📈 Output Artifacts Summary

| Artifact | Rows | Key Columns | Use Case |
|----------|------|-------------|----------|
| `impact_analysis.csv` | ~300 | `impact_score`, `total_violations` | Physical damage assessment |
| `security_gaps.csv` | ~50 | `gap_reason`, `detection_rate_proxy` | Blind spot identification |
| `security_gaps_explained.csv` | ~50 | `shap_explanation`, `lime_explanation` | Root cause analysis |
| `rl_q_table.csv` | 5×4 | States × Actions | Adaptive defense policy |
| `immunity_scores.csv` | 6 | `immunity_score` per stage | Resilience benchmarking |
| `attack_dna.csv` | ~1500 | `dna_hash`, statistical features | Signature database |
| `incident_timeline.csv` | ~300 | `event_time`, `event_type` | Forensic reconstruction |

---

## 🐛 Troubleshooting

### Issue: "FileNotFoundError: attack_library.csv"
**Solution**: Run Person 1 data pipeline first:
```bash
python data/run_all.py
```

### Issue: SHAP/LIME step fails
**Cause**: Missing `vae_best.pth` or incompatible PyTorch version

**Solution**:
1. Train VAE: `python models/train_vae.py`
2. Verify CUDA compatibility: `python -c "import torch; print(torch.__version__)"`

### Issue: "No security gaps found"
**Expected**: Person 2 automatically relaxes thresholds and uses risk ranking

**Manual override**:
```python
gaps = identify_security_gaps(
    impact_threshold=40.0,
    detection_threshold=0.60
)
```

### Issue: LIME not available
**Solution**: `pip install lime` (optional dependency)

**Fallback**: SHAP explanations still work, LIME column will show "LIME unavailable" message

---

## 📚 References

### GenTwin Specification Mapping
- **Section 3.1**: `twin/simpy_simulator.py` — SimPy discrete-event simulation
- **Section 3.2**: Cascade logic embedded in impact scoring
- **Section 4.1**: `analysis/gap_discovery.py` — Blindspot scoring via stealth/detection proxy
- **Section 4.2**: `analysis/explainability_suite.py` — SHAP KernelExplainer
- **Section 4.3**: `analysis/explainability_suite.py` — LIME tabular explainer
- **Section 4.4**: `innovations/timeline_builder.py` — Kill chain event sequencing
- **Section 6.1**: `innovations/rl_adaptive_defense.py` — Q-learning (Red team via attack library)
- **Section 6.2**: `innovations/immunity_score.py` — Multi-factor resilience scoring
- **Section 6.3**: `innovations/dna_fingerprint.py` — SHA-256 + statistical fingerprinting
- **Section 6.4**: `innovations/timeline_builder.py` — Predictive timeline generation

### Key Algorithms
- **SimPy Event Loop**: 1-second timesteps, safety parameter monitoring
- **Gap Discovery**: `risk = 0.7×impact + 0.3×(1−detectability)`
- **RL Policy**: Tabular Q-learning, ε-greedy exploration
- **Immunity Score**: `0.6×detect_rate + 0.4×(1−normalized_impact) − 0.5×gap_count`
- **DNA Hash**: SHA-256 of rounded 51-dim sensor vectors

---

## 🎯 Success Criteria

Person 2 is **fully operational** when:

✅ All 7 pipeline stages complete without errors  
✅ `models_saved/` contains 7 new CSV artifacts  
✅ Security gaps identified (or fallback engaged)  
✅ SHAP/LIME explanations generated for gaps  
✅ RL Q-table shows learned defense policy  
✅ Immunity scores computed for all 6 stages  
✅ Timeline spans all simulated events  
✅ Attack DNA hashes are unique and reproducible  

---

## 👥 Contributors

**Person 2 Role**: Security Analyst & Innovation Engineer

**Responsibilities**:
- Digital twin simulation and validation
- Security gap discovery and explainability
- Defensive AI innovations (RL, immunity, DNA, timeline)

**Handoff to Person 3**: Prediction, autoencoder refinement, and end-to-end integration

---

## 📞 Support

For issues or questions:
1. Check `test_pipeline.py` output for specific test failures
2. Review `models_saved/` for missing Person 1 artifacts
3. Verify `requirements.txt` dependencies installed
4. Check Python version: **3.8+** required

**Quick Diagnostic**:
```bash
python -c "import sys; print(f'Python: {sys.version}'); import torch; print(f'PyTorch: {torch.__version__}'); import simpy; print(f'SimPy: {simpy.__version__}')"
```

---

**Last Updated**: 2026-04-03  
**Version**: 1.0  
**Status**: Production Ready ✅
