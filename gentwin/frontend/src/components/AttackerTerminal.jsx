import { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import AttackerGenome from './AttackerGenome';

const API_BASE = 'http://localhost:8000';

const EXAMPLES = [
  'spoof the tank level in stage 1',
  'block the pump in P2',
  'slowly drift the pH sensor over 60 seconds',
  'attack all sensors in stage 3',
  'replay old data on FIT101',
];

export default function AttackerTerminal() {
  const { isDark, t } = useOutletContext();
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState([
    { type: 'system', text: '⚠  GenTwin Attacker Terminal v1.0 initialized' },
    { type: 'system', text: '   Type an attack command in plain English and press Enter.' },
    { type: 'divider' },
  ]);
  const [stats, setStats] = useState({ total_launched: 0, detected: 0, undetected: 0, running: 0, fastest_detection: null, gaps_found: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [sensorData, setSensorData] = useState(null);
  const logEndRef = useRef(null);
  const wsRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket('ws://localhost:8000/ws');
      ws.onopen = () => addLog('ws', '● WebSocket connected — live sensor feed active');
      ws.onmessage = (e) => { try { setSensorData(JSON.parse(e.data)); } catch {} };
      ws.onclose = () => setTimeout(connect, 3000);
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
    try { const res = await fetch(`${API_BASE}/api/attacker/history`); const data = await res.json(); if (data.stats) setStats(data.stats); } catch {}
  }, []);

  const pollStatus = useCallback((attackId) => {
    let polls = 0;
    const poll = async () => {
      if (polls >= 35) { addLog('blindspot', `⚠  BLINDSPOT — Attack ${attackId} ended undetected!`); refreshStats(); setIsProcessing(false); return; }
      try {
        const res = await fetch(`${API_BASE}/api/attacker/status/${attackId}`);
        const data = await res.json();
        if (data.detected) { addLog('detected', `⚡ DETECTED at t+${data.detection_time}s — blindspot score: ${data.blindspot_score}`); if (data.cascade_triggered) addLog('cascade', `🔥 CASCADE TRIGGERED`); refreshStats(); setIsProcessing(false); return; }
        if (!data.is_running) { addLog('blindspot', `⚠  BLINDSPOT — Attack completed undetected! Score: ${data.blindspot_score}`); refreshStats(); setIsProcessing(false); return; }
        if (polls % 3 === 0) addLog('progress', `   ... monitoring t+${(data.time_elapsed||0).toFixed(1)}s — no detection yet`);
      } catch (e) { addLog('error', `✗ Status poll failed: ${e.message}`); }
      polls++; pollingRef.current = setTimeout(poll, 1000);
    };
    poll();
  }, [addLog, refreshStats]);

  const handleSubmit = async () => {
    const cmd = input.trim();
    if (!cmd || isProcessing) return;
    setInput(''); setIsProcessing(true);
    addLog('command', `> ${cmd}`); addLog('parsing', '  Parsing command...');
    try {
      const res = await fetch(`${API_BASE}/api/attacker/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: cmd }) });
      const data = await res.json();
      if (data.status === 'launched') {
        const p = data.parsed_attack;
        addLog('success', `✓ Parsed: ${p.attack_type} on ${p.target_sensors.join(', ')}`);
        addLog('launch', `✓ Attack launched — ID: ${data.attack_id}`);
        addLog('divider'); refreshStats(); pollStatus(data.attack_id);
      } else { addLog('error', `✗ Failed: ${JSON.stringify(data)}`); setIsProcessing(false); }
    } catch (e) { addLog('error', `✗ Connection error: ${e.message}`); setIsProcessing(false); }
  };

  const handleReset = async () => {
    try { await fetch(`${API_BASE}/api/attacker/reset`, { method: 'POST' }); if (pollingRef.current) clearTimeout(pollingRef.current); setIsProcessing(false); addLog('system', '🔄 Session reset'); setStats({ total_launched: 0, detected: 0, undetected: 0, running: 0, fastest_detection: null, gaps_found: 0 }); } catch (e) { addLog('error', `✗ Reset failed: ${e.message}`); }
  };

  const card = { backgroundColor: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 8 };
  const logColors = { system: t.textMuted, command: '#F59E0B', parsing: t.textMuted, success: '#10B981', launch: '#2563EB', detected: '#10B981', blindspot: '#EF4444', cascade: '#EF4444', error: '#EF4444', progress: t.textMuted, ws: '#10B981', info: t.textSecondary };

  return (
    <section className="flex gap-4" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Terminal */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Header */}
        <div className="p-4 flex items-center justify-between" style={card}>
          <div>
            <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: '#EF4444' }}>⚠ Red Team Interface</p>
            <h2 className="text-lg font-semibold" style={{ color: t.text }}>Attacker Terminal</h2>
          </div>
          <button onClick={handleReset} className="px-4 py-1.5 rounded-md text-[12px] font-medium transition hover:opacity-80"
            style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', color: '#EF4444', border: `0.5px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#FECACA'}` }}>
            ⟳ Reset Session
          </button>
        </div>

        {/* Input */}
        <div className="flex gap-2 items-center px-4 py-3 rounded-lg" style={card}>
          <span className="font-mono text-[14px] font-bold" style={{ color: '#EF4444' }}>&gt;</span>
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Type your attack command..." disabled={isProcessing} autoFocus
            className="flex-1 bg-transparent outline-none text-[13px]" style={{ color: t.text, fontFamily: 'monospace' }} />
          <button onClick={handleSubmit} disabled={isProcessing || !input.trim()}
            className="px-3 py-1 rounded-md text-[12px] font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: '#EF4444' }}>{isProcessing ? '⏳' : '▶ Execute'}</button>
        </div>

        {/* Examples */}
        <div className="flex flex-wrap gap-1.5 px-1">
          <span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: t.textMuted }}>Examples:</span>
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => setInput(ex)} disabled={isProcessing}
              className="px-2 py-0.5 rounded text-[11px] transition hover:opacity-80"
              style={{ backgroundColor: isDark ? '#1e293b' : '#F1F5F9', color: t.textSecondary, border: `0.5px solid ${t.border}` }}>
              {ex}
            </button>
          ))}
        </div>

        {/* Log output */}
        <div className="flex-1 overflow-y-auto p-4 rounded-lg max-h-[400px]" style={{ ...card, fontFamily: 'monospace', fontSize: 12 }}>
          {logs.map((log, i) => (
            <div key={i} className="py-0.5" style={{ color: logColors[log.type] || t.text }}>
              {log.type === 'divider' ? <hr style={{ border: 'none', borderTop: `0.5px solid ${t.border}`, margin: '4px 0' }} /> : (
                <>{log.time && <span style={{ color: t.textMuted, marginRight: 8 }}>[{log.time}]</span>}<span>{log.text}</span></>
              )}
            </div>
          ))}
          {isProcessing && <div className="py-0.5" style={{ color: t.textMuted }}>█ Monitoring attack...</div>}
          <div ref={logEndRef} />
        </div>

        {/* Sensor ticker */}
        {sensorData && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg text-[11px] font-mono overflow-x-auto" style={card}>
            <span className="shrink-0 font-semibold" style={{ color: sensorData.is_attack ? '#EF4444' : '#10B981' }}>
              {sensorData.is_attack ? '● UNDER ATTACK' : '● NORMAL'}
            </span>
            {Object.entries(sensorData.sensors || {}).slice(0, 8).map(([k, v]) => (
              <span key={k} style={{ color: t.textSecondary }}>{k}: <span style={{ color: t.text }}>{v.toFixed(3)}</span></span>
            ))}
          </div>
        )}

        {/* Stats footer */}
        <div className="flex flex-wrap gap-4 px-4 py-2 rounded-lg text-[11px]" style={card}>
          <span style={{ color: t.textMuted }}>SESSION:</span>
          {[['Launched', stats.total_launched, t.text], ['Detected', stats.detected, '#10B981'], ['Undetected', stats.undetected, '#EF4444'], ['Fastest', stats.fastest_detection ? `${stats.fastest_detection}s` : '—', '#F59E0B'], ['Gaps', stats.gaps_found, '#8B5CF6']].map(([l, v, c]) => (
            <span key={l} style={{ color: t.textMuted }}>{l}: <strong style={{ color: c }}>{v}</strong></span>
          ))}
        </div>
      </div>

      {/* Genome Sidebar */}
      <div className="w-[320px] shrink-0 hidden xl:block" style={card}>
        <AttackerGenome />
      </div>
    </section>
  );
}
