import { useEffect, useState } from 'react';
import { api } from '../api/client';

function typeColor(t) { return t === 'critical_gap' ? '#ef4444' : '#5fd3b6'; }
function impactColor(s) { return s >= 80 ? '#ef4444' : s >= 50 ? '#f59e0b' : '#22c55e'; }

function IncidentTimeline() {
  const [timeline, setTimeline] = useState({ events: [], critical_gaps: 0, total_events: 0 });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/p2/timeline?limit=200').then(res => {
      setTimeline(res.data || { events: [], critical_gaps: 0, total_events: 0 });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? timeline.events
    : filter === 'gaps' ? timeline.events.filter(e => e.event_type === 'critical_gap')
    : timeline.events.filter(e => e.event_type !== 'critical_gap');

  const stages = [...new Set(timeline.events.map(e => e.target_stage))].sort();
  const attackTypes = [...new Set(timeline.events.map(e => e.attack_type))].sort();
  const avgImpact = timeline.events.length ? (timeline.events.reduce((s, e) => s + (e.impact_score || 0), 0) / timeline.events.length) : 0;

  return (
    <section className="space-y-5">
      <div className="glass-panel rounded-xl p-5">
        <p className="mono text-xs uppercase tracking-[0.3em] text-rose-300">Person 2 — Forensic Analysis</p>
        <h2 className="text-2xl font-bold text-cloud">Incident Timeline</h2>
        <p className="mt-1 text-sm text-slate-300">Chronological event reconstruction from SimPy + gap discovery pipeline</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="glass-panel rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-cloud">{timeline.total_events || timeline.events.length}</p>
          <p className="mono text-[10px] uppercase text-slate-400">Total Events</p>
        </div>
        <div className="glass-panel rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-ember">{timeline.critical_gaps}</p>
          <p className="mono text-[10px] uppercase text-slate-400">Critical Gaps</p>
        </div>
        <div className="glass-panel rounded-xl p-4 text-center">
          <p className="text-3xl font-black text-amber-300">{stages.length}</p>
          <p className="mono text-[10px] uppercase text-slate-400">Stages Affected</p>
        </div>
        <div className="glass-panel rounded-xl p-4 text-center">
          <p className="text-3xl font-black" style={{ color: impactColor(avgImpact) }}>{avgImpact.toFixed(1)}</p>
          <p className="mono text-[10px] uppercase text-slate-400">Avg Impact</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[['all', 'All Events'], ['gaps', '🔴 Critical Gaps Only'], ['normal', '🟢 Normal Events']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={'rounded-lg border px-3 py-1.5 text-xs font-medium transition ' +
              (filter === id ? 'border-mint bg-mint/15 text-cloud' : 'border-white/15 bg-black/20 text-slate-300 hover:border-white/30')}
          >{label} ({id === 'all' ? timeline.events.length : id === 'gaps' ? timeline.critical_gaps : timeline.events.length - timeline.critical_gaps})</button>
        ))}
      </div>

      {/* Timeline */}
      <div className="glass-panel rounded-xl p-5">
        {loading ? <p className="text-sm text-slate-400">Loading timeline...</p> : (
          <div className="relative pl-8">
            {/* Vertical line */}
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-mint/40 via-amber-300/40 to-ember/40" />

            <div className="space-y-2">
              {filtered.map((ev, i) => {
                const isGap = ev.event_type === 'critical_gap';
                const time = ev.event_time?.split?.(' ')?.[1]?.slice(0, 8) || ev.event_time?.slice(11, 19) || '--:--:--';
                return (
                  <div key={i} className="relative flex items-start gap-3">
                    {/* Dot on timeline */}
                    <div className="absolute -left-5 top-2.5 h-3 w-3 rounded-full border-2" style={{
                      borderColor: typeColor(ev.event_type),
                      background: isGap ? '#ef4444' : 'transparent',
                    }} />

                    <div className={'flex-1 rounded-lg border px-4 py-2.5 transition hover:bg-white/3 ' +
                      (isGap ? 'border-ember/30 bg-ember/5' : 'border-white/8 bg-black/15')}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mono text-xs text-slate-400">{time}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{
                          background: typeColor(ev.event_type) + '18',
                          color: typeColor(ev.event_type),
                        }}>
                          {isGap ? 'CRITICAL GAP' : 'IMPACT EVENT'}
                        </span>
                        <span className="rounded bg-white/8 px-1.5 py-0.5 text-xs font-semibold text-cloud">{ev.target_stage}</span>
                        <span className="text-xs text-slate-300">{ev.attack_type}</span>
                        <span className="ml-auto mono text-xs font-semibold" style={{ color: impactColor(ev.impact_score || 0) }}>
                          Impact: {(ev.impact_score || 0).toFixed(1)}
                        </span>
                        {ev.total_violations > 0 && (
                          <span className="mono text-xs text-slate-400">{ev.total_violations} violations</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No events match the current filter.</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default IncidentTimeline;
