import { useState, useEffect } from 'react';
import './StatusBadge.css';

export default function StatusBadge() {
  const [status, setStatus] = useState('NORMAL'); // NORMAL, ALERT

  useEffect(() => {
    // Open a dedicated tiny websocket connection just for the badge status
    // Alternatively, if the parent provides it string we can use a prop.
    // For universal standalone use, let's connect independently.
    const socket = new WebSocket('ws://localhost:8000/ws');

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.is_attack) {
          setStatus('ATTACK ACTIVE');
        } else {
          setStatus('LIVE');
        }
      } catch (e) {
        console.error(e);
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className={`global-status-badge ${status === 'LIVE' || status === 'NORMAL' ? 'mode-live' : 'mode-alert'}`}>
      <div className="status-dot"></div>
      <span className="status-text">{status === 'NORMAL' ? 'LIVE' : status}</span>
    </div>
  );
}
