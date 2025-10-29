import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { FiBell } from 'react-icons/fi'
import logoImg from '../images/download.jpeg'

export default function navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const dropdownRef = useRef(null)
  const bellRef = useRef(null)
  const { isAuthenticated, user, handleLogout } = useAuth()
  const navigate = useNavigate()

  let showProfileImage = Boolean(isAuthenticated)
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false)
      if (bellRef.current && !bellRef.current.contains(event.target)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className='navbar-container'>
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
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
                <button type="button" className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }} onClick={() => setBellOpen(v=>!v)} aria-haspopup="true" aria-expanded={bellOpen}>
                  <FiBell/>
                </button>
                <div className={`dropdown-menu p-0 ${bellOpen ? 'show' : ''}`}
                  style={{ width: 360, position: 'fixed', right: 16, top: 70, maxHeight: '70vh', overflowY: 'auto' }}>
                  <div className="p-2 border-bottom fw-semibold">Notifications</div>
                  <div className="p-2">
                    <div className="d-flex flex-column gap-2">
                      <div className="alert alert-light border mb-0 py-2">
                        <div className="small">Unauthorized access attempt detected on your account. Review security settings.</div>
                        <div className="text-muted small">Now</div>
                      </div>
                      <div className="alert alert-light border mb-0 py-2">
                        <div className="small">Security patch available for immediate installation. Restart required.</div>
                        <div className="text-muted small">5 minutes ago</div>
                      </div>
                      <div className="alert alert-light border mb-0 py-2">
                        <div className="small">Your support ticket #12345 has been updated.</div>
                        <div className="text-muted small">15 minutes ago</div>
                      </div>
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
