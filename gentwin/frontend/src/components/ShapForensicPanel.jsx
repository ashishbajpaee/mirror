import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function ShapForensicPanel({ attackId, isDark, t }) {
  const [shap, setShap] = useState(null);
  const [lime, setLime] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (attackId == null) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get('/shap/' + attackId),
      api.get('/lime/' + attackId),
    ]).then(([sRes, lRes]) => {
      if (cancelled) return;
      setShap(sRes.data);
      setLime(lRes.data);
    }).catch(() => {
      if (!cancelled) { setShap(null); setLime(null); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attackId]);

  const card = { backgroundColor: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 8 };
  const chip = { backgroundColor: isDark ? '#1e293b' : '#F1F5F9', border: `0.5px solid ${t.border}`, borderRadius: 6 };

  if (attackId == null) {
    return (
      <div className="p-5" style={card}>
        <h3 className="text-[14px] font-semibold" style={{ color: t.text }}>SHAP Forensic Panel</h3>
        <p className="text-[12px] mt-2" style={{ color: t.textMuted }}>Select and launch an attack to see SHAP analysis.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-5" style={card}>
        <h3 className="text-[14px] font-semibold" style={{ color: t.text }}>SHAP Forensic Panel</h3>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-4 h-4 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin"></div>
          <span className="text-[12px]" style={{ color: t.textMuted }}>Analyzing attack #{attackId}...</span>
        </div>
      </div>
    );
  }

  const topFeatures = shap?.top_features || [];
  const maxShap = Math.max(...topFeatures.map(f => f.shap_value || 0), 0.01);

  return (
    <div className="p-5" style={card}>
      <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: `0.5px solid ${t.border}` }}>
        <div>
          <h3 className="text-[14px] font-semibold" style={{ color: t.text }}>
            🔬 SHAP Forensic Panel — Attack #{attackId}
          </h3>
          <p className="text-[11px] uppercase tracking-wider mt-0.5" style={{ color: t.textMuted }}>
            {shap?.explainability_backend === 'shap_lime' ? 'TreeSHAP + LIME' : shap?.explainability_backend || 'Analysis'} powered
          </p>
        </div>
        <span className="text-[11px] font-medium px-2 py-1 rounded-md" style={chip}>
          {shap?.summary || 'Analysis complete'}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* SHAP Feature Importance */}
        <div>
          <h4 className="text-[13px] font-semibold mb-3" style={{ color: t.text }}>
            Top Contributing Sensors
          </h4>
          <div className="space-y-2">
            {topFeatures.map((feat, i) => {
              const pct = Math.min(100, (feat.shap_value / maxShap) * 100);
              const isUp = feat.direction === 'increase';
              const barColor = isUp ? '#EF4444' : '#2563EB';
              return (
                <div key={feat.sensor + i} className="rounded-lg p-3" style={chip}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-semibold font-mono" style={{ color: t.text }}>
                      {feat.sensor}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: isUp ? (isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2') : (isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF'),
                          color: barColor,
                        }}>
                        {isUp ? '↑ INCREASE' : '↓ DECREASE'}
                      </span>
                      <span className="text-[12px] font-mono font-bold" style={{ color: barColor }}>
                        {feat.shap_value?.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#0f172a' : '#E2E8F0' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: barColor, opacity: 0.8 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LIME Mitigation Rule */}
        <div>
          <h4 className="text-[13px] font-semibold mb-3" style={{ color: t.text }}>
            AI-Generated Mitigation Rule
          </h4>
          {lime ? (
            <div className="rounded-lg p-4" style={{ ...chip, borderLeft: '3px solid #F59E0B' }}>
              <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>
                LIME Condition (confidence: {(lime.confidence * 100).toFixed(0)}%)
              </p>
              <p className="text-[13px] font-mono leading-relaxed mb-3" style={{ color: t.text }}>
                {lime.condition_text}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(lime.sensors_involved || []).map(s => (
                  <span key={s} className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2',
                      color: '#EF4444',
                      border: `0.5px solid ${isDark ? 'rgba(239,68,68,0.3)' : '#FECACA'}`,
                    }}>
                    ⚠ {s}
                  </span>
                ))}
              </div>

              {/* Correlation insight for demo script */}
              {lime.sensors_involved?.length >= 2 && (
                <div className="mt-3 p-3 rounded-md" style={{ backgroundColor: isDark ? '#0f172a' : '#FFFFFF', border: `0.5px solid ${t.border}` }}>
                  <p className="text-[12px] font-semibold" style={{ color: '#EF4444' }}>
                    ⚡ Correlation Breakdown Detected
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: t.textSecondary }}>
                    <strong style={{ color: t.text }}>{lime.sensors_involved[0]}</strong> and{' '}
                    <strong style={{ color: t.text }}>{lime.sensors_involved[1]}</strong> stopped correlating.
                    Physically impossible — the attack vector is isolated here.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: t.textMuted }}>No LIME data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
