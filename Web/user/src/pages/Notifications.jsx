import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiRefreshCw } from "react-icons/fi";
import "../assests/css/notifications.css";
import { listNotifications, markAllRead } from "../api/notificationsApi.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { NotificationSkeleton } from '../components/SkeletonLoader.jsx';
import "../assests/css/skeleton.css";

export default function Notifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const navigate = useNavigate()
  const pollingIntervalRef = useRef(null)
  const { isAuthenticated } = useAuth()
  const lastFetchTimeRef = useRef(null)

  const fetchAll = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      
      const res = await listNotifications()
      const newItems = Array.isArray(res.data) ? res.data.filter(n => n.type !== 'message') : []
      
      // Only update if data actually changed
      setItems(prevItems => {
        const prevIds = prevItems.map(item => item._id).sort().join(',')
        const newIds = newItems.map(item => item._id).sort().join(',')
        
        // If IDs are the same, check if any notification was updated
        if (prevIds === newIds) {
          const hasChanges = prevItems.some((prevItem, index) => {
            const newItem = newItems[index]
            return prevItem.readAt !== newItem.readAt || 
                   prevItem.createdAt !== newItem.createdAt
          })
          if (!hasChanges) {
            return prevItems // No changes, don't update
          }
        }
        
        return newItems
      })
      
      lastFetchTimeRef.current = Date.now()
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchAll(true)
    
    // Set up polling every 30 seconds (more professional interval)
    // Only poll when page is visible
    if (isAuthenticated) {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Page is hidden, clear interval
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        } else {
          // Page is visible, set up polling
          if (!pollingIntervalRef.current) {
            // Fetch immediately when page becomes visible
            const timeSinceLastFetch = Date.now() - (lastFetchTimeRef.current || 0)
            if (timeSinceLastFetch > 30000) {
              fetchAll(false)
            }
            
            pollingIntervalRef.current = setInterval(() => {
              // Only fetch if page is visible
              if (!document.hidden) {
                fetchAll(false)
              }
            }, 30000) // Check every 30 seconds
          }
        }
      }
      
      // Set up initial polling
      pollingIntervalRef.current = setInterval(() => {
        if (!document.hidden) {
          fetchAll(false)
        }
      }, 30000) // 30 seconds
      
      // Listen for visibility changes
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      // Cleanup on unmount
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [isAuthenticated, fetchAll])

  const handleMarkAllRead = async () => {
    try {
      await markAllRead()
      await fetchAll(false)
    } catch {}
  }

  const handleManualRefresh = () => {
    fetchAll(false)
  }

  const openPost = (postId) => {
    // Handle both object and string formats
    const id = postId?._id || postId?.id || postId
    if (id) navigate(`/community/post/${id}`)
  }

  const openUserProfile = (userId, isAdmin = false) => {
    // Don't allow opening admin profiles from user dashboard
    if (userId && !isAdmin) {
      navigate(`/profile?userId=${userId}`)
    }
  }

  return (
    <div className="container-fluid py-3 notifications-page">
      <h3 className="fw-bold mb-3">Notification Center</h3>

      <div className="d-flex align-items-center gap-2 mb-3">
        <div className="btn-group flex-grow-1" role="group">
          <button className="btn btn-light border active">All Notifications</button>
          <button className="btn btn-light border" disabled>Archived (0)</button>
        </div>
        <div className="input-group" style={{ maxWidth: 360 }}>
          <input className="form-control" placeholder="Search notifications..." />
        </div>
        <button 
          className="btn btn-outline-secondary" 
          onClick={handleManualRefresh}
          disabled={refreshing}
          title="Refresh notifications"
        >
          <FiRefreshCw className={refreshing ? 'spinning' : ''} style={{ 
            animation: refreshing ? 'spin 1s linear infinite' : 'none',
            display: 'inline-block'
          }} />
        </button>
        <button className="btn btn-outline-secondary" onClick={handleMarkAllRead}>Mark All Read</button>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="text-center mb-3 text-primary"><FiBell size={22} /></div>
          <h5 className="fw-bold text-center mb-4">All Recent Notifications</h5>
          {loading ? (
            <NotificationSkeleton />
          ) : (
            <div className="d-flex flex-column gap-2">
              {items.map((n) => {
                const isAdminAnnouncement = n.type === 'admin_announcement';
                const isAdmin = n.actor?.isAdmin || isAdminAnnouncement;
                const actorName = isAdminAnnouncement ? 'Admin' : (n.actor?.name || 'Someone');
                
                return (
                  <div key={n._id} className={`alert alert-light border mb-0 py-2 ${isAdminAnnouncement ? 'admin-notification' : ''}`}>
                    <div className="d-flex align-items-start gap-2">
                      <img 
                        onClick={() => !isAdmin && openUserProfile(n.actor?._id, isAdmin)} 
                        src={
                          n.actor?.hasProfilePicture && n.actor?.profilePicture 
                            ? `http://localhost:3000/${n.actor.profilePicture}` 
                            : 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
                        } 
                        alt="actor" 
                        className="rounded-circle" 
                        style={{ 
                          width: 40, 
                          height: 40, 
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
                              onClick={() => openUserProfile(n.actor?._id, isAdmin)} 
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
                          <div className="text-muted xsmall" role="button" onClick={() => openPost(n.post)}>
                            Open post
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 ? (
                <div className="text-center text-muted small">No notifications yet</div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


