import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Activity, Bug, ShieldAlert, Layers,
  BrainCircuit, FileText, MonitorPlay, SwatchBook,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

const MENU_ITEMS = [
  { path: '/ops/command', label: 'Command Center', icon: LayoutDashboard },
  { path: '/ops/attacks', label: 'Attack Theater', icon: Bug },
  { path: '/ops/vulnerabilities', label: 'Vulnerability Heatmap', icon: Activity },
  { path: '/ops/mitigation', label: 'Mitigation Engine', icon: ShieldAlert },
  { path: '/ops/mirror', label: 'Active Mirror', icon: Layers },
  { path: '/ops/twin', label: 'Digital Twin', icon: BrainCircuit },
  { path: '/ops/timeline', label: 'Incident Timeline', icon: FileText },
];

const DEMO_ITEMS = [
  { path: '/ops/demo', label: 'Demo Launcher', icon: MonitorPlay },
  { path: '/ops/attack-cards', label: 'Attack Cards', icon: SwatchBook },
];

export default function Sidebar({ collapsed, setCollapsed, isDark, t }) {
  const location = useLocation();

  const navItemStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : '0.625rem',
    justifyContent: collapsed ? 'center' : 'flex-start',
    padding: collapsed ? '0.5rem 0' : '7px 0.75rem',
    borderRadius: '6px',
    fontSize: '13px',
    transition: 'background-color 0.15s',
    color: isActive ? '#2563EB' : t.textSecondary,
    backgroundColor: isActive ? t.activeBg : 'transparent',
    fontWeight: isActive ? 500 : 400,
  });

  const demoItemStyle = (isActive) => ({
    ...navItemStyle(isActive),
    color: isActive ? '#F59E0B' : t.textSecondary,
    backgroundColor: isActive ? (isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB') : 'transparent',
  });

  return (
    <aside 
      className="shrink-0 flex flex-col h-full font-sans transition-all duration-200"
      style={{ 
        width: collapsed ? 56 : 240,
        backgroundColor: t.surface,
        borderRight: `0.5px solid ${t.border}`,
      }}
    >
      {/* Logo + collapse */}
      <div 
        className="h-14 flex items-center justify-between px-3 shrink-0"
        style={{ borderBottom: `0.5px solid ${t.border}` }}
      >
        {!collapsed && (
          <h1 className="text-base font-semibold tracking-tight pl-2" style={{ color: t.text }}>
            Gen<span style={{ color: '#2563EB' }}>Twin</span>
          </h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: t.textMuted }}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-5">
        <div>
          {!collapsed && (
            <div className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 px-5" style={{ color: t.textMuted }}>
              Operations
            </div>
          )}
          <div className="space-y-0.5 px-2">
            {MENU_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path} title={collapsed ? item.label : undefined} style={navItemStyle(isActive)}>
                  <Icon size={16} style={{ color: isActive ? '#2563EB' : t.textMuted, flexShrink: 0 }} />
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          {!collapsed && (
            <div className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 px-5" style={{ color: t.textMuted }}>
              Demos
            </div>
          )}
          <div className="space-y-0.5 px-2">
            {DEMO_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path} title={collapsed ? item.label : undefined} style={demoItemStyle(isActive)}>
                  <Icon size={16} style={{ color: isActive ? '#F59E0B' : t.textMuted, flexShrink: 0 }} />
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 p-2" style={{ borderTop: `0.5px solid ${t.border}` }}>
        <div className={`flex items-center gap-2 px-2 py-2 text-[12px] ${collapsed ? 'justify-center' : ''}`} style={{ color: t.textMuted }}>
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#10B981' }}></div>
          {!collapsed && <span>Healthy</span>}
        </div>
      </div>
    </aside>
  );
}
