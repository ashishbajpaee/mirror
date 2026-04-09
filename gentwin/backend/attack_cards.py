from fastapi import APIRouter
from pydantic import BaseModel
import time
import numpy as np

cards_router = APIRouter()

CARDS = {
  "card_01": {
    "id": "card_01",
    "name": "Silent Drift",
    "emoji": "🌊",
    "tagline": "Slow. Invisible. Deadly.",
    "description": "Gradually drifts the pH sensor over 45 seconds. Stays within normal bounds — almost undetectable.",
    "attack_type": "drift",
    "target_sensor": "AIT201",
    "target_stage": "P2",
    "intensity": 0.3,
    "duration": 45,
    "stealth": "EXTREME",
    "stealth_color": "#8B0000",
    "card_color": "#1a0a2e",
    "border_color": "#6a0dad",
    "expected": "Likely UNDETECTED"
  },
  "card_02": {
    "id": "card_02",
    "name": "Cascade Bomb",
    "emoji": "💥",
    "tagline": "One attack. Six stages fall.",
    "description": "Triggers a chain reaction across P1 → P2 → P3. Plant failure predicted in under 4 minutes.",
    "attack_type": "cascade",
    "target_sensor": "LIT101",
    "target_stage": "P1",
    "intensity": 1.0,
    "duration": 60,
    "stealth": "LOW",
    "stealth_color": "#FF0000",
    "card_color": "#1a0000",
    "border_color": "#FF0000",
    "expected": "CRITICAL — Plant Failure"
  },
  "card_03": {
    "id": "card_03",
    "name": "Ghost Signal",
    "emoji": "👻",
    "tagline": "If the data looks normal...",
    "description": "Replays 30 seconds of old normal sensor data while manipulating the real plant state.",
    "attack_type": "replay",
    "target_sensor": "LIT101",
    "target_stage": "P1",
    "intensity": 0.8,
    "duration": 30,
    "stealth": "HIGH",
    "stealth_color": "#9400D3",
    "card_color": "#0d0d1a",
    "border_color": "#4B0082",
    "expected": "May evade detection"
  },
  "card_04": {
    "id": "card_04",
    "name": "Pump Killer",
    "emoji": "⛔",
    "tagline": "Silence the heartbeat.",
    "description": "Blocks the primary pump command signal. Tank begins overflowing with no controller response.",
    "attack_type": "actuator_block",
    "target_sensor": "P101",
    "target_stage": "P1",
    "intensity": 1.0,
    "duration": 30,
    "stealth": "MEDIUM",
    "stealth_color": "#FF4500",
    "card_color": "#1a0a00",
    "border_color": "#FF4500",
    "expected": "Tank overflow in 2 min"
  },
  "card_05": {
    "id": "card_05",
    "name": "Blind Spot",
    "emoji": "🕳️",
    "tagline": "Attack the gap we found.",
    "description": "Exploits a real detection gap discovered by GenTwin in the DPIT301 sensor. Standard systems miss this.",
    "attack_type": "sensor_spoof",
    "target_sensor": "DPIT301",
    "target_stage": "P3",
    "intensity": 0.5,
    "duration": 25,
    "stealth": "EXTREME",
    "stealth_color": "#8B0000",
    "card_color": "#0a0a0a",
    "border_color": "#DC143C",
    "expected": "UNDETECTED — Real Gap"
  },
  "card_06": {
    "id": "card_06",
    "name": "Chemical Spike",
    "emoji": "⚗️",
    "tagline": "Poison the dosing stage.",
    "description": "Sends false chemical readings to stage P2. Triggers wrong dosing decisions automatically.",
    "attack_type": "sensor_spoof",
    "target_sensor": "AIT202",
    "target_stage": "P2",
    "intensity": 0.9,
    "duration": 25,
    "stealth": "MEDIUM",
    "stealth_color": "#FF4500",
    "card_color": "#001a00",
    "border_color": "#228B22",
    "expected": "Detected in ~3 seconds"
  },
  "card_07": {
    "id": "card_07",
    "name": "Night Crawler",
    "emoji": "🐛",
    "tagline": "90 seconds of nothing. Then chaos.",
    "description": "Ultra-slow flow manipulation that stays invisible for 60 seconds before triggering a critical failure.",
    "attack_type": "drift",
    "target_sensor": "FIT101",
    "target_stage": "P1",
    "intensity": 0.2,
    "duration": 90,
    "stealth": "EXTREME",
    "stealth_color": "#8B0000",
    "card_color": "#050510",
    "border_color": "#191970",
    "expected": "Invisible for 60+ seconds"
  },
  "card_08": {
    "id": "card_08",
    "name": "Coordinated Strike",
    "emoji": "🎯",
    "tagline": "All sensors. All at once.",
    "description": "Attacks every sensor in stage P3 simultaneously. Tests whether the GNN catches coordinated attacks.",
    "attack_type": "coordinated",
    "target_sensor": "ALL_P3",
    "target_stage": "P3",
    "intensity": 0.8,
    "duration": 35,
    "stealth": "LOW",
    "stealth_color": "#FF0000",
    "card_color": "#1a0505",
    "border_color": "#FF6347",
    "expected": "GNN detects relationship break"
  },
  "card_09": {
    "id": "card_09",
    "name": "Pressure Drop",
    "emoji": "📉",
    "tagline": "Membrane compromise.",
    "description": "Manipulates RO membrane pressure in stage P5. Risks permanent equipment damage if undetected.",
    "attack_type": "sensor_spoof",
    "target_sensor": "PIT501",
    "target_stage": "P5",
    "intensity": 0.7,
    "duration": 30,
    "stealth": "HIGH",
    "stealth_color": "#9400D3",
    "card_color": "#00001a",
    "border_color": "#00008B",
    "expected": "RO damage risk"
  },
  "card_10": {
    "id": "card_10",
    "name": "The Insider",
    "emoji": "🕵️",
    "tagline": "Someone who knows the plant.",
    "description": "Precise targeted spoof on LIT101 — the signature of an attacker with insider knowledge of the system.",
    "attack_type": "sensor_spoof",
    "target_sensor": "LIT101",
    "target_stage": "P1",
    "intensity": 0.6,
    "duration": 40,
    "stealth": "HIGH",
    "stealth_color": "#9400D3",
    "card_color": "#1a001a",
    "border_color": "#8B008B",
    "expected": "Insider threat pattern"
  },
  "card_11": {
    "id": "card_11",
    "name": "Coordinated P1+P2 Strike",
    "emoji": "🔀",
    "tagline": "LIT101 and FIT101 stopped correlating.",
    "description": "Simultaneous attack on P1 (LIT101) and P2 (FIT101), carefully crafted to bypass single-sensor threshold rules.",
    "attack_type": "coordinated",
    "target_sensor": "LIT101+FIT101",
    "target_stage": "P1+P2",
    "intensity": 0.85,
    "duration": 40,
    "stealth": "EXTREME",
    "stealth_color": "#8B0000",
    "card_color": "#2c0e18",
    "border_color": "#DC143C",
    "expected": "Rule-based systems UNDETECTED"
  }
}

# --- ENDPOINTS ---

@cards_router.get("/api/cards/all")
def get_all_cards():
    return list(CARDS.values())


@cards_router.post("/api/cards/launch/{card_id}")
def launch_card(card_id: str):
    card = CARDS.get(card_id)
    if not card:
        return {"error": "Card not found"}
    
    atype = card["attack_type"]
    duration = card["duration"]
    intensity = card["intensity"]
    target = card["target_sensor"]
    
    # Execute through global simulator instance
    from backend.attacker_terminal import STAGE_SENSORS, simulator, session, AttackRecord
    
    sensors = []
    if atype == "coordinated":
        sensors = STAGE_SENSORS.get(card["target_stage"], ["LIT101"])
        attack_vector = np.random.uniform(0.0, intensity, 51)
        simulator.coordinated_attack(sensors, attack_vector, duration=duration)
    elif atype == "drift":
        sensors = [target]
        drift_rate = 0.01 * intensity
        simulator.drift_attack(target, drift_rate, duration=duration)
    elif atype == "replay":
        sensors = [target]
        replay_start = np.random.randint(0, max(1, simulator.num_rows - duration))
        simulator.replay_attack(replay_start, duration=duration)
    elif atype == "actuator_block":
        sensors = [target]
        simulator.sensor_spoof(target, 0.0, duration=duration)
    elif atype == "cascade":
        # Simulate cascade behavior, essentially random massive disrupt
        sensors = STAGE_SENSORS.get("P1", []) + STAGE_SENSORS.get("P2", [])
        attack_vector = np.random.uniform(0.5, intensity, 51)
        simulator.inject_attack(attack_vector, duration=duration)
    else: # sensor_spoof
        sensors = [target]
        # fake value slightly off to trigger anomaly logic (since intensity goes up to 1.0)
        fake_value = 0.6 + intensity * 0.2
        simulator.sensor_spoof(target, fake_value, duration=duration)

    # Convert everything into session Tracker format so we can track the same way attacker_terminal does
    baseline = simulator.get_next_reading() # fast approximation
    
    record = AttackRecord(
        attack_id=card_id,
        command=card["name"],
        parsed={
            "attack_type": atype,
            "target_sensors": sensors,
            "target_stage": card["target_stage"],
            "duration": duration,
            "intensity": intensity
        },
        launch_time=time.time(),
        duration=duration,
        sensors_affected=sensors,
        baseline_snapshot={s: baseline["sensors"].get(s, 0.0) for s in sensors[:5]},
    )
    session.add(record)

    # Format timestamp matching requirement
    import datetime
    started_at = datetime.datetime.now().strftime("%H:%M:%S")

    return {
      "status": "launched",
      "card_id": card_id,
      "card_name": card["name"],
      "message": f"Attack launched on {target}",
      "watch_for": card["expected"],
      "started_at": started_at
    }


@cards_router.get("/api/cards/status/{card_id}")
def check_card_status(card_id: str):
    from backend.attacker_terminal import simulator, session
    record = session.get(card_id)
    if not record:
        return {"error": "Record not found"}

    elapsed = time.time() - record.launch_time
    is_running = elapsed < record.duration
    avg_deviation = 0.0  # default — updated below if detection logic runs

    if not record.detected:
        reading = simulator.get_next_reading()
        # Heuristic detection logic
        deviation_sum = 0.0
        for sensor in record.sensors_affected[:5]:
            current = reading["sensors"].get(sensor, 0.0)
            baseline_val = record.baseline_snapshot.get(sensor, current)
            deviation_sum += abs(current - baseline_val)

        avg_deviation = deviation_sum / max(len(record.sensors_affected[:5]), 1)

        # Determine detection threshold by stealth level
        card = CARDS.get(card_id)
        threshold = 0.05
        if card:
            stealth = card["stealth"]
            if stealth == "EXTREME": threshold = 0.15
            elif stealth == "HIGH": threshold = 0.10

        if avg_deviation > threshold and elapsed > 2.0:
            record.detected = True
            record.detection_time = round(elapsed, 2)
            record.blindspot_score = round(max(0.0, 10.0 - avg_deviation * 20.0), 1)

    return {
      "card_id": card_id,
      "is_running": is_running,
      "time_elapsed": round(elapsed, 1),
      "time_remaining": max(0, round(record.duration - elapsed, 1)),
      "detected": record.detected,
      "detection_time_seconds": record.detection_time,
      "deviation": round(avg_deviation, 3),
    }


@cards_router.post("/api/cards/stop/{card_id}")
def stop_card(card_id: str):
    from backend.attacker_terminal import simulator, session
    # This is a soft reset. Instead of just fixing the specific sensor (hard in simpy),
    # we just flush the simulator completely because only 1 card will run typically.
    record = session.get(card_id)
    if record:
        record.duration = 0
    simulator._reset_attack()
    return {"status": "stopped"}


@cards_router.post("/api/cards/reset_all")
def reset_all_cards():
    from backend.attacker_terminal import simulator, session
    simulator._reset_attack()
    session.clear()
    return {"status": "reset"}


@cards_router.get("/api/cards/session_summary")
def get_session_summary():
    from backend.attacker_terminal import session
    records = session.all()
    launched = len(records)
    detected = sum(1 for r in records if r.detected)
    undetected = sum(1 for r in records if not r.is_running and not r.detected)
    
    fastest = min([r.detection_time for r in records if r.detected and r.detection_time is not None], default=0.0)
    cards_used = [r.attack_id for r in records]
    
    biggest_blindspot = max(records, key=lambda r: r.blindspot_score, default=None)
    biggest_bs_id = biggest_blindspot.attack_id if biggest_blindspot else ""

    return {
      "total_launched": launched,
      "detected": detected,
      "undetected": undetected,
      "fastest_detection": round(fastest, 2),
      "biggest_blindspot": biggest_bs_id,
      "cards_used": cards_used,
    }
