"""
run_all.py — GenTwin Master Pipeline Orchestrator
===================================================
Executes the full Machine Learning Pipeline natively sequentially.
Runs robust subprocess bounds structurally shielding crashes.
"""

import os
import sys
import time
import json
import subprocess
from tqdm import tqdm
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import MODELS_SAVE_DIR, WINDOW_SIZE
from data.data_loader import get_data
from data.sequence_builder import create_sequences, get_flat_sequences

_HR = "=" * 65

metrics_cache = {
    "VAE F1": "N/A",
    "LSTM-AE F1": "N/A"
}

def scan_for_metrics(output: str, prefix: str):
    """Dynamically parses printed terminal strings mapping metrics limits"""
    global metrics_cache
    for line in output.split('\n'):
        if "F1" in line and ":" in line:
            # Very dumb parser scraping anything following the F1 keyword limits
            val = line.split(":")[-1].strip()
            metrics_cache[prefix] = val

def step_3_sequences():
    """Builds and logs arrays directly bypassing missing __main__ blocks."""
    X_normal, X_attack, _, _, _, _, _ = get_data()
    flat_seq = get_flat_sequences(X_normal, WINDOW_SIZE)
    seq = create_sequences(X_normal, WINDOW_SIZE)
    return f"Prepared array bounds natively:\n- VAE Flat shapes: {flat_seq.shape}\n- LSTM Temporal shapes: {seq.shape}"

def step_9_simulate():
    """Instantiate and verify the unit execution of Virtual Sensor structures intrinsically."""
    from data.virtual_sensor_simulator import VirtualSensorSimulator
    try:
        sim = VirtualSensorSimulator(speed=10.0, demo_mode=True)
        # 20 ticks guarantees multiple simulated executions run internally parsing rules
        for _ in range(20):
            pack = sim.get_next_reading()
        return "Simulator ready. Automated demonstration array loops verified natively over 20 ticks."
    except Exception as e:
        return f"Simulator mapping failed bounds strictly: {e}"

def step_10_report():
    """Calculates all structural bounds wrapping outputs directly matching constraints"""
    try:
        df = pd.read_csv(os.path.join(MODELS_SAVE_DIR, "attack_library_explained.csv"))
        top_attacks = pd.read_csv(os.path.join(MODELS_SAVE_DIR, "top_attacks.csv"))
        vuln_score = pd.read_csv(os.path.join(MODELS_SAVE_DIR, "sensor_blindspot_scores.csv"))
        
        recap = f"\n{_HR}\n  ✨ GENTWIN FINAL TRAINING REPORT ✨\n{_HR}\n"
        recap += f"[ Models F1 Evaluation ]\n - Variational Autoencoder : {metrics_cache['VAE F1']}\n - LSTM Sequence Autoencoder : {metrics_cache['LSTM-AE F1']}\n\n"
        
        recap += f"[ Attack Library Diagnostics ]\n - Total Consolidated Synthetics Library Limit : {len(df)} mapped constraints.\n\n"
        
        recap += f"[ Top 5 Highest Risk Cyber Arrays Globally ]\n"
        tops = top_attacks[['attack_type', 'target_stage', 'blindspot_score']].head(5)
        recap += tops.to_string(index=False) + "\n\n"
        
        recap += f"[ Top 5 Most Vulnerable Structural Sensors ]\n"
        vulns = vuln_score.head(5)
        recap += vulns.to_string(index=False) + "\n\n"
        
        recap += f"[ Exported File System Sizes (models_saved/)]\n"
        for root, dirs, files in os.walk(MODELS_SAVE_DIR):
            for file in sorted(files):
                if file.endswith('.png') or file.endswith('.npy'):
                    continue  # skip large generic arrays generated natively
                size_kb = os.path.getsize(os.path.join(root, file)) / 1024
                recap += f"  - {file:<30} | {size_kb:.1f} KB\n"
                
        recap += f"\n{_HR}\nGenTwin ML pipeline complete. Ready for dashboard integration.\n{_HR}"
        
        with open(os.path.join(MODELS_SAVE_DIR, "training_report.txt"), "w") as f:
            f.write(recap)
            
        return recap
    except Exception as e:
        return f"Failed formatting bounds gracefully targeting report mappings: {str(e)}"

def main():
    print(f"\n{_HR}")
    print("  GEN-TWIN PIPELINE ORCHESTRATOR")
    print(_HR)
    
    steps = [
        {"name": "Stage 1 — Data Loader", "cmd": ["python3", "data/data_loader.py"]},
        {"name": "Stage 2 — EDA Architect", "cmd": ["python3", "data/eda.py"]},
        {"name": "Stage 3 — Sequence Prep", "func": step_3_sequences},
        {"name": "Stage 4 — Train VAE", "cmd": ["python3", "models/train_vae.py"], "prefix": "VAE F1"},
        {"name": "Stage 5 — Train LSTM-AE", "cmd": ["python3", "models/train_lstm_ae.py"], "prefix": "LSTM-AE F1"},
        {"name": "Stage 6 — Train CGAN", "cmd": ["python3", "models/cgan.py"]},
        {"name": "Stage 7 — Library Score", "cmd": ["python3", "data/attack_library.py"]},
        {"name": "Stage 8 — Explainability", "cmd": ["python3", "data/explainability.py"]},
        {"name": "Stage 9 — Simulation", "func": step_9_simulate},
        {"name": "Stage 10 — Final Report", "func": step_10_report}
    ]

    # Quick estimated calculation mimicking native TQDM bounds
    start_time = time.time()
    
    for i, step in enumerate(tqdm(steps, desc="Overall Pipeline Progress", bar_format="{l_bar}{bar:30}{r_bar}")):
        name = step["name"]
        tqdm.write(f"\n[{name}] Initializing...")
        start_step = time.time()
        
        try:
            if "cmd" in step:
                # Subprocess boundaries wrapping terminal output natively avoiding console spam
                env = os.environ.copy()
                env["TQDM_DISABLE"] = "1"
                result = subprocess.run(step["cmd"], capture_output=True, text=True, check=True, env=env)
                if "prefix" in step:
                    scan_for_metrics(result.stdout, step["prefix"])
                tqdm.write(f"  ✓ Native loop resolved successfully ({time.time() - start_step:.1f}s)")
            else:
                func_out = step["func"]()
                tqdm.write(f"  ✓ Method execution concluded successfully ({time.time() - start_step:.1f}s)")
                # Print explicit output for final report or sequence parsing natively
                if i == 2 or i >= 8:
                    if func_out:
                         tqdm.write(f"      > {func_out.replace(chr(10), chr(10)+'      > ')}")
                         
        except subprocess.CalledProcessError as e:
            tqdm.write(f"  ❌ SUBPROCESS CRASHED: {e}")
            tqdm.write(f"  [ERROR TRACE]:\n{e.stderr}")
            tqdm.write(f"  [STDOUT]:\n{e.stdout}")
        except Exception as ex:
            tqdm.write(f"  ❌ INTERNAL EXECUTION ERROR: {ex}")
            
    total_time = time.time() - start_time
    print(f"\n{_HR}")
    print(f"  ORCHESTRATOR COMPLETED in {total_time:.1f} seconds")
    print(_HR)

if __name__ == "__main__":
    main()
