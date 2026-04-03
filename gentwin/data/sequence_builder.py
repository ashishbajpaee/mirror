"""
sequence_builder.py — Time-Series Sequence Generation
======================================================
Converts flat 2D sensor data into 3D sliding window sequences
for training PyTorch models (LSTM-AE, VAE).

Usage:
    from data.sequence_builder import create_sequences, create_dataloaders
"""

import os
import sys
import numpy as np
import torch
from torch.utils.data import TensorDataset, DataLoader
from sklearn.model_selection import train_test_split

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import WINDOW_SIZE, BATCH_SIZE
from data.data_loader import get_data

_HR = "=" * 65


# ══════════════════════════════════════════════════════════════════════
# 1. SEQUENCE CREATION (Unlabeled — e.g. Normal Data)
# ══════════════════════════════════════════════════════════════════════
def create_sequences(data: np.ndarray, window_size: int, step: int = 1) -> np.ndarray:
    """
    Slide a window over the 2D array to create 3D sequences.

    Parameters
    ----------
    data        : np.ndarray of shape (N, num_features)
    window_size : int, length of each sliding window
    step        : int, number of timesteps to advance between windows

    Returns
    -------
    np.ndarray of shape (num_sequences, window_size, num_features)
    """
    n_samples = data.shape[0]
    sequences = []

    for i in range(0, n_samples - window_size + 1, step):
        window = data[i : i + window_size]
        sequences.append(window)

    return np.array(sequences, dtype=np.float32)


# ══════════════════════════════════════════════════════════════════════
# 2. LABELED SEQUENCE CREATION (e.g. Attack Data)
# ══════════════════════════════════════════════════════════════════════
def create_labeled_sequences(
    data: np.ndarray, 
    labels: np.ndarray, 
    window_size: int, 
    step: int = 1
) -> tuple[np.ndarray, np.ndarray]:
    """
    Create sequences and their corresponding labels.
    A window is labeled 1 (Attack) if ANY timestep inside the window is 1.

    Parameters
    ----------
    data        : np.ndarray of shape (N, num_features)
    labels      : np.ndarray of shape (N,)  (0 or 1)
    window_size : int
    step        : int

    Returns
    -------
    X_seq : np.ndarray of shape (num_sequences, window_size, num_features)
    y_seq : np.ndarray of shape (num_sequences,)  (0 or 1)
    """
    n_samples = data.shape[0]
    sequences = []
    seq_labels = []

    for i in range(0, n_samples - window_size + 1, step):
        # Features window
        window = data[i : i + window_size]
        sequences.append(window)

        # Label window condition (1 if any timestep is an attack)
        label_window = labels[i : i + window_size]
        window_label = 1 if np.any(label_window == 1) else 0
        seq_labels.append(window_label)

    return np.array(sequences, dtype=np.float32), np.array(seq_labels, dtype=np.int32)


# ══════════════════════════════════════════════════════════════════════
# 3. TRAIN-VALIDATION SPLIT
# ══════════════════════════════════════════════════════════════════════
def train_val_split(
    X: np.ndarray, 
    y: np.ndarray, 
    val_ratio: float = 0.15
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Split sequences into train and validation sets, maintaining the 
    attack ratio via stratified split.

    Returns
    -------
    X_train, X_val, y_train, y_val
    """
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, 
        test_size=val_ratio, 
        stratify=y, 
        random_state=42
    )

    return X_train, X_val, y_train, y_val


# ══════════════════════════════════════════════════════════════════════
# 4. DATALOADER CREATION
# ══════════════════════════════════════════════════════════════════════
def create_dataloaders(
    X_train: np.ndarray, 
    X_val: np.ndarray, 
    batch_size: int
) -> tuple[DataLoader, DataLoader]:
    """
    Convert numpy sequences into PyTorch DataLoaders.

    Returns
    -------
    train_loader (shuffle=True), val_loader (shuffle=False)
    """
    # Convert to PyTorch tensors
    X_train_tensor = torch.tensor(X_train, dtype=torch.float32)
    X_val_tensor = torch.tensor(X_val, dtype=torch.float32)

    # Note: For Autoencoders/VAEs, we don't strictly need labels here
    # (they reconstruct the input), so we just wrap the features.
    # The normal PyTorch pattern for this is having the target be the input itself.
    train_dataset = TensorDataset(X_train_tensor, X_train_tensor)
    val_dataset = TensorDataset(X_val_tensor, X_val_tensor)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    return train_loader, val_loader


# ══════════════════════════════════════════════════════════════════════
# 5. FLATTENED SEQUENCE CREATION (e.g. for Simple VAE/MLP)
# ══════════════════════════════════════════════════════════════════════
def get_flat_sequences(data: np.ndarray, window_size: int, step: int = 1) -> np.ndarray:
    """
    Create sequences and immediately flatten them.
    Shape changes from (num_seq, window_size, num_features) to
    (num_seq, window_size * num_features).
    """
    seqs = create_sequences(data, window_size, step)
    num_seq, win_size, num_features = seqs.shape

    # Flatten the last two dimensions
    flat_seqs = seqs.reshape(num_seq, win_size * num_features)
    return flat_seqs


# ══════════════════════════════════════════════════════════════════════
# MAIN TEST BLOCK
# ══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print(f"\n{_HR}")
    print("  SEQUENCE BUILDER — QUICK TEST")
    print(_HR)

    # 1. Load Data
    print("Fetching data from data_loader...")
    X_normal, X_attack, y_normal, y_attack, sensors, actuators, scaler = get_data()

    print(f"\nConfiguration: WINDOW_SIZE = {WINDOW_SIZE}, BATCH_SIZE = {BATCH_SIZE}\n")

    # 2. Build Normal Sequences
    print("Building Normal Sequences...")
    normal_seqs = create_sequences(X_normal, WINDOW_SIZE, step=1)
    
    # Normal data has labels = 0, so we just create a zeros array for splitting test
    y_normal_seqs = np.zeros(normal_seqs.shape[0])
    print(f"  → Normal Sequences Shape : {normal_seqs.shape}")

    # 3. Build Attack Sequences (Labeled)
    print("\nBuilding Labeled Attack Sequences...")
    attack_seqs, attack_seq_labels = create_labeled_sequences(X_attack, y_attack, WINDOW_SIZE, step=1)
    print(f"  → Attack Sequences Shape  : {attack_seqs.shape}")
    print(f"  → Attack Labels Shape     : {attack_seq_labels.shape}")
    print(f"  → Attack Windows Detected : {attack_seq_labels.sum()} / {len(attack_seq_labels)}")

    # 4. Test Train/Val Split (on Attack sequences to verify stratified split)
    print("\nTesting Train/Val Split (Val=0.15)...")
    X_train, X_val, y_train, y_val = train_val_split(attack_seqs, attack_seq_labels, val_ratio=0.15)
    print(f"  → X_train shape: {X_train.shape}  |  y_train shape: {y_train.shape}")
    print(f"  → X_val shape  : {X_val.shape}  |  y_val shape  : {y_val.shape}")
    
    train_ratio = y_train.sum() / len(y_train)
    val_ratio = y_val.sum() / len(y_val)
    print(f"  → Stratified attack ratios: Train={train_ratio:.3f}, Val={val_ratio:.3f}")

    # 5. Dataloader Test
    print("\nTesting DataLoaders...")
    train_loader, val_loader = create_dataloaders(X_train, X_val, BATCH_SIZE)
    print(f"  → Train loader length (batches): {len(train_loader)}")
    print(f"  → Validation loader length     : {len(val_loader)}")
    
    # Grab one batch
    for batch_x, batch_y in train_loader:
        print(f"  → Sample batch shape           : {batch_x.shape}")
        break

    # 6. Flat Sequence Test
    print("\nTesting Flattened Sequences...")
    flat_seqs = get_flat_sequences(X_normal[:1000], WINDOW_SIZE, step=1)
    print(f"  → Flat sequences shape         : {flat_seqs.shape}")

    print(f"\n{_HR}")
    print("  ✅ Sequence Builder Tests Passed Successfully!")
    print(_HR)
