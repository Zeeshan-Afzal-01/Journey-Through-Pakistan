import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiImage, FiMapPin, FiSmile, FiTrendingUp, FiUsers, FiSearch, FiHeart, FiMessageSquare, FiBookmark, FiHome, FiBell, FiPlus, FiUser } from "react-icons/fi";
import "../assests/css/community.css";
import { listPosts, createPost, toggleLike, addComment } from "../api/postsApi.jsx";
import { getTopCreators } from "../api/authApi.jsx";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { listStatuses as apiListStatuses, createStatus as apiCreateStatus, markStatusViewed as apiMarkViewed } from "../api/statusesApi.jsx";

function CreatePostBar({ onPost, currentUser, onStatusCreated, onOpenStatusModal }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="card shadow-sm mb-3">
        <div className="card-body py-3">
          <div className="d-flex align-items-center gap-3">
            <img
              className="rounded-circle"
              src={currentUser?.profilePicture ? `http://localhost:3000/${currentUser.profilePicture}` : "/default-avatar.png"}
              alt={currentUser?.name || "me"}
              style={{ width: "40px", height: "40px" }}
            />
            <div
              className="flex-grow-1 bg-light rounded-pill px-3 py-2"
              onClick={() => setShowModal(true)}
              style={{ cursor: "pointer" }}
            >
              <span className="text-muted">{`What's on your mind, ${currentUser?.name?.split(' ')[0] || ''}?`}</span>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-light rounded-circle p-2" style={{ width: "40px", height: "40px" }} title="Add Status" onClick={() => onOpenStatusModal?.()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#8a2be2">
                  <circle cx="12" cy="12" r="10" opacity="0.15"/>
                  <path d="M12 7v10M7 12h10" stroke="#8a2be2" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button className="btn btn-light rounded-circle p-2" style={{ width: "40px", height: "40px" }} title="Photo/Video">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#45bd62">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </button>
              <button className="btn btn-light rounded-circle p-2" style={{ width: "40px", height: "40px" }} title="Feeling/Activity">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#f7b928">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <CreatePostModal onPost={onPost} currentUser={currentUser} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

function CreatePostModal({ onPost, currentUser, onClose }) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState(null);
  const [place, setPlace] = useState("");
  const [feeling, setFeeling] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPlace, setShowPlace] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [privacy, setPrivacy] = useState("Public");
  const [showGifModal, setShowGifModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [selectedGif, setSelectedGif] = useState("");
  const [taggedUsers, setTaggedUsers] = useState([]);

  const MAX_LEN = 500;
  const canPost = (text.trim().length > 0 || file || imageUrl || selectedGif) && !submitting;

  // Sample GIFs (in real app, fetch from GIPHY API)
  const sampleGifs = [
    "https://media.giphy.com/media/3o7TKSjRrfIPjeiVy/giphy.gif",
    "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    "https://media.giphy.com/media/3o6Zt4HU9VWJ2KQZ2E/giphy.gif",
    "https://media.giphy.com/media/26BRrSvJUoRi0joY8/giphy.gif",
    "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    "https://media.giphy.com/media/3o7TKSjRrfIPjeiVy/giphy.gif"
  ];

  // Sample locations (in real app, use Google Places API)
  const sampleLocations = [
    "Lahore, Pakistan",
    "Karachi, Pakistan", 
    "Islamabad, Pakistan",
    "Hunza Valley, Pakistan",
    "Naltar Valley, Pakistan",
    "Murree, Pakistan"
  ];

  // Sample users (in real app, fetch from database)
  const sampleUsers = [
    { id: 1, name: "Ayesha Khan", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop" },
    { id: 2, name: "Usman Ali", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop" },
    { id: 3, name: "Zara Tariq", avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=200&auto=format&fit=crop" },
    { id: 4, name: "Bilal Ahmed", avatar: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=200&auto=format&fit=crop" }
  ];

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl("");
    }
  }, [file]);

  const handleSubmit = async () => {
    if (!canPost) return;
    setSubmitting(true);
    try {
      const finalImageUrl = selectedGif || imageUrl;
      const payload = file
        ? { text, file, place: place || undefined, feeling: feeling || undefined }
        : { text, imageUrl: finalImageUrl || undefined, place: place || undefined, feeling: feeling || undefined };
      const { data } = await createPost(payload);
      onPost?.(data);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleTagUser = (user) => {
    if (!taggedUsers.find(u => u.id === user.id)) {
      setTaggedUsers([...taggedUsers, user]);
      setText(text + ` @${user.name}`);
    }
    setShowTagModal(false);
  };

  const handleSelectLocation = (location) => {
    setPlace(location);
    setShowLocationModal(false);
  };

  const handleSelectGif = (gifUrl) => {
    setSelectedGif(gifUrl);
    setShowGifModal(false);
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content" style={{ borderRadius: "8px" }}>
          <div className="modal-header border-0 pb-0" style={{ padding: "16px 20px 0" }}>
            <h5 className="modal-title fw-bold text-center w-100" style={{ fontSize: "20px" }}>Create post</h5>
            <button type="button" className="btn-close position-absolute" style={{ right: "20px", top: "16px" }} onClick={onClose}></button>
          </div>
          <div className="modal-body" style={{ padding: "16px 20px" }}>
            <div className="d-flex align-items-center gap-3 mb-3">
              <img
                className="rounded-circle"
                src={currentUser?.profilePicture ? `http://localhost:3000/${currentUser.profilePicture}` : "/default-avatar.png"}
                alt={currentUser?.name || "me"}
                style={{ width: "40px", height: "40px" }}
              />
              <div className="flex-grow-1">
                <div className="fw-semibold" style={{ fontSize: "15px" }}>{currentUser?.name || "Unknown"}</div>
                <div className="d-flex align-items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#65676b">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <select 
                    className="form-select form-select-sm border-0 p-0 bg-transparent" 
                    style={{ width: "auto", fontSize: "13px", color: "#65676b" }} 
                    value={privacy} 
                    onChange={(e) => setPrivacy(e.target.value)}
                  >
                    <option value="Public">Public</option>
                    <option value="Friends">Friends</option>
                    <option value="Only me">Only me</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="position-relative">
              <textarea
                value={text}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.length <= MAX_LEN) setText(v);
                }}
                rows={4}
                className="form-control border-0"
                style={{ fontSize: "24px", resize: "none", padding: "0", paddingRight: "50px" }}
                placeholder={`What's on your mind, ${currentUser?.name?.split(' ')[0] || ''}?`}
              />
              <button 
                type="button" 
                className="btn btn-light border-0 position-absolute" 
                style={{ right: "10px", bottom: "10px", width: "35px", height: "35px" }}
                onClick={() => setShowEmoji(!showEmoji)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#f7b928">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </button>
            </div>

            {(file || imageUrl || selectedGif) && (
              <div className="mb-3">
                <div className="position-relative d-inline-block rounded overflow-hidden" style={{ maxWidth: "100%" }}>
                  <img src={file ? previewUrl : (selectedGif || imageUrl)} alt="preview" className="img-fluid rounded" />
                  <button type="button" className="btn btn-sm btn-danger position-absolute" style={{ top: 6, right: 6 }} onClick={() => { setFile(null); setImageUrl(""); setSelectedGif(""); }}>Remove</button>
                </div>
              </div>
            )}

            <div className="d-flex align-items-center justify-content-between mt-3 pt-3" style={{ borderTop: "1px solid #dadde1" }}>
              <span className="fw-semibold" style={{ fontSize: "15px", color: "#65676b" }}>Add to your post</span>
              <div className="d-flex gap-2">
                <label className="btn btn-light border-0 rounded-circle p-2" style={{ width: "40px", height: "40px" }} title="Photo/Video">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#45bd62">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                  <input type="file" accept="image/*,video/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
                <button type="button" className="btn btn-light border-0 rounded-circle p-2" style={{ width: "40px", height: "40px" }} title="Tag people" onClick={() => setShowTagModal(true)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877f2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M7 20v-2a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2"/>
                  </svg>
                </button>
                <button type="button" className="btn btn-light border-0 rounded-circle p-2" style={{ width: "40px", height: "40px" }} title="Feeling/Activity" onClick={() => setShowEmoji((v) => !v)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#f7b928">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </button>
                <button type="button" className="btn btn-light border-0 rounded-circle p-2" style={{ width: "40px", height: "40px" }} title="Check in" onClick={() => setShowLocationModal(true)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#f02849">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </button>
                <button type="button" className="btn btn-light border-0 rounded-circle p-2" style={{ width: "40px", height: "40px" }} title="GIF" onClick={() => setShowGifModal(true)}>
                  <span style={{ fontSize: "10px", fontWeight: "bold", color: "#45bd62" }}>GIF</span>
                </button>
                <button type="button" className="btn btn-light border-0 rounded-circle p-2" style={{ width: "40px", height: "40px" }} title="More options" onClick={() => {
                  const options = ['Live Video', 'Life Event', 'Support', 'Fundraiser'];
                  const choice = prompt(`Choose an option:\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`);
                  if (choice && options[parseInt(choice) - 1]) {
                    alert(`Selected: ${options[parseInt(choice) - 1]}`);
                  }
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#65676b">
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="19" cy="12" r="1"/>
                    <circle cx="5" cy="12" r="1"/>
                  </svg>
                </button>
              </div>
            </div>

            {showEmoji && (
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid #dadde1" }}>
                <div className="d-flex gap-2 flex-wrap">
                  {["😀","😁","😂","🥰","😍","😎","🤩","😇","🥳","😴","😢","🤔","🙏","💪","🌟","🔥","🎉","🍽️","🏔️","📸"].map((em) => (
                    <button key={em} type="button" className="btn btn-light border rounded-circle p-2" style={{ width: "40px", height: "40px" }} onClick={() => setFeeling(em)}>{em}</button>
                  ))}
                </div>
                {feeling && <div className="mt-2 small text-muted">Selected: {feeling}</div>}
              </div>
            )}
          </div>
          <div className="modal-footer border-0" style={{ padding: "16px 20px" }}>
            <button disabled={!canPost} onClick={handleSubmit} className="btn btn-primary w-100 rounded-pill py-2" style={{ fontSize: "15px", fontWeight: "600" }}>
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>

      {/* GIF Selection Modal */}
      {showGifModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Choose a GIF</h5>
                <button type="button" className="btn-close" onClick={() => setShowGifModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-2">
                  {sampleGifs.map((gif, index) => (
                    <div key={index} className="col-6 col-md-4">
                      <div className="ratio ratio-1x1">
                        <img 
                          src={gif} 
                          alt={`GIF ${index + 1}`} 
                          className="img-fluid rounded cursor-pointer"
                          style={{ cursor: "pointer" }}
                          onClick={() => handleSelectGif(gif)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Search Modal */}
      {showLocationModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="btn btn-link p-0 me-3" onClick={() => setShowLocationModal(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                  </svg>
                </button>
                <h5 className="modal-title">Check in</h5>
              </div>
              <div className="modal-body">
                <div className="input-group mb-3">
                  <span className="input-group-text">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                  </span>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search for a place"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                  />
                </div>
                <div className="list-group">
                  {sampleLocations
                    .filter(loc => loc.toLowerCase().includes(locationSearch.toLowerCase()))
                    .map((location, index) => (
                      <button 
                        key={index}
                        type="button" 
                        className="list-group-item list-group-item-action d-flex align-items-center"
                        onClick={() => handleSelectLocation(location)}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#f02849" className="me-3">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        {location}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag People Modal */}
      {showTagModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <button type="button" className="btn btn-link p-0 me-3" onClick={() => setShowTagModal(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                  </svg>
                </button>
                <h5 className="modal-title">Tag people</h5>
              </div>
              <div className="modal-body">
                <div className="input-group mb-3">
                  <span className="input-group-text">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                  </span>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search for people"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                  />
                </div>
                <div className="list-group">
                  {sampleUsers
                    .filter(user => user.name.toLowerCase().includes(tagSearch.toLowerCase()))
                    .map((user) => (
                      <button 
                        key={user.id}
                        type="button" 
                        className="list-group-item list-group-item-action d-flex align-items-center"
                        onClick={() => handleTagUser(user)}
                      >
                        <img 
                          src={user.avatar} 
                          alt={user.name}
                          className="rounded-circle me-3"
                          style={{ width: "40px", height: "40px" }}
                        />
                        <div>
                          <div className="fw-semibold">{user.name}</div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateStatusModal({ currentUser, onCreated, onClose }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl("");
    }
  }, [file]);

  // Auto-open file chooser when modal opens and no file selected
  useEffect(() => {
    if (!file && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [file]);

  const handleSubmit = async () => {
    if (!file || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await apiCreateStatus({ file, caption: caption || undefined });
      onCreated?.(data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content" style={{ borderRadius: 16, overflow: 'hidden' }}>
          <div className="modal-header" style={{ background: 'linear-gradient(135deg,#8a2be2,#00d4ff)', color: '#fff' }}>
            <div className="d-flex align-items-center gap-2">
              <img className="rounded-circle" style={{ width:36, height:36, objectFit:'cover', border:'2px solid rgba(255,255,255,.6)' }} src={currentUser?.profilePicture ? `http://localhost:3000/${currentUser.profilePicture}` : '/default-avatar.png'} alt={currentUser?.name||'me'} />
              <div className="fw-semibold">{currentUser?.name || 'You'}</div>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body" style={{ background:'#0b0b0d' }}>
            <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={(e)=> setFile(e.target.files?.[0] || null)} />
            {!previewUrl && (
              <div className="text-center text-white-50 py-5" style={{ minHeight: '40vh' }}>
                Select a photo to share as your status
              </div>
            )}
            {previewUrl && (
              <div className="mb-3 d-flex justify-content-center">
                <img src={previewUrl} alt="preview" style={{ width:'100%', maxHeight:'50vh', objectFit:'contain', borderRadius:12, boxShadow:'0 10px 30px rgba(0,0,0,.5)' }} />
              </div>
            )}
            {previewUrl && (
              <input value={caption} onChange={(e)=>setCaption(e.target.value)} className="form-control" placeholder="Write a caption (optional)" />
            )}
          </div>
          <div className="modal-footer" style={{ background:'#0b0b0d', borderTopColor:'#1f1f25' }}>
            <button className="btn btn-outline-light" onClick={() => fileInputRef.current?.click()}>Choose Photo</button>
            <button className="btn btn-primary" disabled={!file || submitting} onClick={handleSubmit}>{submitting ? 'Uploading…' : 'Post Status'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBar({ currentUser, groups, onClickGroup, onAddRequested }) {
  const getRingStyle = (count) => {
    if (!count || count <= 1) return {};
    const colors = ['#ff5f6d', '#ffc371', '#36d1dc', '#5b86e5', '#f7971e', '#c471ed'];
    const step = 100 / count;
    let gradient = '';
    for (let i = 0; i < count; i++) {
      const start = i * step;
      const end = (i + 1) * step;
      const color = colors[i % colors.length];
      gradient += `${color} ${start}%, ${color} ${end}%` + (i < count - 1 ? ', ' : '');
    }
    return {
      background: `conic-gradient(${gradient})`
    };
  };
  return (
    <div className="card shadow-sm mb-3">
      <div className="card-body py-2 stories-bar">
        <div className="story-item" onClick={()=>onAddRequested?.()} style={{ cursor:'pointer' }}>
          <div className="story-ring add">
            <img src={currentUser?.profilePicture ? `http://localhost:3000/${currentUser.profilePicture}` : '/default-avatar.png'} alt={currentUser?.name||'You'} />
            <span className="story-plus">+</span>
          </div>
          <div className="story-name">Add Status</div>
        </div>
        {groups.map((g, idx) => (
          <div key={(g.user?._id||'u')+idx} className="story-item" onClick={()=>onClickGroup?.(idx)} style={{ cursor:'pointer' }}>
            <div className="story-ring" style={getRingStyle(g.items?.length || 1)}>
              <img src={g.user?.profilePicture ? `http://localhost:3000/${g.user.profilePicture}` : '/default-avatar.png'} alt={g.user?.name||'User'} />
            </div>
            <div className="story-name">{g.user?.name?.split(' ')[0] || 'User'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusViewerModal({ groups, groupIndex, onClose, onChangeGroup, currentUser }) {
  const [index, setIndex] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const group = groups[groupIndex];
  const items = group?.items || [];
  const item = items[index];

  useEffect(() => { setIndex(0); }, [groupIndex]);

  // Mark as viewed when viewing someone else's status
  useEffect(() => {
    const run = async () => {
      if (item && currentUser && group?.user?._id !== currentUser._id) {
        try { await apiMarkViewed(item._id); } catch {}
      }
    };
    run();
  }, [item?._id]);

  const goPrevItem = () => setIndex(i => Math.max(0, i - 1));
  const goNextItem = () => setIndex(i => Math.min(items.length - 1, i + 1));
  const goPrevGroup = () => onChangeGroup?.(Math.max(0, groupIndex - 1));
  const goNextGroup = () => onChangeGroup?.(Math.min(groups.length - 1, groupIndex + 1));

  const handlePointer = (e, isDown) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const leftSide = x < rect.width / 2;
    if (!isDown) return;
    const start = Date.now();
    const endHandler = (ev) => {
      const dur = Date.now() - start;
      const longPress = dur > 250; // threshold
      const isLeft = leftSide;
      if (longPress) {
        if (isLeft) {
          if (groupIndex > 0) onChangeGroup?.(groupIndex - 1);
        } else {
          if (groupIndex < groups.length - 1) onChangeGroup?.(groupIndex + 1);
        }
      } else {
        if (isLeft) {
          if (index > 0) setIndex(i=>i-1); else if (groupIndex>0) onChangeGroup?.(groupIndex-1);
        } else {
          if (index < items.length - 1) setIndex(i=>i+1); else if (groupIndex<groups.length-1) onChangeGroup?.(groupIndex+1);
        }
      }
      window.removeEventListener('mouseup', endHandler);
      window.removeEventListener('touchend', endHandler);
    };
    window.addEventListener('mouseup', endHandler);
    window.addEventListener('touchend', endHandler, { once: true });
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.9)" }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content bg-dark text-white" style={{ overflow:'hidden', borderRadius: 16 }}>
          <div className="modal-header border-0">
            <div className="d-flex align-items-center gap-2">
              <img className="rounded-circle" style={{ width:32, height:32, objectFit:'cover' }} src={group?.user?.profilePicture ? `http://localhost:3000/${group.user.profilePicture}` : '/default-avatar.png'} />
              <div className="small fw-semibold">{group?.user?.name || 'User'}</div>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          {/* Item progress segments */}
          <div className="px-3 pt-2 w-100">
            <div className="story-progress d-flex gap-1">
              {items.map((_, i) => (
                <div key={i} className={`story-progress-seg ${i<=index ? 'active' : ''}`}></div>
              ))}
            </div>
            
          </div>
          <div className="modal-body p-0 position-relative" style={{ background:'#000' }} onMouseDown={(e)=>handlePointer(e,true)} onTouchStart={(e)=>handlePointer(e,true)}>
            {item ? (
              <img src={`http://localhost:3000/${item.mediaUrl}`} alt="status" style={{ width:'100%', height:'70vh', objectFit:'contain', background:'#000' }} />
            ) : (
              <div className="text-center text-muted py-5">No status</div>
            )}
            <button className="btn btn-sm btn-outline-light position-absolute" style={{ left:12, top:'50%' }} onClick={index>0?goPrevItem:goPrevGroup} disabled={groupIndex===0 && index===0}>‹</button>
            <button className="btn btn-sm btn-outline-light position-absolute" style={{ right:12, top:'50%' }} onClick={index<items.length-1?goNextItem:goNextGroup} disabled={groupIndex===groups.length-1 && index===items.length-1}>›</button>
          </div>
          <div className="modal-footer flex-column align-items-stretch border-0 w-100" style={{ gap: '8px' }}>
            <div className="d-flex justify-content-between align-items-center w-100">
              <div className="text-muted small">{items.length ? `${index+1} / ${items.length}` : 'No items'}</div>
              <div className="d-flex align-items-center gap-2">
                {group?.user?._id === currentUser?._id && (
                  <button className="btn btn-sm btn-outline-light" onClick={()=> setShowViewers(v=>!v)}>
                    Viewers ({item?.views?.length || 0})
                  </button>
                )}
              </div>
            </div>
            {group?.user?._id === currentUser?._id && showViewers && Array.isArray(item?.views) && (
              <div className="bg-dark rounded p-2" style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #2a2a2a' }}>
                {item.views.length === 0 && (
                  <div className="text-muted xsmall">No viewers yet</div>
                )}
                {item.views.map(v => (
                  <div key={v._id} className="d-flex align-items-center gap-2 py-1">
                    <img className="rounded-circle" style={{ width:26, height:26, objectFit:'cover' }} src={v.profilePicture ? `http://localhost:3000/${v.profilePicture}` : '/default-avatar.png'} alt={v.name} />
                    <div className="small">{v.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Composer({ onPost, currentUser }) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState(null);
  const [place, setPlace] = useState("");
  const [feeling, setFeeling] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPlace, setShowPlace] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const MAX_LEN = 500;

  const canPost = (text.trim().length > 0 || file || imageUrl) && !submitting;

  useEffect(()=>{
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl("");
    }
  }, [file]);

  const handleSubmit = async () => {
    if (!canPost) return;
    setSubmitting(true);
    try {
      const payload = file
        ? { text, file, place: place || undefined, feeling: feeling || undefined }
        : { text, imageUrl: imageUrl || undefined, place: place || undefined, feeling: feeling || undefined };
      const { data } = await createPost(payload);
      onPost?.(data);
      setText("");
      setImageUrl("");
      setFile(null);
      setPlace("");
      setFeeling("");
      setShowEmoji(false);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="card shadow-sm mb-3">
      <div className="card-body">
        <div className="d-flex gap-3">
          <img className="rounded-circle flex-shrink-0 comm-avatar" src={currentUser?.profilePicture ? `http://localhost:3000/${currentUser.profilePicture}` : "/default-avatar.png"} alt={currentUser?.name || "me"} />
          <div className="flex-grow-1">
            <textarea value={text} onChange={(e)=>{
              const v = e.target.value;
              if (v.length <= MAX_LEN) setText(v);
            }} rows={3} className="form-control mb-1" placeholder={`What's on your mind, ${currentUser?.name?.split(' ')[0] || ''}?`} />
            <div className="d-flex justify-content-end text-muted xsmall mb-2">{text.length}/{MAX_LEN}</div>
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <label className="btn btn-light border mb-0">
                <FiImage className="me-2"/>Photo
                <input type="file" accept="image/*" hidden onChange={(e)=> setFile(e.target.files?.[0] || null)} />
              </label>
              <button type="button" className="btn btn-light border" onClick={()=>{
                const url = prompt("Paste image URL (optional)") || "";
                setImageUrl(url);
              }}>Use URL</button>
              <button type="button" className="btn btn-light border" onClick={()=> setShowPlace(v=>!v)}><FiMapPin className="me-2"/>Place</button>
              {showPlace && (
                <input value={place} onChange={(e)=>setPlace(e.target.value)} className="form-control" style={{maxWidth:240}} placeholder="Mention a place" />
              )}
              <button type="button" className="btn btn-light border" onClick={()=> setShowEmoji(v=>!v)}><FiSmile className="me-2"/>Feeling</button>
              <div className="ms-auto">
                <button disabled={!canPost} onClick={handleSubmit} className="btn btn-primary">{submitting ? "Posting..." : "Post"}</button>
              </div>
            </div>
            {(file || imageUrl) && (
              <div className="mt-2">
                <div className="position-relative d-inline-block rounded overflow-hidden" style={{maxWidth: '100%'}}>
                  <img src={file ? previewUrl : imageUrl} alt="preview" className="img-fluid rounded" />
                  <button type="button" className="btn btn-sm btn-danger position-absolute" style={{top:6,right:6}} onClick={()=>{ setFile(null); setImageUrl(""); }}>Remove</button>
              </div>
            </div>
            )}
            {showEmoji && (
              <div className="mt-2 d-flex gap-2 flex-wrap">
                {['😀','😁','😂','🥰','😍','😎','🤩','😇','🥳','😴','😢','🤔','🙏','💪','🌟','🔥','🎉','🍽️','🏔️','📸'].map(em => (
                  <button key={em} type="button" className="btn btn-sm btn-light border" onClick={()=> setFeeling(em)}>{em}</button>
                ))}
                {feeling && <span className="small text-muted">Selected: {feeling}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, onToggleLike, onAddComment }) {
  const likeCount = post.likes?.length || 0;
  const commentCount = post.comments?.length || 0;
  const time = new Date(post.createdAt).toLocaleString();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const submitting = false;
  const isGif = post.imageUrl && /\.gif($|\?)/i.test(post.imageUrl);
  return (
    <div className="card shadow-sm mb-3 post-card">
      <div className="card-body">
        <div className="d-flex align-items-center gap-2 mb-2">
        <img
  className="rounded-circle comm-avatar"
  src={post.author?.profilePicture ? `http://localhost:3000/${post.author.profilePicture}` : "/default-avatar.png"}
  alt={post.author?.name || "User"}
/>
          <div>
            <div className="fw-semibold small">{post.author?.name || "Unknown"}</div>
            <div className="text-muted xsmall">{time} • {post.author?.city || "Pakistan"}</div>
          </div>
        </div>
        <p className="mb-2">{post.text}</p>
        {post.imageUrl && (
          isGif ? (
            <div className="rounded overflow-hidden mb-2">
              <Link to={`/community/post/${post._id}`}>
                <img style={{ width: '100%', height: 'auto' }} src={post.imageUrl.startsWith('http') ? post.imageUrl : `http://localhost:3000/${post.imageUrl}`} alt="post" />
              </Link>
            </div>
          ) : (
            <div className="ratio ratio-16x9 rounded overflow-hidden mb-2">
              <Link to={`/community/post/${post._id}`}>
                <img className="object-fit-cover" src={post.imageUrl.startsWith('http') ? post.imageUrl : `http://localhost:3000/${post.imageUrl}`} alt="post" />
              </Link>
            </div>
          )
        )}
        {(post.place || post.feeling) && (
          <div className="text-muted xsmall mb-2">
            {post.place && <span className="me-2"><FiMapPin className="me-1"/>{post.place}</span>}
            {post.feeling && <span className="me-2">{post.feeling}</span>}
          </div>
        )}
        <div className="d-flex gap-3 text-muted small">
          <button type="button" onClick={()=>onToggleLike?.(post)} className="btn btn-link p-0 text-decoration-none text-muted d-inline-flex align-items-center gap-1"><FiHeart/> {likeCount}</button>
          <button type="button" onClick={()=>setShowComments(v=>!v)} className="btn btn-link p-0 text-decoration-none text-muted d-inline-flex align-items-center gap-1"><FiMessageSquare/> {commentCount}</button>
          <span className="ms-auto d-inline-flex align-items-center gap-1"><FiBookmark/> Save</span>
        </div>
        {showComments && (
          <div className="mt-3">
            <div className="d-flex flex-column gap-2">
              {(post.comments || []).map((c) => (
                <div key={c._id} className="d-flex align-items-start gap-2">
                  <img className="rounded-circle" src={c.author?.profilePicture ? `http://localhost:3000/${c.author.profilePicture}` : '/default-avatar.png'} alt={c.author?.name || 'User'} style={{ width: 28, height: 28, objectFit: 'cover' }} />
                  <div className="bg-light rounded px-2 py-1 flex-grow-1">
                    <div className="small"><span className="fw-semibold">{c.author?.name || 'User'}</span> <span className="text-muted">{new Date(c.createdAt).toLocaleString?.() || ''}</span></div>
                    <div className="small">{c.text}</div>
                  </div>
                </div>
              ))}
              <div className="d-flex align-items-center gap-2">
                <input className="form-control form-control-sm" placeholder="Write a comment..." value={commentText} onChange={(e)=>setCommentText(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ onAddComment?.(post, commentText, () => setCommentText('')); } }} />
                <button disabled={!commentText.trim() || submitting} className="btn btn-primary btn-sm" onClick={()=> onAddComment?.(post, commentText, () => setCommentText(''))}>Comment</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const groups = useMemo(() => {
    const map = new Map();
    statuses.forEach(s => {
      const key = s.author?._id || 'unknown';
      if (!map.has(key)) map.set(key, { user: s.author, items: [] });
      map.get(key).items.push(s);
    });
    return Array.from(map.values());
  }, [statuses]);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [topCreators, setTopCreators] = useState([]);
  const [fabOpen, setFabOpen] = useState(false);
  const [fabBellOpen, setFabBellOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await listPosts();
        if (mounted) setPosts(data);
      } catch (e) {
        if (mounted) setError("Failed to load feed");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load statuses
  useEffect(() => {
    (async () => {
      try {
        const res = await apiListStatuses();
        setStatuses(Array.isArray(res.data) ? res.data : []);
      } catch {}
    })();
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await getTopCreators();
        setTopCreators(data || []);
      } catch {}
    })();
  }, []);

  // Load notifications for FAB dropdown
  useEffect(() => {
    (async () => {
      try {
        const { listNotifications } = await import('../api/notificationsApi.jsx');
        const res = await listNotifications();
        setNotifications(Array.isArray(res.data) ? res.data : [])
      } catch {}
    })();
  }, []);

  const handlePrependPost = (p) => {
    setPosts((old) => [p, ...old]);
  };

  const handleToggleLike = async (post) => {
    try {
      const { data } = await toggleLike(post._id);
      setPosts((old) => old.map((x) => (x._id === data._id ? data : x)));
    } catch {}
  };

  const handleAddComment = async (post, text, done) => {
    try {
      const { data } = await addComment(post._id, text.trim());
      setPosts((old) => old.map((x) => (x._id === data._id ? data : x)));
      if (done) done();
    } catch {}
  };

  const people = [
    { name: "Bilal Ahmed", handle: "@bilal_travels", avatar: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=200&auto=format&fit=crop" },
    { name: "Hira Fatima", handle: "@wanderhira", avatar: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?q=80&w=200&auto=format&fit=crop" },
    { name: "Raza Malik", handle: "@razamaps", avatar: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=200&auto=format&fit=crop" },
  ];

  const topics = ["Hunza", "Islamabad", "Street Food", "Hiking", "Culture", "Photography"];

  return (
    <>
    <div className="container-fluid py-3 community-page">
      <div className="row g-3">
        {/* Left sidebar */}
        <div className="col-12 col-lg-3">
          <div className="community-sticky">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <div className="fw-bold mb-2 d-flex align-items-center gap-2"><FiTrendingUp/> Trending Topics</div>
              <div className="d-flex flex-wrap gap-2">
                {topics.map(t => (
                  <span key={t} className="badge bg-light text-dark border fw-normal px-3 py-2">#{t}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-body">
              <div className="fw-bold mb-2 d-flex align-items-center gap-2"><FiUsers/> People to follow</div>
              <div className="d-flex flex-column gap-2">
                {topCreators.map(tc => (
                  <div key={tc.user?._id} className="d-flex align-items-center gap-2">
                    <img className="rounded-circle comm-avatar" src={tc.user?.profilePicture ? `http://localhost:3000/${tc.user.profilePicture}` : '/default-avatar.png'} alt={tc.user?.name || 'User'} />
                    <div className="flex-grow-1">
                      <div className="small fw-semibold">{tc.user?.name}</div>
                      <div className="xsmall text-muted">{tc.totalLikes} likes • {tc.posts} posts</div>
                    </div>
                    <button className="btn btn-sm btn-outline-primary">Follow</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Feed */}
        <div className="col-12 col-lg-6">
          <StatusBar currentUser={user} groups={groups} onClickGroup={(idx)=> setViewerGroupIndex(idx)} onAddRequested={()=> setShowStatusModal(true)} />
          <CreatePostBar onPost={handlePrependPost} currentUser={user} onStatusCreated={(s)=> setStatuses(old=>[s, ...old])} onOpenStatusModal={()=> setShowStatusModal(true)} />
          {loading && <div className="text-center text-muted small py-4">Loading feed...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          {!loading && posts.length === 0 && (
            <div className="text-center text-muted small py-4">No posts yet. Be the first to share!</div>
          )}
          {posts.map((p) => (
            <PostCard key={p._id} post={p} onToggleLike={handleToggleLike} onAddComment={handleAddComment} />
          ))}
        </div>

        {/* Right sidebar */}
        <div className="col-12 col-lg-3">
          <div className="community-sticky">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <div className="fw-bold mb-2">Discover Groups</div>
              <div className="d-flex flex-column gap-2">
                {["Backpackers Pakistan", "Foodies of Lahore", "Islamabad Photowalk"].map((g) => (
                  <div className="d-flex align-items-center justify-content-between" key={g}>
                    <span className="small">{g}</span>
                    <button className="btn btn-sm btn-outline-secondary">Join</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card shadow-sm">
            <div className="card-body text-muted xsmall">
              © {new Date().getFullYear()} Journey Through Pakistan
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
    {showStatusModal && (
      <CreateStatusModal currentUser={user} onCreated={(s)=> { setStatuses(old=>[s, ...old]); setShowStatusModal(false); }} onClose={()=> setShowStatusModal(false)} />
    )}
    {viewerGroupIndex >= 0 && groups.length > 0 && (
      <StatusViewerModal groups={groups} groupIndex={viewerGroupIndex} onChangeGroup={(idx)=> setViewerGroupIndex(idx)} onClose={()=> setViewerGroupIndex(-1)} currentUser={user} />
    )}
      {/* Floating FAB menu */}
      <div className="fab-container">
        {fabBellOpen && (
          <div className="fab-dropdown">
            <div className="fw-semibold small p-1 border-bottom">Notifications</div>
            <div className="d-flex flex-column gap-2 p-1">
              {notifications.slice(0,6).map(n => (
                <div key={n._id} className="d-flex align-items-start gap-2">
                  <img className="rounded-circle" style={{ width: 28, height: 28, objectFit:'cover' }} src={n.actor?.profilePicture ? `http://localhost:3000/${n.actor.profilePicture}` : '/default-avatar.png'} />
                  <div className="small"><span className="fw-semibold">{n.actor?.name}</span> {n.message}</div>
                </div>
              ))}
              {notifications.length === 0 && <div className="text-muted small">No notifications</div>}
            </div>
          </div>
        )}
        {chatOpen && (
          <div className="chat-dock">
            <div className="chat-dock-header d-flex align-items-center justify-content-between">
              <span>Messages</span>
              <button className="btn btn-sm btn-light" onClick={()=>setChatOpen(false)}>Close</button>
            </div>
            <div className="chat-dock-body">
              {["Ali Raza","Hira Fatima","Bilal Ahmed","Nimra"].map((n,i)=>(
                <div key={i} className="chat-item">
                  <img className="rounded-circle" style={{ width:32,height:32,objectFit:'cover' }} src={`https://i.pravatar.cc/64?img=${i+10}`} />
                  <div className="flex-grow-1">
                    <div className="small fw-semibold">{n}</div>
                    <div className="xsmall text-muted">Tap to open chat</div>
                  </div>
                  <button className="btn btn-sm btn-outline-secondary" onClick={()=>navigate('/chats')}>Open</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="fab-menu" style={{ display: fabOpen ? 'flex' : 'none' }}>
         
          <div className="fab-item fade-up-enter-active">
            <div className="label">Search</div>
            <button onClick={()=>navigate('/search')}><FiSearch/></button>
          </div>
          <div className="fab-item fade-up-enter-active">
            <div className="label">Create</div>
            <button onClick={()=>document.querySelector('.card .card-body .flex-grow-1.bg-light')?.click()}><FiPlus/></button>
          </div>
       
         
          
        </div>
        <button className="fab" onClick={()=>setFabOpen(v=>!v)}>
          {fabOpen ? '×' : '☰'}
        </button>
      </div>
    </>
  );
}


