"""
virtual_sensor_simulator.py — Real-Time SWaT Plant Digital Twin
================================================================
Acts as the live hardware streaming interface. Replays the dataset
chronologically with injected generative noise mimicking actual sensors.
Supports completely seamless, dynamically blended cyber attack injections. 
"""

import os
import sys
import time
import datetime
import logging
import numpy as np
import pandas as pd
import threading
import json
import traceback

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import SENSOR_NAMES, MODELS_SAVE_DIR
from data.data_loader import get_data

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class VirtualSensorSimulator:
    def __init__(self, speed: float = 1.0, demo_mode: bool = False):
        self.speed = speed
        self.demo_mode = demo_mode
        self.current_idx = 0
        
        # Load Operational Data
        logger.info("Initializing Virtual Sensor Arrays (Downloading native baseline dataset...)")
        try:
            X_normal, _, _, _, _, _, _ = get_data()
            self.dataset = X_normal
            self.num_rows = len(self.dataset)
            logger.info(f"Loaded {self.num_rows} records representing base network state.")
        except Exception as e:
            logger.error(f"Critical Failure loading physical topology mappings. Defaulting to safe zeroed flat configuration. Error: {e}")
            self.dataset = np.zeros((1000, 51))
            self.num_rows = 1000
            
        # Internal State Dynamics
        self.state_lock = threading.Lock()
        self._reset_attack()
        
        # Demo Automation Schedules
        self.start_time = time.time()
        self.demo_schedule = [
            # Schedule triggers: (activation_time_sec, method, (*args))
            (10,  "sensor_spoof", ("FIT101", 0.05, 15)),
            (35,  "drift_attack", ("LIT101", 0.03, 30)),
            (75,  "cascade_trigger", ("P1",)),
            (115, "replay_attack", (10000, 20)),
            (145, "cascade_trigger", ("P4",))
        ]
        
        # Pre-load top attacks for cascade trigger routing
        try:
            attack_path = os.path.join(MODELS_SAVE_DIR, "top_attacks.csv")
            if os.path.exists(attack_path):
                self.top_attacks_df = pd.read_csv(attack_path)
            else:
                self.top_attacks_df = None
        except Exception as e:
            logger.error(f"Failed to load compiled attack profiles. Cascade triggers might yield null. {e}")
            self.top_attacks_df = None

    def _reset_attack(self):
        """Safely resets the physical topological state back to Normal Operational bounds."""
        with self.state_lock:
            self.state = {
                "is_under_attack": False,
                "attack_type": None,
                "attack_start_time": None,
                "duration": 0,
                "attack_vector": None,
                "sensor_list": None,
                "sensor_target": None,
                "fake_value": None,
                "drift_rate": None,
                "replay_start_idx": None
            }

    # ── ATTACK INJECTION INTERFACES ──────────────────────────────────────
            
    def _execute_attack_transition(self, type_name: str, duration: int, **args):
        try:
            with self.state_lock:
                self.state["is_under_attack"] = True
                self.state["attack_type"] = type_name
                self.state["duration"] = duration
                self.state["attack_start_time"] = time.time()
                for k, v in args.items():
                    self.state[k] = v
            logger.warning(f"🚨 [CYBER EVENT INITIATED] Type: '{type_name}' deployed overriding native physical protocols for {duration}s.")
        except Exception as e:
            logger.error(f"Failed to cleanly deploy cyber weapon interface. Reverting network. Error: {e}")
            self._reset_attack()

    def inject_attack(self, attack_vector: np.ndarray, duration: int = 30):
        """Standard pipeline: blends raw 51-dim arrays cleanly over native variables."""
        if len(attack_vector) != 51:
            logger.error(f"Invalid Attack Architecture dimensionality. Sent: {len(attack_vector)}, Required: 51")
            return
        self._execute_attack_transition("inject_attack", duration, attack_vector=attack_vector)

    def sensor_spoof(self, sensor_name: str, fake_value: float, duration: int = 30):
        """Hard override clamping a single physical terminal to a false reading."""
        if sensor_name not in SENSOR_NAMES:
            logger.error(f"Unrecognized sensor requested for spoofing: {sensor_name}")
            return
        self._execute_attack_transition("sensor_spoof", duration, sensor_target=sensor_name, fake_value=fake_value)

    def replay_attack(self, start_idx: int, duration: int = 30):
        """Mimic historical normal states (Replaying loops hiding actual changes)."""
        valid_idx = min(max(start_idx, 0), self.num_rows - 1 - duration)
        self._execute_attack_transition("replay_attack", duration, replay_start_idx=valid_idx)

    def drift_attack(self, sensor_name: str, drift_rate: float, duration: int = 30):
        """The 'Silent' attacker: Incrementing physical readings slowly to avoid detection."""
        if sensor_name not in SENSOR_NAMES:
            logger.error(f"Unrecognized sensor requested for drift: {sensor_name}")
            return
        self._execute_attack_transition("drift_attack", duration, sensor_target=sensor_name, drift_rate=drift_rate)

    def coordinated_attack(self, sensor_list: list, attack_vector: np.ndarray, duration: int = 30):
        """Multi-vector targeted assault bypassing isolated protections."""
        self._execute_attack_transition("coordinated_attack", duration, sensor_list=sensor_list, attack_vector=attack_vector)

    def cascade_trigger(self, stage: str, duration: int = 30):
        """Intelligently load the highest 'blindspot' attack mapped against the requested operational plant stage."""
        if self.top_attacks_df is not None:
            # Filter specifically by the requested operational stage target
            subset = self.top_attacks_df[self.top_attacks_df['target_stage'] == stage]
            if not subset.empty:
                # Top element (already sorted by blindspot_score internally)
                target = subset.iloc[0]
                vec_str = target['sensor_values']
                try: 
                    # Convert string list back to numpy array safely
                    att_vec = np.array(json.loads(vec_str))
                    self.inject_attack(att_vec, duration=duration)
                    logger.info(f"Loaded Attack ID: {target['attack_id']} (Blindspot Score: {target['blindspot_score']:.2f})")
                    return
                except:
                    logger.error("Failed to parse vector array natively from internal attack CSV log maps.")
            else:
                 logger.warning(f"No ranked attacks explicitly targeting stage {stage} in top 50 log bounds.")
        
        # Fallback if the database parsing fails: random uniform generation
        logger.warning(f"Falling back to basic unoptimized uniform noise injection mapping on {stage}")
        self.inject_attack(np.random.uniform(0, 1, 51), duration=duration)

    # ── REAL-TIME FETCHING & TIMING ──────────────────────────────────────

    def get_next_reading(self) -> dict:
        """
        Calculates and streams exactly one real-time physical representation packet.
        Internally scales blend architectures linearly mapped over the 5-sec buffer constraint.
        """
        # Baseline Organic State Fetching
        true_values_array = self.dataset[self.current_idx]
        
        # Adding Gaussian noise to mimic genuine temporal distribution mapping. (Live, non-repetitive profiles)
        noise = np.random.normal(0, 0.02, size=51)
        base_values = np.clip(true_values_array + noise, 0.0, 1.0)
        
        true_values_dict = {SENSOR_NAMES[i]: float(true_values_array[i]) for i in range(51)}
        sensor_dict = {SENSOR_NAMES[i]: float(base_values[i]) for i in range(51)}
        
        current_time = datetime.datetime.now().isoformat()
        
        # Demo Automation Checker
        if self.demo_mode and not self.state["is_under_attack"]:
            elapsed_demo = time.time() - self.start_time
            if self.demo_schedule and elapsed_demo >= self.demo_schedule[0][0]:
                _, func_name, args = self.demo_schedule.pop(0)
                logger.info(f"[DEMO TRIGGER]: Automating sequence {func_name}{args}")
                try:
                    getattr(self, func_name)(*args)
                except Exception as e:
                    logger.error(f"Failed to auto-execute step {func_name}: {e}")

        # Manipulate organic boundaries based on Live Attack State Variables globally 
        with self.state_lock:
            if self.state["is_under_attack"]:
                elapsed = time.time() - self.state["attack_start_time"]
                
                # Check bounding limits
                if elapsed > self.state["duration"]:
                    logger.info("Attack duration expired organically. Real-time controls restoring to baseline native states.")
                    self._reset_attack()
                else:
                    # Blend factor scaling (0 to 1 over precisely 5 seconds preventing detection of un-natural gradient jumps)
                    blend_factor = min(1.0, elapsed / 5.0)
                    atype = self.state["attack_type"]
                    
                    try:
                        if atype in ["inject_attack", "cascade_trigger"]:
                            vec = self.state["attack_vector"]
                            for i, name in enumerate(SENSOR_NAMES):
                                sensor_dict[name] = float((1.0 - blend_factor) * sensor_dict[name] + blend_factor * vec[i])
                                
                        elif atype == "sensor_spoof":
                            targ = self.state["sensor_target"]
                            val = self.state["fake_value"]
                            sensor_dict[targ] = float((1.0 - blend_factor) * sensor_dict[targ] + blend_factor * val)
                            
                        elif atype == "replay_attack":
                            # Stream out previous historical chronological states natively scaled by speed timing logic
                            old_idx = (self.state["replay_start_idx"] + int(elapsed * self.speed)) % self.num_rows
                            old_vals = self.dataset[old_idx]
                            for i, name in enumerate(SENSOR_NAMES):
                                sensor_dict[name] = float(old_vals[i])
                                
                        elif atype == "drift_attack":
                            targ = self.state["sensor_target"]
                            dr = self.state["drift_rate"]
                            sensor_dict[targ] += float(dr * elapsed)
                            
                        elif atype == "coordinated_attack":
                            sens_list = self.state["sensor_list"]
                            vec = self.state["attack_vector"]
                            for sens in sens_list:
                                if sens in SENSOR_NAMES:
                                    idx = SENSOR_NAMES.index(sens)
                                    sensor_dict[sens] = float((1.0 - blend_factor) * sensor_dict[sens] + blend_factor * vec[idx])
                    
                    except Exception as e:
                        logger.error(f"Unexpected mathematical execution failure mapping cyber arrays over {atype}: {e}")
                        traceback.print_exc()
                        self._reset_attack()

        # Enforce hard boundaries
        for k in sensor_dict:
            sensor_dict[k] = float(np.clip(sensor_dict[k], 0.0, 1.0))

        # Format standardized deployment output log JSON map
        packet = {
            "timestamp": current_time,
            "sensors": sensor_dict,
            "is_attack": self.state["is_under_attack"],
            "attack_type": self.state["attack_type"],
            "true_values": true_values_dict
        }

        # Step iterators natively mapped via chronological timing speeds
        self.current_idx = (self.current_idx + 1) % self.num_rows
        # Throttle to simulate natively actual timing bounds mapping physically 
        # (A dashboard or orchestrator would fetch this actively, but sleep governs the fetch-cycle internally preventing overflow limits logically)
        
        return packet

# Quick verification test block ensuring runtime mapping
if __name__ == "__main__":
    logger.info("Initializing Unit Test Simulation Architecture")
    sim = VirtualSensorSimulator(speed=10.0, demo_mode=True)
    
    # Run test cycle
    for i in range(15):
        pack = sim.get_next_reading()
        atk = pack['is_attack']
        typ = pack['attack_type']
        
        diff = []
        if atk:
            # Display any significantly modified sensor readings mapping mathematically against true physical equivalents
            for s, v in pack['sensors'].items():
                t = pack['true_values'][s]
                if abs(v - t) > 0.05:
                    diff.append(f"{s}: {t:.2f}→{v:.2f}")
                    
        print(f"Time {i+1} | Attack? {atk} ({typ}) | Variations? {', '.join(diff[:3])}...")
        time.sleep(0.1)
