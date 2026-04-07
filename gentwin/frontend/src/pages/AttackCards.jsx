import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import './AttackCards.css';

const API_BASE = 'http://localhost:8000';

export default function AttackCards() {
  const { isDark, t } = useOutletContext();
  const [cards, setCards] = useState([]);
  const [summary, setSummary] = useState({ total_launched: 0, detected: 0, undetected: 0, fastest_detection: 0 });
  const [feed, setFeed] = useState([]);
  const [plantState, setPlantState] = useState('NORMAL');
  const [cardStatusMap, setCardStatusMap] = useState({});
  const [launchingMap, setLaunchingMap] = useState({});

  useEffect(() => {
    fetch(`${API_BASE}/api/cards/all`)
      .then(res => res.json())
      .then(data => setCards(data))
      .catch(err => console.error("Error fetching cards", err));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      fetch(`${API_BASE}/api/cards/session_summary`)
        .then(res => res.json())
        .then(data => setSummary(data))
        .catch(() => {});
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      Object.keys(cardStatusMap).forEach(cardId => {
        const lastSt = cardStatusMap[cardId];
        if (lastSt === 'LAUNCHING' || (lastSt && (lastSt.is_running || (!lastSt.detected && lastSt.time_remaining > 0)))) {
          fetch(`${API_BASE}/api/cards/status/${cardId}`)
            .then(res => res.json())
            .then(data => {
              if (data.error) return;
              setCardStatusMap(prev => ({ ...prev, [cardId]: data }));
              if (!lastSt.detected && data.detected) injectFeedEvent(`Alert fired — ${data.detection_time_seconds}s`, "detected");
              if (lastSt.is_running && !data.is_running && !data.detected) injectFeedEvent(`BLINDSPOT — not caught`, "blindspot");
            })
            .catch(() => {});
        }
      });
      setPlantState(Object.values(cardStatusMap).some(st => st.is_running) ? 'UNDER ATTACK' : 'NORMAL');
    }, 500);
    return () => clearInterval(timer);
  }, [cardStatusMap]);

  const injectFeedEvent = (msg, type) => {
    const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setFeed(prev => [{ time: now, msg, type, id: Math.random() }, ...prev].slice(0, 5));
  };

  const handleLaunch = async (card) => {
    setLaunchingMap(prev => ({ ...prev, [card.id]: true }));
    setCardStatusMap(prev => ({ ...prev, [card.id]: 'LAUNCHING' }));
    try {
      await fetch(`${API_BASE}/api/cards/launch/${card.id}`, { method: 'POST' });
      injectFeedEvent(`${card.emoji} ${card.name} launched`, "launch");
      setTimeout(() => {
        setLaunchingMap(prev => ({ ...prev, [card.id]: false }));
        setCardStatusMap(prev => ({ ...prev, [card.id]: { is_running: true, time_remaining: card.duration } }));
      }, 1000);
    } catch {
      setLaunchingMap(prev => ({ ...prev, [card.id]: false }));
    }
  };

  const handleResetAll = async () => {
    if (window.confirm("Reset will stop all attacks and clear session data. Continue?")) {
      await fetch(`${API_BASE}/api/cards/reset_all`, { method: 'POST' });
      setCardStatusMap({});
      setFeed([]);
      setSummary({ total_launched: 0, detected: 0, undetected: 0, fastest_detection: 0 });
      setPlantState('NORMAL');
    }
  };

  const handleStopTryAgain = async (cardId) => {
    await fetch(`${API_BASE}/api/cards/stop/${cardId}`, { method: 'POST' });
    setCardStatusMap(prev => ({ ...prev, [cardId]: { ...prev[cardId], used: true, is_running: false } }));
  };

  // Style helpers
  const divider = { backgroundColor: isDark ? '#334155' : '#E2E8F0' };

  return (
    <div className="cards-page" style={{ color: t.text }}>
      <header className="page-header" style={{ borderBottom: `0.5px solid ${t.border}` }}>
        <div className="header-titles">
          <h2 style={{ color: t.text }}>GENTWIN | <span style={{ color: '#EF4444' }}>RED TEAM INTERFACE</span> | <span style={{ color: plantState === 'NORMAL' ? '#10B981' : '#EF4444' }}>● LIVE</span></h2>
          <p style={{ color: t.textMuted }}>SELECT AN ATTACK. CLICK TO LAUNCH.<br/>Watch what happens on the main screen.</p>
        </div>
      </header>

      <div className="main-content">
        <div className="cards-grid">
          {cards.map(card => {
            const status = cardStatusMap[card.id] || {};
            const isLaunching = launchingMap[card.id];

            let stateClass = "state-ready";
            if (isLaunching) stateClass = "state-launching";
            else if (status.is_running) stateClass = "state-running";
            else if (status.detected) stateClass = "state-detected";
            else if (status.used) stateClass = "state-used";
            else if (status.time_elapsed && !status.is_running && !status.detected) stateClass = "state-blindspot";

            return (
              <div
                key={card.id}
                className={`attack-card ${stateClass}`}
                style={{
                  '--card-border': card.border_color,
                  '--card-surface': isDark ? '#1e293b' : '#FFFFFF',
                  backgroundColor: isDark ? '#1e293b' : '#FFFFFF',
                  border: `1.5px solid ${card.border_color}`,
                }}
              >
                {(stateClass === 'state-detected' || stateClass === 'state-blindspot') && (
                  <div className="card-overlay">
                    {stateClass === 'state-detected' && (
                      <div className="overlay-content green-text">
                        <h3>✓ DETECTED</h3>
                        <p>in {status.detection_time_seconds} seconds</p>
                        <button onClick={() => handleStopTryAgain(card.id)}>🔄 TRY AGAIN</button>
                      </div>
                    )}
                    {stateClass === 'state-blindspot' && (
                      <div className="overlay-content red-text bold">
                        <h3>⚠ BLINDSPOT</h3>
                        <p>NOT DETECTED</p>
                        <p style={{ fontSize: '12px', opacity: 0.7 }}>GenTwin found gap</p>
                        <button onClick={() => handleStopTryAgain(card.id)} className="red-btn">🔄 TRY AGAIN</button>
                      </div>
                    )}
                  </div>
                )}

                <div className="card-emoji">{card.emoji}</div>
                <h3 className="card-name" style={{ color: t.text }}>{card.name}</h3>
                <p className="card-tagline" style={{ color: t.textMuted }}>{card.tagline}</p>
                <div className="card-divider" style={divider} />
                <p className="card-desc" style={{ color: t.textSecondary }}>{card.description}</p>
                <div className="card-divider" style={divider} />

                <div className="stealth-row" style={{ color: t.text }}>
                  <span>STEALTH:</span>
                  <span className="stealth-badge" style={{ background: card.stealth_color }}>{card.stealth}</span>
                </div>
                <div className="expected-out" style={{ color: t.textSecondary }}>
                  <p>Expected:</p>
                  <strong style={{ color: t.text }}>{card.expected}</strong>
                </div>

                <div className="action-area">
                  {isLaunching ? (
                    <button className="launch-btn disabled" style={{ backgroundColor: card.border_color }}>⏳ Launching...</button>
                  ) : status.is_running ? (
                    <button className="launch-btn running-btn" onClick={() => handleStopTryAgain(card.id)}>
                      ⚡ RUNNING 00:{status.time_remaining?.toString().padStart(2, '0')}<br/>
                      <span className="stop-text">[⏹ STOP ATTACK]</span>
                    </button>
                  ) : (
                    <button className="launch-btn" style={{ backgroundColor: card.border_color }} onClick={() => handleLaunch(card)}>🚀 LAUNCH</button>
                  )}
                </div>
                {status.used && <div className="used-badge" style={{ backgroundColor: isDark ? '#334155' : '#E2E8F0', color: t.textMuted }}>USED</div>}
              </div>
            );
          })}
        </div>

        <div className="live-feed" style={{ backgroundColor: isDark ? '#1e293b' : '#F8FAFC', border: `0.5px solid ${t.border}` }}>
          <h3 style={{ color: t.textMuted }}>LIVE FEED</h3>
          <div className="feed-list">
            {feed.map(item => (
              <div key={item.id} className={`feed-item ${item.type}`} style={{ color: item.type === 'detected' ? '#10B981' : item.type === 'blindspot' ? '#EF4444' : t.text }}>
                <span className="feed-time" style={{ color: t.textMuted }}>{item.time}</span> {item.msg}
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="status-bar" style={{ backgroundColor: isDark ? '#0f172a' : '#F1F5F9', borderTop: `0.5px solid ${t.border}` }}>
        <div className="plant-health" style={{ color: t.text }}>
          {plantState === 'NORMAL' ? <><span style={{ color: '#10B981' }}>●</span> PLANT: NORMAL</> : <span className="red-text pulse">● PLANT: UNDER ATTACK</span>}
        </div>
        <div className="stats-box" style={{ color: t.textSecondary }}>
          <span>Launched: {summary.total_launched}</span>
          <span>Detected: {summary.detected}</span>
          <span>Missed: {summary.undetected}</span>
          <span>Best: {summary.fastest_detection}s</span>
        </div>
        <button className="reset-btn" onClick={handleResetAll} style={{ color: t.textMuted, borderColor: t.border }}>🔄 Reset</button>
      </footer>
    </div>
  );
}
