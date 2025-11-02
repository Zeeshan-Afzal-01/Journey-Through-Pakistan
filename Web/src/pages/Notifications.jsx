import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell } from "react-icons/fi";
import "../assests/css/notifications.css";
import { listNotifications, markAllRead } from "../api/notificationsApi.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Notifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const pollingIntervalRef = useRef(null)
  const { isAuthenticated } = useAuth()

  const fetchAll = async () => {
    try {
      if (!loading) {
        // Only show loading on initial fetch
        const res = await listNotifications()
        setItems(Array.isArray(res.data) ? res.data : [])
      } else {
        setLoading(true)
        const res = await listNotifications()
        setItems(Array.isArray(res.data) ? res.data : [])
        setLoading(false)
      }
    } catch (error) {
      if (loading) setLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchAll()
    
    // Set up polling every 3 seconds for real-time updates
    if (isAuthenticated) {
      pollingIntervalRef.current = setInterval(() => {
        fetchAll()
      }, 3000) // Check every 3 seconds
    }
    
    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isAuthenticated])

  const handleMarkAllRead = async () => {
    try {
      await markAllRead()
      await fetchAll()
    } catch {}
  }

  const openPost = (postId) => {
    // Handle both object and string formats
    const id = postId?._id || postId?.id || postId
    if (id) navigate(`/community/post/${id}`)
  }

  const openUserProfile = (userId) => {
    if (userId) navigate(`/profile?userId=${userId}`)
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
        <button className="btn btn-outline-secondary" onClick={handleMarkAllRead}>Mark All Read</button>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="text-center mb-3 text-primary"><FiBell size={22} /></div>
          <h5 className="fw-bold text-center mb-4">All Recent Notifications</h5>
          {loading ? (
            <div className="text-center text-muted small">Loading...</div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {items.map((n) => (
                <div key={n._id} className={`alert alert-light border mb-0 py-2`}>
                  <div className="d-flex align-items-start gap-2">
                    <img onClick={() => openUserProfile(n.actor?._id)} src={n.actor?.profilePicture ? `http://localhost:3000/${n.actor.profilePicture}` : 'https://via.placeholder.com/40'} alt="actor" className="rounded-circle" style={{ width: 40, height: 40, objectFit: 'cover', cursor: 'pointer' }} />
                    <div className="flex-grow-1">
                      <div className="small">
                        <span role="button" onClick={() => openUserProfile(n.actor?._id)} className="fw-semibold text-decoration-none">{n.actor?.name || 'Someone'}</span> {n.message}
                      </div>
                      <div className="text-muted xsmall" role="button" onClick={() => openPost(n.post)}>
                        Open post
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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


