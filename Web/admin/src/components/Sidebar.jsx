import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiShield,
  FiMapPin, 
  FiBarChart2, 
  FiBell, 
  FiFileText, 
  FiSettings, 
  FiLock,
  FiLogOut,
  FiMenu,
  FiX,
  FiUser
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [hasSettingsAccess, setHasSettingsAccess] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [hasSecurityLogsAccess, setHasSecurityLogsAccess] = useState(false);
  const [hasModerationAccess, setHasModerationAccess] = useState(false);

  // Check if user has access to settings (CEO only), security logs (Supervisor or above), and moderation (Supervisor or above)
  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Check from localStorage first
        const cachedUser = localStorage.getItem('adminUser');
        if (cachedUser) {
          try {
            const user = JSON.parse(cachedUser);
            const role = user.adminRole;
            
            // Settings: CEO only
            if (role === 'ceo') {
              setHasSettingsAccess(true);
            }
            
            // Security Logs & Moderation: Supervisor or above (CEO, Supervisor)
            if (role === 'ceo' || role === 'supervisor') {
              setHasSecurityLogsAccess(true);
              setHasModerationAccess(true);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        // Fetch from server
        try {
          const { getAdminPermissions } = await import('../api/adminApi');
          const response = await getAdminPermissions();
          if (response.data) {
            const role = response.data.adminRole;
            const permissions = response.data.permissions || [];
            
            // Settings: CEO only
            if (role === 'ceo' || permissions.includes('manage_settings')) {
              setHasSettingsAccess(true);
            }
            
            // Security Logs & Moderation: Supervisor or above
            if (role === 'ceo' || role === 'supervisor') {
              setHasSecurityLogsAccess(true);
              setHasModerationAccess(true);
            }
          }
        } catch (permError) {
          // Fallback: Check from admin profile
          try {
            const { getAdminProfile } = await import('../api/adminApi');
            const profileResponse = await getAdminProfile();
            if (profileResponse.data) {
              const role = profileResponse.data.adminRole;
              
              // Settings: CEO only
              if (role === 'ceo') {
                setHasSettingsAccess(true);
              }
              
              // Security Logs & Moderation: Supervisor or above
              if (role === 'ceo' || role === 'supervisor') {
                setHasSecurityLogsAccess(true);
                setHasModerationAccess(true);
              }
            }
          } catch (profileError) {
            // Ignore errors
          }
        }
      } catch (err) {
        // Ignore errors, default to no access
        setHasSettingsAccess(false);
        setHasSecurityLogsAccess(false);
        setHasModerationAccess(false);
      }
    };

    checkAccess();
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      // Call logout API if available
      try {
        const api = await import('../api/api');
        await api.default.post('/users/logout');
      } catch (apiError) {
        // Ignore logout API errors
        console.log('Logout API call failed, continuing with local logout');
      }
      
      // Clear admin authentication data
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminPermissions');
      localStorage.removeItem('adminRole');
      
      // Close sidebar on mobile
      if (isMobile) {
        setIsOpen(false);
      }
      
      // Redirect to login
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still logout even if API call fails
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminPermissions');
      localStorage.removeItem('adminRole');
      navigate('/login');
    }
  };

  const menuItems = [
    { path: '/', icon: FiHome, label: 'Dashboard' },
    { path: '/users', icon: FiUsers, label: 'Manage Users' },
    { path: '/admins', icon: FiShield, label: 'Manage Admins' },
    { path: '/recommendations', icon: FiMapPin, label: 'Manage Recommendations' },
    { path: '/analytics', icon: FiBarChart2, label: 'Analytics' },
    { path: '/notifications', icon: FiBell, label: 'Notifications' },
    // Only show Moderation if user has Supervisor or above access
    ...(hasModerationAccess ? [{ path: '/moderation', icon: FiFileText, label: 'Moderation' }] : []),
    { path: '/profile', icon: FiUser, label: 'Profile' },
    // Only show Settings if user has CEO access
    ...(hasSettingsAccess ? [{ path: '/settings', icon: FiSettings, label: 'Settings' }] : []),
    // Only show Security Logs if user has Supervisor or above access
    ...(hasSecurityLogsAccess ? [{ path: '/security', icon: FiLock, label: 'Security Logs' }] : []),
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      {isMobile && (
        <button 
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          {isOpen ? <FiX /> : <FiMenu />}
        </button>
      )}

      {/* Backdrop Overlay */}
      {isMobile && isOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobile ? (isOpen ? 'open' : 'closed') : ''}`}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={isMobile ? closeSidebar : undefined}
            >
              <Icon className="sidebar-item-icon" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button 
          className="sidebar-item logout"
          onClick={handleLogout}
        >
          <FiLogOut className="sidebar-item-icon" />
          <span>Logout</span>
        </button>
      </aside>
    </>
  );
};

export default Sidebar;

