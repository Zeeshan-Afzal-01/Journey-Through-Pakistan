import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiImage, FiMapPin, FiSmile, FiTrendingUp, FiUsers, FiSearch, FiHeart, FiMessageSquare, FiBookmark, FiHome, FiBell, FiPlus, FiUser, FiMoreHorizontal, FiEdit2, FiTrash2, FiLock, FiGlobe, FiTag } from "react-icons/fi";
import "../assests/css/community.css";
import "../assests/css/stories.css";
import { listPosts, createPost, toggleLike, addComment, updatePost, deletePost } from "../api/postsApi.jsx";
import { getTopCreators } from "../api/authApi.jsx";
import { sendFriendRequest as apiSendFriendRequest } from "../api/authApi.jsx";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { listStatuses as apiListStatuses, createStatus as apiCreateStatus, markStatusViewed as apiMarkViewed, addStatusReaction, removeStatusReaction, addStatusMessage } from "../api/statusesApi.jsx";
import { acceptFriendRequest as apiAcceptFriendRequest, declineFriendRequest as apiDeclineFriendRequest } from "../api/authApi.jsx";
import { trendingHashtags as apiTrendingHashtags } from '../api/postsApi.jsx';
import { PostCardSkeleton, UserCardSkeleton, HashtagSkeleton, StatusBarSkeleton, GroupCardSkeleton } from '../components/SkeletonLoader.jsx';
import { listGroups, createGroup, joinGroup, leaveGroup, getGroupPosts } from '../api/groupsApi.jsx';
import "../assests/css/skeleton.css";

function CreatePostBar({ onPost, currentUser, onStatusCreated, onOpenStatusModal, onGroups = [] }) {
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
        <CreatePostModal onPost={onPost} currentUser={currentUser} onClose={() => setShowModal(false)} groups={onGroups} />
      )}
    </>
  );
}

function CreatePostModal({ onPost, currentUser, onClose, groups = [], selectedGroup = null }) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState(null);
  const [place, setPlace] = useState("");
  const [feeling, setFeeling] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPlace, setShowPlace] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [showGifModal, setShowGifModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [selectedGif, setSelectedGif] = useState("");
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [postToGroup, setPostToGroup] = useState(selectedGroup || "");

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
        ? { text, file, place: place || undefined, feeling: feeling || undefined, privacy, group: postToGroup || undefined }
        : { text, imageUrl: finalImageUrl || undefined, place: place || undefined, feeling: feeling || undefined, privacy, group: postToGroup || undefined };
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
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {groups.length > 0 && (
                    <select 
                      className="form-select form-select-sm border rounded" 
                      style={{ fontSize: "13px", maxWidth: "200px" }} 
                      value={postToGroup} 
                      onChange={(e) => setPostToGroup(e.target.value)}
                    >
                      <option value="">Post to Timeline</option>
                      {groups.map(g => (
                        <option key={g._id} value={g._id}>{g.name}</option>
                      ))}
                    </select>
                  )}
                  <select 
                    className="form-select form-select-sm border-0 p-0 bg-transparent" 
                    style={{ width: "auto", fontSize: "13px", color: "#65676b" }} 
                    value={privacy} 
                    onChange={(e) => setPrivacy(e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends</option>
                    <option value="only me">Only me</option>
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

function CreateGroupModal({ currentUser, onCreated, onClose }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("Group name is required");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await createGroup({ name, description, privacy, category, location });
      onCreated?.(data);
      onClose();
      setName("");
      setDescription("");
      setPrivacy("public");
      setCategory("");
      setLocation("");
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to create group");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create New Group</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Group Name *</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your group..."
              />
            </div>
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Privacy</label>
                <select className="form-select" value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
                  <option value="public">Public (Anyone can join)</option>
                  <option value="private">Private (Admin approval required)</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  className="form-control"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Travel, Food, Photography"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Location</label>
              <input
                type="text"
                className="form-control"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Lahore, Islamabad"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !name.trim()}>
              {submitting ? "Creating..." : "Create Group"}
            </button>
          </div>
        </div>
      </div>
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

  // Only open file picker on modal mount (not on file select/clear)
  // Only run once when modal mounts

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
  // Check if user has viewed all statuses from a user
  const hasUnviewedStatuses = (group) => {
    if (!group?.items || group.items.length === 0) return false;
    // Check if current user has viewed all statuses
    return group.items.some(item => {
      if (!item.views || !Array.isArray(item.views)) return true;
      const userId = currentUser?._id || currentUser?.id;
      if (!userId) return true;
      return !item.views.some(v => (v._id || v) === userId);
    });
  };

  return (
    <div className="card shadow-sm mb-3">
      <div className="stories-bar-container">
        <div className="stories-bar">
          {/* Add Story Button */}
          <div className="story-item" onClick={() => onAddRequested?.()}>
            <div className="story-avatar-wrapper add-story">
              <img 
                src={currentUser?.profilePicture ? `http://localhost:3000/${currentUser.profilePicture}` : '/default-avatar.png'} 
                alt={currentUser?.name || 'You'} 
              />
              <span className="story-add-icon">+</span>
            </div>
            <div className="story-name">Your Story</div>
          </div>

          {/* Friends' Stories */}
          {groups.map((g, idx) => {
            const hasUnviewed = hasUnviewedStatuses(g);
            return (
              <div 
                key={(g.user?._id || 'u') + idx} 
                className="story-item" 
                onClick={() => onClickGroup?.(idx)}
              >
                <div className={`story-avatar-wrapper ${!hasUnviewed ? 'viewed' : ''}`}>
                  <img 
                    src={g.user?.profilePicture ? `http://localhost:3000/${g.user.profilePicture}` : '/default-avatar.png'} 
                    alt={g.user?.name || 'User'} 
                  />
                </div>
                <div className="story-name">{g.user?.name?.split(' ')[0] || 'User'}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusViewerModal({ groups, groupIndex, onClose, onChangeGroup, currentUser, onStatusUpdate, initialStatusId }) {
  const [index, setIndex] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messageInputRef = React.useRef(null);
  const progressIntervalRef = React.useRef(null);
  const group = groups[groupIndex];
  const items = group?.items || [];
  const item = items[index];
  
  // Update item in groups when status is updated
  const updateItemInGroups = React.useCallback((updatedStatus) => {
    if (onStatusUpdate) {
      onStatusUpdate(updatedStatus);
    }
  }, [onStatusUpdate]);

  const handleNext = React.useCallback(() => {
    if (index < items.length - 1) {
      setIndex(i => i + 1);
      setProgressKey(prev => prev + 1);
    } else if (groupIndex < groups.length - 1) {
      onChangeGroup?.(groupIndex + 1);
    } else {
      onClose();
    }
  }, [index, items.length, groupIndex, groups.length, onChangeGroup, onClose]);

  const handlePrev = React.useCallback(() => {
    if (index > 0) {
      setIndex(i => i - 1);
      setProgressKey(prev => prev + 1);
    } else if (groupIndex > 0) {
      onChangeGroup?.(groupIndex - 1);
    }
  }, [index, groupIndex, onChangeGroup]);

  // Find and navigate to specific status if initialStatusId is provided
  useEffect(() => {
    if (initialStatusId && groups.length > 0) {
      // Find which group contains this status
      for (let gIdx = 0; gIdx < groups.length; gIdx++) {
        const g = groups[gIdx];
        const statusIdx = g.items?.findIndex(s => {
          const sid = s._id || s;
          return sid === initialStatusId || String(sid) === String(initialStatusId);
        });
        if (statusIdx >= 0) {
          // Found the status, navigate to it
          if (gIdx !== groupIndex) {
            onChangeGroup?.(gIdx);
          }
          setIndex(statusIdx);
          setProgressKey(prev => prev + 1);
          setIsPaused(true); // Pause to show messages
          // Show messages after a brief delay to ensure status is displayed
          setTimeout(() => {
            setShowMessages(true);
          }, 300);
          return;
        }
      }
    }
  }, [initialStatusId, groups, groupIndex, onChangeGroup]);

  useEffect(() => { 
    // Only reset if we're not navigating to a specific status
    if (!initialStatusId || !item || item._id !== initialStatusId) {
      setIndex(0);
      setProgressKey(prev => prev + 1); // Reset progress animation
      setIsPaused(false);
      setShowMessages(false);
    }
  }, [groupIndex, initialStatusId, item]);

  // Auto-advance functionality
  useEffect(() => {
    if (!item || isPaused || !items.length) return;

    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearTimeout(progressIntervalRef.current);
    }

    // Mark as viewed
    const markViewed = async () => {
      if (item && currentUser && group?.user?._id !== currentUser._id) {
        try { 
          await apiMarkViewed(item._id); 
        } catch {}
      }
    };
    markViewed();

    // Auto-advance after 5 seconds
    progressIntervalRef.current = setTimeout(() => {
      handleNext();
    }, 5000);

    return () => {
      if (progressIntervalRef.current) {
        clearTimeout(progressIntervalRef.current);
      }
    };
  }, [item?._id, index, isPaused, groupIndex, handleNext, items.length, group, currentUser]);

  const uniqueViews = React.useMemo(() => {
    if (!Array.isArray(item?.views)) return [];
    const map = new Map();
    for (const v of item.views) {
      const id = v?._id || v?.id;
      if (id && !map.has(id)) map.set(id, v);
    }
    const arr = Array.from(map.values());
    return arr.reverse();
  }, [item?.views]);

  const handleContentClick = (e) => {
    // Don't trigger navigation if clicking on pause indicator or other UI elements
    if (e.target.closest('.story-paused') || e.target.closest('.story-header') || e.target.closest('.story-bottom-controls')) {
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftSide = x < rect.width / 2;
    
    if (isLeftSide) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const handleContentTap = (e) => {
    // Don't pause if clicking on navigation areas or UI elements
    if (e.target.closest('.story-nav-left') || e.target.closest('.story-nav-right') || 
        e.target.closest('.story-header') || e.target.closest('.story-bottom-controls')) {
      return;
    }
    setIsPaused(prev => !prev);
  };

  // Swipe gesture support
  const [touchStart, setTouchStart] = React.useState(null);
  const [touchEnd, setTouchEnd] = React.useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  // Get current user's reaction
  const getUserReaction = React.useMemo(() => {
    if (!item?.reactions || !currentUser?._id) return null;
    return item.reactions.find(r => {
      const userId = r.user?._id || r.user;
      const currentUserId = currentUser._id || currentUser.id;
      return userId && currentUserId && String(userId) === String(currentUserId);
    });
  }, [item?.reactions, currentUser]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || sendingMessage || !item) return;
    
    setSendingMessage(true);
    try {
      const { data } = await addStatusMessage(item._id, messageText.trim());
      updateItemInGroups(data);
      setMessageText('');
      setIsPaused(false); // Resume after sending
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Reset message when item changes
  useEffect(() => {
    if (item) {
      setMessageText('');
      setIsPaused(false);
      setShowReactions(false);
    }
  }, [item?._id]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't handle keyboard shortcuts if user is typing in input field
      if (document.activeElement === messageInputRef.current || 
          document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        // Allow space key in input fields
        if (e.key === ' ') {
          return; // Don't prevent default, let space be typed
        }
        return; // Don't handle other keys when input is focused
      }
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlePrev, handleNext, onClose]);

  return (
    <>
      <div className="story-viewer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="story-viewer-container">
          {group && (
            <div className="story-content-wrapper">
              {/* Progress Bars */}
              <div className="story-progress-container">
                <div className="story-progress-row">
                  {items.map((_, i) => (
                    <div 
                      key={`${i}-${progressKey}`} 
                      className={`story-progress-segment ${i < index ? 'completed' : i === index ? 'active' : ''}`}
                    >
                      <div className="story-progress-segment-fill"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Header */}
              <div className="story-header">
                <div className="story-header-left">
                  <img 
                    className="story-header-avatar" 
                    src={group?.user?.profilePicture ? `http://localhost:3000/${group.user.profilePicture}` : '/default-avatar.png'} 
                    alt={group?.user?.name || 'User'} 
                  />
                  <div className="story-header-info">
                    <div className="story-header-name">{group?.user?.name || 'User'}</div>
                    <div className="story-header-time">{getTimeAgo(item?.createdAt)}</div>
                  </div>
                </div>
                <button className="story-close-btn" onClick={onClose}>×</button>
              </div>

              {/* Content Area */}
              <div 
                className="story-content-area" 
                onClick={handleContentTap}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {item ? (
                  <img 
                    className="story-image" 
                    src={`http://localhost:3000/${item.mediaUrl}`} 
                    alt="status" 
                  />
                ) : (
                  <div className="text-center text-white py-5">No status</div>
                )}
                
                {/* Navigation Areas */}
                <div className="story-nav-left" onClick={handleContentClick}></div>
                <div className="story-nav-right" onClick={handleContentClick}></div>

                {/* Pause Indicator */}
                {isPaused && <div className="story-paused">Paused</div>}
              </div>

              {/* Bottom Controls */}
              <div className="story-bottom-controls">
                {group?.user?._id !== currentUser?._id ? (
                  <div className="d-flex align-items-center gap-2" style={{ width: '100%' }}>
                    {/* React Button */}
                    <div className="position-relative">
                      <button 
                        className="story-action-btn"
                        onClick={() => setShowReactions(!showReactions)}
                      >
                        {getUserReaction ? 
                          (getUserReaction.type === 'like' ? '👍' : 
                           getUserReaction.type === 'love' ? '❤️' :
                           getUserReaction.type === 'laugh' ? '😂' :
                           getUserReaction.type === 'wow' ? '😮' :
                           getUserReaction.type === 'sad' ? '😢' : '😠') : '❤️'}
                      </button>
                      {showReactions && (
                        <>
                          <div 
                            className="position-fixed top-0 start-0 w-100 h-100" 
                            style={{ zIndex: 10001 }}
                            onClick={() => setShowReactions(false)}
                          ></div>
                          <div className="story-reactions-picker" style={{ zIndex: 10002 }}>
                            {[
                              { type: 'like', emoji: '👍', label: 'Like' },
                              { type: 'love', emoji: '❤️', label: 'Love' },
                              { type: 'laugh', emoji: '😂', label: 'Haha' },
                              { type: 'wow', emoji: '😮', label: 'Wow' },
                              { type: 'sad', emoji: '😢', label: 'Sad' },
                              { type: 'angry', emoji: '😠', label: 'Angry' },
                            ].map(reaction => (
                              <button
                                key={reaction.type}
                                className="story-reaction-btn"
                                onClick={async () => {
                                  try {
                                    const existingReaction = getUserReaction?.type;
                                    if (existingReaction === reaction.type) {
                                      // Remove reaction if clicking same one
                                      const { data } = await removeStatusReaction(item._id);
                                      updateItemInGroups(data);
                                    } else {
                                      const { data } = await addStatusReaction(item._id, reaction.type);
                                      updateItemInGroups(data);
                                    }
                                    setShowReactions(false);
                                  } catch (err) {
                                    console.error('Failed to toggle reaction', err);
                                  }
                                }}
                                title={reaction.label}
                              >
                                {reaction.emoji}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Message Input */}
                    <div className="story-reply-area" style={{ flex: 1 }}>
                      <input 
                        ref={messageInputRef}
                        type="text" 
                        className="story-reply-input" 
                        placeholder="Send message" 
                        value={messageText}
                        onChange={(e) => {
                          setMessageText(e.target.value);
                          if (!isPaused && e.target.value.trim()) {
                            setIsPaused(true); // Auto-pause when typing
                          }
                        }}
                        onFocus={() => {
                          if (!isPaused) {
                            setIsPaused(true); // Pause when input focused
                          }
                        }}
                        onBlur={() => {
                          if (isPaused && !messageText.trim()) {
                            setIsPaused(false); // Resume if no text
                          }
                        }}
                        onKeyPress={async (e) => {
                          if (e.key === 'Enter' && messageText.trim() && !sendingMessage) {
                            e.preventDefault();
                            await handleSendMessage();
                          }
                        }}
                      />
                      <button 
                        className="story-send-btn"
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || sendingMessage}
                      >
                        {sendingMessage ? '...' : '→'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex align-items-center gap-2">
                    <button 
                      className="story-viewers-btn" 
                      onClick={() => setShowViewers(true)}
                    >
                      {uniqueViews.length} viewer{uniqueViews.length !== 1 ? 's' : ''}
                    </button>
                    {item?.messages && item.messages.length > 0 && (
                      <button 
                        className="story-viewers-btn" 
                        onClick={() => setShowMessages(!showMessages)}
                      >
                        {item.messages.length} message{item.messages.length !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Viewers Modal */}
      {showViewers && (
        <ViewersModal 
          viewers={uniqueViews}
          onClose={() => setShowViewers(false)}
        />
      )}

      {/* Messages Modal - Show messages when opened from notification */}
      {showMessages && item?.messages && item.messages.length > 0 && (
        <MessagesModal
          messages={item.messages}
          onClose={() => setShowMessages(false)}
        />
      )}
    </>
  );
}

function MessagesModal({ messages, onClose }) {
  return (
    <div className="viewers-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="viewers-modal">
        <div className="viewers-modal-header">
          <h5 className="viewers-modal-title">Messages</h5>
          <button className="viewers-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="viewers-modal-body">
          {messages.length === 0 ? (
            <div className="text-center text-muted py-4">No messages yet</div>
          ) : (
            messages.map(msg => (
              <div key={msg._id || msg.id} className="viewer-item">
                <img 
                  className="viewer-avatar" 
                  src={msg.author?.profilePicture ? `http://localhost:3000/${msg.author.profilePicture}` : '/default-avatar.png'} 
                  alt={msg.author?.name || 'User'} 
                />
                <div className="viewer-info">
                  <div className="viewer-name">{msg.author?.name || 'User'}</div>
                  <div className="text-muted small mt-1">{msg.text}</div>
                  <div className="text-muted xsmall mt-1">{new Date(msg.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ViewersModal({ viewers, onClose }) {
  return (
    <div className="viewers-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="viewers-modal">
        <div className="viewers-modal-header">
          <h5 className="viewers-modal-title">Viewers</h5>
          <button className="viewers-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="viewers-modal-body">
          {viewers.length === 0 ? (
            <div className="text-center text-muted py-4">No viewers yet</div>
          ) : (
            viewers.map(v => (
              <div key={v._id || v.id} className="viewer-item">
                <img 
                  className="viewer-avatar" 
                  src={v.profilePicture ? `http://localhost:3000/${v.profilePicture}` : '/default-avatar.png'} 
                  alt={v.name} 
                />
                <div className="viewer-info">
                  <div className="viewer-name">{v.name || 'User'}</div>
                </div>
              </div>
            ))
          )}
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
  const [privacy, setPrivacy] = useState("Public");

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
        ? { text, file, place: place || undefined, feeling: feeling || undefined, privacy }
        : { text, imageUrl: imageUrl || undefined, place: place || undefined, feeling: feeling || undefined, privacy };
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
            <div className="mb-2">
              <label className="form-label">Privacy</label>
              <select
                className="form-select form-select-sm"
                value={privacy}
                onChange={e => setPrivacy(e.target.value)}
              >
                <option value="public">Public (everyone can see)</option>
                <option value="friends">Friends Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add a utility to render text with clickable hashtags
function renderWithHashtags(text, onHashtagClick) {
  if (!text) return null;
  const regex = /(^|\s)(#\w{2,})/g;
  const segments = [];
  let lastIndex = 0;
  let match;
  let hasMatches = false;
  while ((match = regex.exec(text)) !== null) {
    hasMatches = true;
    const [fullMatch, before, tag] = match;
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index));
    }
    segments.push(before);
    segments.push(<span key={match.index} style={{ color: '#2196f3', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onHashtagClick(tag.substring(1))}>{tag}</span>);
    lastIndex = match.index + fullMatch.length;
  }
  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }
  return hasMatches ? segments : text;
}

function PostCard({ post, onToggleLike, onAddComment, onHashtagClick, onPostUpdate, onPostDelete }) {
  const likeCount = post.likes?.length || 0;
  const commentCount = post.comments?.length || 0;
  const time = new Date(post.createdAt).toLocaleString();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const isGif = post.imageUrl && /\.gif($|\?)/i.test(post.imageUrl);
  const { user: currentUser } = useAuth();
  const hasLiked = post.likes && currentUser && post.likes.some(u => (u._id || u) === (currentUser._id || currentUser.id));
  const isAuthor = currentUser && (post.author?._id === currentUser._id || post.author?._id === currentUser.id);

  // Local handler for comment so per-card submitting is local not global
  const handleLocalAddComment = async (p, text, reset, parentCommentId) => {
    setCommentError("");
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      console.log('handleLocalAddComment called', { postId: p._id, text, parentCommentId });
      const { data } = await onAddComment(p, text, reset, parentCommentId, { setSubmitting, setCommentError });
      // onAddComment will update global posts for instant UI
    } catch (e) {
      setCommentError(e?.response?.data?.message || "Failed to send comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deletePost(post._id);
      onPostDelete?.(post._id);
    } catch (err) {
      // Error will be handled by parent component notification system
      console.error(err?.response?.data?.message || "Failed to delete post");
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
    setShowOptionsMenu(false);
  };

  return (
    <div className="card shadow-sm mb-3 post-card">
      <div className="card-body">
        <div className="d-flex align-items-center gap-2 mb-2 position-relative">
          <img className="rounded-circle comm-avatar" src={post.author?.profilePicture ? `http://localhost:3000/${post.author.profilePicture}` : "/default-avatar.png"} alt={post.author?.name || "User"} />
          <div className="flex-grow-1">
            <div className="fw-semibold small">{post.author?.name || "Unknown"}</div>
            <div className="text-muted xsmall">
              {time} • {post.author?.city || "Pakistan"}
              {post.group && (
                <span className="ms-2">
                  <FiUsers size={12} className="d-inline me-1" />
                  <Link to={`/group/${post.group._id || post.group}`} className="text-primary text-decoration-none">
                    {typeof post.group === 'object' ? post.group.name : 'Group'}
                  </Link>
                </span>
              )}
            </div>
          </div>
          {isAuthor && (
            <div className="position-relative">
              <button 
                className="btn btn-link p-0 text-muted"
                onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                style={{ fontSize: '20px', lineHeight: '1' }}
              >
                <FiMoreHorizontal />
              </button>
              {showOptionsMenu && (
                <>
                  <div 
                    className="position-fixed top-0 start-0 w-100 h-100" 
                    style={{ zIndex: 1040 }}
                    onClick={() => setShowOptionsMenu(false)}
                  ></div>
                  <div 
                    className="position-absolute bg-white border rounded shadow-sm"
                    style={{ right: 0, top: '100%', zIndex: 1050, minWidth: '160px', marginTop: '4px' }}
                  >
                    <button 
                      className="btn btn-sm btn-link text-start w-100 text-decoration-none d-flex align-items-center gap-2"
                      onClick={handleEdit}
                      style={{ fontSize: '14px' }}
                    >
                      <FiEdit2 size={16} /> Edit Post
                    </button>
                    <button 
                      className="btn btn-sm btn-link text-start w-100 text-decoration-none d-flex align-items-center gap-2 text-danger"
                      onClick={handleDelete}
                      style={{ fontSize: '14px' }}
                    >
                      <FiTrash2 size={16} /> Delete Post
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <p className="mb-2">{renderWithHashtags(post.text, onHashtagClick)}</p>
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
          <button type="button" onClick={()=>onToggleLike?.(post)} className="btn btn-link p-0 text-decoration-none d-inline-flex align-items-center gap-1">
            <FiHeart color={hasLiked ? '#dc3545' : undefined} fill={hasLiked ? '#dc3545' : 'none'} style={{fontWeight: hasLiked ? 'bold' : 'normal'}}/>{' '}{likeCount}
          </button>
          <button type="button" onClick={()=>setShowComments(v=>!v)} className="btn btn-link p-0 text-decoration-none text-muted d-inline-flex align-items-center gap-1"><FiMessageSquare/> {commentCount}</button>
          <span className="ms-auto d-inline-flex align-items-center gap-1"><FiBookmark/> Save</span>
        </div>
        {showComments && (
          <div className="mt-3">
            <div className="d-flex flex-column gap-2">
              <CommentThread
                comments={post.comments}
                onReply={cid => { setReplyingId(cid); setReplyText(''); }}
                replyingId={replyingId}
                replyText={replyText}
                onReplyText={e => setReplyText(e.target.value)}
                onSubmitReply={cid => handleLocalAddComment(post, replyText, () => { setReplyText(''); setReplyingId(null); }, cid)}
                submitting={submitting}
              />
              {/* Top-level comment box */}
              <div className="d-flex align-items-center gap-2">
                <input className="form-control form-control-sm" placeholder="Write a comment..." value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ handleLocalAddComment(post, commentText, () => setCommentText('')); } }} />
                <button disabled={!commentText.trim()||submitting} className="btn btn-primary btn-sm" onClick={()=>handleLocalAddComment(post, commentText, () => setCommentText(''))}>Comment</button>
              </div>
              {commentError && <div className="text-danger small">{commentError}</div>}
            </div>
          </div>
        )}
      </div>
      {showEditModal && (
        <EditPostModal
          post={post}
          onClose={() => setShowEditModal(false)}
          onUpdate={async (updatedData) => {
            try {
              const { data } = await updatePost(post._id, updatedData);
              onPostUpdate?.(data);
              setShowEditModal(false);
            } catch (err) {
              // Error handled by notification system
              console.error(err?.response?.data?.message || "Failed to update post");
            }
          }}
        />
      )}
    </div>
  );
}

function EditPostModal({ post, onClose, onUpdate }) {
  const [text, setText] = useState(post.text || "");
  const [place, setPlace] = useState(post.place || "");
  const [feeling, setFeeling] = useState(post.feeling || "");
  const [privacy, setPrivacy] = useState(post.privacy || "public");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() && !post.imageUrl) return;
    setSubmitting(true);
    try {
      await onUpdate({ text, place, feeling, privacy });
    } catch (err) {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit Post</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <textarea
              className="form-control mb-3"
              rows="4"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's on your mind?"
            />
            {post.imageUrl && (
              <div className="mb-3">
                <img 
                  src={post.imageUrl.startsWith('http') ? post.imageUrl : `http://localhost:3000/${post.imageUrl}`} 
                  alt="post" 
                  className="img-fluid rounded"
                />
                <small className="text-muted d-block mt-1">Image cannot be changed</small>
              </div>
            )}
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Place"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Feeling"
                  value={feeling}
                  onChange={(e) => setFeeling(e.target.value)}
                />
              </div>
            </div>
            <select 
              className="form-select form-select-sm" 
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
            >
              <option value="public">Public</option>
              <option value="friends">Friends Only</option>
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleSubmit}
              disabled={(!text.trim() && !post.imageUrl) || submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupPreviewModal({ group, user, onClose, onJoinRequest, isJoining }) {
  const isMember = user?._id && (group?.members?.some(m => (m._id || m) === user._id) || group?.admin?._id === user._id || (typeof group?.admin === 'string' && group?.admin === user._id));
  const isAdmin = user?._id && (group?.admin?._id === user._id || (typeof group?.admin === 'string' && group?.admin === user._id));
  const hasRequested = user?._id && group?.pendingRequests?.some(r => (r._id || r) === user._id);

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title">Group Preview</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body p-0">
            {/* Cover Image */}
            <div 
              className="position-relative"
              style={{
                height: '200px',
                backgroundImage: group.coverImage 
                  ? `url(http://localhost:3000/${group.coverImage})` 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="position-absolute bottom-0 start-0 end-0 p-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
                <div className="d-flex align-items-center gap-3 text-white">
                  <div 
                    className="rounded d-flex align-items-center justify-content-center bg-white"
                    style={{ width: '80px', height: '80px' }}
                  >
                    {group.groupPhoto ? (
                      <img 
                        src={`http://localhost:3000/${group.groupPhoto}`} 
                        alt={group.name}
                        className="rounded"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <FiUsers size={40} className="text-primary" />
                    )}
                  </div>
                  <div>
                    <h4 className="mb-0">{group.name}</h4>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      {group.privacy === 'public' ? <FiGlobe size={16} /> : <FiLock size={16} />}
                      <span className="small">{group.privacy === 'public' ? 'Public' : 'Private'} Group</span>
                      <span className="small">•</span>
                      <span className="small"><FiUsers size={14} /> {group.members?.length || 0} members</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Group Details */}
            <div className="p-4">
              {group.description && (
                <div className="mb-3">
                  <h6 className="fw-bold mb-2">About</h6>
                  <p className="text-muted small">{group.description}</p>
                </div>
              )}

              <div className="row g-3 mb-3">
                {group.category && (
                  <div className="col-6">
                    <div className="d-flex align-items-center gap-2">
                      <FiTag size={16} className="text-muted" />
                      <div>
                        <div className="xsmall text-muted">Category</div>
                        <div className="small fw-semibold">{group.category}</div>
                      </div>
                    </div>
                  </div>
                )}
                {group.location && (
                  <div className="col-6">
                    <div className="d-flex align-items-center gap-2">
                      <FiMapPin size={16} className="text-muted" />
                      <div>
                        <div className="xsmall text-muted">Location</div>
                        <div className="small fw-semibold">{group.location}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {group.rules && group.rules.length > 0 && (
                <div className="mb-3">
                  <h6 className="fw-bold mb-2">Group Rules</h6>
                  <ul className="small text-muted mb-0">
                    {group.rules.map((rule, idx) => (
                      <li key={idx}>{rule}</li>
                    ))}
                  </ul>
                </div>
              )}

              {group.privacy === 'private' && !isMember && !hasRequested && (
                <div className="alert alert-info small mb-3">
                  <FiLock className="me-2" />
                  This is a private group. You need to request to join.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer border-top">
              {isMember || isAdmin ? (
                <div className="w-100">
                  {isAdmin && (
                    <button className="btn btn-primary w-100" onClick={() => { onClose(); window.location.href = `/group/${group._id}`; }}>
                      Manage Group
                    </button>
                  )}
                  {isMember && !isAdmin && (
                    <div className="text-center text-muted small">You are already a member of this group</div>
                  )}
                </div>
              ) : (
                <button 
                  className="btn btn-primary w-100" 
                  onClick={onJoinRequest}
                  disabled={isJoining || hasRequested}
                >
                  {hasRequested ? 'Request Pending' : isJoining ? 'Joining...' : group.privacy === 'public' ? 'Join Group' : 'Request to Join'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// COMMENT RENDERING HELPERS
function CommentThread({ comments, onReply, replyingId, replyText, onReplyText, onSubmitReply, submitting }) {
  if (!comments) return null;
  return (
    <div className="d-flex flex-column gap-2 ms-4">
      {comments.map((c) => (
        <div key={c._id} className="mb-2">
          <div className="d-flex align-items-start gap-2">
            <img className="rounded-circle" src={c.author?.profilePicture ? `http://localhost:3000/${c.author.profilePicture}` : '/default-avatar.png'} alt={c.author?.name || 'User'} style={{ width: 28, height: 28, objectFit: 'cover' }} />
            <div className="bg-light rounded px-2 py-1 flex-grow-1">
              <div className="small"><span className="fw-semibold">{c.author?.name || 'User'}</span> <span className="text-muted">{new Date(c.createdAt).toLocaleString?.() || ''}</span></div>
              <div className="small">{c.text}</div>
              <button className="btn btn-link btn-sm p-0" style={{fontSize:'0.9em'}} onClick={()=>onReply(c._id)}>Reply</button>
              {replyingId === c._id && (
                <div className="d-flex align-items-center gap-2 mt-1">
                  <input className="form-control form-control-sm" style={{maxWidth:180}} placeholder="Write a reply..." value={replyText} onChange={onReplyText} onKeyDown={(e)=>{ if(e.key==='Enter')onSubmitReply(c._id); }} />
                  <button disabled={!replyText.trim()||submitting} className="btn btn-primary btn-sm" onClick={()=>onSubmitReply(c._id)}>Reply</button>
                </div>
              )}
            </div>
          </div>
          {c.replies && c.replies.length > 0 && (
            <CommentThread comments={c.replies} onReply={onReply} replyingId={replyingId} replyText={replyText} onReplyText={onReplyText} onSubmitReply={onSubmitReply} submitting={submitting}/>
          )}
        </div>
      ))}
    </div>
  );
}

function NotificationsCenter({ notifications, onClose, navigate, setNotifications, user, setUser, onOpenStatus }) {
  const handleNotificationClick = (n) => {
    if (n.type === 'status_message' && n.status) {
      // Open status viewer with the specific status
      const statusId = n.status?._id || n.status;
      if (statusId) {
        onOpenStatus?.(statusId);
        onClose();
      }
    } else if (n.post) {
      navigate(`/community/post/${n.post}`);
      onClose();
    } else if (n.actor && n.type !== 'friend_request') {
      navigate(`/profile?userId=${n.actor?._id || n.actor}`);
      onClose();
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-scrollable modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Notifications</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {notifications.length === 0 && <div className="text-muted small">No notifications</div>}
            <div className="d-flex flex-column gap-2">
              {notifications.map(n => (
                <div key={n._id} className="d-flex align-items-start gap-2 border rounded p-2" style={{ cursor: 'pointer' }} onClick={() => handleNotificationClick(n)}>
                  <img className="rounded-circle" style={{ width: 36, height: 36, objectFit:'cover', cursor:'pointer' }}
                       onClick={(e) => { e.stopPropagation(); navigate(`/profile?userId=${n.actor?._id || n.actor}`); }}
                       src={n.actor?.profilePicture ? `http://localhost:3000/${n.actor.profilePicture}` : '/default-avatar.png'} />
                  <div className="small flex-grow-1">
                    <span className="fw-semibold" onClick={(e) => { e.stopPropagation(); navigate(`/profile?userId=${n.actor?._id || n.actor}`); }} style={{ cursor: 'pointer' }}>{n.actor?.name || 'Someone'}</span> {n.message}
                    <div className="text-muted xsmall">{new Date(n.createdAt).toLocaleString?.() || ''}</div>
                    {n.type === 'status_message' && (
                      <div className="text-primary xsmall mt-1">Click to view status</div>
                    )}
                  </div>
                  {n.type === 'friend_request' && (
                    <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-sm btn-success"
                        onClick={async()=>{
                          try {
                            await apiAcceptFriendRequest(n.actor?._id || n.actor);
                            if (typeof setUser === 'function') {
                              setUser(prev => prev ? { ...prev, friends: Array.from(new Set([...(prev.friends||[]), (n.actor?._id || n.actor)])), friendRequests: (prev.friendRequests||[]).filter(id => id !== (n.actor?._id || n.actor)) } : prev);
                            }
                            setNotifications(old => old.filter(x => x._id !== n._id));
                          } catch {}
                        }}>Approve</button>
                      <button className="btn btn-sm btn-outline-secondary"
                        onClick={async()=>{
                          try {
                            await apiDeclineFriendRequest(n.actor?._id || n.actor);
                            if (typeof setUser === 'function') {
                              setUser(prev => prev ? { ...prev, friendRequests: (prev.friendRequests||[]).filter(id => id !== (n.actor?._id || n.actor)) } : prev);
                            }
                            setNotifications(old => old.filter(x => x._id !== n._id));
                          } catch {}
                        }}>Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Community() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showNotificationsCenter, setShowNotificationsCenter] = useState(false);
  const statusGroups = useMemo(() => {
    const map = new Map();
    statuses.forEach(s => {
      const key = s.author?._id || 'unknown';
      if (!map.has(key)) map.set(key, { user: s.author, items: [] });
      map.get(key).items.push(s);
    });
    return Array.from(map.values());
  }, [statuses]);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(-1);
  const [initialStatusId, setInitialStatusId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [topCreators, setTopCreators] = useState([]);
  const [fabOpen, setFabOpen] = useState(false);
  const [fabBellOpen, setFabBellOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [trendingTags, setTrendingTags] = useState([]);
  const [loadingTrendingTags, setLoadingTrendingTags] = useState(true);
  const [loadingTopCreators, setLoadingTopCreators] = useState(true);
  const [loadingStatuses, setLoadingStatuses] = useState(true);
  const [hashtagFilter, setHashtagFilter] = useState("");
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showGroupPreview, setShowGroupPreview] = useState(false);
  const [selectedGroupForPreview, setSelectedGroupForPreview] = useState(null);

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
        setLoadingStatuses(true);
        const res = await apiListStatuses();
        setStatuses(Array.isArray(res.data) ? res.data : []);
      } catch {}
      finally {
        setLoadingStatuses(false);
      }
    })();
  }, []);
  useEffect(() => {
    (async () => {
      try {
        setLoadingTopCreators(true);
        const { data } = await getTopCreators();
        setTopCreators(data || []);
      } catch {}
      finally {
        setLoadingTopCreators(false);
      }
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

  useEffect(() => {
    (async () => {
      try {
        setLoadingTrendingTags(true);
        const res = await apiTrendingHashtags();
        setTrendingTags(Array.isArray(res.data) ? res.data : []);
      } catch {}
      finally {
        setLoadingTrendingTags(false);
      }
    })();
  }, []);

  // Load groups
  useEffect(() => {
    (async () => {
      try {
        setLoadingGroups(true);
        const [allGroups, myGroupsRes] = await Promise.all([
          listGroups(),
          listGroups().then(() => ({ data: [] })).catch(() => ({ data: [] })), // Will use getMyGroups later
        ]);
        setGroups(Array.isArray(allGroups.data) ? allGroups.data : []);
        // For now, filter groups where user is a member
        if (user?._id) {
          const myGroupsList = allGroups.data?.filter(g => 
            g.members?.some(m => (m._id || m) === user._id) || 
            g.admin?._id === user._id || 
            (typeof g.admin === 'string' && g.admin === user._id)
          ) || [];
          setMyGroups(myGroupsList);
        }
      } catch {}
      finally {
        setLoadingGroups(false);
      }
    })();
  }, [user]);

  const handlePrependPost = (p) => {
    setPosts((old) => [p, ...old]);
  };

  const handleToggleLike = async (post) => {
    try {
      const { data } = await toggleLike(post._id);
      setPosts((old) => old.map((x) => (x._id === data._id ? data : x)));
    } catch {}
  };

  // In Community, update handleAddComment to return data so PostCard gets response
  const handleAddComment = async (post, text, reset, parentCommentId, helpers = {}) => {
    // This function is now ONLY called by PostCard, which has its own state. Manage errors/submitting there.
    if (!text.trim()) return;
    try {
      const { data } = await addComment(post._id, text, parentCommentId);
      setPosts((old) => old.map(x => (x._id === data._id ? data : x)));
      reset && reset();
      return { data };
    } catch (e) {
      if (helpers.setCommentError) helpers.setCommentError(e?.response?.data?.message || "Failed to send comment");
      throw e;
    }
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
              {loadingTrendingTags ? (
                <HashtagSkeleton />
              ) : (
                <>
                  <div className="d-flex flex-wrap gap-2">
                    {trendingTags.map(t => (
                      <span key={t.tag} role="button" tabIndex={0} style={{ cursor: "pointer", background: hashtagFilter === t.tag ? "#17a2b8" : undefined, color: hashtagFilter === t.tag ? "#fff" : undefined }} onClick={()=>setHashtagFilter(t.tag)} className="badge bg-light text-dark border fw-normal px-3 py-2">#{t.tag}</span>
                    ))}
                  </div>
                  {hashtagFilter && <button className="btn btn-sm btn-link px-0 ms-1 mt-1" onClick={()=>setHashtagFilter("")}>Clear hashtag filter</button>}
                </>
              )}
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-body">
              <div className="fw-bold mb-2 d-flex align-items-center gap-2"><FiUsers/> People to follow</div>
              {loadingTopCreators ? (
                <div className="d-flex flex-column gap-2">
                  {[1, 2, 3].map(i => <UserCardSkeleton key={i} />)}
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {topCreators.map(tc => {
                  const uid = tc.user?._id;
                  const isSelf = user?._id === uid;
                  const isFriend = Boolean(user?.friends?.includes(uid));
                  const isRequested = Boolean(user?.sentRequests?.includes(uid));
                  const handleAddFriend = async () => {
                    try {
                      await apiSendFriendRequest(uid);
                      if (typeof setUser === 'function') {
                        setUser(prev => prev ? { ...prev, sentRequests: Array.from(new Set([...(prev.sentRequests||[]), uid])) } : prev);
                      }
                    } catch {}
                  };
                  const openProfile = () => navigate(`/profile?userId=${uid}`);
                  return (
                    <div key={uid} className="d-flex align-items-center gap-2">
                      <img onClick={openProfile} style={{cursor:'pointer'}} className="rounded-circle comm-avatar" src={tc.user?.profilePicture ? `http://localhost:3000/${tc.user.profilePicture}` : '/default-avatar.png'} alt={tc.user?.name || 'User'} />
                      <div className="flex-grow-1" onClick={openProfile} style={{cursor:'pointer'}}>
                        <div className="small fw-semibold">{tc.user?.name}{isSelf ? ' (You)' : ''}</div>
                        <div className="xsmall text-muted">{tc.totalLikes} likes • {tc.posts} posts</div>
                      </div>
                      {(isFriend || isSelf) ? (
                        <button className="btn btn-sm btn-outline-secondary" onClick={openProfile}>View</button>
                      ) : isRequested ? (
                        <button className="btn btn-sm btn-outline-secondary" disabled>Requested</button>
                      ) : (
                        <button className="btn btn-sm btn-outline-primary" onClick={handleAddFriend}>Add Friend</button>
                      )}
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Feed */}
        <div className="col-12 col-lg-6">
          {loadingStatuses ? (
            <StatusBarSkeleton />
          ) : (
            <StatusBar 
              currentUser={user}
              groups={statusGroups.filter(g => {
                if (!user) return false;
                if (!g.user?._id) return false;
                // show only friend's OR own statuses
                return g.user._id === user._id || (user.friends && user.friends.includes(g.user._id));
              })}
              onClickGroup={(idx)=> setViewerGroupIndex(idx)}
              onAddRequested={()=> setShowStatusModal(true)}
            />
          )}
          <CreatePostBar onPost={handlePrependPost} currentUser={user} onStatusCreated={(s)=> setStatuses(old=>[s, ...old])} onOpenStatusModal={()=> setShowStatusModal(true)} onGroups={myGroups} />
          {loading ? (
            <>
              {[1, 2, 3].map(i => <PostCardSkeleton key={i} />)}
            </>
          ) : (
            <>
              {error && <div className="alert alert-danger">{error}</div>}
              {posts.length === 0 && (
                <div className="text-center text-muted small py-4">No posts yet. Be the first to share!</div>
              )}
              {posts.filter(post => {
            if (hashtagFilter && !(Array.isArray(post.hashtags) && post.hashtags.includes(hashtagFilter))) return false;
            if (selectedGroupId && post.group?._id !== selectedGroupId) return false; // When a group is selected, show only posts from that group
            if (!user || !post.author?._id) return false;
            const isMine = post.author._id === user._id;
            const isFriend = user.friends && user.friends.includes(post.author._id);
            
            // If post belongs to a group
            if (post.group) {
              // For group posts, check if user is a member of the group
              const group = groups.find(g => g._id === post.group?._id || g._id === post.group);
              if (group) {
                const isMember = group.members?.some(m => (m._id || m) === user._id) || group.admin?._id === user._id || (typeof group.admin === 'string' && group.admin === user._id);
                return isMember; // Show group posts if user is a member
              }
              return false; // Don't show if group not found
            }
            
            // For non-group posts, apply privacy settings
            if (post.privacy === 'public') return isMine || isFriend;
            if (post.privacy === 'friends') return isMine || isFriend;
            return isMine || isFriend;
          }).map((p) => (
            <PostCard 
              key={p._id} 
              post={p} 
              onToggleLike={handleToggleLike} 
              onAddComment={handleAddComment} 
              onHashtagClick={setHashtagFilter}
              onPostUpdate={(updatedPost) => {
                setPosts(old => old.map(x => x._id === updatedPost._id ? updatedPost : x));
              }}
              onPostDelete={(postId) => {
                setPosts(old => old.filter(x => x._id !== postId));
              }}
            />
          ))}
            </>
          )}
        </div>

        {/* Right sidebar */}
        <div className="col-12 col-lg-3">
          <div className="community-sticky">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <div className="fw-bold mb-2 d-flex align-items-center justify-content-between">
                <span><FiUsers className="me-2" />Groups</span>
                <button className="btn btn-sm btn-primary" onClick={() => setShowCreateGroupModal(true)}>
                  <FiPlus /> Create
                </button>
              </div>
              {loadingGroups ? (
                <div className="d-flex flex-column gap-2">
                  {[1, 2, 3].map(i => <GroupCardSkeleton key={i} />)}
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {groups.slice(0, 5).map((g) => {
                    // Robust membership check - handle both populated objects and IDs
                    const userIdStr = user?._id ? String(user._id) : null;
                    const adminId = g.admin?._id || g.admin;
                    const adminIdStr = adminId ? String(adminId) : null;
                    
                    const isAdmin = userIdStr && adminIdStr === userIdStr;
                    const isMember = isAdmin || (userIdStr && g.members?.some(m => {
                      const memberId = m?._id || m;
                      return memberId ? String(memberId) === userIdStr : false;
                    }) || false);
                    
                    const hasRequested = userIdStr && (g.pendingRequests?.some(r => {
                      const reqId = r?._id || r;
                      return reqId ? String(reqId) === userIdStr : false;
                    }) || false);
                    
                    const handleGroupClick = () => {
                      // If user is a member or admin, navigate directly to group page
                      if (isMember) {
                        navigate(`/group/${g._id}`);
                      } else {
                        // If not a member, show preview modal
                        setSelectedGroupForPreview(g);
                        setShowGroupPreview(true);
                      }
                    };

                    const handleJoinLeave = async (e) => {
                      e.stopPropagation(); // Prevent group click
                      try {
                        if (isMember) {
                          await leaveGroup(g._id);
                          setGroups(groups.map(gr => gr._id === g._id ? { ...gr, members: gr.members?.filter(m => (m._id || m) !== user._id) || [] } : gr));
                          setMyGroups(myGroups.filter(gr => gr._id !== g._id));
                        } else {
                          await joinGroup(g._id);
                          setGroups(groups.map(gr => gr._id === g._id ? { ...gr, members: [...(gr.members || []), user._id] } : gr));
                          setMyGroups([...myGroups, g]);
                          // If public group, navigate after joining
                          if (g.privacy === 'public') {
                            navigate(`/group/${g._id}`);
                          }
                        }
                      } catch (e) {
                        alert(e?.response?.data?.message || "Failed to update group membership");
                      }
                    };

                    return (
                      <div key={g._id} className="d-flex align-items-center justify-content-between">
                        <div className="flex-grow-1" style={{ cursor: 'pointer' }} onClick={handleGroupClick}>
                          <div className="small fw-semibold">{g.name}</div>
                          <div className="xsmall text-muted">{g.members?.length || 0} members</div>
                        </div>
                        <button className="btn btn-sm btn-outline-primary" onClick={handleJoinLeave}>
                          {isMember ? 'Leave' : 'Join'}
                        </button>
                      </div>
                    );
                  })}
                  {groups.length === 0 && <div className="text-muted xsmall">No groups yet</div>}
                </div>
              )}
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
    {showNotificationsCenter && (
      <NotificationsCenter
        notifications={notifications}
        onClose={() => setShowNotificationsCenter(false)}
        navigate={navigate}
        setNotifications={setNotifications}
        user={user}
        setUser={setUser}
        onOpenStatus={handleOpenStatusFromNotification}
      />
    )}
    {showStatusModal && (
      <CreateStatusModal currentUser={user} onCreated={(s)=> { setStatuses(old=>[s, ...old]); setShowStatusModal(false); }} onClose={()=> setShowStatusModal(false)} />
    )}
    {viewerGroupIndex >= 0 && statusGroups.length > 0 && (
      <StatusViewerModal 
        groups={statusGroups} 
        groupIndex={viewerGroupIndex} 
        onChangeGroup={(idx)=> {
          setViewerGroupIndex(idx);
          setInitialStatusId(null); // Clear initial status when changing groups manually
        }} 
        onClose={()=> {
          setViewerGroupIndex(-1);
          setInitialStatusId(null);
        }} 
        currentUser={user}
        initialStatusId={initialStatusId}
        onStatusUpdate={(updatedStatus) => {
          // Update the status in statuses array
          setStatuses(old => old.map(s => s._id === updatedStatus._id ? updatedStatus : s));
        }}
      />
    )}
    {showCreateGroupModal && (
      <CreateGroupModal 
        currentUser={user} 
        onCreated={(group) => {
          setGroups([group, ...groups]);
          setMyGroups([group, ...myGroups]);
          setShowCreateGroupModal(false);
        }} 
        onClose={() => setShowCreateGroupModal(false)} 
      />
    )}
    {showGroupPreview && selectedGroupForPreview && (
      <GroupPreviewModal
        group={selectedGroupForPreview}
        user={user}
        onClose={() => {
          setShowGroupPreview(false);
          setSelectedGroupForPreview(null);
        }}
        onJoinRequest={async () => {
          try {
            await joinGroup(selectedGroupForPreview._id);
            // Update groups state
            setGroups(groups.map(g => {
              if (g._id === selectedGroupForPreview._id) {
                if (selectedGroupForPreview.privacy === 'public') {
                  return { ...g, members: [...(g.members || []), user._id] };
                } else {
                  return { ...g, pendingRequests: [...(g.pendingRequests || []), user._id] };
                }
              }
              return g;
            }));
            // If public group, navigate to group page after joining
            if (selectedGroupForPreview.privacy === 'public') {
              navigate(`/group/${selectedGroupForPreview._id}`);
            } else {
              setShowGroupPreview(false);
              setSelectedGroupForPreview(null);
            }
          } catch (err) {
            alert(err?.response?.data?.message || "Failed to join group");
          }
        }}
        isJoining={false}
      />
    )}
      {/* Floating FAB menu */}
      <div className="fab-container">
        {fabBellOpen && (
          <div className="fab-dropdown">
            <div className="fw-semibold small p-1 border-bottom d-flex align-items-center justify-content-between">
              <span>Notifications</span>
              <button className="btn btn-link btn-sm" onClick={()=> setShowNotificationsCenter(true)}>Open center</button>
            </div>
            <div className="d-flex flex-column gap-2 p-1">
              {notifications.slice(0,6).map(n => {
                const handleNotificationClick = () => {
                  if (n.type === 'status_message' && n.status) {
                    const statusId = n.status?._id || n.status;
                    if (statusId) {
                      // Find which group contains this status
                      const status = statuses.find(s => (s._id || s) === statusId);
                      if (status) {
                        const groupIdx = statusGroups.findIndex(g => (g.user?._id || g.user) === (status.author?._id || status.author));
                        if (groupIdx >= 0) {
                          setViewerGroupIndex(groupIdx);
                          setInitialStatusId(statusId);
                          setFabBellOpen(false);
                        }
                      }
                    }
                  } else if (n.post) {
                    navigate(`/community/post/${n.post}`);
                    setFabBellOpen(false);
                  } else if (n.actor && n.type !== 'friend_request') {
                    navigate(`/profile?userId=${n.actor?._id || n.actor}`);
                    setFabBellOpen(false);
                  }
                };

                return (
                  <div key={n._id} className="d-flex align-items-start gap-2" style={{ cursor: 'pointer' }} onClick={handleNotificationClick}>
                    <img className="rounded-circle" style={{ width: 28, height: 28, objectFit:'cover', cursor:'pointer' }}
                         onClick={(e) => { e.stopPropagation(); navigate(`/profile?userId=${n.actor?._id || n.actor}`); }}
                         src={n.actor?.profilePicture ? `http://localhost:3000/${n.actor.profilePicture}` : '/default-avatar.png'} />
                    <div className="small flex-grow-1">
                      <span className="fw-semibold" onClick={(e) => { e.stopPropagation(); navigate(`/profile?userId=${n.actor?._id || n.actor}`); }} style={{ cursor: 'pointer' }}>{n.actor?.name || 'Someone'}</span> {n.message}
                      {n.type === 'status_message' && (
                        <div className="text-primary xsmall mt-1">Click to view status</div>
                      )}
                    </div>
                    {n.type === 'friend_request' && (
                      <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-sm btn-success"
                          onClick={async()=>{
                            try {
                              await apiAcceptFriendRequest(n.actor?._id || n.actor);
                              if (typeof setUser === 'function') {
                                setUser(prev => prev ? { ...prev, friends: Array.from(new Set([...(prev.friends||[]), (n.actor?._id || n.actor)])), friendRequests: (prev.friendRequests||[]).filter(id => id !== (n.actor?._id || n.actor)) } : prev);
                              }
                              // remove notification locally
                              setNotifications(old => old.filter(x => x._id !== n._id));
                            } catch {}
                          }}>Approve</button>
                        <button className="btn btn-sm btn-outline-secondary"
                          onClick={async()=>{
                            try {
                              await apiDeclineFriendRequest(n.actor?._id || n.actor);
                              if (typeof setUser === 'function') {
                                setUser(prev => prev ? { ...prev, friendRequests: (prev.friendRequests||[]).filter(id => id !== (n.actor?._id || n.actor)) } : prev);
                              }
                              setNotifications(old => old.filter(x => x._id !== n._id));
                            } catch {}
                          }}>Reject</button>
                      </div>
                    )}
                  </div>
                );
              })}
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


