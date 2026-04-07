import { useState, useEffect, useCallback } from 'react';
import './FinalResults.css';

const API_BASE = 'http://localhost:8000';

function AnimatedCounter({ targetValue, active, isPercent = false }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!active) {
      setCurrent(0);
      return;
    }
    
    let start = 0;
    const duration = 800; // ms
    const incrementTime = 30; // ms
    const steps = duration / incrementTime;
    const incrementVal = targetValue / steps;

    const timer = setInterval(() => {
      start += incrementVal;
      if (start >= targetValue) {
        setCurrent(targetValue);
        clearInterval(timer);
      } else {
        setCurrent(Math.floor(start));
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [targetValue, active]);

  return (
    <span>
      {current.toLocaleString()}{isPercent ? '%' : ''}
    </span>
  );
}

export default function FinalResults() {
  const [stats, setStats] = useState(null);
  const [stage, setStage] = useState(-1);

  // Fetch initial summary from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/results/summary`);
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to load final stats', err);
      }
    };
    fetchStats();
  }, []);

  const triggerNext = useCallback(() => {
    setStage(prev => {
      if (prev < 7) return prev + 1;
      return prev;
    });
  }, []);

  const resetAnimation = useCallback(() => {
    setStage(-1);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space') {
        if (stage === -1) triggerNext();
      } else if (e.code === 'KeyR') {
        resetAnimation();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [stage, triggerNext, resetAnimation]);

  // Handle auto-advancing through the sequence after it's started
  useEffect(() => {
    if (stage >= 0 && stage < 6) {
      const timer = setTimeout(() => {
        triggerNext();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [stage, triggerNext]);

  if (!stats) return <div className="results-root">Loading...</div>;

  return (
    <div className="results-root" onClick={() => { if(stage === -1) triggerNext(); }}>
      
      {stage === -1 && (
        <div className="start-prompt">
          [PRESS SPACE TO LAUNCH RESULTS]
        </div>
      )}

      {stage >= 0 && (
        <h1 className="results-title fade-in">GENTWIN &mdash; MISSION COMPLETE</h1>
      )}

      <div className="stats-list">
        <div className={`stat-card ${stage >= 0 ? 'slide-in-right' : 'hidden'}`}>
          <div className="stat-number">
             <AnimatedCounter targetValue={stats.total_attacks_generated} active={stage >= 0} />
          </div>
          <div className="stat-label">attacks generated</div>
        </div>

        <div className={`stat-card ${stage >= 1 ? 'slide-in-right' : 'hidden'}`}>
          <div className="stat-number">
             <AnimatedCounter targetValue={stats.detected_by_standard} active={stage >= 1} />
          </div>
          <div className="stat-label">detected by standard AI</div>
        </div>

        <div className={`stat-card ${stage >= 2 ? 'slide-in-right' : 'hidden'}`}>
          <div className="stat-number">
             <AnimatedCounter targetValue={stats.gaps_discovered} active={stage >= 2} />
          </div>
          <div className="stat-label">gaps discovered</div>
        </div>

        <div className={`stat-card ${stage >= 3 ? 'slide-in-right' : 'hidden'}`}>
          <div className="stat-number text-red">
             <AnimatedCounter targetValue={stats.critical_kill_chains} active={stage >= 3} />
          </div>
          <div className="stat-label">critical kill chains</div>
        </div>

        <div className={`stat-card stat-card-highlight ${stage >= 4 ? 'slide-in-right' : 'hidden'}`}>
          <div className="stat-number">
             <AnimatedCounter targetValue={stats.improvement_percentage} active={stage >= 4} isPercent={true} />
          </div>
          <div className="stat-label">improvement in coverage</div>
        </div>
      </div>

      <div className="bottom-section">
        <div className={`before-after-table ${stage >= 5 ? 'fade-in' : 'hidden'}`}>
          <div className="ba-col">
            <h3>BEFORE GENTWIN</h3>
            <p><strong>{stats.gaps_discovered}</strong> blind spots</p>
            <p><strong>0</strong> kill chains mapped</p>
            <p>Manual detection</p>
            <p>Unknown attacks</p>
          </div>
          <div className="ba-col divider">
            &#8594;<br />&#8594;<br />&#8594;<br />&#8594;
          </div>
          <div className="ba-col text-green">
            <h3>AFTER GENTWIN</h3>
            <p><strong>{stats.gaps_remaining}</strong> blind spots</p>
            <p><strong>{stats.critical_kill_chains}</strong> mapped</p>
            <p><strong>{stats.average_detection_ms / 1000}s</strong> automatic</p>
            <p>Profiled</p>
          </div>
        </div>

        <div className={`final-statement ${stage >= 6 ? 'slow-fade-in' : 'hidden'}`}>
          The plant is more secure than<br />it was 4 minutes ago.
        </div>
      </div>

    </div>
  );
}
