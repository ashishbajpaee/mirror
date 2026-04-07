import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import AttackerGenome from './AttackerGenome';

const API_BASE = 'http://localhost:8000';

export default function Dashboard() {
  const { isDark, t } = useOutletContext();
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

  useEffect(() => {
    const pollDemo = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/demo/status`);
        const data = await res.json();
        setDemoState(data);
      } catch (e) {}
    };
    const interval = setInterval(pollDemo, 1000);
    return () => clearInterval(interval);
  }, []);

  const stages = {
    P1: ['FIT101', 'LIT101', 'MV101', 'P101', 'P102'],
    P2: ['AIT201', 'AIT202', 'AIT203', 'FIT201', 'MV201'],
    P3: ['DPIT301', 'FIT301', 'LIT301', 'MV301', 'MV302'],
    P4: ['AIT401', 'AIT402', 'FIT401', 'LIT401', 'P401'],
    P5: ['AIT501', 'AIT502', 'FIT501', 'PIT501', 'PIT502'],
    P6: ['FIT601', 'P601', 'P602', 'P603'],
  };

  const card = { backgroundColor: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 8 };
  const chip = { backgroundColor: isDark ? '#1e293b' : '#F1F5F9', border: `0.5px solid ${t.border}`, borderRadius: 6 };

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="p-5" style={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: t.text }}>GenTwin</h2>
            <p className="text-[13px] mt-0.5" style={{ color: t.textSecondary }}>Digital Twin — SWaT Process Monitor</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{
              backgroundColor: sensorData?.is_attack ? (isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2') : (isDark ? 'rgba(16,185,129,0.1)' : '#F0FDF4'),
              border: `0.5px solid ${sensorData?.is_attack ? '#EF4444' : '#10B981'}`,
            }}>
              <span style={{ color: sensorData?.is_attack ? '#EF4444' : '#10B981', fontSize: 10 }}>●</span>
              <span className="text-[12px] font-semibold" style={{ color: sensorData?.is_attack ? '#EF4444' : '#10B981' }}>
                {sensorData?.is_attack ? 'UNDER ATTACK' : 'NORMAL'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Grid + Alert Feed + Genome */}
      <div className="grid gap-4 lg:grid-cols-[1fr_260px_300px]">
        {/* Sensors */}
        <div className="p-5" style={card}>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-4" style={{ color: t.textMuted }}>Live Sensor Readings</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(stages).map(([stage, sensors]) => (
              <div key={stage} className="p-3 rounded-lg" style={{
                ...chip,
                borderColor: sensorData?.is_attack ? (isDark ? 'rgba(239,68,68,0.3)' : '#FECACA') : t.border,
              }}>
                <p className="font-mono text-[14px] font-bold mb-2" style={{ color: '#2563EB' }}>{stage}</p>
                <div className="space-y-1.5">
                  {sensors.map(s => {
                    const val = sensorData?.sensors?.[s];
                    return (
                      <div key={s} className="grid items-center gap-2" style={{ gridTemplateColumns: '70px 50px 1fr', fontSize: 12 }}>
                        <span className="font-mono" style={{ color: t.text }}>{s}</span>
                        <span className="font-mono text-right text-[11px]" style={{ color: '#10B981' }}>{val != null ? val.toFixed(3) : '—'}</span>
                        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#334155' : '#E2E8F0' }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(val || 0) * 100}%`, backgroundColor: '#2563EB' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alert Feed */}
        <div className="p-4" style={card}>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Alert Feed</h3>
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-center py-6 text-[13px]" style={{ color: '#10B981' }}>No alerts — system nominal</p>
            ) : (
              alerts.map((a, i) => (
                <div key={i} className="px-2.5 py-1.5 rounded text-[11px] font-mono" style={{
                  color: '#EF4444',
                  backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : '#FEF2F2',
                  borderBottom: `0.5px solid ${t.border}`,
                }}>{a}</div>
              ))
            )}
          </div>
        </div>

        {/* Genome */}
        <div style={card}>
          <AttackerGenome />
        </div>
      </div>

      {/* Demo Overlays */}
      {demoState && demoState.current_action_text && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.85)', border: '3px solid #EF4444', borderRadius: 8, padding: '32px 64px', zIndex: 9999, textAlign: 'center' }}>
          <h2 style={{ fontSize: 40, color: '#fff', margin: 0, fontWeight: 700 }}>{demoState.current_action_text}</h2>
        </div>
      )}
      {demoState && demoState.final_stats && demoState.final_stats.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="text-center space-y-4">
            {demoState.final_stats.map((stat, i) => (
              <h1 key={i} style={{ fontSize: i === demoState.final_stats.length - 1 ? 48 : 28, color: i === demoState.final_stats.length - 1 ? '#10B981' : '#E2E8F0', margin: 0 }}>{stat}</h1>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
