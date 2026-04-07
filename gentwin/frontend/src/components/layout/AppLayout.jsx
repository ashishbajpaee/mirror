import { useState, useEffect, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { api } from '../../api/client';
import Sidebar from './Sidebar';
import Header from './Header';

const ThemeContext = createContext({ isDark: false });
export function useTheme() { return useContext(ThemeContext); }

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('gentwin-theme') === 'dark');
  const [whatIfQuery, setWhatIfQuery] = useState('');
  const [whatIfError, setWhatIfError] = useState('');
  const [isSubmittingWhatIf, setIsSubmittingWhatIf] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState(null);

  useEffect(() => {
    localStorage.setItem('gentwin-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const onSubmitWhatIf = async () => {
    if (!whatIfQuery.trim()) return;
    setIsSubmittingWhatIf(true);
    setWhatIfError('');
    try {
      const res = await api.post('/what-if', { natural_language_query: whatIfQuery });
      setWhatIfResult(res.data);
    } catch (err) {
      setWhatIfError('What-if query failed. Is the backend running?');
    } finally {
      setIsSubmittingWhatIf(false);
    }
  };

  // All colors are driven by this single state — no CSS class fighting
  const t = isDark ? {
    bg: '#020617',
    surface: '#0f172a',
    border: '#1e293b',
    text: '#e2e8f0',
    textSecondary: '#94a3b8',
    textMuted: '#64748B',
    inputBg: '#1e293b',
    hoverBg: '#1e293b',
    activeBg: 'rgba(37,99,235,0.15)',
  } : {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    inputBg: '#F8FAFC',
    hoverBg: '#F1F5F9',
    activeBg: '#EFF6FF',
  };

  return (
    <ThemeContext.Provider value={{ isDark, t }}>
      <div 
        className="flex h-screen w-full overflow-hidden transition-colors duration-200"
        style={{ backgroundColor: t.bg, color: t.text }}
      >
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} isDark={isDark} t={t} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header 
            demoMode={demoMode}
            setDemoMode={setDemoMode}
            isDark={isDark}
            setIsDark={setIsDark}
            t={t}
            whatIfQuery={whatIfQuery}
            setWhatIfQuery={setWhatIfQuery}
            onSubmitWhatIf={onSubmitWhatIf}
            isSubmittingWhatIf={isSubmittingWhatIf}
          />
          
          <main className="flex-1 overflow-y-auto w-full">
            {whatIfResult && (
              <div 
                className="mx-6 mt-4 p-4 rounded-lg"
                style={{ backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB', border: `0.5px solid ${isDark ? 'rgba(245,158,11,0.2)' : '#FDE68A'}` }}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold" style={{ color: '#F59E0B' }}>What-If Result</h4>
                  <button onClick={() => setWhatIfResult(null)} className="text-xs" style={{ color: t.textMuted }}>✕ Close</button>
                </div>
                <p className="mt-1 text-[13px]" style={{ color: t.textSecondary }}>{whatIfResult.plain_english_summary}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[12px]" style={{ color: t.textSecondary }}>
                  <span>Detected: {whatIfResult.detected ? 'Yes' : 'No'}</span>
                  <span>|</span>
                  <span>Time-to-failure: {whatIfResult.time_to_failure} min</span>
                  <span>|</span>
                  <span>Cascade: {(whatIfResult.cascade_chain || []).join(' → ')}</span>
                </div>
              </div>
            )}
            
            <div className="p-6 flex-1 flex flex-col">
              <Outlet context={{ demoMode, isDark, t }} />
            </div>
          </main>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
