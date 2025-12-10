import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiHome, FiMapPin, FiMessageCircle, FiStar, FiUser, FiMenu, FiX } from "react-icons/fi";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { getUnreadCount } from "../api/messageApi";
import "../assests/css/sidebar.css";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (window.innerWidth <= 991.98) {
        const sidebar = document.querySelector('.jtp-sidebar');
        const hamburger = document.querySelector('.mobile-hamburger');
        if (isOpen && sidebar && !sidebar.contains(event.target) && hamburger && !hamburger.contains(event.target)) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when sidebar is open on mobile
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (window.innerWidth <= 991.98) {
      setIsOpen(false);
    }
  }, [location.pathname]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleNavClick = () => {
    if (window.innerWidth <= 991.98) {
      setIsOpen(false);
    }
  };

  // Fetch unread message count
  useEffect(() => {
    if (isAuthenticated) {
      const fetchUnreadCount = async () => {
        try {
          const response = await getUnreadCount();
          setUnreadMessageCount(response.data.unreadCount || 0);
        } catch (error) {
          console.error('Error fetching unread count:', error);
        }
      };
      
      fetchUnreadCount();
      
      // Poll for unread count every 5 seconds
      const interval = setInterval(fetchUnreadCount, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Listen for new messages via socket to update unread count
  useEffect(() => {
    if (!socket || !isConnected || !isAuthenticated) return;

    const handleNewMessage = (message) => {
      // Only increment if message is received (not sent by current user)
      // We'll check this by listening to the message structure
      // For now, just refresh the count
      const fetchUnreadCount = async () => {
        try {
          const response = await getUnreadCount();
          setUnreadMessageCount(response.data.unreadCount || 0);
        } catch (error) {
          console.error('Error fetching unread count:', error);
        }
      };
      fetchUnreadCount();
    };

    const handleMessagesRead = () => {
      // Refresh unread count when messages are marked as read
      const fetchUnreadCount = async () => {
        try {
          const response = await getUnreadCount();
          setUnreadMessageCount(response.data.unreadCount || 0);
        } catch (error) {
          console.error('Error fetching unread count:', error);
        }
      };
      fetchUnreadCount();
    };

    socket.on('new-message-notification', handleNewMessage);
    socket.on('messages-read', handleMessagesRead);
    
    // Also listen for custom event from Chats page
    const handleChatsRead = () => {
      const fetchUnreadCount = async () => {
        try {
          const response = await getUnreadCount();
          setUnreadMessageCount(response.data.unreadCount || 0);
        } catch (error) {
          console.error('Error fetching unread count:', error);
        }
      };
      fetchUnreadCount();
    };
    
    window.addEventListener('chatsMessagesRead', handleChatsRead);

    return () => {
      socket.off('new-message-notification', handleNewMessage);
      socket.off('messages-read', handleMessagesRead);
      window.removeEventListener('chatsMessagesRead', handleChatsRead);
    };
  }, [socket, isConnected, isAuthenticated]);

  // Listen for toggle events from navbar
  useEffect(() => {
    const handleToggleSidebar = () => {
      setIsOpen(prev => !prev);
    };

    window.addEventListener('toggleSidebar', handleToggleSidebar);
    
    // Dispatch state change event for navbar hamburger animation
    const updateHamburgerState = () => {
      window.dispatchEvent(new CustomEvent('sidebarStateChange', { detail: { isOpen } }));
    };
    
    updateHamburgerState();
    
    return () => {
      window.removeEventListener('toggleSidebar', handleToggleSidebar);
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay Backdrop */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      {/* Sidebar */}
      <aside className={`jtp-sidebar d-flex flex-column flex-shrink-0 bg-light border-end ${isOpen ? 'mobile-open' : ''}`}>
        <div className="jtp-sidebar-header d-flex align-items-center justify-content-between border-bottom d-lg-none">
          <span className="sidebar-title">Menu</span>
          <button
            className="btn-close-sidebar"
            onClick={toggleSidebar}
            aria-label="Close sidebar"
          >
            <FiX size={24} />
          </button>
        </div>
        <div className="jtp-sidebar-content">
          <ul className="nav nav-pills flex-column mb-auto">
            <li className="nav-item">
              <NavLink 
                to="/dashboard" 
                className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`}
                onClick={handleNavClick}
              >
                <FiHome />
                <span>Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/landmark" 
                className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`}
                onClick={handleNavClick}
              >
                <FiMapPin />
                <span>Landmark Identifier</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/community" 
                className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`}
                onClick={handleNavClick}
              >
                <FiMessageCircle />
                <span>Community</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/chats" 
                className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`}
                onClick={handleNavClick}
              >
                <FiMessageCircle />
                <span>Chats</span>
                {unreadMessageCount > 0 && (
                  <span className="sidebar-unread-badge">{unreadMessageCount > 99 ? '99+' : unreadMessageCount}</span>
                )}
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/recommendations" 
                className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`}
                onClick={handleNavClick}
              >
                <FiStar />
                <span>Recommendations</span>
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/profile" 
                className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`}
                onClick={handleNavClick}
              >
                <FiUser />
                <span>Profile</span>
              </NavLink>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}


