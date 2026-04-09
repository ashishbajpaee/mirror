import { useState, useEffect } from 'react';
import './AttackerGenome.css';
import { apiUrl } from '../config';

export default function AttackerGenome() {
  const [profile, setProfile] = useState(null);
  const [timeline, setTimeline] = useState({});

  useEffect(() => {
    let active = true;
    const fetchGenome = async () => {
      try {
        const [profRes, timeRes] = await Promise.all([
          fetch(apiUrl('/api/genome/profile')),
          fetch(apiUrl('/api/genome/timeline'))
        ]);
        const profData = await profRes.json();
        const timeData = await timeRes.json();
        
        if (active) {
          setProfile(profData);
          setTimeline(timeData);
        }
      } catch (e) {
        console.error("Genome fetch failed", e);
      }
    };

    // Initial fetch
    fetchGenome();
    // Poll every 2 seconds
    const interval = setInterval(fetchGenome, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (!profile) return null;

  const isAnalyzing = profile.profile_type === "Analyzing behaviour..." || profile.profile_type === "Unknown";
  
  // Style helpers
  const getRiskClass = (level) => {
    switch(level) {
      case 'CRITICAL': return 'risk-critical';
      case 'HIGH': return 'risk-high';
      case 'MEDIUM': return 'risk-medium';
      case 'LOW': return 'risk-low';
      default: return '';
    }
  };

  const getDimensionFill = (val) => {
    if (val === "Unknown") return 0;
    // Map values to pseudo-progress numbers for the UI bar
    const mapping = {
      Systematic: 90, Targeted: 70, Random: 30,
      "Informed": 90, "Control-focused": 70, "Sensor-focused": 30, "Entry-point thinker": 50,
      Aggressive: 90, Adaptive: 70, Persistent: 50, Cautious: 30,
      "Financial": 90, "Disruption": 80, "Surveillance": 50, "Data manipulation": 30
    };
    return mapping[val] || 0;
  };

  return (
    <div className="genome-panel">
      <div className="genome-header">
        <span className="genome-icon">🧬</span>
        <div>
          <h2>ATTACKER GENOME ANALYSIS</h2>
          <p>Behavioural Profiling Engine</p>
        </div>
      </div>

      <div className="genome-top-row">
        <div className="profile-type-box">
          <div className="box-label">PROFILE TYPE</div>
          <div className={`profile-name ${isAnalyzing ? 'analyzing-text' : ''}`}>
             {isAnalyzing ? "Analyzing behaviour..." : profile.profile_type.toUpperCase()}
          </div>
          <div className={`risk-label ${getRiskClass(profile.risk_level)}`}>
            RISK: {profile.risk_level}
          </div>
        </div>
        <div className="confidence-box">
          <div className="box-label">CONFIDENCE</div>
          <div className="confidence-value">{profile.confidence}%</div>
          <div className="confidence-bar-bg">
            <div 
              className={`confidence-bar-fill ${profile.confidence > 85 ? 'locked' : ''}`} 
              style={{ width: `${profile.confidence}%` }} 
            />
          </div>
          {profile.confidence > 85 && <div className="locked-msg">Profile locked</div>}
        </div>
      </div>

      <div className="genome-dimensions">
        <div className="box-label" style={{marginBottom: '8px'}}>GENOME DIMENSIONS</div>
        
        {Object.entries(profile.dimension_scores || {}).map(([key, val]) => {
          const fill = getDimensionFill(val);
          const blockCount = Math.floor(fill / 10);
          const blocks = '█'.repeat(blockCount) + '░'.repeat(10 - blockCount);
          const label = key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
          
          return (
            <div key={key} className="dimension-row">
              <span className="dim-label">{label}</span>
              <span className="dim-blocks">[{blocks}]</span>
              <span className="dim-value">{val}</span>
            </div>
          );
        })}
      </div>

      <div className="genome-insight">
        <div className="box-label">KEY INSIGHT</div>
        <p>"{profile.key_insight}"</p>
      </div>

      <div className="genome-response">
        <div className="box-label">RECOMMENDED RESPONSE</div>
        <ul>
          {profile.recommended_response.split('. ').filter(Boolean).map((res, i) => (
            <li key={i}>→ {res}</li>
          ))}
        </ul>
      </div>

      <div className="genome-timeline">
        <div className="box-label">PROFILE EVOLUTION TIMELINE</div>
        <div className="timeline-list">
          {Object.entries(timeline).length === 0 && <div className="timeline-item">No attacks yet</div>}
          {Object.entries(timeline).map(([key, data], idx) => {
            const attackNum = key.split('_').pop();
            const isLast = idx === Object.keys(timeline).length - 1;
            return (
              <div key={key} className={`timeline-item ${isLast ? 'timeline-current' : ''}`}>
                Attack {attackNum}: {data.profile_type === 'Unknown' ? 'Unknown' : data.profile_type} ({data.confidence}%)
                {isLast && ' ◄ now'}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
