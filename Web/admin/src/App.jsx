import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TopNav from './components/TopNav';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ManageUsers from './pages/ManageUsers';
import ManageAdmins from './pages/ManageAdmins';
import ManageRecommendations from './pages/ManageRecommendations';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import Moderation from './pages/Moderation';
import Settings from './pages/Settings';
import SecurityLogs from './pages/SecurityLogs';
import Profile from './pages/Profile';
import './styles/index.css';
import './styles/layout.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="admin-layout">
                <TopNav />
                <Sidebar />
                <Routes>
                  <Route index element={<Dashboard />} />
                  <Route path="users" element={<ManageUsers />} />
                  <Route path="admins" element={<ManageAdmins />} />
                  <Route path="recommendations" element={<ManageRecommendations />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="moderation" element={<Moderation />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="security" element={<SecurityLogs />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
