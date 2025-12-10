import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiSearch, FiBell, FiHelpCircle, FiUser, FiLogOut, FiSettings, FiX, FiMenu, FiPlus, FiHome, FiMapPin, FiBarChart2, FiFileText } from 'react-icons/fi';
import { searchUsers } from '../api/adminApi';
import { SkeletonText } from './SkeletonLoader';
import './TopNav.css';

const TopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminUser, setAdminUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const searchRef = useRef(null);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setShowMobileSearch(false);
        setShowMobileMenu(false);
        setShowQuickMenu(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch admin profile
  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        // First check localStorage for cached user
        const cachedUser = localStorage.getItem('adminUser');
        if (cachedUser) {
          try {
            setAdminUser(JSON.parse(cachedUser));
          } catch (e) {
            // Invalid JSON, ignore
          }
        }
        
        // Then fetch from server
        const { getAdminProfile } = await import('../api/adminApi');
        const response = await getAdminProfile();
        if (response.data) {
          setAdminUser(response.data);
          localStorage.setItem('adminUser', JSON.stringify(response.data));
        }
        
        // Fetch admin permissions
        try {
          const { getAdminPermissions } = await import('../api/adminApi');
          const permResponse = await getAdminPermissions();
          if (permResponse.data) {
            // Store permissions if needed
            localStorage.setItem('adminPermissions', JSON.stringify(permResponse.data.permissions || []));
            localStorage.setItem('adminRole', permResponse.data.adminRole || '');
          }
        } catch (e) {
          // Ignore permission fetch errors
        }
      } catch (error) {
        console.error('Error fetching admin profile:', error);
        // If error, try to use cached user
        const cachedUser = localStorage.getItem('adminUser');
        if (cachedUser) {
          try {
            setAdminUser(JSON.parse(cachedUser));
          } catch (e) {
            // Invalid JSON, ignore
          }
        }
      }
    };
    fetchAdminProfile();
  }, []);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { getNotifications } = await import('../api/adminApi');
        const response = await getNotifications();
        if (response.data) {
          const notificationsList = Array.isArray(response.data) ? response.data : [];
          setNotifications(notificationsList);
          const unread = notificationsList.filter(n => !n.read && !n.readAt).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };
    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Search functionality
  useEffect(() => {
    const handleSearch = async () => {
      if (searchQuery.trim().length === 0) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      try {
        setSearchLoading(true);
        const results = await searchUsers(searchQuery);
        setSearchResults(Array.isArray(results.data) ? results.data : []);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimer = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setShowMobileMenu(false);
      }
      // Close quick menu when clicking outside
      const quickMenuElement = document.querySelector('.mobile-quick-menu');
      if (quickMenuElement && !quickMenuElement.contains(event.target)) {
        setShowQuickMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchResultClick = (user) => {
    navigate(`/users?userId=${user._id}`);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleAddUser = () => {
    // Navigate to add user page or open modal
    navigate('/users?action=add');
  };

  const handleAddRecommendation = () => {
    // Navigate to add recommendation page or open modal
    navigate('/recommendations?action=add');
  };

  const handleLogout = async () => {
    try {
      // Call logout API if available
      try {
        const api = await import('../api/api');
        await api.default.post('/users/logout');
      } catch (e) {
        // Ignore logout API errors
        console.log('Logout API call failed, continuing with local logout');
      }
      
      // Clear all admin authentication data
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminPermissions');
      localStorage.removeItem('adminRole');
      
      // Close any open menus
      setShowProfileMenu(false);
      setShowNotifications(false);
      setShowMobileMenu(false);
      setShowQuickMenu(false);
      
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

  const handleMarkAllRead = async () => {
    try {
      const { markAllNotificationsRead } = await import('../api/adminApi');
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <nav className="top-nav">
      <div className="nav-left">
        {/* Mobile Menu Button */}
        {isMobile && (
          <button 
            className="mobile-menu-btn"
            onClick={() => {
              setShowQuickMenu(!showQuickMenu);
              setShowMobileSearch(false);
            }}
            aria-label="Menu"
          >
            <FiMenu />
          </button>
        )}
        
        <Link to="/" className="nav-brand" onClick={() => isMobile && setShowQuickMenu(false)}>
          <span style={{ color: '#7c3aed' }}>JTP</span>
          {!isMobile && <span>Admin Hub</span>}
        </Link>
        {!isMobile && (
          <ul className="nav-links">
            <li><Link to="/" className={location.pathname === '/' ? 'active' : ''}>Dashboard</Link></li>
            <li><Link to="/users" className={location.pathname === '/users' ? 'active' : ''}>Users</Link></li>
            <li><Link to="/places" className={location.pathname === '/places' ? 'active' : ''}>Places</Link></li>
            <li><Link to="/recommendations" className={location.pathname === '/recommendations' ? 'active' : ''}>Recommendations</Link></li>
            <li><Link to="/analytics" className={location.pathname === '/analytics' ? 'active' : ''}>Analytics</Link></li>
          </ul>
        )}
      </div>

      {/* Desktop Search */}
      {!isMobile && (
        <div className="nav-center" ref={searchRef}>
          <div className="search-bar">
            <FiSearch />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length > 0 && setShowSearchResults(true)}
              placeholder={
                location.pathname === '/recommendations' 
                  ? 'Search recommendations...' 
                  : 'Search users, places...'
              } 
            />
            {searchQuery && (
              <button 
                className="search-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
              >
                <FiX size={16} />
              </button>
            )}
          </div>
          {showSearchResults && searchResults.length > 0 && (
            <div className="search-results-dropdown">
              {searchResults.map((user) => (
                <div 
                  key={user._id} 
                  className="search-result-item"
                  onClick={() => handleSearchResultClick(user)}
                >
                  <div className="search-result-avatar">
                    {user.hasProfilePicture && user.profilePicture ? (
                      <img 
                        src={`http://localhost:3000/${user.profilePicture}`} 
                        alt={user.name}
                      />
                    ) : (
                      <span>{getInitials(user.name)}</span>
                    )}
                  </div>
                  <div className="search-result-info">
                    <div className="search-result-name">{user.name}</div>
                    <div className="search-result-email">{user.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="nav-right">
        {/* Mobile Search Toggle */}
        {isMobile && (
          <button 
            className="mobile-search-btn"
            onClick={() => {
              setShowMobileSearch(!showMobileSearch);
              setShowMobileMenu(false);
            }}
          >
            <FiSearch />
          </button>
        )}

        {/* Add User Button - Desktop */}
        {!isMobile && (
          location.pathname === '/recommendations' ? (
            <button className="add-user-btn" onClick={handleAddRecommendation}>
              + Add Recommendation
            </button>
          ) : (
            <button className="add-user-btn" onClick={handleAddUser}>
              + Add User
            </button>
          )
        )}

        {/* Add User Button - Mobile Icon */}
        {isMobile && (
          <button 
            className="mobile-add-btn"
            onClick={location.pathname === '/recommendations' ? handleAddRecommendation : handleAddUser}
            title={location.pathname === '/recommendations' ? 'Add Recommendation' : 'Add User'}
          >
            <FiPlus />
          </button>
        )}

        <div className="nav-icon-wrapper" ref={notificationsRef}>
          <FiBell 
            className="nav-icon" 
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (isMobile) {
                setShowMobileMenu(false);
                setShowMobileSearch(false);
              }
            }}
          />
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
          {showNotifications && (
            <div className={`notifications-dropdown ${isMobile ? 'mobile' : ''}`}>
              <div className="notifications-header">
                <h6>Notifications</h6>
                {unreadCount > 0 && (
                  <button className="mark-all-read-btn" onClick={handleMarkAllRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="notifications-list">
                {notifications.length > 0 ? (
                  notifications.slice(0, 10).map((notification) => (
                    <div 
                      key={notification._id} 
                      className={`notification-item ${!notification.read && !notification.readAt ? 'unread' : ''}`}
                    >
                      <div className="notification-content">
                        <div className="notification-text">
                          {notification.message || 
                           (notification.type === 'like' && `${notification.actor?.name || 'Someone'} liked your post`) ||
                           (notification.type === 'comment' && `${notification.actor?.name || 'Someone'} commented on your post`) ||
                           (notification.type === 'friend_request' && `${notification.actor?.name || 'Someone'} sent you a friend request`) ||
                           'New notification'}
                        </div>
                        <div className="notification-time">
                          {notification.createdAt 
                            ? new Date(notification.createdAt).toLocaleString()
                            : 'Just now'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-notifications">No notifications</div>
                )}
              </div>
              {notifications.length > 10 && (
                <div className="notifications-footer">
                  <Link to="/notifications">View all notifications</Link>
                </div>
              )}
            </div>
          )}
        </div>

        {!isMobile && <FiHelpCircle className="nav-icon" />}

        <div className="profile-pic-wrapper" ref={profileRef}>
          <div 
            className="profile-pic" 
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              if (isMobile) {
                setShowMobileMenu(false);
                setShowMobileSearch(false);
              }
            }}
          >
            {adminUser?.hasProfilePicture && adminUser?.profilePicture ? (
              <img 
                src={`http://localhost:3000/${adminUser.profilePicture}`} 
                alt={adminUser.name}
              />
            ) : (
              <span>{getInitials(adminUser?.name)}</span>
            )}
          </div>
          {showProfileMenu && (
            <div className={`profile-dropdown ${isMobile ? 'mobile' : ''}`}>
              <div className="profile-dropdown-header">
                <div className="profile-dropdown-avatar">
                  {adminUser?.hasProfilePicture && adminUser?.profilePicture ? (
                    <img 
                      src={`http://localhost:3000/${adminUser.profilePicture}`} 
                      alt={adminUser.name}
                    />
                  ) : (
                    <span>{getInitials(adminUser?.name)}</span>
                  )}
                </div>
                <div className="profile-dropdown-info">
                  <div className="profile-dropdown-name">{adminUser?.name || 'Admin'}</div>
                  <div className="profile-dropdown-email">{adminUser?.email || ''}</div>
                  {adminUser?.adminRole && (
                    <div className="profile-dropdown-role">
                      <span className={`admin-role-badge-small ${adminUser.adminRole}`}>
                        {adminUser.adminRole.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="profile-dropdown-menu">
                <Link to="/settings" className="profile-dropdown-item" onClick={() => isMobile && setShowProfileMenu(false)}>
                  <FiSettings />
                  <span>Settings</span>
                </Link>
                <Link to="/profile" className="profile-dropdown-item" onClick={() => isMobile && setShowProfileMenu(false)}>
                  <FiUser />
                  <span>Profile</span>
                </Link>
                <div className="profile-dropdown-divider"></div>
                <button className="profile-dropdown-item" onClick={handleLogout}>
                  <FiLogOut />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      {isMobile && showMobileSearch && (
        <div className="mobile-search-container" ref={searchRef}>
          <div className="search-bar mobile">
            <FiSearch />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length > 0 && setShowSearchResults(true)}
              placeholder={
                location.pathname === '/recommendations' 
                  ? 'Search recommendations...' 
                  : 'Search users, places...'
              } 
              autoFocus
            />
            {searchQuery && (
              <button 
                className="search-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
              >
                <FiX size={16} />
              </button>
            )}
            <button 
              className="mobile-search-close"
              onClick={() => setShowMobileSearch(false)}
            >
              <FiX size={18} />
            </button>
          </div>
          {showSearchResults && searchResults.length > 0 && (
            <div className="search-results-dropdown mobile">
              {searchResults.map((user) => (
                <div 
                  key={user._id} 
                  className="search-result-item"
                  onClick={() => {
                    handleSearchResultClick(user);
                    setShowMobileSearch(false);
                  }}
                >
                  <div className="search-result-avatar">
                    {user.hasProfilePicture && user.profilePicture ? (
                      <img 
                        src={`http://localhost:3000/${user.profilePicture}`} 
                        alt={user.name}
                      />
                    ) : (
                      <span>{getInitials(user.name)}</span>
                    )}
                  </div>
                  <div className="search-result-info">
                    <div className="search-result-name">{user.name}</div>
                    <div className="search-result-email">{user.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile Quick Menu */}
      {isMobile && showQuickMenu && (
        <>
          <div 
            className="mobile-quick-menu-backdrop"
            onClick={() => setShowQuickMenu(false)}
          />
          <div className="mobile-quick-menu" ref={mobileMenuRef}>
            <div className="mobile-quick-menu-header">
              <h3>Quick Navigation</h3>
              <button 
                className="mobile-quick-menu-close"
                onClick={() => setShowQuickMenu(false)}
              >
                <FiX />
              </button>
            </div>
            <div className="mobile-quick-menu-links">
              <Link 
                to="/" 
                className={`mobile-quick-menu-item ${location.pathname === '/' ? 'active' : ''}`}
                onClick={() => setShowQuickMenu(false)}
              >
                <FiHome />
                <span>Dashboard</span>
              </Link>
              <Link 
                to="/users" 
                className={`mobile-quick-menu-item ${location.pathname === '/users' ? 'active' : ''}`}
                onClick={() => setShowQuickMenu(false)}
              >
                <FiUser />
                <span>Users</span>
              </Link>
              <Link 
                to="/recommendations" 
                className={`mobile-quick-menu-item ${location.pathname === '/recommendations' ? 'active' : ''}`}
                onClick={() => setShowQuickMenu(false)}
              >
                <FiMapPin />
                <span>Recommendations</span>
              </Link>
              <Link 
                to="/analytics" 
                className={`mobile-quick-menu-item ${location.pathname === '/analytics' ? 'active' : ''}`}
                onClick={() => setShowQuickMenu(false)}
              >
                <FiBarChart2 />
                <span>Analytics</span>
              </Link>
              <Link 
                to="/notifications" 
                className={`mobile-quick-menu-item ${location.pathname === '/notifications' ? 'active' : ''}`}
                onClick={() => setShowQuickMenu(false)}
              >
                <FiBell />
                <span>Notifications</span>
              </Link>
              <Link 
                to="/moderation" 
                className={`mobile-quick-menu-item ${location.pathname === '/moderation' ? 'active' : ''}`}
                onClick={() => setShowQuickMenu(false)}
              >
                <FiFileText />
                <span>Moderation</span>
              </Link>
              <Link 
                to="/settings" 
                className={`mobile-quick-menu-item ${location.pathname === '/settings' ? 'active' : ''}`}
                onClick={() => setShowQuickMenu(false)}
              >
                <FiSettings />
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default TopNav;

