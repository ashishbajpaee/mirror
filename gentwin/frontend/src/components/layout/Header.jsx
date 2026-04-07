import { Moon, Sun, MonitorPlay, Search } from 'lucide-react';

export default function Header({ 
  demoMode, setDemoMode, isDark, setIsDark, t,
  whatIfQuery, setWhatIfQuery, onSubmitWhatIf, isSubmittingWhatIf 
}) {
  return (
    <header 
      className="h-14 flex items-center justify-between px-6 shrink-0 font-sans transition-colors duration-200"
      style={{ backgroundColor: t.surface, borderBottom: `0.5px solid ${t.border}` }}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={15} style={{ color: t.textMuted }} />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-[7px] rounded-lg leading-5 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            style={{ 
              backgroundColor: t.inputBg, 
              border: `0.5px solid ${t.border}`, 
              color: t.text,
            }}
            placeholder="Ask AI / Run What-If Scenario..."
            value={whatIfQuery}
            onChange={(e) => setWhatIfQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSubmitWhatIf(); }}
            disabled={isSubmittingWhatIf}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setDemoMode(!demoMode)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
          style={{ 
            backgroundColor: demoMode ? (isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB') : t.inputBg,
            color: demoMode ? '#F59E0B' : t.textSecondary,
            border: `0.5px solid ${demoMode ? (isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A') : t.border}`,
          }}
        >
          <MonitorPlay size={14} />
          {demoMode ? 'Demo: ON' : 'Demo Mode'}
        </button>

        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: t.textMuted }}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
