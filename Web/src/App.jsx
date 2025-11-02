// src/App.jsx
import { AuthProvider, useAuth } from "./context/AuthContext";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import OTPVerification from "./components/OtpVerify";
import Dashboard from "./pages/DashBoard";
import LandingPage from "./pages/landingPage";
import Navbar from "./components/navbar";
import Sidebar from "./components/Sidebar";
import Landmark from "./pages/Landmark";
import Profile from "./pages/Profile";
import LandmarkResult from "./pages/LandmarkResult";
import Community from "./pages/Community";
import PostDetail from "./pages/PostDetail";
import Chats from "./pages/Chats";
import Notifications from "./pages/Notifications";
import Search from "./pages/Search";
import GroupDetail from "./pages/GroupDetail";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <AuthProvider>
      {/* Router enables navigation between pages */}
      <Router>
        <Navbar/>
        <Routes>
          {/* Signup Page */}

          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route path="/verify-otp" element={<OTPVerification />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div className="jtp-layout">
                  <Sidebar />
                  <main className="jtp-content">
                    <Dashboard />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/landmark"
            element={
              <ProtectedRoute>
                <div className="jtp-layout">
                  <Sidebar />
                  <main className="jtp-content p-3">
                    <Landmark />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/landmark/result"
            element={
              <ProtectedRoute>
                <div className="jtp-layout">
                  <Sidebar />
                  <main className="jtp-content p-3">
                    <LandmarkResult />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/chats"
            element={
              <ProtectedRoute>
                <div className="jtp-layout">
                  <Sidebar />
                  <main className="jtp-content p-3">
                    <Chats />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommendations"
            element={
              <ProtectedRoute>
                <div className="jtp-layout">
                  <Sidebar />
                  <main className="jtp-content p-3">
                    <div className="container-fluid">Recommendations</div>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <div className="jtp-layout">
                  <Sidebar />
                  <main className="jtp-content p-3">
                    <Community />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/post/:postId"
            element={
              <ProtectedRoute>
                <div className="jtp-layout">
                  <Sidebar />
                  <main className="jtp-content p-3">
                    <PostDetail />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <div className="jtp-layout">
                  <Sidebar />
                  <main className="jtp-content p-3">
                    <Profile />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <div className="jtp-layout">
                  <Sidebar />
                  <main className="jtp-content p-3">
                    <Notifications />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <div className="jtp-layout">
                  <Sidebar />
                  <main className="jtp-content p-3">
                    <Search />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/group/:groupId"
            element={
              <ProtectedRoute>
                <div className="jtp-layout">
                  <Sidebar />
                  <main className="jtp-content p-3">
                    <GroupDetail />
                  </main>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Login Page */}
          <Route path="/login" element={<LoginPage />} />

          {/* Default Route - Redirect to Signup */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
