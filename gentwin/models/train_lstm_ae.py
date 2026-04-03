"""
train_lstm_ae.py — LSTM Autoencoder Training Script
=====================================================
Trains the LSTM Autoencoder to learn sequential representations.
"""

import os
import sys
import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import precision_score, recall_score, f1_score
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import joblib
from tqdm import tqdm
import math

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import WINDOW_SIZE, BATCH_SIZE, EPOCHS, DEVICE, MODELS_SAVE_DIR
from data.data_loader import get_data
from data.sequence_builder import create_sequences, create_labeled_sequences, train_val_split, create_dataloaders
from models.lstm_ae import LSTMAE

_HR = "=" * 65

LEARNING_RATE = 1e-3
PATIENCE = 10  # Early stopping patience

def train():
    os.makedirs(MODELS_SAVE_DIR, exist_ok=True)
    
    # ── 1. LOAD AND PREPARE SEQUENCE DATA ────────────────────────────────
    print(f"\n{_HR}")
    print("  1 / 4 — SEQUENCE PREPARATION (LSTM-AE)")
    print(_HR)
    
    X_normal, X_attack, y_normal, y_attack, _, _, _ = get_data()
    
    print("Building 3D Window Sequences...")
    normal_seqs = create_sequences(X_normal, WINDOW_SIZE)
    attack_seqs, attack_seq_labels = create_labeled_sequences(X_attack, y_attack, WINDOW_SIZE)
    
    normal_labels = np.zeros(normal_seqs.shape[0])
    
    print(f"  Normal sequences: {normal_seqs.shape}")
    print(f"  Attack sequences: {attack_seqs.shape}")
    
    input_dim = normal_seqs.shape[2]  # 51 sensors
    
    # Validation split
    X_train, X_val, _, _ = train_val_split(normal_seqs, normal_labels, val_ratio=0.15)
    train_loader, val_loader = create_dataloaders(X_train, X_val, BATCH_SIZE)
    
    # ── 2. INITIALIZE MODEL & LOSS ───────────────────────────────────────
    print(f"\n{_HR}")
    print("  2 / 4 — MODEL INITIALIZATION")
    print(_HR)
    
    model = LSTMAE(input_dim=input_dim, hidden_dim=128, bottleneck_dim=64).to(DEVICE)
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    criterion = nn.MSELoss(reduction='mean')
    
    print(f"  Model            : LSTM-AE")
    print(f"  Input features   : {input_dim}")
    print(f"  Window Size      : {WINDOW_SIZE}")
    print(f"  Device           : {DEVICE}")
    print(f"  Trainable Params : {sum(p.numel() for p in model.parameters() if p.requires_grad):,}")
    
    # ── 3. TRAINING LOOP WITH EARLY STOPPING ─────────────────────────────
    print(f"\n{_HR}")
    print(f"  3 / 4 — TRAINING (Patience = {PATIENCE})")
    print(_HR)
    
    train_losses = []
    val_losses = []
    best_val_loss = float('inf')
    epochs_no_improve = 0
    best_model_path = os.path.join(MODELS_SAVE_DIR, "lstm_ae_best.pth")
    
    # Temporary override for testing -- replaced if real test
    actual_epochs = EPOCHS
    
    for epoch in range(1, actual_epochs + 1):
        model.train()
        epoch_train_loss = 0.0
        
        train_pbar = tqdm(train_loader, desc=f"  Epoch {epoch:02d}/{actual_epochs} [Train]", leave=False, dynamic_ncols=True)
        for batch_x, _ in train_pbar:
            batch_x = batch_x.to(DEVICE)
            
            optimizer.zero_grad()
            reconstruction = model(batch_x)
            loss = criterion(reconstruction, batch_x)
            loss.backward()
            
            # Gradient clipping to prevent exploding gradients in LSTM
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            
            optimizer.step()
            epoch_train_loss += loss.item()
            train_pbar.set_postfix({"Loss": f"{loss.item():.5f}"})
            
        avg_train_loss = epoch_train_loss / len(train_loader)
        train_losses.append(avg_train_loss)
        
        # Validation
        model.eval()
        epoch_val_loss = 0.0
        with torch.no_grad():
            for batch_x, _ in val_loader:
                batch_x = batch_x.to(DEVICE)
                reconstruction = model(batch_x)
                loss = criterion(reconstruction, batch_x)
                epoch_val_loss += loss.item()
                
        avg_val_loss = epoch_val_loss / len(val_loader)
        val_losses.append(avg_val_loss)
        
        # Early Stopping Logic
        saved_str = ""
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            epochs_no_improve = 0
            torch.save(model.state_dict(), best_model_path)
            saved_str = " (Saved best model)"
        else:
            epochs_no_improve += 1
            
        print(f"  Epoch {epoch:02d}/{actual_epochs}  |  Train Loss: {avg_train_loss:.6f}  |  Val Loss: {avg_val_loss:.6f}{saved_str}")
        
        if epochs_no_improve >= PATIENCE:
            print(f"  Early stopping triggered after {epoch} epochs.")
            break

    # Plot Loss Curves
    plt.figure(figsize=(10, 6))
    plt.plot(range(1, len(train_losses) + 1), train_losses, label="Train Loss", color="blue")
    plt.plot(range(1, len(val_losses) + 1), val_losses, label="Validation Loss", color="red")
    plt.xlabel("Epoch")
    plt.ylabel("MSE Loss")
    plt.title("LSTM-AE Training & Validation Loss")
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.6)
    
    loss_plot_path = os.path.join(MODELS_SAVE_DIR, "lstm_ae_loss.png")
    plt.savefig(loss_plot_path, dpi=150)
    plt.close()
    print(f"  ✅  Saved loss plot → {loss_plot_path}")

    # ── 4. EVALUATION, TIMING & THRESHOLDING ─────────────────────────────
    print(f"\n{_HR}")
    print("  4 / 4 — EVALUATION & ATTACK TIMING")
    print(_HR)
    
    model.load_state_dict(torch.load(best_model_path, map_location=DEVICE))
    model.eval()
    
    # 4A. Find Optimal Threshold (95th percentile on validation)
    val_normal_tensor = torch.tensor(X_val, dtype=torch.float32).to(DEVICE)
    with torch.no_grad():
        normal_scores = model.anomaly_score(val_normal_tensor).cpu().numpy()
        
    threshold = np.percentile(normal_scores, 95)
    print(f"  Computed Threshold (95th percentile) : {threshold:.6f}")
    
    joblib.dump(threshold, os.path.join(MODELS_SAVE_DIR, "lstm_threshold.pkl"))
    
    # 4B. Global Detection Metrics on Attack Data
    attack_tensor = torch.tensor(attack_seqs, dtype=torch.float32).to(DEVICE)
    attack_scores = []
    
    with torch.no_grad():
        for i in range(0, len(attack_tensor), BATCH_SIZE):
            batch = attack_tensor[i:i+BATCH_SIZE]
            scores = model.anomaly_score(batch).cpu().numpy()
            attack_scores.extend(scores)
    attack_scores = np.array(attack_scores)
    
    predictions = (attack_scores > threshold).astype(int)
    f1 = f1_score(attack_seq_labels, predictions, zero_division=0)
    print(f"  F1-Score on attack detection         : {f1:.4f}")
    
    # 4C. Per-Timestep Error Analysis
    print("  Computing precise attack timing dynamics...")
    all_timestep_errors = []
    
    # Compute the timestep errors for all attack windows
    with torch.no_grad():
        for i in range(0, len(attack_tensor), BATCH_SIZE):
            batch = attack_tensor[i:i+BATCH_SIZE]
            ts_err = model.timestep_error(batch).cpu().numpy()
            all_timestep_errors.append(ts_err)
            
    # shape: (num_attack_sequences, window_size)
    all_timestep_errors = np.concatenate(all_timestep_errors, axis=0) 
    
    # Separate purely normal windows vs True Positive attack windows
    tp_windows = all_timestep_errors[(attack_seq_labels == 1) & (predictions == 1)]
    normal_windows = all_timestep_errors[(attack_seq_labels == 0) & (predictions == 0)]
    
    plt.figure(figsize=(12, 6))
    
    if len(normal_windows) > 0:
        plt.plot(np.mean(normal_windows, axis=0), label='Normal Windows Mean', color='blue', linewidth=2)
        
    if len(tp_windows) > 0:
        plt.plot(np.mean(tp_windows, axis=0), label='Attack Windows Mean', color='red', linewidth=3)
        # Highlight regions standard deviation
        std_tp = np.std(tp_windows, axis=0)
        mean_tp = np.mean(tp_windows, axis=0)
        plt.fill_between(range(WINDOW_SIZE), mean_tp - std_tp*0.5, mean_tp + std_tp*0.5, color='red', alpha=0.1)

    plt.title("LSTM Reconstruction Error Across Sequence Timesteps (Attack Timing Profile)")
    plt.xlabel("Timestep within Window")
    plt.ylabel("MSE Reconstruction Error")
    plt.legend()
    plt.grid(True, linestyle="--", alpha=0.5)
    
    timing_plot_path = os.path.join(MODELS_SAVE_DIR, "lstm_attack_timing.png")
    plt.savefig(timing_plot_path, dpi=150)
    plt.close()
    print(f"  ✅  Saved attack timing profile → {timing_plot_path}")
    
    print(f"\n{_HR}")
    print("  ✅ LSTM-AE Training & Evaluation Complete!")
    print(_HR)

if __name__ == "__main__":
    train()
