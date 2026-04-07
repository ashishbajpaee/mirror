import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';

function MitigationEngine() {
  const { isDark, t } = useOutletContext();
  const [gaps, setGaps] = useState([]);
  const [isApplying, setIsApplying] = useState({});
  const [stats, setStats] = useState({ beforeRate: 0, afterRate: 0, fixesApplied: 0 });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await api.get('/gaps?limit=40');
        if (cancelled) return;
        const loaded = r?.data?.gaps || [];
        setGaps(loaded);
        const before = loaded.length > 0 ? loaded.reduce((s, g) => s + Number(g.detection_rate || 0), 0) / loaded.length : 0;
        setStats({ beforeRate: before, afterRate: before, fixesApplied: 0 });
      } catch { if (!cancelled) setGaps([]); }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const improvement = useMemo(() => Math.max(0, stats.afterRate - stats.beforeRate), [stats]);

  const applyFix = async (attackId) => {
    setIsApplying(c => ({ ...c, [attackId]: true }));
    try {
      const r = await api.post('/apply-fix/' + attackId);
      const d = r?.data;
      setGaps(c => c.map(g => Number(g.attack_id) !== Number(attackId) ? g : { ...g, detection_rate: Number(d.after_detection_rate || g.detection_rate), mitigation_applied: true }));
      setStats(c => ({
        ...c,
        fixesApplied: c.fixesApplied + 1,
        afterRate: c.afterRate + (Number(d.after_detection_rate || 0) - Number(d.before_detection_rate || 0)) / Math.max(1, gaps.length),
      }));
    } catch {} finally { setIsApplying(c => ({ ...c, [attackId]: false })); }
  };

  const card = { backgroundColor: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 8 };
  const chip = { backgroundColor: isDark ? '#1e293b' : '#F1F5F9', border: `0.5px solid ${t.border}`, borderRadius: 6 };

  return (
    <section className="space-y-4">
      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-5" style={card}>
          <p className="text-[12px] font-medium uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>Before Detection</p>
          <h2 className="text-[28px] font-semibold leading-none tracking-tight" style={{ color: t.text }}>{stats.beforeRate.toFixed(2)}%</h2>
        </div>
        <div className="p-5" style={card}>
          <p className="text-[12px] font-medium uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>After Detection</p>
          <h2 className="text-[28px] font-semibold leading-none tracking-tight" style={{ color: t.text }}>{stats.afterRate.toFixed(2)}%</h2>
        </div>
        <div className="p-5" style={card}>
          <p className="text-[12px] font-medium uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>Improvement</p>
          <h2 className="text-[28px] font-semibold leading-none tracking-tight" style={{ color: '#10B981' }}>+{improvement.toFixed(2)}%</h2>
          <p className="text-[12px] mt-1" style={{ color: t.textSecondary }}>Fixes applied: {stats.fixesApplied}</p>
        </div>
      </div>

      {/* Rules list */}
      <div className="p-5" style={card}>
        <h3 className="text-[14px] font-semibold mb-4" style={{ color: t.text }}>AI Mitigation Rule Deployment</h3>
        <div className="space-y-3">
          {gaps.map(gap => {
            const id = Number(gap.attack_id);
            const rule = gap.lime_rule || {};
            return (
              <article key={id} className="rounded-lg p-4" style={chip}>
                <div className="mb-2 grid gap-2 md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>Attack #{id} | {gap.gap_type}</p>
                    <h4 className="text-[14px] font-semibold mt-0.5" style={{ color: t.text }}>
                      Impact {Number(gap.impact_score).toFixed(2)} | Detection {Number(gap.detection_rate).toFixed(2)}%
                    </h4>
                  </div>
                  <button onClick={() => applyFix(id)} disabled={Boolean(isApplying[id])}
                    className="rounded-lg px-4 py-2 text-[13px] font-medium transition"
                    style={{
                      backgroundColor: gap.mitigation_applied ? (isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5') : (isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB'),
                      color: gap.mitigation_applied ? '#10B981' : '#F59E0B',
                      border: `0.5px solid ${gap.mitigation_applied ? (isDark ? 'rgba(16,185,129,0.3)' : '#A7F3D0') : (isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A')}`,
                    }}>
                    {isApplying[id] ? 'Applying...' : gap.mitigation_applied ? '✓ Fix Applied' : 'Apply Fix'}
                  </button>
                </div>
                <div className="rounded-md p-2.5" style={{ backgroundColor: isDark ? '#0f172a' : '#FFFFFF', border: `0.5px solid ${t.border}` }}>
                  <p className="text-[12px] font-medium mb-0.5" style={{ color: t.text }}>LIME Rule</p>
                  <p className="text-[12px]" style={{ color: t.textSecondary }}>{rule.condition_text || 'Rule unavailable for this attack.'}</p>
                </div>
              </article>
            );
          })}
          {gaps.length === 0 && <p className="text-[13px]" style={{ color: t.textMuted }}>No gaps available. Ensure backend artifacts are loaded.</p>}
        </div>
      </div>
    </section>
  );
}

export default MitigationEngine;
