const STAGE_NODES = [
  { id: 0, stage: 'P1', sensor: 'Feature_0', x: 72, y: 160 },
  { id: 1, stage: 'P2', sensor: 'Feature_9', x: 190, y: 88 },
  { id: 2, stage: 'P3', sensor: 'Feature_17', x: 308, y: 160 },
  { id: 3, stage: 'P4', sensor: 'Feature_26', x: 426, y: 88 },
  { id: 4, stage: 'P5', sensor: 'Feature_34', x: 544, y: 160 },
  { id: 5, stage: 'P6', sensor: 'Feature_43', x: 662, y: 88 },
];

function formatLatency(v) { return typeof v === 'number' ? v.toFixed(1) + 's' : '--'; }

function statusColor(score) {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  if (score >= 40) return '#F97316';
  return '#EF4444';
}

function baselineLabel(rate) {
  if (typeof rate !== 'number') return 'Unknown';
  if (rate < 30) return 'Likely miss (<30%)';
  if (rate < 70) return 'Partial coverage';
  return 'Strong coverage';
}

function edgeKey(a, b) { return a + '-' + b; }

function GnnRelationshipPanel({ relationshipSnapshot, streamStatus, isDark, t }) {
  const edgeMap = new Map(
    (relationshipSnapshot?.edgeStates || []).map(e => [edgeKey(e.fromId, e.toId), e])
  );

  const integrity = Number(relationshipSnapshot?.integrityScore || 100);
  const broken = Number(relationshipSnapshot?.edgesBroken || 0);
  const total = Number(relationshipSnapshot?.totalEdges || 0);
  const latency = relationshipSnapshot?.gnnAlertLatencySec;
  const baseRate = relationshipSnapshot?.baselineDetectionRate;

  const card = { backgroundColor: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 8 };
  const chip = { backgroundColor: isDark ? '#1e293b' : '#F1F5F9', border: `0.5px solid ${t.border}`, borderRadius: 6 };

  return (
    <div className="p-5" style={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-semibold" style={{ color: t.text }}>GNN Relationship Panel</h3>
          <p className="text-[11px] uppercase tracking-wider mt-0.5" style={{ color: t.textMuted }}>
            Live graph integrity over process-stage sensor dependencies
          </p>
        </div>
        <p className="text-[11px] uppercase tracking-wider font-medium px-2 py-1 rounded-md" style={{ ...chip, color: t.textMuted }}>
          Stream: {streamStatus}
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="p-3 rounded-lg" style={chip}>
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>Graph Integrity</p>
          <p className="text-xl font-bold" style={{ color: statusColor(integrity) }}>{integrity.toFixed(1)}%</p>
        </div>
        <div className="p-3 rounded-lg" style={chip}>
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>Broken Edges</p>
          <p className="text-xl font-bold" style={{ color: broken > 0 ? '#EF4444' : t.text }}>{broken}/{total}</p>
        </div>
        <div className="p-3 rounded-lg" style={chip}>
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>GNN Alert Latency</p>
          <p className="text-xl font-bold" style={{ color: '#2563EB' }}>{formatLatency(latency)}</p>
        </div>
        <div className="p-3 rounded-lg" style={chip}>
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>Baseline LSTM</p>
          <p className="text-[13px] font-semibold" style={{ color: t.text }}>{baselineLabel(baseRate)}</p>
          <p className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>{typeof baseRate === 'number' ? baseRate.toFixed(1) + '% detection' : '--'}</p>
        </div>
      </div>

      <div className="rounded-lg p-3" style={{ backgroundColor: isDark ? '#1e293b' : '#F8FAFC', border: `0.5px solid ${t.border}` }}>
        <svg viewBox="0 0 734 240" className="w-full">
          {[[0,1],[1,2],[2,3],[3,4],[4,5],[0,2],[2,4]].map(([a, b]) => {
            const f = STAGE_NODES[a], to = STAGE_NODES[b];
            const edge = edgeMap.get(edgeKey(a, b));
            const br = Boolean(edge?.broken);
            return <line key={edgeKey(a, b)} x1={f.x} y1={f.y} x2={to.x} y2={to.y} stroke={br ? '#EF4444' : '#10B981'} strokeWidth={br ? 3.6 : 2} strokeDasharray={br ? '7 5' : 'none'} opacity={0.85} />;
          })}
          {STAGE_NODES.map(node => {
            const hasBroken = Array.from(edgeMap.values()).some(e => e.broken && (e.fromId === node.id || e.toId === node.id));
            return (
              <g key={node.id}>
                <circle cx={node.x} cy={node.y} r={28} fill={hasBroken ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.15)'} stroke={hasBroken ? '#EF4444' : '#10B981'} strokeWidth={1.5} />
                <text x={node.x} y={node.y - 4} textAnchor="middle" fill={t.text} fontSize="14" fontWeight="600">{node.stage}</text>
                <text x={node.x} y={node.y + 13} textAnchor="middle" fill={t.textMuted} fontSize="10">{node.sensor}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default GnnRelationshipPanel;
