import { useState, useEffect, useCallback } from 'react';
import './DemoController.css';

const API_BASE = 'http://localhost:8000';

export default function DemoController() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [status, setStatus] = useState({
    running_moment: null,
    elapsed_seconds: 0,
    total_seconds: 0,
    current_action_text: null
  });

  const handleAuth = (e) => {
    e.preventDefault();
    if (password === 'gentwin2025') {
      setAuthed(true);
    } else {
      alert("Invalid password");
    }
  };

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/demo/status`);
      const data = await res.json();
      setStatus(data);

      // Auto advance logic
      if (autoAdvance && data.running_moment && data.running_moment < 5) {
        if (data.elapsed_seconds >= data.total_seconds) {
           // Moment finished natively, trigger next one
           triggerMoment(data.running_moment + 1);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [autoAdvance]);

  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(pollStatus, 1000);
    return () => clearInterval(interval);
  }, [authed, pollStatus]);

  const triggerMoment = async (id) => {
    await fetch(`${API_BASE}/api/demo/moment/${id}`, { method: 'POST' });
    pollStatus();
  };

  const triggerAction = async (endpoint) => {
    await fetch(`${API_BASE}/api/demo/${endpoint}`, { method: 'POST' });
    pollStatus();
  };

  const quickAttack = async (cmd) => {
    await fetch(`${API_BASE}/api/attacker/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd })
    });
  };

  useEffect(() => {
    if (!authed) return;
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const key = e.key.toLowerCase();
      if (['1','2','3','4','5'].includes(key)) {
        triggerMoment(parseInt(key));
      } else if (key === 's') {
        triggerAction('stop');
      } else if (key === 'r') {
        triggerAction('reset');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authed]);

  if (!authed) {
    return (
      <div className="auth-container">
        <form onSubmit={handleAuth} className="auth-box">
          <h2>RESTRICTED ACCESS</h2>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter unlock code"
            autoFocus
          />
          <button type="submit">UNLOCK DEMO CONTROLS</button>
        </form>
      </div>
    );
  }

  const { running_moment, elapsed_seconds, total_seconds, current_action_text } = status;
  const progressPercent = total_seconds > 0 ? (elapsed_seconds / total_seconds) * 100 : 0;

  return (
    <div className="controller-root">
      <header className="controller-header">
        <h1>GENTWIN DEMO CONTROLLER</h1>
        <div className="badge hidden-badge">HIDDEN &mdash; PRESENTER ONLY</div>
      </header>

      <div className="controller-grid">
        <div className="moments-panel">
          <h2>CHOREOGRAPHED MOMENTS</h2>
          <div className="trigger-list">
            <button className={`moment-btn ${running_moment === 1 ? 'active' : ''}`} onClick={() => triggerMoment(1)}>
              <span className="moment-num">1</span> NORMAL OPERATION <span className="dur">(15s)</span>
            </button>
            <button className={`moment-btn ${running_moment === 2 ? 'active' : ''}`} onClick={() => triggerMoment(2)}>
              <span className="moment-num">2</span> FIRST ATTACK: MISSED <span className="dur">(30s)</span>
            </button>
            <button className={`moment-btn ${running_moment === 3 ? 'active' : ''}`} onClick={() => triggerMoment(3)}>
              <span className="moment-num">3</span> FIX &amp; RETEST <span className="dur">(30s)</span>
            </button>
            <button className={`moment-btn ${running_moment === 4 ? 'active' : ''}`} onClick={() => triggerMoment(4)}>
              <span className="moment-num">4</span> CASCADE ATTACK <span className="dur">(45s)</span>
            </button>
            <button className={`moment-btn ${running_moment === 5 ? 'active' : ''}`} onClick={() => triggerMoment(5)}>
              <span className="moment-num">5</span> FINAL NUMBERS <span className="dur">(15s)</span>
            </button>
          </div>
          <div className="auto-advance">
            <label>
              <input type="checkbox" checked={autoAdvance} onChange={e => setAutoAdvance(e.target.checked)} />
              Auto-Advance to next moment
            </label>
          </div>
        </div>

        <div className="status-panel">
          <div className="status-box">
            <h3>CURRENTLY RUNNING</h3>
            <div className="status-large">{running_moment ? `MOMENT ${running_moment}` : 'IDLE'}</div>
            
            <div className="progress-section">
              <div className="time-row">
                <span>Time elapsed:</span>
                <span>{elapsed_seconds}s / {total_seconds}s</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>

            <div className="action-text">
              {current_action_text || 'Waiting for trigger...'}
            </div>
            
            <div className="control-actions">
              <button className="btn-stop" onClick={() => triggerAction('stop')}>⏹ STOP</button>
              <button className="btn-reset" onClick={() => triggerAction('reset')}>🔄 RESET ALL</button>
            </div>
          </div>
          
          <div className="quick-commands">
            <h3>QUICK ATTACKS (MANUAL)</h3>
            <div className="quick-grid">
              <button onClick={() => quickAttack("spoof LIT101")}>SPOOF LIT101</button>
              <button onClick={() => quickAttack("block pump P101")}>BLOCK P101</button>
              <button onClick={() => quickAttack("drift AIT201 slowly")}>DRIFT AIT201</button>
              <button onClick={() => quickAttack("attack all sensors in stage 1")}>CASCADE P1</button>
            </div>
          </div>
          
          <div className="tips">
            <strong>SHORTCUTS:</strong> [1-5]: Launch | [S]: Stop | [R]: Reset
          </div>
          
          <div className="results-launch" style={{ marginTop: '24px' }}>
             <button 
                onClick={() => window.open('/demo/results', '_blank')}
                style={{ width: '100%', padding: '16px', fontSize: '18px', fontWeight: 'bold', background: '#e5a50a', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                ▶ FINAL RESULTS
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
