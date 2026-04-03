"""
train_vae.py — VAE Training Script
====================================
Trains the Variational Autoencoder on normal data sequences.
Evaluates on both normal and attack data to find anomaly threshold.

Usage:
    python models/train_vae.py
"""

import os
import sys
import numpy as np
import torch
from torch.utils.data import TensorDataset, DataLoader
from sklearn.metrics import precision_score, recall_score, f1_score
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import joblib
from tqdm import tqdm

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import WINDOW_SIZE, LATENT_DIM, BATCH_SIZE, EPOCHS, DEVICE, MODELS_SAVE_DIR
from data.data_loader import get_data
from data.sequence_builder import train_val_split, create_dataloaders, get_flat_sequences
from models.vae import VAE, vae_loss_function

_HR = "=" * 65

# Configuration overrides for VAE
LEARNING_RATE = 1e-3
WARMUP_EPOCHS = 10

def train():
    os.makedirs(MODELS_SAVE_DIR, exist_ok=True)
    
    # ── 1. LOAD AND PREPARE DATA ─────────────────────────────────────────
    print(f"\n{_HR}")
    print("  1 / 4 — DATA PREPARATION (VAE)")
    print(_HR)
    
    # Load standardized data
    X_normal, X_attack, y_normal, y_attack, _, _, _ = get_data()
    
    # We use flat sequences since our VAE uses Linear layers
    print("Generating flattened sequences...")
    normal_seqs = get_flat_sequences(X_normal, WINDOW_SIZE)
    attack_seqs = get_flat_sequences(X_attack, WINDOW_SIZE)
    
    # For attack, we also need the window-level labels 
    # Use create_labeled_sequences logic to get window labels
    from data.sequence_builder import create_labeled_sequences
    _, attack_labels = create_labeled_sequences(X_attack, y_attack, WINDOW_SIZE)
    
    # Normal data has label 0
    normal_labels = np.zeros(normal_seqs.shape[0])
    
    print(f"  Normal sequences: {normal_seqs.shape}")
    print(f"  Attack sequences: {attack_seqs.shape}")
    
    input_dim = normal_seqs.shape[1]  # WINDOW_SIZE * 51
    
    # Split normal data for training the VAE
    X_train, X_val, y_train, y_val = train_val_split(normal_seqs, normal_labels, val_ratio=0.15)
    train_loader, val_loader = create_dataloaders(X_train, X_val, BATCH_SIZE)
    
    # ── 2. INITIALIZE MODEL ──────────────────────────────────────────────
    print(f"\n{_HR}")
    print("  2 / 4 — MODEL INITIALIZATION")
    print(_HR)
    
    model = VAE(input_dim=input_dim, latent_dim=LATENT_DIM).to(DEVICE)
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    
    print(f"  Model            : VAE")
    print(f"  Input Dim        : {input_dim}")
    print(f"  Latent Dim       : {LATENT_DIM}")
    print(f"  Device           : {DEVICE}")
    print(f"  Trainable Params : {sum(p.numel() for p in model.parameters() if p.requires_grad):,}")
    
    # ── 3. TRAINING LOOP ─────────────────────────────────────────────────
    print(f"\n{_HR}")
    print(f"  3 / 4 — TRAINING (Beta Warmup: 0→1 over {WARMUP_EPOCHS} epochs)")
    print(_HR)
    
    train_losses = []
    val_losses = []
    best_val_loss = float('inf')
    best_model_path = os.path.join(MODELS_SAVE_DIR, "vae_best.pth")
    
    for epoch in range(1, EPOCHS + 1):
        model.train()
        epoch_train_loss = 0.0
        
        # Calculate beta for KL warmup to prevent posterior collapse
        beta = min(1.0, epoch / WARMUP_EPOCHS)
        
        train_pbar = tqdm(train_loader, desc=f"  Epoch {epoch:02d}/{EPOCHS} [Train]", leave=False, dynamic_ncols=True)
        for batch_x, _ in train_pbar:
            batch_x = batch_x.to(DEVICE)
            
            optimizer.zero_grad()
            reconstruction, mu, log_var = model(batch_x)
            
            loss, mse, kl = vae_loss_function(reconstruction, batch_x, mu, log_var, beta)
            loss.backward()
            optimizer.step()
            
            epoch_train_loss += loss.item()
            train_pbar.set_postfix({"Loss": f"{loss.item():.4f}", "MSE": f"{mse.item():.4f}", "KL": f"{kl.item():.4f}"})
            
        avg_train_loss = epoch_train_loss / len(train_loader)
        train_losses.append(avg_train_loss)
        
        # Validation
        model.eval()
        epoch_val_loss = 0.0
        with torch.no_grad():
            for batch_x, _ in val_loader:
                batch_x = batch_x.to(DEVICE)
                reconstruction, mu, log_var = model(batch_x)
                loss, _, _ = vae_loss_function(reconstruction, batch_x, mu, log_var, beta)
                epoch_val_loss += loss.item()
                
        avg_val_loss = epoch_val_loss / len(val_loader)
        val_losses.append(avg_val_loss)
        
        # Save best model
        saved_str = ""
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            torch.save(model.state_dict(), best_model_path)
            saved_str = " (Saved best model)"
            
        print(f"  Epoch {epoch:02d}/{EPOCHS}  |  Beta: {beta:.2f}  |  Train Loss: {avg_train_loss:.6f}  |  Val Loss: {avg_val_loss:.6f}{saved_str}")

    # Plot Loss Curves
    plt.figure(figsize=(10, 6))
    plt.plot(range(1, EPOCHS + 1), train_losses, label="Train Loss", color="blue")
    plt.plot(range(1, EPOCHS + 1), val_losses, label="Validation Loss", color="red")
    plt.xlabel("Epoch")
    plt.ylabel("Total Loss")
    plt.title("VAE Training & Validation Loss")
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.6)
    
    loss_plot_path = os.path.join(MODELS_SAVE_DIR, "vae_loss.png")
    plt.savefig(loss_plot_path, dpi=150)
    plt.close()
    print(f"  ✅  Saved loss plot → {loss_plot_path}")

    # ── 4. EVALUATION & THRESHOLDING ─────────────────────────────────────
    print(f"\n{_HR}")
    print("  4 / 4 — EVALUATION & ANOMALY DETECTION")
    print(_HR)
    
    # Load the best model
    model.load_state_dict(torch.load(best_model_path, map_location=DEVICE))
    model.eval()
    
    # Get anomaly scores for all Normal validation sequences
    print("  Computing anomaly scores for Validation Normal Data...")
    val_normal_tensor = torch.tensor(X_val, dtype=torch.float32).to(DEVICE)
    with torch.no_grad():
        normal_scores = model.anomaly_score(val_normal_tensor).cpu().numpy()
        
    # Calculate optimal threshold (95th percentile of normal scores)
    threshold = np.percentile(normal_scores, 95)
    print(f"  Normal Scores — Mean: {normal_scores.mean():.6f}, Max: {normal_scores.max():.6f}")
    print(f"  Computed Threshold (95th percentile) : {threshold:.6f}")
    
    # Save threshold
    threshold_path = os.path.join(MODELS_SAVE_DIR, "vae_threshold.pkl")
    joblib.dump(threshold, threshold_path)
    print(f"  ✅  Saved threshold → {threshold_path}")
    
    # Get anomaly scores for Attack data
    print("\n  Computing anomaly scores for Attack Data...")
    attack_tensor = torch.tensor(attack_seqs, dtype=torch.float32).to(DEVICE)
    
    # Compute in batches to avoid OOM
    model.eval()
    attack_scores = []
    with torch.no_grad():
        for i in range(0, len(attack_tensor), BATCH_SIZE):
            batch = attack_tensor[i:i+BATCH_SIZE]
            scores = model.anomaly_score(batch).cpu().numpy()
            attack_scores.extend(scores)
    attack_scores = np.array(attack_scores)
    
    # Predictions based on threshold
    predictions = (attack_scores > threshold).astype(int)
    
    # Calculate metrics
    precision = precision_score(attack_labels, predictions, zero_division=0)
    recall = recall_score(attack_labels, predictions, zero_division=0)
    f1 = f1_score(attack_labels, predictions, zero_division=0)
    
    print(f"\n  🚀 DETECTION PERFORMANCE ON ATTACK DATA:")
    print(f"     Threshold : {threshold:.6f}")
    print(f"     Precision : {precision:.4f}")
    print(f"     Recall    : {recall:.4f}")
    print(f"     F1-Score  : {f1:.4f}")
    
    # Plot Anomaly Score Distributions
    plt.figure(figsize=(10, 6))
    
    # Normal and Attack distributions
    plt.hist(normal_scores, bins=50, alpha=0.6, color="blue", label="Normal Data (Validation)", density=True)
    plt.hist(attack_scores, bins=50, alpha=0.5, color="red", label="Attack Data", density=True)
    
    # Add vertical line for threshold
    plt.axvline(x=threshold, color="black", linestyle="dashed", linewidth=2, label=f"Threshold (95%): {threshold:.4f}")
    
    plt.title("VAE Anomaly Score Distribution (Reconstruction MSE)")
    plt.xlabel("Reconstruction MSE")
    plt.ylabel("Density")
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.3)
    
    scores_plot_path = os.path.join(MODELS_SAVE_DIR, "vae_anomaly_scores.png")
    plt.savefig(scores_plot_path, dpi=150)
    plt.close()
    print(f"  ✅  Saved distributions plot → {scores_plot_path}")
    
    print(f"\n{_HR}")
    print("  ✅ VAE Training & Evaluation Complete!")
    print(_HR)

if __name__ == "__main__":
    train()
