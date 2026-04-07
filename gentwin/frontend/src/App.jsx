import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AttackerTerminal from './components/AttackerTerminal';
import DemoLauncher from './components/DemoLauncher';
import EvidenceFeed from './components/EvidenceFeed';
import DemoController from './components/DemoController';
import FinalResults from './components/FinalResults';
import AttackCards from './pages/AttackCards';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/attacker" element={<AttackerTerminal />} />
        {/* Three-Screen Demo Routes */}
        <Route path="/demo" element={<DemoLauncher />} />
        <Route path="/demo/defender" element={<Dashboard />} />
        <Route path="/demo/attacker" element={<AttackerTerminal />} />
        <Route path="/demo/evidence" element={<EvidenceFeed />} />
        <Route path="/demo/control" element={<DemoController />} />
        <Route path="/demo/results" element={<FinalResults />} />
        <Route path="/attack-cards" element={<AttackCards />} />
      </Routes>
    </BrowserRouter>
  );
}
