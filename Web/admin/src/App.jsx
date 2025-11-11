import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TopNav from './components/TopNav';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ManageUsers from './pages/ManageUsers';
import ManageRecommendations from './pages/ManageRecommendations';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import Moderation from './pages/Moderation';
import './styles/index.css';
import './styles/layout.css';

function App() {
  return (
    <Router>
      <div className="admin-layout">
        <TopNav />
        <Sidebar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<ManageUsers />} />
          <Route path="/places" element={<Dashboard />} />
          <Route path="/recommendations" element={<ManageRecommendations />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/moderation" element={<Moderation />} />
          <Route path="/settings" element={<Dashboard />} />
          <Route path="/security" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
