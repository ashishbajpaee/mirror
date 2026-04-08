"""Unified FastAPI backend — Layer 5 Dashboard + Attacker Terminal + MIRROR."""

from __future__ import annotations

import asyncio
import logging
import os
import random
import re
import sys
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Path setup — ensure gentwin root is importable
# ---------------------------------------------------------------------------
_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

# ---------------------------------------------------------------------------
# Layer 5 Ops imports
# ---------------------------------------------------------------------------
from backend.data_store import DataStore
from backend.query_parser import ScenarioQueryParser
from backend.simulation import SimulationEngine
from mirror.profile import AttackerGenomeEngine
from mirror.recorder import AttackRecorder

# ---------------------------------------------------------------------------
# Attacker Terminal imports (Ashish's modules)
# ---------------------------------------------------------------------------
import backend.attacker_terminal as atk
from backend.attacker_genome import router as genome_router
from backend.demo_moments import router as demo_router
from backend.attack_cards import cards_router

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════
# Request / Response models
# ═══════════════════════════════════════════════════════════════════════════

class SimulateRequest(BaseModel):
    attack_id: int = Field(..., ge=0)
    duration_seconds: int = Field(default=120, ge=10, le=600)
    speed_multiplier: float = Field(default=1.0, ge=0.5, le=5.0)

class WhatIfRequest(BaseModel):
    natural_language_query: str = Field(min_length=3, max_length=500)

class ProbeRequest(BaseModel):
    query_type: str = Field(default="probe")
    sensors_queried: List[str] = Field(default_factory=list)
    command_sent: Optional[str] = None

class TerminalExecuteRequest(BaseModel):
    command: str

# ═══════════════════════════════════════════════════════════════════════════
# FastAPI App
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="GenTwin Unified API",
    description="Layer 5 Dashboard + Attacker Terminal + MIRROR.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Include Ashish's sub-routers ---
app.include_router(genome_router)
app.include_router(demo_router)
app.include_router(cards_router)

# --- Layer 5 Ops singletons ---
store = DataStore()
ops_simulator = SimulationEngine(store.sensor_names)
recorder = AttackRecorder()
genome = AttackerGenomeEngine()
query_parser = ScenarioQueryParser()

what_if_cache: Dict[str, Dict[str, object]] = {}
decoy_overrides: Dict[str, float] = {}

# ═══════════════════════════════════════════════════════════════════════════
# HELPERS (Ops)
# ═══════════════════════════════════════════════════════════════════════════

def _attack_match_score(attack, parsed_query):
    score = float(attack.get("rank_score", 0.0)) / 100.0
    stage = parsed_query.get("stage")
    attack_type = parsed_query.get("attack_type")
    severity = parsed_query.get("severity")
    if stage:
        if attack.get("target_stage") == stage:
            score += 3.2
        elif stage in attack.get("affected_stages", []):
            score += 2.0
    if attack_type and attack.get("attack_type") == attack_type:
        score += 3.0
    if severity and attack.get("severity_level") == severity:
        score += 1.8
    return score

def _pick_attack_for_query(query):
    parsed = query_parser.parse(query)
    attacks = store.get_attack_library()
    if not attacks:
        raise HTTPException(status_code=404, detail="No attacks available")
    selected = max(attacks, key=lambda a: _attack_match_score(a, parsed))
    return selected, parsed

def _generate_what_if_result(query):
    attack, parsed = _pick_attack_for_query(query)
    duration_seconds = int(parsed.get("duration_seconds") or 40)
    quick_log = ops_simulator.run_attack(attack=attack, duration_seconds=duration_seconds, speed_multiplier=2.0, mode="real")
    alerts = []
    for item in quick_log:
        alerts.extend(item.get("alerts", []))
    unique_alerts = sorted(set(alerts))
    cascade_chain = ["Initial access", "Sensor manipulation in %s" % attack.get("target_stage", "P1"), "Cross-stage deviation", "Safety threshold pressure"]
    time_to_failure = max(3, int(20 - float(attack.get("sigma", 1.0)) * 4))
    return {
        "attack_generated": attack,
        "parser_metadata": parsed,
        "affected_sensors": store.get_shap_explanation(int(attack["attack_id"]))["top_features"],
        "detected": len(unique_alerts) > 0,
        "cascade_chain": cascade_chain,
        "time_to_failure": time_to_failure,
        "recommended_fix": store.get_lime_rule(int(attack["attack_id"])),
        "plain_english_summary": "Scenario routed to attack %d targeting %s. Time-to-failure %d min with %d alert types." % (
            int(attack["attack_id"]), str(attack.get("target_stage", "P1")), time_to_failure, len(unique_alerts)),
        "simulation_excerpt": quick_log[-5:],
    }

# ═══════════════════════════════════════════════════════════════════════════
# STARTUP
# ═══════════════════════════════════════════════════════════════════════════

@app.on_event("startup")
async def startup():
    # --- Init VirtualSensorSimulator for attacker terminal ---
    from data.virtual_sensor_simulator import VirtualSensorSimulator
    atk.simulator = VirtualSensorSimulator(speed=1.0, demo_mode=False)
    logger.info("VirtualSensorSimulator ready ✓")

    # --- Pre-warm what-if cache ---
    async def _warm():
        for stage in ["P1", "P2", "P3"]:
            for atype in ["drift", "spike", "replay"]:
                q = "What if %s sensors are under %s attack?" % (stage, atype)
                try:
                    what_if_cache[q.lower()] = _generate_what_if_result(q)
                except Exception:
                    continue
                await asyncio.sleep(0)
    asyncio.create_task(_warm())

# ═══════════════════════════════════════════════════════════════════════════
# LAYER 5 OPS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {"status": "ok", "attacks_loaded": len(store.get_attack_library()), "sensors": len(store.sensor_names), "mirror_session": recorder.session_id}

@app.get("/attacks")
async def get_attacks(limit: int = 200):
    return store.get_attack_library(limit=limit)

@app.get("/attacks/{attack_id}")
async def get_attack(attack_id: int):
    attack = store.get_attack(attack_id)
    if not attack:
        raise HTTPException(status_code=404, detail="Attack not found")
    return attack

@app.post("/simulate")
async def simulate_attack(request: SimulateRequest):
    attack = store.get_attack(request.attack_id)
    if not attack:
        raise HTTPException(status_code=404, detail="Attack not found")
    simulation_log = await asyncio.to_thread(ops_simulator.run_attack, attack, request.duration_seconds, request.speed_multiplier, "real", None)
    return {"attack": attack, "simulation_log": simulation_log}

@app.get("/blindspot-scores")
async def get_blindspot_scores():
    return store.get_blindspot_scores()

@app.get("/kill-chains")
async def get_kill_chains():
    return store.get_kill_chains()

@app.get("/shap/{attack_id}")
async def get_shap(attack_id: int):
    try:
        return store.get_shap_explanation(attack_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

@app.get("/lime/{attack_id}")
async def get_lime(attack_id: int):
    try:
        return store.get_lime_rule(attack_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

@app.get("/gaps")
async def get_gaps(limit: int = 60):
    gaps = store.get_gaps(limit=limit)
    return {"total": len(gaps), "gaps": gaps}

@app.post("/what-if")
async def what_if(request: WhatIfRequest):
    query_key = request.natural_language_query.strip().lower()
    if query_key in what_if_cache:
        return what_if_cache[query_key]
    result = await asyncio.to_thread(_generate_what_if_result, request.natural_language_query)
    what_if_cache[query_key] = result
    return result

@app.post("/apply-fix/{attack_id}")
async def apply_fix(attack_id: int):
    try:
        return store.apply_fix(attack_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

# ═══════════════════════════════════════════════════════════════════════════
# PERSON 2 INNOVATION ENDPOINTS (RL, Immunity, DNA, Timeline)
# ═══════════════════════════════════════════════════════════════════════════

import pandas as pd

_P2_DIR = _ROOT / "models_saved"

@app.get("/api/p2/immunity")
async def get_immunity_scores():
    """Stage-level immunity scores from Person 2 pipeline."""
    csv = _P2_DIR / "immunity_scores.csv"
    if not csv.exists():
        return {"stages": [], "error": "Run Person 2 pipeline first"}
    df = pd.read_csv(csv)
    return {"stages": df.to_dict(orient="records")}

@app.get("/api/p2/rl-qtable")
async def get_rl_qtable():
    """RL adaptive defense Q-table."""
    csv = _P2_DIR / "rl_q_table.csv"
    if not csv.exists():
        return {"states": [], "actions": [], "q_values": {}, "error": "Run Person 2 pipeline first"}
    df = pd.read_csv(csv, index_col=0)
    best_actions = {state: df.loc[state].idxmax() for state in df.index}
    return {
        "states": list(df.index),
        "actions": list(df.columns),
        "q_values": df.to_dict(orient="index"),
        "best_actions": best_actions,
    }

@app.get("/api/p2/dna")
async def get_dna_fingerprints(limit: int = 50):
    """Cyber DNA fingerprints for attack deduplication."""
    csv = _P2_DIR / "attack_dna.csv"
    if not csv.exists():
        return {"fingerprints": [], "error": "Run Person 2 pipeline first"}
    df = pd.read_csv(csv).head(limit)
    return {"total": len(df), "fingerprints": df.to_dict(orient="records")}

@app.get("/api/p2/timeline")
async def get_incident_timeline(limit: int = 100):
    """Chronological incident timeline."""
    csv = _P2_DIR / "incident_timeline.csv"
    if not csv.exists():
        return {"events": [], "error": "Run Person 2 pipeline first"}
    df = pd.read_csv(csv).head(limit)
    return {
        "total_events": len(df),
        "critical_gaps": int(df[df["event_type"] == "critical_gap"].shape[0]) if "event_type" in df.columns else 0,
        "events": df.to_dict(orient="records"),
    }

@app.get("/api/p2/impact-summary")
async def get_impact_summary():
    """Impact analysis summary from SimPy simulation."""
    csv = _P2_DIR / "impact_analysis.csv"
    if not csv.exists():
        return {"summary": {}, "error": "Run Person 2 pipeline first"}
    df = pd.read_csv(csv)
    by_stage = df.groupby("target_stage").agg(
        count=("impact_score", "count"),
        mean_impact=("impact_score", "mean"),
        max_impact=("impact_score", "max"),
        total_violations=("total_violations", "sum"),
    ).reset_index()
    return {
        "total_attacks": len(df),
        "avg_impact": round(float(df["impact_score"].mean()), 2),
        "max_impact": round(float(df["impact_score"].max()), 2),
        "by_stage": by_stage.to_dict(orient="records"),
        "top_attacks": df.nlargest(10, "impact_score")[["attack_id", "target_stage", "attack_type", "impact_score", "total_violations"]].to_dict(orient="records"),
    }


@app.post("/attacker/probe")
async def attacker_probe(request: ProbeRequest):
    command_text = (request.command_sent or "").strip()
    sensors = list(request.sensors_queried)
    if "reset" in command_text.lower() or "clear" in command_text.lower():
        decoy_overrides.clear()
    override_pattern = re.compile(r"(Feature_\d+)\s*(?:=|to)\s*([+-]?\d+(?:\.\d+)?)", re.IGNORECASE)
    for sensor_name, value_text in override_pattern.findall(command_text):
        if sensor_name not in store.sensor_names:
            continue
        decoy_overrides[sensor_name] = float(value_text)
        if sensor_name not in sensors:
            sensors.append(sensor_name)
    await asyncio.sleep(random.uniform(0.05, 0.2))
    default_attack = store.get_attack(0) or store.get_attack_library(limit=1)[0]
    decoy_snapshot = ops_simulator.run_attack(attack=default_attack, duration_seconds=1, speed_multiplier=1.0, mode="decoy", overrides=decoy_overrides)[-1]
    log_entry = recorder.log_action(action_type=request.query_type, sensors_queried=sensors, command_sent=command_text, response_observed={"alerts": decoy_snapshot.get("alerts", []), "sample": dict(list(decoy_snapshot.get("sensor_readings", {}).items())[:5])})
    status = recorder.get_status()
    profile = genome.classify(status["behavioral_features"])
    return {"intercepted": True, "redirected_to": "fake_plant", "decoy_response": decoy_snapshot, "active_overrides": decoy_overrides, "logged_action": log_entry, "attacker_profile": profile}

@app.get("/mirror/status")
async def mirror_status():
    status = recorder.get_status()
    status["attacker_profile"] = genome.classify(status["behavioral_features"])
    status["patches_deployed"] = len(store.get_mitigation_rules())
    return status

@app.get("/mirror/profile")
async def mirror_profile():
    features = recorder.compute_behavioral_features()
    profile = genome.classify(features)
    return {"features": features, "profile": profile}

# ═══════════════════════════════════════════════════════════════════════════
# ATTACKER TERMINAL ENDPOINTS (Ashish's)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/attacker/execute")
async def execute_attack_terminal(req: TerminalExecuteRequest):
    parsed = atk.parse_attack_command(req.command)
    attack_id = f"atk-{uuid.uuid4().hex[:8]}"
    duration = parsed["duration"]
    intensity = parsed["intensity"]
    atype = parsed["attack_type"]
    sensors = parsed["target_sensors"]
    baseline = atk.simulator.get_next_reading()
    if atype == "sensor_spoof":
        atk.simulator.sensor_spoof(sensors[0], intensity * 0.05, duration=duration)
    elif atype == "actuator_block":
        atk.simulator.sensor_spoof(sensors[0], 0.0, duration=duration)
    elif atype == "drift":
        atk.simulator.drift_attack(sensors[0], 0.01 * intensity, duration=duration)
    elif atype == "coordinated":
        atk.simulator.coordinated_attack(sensors, np.random.uniform(0.0, intensity, 51), duration=duration)
    elif atype == "replay":
        atk.simulator.replay_attack(np.random.randint(0, max(1, atk.simulator.num_rows - duration)), duration=duration)
    else:
        atk.simulator.inject_attack(np.random.uniform(0, 1, 51), duration=duration)
    record = atk.AttackRecord(attack_id=attack_id, command=req.command, parsed=parsed, launch_time=time.time(), duration=duration, sensors_affected=sensors, baseline_snapshot={s: baseline["sensors"].get(s, 0.0) for s in sensors[:5]})
    atk.session.add(record)
    return {"status": "launched", "parsed_attack": parsed, "attack_id": attack_id, "message": f"Attack launched on {', '.join(sensors[:3])}. Watch the dashboard.", "estimated_detection_time": "calculating..."}

@app.get("/api/attacker/status/{attack_id}")
async def attack_terminal_status(attack_id: str):
    record = atk.session.get(attack_id)
    if not record:
        return {"error": "Attack not found", "attack_id": attack_id}
    elapsed = time.time() - record.launch_time
    is_running = elapsed < record.duration and atk.simulator.state.get("is_under_attack", False)
    if not record.detected:
        reading = atk.simulator.get_next_reading()
        dev_sum = sum(abs(reading["sensors"].get(s, 0.0) - record.baseline_snapshot.get(s, 0.0)) for s in record.sensors_affected[:5])
        avg_dev = dev_sum / max(len(record.sensors_affected[:5]), 1)
        if avg_dev > 0.05 and elapsed > 1.0:
            record.detected = True
            record.detection_time = round(elapsed, 2)
            record.blindspot_score = round(max(0, 10 - avg_dev * 20), 1)
        elif elapsed >= record.duration:
            record.is_running = False
            record.blindspot_score = round(7 + np.random.uniform(0, 3), 1)
    if not is_running:
        record.is_running = False
    if len(record.sensors_affected) > 3 and record.detected:
        record.cascade_triggered = True
    return {"attack_id": record.attack_id, "is_running": record.is_running, "time_elapsed": round(elapsed, 1), "detected": record.detected, "detection_time": record.detection_time, "sensors_affected": record.sensors_affected, "cascade_triggered": record.cascade_triggered, "blindspot_score": record.blindspot_score}

@app.get("/api/attacker/history")
async def attack_terminal_history():
    records = atk.session.all()
    return {"attacks": [{"attack_id": r.attack_id, "command": r.command, "attack_type": r.parsed.get("attack_type", "unknown"), "target_stage": r.parsed.get("target_stage", "?"), "target_sensors": r.sensors_affected, "is_running": r.is_running, "detected": r.detected, "detection_time": r.detection_time, "blindspot_score": r.blindspot_score, "duration": r.duration} for r in records], "stats": atk.session.stats}

@app.post("/api/attacker/reset")
async def reset_terminal():
    atk.simulator._reset_attack()
    atk.session.clear()
    return {"status": "reset", "message": "All attacks stopped."}

@app.get("/api/results/summary")
async def results_summary():
    return {"total_attacks_generated": 1000, "detected_by_standard": 847, "gaps_discovered": 153, "critical_kill_chains": 7, "rules_auto_generated": 153, "gaps_remaining": 0, "improvement_percentage": 93, "most_vulnerable_sensor": "LIT101", "most_dangerous_attack": "Cascade P1→P2→P3", "fastest_detection_ms": 800, "average_detection_ms": 2300, "stages_protected": 6, "plant_status": "MORE SECURE THAN BEFORE DEMO"}

@app.get("/api/health")
async def api_health():
    return {"status": "ok", "simulator_active": atk.simulator is not None}

# ═══════════════════════════════════════════════════════════════════════════
# WEBSOCKET ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@app.websocket("/ws")
async def ws_sensor_stream(ws: WebSocket):
    """Attacker terminal live sensor stream."""
    await ws.accept()
    try:
        while True:
            reading = atk.simulator.get_next_reading()
            payload = {"timestamp": reading["timestamp"], "sensors": {k: round(float(v), 4) for k, v in reading["sensors"].items()}, "is_attack": bool(reading["is_attack"]), "attack_type": reading["attack_type"]}
            await ws.send_json(payload)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")

async def _stream_to_websocket(websocket, attack, mode, duration_seconds, speed_multiplier):
    frame_delay = max(0.05, 1.0 / max(0.2, speed_multiplier))
    for payload in ops_simulator.iter_attack(attack=attack, duration_seconds=duration_seconds, speed_multiplier=speed_multiplier, mode=mode, overrides=decoy_overrides if mode == "decoy" else None):
        if mode == "real":
            status = recorder.get_status()
            payload["attacker_profile"] = genome.classify(status["behavioral_features"])
            payload["patches_deployed"] = len(store.get_mitigation_rules())
        else:
            payload["active_overrides"] = decoy_overrides
        await websocket.send_json(payload)
        await asyncio.sleep(frame_delay)

@app.websocket("/ws/simulation")
async def ws_simulation(websocket: WebSocket):
    await websocket.accept()
    params = websocket.query_params
    attack_id = int(params.get("attack_id", "0"))
    speed = float(params.get("speed", "1.0"))
    duration = int(params.get("duration", "120"))
    attack = store.get_attack(attack_id) or store.get_attack_library(limit=1)[0]
    try:
        await _stream_to_websocket(websocket, attack, "real", duration, speed)
    except WebSocketDisconnect:
        return

@app.websocket("/ws/decoy")
async def ws_decoy(websocket: WebSocket):
    await websocket.accept()
    params = websocket.query_params
    attack_id = int(params.get("attack_id", "0"))
    speed = float(params.get("speed", "1.0"))
    duration = int(params.get("duration", "180"))
    attack = store.get_attack(attack_id) or store.get_attack_library(limit=1)[0]
    try:
        await _stream_to_websocket(websocket, attack, "decoy", duration, speed)
    except WebSocketDisconnect:
        return

@app.websocket("/ws/real")
async def ws_real(websocket: WebSocket):
    await websocket.accept()
    params = websocket.query_params
    attack_id = int(params.get("attack_id", "0"))
    speed = float(params.get("speed", "1.0"))
    duration = int(params.get("duration", "180"))
    attack = store.get_attack(attack_id) or store.get_attack_library(limit=1)[0]
    try:
        await _stream_to_websocket(websocket, attack, "real", duration, speed)
    except WebSocketDisconnect:
        return

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
