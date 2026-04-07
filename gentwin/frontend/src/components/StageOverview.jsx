function stageForIndex(index) {
  if (index < 9) return 'P1';
  if (index < 17) return 'P2';
  if (index < 26) return 'P3';
  if (index < 34) return 'P4';
  if (index < 43) return 'P5';
  return 'P6';
}

function stageTone(score) {
  if (score < 3) return 'bg-emerald-400';
  if (score < 5) return 'bg-yellow-400';
  if (score < 7) return 'bg-orange-400';
  return 'bg-red-400';
}

function StageOverview({ blindspotScores = {}, isDark, t }) {
  const entries = Object.entries(blindspotScores);
  const stageBuckets = { P1: [], P2: [], P3: [], P4: [], P5: [], P6: [] };

  entries.forEach(([, score], index) => {
    const stage = stageForIndex(index);
    stageBuckets[stage].push(Number(score));
  });

  const stageRows = Object.entries(stageBuckets).map(([stage, scores]) => {
    const average = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
    return { stage, average, tone: stageTone(average) };
  });

  const cardStyle = { backgroundColor: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 8 };

  return (
    <div className="p-5" style={cardStyle}>
      <h3 className="text-[14px] font-semibold mb-1" style={{ color: t.text }}>Plant Stage Risk Overlay</h3>
      <p className="text-[12px] mb-4 pb-3 uppercase tracking-wider" style={{ color: t.textMuted, borderBottom: `0.5px solid ${t.border}` }}>
        P1 through P6 aggregate blindspot score
      </p>

      <div className="space-y-2.5">
        {stageRows.map((row) => (
          <div key={row.stage} className="rounded-lg p-2.5" style={{ backgroundColor: isDark ? '#1e293b' : '#F8FAFC', border: `0.5px solid ${t.border}` }}>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="font-medium" style={{ color: t.textSecondary }}>{row.stage}</span>
              <span className="font-mono text-[13px]" style={{ color: t.textSecondary }}>{row.average.toFixed(2)}</span>
            </div>
            <div className="h-2 rounded" style={{ backgroundColor: isDark ? '#334155' : '#E2E8F0' }}>
              <div className={'h-2 rounded ' + row.tone} style={{ width: Math.min(100, row.average * 12) + '%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StageOverview;
