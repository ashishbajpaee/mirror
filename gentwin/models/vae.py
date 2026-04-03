"""
vae.py — Variational Autoencoder for Anomaly Detection
========================================================
Learns normal SWaT sensor behaviour.
High reconstruction error = anomaly.
"""

import torch
import torch.nn as nn

class VAE(nn.Module):
    """
    Variational Autoencoder processing flattened time-series windows.
    Input shape: (batch_size, window_size * num_features)
    """
    def __init__(self, input_dim: int, latent_dim: int):
        super(VAE, self).__init__()
        self.input_dim = input_dim
        self.latent_dim = latent_dim

        # ── ENCODER ───────────────────────────────────────────────────
        self.encoder_net = nn.Sequential(
            nn.Linear(input_dim, 512),
            nn.BatchNorm1d(512),
            nn.LeakyReLU(0.2),
            
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.LeakyReLU(0.2),
            
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.LeakyReLU(0.2)
        )
        # Latent space parameters (mu and log_var)
        self.fc_mu = nn.Linear(128, latent_dim)
        self.fc_log_var = nn.Linear(128, latent_dim)

        # ── DECODER ───────────────────────────────────────────────────
        self.decoder_net = nn.Sequential(
            nn.Linear(latent_dim, 128),
            nn.BatchNorm1d(128),
            nn.LeakyReLU(0.2),
            
            nn.Linear(128, 256),
            nn.BatchNorm1d(256),
            nn.LeakyReLU(0.2),
            
            nn.Linear(256, 512),
            nn.BatchNorm1d(512),
            nn.LeakyReLU(0.2),
            
            nn.Linear(512, input_dim),
            nn.Sigmoid()  # Outputs scaled to [0, 1]
        )

    def encode(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        """Map input to latent space parameters."""
        h = self.encoder_net(x)
        mu = self.fc_mu(h)
        log_var = self.fc_log_var(h)
        return mu, log_var

    def reparameterize(self, mu: torch.Tensor, log_var: torch.Tensor) -> torch.Tensor:
        """Sample from latent distribution using the reparameterization trick."""
        if self.training:
            std = torch.exp(0.5 * log_var)
            eps = torch.randn_like(std)
            return mu + eps * std
        else:
            # During inference, we just use the mean
            return mu

    def decode(self, z: torch.Tensor) -> torch.Tensor:
        """Map latent vector back to input space."""
        return self.decoder_net(z)

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Perform a full forward pass: encode -> reparameterize -> decode."""
        mu, log_var = self.encode(x)
        z = self.reparameterize(mu, log_var)
        reconstruction = self.decode(z)
        return reconstruction, mu, log_var

    def get_latent(self, x: torch.Tensor) -> torch.Tensor:
        """Return the latent representation z for a given input."""
        mu, log_var = self.encode(x)
        return self.reparameterize(mu, log_var)

    def anomaly_score(self, x: torch.Tensor) -> torch.Tensor:
        """
        Compute reconstruction error (MSE) per sample.
        Returns tensor of shape (batch_size,)
        """
        self.eval()
        with torch.no_grad():
            reconstruction, _, _ = self.forward(x)
            # MSE per sample across the feature dimension
            error = torch.mean((x - reconstruction) ** 2, dim=1)
        return error

def vae_loss_function(
    reconstruction: torch.Tensor, 
    x: torch.Tensor, 
    mu: torch.Tensor, 
    log_var: torch.Tensor, 
    beta: float = 1.0
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    """
    Compute total VAE loss combining Reconstruction Error and KL Divergence.
    """
    # Reconstruction loss (MSE)
    mse_loss = nn.functional.mse_loss(reconstruction, x, reduction='mean')
    
    # KL Divergence: -0.5 * sum(1 + log(sigma^2) - mu^2 - sigma^2)
    # Mean across batch to keep scale consistent with MSE
    kl_loss = -0.5 * torch.mean(torch.sum(1 + log_var - mu.pow(2) - log_var.exp(), dim=1))
    
    total_loss = mse_loss + beta * kl_loss
    return total_loss, mse_loss, kl_loss
