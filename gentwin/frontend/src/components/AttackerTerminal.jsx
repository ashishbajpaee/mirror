import { useState, useEffect, useRef, useCallback } from 'react';
import './AttackerTerminal.css';
import AttackerGenome from './AttackerGenome';
import StatusBadge from './StatusBadge';
import useFullscreen from '../hooks/useFullscreen';
import { apiUrl, wsUrl } from '../config';

const EXAMPLES = [
  '"spoof the tank level in stage 1"',
  '"block the pump in P2"',
  '"slowly drift the pH sensor over 60 seconds"',
  '"attack all sensors in stage 3"',
  '"replay old data on FIT101"',
];

export default function AttackerTerminal() {
  useFullscreen();
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState([
    { type: 'system', text: '⚠  GenTwin Attacker Terminal v1.0 initialized' },
    { type: 'system', text: '   Type an attack command in plain English and press Enter.' },
    { type: 'divider' },
  ]);
  const [stats, setStats] = useState({
    total_launched: 0,
    detected: 0,
    undetected: 0,
    running: 0,
    fastest_detection: null,
    gaps_found: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [sensorData, setSensorData] = useState(null);
  const logEndRef = useRef(null);
  const wsRef = useRef(null);
  const pollingRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // WebSocket connection
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(wsUrl('/ws'));
      ws.onopen = () => {
        addLog('ws', '● WebSocket connected — live sensor feed active');
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setSensorData(data);
        } catch { /* skip malformed */ }
      };
      ws.onclose = () => {
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      wsRef.current = ws;
    };
    connect();
    return () => wsRef.current?.close();
  }, []);

  const addLog = useCallback((type, text) => {
    setLogs(prev => [...prev, { type, text, time: new Date().toLocaleTimeString() }]);
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/attacker/history'));
      const data = await res.json();
      if (data.stats) setStats(data.stats);
    } catch { /* ignore */ }
  }, []);

  const pollStatus = useCallback((attackId, startTime) => {
    let polls = 0;
    const maxPolls = 35;

    const poll = async () => {
      if (polls >= maxPolls) {
        addLog('blindspot', `⚠  BLINDSPOT — Attack ${attackId} ended undetected!`);
        refreshStats();
        setIsProcessing(false);
        return;
      }
      try {
        const res = await fetch(apiUrl('/api/attacker/status/' + attackId));
        const data = await res.json();
        const elapsed = data.time_elapsed || 0;

        if (data.detected) {
          addLog('detected', `⚡ DETECTED at t+${data.detection_time}s — blindspot score: ${data.blindspot_score}`);
          if (data.cascade_triggered) {
            addLog('cascade', `🔥 CASCADE TRIGGERED — multiple sensors compromised`);
          }
          refreshStats();
          setIsProcessing(false);
          return;
        }

        if (!data.is_running) {
          addLog('blindspot', `⚠  BLINDSPOT — Attack completed undetected! Score: ${data.blindspot_score}`);
          refreshStats();
          setIsProcessing(false);
          return;
        }

        // Still running — show progress
        if (polls % 3 === 0) {
          addLog('progress', `   ... monitoring t+${elapsed.toFixed(1)}s — no detection yet`);
        }
      } catch (e) {
        addLog('error', `✗ Status poll failed: ${e.message}`);
      }
      polls++;
      pollingRef.current = setTimeout(poll, 1000);
    };

    poll();
  }, [addLog, refreshStats]);

  const handleSubmit = async () => {
    const cmd = input.trim();
    if (!cmd || isProcessing) return;

    setInput('');
    setIsProcessing(true);

    addLog('command', `> ${cmd}`);
    addLog('parsing', '  Parsing command...');

    try {
      const res = await fetch(apiUrl('/api/attacker/execute'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();

      if (data.status === 'launched') {
        const p = data.parsed_attack;
        addLog('success', `✓ Parsed: ${p.attack_type} on ${p.target_sensors.join(', ')}`);
        addLog('success', `✓ Stage: ${p.target_stage} | Duration: ${p.duration}s | Intensity: ${p.intensity}`);
        addLog('launch', `✓ Attack launched at ${new Date().toLocaleTimeString()} — ID: ${data.attack_id}`);
        addLog('info', `  ${data.message}`);
        addLog('divider');

        refreshStats();
        pollStatus(data.attack_id, Date.now());
      } else {
        addLog('error', `✗ Failed: ${JSON.stringify(data)}`);
        setIsProcessing(false);
      }
    } catch (e) {
      addLog('error', `✗ Connection error: ${e.message}`);
      addLog('error', '  Is the backend running? python -m backend.attacker_terminal');
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    try {
      await fetch(apiUrl('/api/attacker/reset'), { method: 'POST' });
      if (pollingRef.current) clearTimeout(pollingRef.current);
      setIsProcessing(false);
      addLog('system', '🔄 Session reset — all attacks stopped, history cleared');
      setStats({ total_launched: 0, detected: 0, undetected: 0, running: 0, fastest_detection: null, gaps_found: 0 });
    } catch (e) {
      addLog('error', `✗ Reset failed: ${e.message}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="terminal-app-container">
      <StatusBadge />
      <div className="terminal-root">
        {/* ── Header ── */}
      <header className="terminal-header">
        <div className="header-warning">⚠</div>
        <div className="header-text">
          <h1>ATTACKER TERMINAL</h1>
          <p>GenTwin Red Team Interface</p>
        </div>
        <div className="header-warning">⚠</div>
        <button className="reset-btn" onClick={handleReset} title="Reset session">
          ⟳ RESET
        </button>
      </header>

      {/* ── Input Area ── */}
      <div className="terminal-input-area">
        <span className="prompt">&gt;</span>
        <input
          id="attack-input"
          type="text"
          className="terminal-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your attack command..."
          disabled={isProcessing}
          autoFocus
        />
        <button
          id="execute-btn"
          className="execute-btn"
          onClick={handleSubmit}
          disabled={isProcessing || !input.trim()}
        >
          {isProcessing ? '⏳' : '▶'}
        </button>
      </div>

      {/* ── Examples ── */}
      <div className="examples-bar">
        <span className="examples-label">EXAMPLES:</span>
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            className="example-chip"
            onClick={() => setInput(ex.replace(/"/g, ''))}
            disabled={isProcessing}
          >
            {ex}
          </button>
        ))}
      </div>

      {/* ── Terminal Output ── */}
      <div className="terminal-output" id="terminal-output">
        {logs.map((log, i) => (
          <div key={i} className={`log-line log-${log.type}`}>
            {log.type === 'divider' ? (
              <hr className="log-divider" />
            ) : (
              <>
                {log.time && <span className="log-time">[{log.time}]</span>}
                <span className="log-text">{log.text}</span>
              </>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="log-line log-parsing">
            <span className="blink-cursor">█</span>
            <span className="log-text"> Monitoring attack...</span>
          </div>
        )}
        <div ref={logEndRef} />
      </div>

      {/* ── Live Sensor Data ── */}
      {sensorData && (
        <div className="sensor-ticker">
          <span className="ticker-label">
            LIVE {sensorData.is_attack ? '🔴 UNDER ATTACK' : '🟢 NORMAL'}
          </span>
          <span className="ticker-sensors">
            {Object.entries(sensorData.sensors || {}).slice(0, 6).map(([k, v]) => (
              <span key={k} className={`ticker-item ${sensorData.is_attack ? 'ticker-attack' : ''}`}>
                {k}: {v.toFixed(3)}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* ── Session Stats ── */}
      <footer className="terminal-stats">
        <div className="stat-group">
          <div className="stat-title">CURRENT SESSION STATS</div>
          <div className="stat-row">
            <span className="stat-item">
              Attacks launched: <strong>{stats.total_launched}</strong>
            </span>
            <span className="stat-item stat-detected">
              Detected: <strong>{stats.detected}</strong>
            </span>
            <span className="stat-divider">|</span>
            <span className="stat-item stat-undetected">
              Undetected: <strong>{stats.undetected}</strong>
            </span>
            <span className="stat-divider">|</span>
            <span className="stat-item">
              Fastest: <strong>{stats.fastest_detection ? `${stats.fastest_detection}s` : '—'}</strong>
            </span>
            <span className="stat-divider">|</span>
            <span className="stat-item stat-gaps">
              Gaps found: <strong>{stats.gaps_found}</strong>
            </span>
          </div>
        </div>
      </footer>
      </div>

      {/* ── Genome Sidebar ── */}
      <aside className="genome-sidebar">
        <AttackerGenome />
      </aside>
    </div>
  );
}
