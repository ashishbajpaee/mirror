import { useState, useEffect } from 'react';
import './EvidenceFeed.css';
import StatusBadge from './StatusBadge';
import useFullscreen from '../hooks/useFullscreen';
import { wsUrl } from '../config';

export default function EvidenceFeed() {
  useFullscreen();
  const [readings, setReadings] = useState(null);
  const [lastUpdate, setLastUpdate] = useState('');

  useEffect(() => {
    const ws = new WebSocket(wsUrl('/ws'));
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.sensors) {
          // Flatten: merge sensors + meta fields into one object for table display
          const merged = { ...data.sensors, is_attack: data.is_attack };
          setReadings(merged);
          const now = new Date();
          setLastUpdate(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`);
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    return () => ws.close();
  }, []);

  if (!readings) {
    return (
      <div className="evidence-root">
        <StatusBadge />
        <div className="evidence-loading">CONNECTING TO LIVE TELEMETRY...</div>
      </div>
    );
  }

  // Extract sensors/actuators (excluding meta fields like t, is_attack, etc.)
  const skipFields = ['t', 'is_attack', 'detected'];
  const fields = Object.keys(readings).filter(key => !skipFields.includes(key)).sort();

  return (
    <div className="evidence-root">
      <StatusBadge />
      
      <header className="evidence-header">
        <h1>DEFENDER EVIDENCE FEED</h1>
        <div className="streaming-badge">
          <span className="dot"></span> STREAMING
        </div>
      </header>

      <div className="evidence-table-container">
        <table className="evidence-table">
          <thead>
            <tr>
              <th>TAG</th>
              <th>VALUE (RAW)</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(tag => {
              const val = readings[tag];
              let isAnomalous = false;
              // Very naive anomaly check just for visual impact, or rely on global attack state
              // The backend doesn't explicitly flag which specific sensor is under attack in the websocket
              // However, if the entire row has `is_attack`, we highlight the row, but let's highlight based on the overall state
              if (readings.is_attack) {
                // If it's an actuator block, the value is probably 0 or 1.
                // It's a demo, so we'll highlight the whole row red if it's an attack?
                // Wait, the user asked for:
                // `Attack rows highlighted in red`
                // But WS only gives us `is_attack` for the whole array.
                // We'll highlight all rows slightly if `is_attack` is true, but that might be noisy.
                // The requirements say: `Attack rows highlighted in red`.
                // Actually they provided an example:
                // LIT101  0.623  NORMAL
                // AIT201  0.891  ATTACK 
                // Since the websocket doesn't provide which specific sensor is under attack, I'll spoof it or just highlight all if `is_attack` is true. Let's just highlight if standard deviations differ wildly, or simply show ATTACK status if `readings.is_attack` is true and `readings.detected` is on?
              }
              
              // We'll just show the raw value. 
              const formattedVal = typeof val === 'number' ? val.toFixed(4) : val;
              const rowStatus = readings.is_attack ? 'ATTACK' : 'NORMAL';
              const rowClass = readings.is_attack ? 'row-attack' : 'row-normal';

              return (
                <tr key={tag} className={rowClass}>
                  <td>{tag}</td>
                  <td className="mono">{formattedVal}</td>
                  <td>{rowStatus}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="evidence-footer">
        <div>Last update: {lastUpdate}</div>
        <div>Data source: Virtual Sensor Simulator</div>
        <div>Mode: DEMO (real-time streaming)</div>
      </footer>
    </div>
  );
}
