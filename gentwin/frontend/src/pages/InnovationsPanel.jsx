import { useEffect, useState } from 'react';
import { api } from '../api/client';

function riskColor(score) {
  if (score >= 80) return '#5fd3b6';
  if (score >= 50) return '#f3b45f';
  return '#f1695b';
}

function qColor(val) {
  if (val >= 2.0) return '#5fd3b6';
  if (val >= 1.0) return '#f3b45f';
  if (val >= 0) return '#fbbf24';
  return '#ef4444';
}

function InnovationsPanel() {
  const [immunity, setImmunity] = useState([]);
  const [rl, setRl] = useState(null);
  const [dna, setDna] = useState([]);
  const [timeline, setTimeline] = useState({ events: [], critical_gaps: 0 });
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [immRes, rlRes, dnaRes, tlRes, impRes] = await Promise.all([
          api.get('/api/p2/immunity'),
          api.get('/api/p2/rl-qtable'),
          api.get('/api/p2/dna?limit=30'),
          api.get('/api/p2/timeline?limit=60'),
          api.get('/api/p2/impact-summary'),
        ]);
        setImmunity(immRes.data?.stages || []);
        setRl(rlRes.data || null);
        setDna(dnaRes.data?.fingerprints || []);
        setTimeline(tlRes.data || { events: [], critical_gaps: 0 });
        setImpact(impRes.data || null);
      } catch (err) {
        console.error('Failed to load Person 2 data:', err);
      }
    };
    load();
  }, []);

  return (
    <section className="space-y-5">

      {/* ── Impact Summary ── */}
      <div className="glass-panel rounded-xl p-5">
        <h3 className="text-lg font-semibold text-cloud">SimPy Impact Analysis</h3>
        <p className="mono mb-3 text-xs uppercase tracking-[0.2em] text-slate-300">
          Person 2 — Digital Twin Simulation
        </p>
        {impact ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/15 bg-black/25 p-3">
                <p className="mono text-xs text-slate-400">Attacks Simulated</p>
                <p className="text-2xl font-bold text-cloud">{impact.total_attacks}</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-black/25 p-3">
                <p className="mono text-xs text-slate-400">Avg Impact</p>
                <p className="text-2xl font-bold" style={{ color: riskColor(100 - impact.avg_impact) }}>{impact.avg_impact}</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-black/25 p-3">
                <p className="mono text-xs text-slate-400">Max Impact</p>
                <p className="text-2xl font-bold text-ember">{impact.max_impact}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {(impact.by_stage || []).map((s) => (
                <div key={s.target_stage} className="rounded-lg border border-white/10 bg-black/20 p-2 text-center text-sm">
                  <p className="font-semibold text-cloud">{s.target_stage}</p>
                  <p className="mono text-xs text-slate-300">{s.count} atks | μ {s.mean_impact?.toFixed(1)}</p>
                </div>
              ))}
            </div>
          </>
        ) : <p className="text-sm text-slate-400">Loading impact data...</p>}
      </div>

      {/* ── Immunity Scores ── */}
      <div className="glass-panel rounded-xl p-5">
        <h3 className="text-lg font-semibold text-cloud">Stage Immunity Scores</h3>
        <p className="mono mb-3 text-xs uppercase tracking-[0.2em] text-slate-300">
          Higher = more resilient against attacks
        </p>
        {immunity.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {immunity.map((s) => (
              <div key={s.target_stage} className="rounded-xl border border-white/15 bg-black/25 p-4 text-center">
                <p className="mono text-xs uppercase tracking-[0.15em] text-slate-300">{s.target_stage}</p>
                <p className="text-3xl font-bold" style={{ color: riskColor(s.immunity_score) }}>
                  {s.immunity_score?.toFixed(1)}
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, s.immunity_score)}%`,
                      background: riskColor(s.immunity_score),
                    }}
                  />
                </div>
                <p className="mono mt-1 text-[10px] text-slate-400">
                  {s.n_gaps} gaps | detect {(s.mean_detect * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-400">No immunity data. Run Person 2 pipeline.</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── RL Q-Table ── */}
        <div className="glass-panel rounded-xl p-5">
          <h3 className="text-lg font-semibold text-cloud">RL Adaptive Defense</h3>
          <p className="mono mb-3 text-xs uppercase tracking-[0.2em] text-slate-300">
            Q-Learning Policy Table
          </p>
          {rl ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/15">
                      <th className="py-2 pr-3 text-left text-xs uppercase text-slate-400">State</th>
                      {rl.actions.map((a) => (
                        <th key={a} className="py-2 px-2 text-center text-xs uppercase text-slate-400">{a}</th>
                      ))}
                      <th className="py-2 pl-3 text-center text-xs uppercase text-mint">Best</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rl.states.map((state) => (
                      <tr key={state} className="border-b border-white/8">
                        <td className="py-2 pr-3 font-semibold text-cloud">{state}</td>
                        {rl.actions.map((action) => {
                          const val = rl.q_values[state]?.[action] || 0;
                          const isBest = rl.best_actions[state] === action;
                          return (
                            <td key={action} className="py-2 px-2 text-center">
                              <span
                                className="mono rounded px-2 py-0.5 text-xs"
                                style={{
                                  background: isBest ? 'rgba(95,211,182,0.25)' : 'rgba(255,255,255,0.06)',
                                  color: qColor(val),
                                  border: isBest ? '1px solid #5fd3b6' : '1px solid transparent',
                                }}
                              >
                                {val.toFixed(2)}
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-2 pl-3 text-center">
                          <span className="rounded-md border border-mint/50 bg-mint/15 px-2 py-0.5 text-xs font-semibold text-mint">
                            {rl.best_actions[state]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <p className="text-sm text-slate-400">No RL data.</p>}
        </div>

        {/* ── Incident Timeline ── */}
        <div className="glass-panel rounded-xl p-5">
          <h3 className="text-lg font-semibold text-cloud">Incident Timeline</h3>
          <p className="mono mb-3 text-xs uppercase tracking-[0.2em] text-slate-300">
            {timeline.critical_gaps} critical gaps in {timeline.events.length} events
          </p>
          <div className="max-h-[400px] space-y-1 overflow-y-auto">
            {timeline.events.map((ev, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border px-3 py-1.5 text-xs"
                style={{
                  borderColor: ev.event_type === 'critical_gap' ? 'rgba(241,105,91,0.5)' : 'rgba(255,255,255,0.1)',
                  background: ev.event_type === 'critical_gap' ? 'rgba(241,105,91,0.08)' : 'rgba(0,0,0,0.15)',
                }}
              >
                <span className="mono w-20 shrink-0 text-slate-400">
                  {ev.event_time?.split?.(' ')?.[1] || ev.event_time?.slice?.(11, 19) || '--'}
                </span>
                <span
                  className="w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-bold uppercase"
                  style={{
                    background: ev.event_type === 'critical_gap' ? '#f1695b22' : '#5fd3b622',
                    color: ev.event_type === 'critical_gap' ? '#f1695b' : '#5fd3b6',
                  }}
                >
                  {ev.event_type === 'critical_gap' ? 'GAP' : 'EVENT'}
                </span>
                <span className="text-slate-200">{ev.target_stage} — {ev.attack_type}</span>
                <span className="ml-auto mono text-slate-400">impact {ev.impact_score?.toFixed?.(1) || '--'}</span>
              </div>
            ))}
            {timeline.events.length === 0 && (
              <p className="text-sm text-slate-400">No timeline events. Run Person 2 pipeline.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── DNA Fingerprints ── */}
      <div className="glass-panel rounded-xl p-5">
        <h3 className="text-lg font-semibold text-cloud">Cyber DNA Fingerprints</h3>
        <p className="mono mb-3 text-xs uppercase tracking-[0.2em] text-slate-300">
          Topological signatures for attack deduplication
        </p>
        {dna.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/15">
                  <th className="py-2 text-left text-xs uppercase text-slate-400">ID</th>
                  <th className="py-2 text-left text-xs uppercase text-slate-400">Stage</th>
                  <th className="py-2 text-left text-xs uppercase text-slate-400">Type</th>
                  <th className="py-2 text-left text-xs uppercase text-slate-400">DNA Hash</th>
                  <th className="py-2 text-center text-xs uppercase text-slate-400">Mean</th>
                  <th className="py-2 text-center text-xs uppercase text-slate-400">Std</th>
                  <th className="py-2 text-center text-xs uppercase text-slate-400">Range</th>
                </tr>
              </thead>
              <tbody>
                {dna.map((d) => (
                  <tr key={d.attack_id} className="border-b border-white/8">
                    <td className="py-1.5 text-cloud">#{d.attack_id}</td>
                    <td className="py-1.5 text-slate-200">{d.target_stage}</td>
                    <td className="py-1.5 text-slate-200">{d.attack_type}</td>
                    <td className="py-1.5">
                      <code className="mono rounded bg-black/30 px-1.5 py-0.5 text-xs text-amber-200">{d.dna_hash}</code>
                    </td>
                    <td className="py-1.5 text-center mono text-xs text-slate-300">{d.mean?.toFixed(3)}</td>
                    <td className="py-1.5 text-center mono text-xs text-slate-300">{d.std?.toFixed(3)}</td>
                    <td className="py-1.5 text-center mono text-xs text-slate-300">{d.min?.toFixed(2)}–{d.max?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-slate-400">No DNA data.</p>}
      </div>
    </section>
  );
}

export default InnovationsPanel;
