import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { FiBell } from 'react-icons/fi'
import logoImg from '../images/download.jpeg'
import { listNotifications } from '../api/notificationsApi.jsx'
import { toast } from 'react-toastify'
import '../assests/css/sidebar.css'
import '../assests/css/customStyle.css'
import '../assests/css/skeleton.css'
import { getProfilePictureUrl } from '../utils/imageUtils.js'

export default function navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const dropdownRef = useRef(null)
  const bellRef = useRef(null)
  const { isAuthenticated, user, handleLogout, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notificationSoundRef = useRef(null)
  const lastNotificationCountRef = useRef(0)
  const lastNotificationsRef = useRef([])
  const pollingIntervalRef = useRef(null)

  let showProfileImage = Boolean(isAuthenticated)
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false)
      if (bellRef.current && !bellRef.current.contains(event.target)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Create notification sound using Web Audio API (pleasant two-tone beep)
  useEffect(() => {
    let audioContext = null
    
    const createNotificationSound = () => {
      try {
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)()
        }
        
        // First tone
        const osc1 = audioContext.createOscillator()
        const gain1 = audioContext.createGain()
        osc1.connect(gain1)
        gain1.connect(audioContext.destination)
        osc1.frequency.value = 800
        osc1.type = 'sine'
        gain1.gain.setValueAtTime(0.2, audioContext.currentTime)
        gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)
        osc1.start(audioContext.currentTime)
        osc1.stop(audioContext.currentTime + 0.15)
        
        // Second tone (slightly higher)
        const osc2 = audioContext.createOscillator()
        const gain2 = audioContext.createGain()
        osc2.connect(gain2)
        gain2.connect(audioContext.destination)
        osc2.frequency.value = 1000
        osc2.type = 'sine'
        gain2.gain.setValueAtTime(0.2, audioContext.currentTime + 0.15)
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        osc2.start(audioContext.currentTime + 0.15)
        osc2.stop(audioContext.currentTime + 0.3)
      } catch (error) {
        console.log('Sound play error:', error)
      }
    }
    
    notificationSoundRef.current = createNotificationSound
    return () => {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close()
      }
    }
  }, [])

  const fetchNotifications = async () => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      lastNotificationCountRef.current = 0
      lastNotificationsRef.current = []
      return
    }
    try {
      const res = await listNotifications()
      // Filter out message type notifications - messages are handled via Socket.IO and unread badges
      const items = Array.isArray(res.data) ? res.data.filter(n => n.type !== 'message') : []
      const currentUnreadCount = items.filter(n => !n.readAt).length
      
      // Find new notifications that weren't in the previous list
      if (lastNotificationsRef.current.length > 0 && items.length > 0) {
        const previousIds = new Set(lastNotificationsRef.current.map(n => n._id?.toString() || n._id))
        const newNotifications = items.filter(n => {
          const nId = n._id?.toString() || n._id
          return !previousIds.has(nId) && !n.readAt
        })
        
        // Show toast for each new notification
        newNotifications.forEach(notification => {
          // Play sound
          try {
            if (notificationSoundRef.current) {
              notificationSoundRef.current()
            }
          } catch (soundError) {
            console.log('Sound play error:', soundError)
          }
          
          // Show toast notification
          const actorName = notification.actor?.name || 'Someone'
          const message = notification.message || 'sent you a notification'
          const postId = notification.post?._id || notification.post
          const statusId = notification.status?._id || notification.status
          const notificationType = notification.type
          
          // Determine what to do on click based on notification type
          const handleToastClick = () => {
            if (notificationType === 'status_message' && statusId) {
              // For status messages, navigate to community and trigger status opening
              navigate('/community')
              // Store status ID in sessionStorage to open it when community page loads
              sessionStorage.setItem('openStatusId', statusId)
              // Trigger custom event
              window.dispatchEvent(new CustomEvent('openStatusFromNotification', { detail: { statusId } }))
            } else if (postId) {
              const id = postId._id || postId.id || postId
              if (id) navigate(`/community/post/${id}`)
            } else if (notificationType === 'friend_request') {
              navigate(`/profile?userId=${notification.actor?._id}`)
            }
            toast.dismiss()
          }
          
          toast(
            <div 
              onClick={handleToastClick}
              style={{ cursor: (postId || statusId || notificationType === 'friend_request') ? 'pointer' : 'default' }}
            >
              <div className="d-flex align-items-center gap-2">
                <img 
                  src={
                    notification.actor?.hasProfilePicture && notification.actor?.profilePicture 
                      ? `http://localhost:3000/${notification.actor.profilePicture}` 
                      : 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
                  } 
                  alt={actorName}
                  className="rounded-circle"
                  style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                />
                <div className="flex-grow-1">
                  <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{actorName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>{message}</div>
                </div>
              </div>
            </div>,
            {
              position: "top-right",
              autoClose: 4000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
            }
          )
        })
      } else if (currentUnreadCount > lastNotificationCountRef.current && lastNotificationCountRef.current > 0) {
        // Fallback: if we can't detect specific new notifications, still play sound
        try {
          if (notificationSoundRef.current) {
            notificationSoundRef.current()
          }
        } catch (soundError) {
          console.log('Sound play error:', soundError)
        }
      }
      
      setNotifications(items)
      setUnreadCount(currentUnreadCount)
      lastNotificationCountRef.current = currentUnreadCount
      lastNotificationsRef.current = items
    } catch (e) {
      // ignore silently
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchNotifications()
    
    // Set up polling every 3 seconds for real-time updates
    if (isAuthenticated) {
      pollingIntervalRef.current = setInterval(() => {
        fetchNotifications()
      }, 3000) // Check every 3 seconds
    }
    
    // Cleanup on unmount or when authentication changes
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isAuthenticated])

  const openPost = (postId) => {
    setBellOpen(false)
    // Handle both object and string formats
    const id = postId?._id || postId?.id || postId
    if (id) navigate(`/community/post/${id}`)
  }

  const openUserProfile = (userId, isAdmin = false) => {
    setBellOpen(false)
    // Don't allow opening admin profiles from user dashboard
    if (userId && !isAdmin) {
      navigate(`/profile?userId=${userId}`)
    }
  }

  // Listen for sidebar state changes to update hamburger animation
  useEffect(() => {
    const handleSidebarStateChange = (event) => {
      setSidebarOpen(event.detail.isOpen);
    };

    window.addEventListener('sidebarStateChange', handleSidebarStateChange);
    return () => {
      window.removeEventListener('sidebarStateChange', handleSidebarStateChange);
    };
  }, []);

  const toggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('toggleSidebar'));
  };

  return (
    
    <div className='navbar-container'>
     
      <nav className="navbar navbar-expand-lg navbar-light bg-light fixed-top">
        <div className="container-fluid">
          {/* Left Side - Hamburger Menu (only show on mobile) */}
          <button
            className="navbar-hamburger d-lg-none"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <div className={`hamburger-icon ${sidebarOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>

          {/* Brand Name - Left on desktop, Center on mobile */}
          <a 
            className="navbar-brand navbar-brand-custom d-flex align-items-center gap-2" 
            href="#"
            style={{
              ...(window.innerWidth <= 991.98 ? {
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                marginLeft: 0,
                marginRight: 0,
                zIndex: 10
              } : {})
            }}
          >
            <img src={logoImg} alt="JTP" width="36" height="36" className="rounded-circle object-fit-cover d-none d-md-block" />
            <span className="fw-semibold d-none d-lg-inline">Journey Through Pakistan</span>
            <span className="fw-semibold d-lg-none">JTP</span>
          </a>

          {/* Navigation Menu - Only visible on desktop */}
          { (
            <ul className="navbar-nav d-none d-lg-flex">
              <li className="nav-item">
                <Link 
                  className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                  to="/dashboard"
                >
                  Dashboard
                </Link>
              </li>
              <li className="nav-item">
                <Link 
                  className={`nav-link ${location.pathname === '/community' || location.pathname.startsWith('/community') ? 'active' : ''}`}
                  to="/community"
                >
                  Community
                </Link>
              </li>
              <li className="nav-item">
                <Link 
                  className={`nav-link ${location.pathname === '/recommendations' ? 'active' : ''}`}
                  to="/recommendations"
                > 
                  Recommendations
                </Link>
              </li>
            </ul>
          )}

          {/* Right Side - Navbar Options */}
          <div className="d-flex align-items-center gap-2 ms-auto">
            {loading ? (
              /* Skeleton loader while checking authentication */
              <div className="d-flex align-items-center gap-2">
                <div className="skeleton-avatar rounded-circle" style={{ width: 40, height: 40 }}></div>
              </div>
            ) : showProfileImage ? (  
              <>
                {/* Bell dropdown */}
                <div className={`dropdown position-relative ${bellOpen ? 'show' : ''}`} ref={bellRef}>
                <button type="button" className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center position-relative" style={{ width: 40, height: 40 }} onClick={() => setBellOpen(v=>!v)} aria-haspopup="true" aria-expanded={bellOpen}>
                  <FiBell/>
                  {unreadCount > 0 ? (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: 10 }}>
                      {Math.min(unreadCount, 9)}{unreadCount > 9 ? '+' : ''}
                    </span>
                  ) : null}
                </button>
                <div className={`dropdown-menu p-0 ${bellOpen ? 'show' : ''}`}
                  style={{ width: 360, position: 'fixed', right: 16, top: 70, maxHeight: '70vh', overflowY: 'auto' }}>
                  <div className="p-2 border-bottom fw-semibold">Notifications</div>
                  <div className="p-2">
                    <div className="d-flex flex-column gap-2">
                      {notifications.slice(0,5).map((n) => {
                        const isAdminAnnouncement = n.type === 'admin_announcement';
                        const isAdmin = n.actor?.isAdmin || isAdminAnnouncement;
                        const actorName = isAdminAnnouncement ? 'Admin' : (n.actor?.name || 'Someone');
                        
                        return (
                          <div key={n._id} className="alert alert-light border mb-0 py-2" role="button" onClick={() => n.post && openPost(n.post)}>
                            <div className="d-flex align-items-start gap-2">
                              <img 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (!isAdmin) {
                                    openUserProfile(n.actor?._id, isAdmin);
                                  }
                                }} 
                                src={getProfilePictureUrl(n.actor?.profilePicture, n.actor?.hasProfilePicture)} 
                                alt="actor" 
                                className="rounded-circle" 
                                style={{ 
                                  width: 32, 
                                  height: 32, 
                                  objectFit: 'cover', 
                                  cursor: isAdmin ? 'default' : 'pointer',
                                  opacity: isAdmin ? 0.7 : 1
                                }} 
                              />
                              <div className="flex-grow-1">
                                <div className="small">
                                  {isAdmin ? (
                                    <span className="fw-semibold text-primary">{actorName}</span>
                                  ) : (
                                    <span 
                                      role="button" 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        openUserProfile(n.actor?._id, isAdmin);
                                      }} 
                                      className="fw-semibold text-decoration-none"
                                    >
                                      {actorName}
                                    </span>
                                  )} {n.message}
                                  {isAdminAnnouncement && (
                                    <span className="badge bg-primary ms-2" style={{ fontSize: '10px' }}>Admin</span>
                                  )}
                                </div>
                                {n.post && (
                                  <div className="text-muted small">
                                    View post
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {notifications.length === 0 ? (
                        <div className="text-muted small text-center py-3">No notifications</div>
                      ) : null}
                    </div>
                  </div>
                  <button className="dropdown-item text-center text-primary" onClick={() => { setBellOpen(false); navigate('/notifications'); }}>Show more</button>
                </div>
              </div>

              {/* Profile dropdown */}
              <div className={`dropdown position-relative ${isOpen ? 'show' : ''}`} ref={dropdownRef}>
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-circle p-0 d-flex align-items-center justify-content-center"
                  style={{ width: 40, height: 40 }}
                  onClick={() => setIsOpen((open) => !open)}
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                >
                  
                  <img 
                    src={getProfilePictureUrl(user?.profilePicture, user?.hasProfilePicture)} 
                    alt="Profile" 
                    className="rounded-circle" 
                    style={{ width: 40, height: 40, objectFit: 'cover' }} 
                  />
                </button>
                <ul className={`dropdown-menu dropdown-menu-end ${isOpen ? 'show' : ''}`} style={{ right: 0, left: 'auto' }}>
                  <li>
                    <Link className="dropdown-item" to="/profile" onClick={() => setIsOpen(false)}>Profile</Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/settings" onClick={() => setIsOpen(false)}>Settings</Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <a className="dropdown-item text-danger" onClick={(e) => { e.preventDefault(); setIsOpen(false); handleLogout(); }} href="#">Logout</a>
                  </li>
                </ul>
              </div>
              </>
            ) : (
              /* Login and Signup buttons when not authenticated */
              <div className="d-flex align-items-center gap-2">
                <Link 
                  to="/login" 
                  className="btn btn-outline-primary"
                  style={{ borderRadius: '20px', padding: '6px 20px' }}
                >
                  Login
                </Link>
                <Link 
                  to="/signup" 
                  className="btn btn-primary"
                  style={{ borderRadius: '20px', padding: '6px 20px' }}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
