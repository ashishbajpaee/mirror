import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Demo Components (Attacker Terminal)
import Dashboard from './components/Dashboard';
import AttackerTerminal from './components/AttackerTerminal';
import DemoLauncher from './components/DemoLauncher';
import EvidenceFeed from './components/EvidenceFeed';
import DemoController from './components/DemoController';
import FinalResults from './components/FinalResults';
import AttackCards from './pages/AttackCards';

// Operational Dashboard
import CommandCenter from './pages/CommandCenter';
import AttackTheater from './pages/AttackTheater';
import VulnerabilityHeatmap from './pages/VulnerabilityHeatmap';
import MitigationEngine from './pages/MitigationEngine';
import MirrorPage from './pages/MirrorPage';
import DigitalTwin from './pages/DigitalTwin';
import SecurityIntel from './pages/SecurityIntel';
import IncidentTimeline from './pages/IncidentTimeline';
import FederatedLearning from './pages/FederatedLearning';

import AppLayout from './components/layout/AppLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default → Command Center */}
        <Route path="/" element={<Navigate to="/ops/command" replace />} />

        {/* All pages inside unified AppLayout shell */}
        <Route path="/ops" element={<AppLayout />}>
          <Route path="command" element={<CommandCenter />} />
          <Route path="attacks" element={<AttackTheater />} />
          <Route path="vulnerabilities" element={<VulnerabilityHeatmap />} />
          <Route path="mitigation" element={<MitigationEngine />} />
          <Route path="mirror" element={<MirrorPage />} />
          <Route path="twin" element={<DigitalTwin />} />
          <Route path="security" element={<SecurityIntel />} />
          <Route path="timeline" element={<IncidentTimeline />} />
          <Route path="federated" element={<FederatedLearning />} />

          {/* Demo pages — rendered inside the same shell */}
          <Route path="demo" element={<DemoLauncher />} />
          <Route path="attack-cards" element={<AttackCards />} />
          <Route path="demo/defender" element={<Dashboard />} />
          <Route path="demo/attacker" element={<AttackerTerminal />} />
          <Route path="demo/evidence" element={<EvidenceFeed />} />
          <Route path="demo/control" element={<DemoController />} />
          <Route path="demo/results" element={<FinalResults />} />
        </Route>

        {/* Legacy shortcut routes (outside shell for backward compat) */}
        <Route path="/attacker" element={<Navigate to="/ops/demo/attacker" replace />} />
        <Route path="/attack-cards" element={<Navigate to="/ops/attack-cards" replace />} />
        <Route path="/defender" element={<Navigate to="/ops/demo/defender" replace />} />
        <Route path="/demo" element={<Navigate to="/ops/demo" replace />} />
        <Route path="/demo/cards" element={<Navigate to="/ops/attack-cards" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
