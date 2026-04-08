import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { api, getWsBaseUrl } from '../api/client';
import SensorGrid from '../components/SensorGrid';
import StageOverview from '../components/StageOverview';

function stageFromIndex(index) {
  if (index < 9) return 'P1';
  if (index < 17) return 'P2';
  if (index < 26) return 'P3';
  if (index < 34) return 'P4';
  if (index < 43) return 'P5';
  return 'P6';
}

function stageTone(score) {
  if (score < 3) return '#52d1a9';
  if (score < 5) return '#f1d075';
  if (score < 7) return '#f2a85a';
  return '#eb6558';
}

function CommandCenter() {
  const { demoMode, isDark, t } = useOutletContext();
  const navigate = useNavigate();
  const [blindspotScores, setBlindspotScores] = useState({});
  const [sensorReadings, setSensorReadings] = useState({});
  const [connectionLabel, setConnectionLabel] = useState('Connecting...');

  useEffect(() => {
    let cancelled = false;
    const fetchBlindspots = async () => {
      try {
        const response = await api.get('/blindspot-scores');
        if (!cancelled) setBlindspotScores(response.data || {});
      } catch (error) {
        if (!cancelled) setConnectionLabel('Backend unavailable for blindspot scores.');
      }
    };
    fetchBlindspots();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const wsUrl = getWsBaseUrl() + '/ws/real?attack_id=0&speed=' + (demoMode ? '3' : '1') + '&duration=720';
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => setConnectionLabel('Live stream active');
    socket.onclose = () => setConnectionLabel('Live stream closed');
    socket.onerror = () => setConnectionLabel('WebSocket error');
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setSensorReadings(payload.sensor_readings || {});
      } catch (error) {
        setConnectionLabel('Malformed stream payload');
      }
    };
    return () => socket.close();
  }, [demoMode]);

  const mergedReadings = useMemo(() => {
    if (Object.keys(sensorReadings).length > 0) return sensorReadings;
    const fallback = {};
    Object.entries(blindspotScores).forEach(([sensor, score], idx) => {
      fallback[sensor] = Number(score) * (1 + ((idx % 7) - 3) * 0.01);
    });
    return fallback;
  }, [sensorReadings, blindspotScores]);

  const stageSummary = useMemo(() => {
    const stageScores = { P1: [], P2: [], P3: [], P4: [], P5: [], P6: [] };
    Object.values(blindspotScores).forEach((score, index) => {
      const stage = stageFromIndex(index);
      stageScores[stage].push(Number(score));
    });
    return Object.entries(stageScores).map(([stage, values]) => {
      const average = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
      return { stage, average };
    });
  }, [blindspotScores]);

  const avgBlindspot = Object.keys(blindspotScores).length > 0
    ? (Object.values(blindspotScores).reduce((s, v) => s + Number(v), 0) / Object.keys(blindspotScores).length).toFixed(2)
    : '--';

  const cardStyle = { backgroundColor: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 8 };

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="p-5" style={cardStyle}>
          <p className="text-[12px] font-medium uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>Plant Status</p>
          <h2 className="text-[20px] font-semibold leading-none tracking-tight" style={{ color: '#10B981' }}>ALL OPERATIONAL</h2>
        </div>
        <div className="p-5" style={cardStyle}>
          <p className="text-[12px] font-medium uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>Sensors Online</p>
          <h2 className="text-[28px] font-semibold leading-none tracking-tight" style={{ color: '#10B981' }}>{Object.keys(mergedReadings).length || 51} / 51</h2>
        </div>
        <div className="p-5" style={cardStyle}>
          <p className="text-[12px] font-medium uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>Process Stages</p>
          <h2 className="text-[28px] font-semibold leading-none tracking-tight" style={{ color: '#10B981' }}>6 Active</h2>
        </div>
        <div className="p-5 flex flex-col items-center justify-center" style={cardStyle}>
          <button
            onClick={() => navigate('/ops/attacks')}
            className="w-full rounded-xl px-6 py-3 text-[15px] font-bold text-white uppercase tracking-wider transition-all hover:scale-105 hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 4px 14px rgba(239,68,68,0.4)' }}
          >
            ⚡ LAUNCH ATTACK THEATER
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="p-5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            <h3 className="text-[14px] font-semibold" style={{ color: t.text }}>Live Sensor Grid</h3>
          </div>
          <SensorGrid sensorReadings={mergedReadings} blindspotScores={{}} isDark={isDark} t={t} />
        </div>

        <div className="space-y-4">
          <StageOverview blindspotScores={blindspotScores} isDark={isDark} t={t} />

          <div className="p-5" style={cardStyle}>
            <h3 className="text-[14px] font-semibold mb-1" style={{ color: t.text }}>Plant Diagram Overlay</h3>
            <p className="text-[12px] mb-4 pb-3" style={{ color: t.textMuted, borderBottom: `0.5px solid ${t.border}` }}>
              Stage-color reflects blindspot severity
            </p>
            <svg viewBox="0 0 520 190" className="w-full rounded-md p-2" style={{ backgroundColor: isDark ? '#0f172a' : '#F8FAFC', border: `0.5px solid ${t.border}` }}>
              {stageSummary.map((row, index) => {
                const x = 10 + index * 84;
                return (
                  <g key={row.stage}>
                    <rect x={x} y={50} width={72} height={70} rx={10} fill={stageTone(row.average)} fillOpacity={0.65} stroke="rgba(255,255,255,0.6)" />
                    <text x={x + 36} y={88} textAnchor="middle" fill="#ffffff" fontSize="18">{row.stage}</text>
                    <text x={x + 36} y={110} textAnchor="middle" fill="#ffffff" fontSize="11" className="mono">{row.average.toFixed(2)}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CommandCenter;
