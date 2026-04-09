import { useState } from 'react';
import './DemoLauncher.css';
import { apiUrl } from '../config';

export default function DemoLauncher() {
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      await fetch(apiUrl('/api/attacker/reset'), { method: 'POST' });
      alert("✅ Demo successfully reset. All screens are now cleared.");
    } catch (e) {
      alert("❌ Failed to reset demo. Ensure backend is running.");
      console.error(e);
    }
    setResetting(false);
  };

  return (
    <div className="demo-launcher">
      <div className="launcher-header">
        <h1>GENTWIN DEMO LAUNCHER</h1>
        <p>Three-Screen Presentation Mode</p>
      </div>

      <div className="launcher-grid">
        <a className="launcher-btn btn-defender" href="/demo/defender" target="_blank" rel="noopener noreferrer">
          <div className="btn-icon">🛡️</div>
          <h2>DEFENDER SCREEN</h2>
          <p>Main projector view</p>
        </a>

        <a className="launcher-btn btn-attacker" href="/demo/attacker" target="_blank" rel="noopener noreferrer">
          <div className="btn-icon">⚔️</div>
          <h2>ATTACKER TERMINAL</h2>
          <p>Judge's tablet</p>
        </a>

        <a className="launcher-btn btn-evidence" href="/demo/evidence" target="_blank" rel="noopener noreferrer">
          <div className="btn-icon">📊</div>
          <h2>EVIDENCE FEED</h2>
          <p>Raw data &amp; telemetry</p>
        </a>
      </div>

      <div className="launcher-footer">
        <button className="btn-reset" onClick={handleReset} disabled={resetting}>
          {resetting ? "RESETTING..." : "🔄 RESET DEMO"}
        </button>
        <p className="hint">Press <strong>F</strong> on any demo screen to toggle fullscreen.</p>
      </div>
    </div>
  );
}
