"""
cgan.py — Conditional Generative Adversarial Network for Anomaly Generation
=============================================================================
Generates completely novel, synthetic attack vectors conditioned
on the specific SWaT plant stage (P1 - P6). 
"""

import os
import sys
import numpy as np
import torch
import torch.nn as nn
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import joblib
from torch.utils.data import TensorDataset, DataLoader
from tqdm import tqdm

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import SENSOR_NAMES, BATCH_SIZE, EPOCHS, DEVICE, MODELS_SAVE_DIR
from data.data_loader import get_data

_HR = "=" * 65

# ── STAGE TARGET MAPPING ──────────────────────────────────────────────
STAGE_SENSOR_MAP = {
    'P1': ['FIT101','LIT101','MV101','P101','P102'],
    'P2': ['AIT201','AIT202','AIT203','FIT201','MV201',
           'P201','P202','P203','P204','P205','P206'],
    'P3': ['DPIT301','FIT301','LIT301','MV301','MV302',
           'MV303','MV304','P301','P302'],
    'P4': ['AIT401','AIT402','FIT401','LIT401','P401',
           'P402','P403','P404','UV401'],
    'P5': ['AIT501','AIT502','AIT503','AIT504','FIT501',
           'FIT502','FIT503','FIT504','P501','P502',
           'PIT501','PIT502','PIT503'],
    'P6': ['FIT601','P601','P602','P603']
}

STAGE_TO_IDX = {f'P{i}': i-1 for i in range(1, 7)}
IDX_TO_STAGE = {i-1: f'P{i}' for i in range(1, 7)}
NUM_STAGES = 6

# ── ARCHITECTURE: GENERATOR ───────────────────────────────────────────
class Generator(nn.Module):
    def __init__(self, noise_dim=100, embed_dim=16, out_dim=51):
        super(Generator, self).__init__()
        self.noise_dim = noise_dim
        
        # Condition embedding from 6 discrete stages to dense 16 vector
        self.stage_embedding = nn.Embedding(NUM_STAGES, embed_dim)
        
        input_dim = noise_dim + embed_dim  # 116
        
        self.net = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.BatchNorm1d(256),
            nn.LeakyReLU(0.2),
            
            nn.Linear(256, 512),
            nn.BatchNorm1d(512),
            nn.LeakyReLU(0.2),
            
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.LeakyReLU(0.2),
            
            nn.Linear(256, out_dim),
            nn.Tanh()
        )

    def forward(self, noise, stage_labels):
        # stage_labels: (batch_size,) of class indices [0..5]
        embed = self.stage_embedding(stage_labels) 
        x = torch.cat([noise, embed], dim=1)
        synthetic_reading = self.net(x)
        return synthetic_reading

# ── ARCHITECTURE: DISCRIMINATOR ───────────────────────────────────────
class Discriminator(nn.Module):
    def __init__(self, feature_dim=51, embed_dim=16):
        super(Discriminator, self).__init__()
        
        self.stage_embedding = nn.Embedding(NUM_STAGES, embed_dim)
        input_dim = feature_dim + embed_dim  # 67
        
        self.net = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            nn.Linear(256, 128),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            nn.Linear(128, 1),
            nn.Sigmoid()
        )

    def forward(self, sensor_reading, stage_labels):
        embed = self.stage_embedding(stage_labels)
        x = torch.cat([sensor_reading, embed], dim=1)
        validity = self.net(x)
        return validity

# ── TRAINING FUNCTION ────────────────────────────────────────────────
def train_cgan(epochs=EPOCHS):
    os.makedirs(MODELS_SAVE_DIR, exist_ok=True)
    
    print(f"\n{_HR}")
    print("  1 / 3 — DATA PREPARATION (CGAN)")
    print(_HR)
    
    # We only train on ATTACK Data
    _, X_attack, _, _, _, _, scaler = get_data()
    print(f"  Attack data loaded: {X_attack.shape}")
    
    # We need condition labels. In dummy data, attacks are random,
    # so we'll assign random stage targets to evenly condition the GAN.
    # In a real environment, you might cluster or extract authentic target labels.
    rng = np.random.default_rng(42)
    y_stages = rng.integers(0, NUM_STAGES, size=X_attack.shape[0])
    
    # Convert ranges. MinMaxScaler is [0, 1]. Tanh output is [-1, 1].
    # So we rescale X_attack from [0, 1] to [-1, 1] for stable GAN training.
    X_attack_scaled = (X_attack * 2.0) - 1.0 
    
    tensor_x = torch.tensor(X_attack_scaled, dtype=torch.float32)
    tensor_y = torch.tensor(y_stages, dtype=torch.long)
    
    dataset = TensorDataset(tensor_x, tensor_y)
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
    
    print(f"\n{_HR}")
    print("  2 / 3 — INITIALIZING & TRAINING GAN")
    print(_HR)
    
    generator = Generator(noise_dim=100, embed_dim=16, out_dim=51).to(DEVICE)
    discriminator = Discriminator(feature_dim=51, embed_dim=16).to(DEVICE)
    
    # GAN training uses BCE Loss
    criterion = nn.BCELoss()
    
    optimizer_G = torch.optim.Adam(generator.parameters(), lr=0.0002, betas=(0.5, 0.999))
    optimizer_D = torch.optim.Adam(discriminator.parameters(), lr=0.0002, betas=(0.5, 0.999))
    
    g_losses, d_losses = [], []
    
    for epoch in range(1, epochs + 1):
        g_loss_epoch = 0.0
        d_loss_epoch = 0.0
        
        pbar = tqdm(dataloader, desc=f"  Epoch {epoch:02d}/{epochs}", leave=False)
        for i, (real_samples, labels) in enumerate(pbar):
            batch_size = real_samples.shape[0]
            
            real_samples = real_samples.to(DEVICE)
            labels = labels.to(DEVICE)
            
            # Label Smoothing (Real = 0.9, Fake = 0.1)
            valid = torch.full((batch_size, 1), 0.9, dtype=torch.float32, device=DEVICE)
            fake = torch.full((batch_size, 1), 0.1, dtype=torch.float32, device=DEVICE)
            
            # ==========================
            #  Train Discriminator
            # ==========================
            optimizer_D.zero_grad()
            
            # Real Loss
            real_validity = discriminator(real_samples, labels)
            d_real_loss = criterion(real_validity, valid)
            
            # Fake Loss
            noise = torch.randn(batch_size, 100, device=DEVICE)
            fake_samples = generator(noise, labels)
            fake_validity = discriminator(fake_samples.detach(), labels)
            d_fake_loss = criterion(fake_validity, fake)
            
            d_loss = (d_real_loss + d_fake_loss) / 2
            d_loss.backward()
            optimizer_D.step()
            
            # ==========================
            #  Train Generator
            # ==========================
            optimizer_G.zero_grad()
            
            # G wants D to label its fake samples as Real (valid)
            fake_validity_updated = discriminator(fake_samples, labels)
            g_loss = criterion(fake_validity_updated, valid)
            
            g_loss.backward()
            optimizer_G.step()
            
            g_loss_epoch += g_loss.item()
            d_loss_epoch += d_loss.item()
            pbar.set_postfix({"D": f"{d_loss.item():.4f}", "G": f"{g_loss.item():.4f}"})
            
        g_losses.append(g_loss_epoch / len(dataloader))
        d_losses.append(d_loss_epoch / len(dataloader))
        print(f"  Epoch {epoch:02d}/{epochs}  |  D Loss: {d_losses[-1]:.4f}  |  G Loss: {g_losses[-1]:.4f}")

    # Save models
    gen_path = os.path.join(MODELS_SAVE_DIR, "cgan_generator.pth")
    disc_path = os.path.join(MODELS_SAVE_DIR, "cgan_discriminator.pth")
    torch.save(generator.state_dict(), gen_path)
    torch.save(discriminator.state_dict(), disc_path)
    print(f"\n  ✅  Generator saved → {gen_path}")
    print(f"  ✅  Discriminator saved → {disc_path}")
    
    # Save Loss plot
    plt.figure(figsize=(10, 5))
    plt.title("Generator vs Discriminator Loss")
    plt.plot(d_losses, label="Discriminator Loss", color='blue')
    plt.plot(g_losses, label="Generator Loss", color='orange')
    plt.xlabel("Epochs")
    plt.ylabel("BCE Loss")
    plt.legend()
    plt.grid(True, linestyle="--", alpha=0.5)
    
    loss_path = os.path.join(MODELS_SAVE_DIR, "cgan_loss.png")
    plt.savefig(loss_path, dpi=150)
    plt.close()
    print(f"  ✅  Loss plot saved → {loss_path}")
    
    return generator

# ── GENERATION SEQUENCE ──────────────────────────────────────────────
def generate_attacks(stage: str, n: int, generator: nn.Module) -> np.ndarray:
    """
    Generates synthetic targeted attacks.
    Post-processes the output by artificially maxing out the deviation 
    specifically on the targeted sensor columns.
    """
    generator.eval()
    stage_idx = STAGE_TO_IDX[stage]
    
    # Create conditioned labels and noise
    labels = torch.full((n,), stage_idx, dtype=torch.long, device=DEVICE)
    noise = torch.randn(n, 100, device=DEVICE)
    
    with torch.no_grad():
        fake_scaled = generator(noise, labels).cpu().numpy()
        
    # GAN returns features in [-1, 1]. Rescale to [0, 1] 
    fake_data = (fake_scaled + 1.0) / 2.0
    
    # Post-processing: Ensure targeted stage sensors deviate heavily 
    # to form a genuine logical anomaly, simulating a targeted break.
    affected_sensors = STAGE_SENSOR_MAP[stage]
    for sensor in affected_sensors:
        if sensor in SENSOR_NAMES:
            col_idx = SENSOR_NAMES.index(sensor)
            # Push value heavily to extreme boundaries (0 or 1 edge cases)
            push_factor = np.random.choice([0.0, 1.0], size=n)
            # Blend 80% forced extremity to 20% GAN native geometry 
            fake_data[:, col_idx] = (fake_data[:, col_idx] * 0.2) + (push_factor * 0.8)
            
    # Save the attacks to .npy
    save_path = os.path.join(MODELS_SAVE_DIR, f"generated_attacks_{stage}.npy")
    np.save(save_path, fake_data)
    
    return fake_data

# ── EXECUTION SCRIPT ─────────────────────────────────────────────────
if __name__ == "__main__":
    
    # Allow overriding EPOCHS for a swift test pipeline check
    generator = train_cgan(epochs=EPOCHS)
    
    print(f"\n{_HR}")
    print("  3 / 3 — GENERATING SYNTHETIC ATTACKS (200 per Stage)")
    print(_HR)
    
    # Calculate baseline normal from training purely to act as a distance reference
    _, X_attack_baseline, _, _, _, _, _ = get_data()
    center_baseline = np.mean(X_attack_baseline, axis=0)
    
    all_fakes = []
    
    for i in range(1, NUM_STAGES + 1):
        stage_target = f"P{i}"
        fakes = generate_attacks(stage=stage_target, n=200, generator=generator)
        all_fakes.append(fakes)
        
        # Calculate mean euclidean distance of these attacks from baseline center
        fakes_center = np.mean(fakes, axis=0)
        dist = np.linalg.norm(fakes_center - center_baseline)
        
        print(f"  Generated 200 arrays for Stage {stage_target:<3} |  distance from base attack set : {dist:.4f}")
        
    # Aggregate summary
    total_generated = np.concatenate(all_fakes, axis=0)
    print(f"\n  ✅  Successfully deployed {total_generated.shape[0]} novel attacks across 6 operational stages.")
    print(f"       Saved arrays locally to: {MODELS_SAVE_DIR}generated_attacks_*.npy")
    print(f"{_HR}\n")
