import React from "react";
import { FiCamera, FiHeart } from "react-icons/fi";
import "../assests/css/profile.css";
import { AuthContext } from "../context/AuthContext";
import { useContext } from "react";

export default function Profile() {

  const { user } = useContext(AuthContext);
  
  const profilePicture = `http://localhost:3000/${user.profilePicture}`;
  return (
    <div className="container-fluid profile-page py-3">
      <h2 className="fw-bold mb-3">Your Profile</h2>

      <div className="row g-3">
        {/* Left column: avatar card + personal info + interests */}
        <div className="col-12 col-xl-6">
          {/* Avatar card */}
          <div className="card shadow-sm mb-3">
            <div className="card-body d-flex flex-column align-items-center text-center">
              <div className="profile-avatar position-relative mb-3">
                <img
                  className="rounded-circle border profile-avatar-img"
                  src={profilePicture}
                  alt="Profile"
                />
                <button className="btn btn-light btn-sm rounded-3 position-absolute upload-btn">
                  <FiCamera className="me-2" /> Upload Photo
                </button>
              </div>
              <div className="small text-muted mb-2">Must be a .jpg or .png file smaller than 5MB</div>
              <h5 className="mb-1">{user.name}</h5>
              <p className="text-muted mb-0 small w-100 w-md-75">
                Passionate explorer of Pakistani culture and hidden gems. Sharing my journey, one discovery at a time.
              </p>
            </div>
          </div>

          {/* Personal Information form (UI only) */}
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Personal Information</h6>
              <div className="mb-3">
                <label className="form-label">Name (Required)*</label>
                <input className="form-control" defaultValue="Fatima Zahra" />
              </div>
              <div className="mb-3">
                <label className="form-label">Location</label>
                <input className="form-control" defaultValue="Lahore, Pakistan" />
              </div>
              <div className="mb-3">
                <label className="form-label">About Me</label>
                <textarea className="form-control" rows={4} defaultValue={
                  "I am a passionate explorer of Pakistani culture and hidden gems. Sharing my journey, one discovery at a time, and connecting with fellow travelers."
                } />
                <div className="text-muted small text-end mt-1">147 / 150</div>
              </div>
              <div className="form-check mb-3">
                <input className="form-check-input" type="checkbox" id="mature" />
                <label className="form-check-label" htmlFor="mature">Hide Mature Content</label>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary">Cancel</button>
                <button className="btn btn-primary">Save Changes</button>
              </div>
              <div className="small text-muted mt-3">
                Add up to 6 profiles by <a href="#">upgrading to the Duo or Family Plan</a>
              </div>
            </div>
          </div>

          {/* Interests */}
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="fw-bold mb-3">My Interests</h6>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {[
                  "Nature Lover",
                  "Mountain Treks",
                  "Historical Sites",
                  "Local Cuisine",
                  "Photography",
                  "Adventure Sports",
                  "Cultural Exchange",
                  "Wildlife",
                ].map((t) => (
                  <span key={t} className="badge bg-light text-dark border fw-normal px-3 py-2">
                    {t}
                  </span>
                ))}
              </div>
              <div className="input-group">
                <input className="form-control" placeholder="Add new interest" />
                <button className="btn btn-outline-secondary">Add</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: recent activity + contributions */}
        <div className="col-12 col-xl-6">
          {/* Recent Activity */}
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Recent Activity</h6>
              <ul className="list-unstyled profile-activity mb-0">
                {[
                  { title: "Liked a post about Naran Kaghan Valley", time: "2 hours ago" },
                  { title: "Identified Badshahi Mosque in Lahore", time: "Yesterday" },
                  { title: "Commented on a guide to Hunza Valley", time: "2 days ago" },
                  { title: "Uploaded 3 photos from Skardu trip", time: "3 days ago" },
                  { title: "Shared a local recipe for Biryani", time: "4 days ago" },
                ].map((item, idx) => (
                  <li key={idx} className="d-flex align-items-start gap-2 py-2 border-bottom last-border-0">
                    <span className="activity-dot mt-1"></span>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between">
                        <span>{item.title}</span>
                        <small className="text-muted">{item.time}</small>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contributions grid */}
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="fw-bold mb-3">My Contributions</h6>
              <div className="row g-3">
                {[
                  { img: "https://images.unsplash.com/photo-1569516960745-5aa6b5ed94ef?q=80&w=1200&auto=format&fit=crop", title: "My visit to Faisal Mosque", likes: 123 },
                  { img: "https://images.unsplash.com/photo-1591104224523-7a7a00305d01?q=80&w=1200&auto=format&fit=crop", title: "Discovering Naltar Valley's hidden gems", likes: 89 },
                  { img: "https://images.unsplash.com/photo-1589307004173-3c952054f62d?q=80&w=1200&auto=format&fit=crop", title: "Historical beauty of Badshahi Mosque", likes: 150 },
                  { img: "https://images.unsplash.com/photo-1577116253943-4c2cff71b6f1?q=80&w=1200&auto=format&fit=crop", title: "Trekking to Concordia: The Throne of Mountains", likes: 210 },
                  { img: "https://images.unsplash.com/photo-1620419930304-6b12b8d3f5a1?q=80&w=1200&auto=format&fit=crop", title: "Exploring the ancient city of Mohenjo-Daro", likes: 75 },
                  { img: "https://images.unsplash.com/photo-1615979202905-b4f28bb80673?q=80&w=1200&auto=format&fit=crop", title: "Ansoo Lake: A natural wonder", likes: 95 },
                ].map((c, i) => (
                  <div key={i} className="col-12 col-md-6">
                    <div className="card h-100 contribution-card shadow-sm">
                      <img src={c.img} className="card-img-top" alt={c.title} />
                      <div className="card-body">
                        <div className="small fw-semibold mb-1">{c.title}</div>
                        <div className="text-muted small d-flex align-items-center gap-1">
                          <FiHeart className="text-danger" /> {c.likes} Likes
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


