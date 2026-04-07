import { useEffect, useState } from 'react';
import { api } from '../api/client';

const STAGES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
const STAGE_NAMES = { P1: 'Raw Water Intake', P2: 'Chemical Dosing', P3: 'Ultrafiltration', P4: 'Dechlorination', P5: 'Reverse Osmosis', P6: 'Backwash' };

function impactColor(score) {
  if (score >= 80) return '#ef4444';
  if (score >= 50) return '#f59e0b';
  if (score >= 30) return '#eab308';
  return '#22c55e';
}

function DigitalTwin() {
  const [impact, setImpact] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [impRes, gapRes] = await Promise.all([
          api.get('/api/p2/impact-summary'),
          api.get('/gaps?limit=60'),
        ]);
        setImpact(impRes.data);
        setGaps(gapRes.data?.gaps || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="glass-panel rounded-xl p-8 text-center text-slate-300">Loading SimPy Digital Twin data...</div>;

  const stageData = {};
  STAGES.forEach(s => { stageData[s] = (impact?.by_stage || []).find(x => x.target_stage === s) || { count: 0, mean_impact: 0, max_impact: 0, total_violations: 0 }; });
  const stageGaps = {};
  STAGES.forEach(s => { stageGaps[s] = gaps.filter(g => g.target_stage === s); });

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="glass-panel rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mono text-xs uppercase tracking-[0.3em] text-amber-300">Person 2 — Layer 3</p>
            <h2 className="text-2xl font-bold text-cloud">SimPy Digital Twin Simulator</h2>
            <p className="mt-1 text-sm text-slate-300">SWaT process simulation with safety-violation-driven impact scoring</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-lg border border-white/15 bg-black/25 px-4 py-2 text-center">
              <p className="mono text-[10px] uppercase text-slate-400">Attacks Simulated</p>
              <p className="text-xl font-bold text-cloud">{impact?.total_attacks || 0}</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-black/25 px-4 py-2 text-center">
              <p className="mono text-[10px] uppercase text-slate-400">Avg Impact</p>
              <p className="text-xl font-bold" style={{ color: impactColor(impact?.avg_impact || 0) }}>{impact?.avg_impact || 0}</p>
            </div>
            <div className="rounded-lg border border-ember/30 bg-ember/8 px-4 py-2 text-center">
              <p className="mono text-[10px] uppercase text-slate-400">Max Impact</p>
              <p className="text-xl font-bold text-ember">{impact?.max_impact || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Pipeline */}
      <div className="glass-panel rounded-xl p-5">
        <h3 className="mb-4 text-lg font-semibold text-cloud">SWaT 6-Stage Process Pipeline</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {STAGES.map((stage, i) => {
            const data = stageData[stage];
            const gapCount = stageGaps[stage].length;
            const impactPct = Math.min(100, data.mean_impact || 0);
            return (
              <div key={stage} className="group relative overflow-hidden rounded-xl border border-white/12 bg-gradient-to-b from-black/30 to-black/50 p-4 transition hover:border-white/25">
                {/* Connection arrow */}
                {i < 5 && <div className="absolute -right-2 top-1/2 z-10 hidden text-xl text-slate-500 xl:block">→</div>}
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-md border border-white/20 bg-white/8 px-2 py-0.5 text-xs font-bold text-cloud">{stage}</span>
                  {gapCount > 0 && (
                    <span className="rounded-full bg-ember/20 px-2 py-0.5 text-[10px] font-bold text-ember">{gapCount} gaps</span>
                  )}
                </div>
                <p className="mb-3 text-xs text-slate-400">{STAGE_NAMES[stage]}</p>
                {/* Impact bar */}
                <div className="mb-1 h-3 w-full overflow-hidden rounded-full bg-black/50">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${impactPct}%`, background: `linear-gradient(90deg, ${impactColor(impactPct)}, ${impactColor(impactPct)}88)` }} />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="mono text-slate-400">Impact</span>
                  <span className="mono font-semibold" style={{ color: impactColor(impactPct) }}>{impactPct.toFixed(1)}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
                  <div className="rounded bg-black/30 px-1.5 py-1 text-center">
                    <span className="text-slate-400">Attacks</span><br/>
                    <span className="font-semibold text-cloud">{data.count}</span>
                  </div>
                  <div className="rounded bg-black/30 px-1.5 py-1 text-center">
                    <span className="text-slate-400">Violations</span><br/>
                    <span className="font-semibold text-amber-300">{(data.total_violations || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Dangerous Attacks + Gap Discovery */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel rounded-xl p-5">
          <h3 className="mb-3 text-lg font-semibold text-cloud">🔥 Top 10 Most Dangerous Attacks</h3>
          <p className="mono mb-3 text-[10px] uppercase tracking-[0.2em] text-slate-400">Ranked by physical impact score from SimPy simulation</p>
          <div className="space-y-2">
            {(impact?.top_attacks || []).map((atk, i) => (
              <div key={atk.attack_id} className="flex items-center gap-3 rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ember/20 text-[10px] font-bold text-ember">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-cloud">{atk.attack_id}</p>
                  <p className="mono text-[10px] text-slate-400">{atk.target_stage} — {atk.attack_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: impactColor(atk.impact_score) }}>{atk.impact_score}</p>
                  <p className="mono text-[10px] text-slate-400">{atk.total_violations} violations</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-xl p-5">
          <h3 className="mb-3 text-lg font-semibold text-cloud">🕳️ Security Gap Discovery</h3>
          <p className="mono mb-3 text-[10px] uppercase tracking-[0.2em] text-slate-400">High impact + low detection = critical blind spots</p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-ember/25 bg-ember/8 p-2 text-center">
              <p className="text-xl font-bold text-ember">{gaps.length}</p>
              <p className="mono text-[10px] text-slate-400">Total Gaps</p>
            </div>
            <div className="rounded-lg border border-amber-300/25 bg-amber-900/15 p-2 text-center">
              <p className="text-xl font-bold text-amber-300">{gaps.filter(g => g.impact_score >= 80).length}</p>
              <p className="mono text-[10px] text-slate-400">Critical</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-black/25 p-2 text-center">
              <p className="text-xl font-bold text-cloud">{new Set(gaps.map(g => g.target_stage)).size}</p>
              <p className="mono text-[10px] text-slate-400">Stages Hit</p>
            </div>
          </div>
          <div className="max-h-[320px] space-y-1.5 overflow-y-auto">
            {gaps.slice(0, 20).map((gap, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-white/8 bg-black/15 px-3 py-1.5 text-xs">
                <span className="w-8 shrink-0 font-bold text-slate-400">#{gap.attack_id}</span>
                <span className="w-10 shrink-0 font-semibold text-cloud">{gap.target_stage}</span>
                <span className="flex-1 truncate text-slate-300">{gap.gap_type || gap.attack_type || 'gap'}</span>
                <span className="mono font-semibold" style={{ color: impactColor(gap.impact_score) }}>{Number(gap.impact_score).toFixed(1)}</span>
                <span className="mono text-slate-400">→ {Number(gap.detection_rate).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default DigitalTwin;
