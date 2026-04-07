import { useEffect, useMemo, useRef, useState } from 'react';
import Plot from 'react-plotly.js';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { api, getWsBaseUrl } from '../api/client';
import GnnRelationshipPanel from '../components/GnnRelationshipPanel';
import SensorGrid from '../components/SensorGrid';

const STAGE_REP_SENSORS = ['Feature_0', 'Feature_9', 'Feature_17', 'Feature_26', 'Feature_34', 'Feature_43'];
const RELATIONSHIP_EDGES = [[0,1],[1,2],[2,3],[3,4],[4,5],[0,2],[2,4]];
const BASELINE_SAMPLE_COUNT = 5;

function edgeKey(a, b) { return a + '-' + b; }
function safeNumber(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function extractEdgeMap(readings) {
  const vals = STAGE_REP_SENSORS.map(s => safeNumber(readings[s]));
  const m = {};
  RELATIONSHIP_EDGES.forEach(([a, b]) => { m[edgeKey(a, b)] = vals[b] - vals[a]; });
  return m;
}

function meanEdgeMap(maps) {
  if (!maps.length) return {};
  const agg = {};
  maps.forEach(m => Object.entries(m).forEach(([k, v]) => { agg[k] = (agg[k] || 0) + Number(v); }));
  const out = {};
  Object.entries(agg).forEach(([k, v]) => { out[k] = v / maps.length; });
  return out;
}

function AttackTheater() {
  const { demoMode, isDark, t } = useOutletContext();
  const [searchParams] = useSearchParams();
  const [attacks, setAttacks] = useState([]);
  const [blindspotScores, setBlindspotScores] = useState({});
  const [selectedAttackId, setSelectedAttackId] = useState(0);
  const [sensorReadings, setSensorReadings] = useState({});
  const [timeline, setTimeline] = useState({ x: [], lines: {} });
  const [flashingSensors, setFlashingSensors] = useState([]);
  const [streamStatus, setStreamStatus] = useState('idle');
  const [latestTimestep, setLatestTimestep] = useState(0);
  const [relationshipSnapshot, setRelationshipSnapshot] = useState({
    integrityScore: 100, edgesBroken: 0, totalEdges: RELATIONSHIP_EDGES.length,
    gnnAlertLatencySec: null, baselineDetectionRate: null,
    edgeStates: RELATIONSHIP_EDGES.map(([a, b]) => ({ fromId: a, toId: b, broken: false, deviation: 0 })),
  });

  const socketRef = useRef(null);
  const prevRef = useRef({});
  const baselineSamplesRef = useRef([]);
  const baselineRef = useRef({});
  const alertFrameRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [aRes, bRes] = await Promise.all([api.get('/attacks?limit=300'), api.get('/blindspot-scores')]);
        if (cancelled) return;
        const loaded = aRes.data || [];
        setAttacks(loaded);
        setBlindspotScores(bRes.data || {});
        const fromQ = Number(searchParams.get('attackId'));
        if (!Number.isNaN(fromQ) && loaded.some(a => a.attack_id === fromQ)) setSelectedAttackId(fromQ);
        else if (loaded.length > 0) setSelectedAttackId(loaded[0].attack_id);
      } catch { setStreamStatus('error_loading'); }
    };
    load();
    return () => { cancelled = true; };
  }, [searchParams]);

  useEffect(() => () => { if (socketRef.current) socketRef.current.close(); }, []);

  const selectedAttack = useMemo(() => attacks.find(a => a.attack_id === Number(selectedAttackId)), [attacks, selectedAttackId]);

  const stopStream = () => { if (socketRef.current) { socketRef.current.close(); socketRef.current = null; } setStreamStatus('stopped'); };

  const startStream = () => {
    if (!selectedAttack) return;
    stopStream();
    setTimeline({ x: [], lines: {} });
    prevRef.current = {};
    baselineSamplesRef.current = [];
    baselineRef.current = {};
    alertFrameRef.current = null;
    setLatestTimestep(0);
    setRelationshipSnapshot({
      integrityScore: 100, edgesBroken: 0, totalEdges: RELATIONSHIP_EDGES.length,
      gnnAlertLatencySec: null,
      baselineDetectionRate: selectedAttack?.detection_rate != null ? Number(selectedAttack.detection_rate) : null,
      edgeStates: RELATIONSHIP_EDGES.map(([a, b]) => ({ fromId: a, toId: b, broken: false, deviation: 0 })),
    });

    const speed = demoMode ? 3 : 1;
    const ws = new WebSocket(getWsBaseUrl() + '/ws/simulation?attack_id=' + selectedAttack.attack_id + '&speed=' + speed + '&duration=260');
    socketRef.current = ws;
    ws.onopen = () => setStreamStatus('running');
    ws.onclose = () => setStreamStatus('closed');
    ws.onerror = () => setStreamStatus('stream_error');
    ws.onmessage = (event) => {
      try {
        const p = JSON.parse(event.data);
        const nr = p.sensor_readings || {};
        const ft = Number(p.timestep || 0);
        setLatestTimestep(ft);
        setSensorReadings(nr);
        const tracked = Object.keys(nr).slice(0, 6);
        setTimeline(c => {
          const nx = [...c.x, p.timestep].slice(-120);
          const nl = { ...c.lines };
          tracked.forEach(s => { nl[s] = [...(nl[s] || []), Number(nr[s])].slice(-120); });
          return { x: nx, lines: nl };
        });
        const prev = prevRef.current;
        setFlashingSensors(tracked.filter(s => Math.abs(Number(nr[s]||0) - Number(prev[s]||0)) > Math.max(0.5, Math.abs(Number(prev[s]||0))*0.08)));
        prevRef.current = nr;
        const em = extractEdgeMap(nr);
        if (!Object.keys(baselineRef.current).length) {
          baselineSamplesRef.current.push(em);
          if (baselineSamplesRef.current.length >= BASELINE_SAMPLE_COUNT) baselineRef.current = meanEdgeMap(baselineSamplesRef.current);
        }
        const bm = baselineRef.current;
        const sigma = Number(selectedAttack?.sigma || 1);
        const thresh = Math.max(0.26, 0.5 - sigma * 0.06);
        let broken = 0, devTotal = 0;
        const es = RELATIONSHIP_EDGES.map(([a, b]) => {
          const k = edgeKey(a, b);
          const dev = Math.abs(Number(em[k]||0) - Number(bm[k]||0)) / Math.max(0.8, Math.abs(Number(bm[k]||0)));
          const isBroken = Object.keys(bm).length > 0 && dev > thresh;
          devTotal += dev;
          if (isBroken) broken++;
          return { fromId: a, toId: b, broken: isBroken, deviation: dev };
        });
        if (broken > 0 && alertFrameRef.current === null) alertFrameRef.current = ft;
        const avgDev = es.length ? devTotal / es.length : 0;
        setRelationshipSnapshot({
          integrityScore: Math.max(0, 100 - (broken / RELATIONSHIP_EDGES.length) * 55 - Math.min(45, avgDev * 26)),
          edgesBroken: broken, totalEdges: RELATIONSHIP_EDGES.length,
          gnnAlertLatencySec: typeof alertFrameRef.current === 'number' && alertFrameRef.current > 0 ? alertFrameRef.current : null,
          baselineDetectionRate: selectedAttack?.detection_rate != null ? Number(selectedAttack.detection_rate) : null,
          edgeStates: es,
        });
      } catch { setStreamStatus('payload_error'); }
    };
  };

  const traces = Object.entries(timeline.lines).map(([name, values]) => ({
    x: timeline.x.slice(-values.length), y: values, type: 'scatter', mode: 'lines', name,
  }));

  const card = { backgroundColor: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 8 };
  const chip = { backgroundColor: isDark ? '#1e293b' : '#F1F5F9', border: `0.5px solid ${t.border}`, borderRadius: 6 };
  const plotTheme = { paper_bgcolor: 'transparent', plot_bgcolor: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(241,245,249,0.8)', font: { color: t.text, family: 'Inter' } };

  return (
    <section className="space-y-4">
      {/* Attack selector */}
      <div className="p-5" style={card}>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <select value={selectedAttackId} onChange={e => setSelectedAttackId(Number(e.target.value))}
            className="rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            style={{ backgroundColor: t.inputBg, border: `0.5px solid ${t.border}`, color: t.text }}>
            {attacks.map(a => <option key={a.attack_id} value={a.attack_id}>#{a.attack_id} | {a.attack_type} | {a.target_stage} | Rank {a.rank_score}</option>)}
          </select>
          <button onClick={startStream} className="rounded-lg px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90" style={{ backgroundColor: '#10B981' }}>Launch Attack</button>
          <button onClick={stopStream} className="rounded-lg px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90" style={{ backgroundColor: '#EF4444' }}>Stop</button>
        </div>
        <p className="mt-2 text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>Stream status: {streamStatus}</p>
        {selectedAttack && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {[['ID', selectedAttack.attack_id], ['Type', selectedAttack.attack_type], ['Stage', selectedAttack.target_stage], ['Impact', selectedAttack.impact_score], ['Detection', selectedAttack.detection_rate + '%']].map(([l, v]) => (
              <div key={l} className="rounded-md p-2 text-[13px]" style={chip}>
                <span style={{ color: t.textMuted }}>{l}: </span><span className="font-medium" style={{ color: t.text }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <GnnRelationshipPanel relationshipSnapshot={relationshipSnapshot} streamStatus={streamStatus} isDark={isDark} t={t} />

      {/* Timeline chart */}
      <div className="p-5" style={card}>
        <h3 className="text-[14px] font-semibold mb-3" style={{ color: t.text }}>Live Affected Sensor Timeline</h3>
        <Plot data={traces} layout={{ ...plotTheme, margin: { t: 20, r: 20, b: 35, l: 45 }, xaxis: { title: 'Timestep', gridcolor: t.border }, yaxis: { title: 'Value', gridcolor: t.border }, legend: { orientation: 'h' } }}
          style={{ width: '100%', height: '320px' }} useResizeHandler config={{ displaylogo: false }} />
      </div>

      {/* Sensor grid */}
      <div className="p-5" style={card}>
        <h3 className="text-[14px] font-semibold mb-1" style={{ color: t.text }}>Real-Time Sensor Deviation Grid</h3>
        <p className="text-[11px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Timestep: {latestTimestep || '--'}</p>
        <SensorGrid sensorReadings={sensorReadings} blindspotScores={blindspotScores} flashingSensors={flashingSensors} isDark={isDark} t={t} />
      </div>
    </section>
  );
}

export default AttackTheater;
