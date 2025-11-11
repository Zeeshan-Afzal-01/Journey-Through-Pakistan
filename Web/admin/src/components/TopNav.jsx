import { Link, useLocation } from 'react-router-dom';
import { FiHeart, FiSearch, FiBell, FiHelpCircle } from 'react-icons/fi';
import './TopNav.css';

const TopNav = () => {
  const location = useLocation();

  return (
    <nav className="top-nav">
      <div className="nav-left">
        <Link to="/" className="nav-brand">
          <FiHeart className="nav-brand-icon" />
          <span>Admin Hub</span>
        </Link>
        <ul className="nav-links">
          <li><Link to="/" className={location.pathname === '/' ? 'active' : ''}>Dashboard</Link></li>
          <li><Link to="/users" className={location.pathname === '/users' ? 'active' : ''}>Users</Link></li>
          <li><Link to="/places" className={location.pathname === '/places' ? 'active' : ''}>Places</Link></li>
          <li><Link to="/recommendations" className={location.pathname === '/recommendations' ? 'active' : ''}>Recommendations</Link></li>
          <li><Link to="/analytics" className={location.pathname === '/analytics' ? 'active' : ''}>Analytics</Link></li>
        </ul>
      </div>
      <div className="nav-center">
        <div className="search-bar">
          <FiSearch />
          <input 
            type="text" 
            placeholder={
              location.pathname === '/recommendations' 
                ? 'Search recommendations...' 
                : 'Search users, places...'
            } 
          />
        </div>
      </div>
      <div className="nav-right">
        {location.pathname === '/recommendations' ? (
          <button className="add-user-btn">+ Add Recommendation</button>
        ) : (
          <button className="add-user-btn">+ Add User</button>
        )}
        <FiBell className="nav-icon" />
        <FiHelpCircle className="nav-icon" />
        <div className="profile-pic">A</div>
      </div>
    </nav>
  );
};

export default TopNav;

