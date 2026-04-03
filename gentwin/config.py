"""
config.py — Global Constants for GenTwin
=========================================
Central configuration for the GenTwin cybersecurity AI system.
Import from anywhere:  `from config import *`  or  `import config`
"""

import torch

# ==============================================================================
# Random Seed (reproducibility)
# ==============================================================================
RANDOM_SEED = 42

# ==============================================================================
# Device Configuration
# ==============================================================================
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ==============================================================================
# File Paths
# ==============================================================================
NORMAL_CSV_PATH  = "data_files/SWaT_Normal.csv"
ATTACK_CSV_PATH  = "data_files/SWaT_Attack.csv"
MODELS_SAVE_DIR  = "models_saved/"

# ==============================================================================
# Special Column Names
# ==============================================================================
TIMESTAMP_COL    = "Timestamp"
ATTACK_LABEL_COL = "Normal/Attack"

# ==============================================================================
# SWaT Sensor & Actuator Names (51 total)
# ==============================================================================
# Process 1 — Raw water supply
P1_SENSORS = [
    "FIT101",   # Flow meter
    "LIT101",   # Level indicator
    "MV101",    # Motorised valve
    "P101",     # Pump
    "P102",     # Pump (backup)
]

# Process 2 — Chemical dosing
P2_SENSORS = [
    "AIT201",   # Analyser (conductivity)
    "AIT202",   # Analyser (pH)
    "AIT203",   # Analyser (ORP)
    "FIT201",   # Flow meter
    "MV201",    # Motorised valve
    "P201",     # Dosing pump
    "P202",     # Dosing pump
    "P203",     # Dosing pump
    "P204",     # Dosing pump
    "P205",     # Dosing pump
    "P206",     # Dosing pump
]

# Process 3 — Ultra-filtration
P3_SENSORS = [
    "DPIT301",  # Differential pressure
    "FIT301",   # Flow meter
    "LIT301",   # Level indicator
    "MV301",    # Motorised valve
    "MV302",    # Motorised valve
    "MV303",    # Motorised valve
    "MV304",    # Motorised valve
    "P301",     # UF feed pump
    "P302",     # UF feed pump (backup)
]

# Process 4 — De-chlorination (RO feed)
P4_SENSORS = [
    "AIT401",   # Analyser (hardness)
    "AIT402",   # Analyser (ORP)
    "FIT401",   # Flow meter
    "LIT401",   # Level indicator
    "P401",     # RO feed pump
    "P402",     # RO feed pump (backup)
    "P403",     # Sodium bisulphite dosing pump
    "P404",     # Sodium bisulphite dosing pump (backup)
    "UV401",    # UV dechlorinator
]

# Process 5 — Reverse osmosis
P5_SENSORS = [
    "AIT501",   # Analyser (RO feed conductivity)
    "AIT502",   # Analyser (RO permeate conductivity)
    "AIT503",   # Analyser (RO feed ORP)
    "AIT504",   # Analyser (RO feed pH)
    "FIT501",   # Flow meter (RO feed)
    "FIT502",   # Flow meter (RO permeate)
    "FIT503",   # Flow meter (RO reject)
    "FIT504",   # Flow meter (recirculation)
    "P501",     # RO high-pressure pump
    "P502",     # RO high-pressure pump (backup)
    "PIT501",   # Pressure indicator (RO feed)
    "PIT502",   # Pressure indicator (RO membrane)
    "PIT503",   # Pressure indicator (RO permeate)
]

# Process 6 — UF backwash / product water
P6_SENSORS = [
    "FIT601",   # Flow meter
    "P601",     # Backwash pump
    "P602",     # Backwash pump (backup)
    "P603",     # Product water pump
]

# ---- Combined list (order matters — keep consistent) ----
SENSOR_NAMES = (
    P1_SENSORS
    + P2_SENSORS
    + P3_SENSORS
    + P4_SENSORS
    + P5_SENSORS
    + P6_SENSORS
)

assert len(SENSOR_NAMES) == 51, (
    f"Expected 51 sensor/actuator names, got {len(SENSOR_NAMES)}"
)

# ==============================================================================
# Binary Actuators (subset of the 51 — used by the dummy-data generator
# to assign 0/1 values instead of continuous floats)
# ==============================================================================
BINARY_ACTUATORS = [
    "MV101",
    "P101", "P102",
    "MV201",
    "P201", "P202", "P203", "P204", "P205", "P206",
    "MV301", "MV302", "MV303", "MV304",
    "P301", "P302",
    "P401", "P402", "P403", "P404",
    "UV401",
    "P501", "P502",
    "P601", "P602", "P603",
]

# ==============================================================================
# Model Hyperparameters
# ==============================================================================
WINDOW_SIZE = 60        # Sliding-window length (time steps)
LATENT_DIM  = 16        # VAE / AE latent dimension
BATCH_SIZE  = 64        # Mini-batch size
EPOCHS      = 50        # Training epochs
LEARNING_RATE = 1e-3    # Default optimizer LR

# ==============================================================================
# Dummy Data Settings (used when real CSVs are absent)
# ==============================================================================
DUMMY_NORMAL_ROWS = 50_000
DUMMY_ATTACK_ROWS = 20_000
DUMMY_ATTACK_RATIO = 0.30   # 30 % of attack-set rows labelled as attack
