# GenTwin — Complete Project Flowchart

## 1. AI Prompt to Generate the Flowchart

Use this prompt with ChatGPT, Gemini, Claude, or any diagramming AI:

```
Create a comprehensive flowchart for the GenTwin project — a VAE-driven Cybersecurity
Digital Twin for the SWaT (Secure Water Treatment) ICS. Cover ALL layers below:

LAYER 0 — DATA INGESTION (Person 1)
Input: SWaT Dataset (51 sensors/actuators, P1-P6 stages)
data/data_loader.py -> normalize CSV logs
data/attack_library.py -> labeled attacks: mild/moderate/severe
Output: attack_library.csv -> models_saved/

LAYER 1 — MODEL TRAINING (Person 1)
models/vae.py -> PyTorch VAE
  Encoder: 51->128->64->mu/sigma(32), Decoder: 32->64->128->51
  Loss = MSE + 0.5 * KL Divergence
baselines/detectors.py: Threshold(3s), Isolation Forest, One-Class SVM, LSTM AE
Output: vae_best.pth, lstm_ae_best.pth

LAYER 2 — SYNTHETIC ATTACK GENERATION (Person 1)
VAE latent sampling: z ~ N(mu, sigma)
Decode -> 51-dim synthetic sensor readings
Severity classification: mild / moderate / severe
Output: 1,247 synthetic attacks

LAYER 3 — DIGITAL TWIN SIMULATION (Person 2)
twin/simpy_simulator.py -> SimPy discrete-event simulation
  1-second timesteps x 300s, SWaT 6-stage physics
  P1(water intake)->P2(pre-treatment)->P3(RO)->P4(de-chlor)->P5(UV)->P6(back-wash)
  Safety: LIT101, LIT301, LIT601, AIT201 | Cascade fault propagation
digital_twin/impact_analyzer.py -> impact_score(0-100), total_violations
Output: impact_analysis.csv (~300 rows)

LAYER 4 — GAP ANALYSIS & EXPLAINABILITY (Person 2)
analysis/gap_discovery.py
  Gap: impact >= 70 AND detection_rate <= 30%
  Risk = 0.7*impact + 0.3*(1 - detectability)
  Output: security_gaps.csv (~50 rows)
analysis/explainability_suite.py
  SHAP KernelExplainer -> top sensor features
  LIME TabularExplainer -> local surrogate rules
  Output: security_gaps_explained.csv

LAYER 5a — CORE INNOVATIONS (Person 2)
innovations/rl_adaptive_defense.py: Q-learning
  States: {normal,low,medium,high,critical}
  Actions: {monitor, raise_alert, isolate_stage, safe_shutdown}
  Output: rl_q_table.csv (5x4)
innovations/immunity_score.py: per-stage P1-P6
  immunity = 0.6*detect + 0.4*(1-impact) - 0.5*gap_count
  Output: immunity_scores.csv
innovations/dna_fingerprint.py: SHA-256 of 51-dim sensor vector
  Output: attack_dna.csv (~1,500 rows)
innovations/timeline_builder.py: kill-chain event log
  Output: incident_timeline.csv (~300 rows)

LAYER 5b — MIRROR DECEPTION SYSTEM (Person 3)
mirror/recorder.py -> AttackRecorder: intercepts attacker commands
  logs: action_type, sensors_queried, command_sent, response_observed
mirror/profile.py -> AttackerGenomeEngine
  classify: recon / exploit / persist / lateral_movement
  compute behavioral_features vector
SimulationEngine DECOY mode -> fake sensor data to attacker
SimulationEngine REAL mode -> actual state to defenders

LAYER 6 — FastAPI BACKEND (Person 3) port 8000
backend/main.py FastAPI Unified API v2.0
REST endpoints:
  GET /health, GET /attacks, GET /attacks/{id}, POST /simulate
  GET /blindspot-scores, GET /kill-chains, GET /gaps
  GET /shap/{id}, GET /lime/{id}, POST /what-if, POST /apply-fix/{id}
  GET /mirror/status, GET /mirror/profile, POST /attacker/probe
  GET /api/p2/immunity, /api/p2/rl-qtable, /api/p2/dna, /api/p2/timeline, /api/p2/impact-summary
  POST /api/attacker/execute, GET /api/attacker/status/{id}
  GET /api/attacker/history, POST /api/attacker/reset, GET /api/results/summary
WebSocket: WS /ws, WS /ws/simulation, WS /ws/decoy, WS /ws/real
Sub-routers: /api/genome/*, /api/demo/*, /api/cards/*

LAYER 7 — REACT FRONTEND (Person 3) port 3000
React 18 + Vite + Recharts + Tailwind + React Router, AppLayout Shell
12 pages:
  /ops/command        -> CommandCenter (health, count, MIRROR status, quick-launch)
  /ops/attacks        -> AttackTheater (browse, filter, WS live charts, SHAP/LIME)
  /ops/vulnerabilities -> VulnerabilityHeatmap (6-stage blindspot heatmap)
  /ops/mitigation     -> MitigationEngine (RL Q-table, apply-fix, before/after)
  /ops/mirror         -> MirrorPage (attacker profile, decoy vs real diff)
  /ops/twin           -> DigitalTwin (SWaT diagram, immunity P1-P6)
  /ops/security       -> SecurityIntel (SHAP, LIME, DNA search, kill chain)
  /ops/timeline       -> IncidentTimeline (event feed, kill chain mapper)
  /ops/attack-cards   -> AttackCards (card browser, launch attack)
  /ops/demo/attacker  -> AttackerTerminal (hacker CLI: spoof/block/drift/coordinated/replay)
  /ops/demo/defender  -> Dashboard (live anomaly alerts, evidence feed)
  /ops/demo/results   -> FinalResults (93% improvement, 356 rules auto-generated)

ALTERNATIVE: app.py Streamlit (port 8501)
  Overview | Real-Time Monitoring | Attack Sim | Gap Analysis | Model Insights

Color: Blue=Person1, Green=Person2, Purple=Backend, Orange=Frontend, Red=Attack, Teal=MIRROR
```

---

## 2. Eraser.io Diagram Code

Paste into eraser.io -> New Diagram -> Flowchart tab:

```
flowchart-elk left-right

swat_dataset [label: "SWaT Dataset\n51 sensors/actuators\nP1-P6 stages" shape: cylinder color: blue]
data_loader [label: "data/data_loader.py\nLoad and normalize CSV" color: blue]
attack_lib [label: "data/attack_library.py\nBuild labeled attacks\nmild/moderate/severe" color: blue]
attack_csv [label: "attack_library.csv\n1247 scenarios" shape: document color: blue]
swat_dataset --> data_loader --> attack_lib --> attack_csv

vae [label: "models/vae.py\nPyTorch VAE\nEncoder: 51->128->64->u/s32\nDecoder: 32->64->128->51\nLoss: MSE + 0.5*KL" color: blue]
baselines [label: "baselines/detectors.py\nThreshold 3-sigma\nIsolation Forest\nOne-Class SVM\nLSTM Autoencoder" color: blue]
weights [label: "vae_best.pth\nlstm_ae_best.pth" shape: document color: blue]
attack_csv --> vae --> weights
data_loader --> baselines

vae_sample [label: "VAE Latent Sampling\nz ~ N(u, s)" shape: diamond color: blue]
classify [label: "Severity Classifier\nmild/moderate/severe" shape: diamond color: blue]
synth [label: "1247 Synthetic Attacks" shape: document color: blue]
weights --> vae_sample --> classify --> synth

simpy [label: "twin/simpy_simulator.py\nSimPy 1s timesteps x300s\nSWaT 6-stage physics\nP1->P2->P3->P4->P5->P6\nCascade fault propagation" color: green]
impact_a [label: "digital_twin/impact_analyzer.py\nimpact_score 0-100\ntotal_violations" color: green]
impact_csv [label: "impact_analysis.csv\n~300 rows" shape: document color: green]
synth --> simpy --> impact_a --> impact_csv

gap_disc [label: "analysis/gap_discovery.py\nGap: impact>=70 AND detect<=30%\nRisk=0.7*impact+0.3*(1-detect)" color: green]
gaps_csv [label: "security_gaps.csv\n~50 critical gaps" shape: document color: green]
shap_lime [label: "analysis/explainability_suite.py\nSHAP KernelExplainer\nLIME TabularExplainer" color: green]
explained_csv [label: "security_gaps_explained.csv" shape: document color: green]
impact_csv --> gap_disc
baselines --> gap_disc
gap_disc --> gaps_csv --> shap_lime
weights --> shap_lime
shap_lime --> explained_csv

rl [label: "innovations/rl_adaptive_defense.py\nQ-learning\nStates: normal/low/medium/high/critical\nActions: monitor/alert/isolate/shutdown" color: green]
imm [label: "innovations/immunity_score.py\nP1-P6 resilience\nimmunity=0.6*D+0.4*(1-I)-0.5*G" color: green]
dna [label: "innovations/dna_fingerprint.py\nSHA-256 51-dim sensor vec\n+ statistical features" color: green]
tl [label: "innovations/timeline_builder.py\nKill-chain chronological log\nimpact_events+critical_gaps" color: green]
rl_csv [label: "rl_q_table.csv\n5x4" shape: document color: green]
imm_csv [label: "immunity_scores.csv\nP1-P6" shape: document color: green]
dna_csv [label: "attack_dna.csv\n~1500 rows" shape: document color: green]
tl_csv [label: "incident_timeline.csv\n~300 rows" shape: document color: green]
gaps_csv --> rl --> rl_csv
gaps_csv --> imm --> imm_csv
synth --> dna --> dna_csv
impact_csv --> tl --> tl_csv

recorder [label: "mirror/recorder.py\nAttackRecorder\nIntercept attacker commands" color: teal]
genome_eng [label: "mirror/profile.py\nAttackerGenomeEngine\nClassify: recon/exploit/persist/lateral\nbehavioral_features vector" color: teal]
decoy [label: "SimulationEngine DECOY\nFake sensor data to attacker" color: teal]
real [label: "SimulationEngine REAL\nActual state to defenders" color: teal]
recorder --> genome_eng --> real
recorder --> decoy

store [label: "backend/data_store.py\nDataStore Singleton\nLoads all CSVs at startup\nattacks/gaps/SHAP/LIME/mitigations" color: purple]
attack_csv --> store
impact_csv --> store
gaps_csv --> store
explained_csv --> store
rl_csv --> store
imm_csv --> store
dna_csv --> store
tl_csv --> store

qparser [label: "backend/query_parser.py\nScenarioQueryParser\nNLP->stage/type/severity" color: purple]
sim_eng [label: "backend/simulation.py\nSimulationEngine\niter_attack() generator\nreal/decoy modes" color: purple]
api [label: "backend/main.py\nFastAPI Unified v2.0\nport: 8000" color: purple]
store --> api
qparser --> api
sim_eng --> api
recorder --> api
decoy --> api
real --> api
genome_eng --> api

ops_rest [label: "Ops REST\nGET /health /attacks /attacks/{id}\nPOST /simulate\nGET /gaps /shap/{id} /lime/{id}\nGET /blindspot-scores /kill-chains\nPOST /what-if /apply-fix/{id}" color: purple]
p2_rest [label: "Person 2 REST\nGET /api/p2/immunity\nGET /api/p2/rl-qtable\nGET /api/p2/dna\nGET /api/p2/timeline\nGET /api/p2/impact-summary" color: purple]
mirror_rest [label: "MIRROR REST\nGET /mirror/status\nGET /mirror/profile\nPOST /attacker/probe" color: teal]
atk_rest [label: "Attacker Terminal REST\nPOST /api/attacker/execute\nGET /api/attacker/status/{id}\nGET /api/attacker/history\nPOST /api/attacker/reset\nGET /api/results/summary" color: red]
ws [label: "WebSocket Streams\nWS /ws live sensor feed\nWS /ws/simulation attack frames\nWS /ws/decoy fake plant\nWS /ws/real real plant" color: purple]
subs [label: "Sub-Routers\n/api/genome/*\n/api/demo/*\n/api/cards/*" color: purple]
api --> ops_rest
api --> p2_rest
api --> mirror_rest
api --> atk_rest
api --> ws
api --> subs

react [label: "React Frontend Dashboard\nVite + React 18 + Recharts + Tailwind\nport: 3000 | 12 pages" color: orange]
ops_rest --> react
p2_rest --> react
mirror_rest --> react
atk_rest --> react
ws --> react
subs --> react

p_cmd [label: "/ops/command\nCommandCenter.jsx\nHealth + count + MIRROR\nQuick-launch attack" color: orange]
p_atk [label: "/ops/attacks\nAttackTheater.jsx\nBrowse 1247 attacks\nWS live charts\nSHAP/LIME panel" color: orange]
p_vuln [label: "/ops/vulnerabilities\nVulnerabilityHeatmap.jsx\n6-stage blindspot heatmap" color: orange]
p_mitig [label: "/ops/mitigation\nMitigationEngine.jsx\nRL Q-table + apply-fix\nbefore/after detection" color: orange]
p_mirror [label: "/ops/mirror\nMirrorPage.jsx\nAttacker profile\nDecoy vs real diff" color: teal]
p_twin [label: "/ops/twin\nDigitalTwin.jsx\n6-stage SWaT diagram\nImmunity P1-P6" color: orange]
p_sec [label: "/ops/security\nSecurityIntel.jsx\nSHAP + LIME + DNA\nKill chain visual" color: orange]
p_tl [label: "/ops/timeline\nIncidentTimeline.jsx\nEvent feed + kill chain" color: orange]
p_cards [label: "/ops/attack-cards\nAttackCards.jsx\nCard browser + launch" color: orange]
p_term [label: "/ops/demo/attacker\nAttackerTerminal.jsx\nHacker CLI\nspoof/block/drift\ncoordinated/replay\nWS live feed" color: red]
p_def [label: "/ops/demo/defender\nDashboard.jsx\nLive anomaly alerts\nEvidence feed" color: orange]
p_final [label: "/ops/demo/results\nFinalResults.jsx\n93% improvement\n356 auto-rules" color: orange]

react --> p_cmd
react --> p_atk
react --> p_vuln
react --> p_mitig
react --> p_mirror
react --> p_twin
react --> p_sec
react --> p_tl
react --> p_cards
react --> p_term
react --> p_def
react --> p_final

streamlit [label: "app.py\nStreamlit Dashboard\nport: 8501\nOverview/Monitoring\nAttack Sim/Gap Analysis\nModel Insights" color: blue]
store --> streamlit
```

---

## 3. Architecture Summary

| Layer | Person | Technology | Output |
|-------|--------|------------|--------|
| 0 Data Ingestion | Person 1 | pandas, numpy | attack_library.csv |
| 1 VAE Training | Person 1 | PyTorch, scikit-learn | vae_best.pth + baselines |
| 2 Attack Generation | Person 1 | VAE sampling | 1,247 synthetic attacks |
| 3 Digital Twin Sim | Person 2 | SimPy, physics | impact_analysis.csv |
| 4 Gap Analysis | Person 2 | SHAP, LIME | security_gaps_explained.csv |
| 5a Innovations | Person 2 | Q-learning, SHA-256 | 4 CSV artifacts |
| 5b MIRROR Deception | Person 3 | Python classes | Decoy plant + profiles |
| 6 Backend API | Person 3 | FastAPI, uvicorn, WS | REST + WS port 8000 |
| 7 Frontend | Person 3 | React 18, Vite, Recharts | 12-page dashboard port 3000 |
| Alt Streamlit | Person 3 | Streamlit, Plotly | 5-page dashboard port 8501 |
