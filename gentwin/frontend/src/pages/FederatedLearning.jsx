import { useOutletContext } from 'react-router-dom';

export default function FederatedLearning() {
  const { t } = useOutletContext();
  const brandPrimary = '#2563EB';

  return (
    <div style={{ backgroundColor: t.bg, color: t.text, minHeight: '100%', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: `1px solid ${t.border}`, paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', color: brandPrimary, marginBottom: '8px', fontWeight: 'bold' }}>Federated Learning Network</h1>
        <p style={{ color: t.textSecondary, fontSize: '14px' }}>Global Threat Intelligence Synchronization</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Network Status Panel */}
        <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '20px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', color: t.text, fontWeight: '600' }}>Global Nodes</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: t.bg, borderRadius: '6px', borderLeft: `4px solid #10B981` }}>
              <div>
                <strong style={{ display: 'block', fontSize: '14px' }}>Node Alpha (Singapore)</strong>
                <span style={{ fontSize: '12px', color: t.textMuted }}>Water Treatment Core</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#10B981', fontWeight: '700', fontSize: '12px' }}>SYNCED</span>
                <div style={{ fontSize: '11px', color: t.textMuted }}>Latency: 12ms</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: t.bg, borderRadius: '6px', borderLeft: `4px solid #10B981` }}>
              <div>
                <strong style={{ display: 'block', fontSize: '14px' }}>Node Beta (London)</strong>
                <span style={{ fontSize: '12px', color: t.textMuted }}>Desalination Facility</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#10B981', fontWeight: '700', fontSize: '12px' }}>SYNCED</span>
                <div style={{ fontSize: '11px', color: t.textMuted }}>Latency: 45ms</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: t.bg, borderRadius: '6px', borderLeft: `4px solid #F59E0B` }}>
              <div>
                <strong style={{ display: 'block', fontSize: '14px' }}>Node Gamma (New York)</strong>
                <span style={{ fontSize: '12px', color: t.textMuted }}>Distribution Grid</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#F59E0B', fontWeight: '700', fontSize: '12px' }}>TRAINING</span>
                <div style={{ fontSize: '11px', color: t.textMuted }}>Evaluating P1+P2 rules</div>
              </div>
            </div>
          </div>
        </div>

        {/* Distributed Models Panel */}
        <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, borderRadius: '8px', padding: '20px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', color: t.text, fontWeight: '600' }}>Model Distribution Stats</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span>Shared Attack Signatures</span>
                <span style={{ color: brandPrimary, fontWeight: 'bold' }}>1,000 Verified</span>
              </div>
              <div style={{ height: '6px', backgroundColor: t.bg, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '100%', backgroundColor: brandPrimary }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span>Cross-Node Mitigation Rules</span>
                <span style={{ color: '#10B981', fontWeight: 'bold' }}>153 Active</span>
              </div>
              <div style={{ height: '6px', backgroundColor: t.bg, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '45%', backgroundColor: '#10B981' }}></div>
              </div>
            </div>

            <div style={{ marginTop: '15px', padding: '16px', backgroundColor: t.bg, border: `1px dashed ${t.border}`, borderRadius: '6px' }}>
              <h3 style={{ fontSize: '13px', color: t.textSecondary, marginBottom: '8px', fontWeight: 'bold' }}>Latest Federated Update</h3>
              <p style={{ fontSize: '13px', lineHeight: '1.6', color: t.text }}>
                <span style={{ color: brandPrimary, fontWeight: 'bold' }}>[UPDATE RECEIVED]</span> Node Alpha distributed the new signature for <strong style={{ color: '#EF4444' }}>Coordinated P1+P2 Strike</strong>. 
                Nodes Beta and Gamma are currently updating edge-defense models without exposing raw operational data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}