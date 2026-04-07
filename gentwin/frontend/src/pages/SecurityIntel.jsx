import { useEffect, useState } from 'react';
import { api } from '../api/client';

function riskColor(s) { return s >= 80 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444'; }
function qColor(v) { return v >= 20 ? '#5fd3b6' : v >= 8 ? '#f3b45f' : v >= 0 ? '#94a3b8' : '#ef4444'; }

function SecurityIntel() {
  const [immunity, setImmunity] = useState([]);
  const [rl, setRl] = useState(null);
  const [dna, setDna] = useState([]);
  const [tab, setTab] = useState('immunity');

  useEffect(() => {
    Promise.all([
      api.get('/api/p2/immunity'),
      api.get('/api/p2/rl-qtable'),
      api.get('/api/p2/dna?limit=40'),
    ]).then(([a, b, c]) => {
      setImmunity(a.data?.stages || []);
      setRl(b.data || null);
      setDna(c.data?.fingerprints || []);
    }).catch(console.error);
  }, []);

  const tabs = [
    { id: 'immunity', label: '🛡️ Immunity Scores', count: immunity.length },
    { id: 'rl', label: '🤖 RL Defense', count: rl?.states?.length || 0 },
    { id: 'dna', label: '🧬 Attack DNA', count: dna.length },
  ];

  return (
    <section className="space-y-5">
      <div className="glass-panel rounded-xl p-5">
        <p className="mono text-xs uppercase tracking-[0.3em] text-cyan-300">Person 2 — Layer 4+ Innovations</p>
        <h2 className="text-2xl font-bold text-cloud">Security Intelligence Dashboard</h2>
        <p className="mt-1 text-sm text-slate-300">RL adaptive defense, stage immunity scoring, and cyber DNA fingerprinting</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={'rounded-lg border px-4 py-2 text-sm font-medium transition ' +
              (tab === t.id ? 'border-mint bg-mint/15 text-cloud' : 'border-white/15 bg-black/20 text-slate-300 hover:border-white/30')}
          >
            {t.label} <span className="mono ml-1 text-xs text-slate-400">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Immunity */}
      {tab === 'immunity' && (
        <div className="glass-panel rounded-xl p-5">
          <h3 className="mb-1 text-lg font-semibold text-cloud">Stage Immunity Scores</h3>
          <p className="mono mb-4 text-[10px] uppercase tracking-[0.2em] text-slate-400">Resilience = detection capability − impact exposure − gap density</p>
          {immunity.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {immunity.map(s => {
                const score = s.immunity_score || 0;
                const grade = score >= 70 ? 'A' : score >= 50 ? 'B' : score >= 30 ? 'C' : 'D';
                const gradeColor = score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : score >= 30 ? '#f97316' : '#ef4444';
                return (
                  <div key={s.target_stage} className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-black/40 to-black/60">
                    <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                      <span className="text-lg font-bold text-cloud">{s.target_stage}</span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full text-xl font-black" style={{ background: gradeColor + '22', color: gradeColor, border: `2px solid ${gradeColor}` }}>
                        {grade}
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="mb-3 text-center">
                        <p className="text-4xl font-black" style={{ color: riskColor(score) }}>{score.toFixed(1)}</p>
                        <p className="mono text-[10px] uppercase text-slate-400">Immunity Score</p>
                      </div>
                      <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-black/50">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, score)}%`, background: `linear-gradient(90deg, ${riskColor(score)}, ${riskColor(score)}88)` }} />
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                        <div className="rounded bg-black/30 p-1.5">
                          <p className="font-bold text-ember">{s.n_gaps}</p><p className="text-slate-400">Gaps</p>
                        </div>
                        <div className="rounded bg-black/30 p-1.5">
                          <p className="font-bold text-amber-300">{(s.mean_impact || 0).toFixed(0)}</p><p className="text-slate-400">Impact</p>
                        </div>
                        <div className="rounded bg-black/30 p-1.5">
                          <p className="font-bold text-mint">{((s.mean_detect || 0) * 100).toFixed(0)}%</p><p className="text-slate-400">Detect</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-slate-400">No immunity data available.</p>}
        </div>
      )}

      {/* RL Defense */}
      {tab === 'rl' && rl && (
        <div className="glass-panel rounded-xl p-5">
          <h3 className="mb-1 text-lg font-semibold text-cloud">Reinforcement Learning Adaptive Defense</h3>
          <p className="mono mb-4 text-[10px] uppercase tracking-[0.2em] text-slate-400">Q-learning policy trained on 200 episodes — maps threat states to optimal mitigations</p>

          <div className="mb-5 grid gap-3 sm:grid-cols-5">
            {(rl.states || []).map(state => {
              const best = rl.best_actions?.[state] || 'monitor';
              const actionEmoji = { monitor: '👁️', raise_alert: '🚨', isolate_stage: '🔒', safe_shutdown: '⛔' };
              const actionColor = { monitor: '#94a3b8', raise_alert: '#f59e0b', isolate_stage: '#f97316', safe_shutdown: '#ef4444' };
              return (
                <div key={state} className="rounded-xl border border-white/10 bg-gradient-to-b from-black/30 to-black/50 p-4 text-center">
                  <p className="mono mb-1 text-xs uppercase tracking-widest text-slate-400">{state}</p>
                  <p className="mb-2 text-3xl">{actionEmoji[best] || '❓'}</p>
                  <p className="rounded-full px-2 py-1 text-xs font-bold" style={{ background: (actionColor[best] || '#666') + '22', color: actionColor[best] || '#ccc' }}>
                    {best.replace('_', ' ')}
                  </p>
                </div>
              );
            })}
          </div>

          <h4 className="mb-2 text-sm font-semibold text-slate-200">Full Q-Value Matrix</h4>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/15 bg-black/30">
                <th className="px-4 py-2.5 text-left text-xs uppercase text-slate-400">Threat State</th>
                {(rl.actions || []).map(a => <th key={a} className="px-3 py-2.5 text-center text-xs uppercase text-slate-400">{a.replace('_', ' ')}</th>)}
              </tr></thead>
              <tbody>
                {(rl.states || []).map(state => (
                  <tr key={state} className="border-b border-white/6 hover:bg-white/3">
                    <td className="px-4 py-2 font-semibold text-cloud capitalize">{state}</td>
                    {(rl.actions || []).map(action => {
                      const val = rl.q_values?.[state]?.[action] || 0;
                      const isBest = rl.best_actions?.[state] === action;
                      return (
                        <td key={action} className="px-3 py-2 text-center">
                          <span className="mono inline-block rounded px-2.5 py-1 text-xs font-semibold" style={{
                            background: isBest ? 'rgba(95,211,182,0.2)' : 'transparent',
                            color: qColor(val),
                            border: isBest ? '1.5px solid #5fd3b6' : '1px solid transparent',
                          }}>
                            {val.toFixed(1)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DNA Fingerprints */}
      {tab === 'dna' && (
        <div className="glass-panel rounded-xl p-5">
          <h3 className="mb-1 text-lg font-semibold text-cloud">Cyber DNA Fingerprints</h3>
          <p className="mono mb-4 text-[10px] uppercase tracking-[0.2em] text-slate-400">Topological SHA-256 signatures for attack deduplication and family classification</p>
          {dna.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/15 bg-black/30">
                  <th className="px-3 py-2.5 text-left text-xs uppercase text-slate-400">Attack ID</th>
                  <th className="px-3 py-2.5 text-left text-xs uppercase text-slate-400">Stage</th>
                  <th className="px-3 py-2.5 text-left text-xs uppercase text-slate-400">Type</th>
                  <th className="px-3 py-2.5 text-left text-xs uppercase text-slate-400">DNA Hash</th>
                  <th className="px-3 py-2.5 text-center text-xs uppercase text-slate-400">μ</th>
                  <th className="px-3 py-2.5 text-center text-xs uppercase text-slate-400">σ</th>
                  <th className="px-3 py-2.5 text-center text-xs uppercase text-slate-400">Range</th>
                </tr></thead>
                <tbody>
                  {dna.map(d => (
                    <tr key={d.attack_id} className="border-b border-white/6 hover:bg-white/3">
                      <td className="px-3 py-2 font-medium text-cloud">{d.attack_id}</td>
                      <td className="px-3 py-2"><span className="rounded bg-white/8 px-1.5 py-0.5 text-xs font-semibold text-cloud">{d.target_stage}</span></td>
                      <td className="px-3 py-2 text-slate-300">{d.attack_type}</td>
                      <td className="px-3 py-2"><code className="mono rounded bg-amber-900/30 px-2 py-0.5 text-[11px] text-amber-200">{d.dna_hash}</code></td>
                      <td className="px-3 py-2 text-center mono text-xs text-slate-300">{d.mean?.toFixed(3)}</td>
                      <td className="px-3 py-2 text-center mono text-xs text-slate-300">{d.std?.toFixed(3)}</td>
                      <td className="px-3 py-2 text-center mono text-xs text-slate-400">{d.min?.toFixed(2)} – {d.max?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-slate-400">No DNA data available.</p>}
        </div>
      )}
    </section>
  );
}

export default SecurityIntel;
