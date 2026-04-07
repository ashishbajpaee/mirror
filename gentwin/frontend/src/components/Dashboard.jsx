import { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import AttackerGenome from './AttackerGenome';
import StatusBadge from './StatusBadge';
import useFullscreen from '../hooks/useFullscreen';

const API_BASE = 'http://localhost:8000';

export default function Dashboard() {
  useFullscreen();
  const [sensorData, setSensorData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [demoState, setDemoState] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket('ws://localhost:8000/ws');
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setSensorData(data);
          if (data.is_attack) {
            setAlerts(prev => {
              const msg = `🚨 ${data.attack_type || 'Attack'} detected at ${data.timestamp?.split('T')[1]?.slice(0,8) || 'now'}`;
              return [msg, ...prev].slice(0, 20);
            });
          }
        } catch { /* skip */ }
      };
      ws.onclose = () => setTimeout(connect, 3000);
      ws.onerror = () => ws.close();
      wsRef.current = ws;
    };
    connect();
    return () => wsRef.current?.close();
  }, []);

  // Poll for Demo State to trigger overlays
  useEffect(() => {
    const pollDemo = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/demo/status`);
        const data = await res.json();
        setDemoState(data);
      } catch (e) {
        // Silent fail normal ops
      }
    };
    const interval = setInterval(pollDemo, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunchTerminal = () => {
    window.open('/attacker', '_blank');
  };

  const stages = {
    P1: ['FIT101', 'LIT101', 'MV101', 'P101', 'P102'],
    P2: ['AIT201', 'AIT202', 'AIT203', 'FIT201', 'MV201'],
    P3: ['DPIT301', 'FIT301', 'LIT301', 'MV301', 'MV302'],
    P4: ['AIT401', 'AIT402', 'FIT401', 'LIT401', 'P401'],
    P5: ['AIT501', 'AIT502', 'FIT501', 'PIT501', 'PIT502'],
    P6: ['FIT601', 'P601', 'P602', 'P603'],
  };

  return (
    <div className="dash-container">
      <StatusBadge />
      <header className="dash-header">
        <div className="dash-title">
          <h1>GenTwin</h1>
          <p>Digital Twin — SWaT Process Monitor</p>
        </div>
        <div className="dash-status">
          <span className={`status-dot ${sensorData?.is_attack ? 'dot-attack' : 'dot-normal'}`} />
          <span>{sensorData?.is_attack ? 'UNDER ATTACK' : 'NORMAL'}</span>
        </div>
        <button className="launch-terminal-btn" style={{marginRight: '8px'}} onClick={handleLaunchTerminal} id="launch-attacker-btn">
          🔴 TERMINAL KEYBOARD
        </button>
        <button className="launch-terminal-btn" onClick={() => window.open('/attack-cards', '_blank')} id="launch-cards-btn" style={{background: '#440a0a', border: '1px solid #FF0000', color: '#FF0000'}}>
          🔴 OPEN ATTACK PANEL
        </button>
      </header>

      <main className="dash-main">
        {/* Sensor Grid */}
        <section className="sensor-grid-section">
          <h2>Live Sensor Readings</h2>
          <div className="stages-grid">
            {Object.entries(stages).map(([stage, sensors]) => (
              <div key={stage} className={`stage-card ${sensorData?.is_attack ? 'stage-alert' : ''}`}>
                <div className="stage-label">{stage}</div>
                <div className="stage-sensors">
                  {sensors.map(s => {
                    const val = sensorData?.sensors?.[s];
                    return (
                      <div key={s} className="sensor-row">
                        <span className="sensor-name">{s}</span>
                        <span className="sensor-value">{val != null ? val.toFixed(3) : '—'}</span>
                        <div className="sensor-bar-bg">
                          <div
                            className="sensor-bar-fill"
                            style={{ width: `${(val || 0) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Alerts */}
        <section className="alerts-section">
          <h2>Alert Feed</h2>
          <div className="alerts-list">
            {alerts.length === 0 ? (
              <div className="no-alerts">No alerts — system nominal</div>
            ) : (
              alerts.map((a, i) => (
                <div key={i} className="alert-item">{a}</div>
              ))
            )}
          </div>
        </section>

        {/* Genome Profiler */}
        <section className="genome-section">
          <AttackerGenome />
        </section>
      </main>

      {/* ── Demo Presentation Overlays ── */}
      {demoState && demoState.current_action_text && (
        <div className="demo-overlay-text slide-in">
          <h2>{demoState.current_action_text}</h2>
        </div>
      )}

      {demoState && demoState.show_shap && (
        <div className="demo-overlay-shap slide-up">
          <h3>SHAP FORENSIC EXPLANATION (MISSING)</h3>
          <div className="shap-placeholder">
            <span>[Feature Importance Analysis]</span>
            <div className="bar-red" style={{width: '60%'}}>LIT101_dev (Not thresholded)</div>
            <div className="bar-red" style={{width: '40%'}}>AIT201_dev</div>
          </div>
        </div>
      )}

      {demoState && demoState.final_stats && demoState.final_stats.length > 0 && (
        <div className="demo-overlay-stats fade-in">
          <div className="stats-box">
            {demoState.final_stats.map((stat, i) => (
              <h1 key={i} className={`stat-lead stat-${i}`}>{stat}</h1>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
