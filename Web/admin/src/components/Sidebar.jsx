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
  FiX
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

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
    { path: '/moderation', icon: FiFileText, label: 'Moderation' },
    { path: '/settings', icon: FiSettings, label: 'Settings' },
    { path: '/security', icon: FiLock, label: 'Security Logs' },
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

