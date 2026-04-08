import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, getWsBaseUrl } from '../api/client';
import SensorGrid from '../components/SensorGrid';
import { Terminal, Shield, Activity, Fingerprint } from 'lucide-react';

function extractSensorsFromCommand(commandText) {
  const sensors = [];
  const pattern = /([A-Z]{2,5}\d{3})/gi;
  let match = pattern.exec(commandText);
  while (match) { sensors.push(match[1]); match = pattern.exec(commandText); }
  return sensors;
}

function MetricCard({ title, value, icon: Icon, valueColor, t }) {
  return (
    <div className="p-4 flex items-center justify-between" style={{ backgroundColor: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 8 }}>
      <div>
        <p className="text-[12px] font-medium uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>{title}</p>
        <p className="text-[28px] font-semibold tracking-tight" style={{ color: valueColor || t.text }}>{value}</p>
      </div>
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: t.inputBg }}>
        <Icon size={20} style={{ color: t.textMuted }} />
      </div>
    </div>
  );
}

export default function MirrorPage() {
  const { demoMode, isDark, t } = useOutletContext();
  const [decoyReadings, setDecoyReadings] = useState({});
  const [realReadings, setRealReadings] = useState({});
  const [mirrorStatus, setMirrorStatus] = useState(null);
  const [commandText, setCommandText] = useState('set LIT101 to 0.95');
  const [commandResult, setCommandResult] = useState('');

  useEffect(() => {
    const speed = demoMode ? 3 : 1;
    const decoySocket = new WebSocket(getWsBaseUrl() + '/ws/decoy?attack_id=0&speed=' + speed + '&duration=720');
    const realSocket = new WebSocket(getWsBaseUrl() + '/ws/real?attack_id=0&speed=' + speed + '&duration=720');
    decoySocket.onmessage = (e) => { try { setDecoyReadings(JSON.parse(e.data).sensor_readings || {}); } catch {} };
    realSocket.onmessage = (e) => { try { setRealReadings(JSON.parse(e.data).sensor_readings || {}); } catch {} };
    return () => { decoySocket.close(); realSocket.close(); };
  }, [demoMode]);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try { const r = await api.get('/mirror/status'); if (!cancelled) setMirrorStatus(r.data); }
      catch { if (!cancelled) setMirrorStatus(null); }
    };
    pull();
    const timer = setInterval(pull, 3000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const submitCommand = async () => {
    try {
      const sensors = extractSensorsFromCommand(commandText);
      const response = await api.post('/attacker/probe', { query_type: 'probe', sensors_queried: sensors, command_sent: commandText });
      setCommandResult('Probe intercepted and captured.');
      setMirrorStatus((c) => c ? { ...c, attacker_profile: response.data.attacker_profile } : c);
    } catch { setCommandResult('Probe failed. Ensure connection.'); }
  };

  const cardStyle = { backgroundColor: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 8 };
  const innerBg = { backgroundColor: isDark ? '#1e293b' : '#F8FAFC', border: `0.5px solid ${t.border}`, borderRadius: 6 };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Active Session" value={mirrorStatus?.session_id ? mirrorStatus.session_id.substring(0,6) : 'None'} icon={Activity} valueColor={mirrorStatus?.session_id ? '#2563EB' : undefined} t={t} />
        <MetricCard title="Patches Deployed" value={mirrorStatus?.patches_deployed || 0} icon={Shield} t={t} />
        <MetricCard title="Attacker Archetype" value={mirrorStatus?.attacker_profile?.archetype || 'Unknown'} icon={Fingerprint} t={t} />
        <MetricCard title="Genome Confidence" value={mirrorStatus?.attacker_profile?.confidence || '--'} icon={Terminal} valueColor="#F59E0B" t={t} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Attacker */}
        <div className="p-5 flex flex-col min-h-[600px]" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#EF4444' }}></div>
            <h2 className="text-[14px] font-semibold" style={{ color: t.text }}>Attacker Telemetry Hook</h2>
            <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: isDark ? '#1e293b' : '#F1F5F9', color: t.textMuted }}>Environment: Decoy</span>
          </div>

          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-[12px] mb-1" style={{ color: t.textMuted }}>Execute Remote Probe</label>
              <div className="flex gap-2">
                <input type="text" className="flex-1 px-3 py-1.5 rounded-md font-mono text-[13px] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  style={{ backgroundColor: t.inputBg, border: `0.5px solid ${t.border}`, color: t.text }}
                  value={commandText} onChange={(e) => setCommandText(e.target.value)}
                />
                <button onClick={submitCommand} className="px-4 py-1.5 rounded-md text-[13px] font-medium text-white hover:opacity-90 transition" style={{ backgroundColor: '#2563EB' }}>Execute</button>
              </div>
              {commandResult && <p className="mt-1.5 text-[12px]" style={{ color: '#EF4444' }}>{commandResult}</p>}
            </div>
          </div>

          <div className="flex-1 rounded-md p-4" style={innerBg}>
            <h3 className="text-[11px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Simulated Feedback Stream</h3>
            <SensorGrid sensorReadings={decoyReadings} blindspotScores={{}} compact isDark={isDark} t={t} />
          </div>
        </div>

        {/* Defender */}
        <div className="p-5 flex flex-col min-h-[600px]" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
            <h2 className="text-[14px] font-semibold" style={{ color: t.text }}>True Plant State</h2>
            <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', color: '#10B981', border: `0.5px solid ${isDark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'}` }}>Secure Operations</span>
          </div>

          <div className="flex-1 rounded-md p-4 mb-4" style={innerBg}>
            <h3 className="text-[11px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Protected Production Array</h3>
            <SensorGrid sensorReadings={realReadings} blindspotScores={{}} compact isDark={isDark} t={t} />
          </div>

          <div>
            <h3 className="text-[12px] font-medium mb-2" style={{ color: t.textSecondary }}>Mirror Activity Log</h3>
            <div className="h-32 overflow-y-auto rounded-md p-2" style={{ backgroundColor: t.surface, border: `0.5px solid ${t.border}` }}>
              {(!mirrorStatus?.recent_actions || mirrorStatus.recent_actions.length === 0) ? (
                <div className="text-[12px] text-center py-4" style={{ color: t.textMuted }}>No events recorded</div>
              ) : (
                mirrorStatus.recent_actions.slice(-10).map((item, idx) => (
                  <div key={`${idx}-${item.timestamp}`} className="flex items-center gap-3 py-1.5" style={{ borderBottom: `0.5px solid ${isDark ? '#1e293b50' : '#F8FAFC'}` }}>
                    <span className="font-mono text-[11px] w-20" style={{ color: t.textMuted }}>{item.timestamp}</span>
                    <span className="text-[11px] font-medium" style={{ color: item.type === 'attack_started' ? '#EF4444' : '#2563EB' }}>{item.type}</span>
                    <span className="text-[11px] truncate" style={{ color: t.textSecondary }}>Target: {(item.target_sensors || []).join(', ')}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
