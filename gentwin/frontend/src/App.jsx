import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Ashish's Demo Components (Attacker Terminal)
import Dashboard from './components/Dashboard';
import AttackerTerminal from './components/AttackerTerminal';
import DemoLauncher from './components/DemoLauncher';
import EvidenceFeed from './components/EvidenceFeed';
import DemoController from './components/DemoController';
import FinalResults from './components/FinalResults';
import AttackCards from './pages/AttackCards';

// Person 3 Operational Dashboard
import CommandCenter from './pages/CommandCenter';
import AttackTheater from './pages/AttackTheater';
import VulnerabilityHeatmap from './pages/VulnerabilityHeatmap';
import MitigationEngine from './pages/MitigationEngine';
import MirrorPage from './pages/MirrorPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default: Redirect to operational dashboard */}
        <Route path="/" element={<Navigate to="/ops/command" replace />} />
        
        {/* Operational Dashboard (Person 3) */}
        <Route path="/ops/command" element={<CommandCenter />} />
        <Route path="/ops/attacks" element={<AttackTheater />} />
        <Route path="/ops/vulnerabilities" element={<VulnerabilityHeatmap />} />
        <Route path="/ops/mitigation" element={<MitigationEngine />} />
        <Route path="/ops/mirror" element={<MirrorPage />} />
        
        {/* Ashish's Demo Routes (Attacker Terminal) */}
        <Route path="/demo" element={<DemoLauncher />} />
        <Route path="/demo/defender" element={<Dashboard />} />
        <Route path="/demo/attacker" element={<AttackerTerminal />} />
        <Route path="/demo/evidence" element={<EvidenceFeed />} />
        <Route path="/demo/control" element={<DemoController />} />
        <Route path="/demo/results" element={<FinalResults />} />
        <Route path="/demo/cards" element={<AttackCards />} />
      </Routes>
    </BrowserRouter>
  );
}
