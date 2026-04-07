import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Shield, Swords, BarChart3, RotateCcw } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const SCREENS = [
  { to: '/ops/demo/defender', label: 'Defender Screen', sub: 'Main projector view', icon: Shield, accent: '#10B981' },
  { to: '/ops/demo/attacker', label: 'Attacker Terminal', sub: "Judge's tablet", icon: Swords, accent: '#EF4444' },
  { to: '/ops/demo/evidence', label: 'Evidence Feed', sub: 'Raw data & telemetry', icon: BarChart3, accent: '#8B5CF6' },
];

export default function DemoLauncher() {
  const { isDark, t } = useOutletContext();
  const [resetting, setResetting] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const handleReset = async () => {
    setResetting(true);
    try {
      await fetch(`${API_BASE}/api/attacker/reset`, { method: 'POST' });
      alert("✅ Demo successfully reset. All screens are now cleared.");
    } catch (e) {
      alert("❌ Failed to reset demo. Ensure backend is running.");
    }
    setResetting(false);
  };

  const card = { backgroundColor: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 8 };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: t.text }}>
          GenTwin <span style={{ color: '#2563EB' }}>Demo Launcher</span>
        </h1>
        <p className="text-[14px]" style={{ color: t.textSecondary }}>Three-Screen Presentation Mode</p>
      </div>

      {/* Screen cards — using React Router Link, same page navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl mb-12">
        {SCREENS.map((screen, idx) => {
          const Icon = screen.icon;
          const isHovered = hoveredIdx === idx;
          return (
            <Link
              key={screen.to}
              to={screen.to}
              className="flex flex-col items-center justify-center py-10 px-5 rounded-lg transition-all duration-200"
              style={{
                ...card,
                borderColor: isHovered ? screen.accent : t.border,
                textDecoration: 'none',
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{
                backgroundColor: isDark ? `${screen.accent}15` : `${screen.accent}10`,
                border: `0.5px solid ${screen.accent}30`,
              }}>
                <Icon size={24} style={{ color: screen.accent }} />
              </div>
              <h2 className="text-[15px] font-semibold mb-1" style={{ color: t.text }}>{screen.label}</h2>
              <p className="text-[12px]" style={{ color: t.textMuted }}>{screen.sub}</p>
            </Link>
          );
        })}
      </div>

      {/* Reset button */}
      <button
        onClick={handleReset}
        disabled={resetting}
        className="flex items-center gap-2 px-6 py-3 rounded-lg text-[14px] font-medium text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#EF4444' }}
      >
        <RotateCcw size={16} />
        {resetting ? 'Resetting...' : 'Reset Demo'}
      </button>
    </div>
  );
}
