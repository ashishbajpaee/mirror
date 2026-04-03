"""
lstm_ae.py — Long Short-Term Memory Autoencoder
===================================================
Detects slow-moving temporal attacks by analyzing the 
reconstruction error over sequences of timesteps.
"""

import torch
import torch.nn as nn

class LSTMAE(nn.Module):
    """
    LSTM Autoencoder.
    Input shape: (batch_size, window_size, num_features)
    """
    def __init__(self, input_dim: int, hidden_dim: int = 128, bottleneck_dim: int = 64):
        super(LSTMAE, self).__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.bottleneck_dim = bottleneck_dim

        # ── ENCODER ───────────────────────────────────────────────────
        self.encoder_lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=2,
            batch_first=True,
            dropout=0.2
        )
        # Bottleneck mapping
        self.encoder_linear = nn.Sequential(
            nn.Linear(hidden_dim, bottleneck_dim),
            nn.ReLU()
        )

        # ── DECODER ───────────────────────────────────────────────────
        self.decoder_linear = nn.Sequential(
            nn.Linear(bottleneck_dim, hidden_dim),
            nn.ReLU()
        )
        self.decoder_lstm = nn.LSTM(
            input_size=hidden_dim,
            hidden_size=hidden_dim,
            num_layers=2,
            batch_first=True,
            dropout=0.2
        )
        # "TimeDistributed" logic handled inherently by PyTorch Linear across seq_len
        self.output_layer = nn.Sequential(
            nn.Linear(hidden_dim, input_dim),
            nn.Sigmoid()  # output ranges [0, 1] matching MinMaxScaler
        )

    def encode(self, x: torch.Tensor) -> torch.Tensor:
        """
        Maps sequence x to a fixed length bottleneck vector.
        x: (batch, seq_len, features)
        Returns: (batch, bottleneck_dim)
        """
        # lstm_out: (batch, seq_len, hidden_dim)
        lstm_out, (hn, cn) = self.encoder_lstm(x)
        # Take the hidden state of the last timestep
        last_hidden = lstm_out[:, -1, :] 
        bottleneck = self.encoder_linear(last_hidden)
        return bottleneck

    def decode(self, z: torch.Tensor, seq_len: int) -> torch.Tensor:
        """
        Reconstructs the original sequence from the bottleneck vector.
        z: (batch, bottleneck_dim)
        Returns: (batch, seq_len, features)
        """
        # Expand bottleneck up to hidden_dim
        z_hidden = self.decoder_linear(z)
        
        # RepeatVector: expand z_hidden across all timesteps 
        # from (batch, hidden_dim) -> (batch, seq_len, hidden_dim)
        z_repeated = z_hidden.unsqueeze(1).repeat(1, seq_len, 1)
        
        # Decode sequential structure
        lstm_out, _ = self.decoder_lstm(z_repeated)
        
        # Apply output Linear to every timestep
        reconstruction = self.output_layer(lstm_out)
        return reconstruction

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass: input -> bottleneck -> reconstruction"""
        seq_len = x.size(1)
        z = self.encode(x)
        reconstruction = self.decode(z, seq_len)
        return reconstruction

    def get_encoding(self, x: torch.Tensor) -> torch.Tensor:
        """Alias for encode() to extract the embedding representation."""
        return self.encode(x)

    def anomaly_score(self, x: torch.Tensor) -> torch.Tensor:
        """
        Compute reconstruction error per sample, averaged across timesteps.
        Returns tensor of shape (batch,)
        """
        self.eval()
        with torch.no_grad():
            reconstruction = self.forward(x)
            # MSE per sample across timesteps and features
            error = torch.mean((x - reconstruction) ** 2, dim=[1, 2])
        return error

    def timestep_error(self, x: torch.Tensor) -> torch.Tensor:
        """
        Returns reconstruction error for each individual timestep.
        Returns tensor of shape (batch, seq_len)
        """
        self.eval()
        with torch.no_grad():
            reconstruction = self.forward(x)
            # MSE per sample per timestep averaged across features
            error = torch.mean((x - reconstruction) ** 2, dim=2)
        return error
