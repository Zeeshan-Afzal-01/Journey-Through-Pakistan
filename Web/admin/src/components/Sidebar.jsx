import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiMapPin, 
  FiBarChart2, 
  FiBell, 
  FiFileText, 
  FiSettings, 
  FiLock,
  FiLogOut
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: FiHome, label: 'Dashboard' },
    { path: '/users', icon: FiUsers, label: 'Manage Users' },
    { path: '/recommendations', icon: FiMapPin, label: 'Manage Recommendations' },
    { path: '/analytics', icon: FiBarChart2, label: 'Analytics' },
    { path: '/notifications', icon: FiBell, label: 'Notifications' },
    { path: '/moderation', icon: FiFileText, label: 'Moderation' },
    { path: '/settings', icon: FiSettings, label: 'Settings' },
    { path: '/security', icon: FiLock, label: 'Security Logs' },
  ];

  return (
    <aside className="sidebar">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${isActive ? 'active' : ''}`}
          >
            <Icon className="sidebar-item-icon" />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <Link to="/logout" className="sidebar-item logout">
        <FiLogOut className="sidebar-item-icon" />
        <span>Logout</span>
      </Link>
    </aside>
  );
};

export default Sidebar;

