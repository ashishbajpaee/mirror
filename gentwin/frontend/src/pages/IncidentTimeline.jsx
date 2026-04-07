import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';

function typeColor(t) { return t === 'critical_gap' ? '#EF4444' : '#10B981'; }
function impactColor(s) { return s >= 80 ? '#EF4444' : s >= 50 ? '#F59E0B' : '#10B981'; }

function IncidentTimeline() {
  const { isDark, t } = useOutletContext();
  const [timeline, setTimeline] = useState({ events: [], critical_gaps: 0, total_events: 0 });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/p2/timeline?limit=200').then(r => {
      setTimeline(r.data || { events: [], critical_gaps: 0, total_events: 0 });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? timeline.events : filter === 'gaps' ? timeline.events.filter(e => e.event_type === 'critical_gap') : timeline.events.filter(e => e.event_type !== 'critical_gap');
  const stages = [...new Set(timeline.events.map(e => e.target_stage))].sort();
  const avgImpact = timeline.events.length ? timeline.events.reduce((s, e) => s + (e.impact_score || 0), 0) / timeline.events.length : 0;

  const card = { backgroundColor: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 8 };
  const chip = { backgroundColor: isDark ? '#1e293b' : '#F1F5F9', border: `0.5px solid ${t.border}`, borderRadius: 6 };

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="p-5" style={card}>
        <p className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#EF4444' }}>Forensic Analysis</p>
        <h2 className="text-xl font-semibold" style={{ color: t.text }}>Incident Timeline</h2>
        <p className="mt-1 text-[13px]" style={{ color: t.textSecondary }}>Chronological event reconstruction from SimPy + gap discovery pipeline</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Total Events', timeline.total_events || timeline.events.length, t.text],
          ['Critical Gaps', timeline.critical_gaps, '#EF4444'],
          ['Stages Affected', stages.length, '#F59E0B'],
          ['Avg Impact', avgImpact.toFixed(1), impactColor(avgImpact)],
        ].map(([label, val, color]) => (
          <div key={label} className="p-4 text-center" style={card}>
            <p className="text-[28px] font-semibold leading-none" style={{ color }}>{val}</p>
            <p className="text-[10px] uppercase tracking-wider mt-1.5" style={{ color: t.textMuted }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[['all', 'All Events'], ['gaps', 'Critical Gaps Only'], ['normal', 'Normal Events']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition"
            style={{
              backgroundColor: filter === id ? (isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF') : (isDark ? '#1e293b' : '#F1F5F9'),
              color: filter === id ? '#2563EB' : t.textSecondary,
              border: `0.5px solid ${filter === id ? (isDark ? 'rgba(37,99,235,0.3)' : '#BFDBFE') : t.border}`,
            }}>
            {label} ({id === 'all' ? timeline.events.length : id === 'gaps' ? timeline.critical_gaps : timeline.events.length - timeline.critical_gaps})
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="p-5" style={card}>
        {loading ? <p className="text-[13px]" style={{ color: t.textMuted }}>Loading timeline...</p> : (
          <div className="relative pl-8">
            {/* Vertical line */}
            <div className="absolute left-3 top-0 bottom-0 w-0.5" style={{ background: `linear-gradient(to bottom, #10B981, #F59E0B, #EF4444)`, opacity: 0.4 }} />

            <div className="space-y-2">
              {filtered.map((ev, i) => {
                const isGap = ev.event_type === 'critical_gap';
                const time = ev.event_time?.split?.(' ')?.[1]?.slice(0, 8) || ev.event_time?.slice(11, 19) || '--:--:--';
                return (
                  <div key={i} className="relative flex items-start gap-3">
                    <div className="absolute -left-5 top-2.5 h-3 w-3 rounded-full" style={{
                      border: `2px solid ${typeColor(ev.event_type)}`,
                      backgroundColor: isGap ? '#EF4444' : 'transparent',
                    }} />
                    <div className="flex-1 rounded-lg px-4 py-2.5 transition" style={{
                      backgroundColor: isGap ? (isDark ? 'rgba(239,68,68,0.08)' : '#FEF2F2') : (isDark ? '#1e293b' : '#F8FAFC'),
                      border: `0.5px solid ${isGap ? (isDark ? 'rgba(239,68,68,0.2)' : '#FECACA') : t.border}`,
                    }}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px]" style={{ color: t.textMuted }}>{time}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{
                          backgroundColor: typeColor(ev.event_type) + '18',
                          color: typeColor(ev.event_type),
                        }}>
                          {isGap ? 'CRITICAL GAP' : 'IMPACT EVENT'}
                        </span>
                        <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold" style={{ ...chip, color: t.text }}>{ev.target_stage}</span>
                        <span className="text-[11px]" style={{ color: t.textSecondary }}>{ev.attack_type}</span>
                        <span className="ml-auto font-mono text-[11px] font-semibold" style={{ color: impactColor(ev.impact_score || 0) }}>
                          Impact: {(ev.impact_score || 0).toFixed(1)}
                        </span>
                        {ev.total_violations > 0 && <span className="font-mono text-[11px]" style={{ color: t.textMuted }}>{ev.total_violations} violations</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="py-8 text-center text-[13px]" style={{ color: t.textMuted }}>No events match the current filter.</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default IncidentTimeline;
