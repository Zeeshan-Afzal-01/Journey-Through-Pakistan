import React from "react";
import { NavLink } from "react-router-dom";
import { FiHome, FiMapPin, FiMessageCircle, FiStar, FiUser } from "react-icons/fi";
import "../assests/css/sidebar.css";

export default function Sidebar() {
  return (
    <aside className="jtp-sidebar d-flex flex-column flex-shrink-0 bg-light border-end p-2">
      <div className="jtp-sidebar-header d-flex align-items-center justify-content-between pt-4 px-3  border-bottom">
        
        <button
          className="btn btn-outline-secondary d-lg-none"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#jtpSidebarCollapse"
          aria-controls="jtpSidebarCollapse"
          aria-expanded="false"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
      </div>
      <div id="jtpSidebarCollapse" className="collapse d-lg-block">
        <ul className="nav nav-pills flex-column mb-auto">
          <li className="nav-item">
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`}>
              <FiHome />
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/landmark" className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`}>
              <FiMapPin />
              <span>Landmark Identifier</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/community" className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`}>
              <FiMessageCircle />
              <span>Community</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/chats" className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`}>
              <FiMessageCircle />
              <span>Chats</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/recommendations" className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`}>
              <FiStar />
              <span>Recommendations</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile" className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? "active" : "link-dark"}`}>
              <FiUser />
              <span>Profile</span>
            </NavLink>
          </li>
        </ul>
      </div>
    </aside>
  );
}


