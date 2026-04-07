import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';

const STAGES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
const STAGE_NAMES = { P1: 'Raw Water Intake', P2: 'Chemical Dosing', P3: 'Ultrafiltration', P4: 'Dechlorination', P5: 'Reverse Osmosis', P6: 'Backwash' };

function impactColor(s) {
  if (s >= 80) return '#EF4444';
  if (s >= 50) return '#F59E0B';
  if (s >= 30) return '#eab308';
  return '#10B981';
}

function DigitalTwin() {
  const { isDark, t } = useOutletContext();
  const [impact, setImpact] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [iR, gR] = await Promise.all([api.get('/api/p2/impact-summary'), api.get('/gaps?limit=60')]);
        setImpact(iR.data);
        setGaps(gR.data?.gaps || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const card = { backgroundColor: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 8 };
  const chip = { backgroundColor: isDark ? '#1e293b' : '#F1F5F9', border: `0.5px solid ${t.border}`, borderRadius: 6 };

  if (loading) return <div className="p-8 text-center text-[13px]" style={{ ...card, color: t.textMuted }}>Loading SimPy Digital Twin data...</div>;

  const stageData = {};
  STAGES.forEach(s => { stageData[s] = (impact?.by_stage || []).find(x => x.target_stage === s) || { count: 0, mean_impact: 0, max_impact: 0, total_violations: 0 }; });
  const stageGaps = {};
  STAGES.forEach(s => { stageGaps[s] = gaps.filter(g => g.target_stage === s); });

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="p-5" style={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#F59E0B' }}>Digital Twin — SimPy Engine</p>
            <h2 className="text-xl font-semibold" style={{ color: t.text }}>SWaT Process Simulator</h2>
            <p className="mt-1 text-[13px]" style={{ color: t.textSecondary }}>Safety-violation-driven impact scoring across 6 process stages</p>
          </div>
          <div className="flex gap-3">
            {[
              ['Attacks Simulated', impact?.total_attacks || 0, t.text],
              ['Avg Impact', impact?.avg_impact || 0, impactColor(impact?.avg_impact || 0)],
              ['Max Impact', impact?.max_impact || 0, '#EF4444'],
            ].map(([label, val, color]) => (
              <div key={label} className="px-4 py-2.5 text-center rounded-lg" style={chip}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>{label}</p>
                <p className="text-xl font-bold mt-0.5" style={{ color }}>{val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stage Pipeline */}
      <div className="p-5" style={card}>
        <h3 className="text-[14px] font-semibold mb-4" style={{ color: t.text }}>SWaT 6-Stage Process Pipeline</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {STAGES.map((stage, i) => {
            const data = stageData[stage];
            const gapCount = stageGaps[stage].length;
            const impactPct = Math.min(100, data.mean_impact || 0);
            return (
              <div key={stage} className="relative overflow-hidden rounded-lg p-4 transition" style={{ ...chip }}>
                {i < 5 && <div className="absolute -right-2 top-1/2 z-10 hidden text-xl xl:block" style={{ color: t.textMuted }}>→</div>}
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: isDark ? '#0f172a' : '#FFFFFF', border: `0.5px solid ${t.border}`, color: t.text }}>{stage}</span>
                  {gapCount > 0 && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2', color: '#EF4444' }}>{gapCount} gaps</span>}
                </div>
                <p className="mb-3 text-[11px]" style={{ color: t.textMuted }}>{STAGE_NAMES[stage]}</p>
                <div className="mb-1 h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: isDark ? '#334155' : '#E2E8F0' }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${impactPct}%`, backgroundColor: impactColor(impactPct) }} />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span style={{ color: t.textMuted }}>Impact</span>
                  <span className="font-semibold" style={{ color: impactColor(impactPct) }}>{impactPct.toFixed(1)}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
                  {[['Attacks', data.count, t.text], ['Violations', (data.total_violations || 0).toLocaleString(), '#F59E0B']].map(([l, v, c]) => (
                    <div key={l} className="rounded px-1.5 py-1 text-center" style={{ backgroundColor: isDark ? '#0f172a' : '#FFFFFF', border: `0.5px solid ${t.border}` }}>
                      <span style={{ color: t.textMuted }}>{l}</span><br />
                      <span className="font-semibold" style={{ color: c }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: Top attacks + Gaps */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="p-5" style={card}>
          <h3 className="text-[14px] font-semibold mb-1" style={{ color: t.text }}>Top 10 Most Dangerous Attacks</h3>
          <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Ranked by physical impact score from SimPy simulation</p>
          <div className="space-y-2">
            {(impact?.top_attacks || []).map((a, i) => (
              <div key={a.attack_id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={chip}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2', color: '#EF4444' }}>#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-medium" style={{ color: t.text }}>{a.attack_id}</p>
                  <p className="text-[10px]" style={{ color: t.textMuted }}>{a.target_stage} — {a.attack_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold" style={{ color: impactColor(a.impact_score) }}>{a.impact_score}</p>
                  <p className="text-[10px]" style={{ color: t.textMuted }}>{a.total_violations} violations</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5" style={card}>
          <h3 className="text-[14px] font-semibold mb-1" style={{ color: t.text }}>Security Gap Discovery</h3>
          <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>High impact + low detection = critical blind spots</p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {[
              ['Total Gaps', gaps.length, '#EF4444'],
              ['Critical', gaps.filter(g => g.impact_score >= 80).length, '#F59E0B'],
              ['Stages Hit', new Set(gaps.map(g => g.target_stage)).size, t.text],
            ].map(([label, val, color]) => (
              <div key={label} className="rounded-lg p-2 text-center" style={chip}>
                <p className="text-xl font-bold" style={{ color }}>{val}</p>
                <p className="text-[10px]" style={{ color: t.textMuted }}>{label}</p>
              </div>
            ))}
          </div>
          <div className="max-h-[320px] space-y-1.5 overflow-y-auto">
            {gaps.slice(0, 20).map((g, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px]" style={chip}>
                <span className="w-8 shrink-0 font-bold" style={{ color: t.textMuted }}>#{g.attack_id}</span>
                <span className="w-10 shrink-0 font-semibold" style={{ color: t.text }}>{g.target_stage}</span>
                <span className="flex-1 truncate" style={{ color: t.textSecondary }}>{g.gap_type || g.attack_type || 'gap'}</span>
                <span className="font-semibold" style={{ color: impactColor(g.impact_score) }}>{Number(g.impact_score).toFixed(1)}</span>
                <span style={{ color: t.textMuted }}>→ {Number(g.detection_rate).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default DigitalTwin;
