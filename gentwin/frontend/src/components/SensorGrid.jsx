function getBlindspotBg(score, isDark) {
  if (score < 3) return isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5';
  if (score < 5) return isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB';
  if (score < 7) return isDark ? 'rgba(249,115,22,0.1)' : '#FFF7ED';
  return isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2';
}

function getBlindspotBorder(score, isDark) {
  if (score < 3) return isDark ? 'rgba(16,185,129,0.3)' : '#A7F3D0';
  if (score < 5) return isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A';
  if (score < 7) return isDark ? 'rgba(249,115,22,0.3)' : '#FED7AA';
  return isDark ? 'rgba(239,68,68,0.3)' : '#FECACA';
}

function formatValue(value) {
  if (typeof value !== 'number') return '--';
  return value.toFixed(3);
}

function SensorGrid({ sensorReadings = {}, blindspotScores = {}, flashingSensors = [], compact = false, isDark, t }) {
  const entries = Object.entries(sensorReadings).sort((a, b) => a[0].localeCompare(b[0]));
  const flashingSet = new Set(flashingSensors || []);

  // Fallback theme if not passed (pages that haven't been updated yet)
  const theme = t || {
    text: isDark ? '#e2e8f0' : '#0F172A',
    textSecondary: isDark ? '#94a3b8' : '#475569',
    textMuted: isDark ? '#64748B' : '#64748B',
    surface: isDark ? '#0f172a' : '#FFFFFF',
    border: isDark ? '#1e293b' : '#E2E8F0',
  };
  const dark = isDark || false;

  if (!entries.length) {
    return (
      <div 
        className="w-full rounded-lg p-4 text-[13px] text-center flex items-center justify-center min-h-[100px]"
        style={{ backgroundColor: dark ? '#1e293b' : '#F8FAFC', border: `0.5px solid ${theme.border}`, color: theme.textMuted }}
      >
        Waiting for sensor stream...
      </div>
    );
  }

  return (
    <div className={'grid gap-2 ' + (compact ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6')}>
      {entries.map(([sensorName, value]) => {
        const score = Number(blindspotScores[sensorName] || 0);
        const flashing = flashingSet.has(sensorName);

        return (
          <article
            key={sensorName}
            className="rounded-[8px] p-2.5 transition-colors duration-200"
            style={{
              backgroundColor: getBlindspotBg(score, dark),
              border: `${flashing ? '1.5px' : '0.5px'} solid ${flashing ? '#EF4444' : getBlindspotBorder(score, dark)}`,
            }}
          >
            <p className="font-sans text-[11px] font-medium uppercase tracking-wider truncate mb-1" style={{ color: theme.textMuted }}>
              {sensorName}
            </p>
            <p className="font-mono text-[14px] font-semibold tabular-nums" style={{ color: theme.text }}>
              {formatValue(value)}
            </p>
            <p className="font-mono mt-1 text-[10px] uppercase" style={{ color: theme.textMuted }}>
              BS {score.toFixed(2)}
            </p>
          </article>
        );
      })}
    </div>
  );
}

export default SensorGrid;
