import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { FiBell } from 'react-icons/fi'
import logoImg from '../images/download.jpeg'
import { listNotifications } from '../api/notificationsApi.jsx'
import { toast } from 'react-toastify'

export default function navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const dropdownRef = useRef(null)
  const bellRef = useRef(null)
  const { isAuthenticated, user, handleLogout } = useAuth()
  const navigate = useNavigate()
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
      const items = Array.isArray(res.data) ? res.data : []
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
                  src={notification.actor?.profilePicture ? `http://localhost:3000/${notification.actor.profilePicture}` : 'https://via.placeholder.com/32'} 
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

  const openUserProfile = (userId) => {
    setBellOpen(false)
    if (userId) navigate(`/profile?userId=${userId}`)
  }

  return (
    <div className='navbar-container'>
      <nav className="navbar navbar-expand-lg navbar-light bg-light fixed-top">
        <div className="container-fluid">
          <a className="navbar-brand d-flex align-items-center gap-2" href="#">
            <img src={logoImg} alt="JTP" width="36" height="36" className="rounded-circle object-fit-cover" />
            <span className="fw-semibold">Journey Through Pakistan</span>
          </a>

          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#jtpNavbar" aria-controls="jtpNavbar" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="jtpNavbar">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <a className="nav-link active" aria-current="page" href="/dashboard">Dashboard</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/recommendations">Recommendations</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/community">Community</a>
              </li>
            </ul>
            {showProfileImage ?
            <div className="ms-auto d-flex align-items-center gap-2">
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
                      {notifications.slice(0,5).map((n) => (
                        <div key={n._id} className="alert alert-light border mb-0 py-2" role="button" onClick={() => openPost(n.post)}>
                          <div className="d-flex align-items-start gap-2">
                            <img onClick={(e) => { e.stopPropagation(); openUserProfile(n.actor?._id) }} src={n.actor?.profilePicture ? `http://localhost:3000/${n.actor.profilePicture}` : 'https://via.placeholder.com/32'} alt="actor" className="rounded-circle" style={{ width: 32, height: 32, objectFit: 'cover', cursor: 'pointer' }} />
                            <div className="flex-grow-1">
                              <div className="small">
                                <span role="button" onClick={(e) => { e.stopPropagation(); openUserProfile(n.actor?._id) }} className="fw-semibold text-decoration-none">{n.actor?.name || 'Someone'}</span> {n.message}
                              </div>
                              <div className="text-muted small">
                                View post
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
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
                  
                  <img src={`http://localhost:3000/${user?.profilePicture}` || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6pG71SAo6x_xIn_DgRMLKsFMEwMgc6k1DAg&s"} alt="Profile" className="rounded-circle" style={{ width: 40, height: 40, objectFit: 'cover' }} />
                </button>
                <ul className={`dropdown-menu dropdown-menu-end ${isOpen ? 'show' : ''}`} style={{ right: 0, left: 'auto' }}>
                  <li><a className="dropdown-item" href="/profile">Profile</a></li>
                  <li><a className="dropdown-item" href="#">Settings</a></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><a className="dropdown-item text-danger" onClick={handleLogout} href="#">Logout</a></li>
                </ul>
              </div>
            </div>:null}
            
          </div>
        </div>
      </nav>
    </div>
  )
}
