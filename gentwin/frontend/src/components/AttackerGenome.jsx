import { useState, useEffect } from 'react';
import { useTheme } from './layout/AppLayout';

const API_BASE = 'http://localhost:8000';

export default function AttackerGenome() {
  const { isDark, t } = useTheme();
  const [profile, setProfile] = useState(null);
  const [timeline, setTimeline] = useState({});

  useEffect(() => {
    let active = true;
    const fetchGenome = async () => {
      try {
        const [profRes, timeRes] = await Promise.all([
          fetch(`${API_BASE}/api/genome/profile`),
          fetch(`${API_BASE}/api/genome/timeline`)
        ]);
        const profData = await profRes.json();
        const timeData = await timeRes.json();
        if (active) { setProfile(profData); setTimeline(timeData); }
      } catch (e) { console.error("Genome fetch failed", e); }
    };
    fetchGenome();
    const interval = setInterval(fetchGenome, 2000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  if (!profile) return null;

  const isAnalyzing = profile.profile_type === "Analyzing behaviour..." || profile.profile_type === "Unknown";

  const riskColors = { CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#F59E0B', LOW: '#10B981' };
  const riskColor = riskColors[profile.risk_level] || '#10B981';

  const getDimensionFill = (val) => {
    if (val === "Unknown") return 0;
    const mapping = { Systematic: 90, Targeted: 70, Random: 30, Informed: 90, "Control-focused": 70, "Sensor-focused": 30, "Entry-point thinker": 50, Aggressive: 90, Adaptive: 70, Persistent: 50, Cautious: 30, Financial: 90, Disruption: 80, Surveillance: 50, "Data manipulation": 30 };
    return mapping[val] || 0;
  };

  const chip = { backgroundColor: isDark ? '#1e293b' : '#F1F5F9', border: `0.5px solid ${t.border}`, borderRadius: 6 };
  const sectionBorder = { borderBottom: `0.5px solid ${t.border}`, padding: '12px 16px' };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ ...sectionBorder, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>🧬</span>
        <div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: 1, color: t.text }}>Attacker Genome</h2>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: t.textMuted }}>Behavioural Profiling Engine</p>
        </div>
      </div>

      {/* Profile Type + Confidence */}
      <div style={{ ...sectionBorder, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <p style={{ fontSize: 10, letterSpacing: 1, color: t.textMuted, marginBottom: 4 }}>PROFILE TYPE</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: isAnalyzing ? t.textMuted : t.text, margin: '0 0 6px', opacity: isAnalyzing ? 0.6 : 1 }}>
            {isAnalyzing ? "Analyzing..." : profile.profile_type}
          </p>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, display: 'inline-block',
            backgroundColor: riskColor + '18', color: riskColor,
          }}>RISK: {profile.risk_level}</span>
        </div>
        <div>
          <p style={{ fontSize: 10, letterSpacing: 1, color: t.textMuted, marginBottom: 4 }}>CONFIDENCE</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: t.text, margin: '0 0 6px' }}>{profile.confidence}%</p>
          <div style={{ height: 6, backgroundColor: isDark ? '#334155' : '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3, transition: 'width 0.5s',
              width: `${profile.confidence}%`,
              backgroundColor: profile.confidence > 85 ? '#10B981' : '#F59E0B',
            }} />
          </div>
          {profile.confidence > 85 && <p style={{ fontSize: 10, color: '#10B981', margin: '4px 0 0' }}>Profile locked</p>}
        </div>
      </div>

      {/* Genome Dimensions */}
      <div style={sectionBorder}>
        <p style={{ fontSize: 10, letterSpacing: 1, color: t.textMuted, marginBottom: 8 }}>GENOME DIMENSIONS</p>
        {Object.entries(profile.dimension_scores || {}).map(([key, val]) => {
          const fill = getDimensionFill(val);
          const label = key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 100, fontSize: 11, color: t.textSecondary, flexShrink: 0 }}>{label}</span>
              <div style={{ flex: 1, height: 6, backgroundColor: isDark ? '#334155' : '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${fill}%`, backgroundColor: '#F59E0B', borderRadius: 3, transition: 'width 0.4s' }} />
              </div>
              <span style={{ width: 70, fontSize: 11, color: t.text, textAlign: 'right', flexShrink: 0 }}>{val}</span>
            </div>
          );
        })}
      </div>

      {/* Key Insight */}
      <div style={sectionBorder}>
        <p style={{ fontSize: 10, letterSpacing: 1, color: t.textMuted, marginBottom: 4 }}>KEY INSIGHT</p>
        <p style={{ margin: 0, fontSize: 12, color: t.text, fontStyle: 'italic', lineHeight: 1.5 }}>"{profile.key_insight}"</p>
      </div>

      {/* Recommended Response */}
      <div style={sectionBorder}>
        <p style={{ fontSize: 10, letterSpacing: 1, color: t.textMuted, marginBottom: 4 }}>RECOMMENDED RESPONSE</p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {profile.recommended_response.split('. ').filter(Boolean).map((res, i) => (
            <li key={i} style={{ fontSize: 12, color: '#F59E0B', marginBottom: 3, lineHeight: 1.4 }}>→ {res}</li>
          ))}
        </ul>
      </div>

      {/* Timeline */}
      <div style={{ ...sectionBorder, flex: 1, overflowY: 'auto', borderBottom: 'none' }}>
        <p style={{ fontSize: 10, letterSpacing: 1, color: t.textMuted, marginBottom: 6 }}>PROFILE EVOLUTION</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {Object.entries(timeline).length === 0 && <span style={{ fontSize: 12, color: t.textMuted }}>No attacks yet</span>}
          {Object.entries(timeline).map(([key, data], idx) => {
            const attackNum = key.split('_').pop();
            const isLast = idx === Object.keys(timeline).length - 1;
            return (
              <span key={key} style={{ fontSize: 11, color: isLast ? '#F59E0B' : t.textMuted, fontWeight: isLast ? 600 : 400 }}>
                Attack {attackNum}: {data.profile_type === 'Unknown' ? 'Unknown' : data.profile_type} ({data.confidence}%)
                {isLast && ' ◄ now'}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
