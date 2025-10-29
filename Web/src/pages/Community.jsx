import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiImage, FiMapPin, FiSmile, FiTrendingUp, FiUsers, FiSearch, FiHeart, FiMessageSquare, FiBookmark } from "react-icons/fi";
import "../assests/css/community.css";
import { listPosts, createPost, toggleLike } from "../api/postsApi.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function CreatePostBar({ onPost, currentUser }) {
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
              <button className="btn btn-light rounded-circle p-2" style={{ width: "40px", height: "40px" }} title="Live Video">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#f02849">
                  <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
                  <circle cx="12" cy="12" r="3" fill="white"/>
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

function PostCard({ post, onToggleLike }) {
  const likeCount = post.likes?.length || 0;
  const commentCount = post.comments?.length || 0;
  const time = new Date(post.createdAt).toLocaleString();
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
          <div className="ratio ratio-16x9 rounded overflow-hidden mb-2">
            <Link to={`/community/post/${post._id}`}>
              <img className="object-fit-cover" src={post.imageUrl.startsWith('http') ? post.imageUrl : `http://localhost:3000/${post.imageUrl}`} alt="post" />
            </Link>
          </div>
        )}
        {(post.place || post.feeling) && (
          <div className="text-muted xsmall mb-2">
            {post.place && <span className="me-2"><FiMapPin className="me-1"/>{post.place}</span>}
            {post.feeling && <span className="me-2">{post.feeling}</span>}
          </div>
        )}
        <div className="d-flex gap-3 text-muted small">
          <button type="button" onClick={()=>onToggleLike?.(post)} className="btn btn-link p-0 text-decoration-none text-muted d-inline-flex align-items-center gap-1"><FiHeart/> {likeCount}</button>
          <span className="d-inline-flex align-items-center gap-1"><FiMessageSquare/> {commentCount}</span>
          <span className="ms-auto d-inline-flex align-items-center gap-1"><FiBookmark/> Save</span>
        </div>
      </div>
    </div>
  );
}

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const handlePrependPost = (p) => {
    setPosts((old) => [p, ...old]);
  };

  const handleToggleLike = async (post) => {
    try {
      const { data } = await toggleLike(post._id);
      setPosts((old) => old.map((x) => (x._id === data._id ? data : x)));
    } catch {}
  };

  const people = [
    { name: "Bilal Ahmed", handle: "@bilal_travels", avatar: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=200&auto=format&fit=crop" },
    { name: "Hira Fatima", handle: "@wanderhira", avatar: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?q=80&w=200&auto=format&fit=crop" },
    { name: "Raza Malik", handle: "@razamaps", avatar: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=200&auto=format&fit=crop" },
  ];

  const topics = ["Hunza", "Islamabad", "Street Food", "Hiking", "Culture", "Photography"];

  return (
    <div className="container-fluid py-3 community-page">
      <div className="row g-3">
        {/* Left sidebar */}
        <div className="col-12 col-lg-3">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <div className="input-group">
                <span className="input-group-text bg-white"><FiSearch/></span>
                <input className="form-control" placeholder="Search posts, places, people" />
              </div>
            </div>
          </div>

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
                {people.map(p => (
                  <div key={p.handle} className="d-flex align-items-center gap-2">
                    <img className="rounded-circle comm-avatar" src={p.avatar} alt={p.name} />
                    <div className="flex-grow-1">
                      <div className="small fw-semibold">{p.name}</div>
                      <div className="xsmall text-muted">{p.handle}</div>
                    </div>
                    <button className="btn btn-sm btn-outline-primary">Follow</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="col-12 col-lg-6">
          <CreatePostBar onPost={handlePrependPost} currentUser={user} />
          {loading && <div className="text-center text-muted small py-4">Loading feed...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          {!loading && posts.length === 0 && (
            <div className="text-center text-muted small py-4">No posts yet. Be the first to share!</div>
          )}
          {posts.map((p) => (
            <PostCard key={p._id} post={p} onToggleLike={handleToggleLike} />
          ))}
        </div>

        {/* Right sidebar */}
        <div className="col-12 col-lg-3">
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
  );
}


