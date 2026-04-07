import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

export default function EvidenceFeed() {
  const { isDark, t } = useOutletContext();
  const [readings, setReadings] = useState(null);
  const [lastUpdate, setLastUpdate] = useState('');

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.sensors) {
          setReadings({ ...data.sensors, is_attack: data.is_attack });
          const now = new Date();
          setLastUpdate(`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}.${now.getMilliseconds().toString().padStart(3,'0')}`);
        }
      } catch (e) { console.error("WS parse error", e); }
    };
    return () => ws.close();
  }, []);

  const card = { backgroundColor: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 8 };

  if (!readings) {
    return (
      <div className="p-8 text-center text-[13px]" style={{ ...card, color: t.textMuted }}>
        Connecting to live telemetry...
      </div>
    );
  }

  const skipFields = ['t', 'is_attack', 'detected'];
  const fields = Object.keys(readings).filter(key => !skipFields.includes(key)).sort();

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="p-5 flex flex-wrap items-center justify-between gap-3" style={card}>
        <div>
          <h2 className="text-xl font-semibold" style={{ color: t.text }}>Live Sensor Feed</h2>
          <p className="text-[13px] mt-0.5" style={{ color: t.textSecondary }}>Raw telemetry data from the SWaT process simulator</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{
            backgroundColor: readings.is_attack ? (isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2') : (isDark ? 'rgba(16,185,129,0.1)' : '#F0FDF4'),
            border: `0.5px solid ${readings.is_attack ? '#EF4444' : '#10B981'}`,
          }}>
            <span style={{ color: readings.is_attack ? '#EF4444' : '#10B981', fontSize: 8 }}>●</span>
            <span className="text-[11px] font-semibold" style={{ color: readings.is_attack ? '#EF4444' : '#10B981' }}>STREAMING</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg" style={card}>
        <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `0.5px solid ${t.border}` }}>
              {['TAG', 'VALUE (RAW)', 'STATUS'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]" style={{ color: t.textMuted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map(tag => {
              const val = readings[tag];
              const isAttack = readings.is_attack;
              return (
                <tr key={tag} style={{
                  borderBottom: `0.5px solid ${t.border}`,
                  backgroundColor: isAttack ? (isDark ? 'rgba(239,68,68,0.05)' : '#FEF2F2') : 'transparent',
                }}>
                  <td className="px-4 py-1.5 font-mono font-medium" style={{ color: t.text }}>{tag}</td>
                  <td className="px-4 py-1.5 font-mono" style={{ color: '#10B981' }}>{typeof val === 'number' ? val.toFixed(4) : val}</td>
                  <td className="px-4 py-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{
                      backgroundColor: isAttack ? (isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2') : (isDark ? 'rgba(16,185,129,0.1)' : '#F0FDF4'),
                      color: isAttack ? '#EF4444' : '#10B981',
                    }}>{isAttack ? 'ATTACK' : 'NORMAL'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap gap-4 px-4 py-3 text-[11px] rounded-lg" style={card}>
        <span style={{ color: t.textMuted }}>Last update: <strong style={{ color: t.text }}>{lastUpdate}</strong></span>
        <span style={{ color: t.textMuted }}>Source: Virtual Sensor Simulator</span>
        <span style={{ color: t.textMuted }}>Mode: DEMO (real-time streaming)</span>
      </div>
    </section>
  );
}
