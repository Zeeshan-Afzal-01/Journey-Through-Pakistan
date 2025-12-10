import React, { useEffect, useMemo, useState, useRef } from "react";
import { FiCamera, FiHeart, FiMessageSquare, FiShare2, FiMoreHorizontal, FiEdit2, FiUserPlus, FiUsers, FiImage, FiUser, FiMail, FiMapPin, FiCalendar, FiGlobe, FiLock, FiMessageCircle, FiCheck, FiX } from "react-icons/fi";
import { MdPhotoCamera } from "react-icons/md";
import "../assests/css/profile.css";
import { AuthContext } from "../context/AuthContext";
import { useContext } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import api from "../api/api.jsx";
import { listPostsByAuthor, toggleLike, addComment, updatePost, deletePost, toggleSavePost } from "../api/postsApi.jsx";
import { listGroups } from "../api/groupsApi.jsx";
import { updateMe as apiUpdateMe } from "../api/authApi.jsx";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  unfriend,
  getFriends
} from "../api/authApi.jsx";
import { ProfileSkeleton, PostCardSkeleton } from '../components/SkeletonLoader.jsx';
import "../assests/css/skeleton.css";

// PostCard component (reused from Community.jsx structure)
function PostCard({ post, onToggleLike, onAddComment, onPostUpdate, onPostDelete, currentUser, onPostSave }) {
  const likeCount = post.likes?.length || 0;
  const commentCount = post.comments?.length || 0;
  const time = new Date(post.createdAt).toLocaleString();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const isGif = post.imageUrl && /\.gif($|\?)/i.test(post.imageUrl);
  const hasLiked = post.likes && currentUser && post.likes.some(u => (u._id || u) === (currentUser._id || currentUser.id));
  const isAuthor = currentUser && (post.author?._id === currentUser._id || post.author?._id === currentUser.id);

  useEffect(() => {
    if (currentUser?.savedPosts && post?._id) {
      const saved = currentUser.savedPosts.some(id => {
        const savedId = typeof id === 'string' ? id : id._id || id;
        const postId = typeof post._id === 'string' ? post._id : post._id.toString();
        return savedId === postId || String(savedId) === String(postId);
      });
      setIsSaved(saved);
    }
  }, [currentUser?.savedPosts, post?._id]);

  const handleSave = async () => {
    if (saving || !post?._id) return;
    setSaving(true);
    try {
      await toggleSavePost(post._id);
      setIsSaved(!isSaved);
      if (onPostSave) {
        onPostSave(post._id, !isSaved);
      }
    } catch (err) {
      console.error('Failed to save post', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLocalAddComment = async (p, text, reset, parentCommentId) => {
    setCommentError("");
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await onAddComment(p, text, reset, parentCommentId, { setSubmitting, setCommentError });
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
      console.error(err?.response?.data?.message || "Failed to delete post");
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
    setShowOptionsMenu(false);
  };

  const renderWithHashtags = (text) => {
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
      segments.push(<span key={match.index} style={{ color: '#1877f2', cursor: 'pointer' }}>{tag}</span>);
      lastIndex = match.index + fullMatch.length;
    }
    if (lastIndex < text.length) {
      segments.push(text.slice(lastIndex));
    }
    return hasMatches ? segments : text;
  };

  return (
    <div className="card shadow-sm mb-3 post-card">
      <div className="card-body p-3">
        <div className="d-flex align-items-center gap-2 mb-2 position-relative">
          <img 
            className="rounded-circle" 
            src={
              post.author?.hasProfilePicture && post.author?.profilePicture 
                ? `http://localhost:3000/${post.author.profilePicture}` 
                : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
            } 
            alt={post.author?.name || "User"}
            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
          />
          <div className="flex-grow-1">
            <div className="fw-semibold small">{post.author?.name || "Unknown"}</div>
            <div className="text-muted xsmall">
              {time} • {post.author?.city || "Pakistan"}
            </div>
          </div>
          {isAuthor && (
            <div className="position-relative">
              <button 
                className="btn btn-link p-0 text-muted"
                onClick={() => setShowOptionsMenu(!showOptionsMenu)}
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
                    style={{ right: 0, top: '100%', zIndex: 1050, minWidth: '160px' }}
                  >
                    <button 
                      className="btn btn-sm btn-link text-start w-100 text-decoration-none d-flex align-items-center gap-2"
                      onClick={handleEdit}
                    >
                      <FiEdit2 size={16} /> Edit Post
                    </button>
                    <button 
                      className="btn btn-sm btn-link text-start w-100 text-decoration-none d-flex align-items-center gap-2 text-danger"
                      onClick={handleDelete}
                    >
                      <FiX size={16} /> Delete Post
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <p className="mb-2">{renderWithHashtags(post.text)}</p>
        {post.imageUrl && (
          <div className="rounded overflow-hidden mb-2">
            <Link to={`/community/post/${post._id}`}>
              <img 
                style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'cover' }} 
                src={post.imageUrl.startsWith('http') ? post.imageUrl : `http://localhost:3000/${post.imageUrl}`} 
                alt="post" 
              />
            </Link>
          </div>
        )}
        <div className="d-flex justify-content-between align-items-center text-muted small pt-2 border-top">
          <button 
            className="btn btn-link p-0 text-muted text-decoration-none d-flex align-items-center gap-1"
            onClick={() => onToggleLike(post)}
          >
            <FiHeart color={hasLiked ? '#dc3545' : undefined} fill={hasLiked ? '#dc3545' : 'none'} /> {likeCount}
          </button>
          <button 
            className="btn btn-link p-0 text-muted text-decoration-none d-flex align-items-center gap-1"
            onClick={() => setShowComments(!showComments)}
          >
            <FiMessageSquare /> {commentCount}
          </button>
          <button 
            className="btn btn-link p-0 text-muted text-decoration-none"
            onClick={handleSave}
            disabled={saving}
          >
            <FiHeart /> {isSaved ? 'Saved' : 'Save'}
          </button>
        </div>
        {showComments && (
          <div className="mt-3 pt-3 border-top">
            <div className="input-group input-group-sm mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    handleLocalAddComment(post, commentText, () => setCommentText(""), null);
                  }
                }}
              />
              <button 
                className="btn btn-primary"
                onClick={() => handleLocalAddComment(post, commentText, () => setCommentText(""), null)}
                disabled={!commentText.trim() || submitting}
              >
                Post
              </button>
            </div>
            {commentError && <div className="text-danger small mb-2">{commentError}</div>}
            <div className="d-flex flex-column gap-2">
              {(post.comments || []).slice(0, 5).map((c) => (
                <div key={c._id} className="d-flex gap-2">
                  <img 
                    className="rounded-circle"
                    src={
                      c.author?.hasProfilePicture && c.author?.profilePicture 
                        ? `http://localhost:3000/${c.author.profilePicture}` 
                        : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                    }
                    alt={c.author?.name || "User"}
                    style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                  />
                  <div className="flex-grow-1">
                    <div className="fw-semibold small">{c.author?.name || "Unknown"}</div>
                    <div className="text-muted">{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [otherUser, setOtherUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [filteredUserPosts, setFilteredUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [userFriends, setUserFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [editingField, setEditingField] = useState(null); // 'name', 'bio', 'city', or null
  const [editFormData, setEditFormData] = useState({ name: '', city: '', bio: '' });
  const [uploadingEdit, setUploadingEdit] = useState(false);
  const coverPhotoInputRef = useRef(null);
  const profilePicInputRef = useRef(null);

  // Friend request state logic
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const isMe = !otherUser || user?._id === otherUser?._id;
  const isFriend = user?.friends?.some(f => {
    const friendId = typeof f === 'string' ? f : f._id || f;
    return friendId === otherUser?._id;
  });
  // Check if profile is private and if user can view content
  const viewingUser = otherUser || user;
  const isProfilePrivate = viewingUser?.isProfilePrivate || false;
  const canViewContent = isMe || isFriend || !isProfilePrivate; // Can view if: own profile, friend, or public profile
  const requestSent = user?.sentRequests?.some(f => {
    const reqId = typeof f === 'string' ? f : f._id || f;
    return reqId === otherUser?._id;
  });
  const requestReceived = user?.friendRequests?.some(f => {
    const reqId = typeof f === 'string' ? f : f._id || f;
    return reqId === otherUser?._id;
  });

  const handleAddFriend = async () => {
    setFriendActionLoading(true);
    try {
      await sendFriendRequest(otherUser._id);
      setOtherUser({ ...otherUser });
      if (user.sentRequests) user.sentRequests.push(otherUser._id);
      window.location.reload(); // Refresh to update state
    } finally { 
      setFriendActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    setFriendActionLoading(true);
    try {
      await cancelFriendRequest(otherUser._id);
      if (user.sentRequests) user.sentRequests = user.sentRequests.filter(id => id !== otherUser._id);
      window.location.reload();
    } finally { 
      setFriendActionLoading(false);
    }
  };

  const handleAccept = async () => {
    setFriendActionLoading(true);
    try {
      await acceptFriendRequest(otherUser._id);
      window.location.reload();
    } finally { 
      setFriendActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setFriendActionLoading(true);
    try {
      await declineFriendRequest(otherUser._id);
      window.location.reload();
    } finally { 
      setFriendActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    setFriendActionLoading(true);
    try {
      await unfriend(otherUser._id);
      window.location.reload();
    } finally { 
      setFriendActionLoading(false);
    }
  };

  const queryUserId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('userId');
  }, [location.search]);

  useEffect(() => {
    const load = async () => {
      if (queryUserId && (!user || user._id !== queryUserId)) {
        try {
          setLoadingUser(true);
          const res = await api.get(`/users/${queryUserId}`);
          setOtherUser(res.data);
        } catch {}
        finally {
          setLoadingUser(false);
        }
      } else {
        setOtherUser(null);
        setLoadingUser(false);
      }
    };
    load();
  }, [queryUserId, user]);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user?._id) return;
      try {
        const res = await listGroups();
        setGroups(Array.isArray(res.data) ? res.data : []);
      } catch {}
    };
    fetchGroups();
  }, [user]);

  useEffect(() => {
    const fetchPosts = async () => {
      const targetId = otherUser?._id || user?._id;
      if (!targetId) return;
      // Only fetch posts if can view content (own profile, friend, or public profile)
      if (!canViewContent) {
        setUserPosts([]);
        setFilteredUserPosts([]);
        setLoadingPosts(false);
        return;
      }
      try {
        setLoadingPosts(true);
        const res = await listPostsByAuthor(targetId);
        const allPosts = Array.isArray(res.data) ? res.data : [];
        setUserPosts(allPosts);
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchPosts();
  }, [otherUser, user, isMe, isFriend, canViewContent]);

  useEffect(() => {
    if (!user?._id || isMe) {
      setFilteredUserPosts(userPosts);
      return;
    }

    const filtered = userPosts.filter(post => {
      if (!post.group) return true;
      const groupId = post.group._id || post.group;
      const group = groups.find(g => g._id === groupId);
      if (!group) return false;
      const isMember = group.members?.some(m => (m._id || m) === user._id) || 
                      group.admin?._id === user._id || 
                      (typeof group.admin === 'string' && group.admin === user._id);
      return isMember;
    });

    setFilteredUserPosts(filtered);
  }, [userPosts, groups, user, isMe]);

  // Fetch user's friends - only if can view content
  useEffect(() => {
    const fetchUserFriends = async () => {
      const targetId = otherUser?._id || user?._id;
      if (!targetId) return;
      // Only fetch friends if can view content (own profile, friend, or public profile)
      if (!canViewContent) {
        setUserFriends([]);
        setLoadingFriends(false);
        return;
      }
      try {
        setLoadingFriends(true);
        if (isMe) {
          const res = await getFriends();
          setUserFriends(Array.isArray(res.data) ? res.data : []);
        } else if (isFriend && otherUser?.friends) {
          setUserFriends(otherUser.friends || []);
        }
      } catch (err) {
        console.error('Error fetching friends:', err);
      } finally {
        setLoadingFriends(false);
      }
    };
    fetchUserFriends();
  }, [otherUser, user, isMe, isFriend, canViewContent]);

  // No need to force 'about' tab - let users see all tabs but show private message when needed
  const profilePicture = (viewingUser?.hasProfilePicture && viewingUser?.profilePicture) 
    ? `http://localhost:3000/${viewingUser.profilePicture}` 
    : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
  const coverPhoto = viewingUser?.coverPhoto ? `http://localhost:3000/${viewingUser.coverPhoto}` : "https://placehold.co/1200x400/1877f2/ffffff?text=Cover+Photo";

  const handleChangePicture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPic(true);
      const res = await apiUpdateMe({ profilePicture: file });
      if (res?.data?.user) {
        if (setUser) setUser(res.data.user);
        if (otherUser && otherUser._id === user?._id) {
          setOtherUser(res.data.user);
        }
      }
    } finally {
      setUploadingPic(false);
    }
  };

  const handleChangeCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCover(true);
      const res = await apiUpdateMe({ coverPhoto: file });
      if (res?.data?.user) {
        if (setUser) setUser(res.data.user);
        if (otherUser && otherUser._id === user?._id) {
          setOtherUser(res.data.user);
        }
      }
    } finally {
      setUploadingCover(false);
    }
  };

  const handleEditField = (field) => {
    setEditFormData({
      ...editFormData,
      [field]: viewingUser?.[field] || ''
    });
    setEditingField(field);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditFormData({ name: '', city: '', bio: '' });
  };

  const handleSaveField = async (field) => {
    try {
      setUploadingEdit(true);
      const dataToSave = { [field]: editFormData[field] };
      const res = await apiUpdateMe(dataToSave);
      if (res?.data?.user) {
        if (setUser) setUser(res.data.user);
        if (otherUser && otherUser._id === user?._id) {
          setOtherUser(res.data.user);
        }
        setEditingField(null);
        setEditFormData({ name: '', city: '', bio: '' });
      }
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setUploadingEdit(false);
    }
  };

  // Get photos from posts
  const userPhotos = useMemo(() => {
    return filteredUserPosts
      .filter(post => post.imageUrl)
      .map(post => ({
        id: post._id,
        url: post.imageUrl.startsWith('http') ? post.imageUrl : `http://localhost:3000/${post.imageUrl}`,
        text: post.text,
        createdAt: post.createdAt
      }));
  }, [filteredUserPosts]);

  const handleToggleLike = async (post) => {
    try {
      const { data } = await toggleLike(post._id);
      setUserPosts(userPosts.map(p => p._id === data._id ? data : p));
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleAddComment = async (post, text, reset, parentCommentId) => {
    try {
      const { data } = await addComment(post._id, text, parentCommentId);
      setUserPosts(userPosts.map(p => p._id === data._id ? data : p));
      if (reset) reset();
      return { data };
    } catch (err) {
      throw err;
    }
  };

  const handlePostDelete = (postId) => {
    setUserPosts(userPosts.filter(p => p._id !== postId));
  };

  const handlePostSave = (postId, saved) => {
    // Update user's savedPosts in context if needed
  };

  if (loadingUser) {
    return (
      <div className="container-fluid profile-page">
        <ProfileSkeleton />
      </div>
    );
  }

  return (
    <div className="container-fluid profile-page p-0" style={{ backgroundColor: '#f0f2f5' }}>
      {/* Cover Photo Section */}
      <div className="position-relative" style={{ height: '400px', backgroundColor: '#e4e6eb' }}>
        <img 
          src={coverPhoto} 
          alt="Cover" 
          className="w-100 h-100"
          style={{ objectFit: 'cover' }}
        />
        {isMe && (
          <div className="position-absolute bottom-0 end-0 m-3">
            <input 
              ref={coverPhotoInputRef}
              type="file" 
              accept="image/*" 
              className="d-none" 
              onChange={handleChangeCover} 
            />
            <button 
              className="btn btn-light rounded-pill d-flex align-items-center gap-2"
              onClick={() => coverPhotoInputRef.current?.click()}
              disabled={uploadingCover}
            >
              <MdPhotoCamera /> {uploadingCover ? 'Uploading...' : 'Edit Cover Photo'}
            </button>
          </div>
        )}
        
        {/* Profile Picture Overlay */}
        <div className="position-absolute" style={{ bottom: '-80px', left: '50%', transform: 'translateX(-50%)' }}>
          <div className="position-relative">
            <img 
              src={profilePicture} 
              alt="Profile" 
              className="rounded-circle border border-5 border-white"
              style={{ width: '168px', height: '168px', objectFit: 'cover' }}
            />
            {isMe && (
              <div 
                className="position-absolute" 
                style={{ 
                  bottom: '0', 
                  right: '0',
                  zIndex: 10
                }}
              >
                <input 
                  ref={profilePicInputRef}
                  type="file" 
                  accept="image/*" 
                  className="d-none" 
                  onChange={handleChangePicture} 
                />
                <button 
                  className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center"
                  style={{ 
                    width: '36px', 
                    height: '36px',
                    padding: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    border: '2px solid white'
                  }}
                  onClick={() => profilePicInputRef.current?.click()}
                  disabled={uploadingPic}
                  title="Edit Profile Picture"
                >
                  <FiCamera size={18} style={{ color: 'white' }} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info Section */}
      <div className="container-fluid px-4" style={{ paddingTop: '100px', paddingBottom: '16px' }}>
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-2 mb-2">
                  {editingField === 'name' && isMe ? (
                    <div className="d-flex align-items-center gap-2 flex-grow-1">
                      <input 
                        type="text"
                        className="form-control"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        placeholder="Enter your name"
                        style={{ fontSize: '24px', fontWeight: '700', padding: '4px 8px', border: '1px solid #1877f2' }}
                        autoFocus
                      />
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSaveField('name')}
                        disabled={uploadingEdit}
                        style={{ minWidth: '60px' }}
                      >
                        {uploadingEdit ? '...' : 'Save'}
                      </button>
                      <button 
                        className="btn btn-light btn-sm"
                        onClick={handleCancelEdit}
                        disabled={uploadingEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="d-flex align-items-center gap-2">
                        <h3 className="fw-bold mb-0" style={{ fontSize: '32px', color: '#050505' }}>{viewingUser?.name || "User"}</h3>
                        {!isMe && isProfilePrivate && (
                          <span className="badge bg-gradient-private rounded-pill px-3 py-1 d-flex align-items-center gap-1" style={{ fontSize: '12px', fontWeight: '600' }}>
                            <FiLock size={12} />
                            Private
                          </span>
                        )}
                        {isMe && (
                          <button 
                            className="btn btn-link p-1 text-decoration-none"
                            onClick={() => handleEditField('name')}
                            style={{ color: '#65676b', padding: '4px 8px' }}
                            title="Edit name"
                          >
                            <FiEdit2 size={16} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                {editingField === 'bio' && isMe ? (
                  <div className="mb-2">
                    <textarea 
                      className="form-control"
                      rows="2"
                      value={editFormData.bio}
                      onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                      placeholder="Tell people about yourself"
                      style={{ resize: 'none', fontSize: '15px', padding: '8px', border: '1px solid #1877f2' }}
                      autoFocus
                    />
                    <div className="d-flex gap-2 mt-2">
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSaveField('bio')}
                        disabled={uploadingEdit}
                        style={{ minWidth: '60px' }}
                      >
                        {uploadingEdit ? '...' : 'Save'}
                      </button>
                      <button 
                        className="btn btn-light btn-sm"
                        onClick={handleCancelEdit}
                        disabled={uploadingEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex align-items-start gap-2 mb-2">
                    <p className="text-muted mb-0" style={{ fontSize: '15px', color: '#65676b' }}>
                      {viewingUser?.bio || (isMe ? "No bio added yet" : "")}
                    </p>
                    {isMe && viewingUser?.bio && (
                      <button 
                        className="btn btn-link p-1 text-decoration-none"
                        onClick={() => handleEditField('bio')}
                        style={{ color: '#65676b', padding: '2px 4px', marginTop: '-2px' }}
                        title="Edit bio"
                      >
                        <FiEdit2 size={14} />
                      </button>
                    )}
                    {isMe && !viewingUser?.bio && (
                      <button 
                        className="btn btn-link p-0 text-decoration-none"
                        onClick={() => handleEditField('bio')}
                        style={{ color: '#1877f2', fontSize: '15px', padding: '0' }}
                      >
                        Add bio
                      </button>
                    )}
                  </div>
                )}
                
                <div className="d-flex align-items-center gap-3 text-muted" style={{ fontSize: '15px', color: '#65676b' }}>
                  {editingField === 'city' && isMe ? (
                    <div className="d-flex align-items-center gap-2">
                      <FiMapPin />
                      <input 
                        type="text"
                        className="form-control form-control-sm d-inline-block"
                        value={editFormData.city}
                        onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                        placeholder="Enter your city"
                        style={{ width: 'auto', minWidth: '200px', display: 'inline-block', border: '1px solid #1877f2' }}
                        autoFocus
                      />
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSaveField('city')}
                        disabled={uploadingEdit}
                        style={{ minWidth: '50px', padding: '2px 8px' }}
                      >
                        {uploadingEdit ? '...' : 'Save'}
                      </button>
                      <button 
                        className="btn btn-light btn-sm"
                        onClick={handleCancelEdit}
                        disabled={uploadingEdit}
                        style={{ padding: '2px 8px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      {viewingUser?.city && (
                        <span className="d-flex align-items-center gap-1">
                          <FiMapPin /> {viewingUser.city}
                          {isMe && (
                            <button 
                              className="btn btn-link p-0 text-decoration-none"
                              onClick={() => handleEditField('city')}
                              style={{ color: '#65676b', padding: '0', marginLeft: '4px' }}
                              title="Edit city"
                            >
                              <FiEdit2 size={12} />
                            </button>
                          )}
                        </span>
                      )}
                      {isMe && !viewingUser?.city && (
                        <button 
                          className="btn btn-link p-0 text-decoration-none d-flex align-items-center gap-1"
                          onClick={() => handleEditField('city')}
                          style={{ color: '#1877f2', fontSize: '15px' }}
                        >
                          <FiMapPin /> Add city
                        </button>
                      )}
                      {canViewContent && (
                        <span className="d-flex align-items-center gap-1">
                          <FiUsers /> {userFriends.length} friends
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="d-flex gap-2">
                {isMe ? (
                  <>
                    {/* No message button on own profile */}
                  </>
                ) : (
                  <>
                    {!isFriend && !requestSent && !requestReceived && (
                      <button 
                        className="btn btn-primary rounded-pill d-flex align-items-center gap-2"
                        onClick={handleAddFriend}
                        disabled={friendActionLoading}
                      >
                        <FiUserPlus /> Add Friend
                      </button>
                    )}
                    {requestSent && (
                      <button 
                        className="btn btn-outline-secondary rounded-pill"
                        onClick={handleCancelRequest}
                        disabled={friendActionLoading}
                      >
                        Request Sent
                      </button>
                    )}
                    {requestReceived && (
                      <>
                        <button 
                          className="btn btn-primary rounded-pill"
                          onClick={handleAccept}
                          disabled={friendActionLoading}
                        >
                          <FiCheck /> Accept
                        </button>
                        <button 
                          className="btn btn-outline-secondary rounded-pill"
                          onClick={handleDecline}
                          disabled={friendActionLoading}
                        >
                          <FiX /> Decline
                        </button>
                      </>
                    )}
                    {isFriend && (
                      <>
                        <Link 
                          to={`/chats?user=${otherUser._id}`} 
                          className="btn btn-primary rounded-pill d-flex align-items-center gap-2"
                        >
                          <FiMessageCircle /> Message
                        </Link>
                        <button 
                          className="btn btn-outline-secondary rounded-pill"
                          onClick={handleUnfriend}
                          disabled={friendActionLoading}
                        >
                          Unfriend
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-top pt-3">
              <div className="d-flex gap-4">
                <button 
                  className={`btn btn-link p-0 text-decoration-none ${activeTab === 'posts' ? 'border-bottom border-3 border-primary fw-bold' : 'text-muted'}`}
                  onClick={() => setActiveTab('posts')}
                  style={{ 
                    borderBottom: activeTab === 'posts' ? '3px solid #1877f2' : 'none',
                    paddingBottom: '12px',
                    color: activeTab === 'posts' ? '#1877f2' : '#65676b'
                  }}
                >
                  Posts
                </button>
                <button 
                  className={`btn btn-link p-0 text-decoration-none ${activeTab === 'about' ? 'border-bottom border-3 border-primary fw-bold' : 'text-muted'}`}
                  onClick={() => setActiveTab('about')}
                  style={{ 
                    borderBottom: activeTab === 'about' ? '3px solid #1877f2' : 'none',
                    paddingBottom: '12px',
                    color: activeTab === 'about' ? '#1877f2' : '#65676b'
                  }}
                >
                  About
                </button>
                <button 
                  className={`btn btn-link p-0 text-decoration-none ${activeTab === 'friends' ? 'border-bottom border-3 border-primary fw-bold' : 'text-muted'}`}
                  onClick={() => setActiveTab('friends')}
                  style={{ 
                    borderBottom: activeTab === 'friends' ? '3px solid #1877f2' : 'none',
                    paddingBottom: '12px',
                    color: activeTab === 'friends' ? '#1877f2' : '#65676b'
                  }}
                >
                  Friends
                </button>
                <button 
                  className={`btn btn-link p-0 text-decoration-none ${activeTab === 'photos' ? 'border-bottom border-3 border-primary fw-bold' : 'text-muted'}`}
                  onClick={() => setActiveTab('photos')}
                  style={{ 
                    borderBottom: activeTab === 'photos' ? '3px solid #1877f2' : 'none',
                    paddingBottom: '12px',
                    color: activeTab === 'photos' ? '#1877f2' : '#65676b'
                  }}
                >
                  Photos
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="container-fluid px-4 pb-4">
        <div className="row g-3">
          {/* Left Sidebar - Intro (only for friends or own profile) */}
          {canViewContent && (
            <div className="col-12 col-lg-3">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0" style={{ fontSize: '20px', color: '#050505' }}>Intro</h6>
                  </div>
                  <>
                    {/* Bio - show if can view content or if viewing own profile */}
                    {(canViewContent || isMe) && (
                      <>
                        {viewingUser?.bio ? (
                          <div className="d-flex align-items-start gap-2 mb-3">
                            <p className="small mb-0" style={{ fontSize: '15px', color: '#050505' }}>{viewingUser.bio}</p>
                            {isMe && (
                              <button 
                                className="btn btn-link p-0 text-decoration-none"
                                onClick={() => handleEditField('bio')}
                                style={{ color: '#65676b', padding: '2px 4px', marginTop: '-2px' }}
                                title="Edit bio"
                              >
                                <FiEdit2 size={14} />
                              </button>
                            )}
                          </div>
                        ) : isMe ? (
                          <button 
                            className="btn btn-link p-0 text-decoration-none mb-3 text-start"
                            onClick={() => handleEditField('bio')}
                            style={{ color: '#1877f2', fontSize: '15px', padding: '0' }}
                          >
                            Add bio
                          </button>
                        ) : null}
                      </>
                    )}
                    {editingField === 'bio' && isMe && (
                      <div className="mb-3">
                        <textarea 
                          className="form-control form-control-sm"
                          rows="3"
                          value={editFormData.bio}
                          onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                          placeholder="Tell people about yourself"
                          style={{ resize: 'none', border: '1px solid #1877f2' }}
                          autoFocus
                        />
                        <div className="d-flex gap-2 mt-2">
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSaveField('bio')}
                            disabled={uploadingEdit}
                            style={{ minWidth: '60px' }}
                          >
                            {uploadingEdit ? '...' : 'Save'}
                          </button>
                          <button 
                            className="btn btn-light btn-sm"
                            onClick={handleCancelEdit}
                            disabled={uploadingEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {viewingUser?.city && (
                      <div className="d-flex align-items-center gap-2 text-muted small mb-2" style={{ fontSize: '15px', color: '#65676b' }}>
                        <FiMapPin /> Lives in {viewingUser.city}
                        {isMe && (
                          <button 
                            className="btn btn-link p-0 text-decoration-none"
                            onClick={() => handleEditField('city')}
                            style={{ color: '#65676b', padding: '0', marginLeft: '4px' }}
                            title="Edit city"
                          >
                            <FiEdit2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                    {editingField === 'city' && isMe && (
                      <div className="mb-3">
                        <div className="d-flex align-items-center gap-2">
                          <FiMapPin className="text-muted" />
                          <input 
                            type="text"
                            className="form-control form-control-sm"
                            value={editFormData.city}
                            onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                            placeholder="Enter your city"
                            style={{ border: '1px solid #1877f2' }}
                            autoFocus
                          />
                        </div>
                        <div className="d-flex gap-2 mt-2">
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSaveField('city')}
                            disabled={uploadingEdit}
                            style={{ minWidth: '60px' }}
                          >
                            {uploadingEdit ? '...' : 'Save'}
                          </button>
                          <button 
                            className="btn btn-light btn-sm"
                            onClick={handleCancelEdit}
                            disabled={uploadingEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {viewingUser?.email && (
                      <div className="d-flex align-items-center gap-2 text-muted small mb-2" style={{ fontSize: '15px', color: '#65676b' }}>
                        <FiMail /> {viewingUser.email}
                      </div>
                    )}
                    {viewingUser?.createdAt && (
                      <div className="d-flex align-items-center gap-2 text-muted small" style={{ fontSize: '15px', color: '#65676b' }}>
                        <FiCalendar /> Joined {new Date(viewingUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </div>
                    )}
                    {!isMe && canViewContent && (
                      <div className="mt-3 pt-3 border-top">
                        <h6 className="fw-bold mb-2" style={{ fontSize: '17px', color: '#050505' }}>Mutual Friends</h6>
                        <p className="text-muted small" style={{ fontSize: '15px' }}>No mutual friends</p>
                      </div>
                    )}
                  </>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className={canViewContent ? "col-12 col-lg-6" : "col-12 col-lg-9 mx-auto"}>
            {activeTab === 'posts' && !canViewContent && (
              <div className="private-profile-content">
                <div className="private-profile-icon-wrapper">
                  <div className="private-profile-icon">
                    <FiLock size={48} />
                  </div>
                </div>
                <h3 className="private-profile-title">This Content is Private</h3>
                <p className="private-profile-description">
                  {viewingUser?.name || 'This user'}'s posts are only visible to friends. Send a friend request to see their posts and connect!
                </p>
                {!isMe && !requestSent && !requestReceived && !isFriend && (
                  <button 
                    className="btn btn-primary rounded-pill px-4 py-2 mt-3"
                    onClick={handleAddFriend}
                    disabled={friendActionLoading}
                    style={{ fontWeight: '600' }}
                  >
                    <FiUserPlus className="me-2" />
                    {friendActionLoading ? 'Sending...' : 'Send Friend Request'}
                  </button>
                )}
                {requestSent && (
                  <div className="mt-3">
                    <span className="badge bg-secondary rounded-pill px-3 py-2">
                      <FiCheck className="me-1" />
                      Friend Request Sent
                    </span>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'friends' && !canViewContent && (
              <div className="private-profile-content">
                <div className="private-profile-icon-wrapper">
                  <div className="private-profile-icon">
                    <FiUsers size={48} />
                  </div>
                </div>
                <h3 className="private-profile-title">Friends List is Private</h3>
                <p className="private-profile-description">
                  {viewingUser?.name || 'This user'}'s friends list is only visible to friends. Connect with them to see mutual friends!
                </p>
                {!isMe && !requestSent && !requestReceived && !isFriend && (
                  <button 
                    className="btn btn-primary rounded-pill px-4 py-2 mt-3"
                    onClick={handleAddFriend}
                    disabled={friendActionLoading}
                    style={{ fontWeight: '600' }}
                  >
                    <FiUserPlus className="me-2" />
                    {friendActionLoading ? 'Sending...' : 'Send Friend Request'}
                  </button>
                )}
                {requestSent && (
                  <div className="mt-3">
                    <span className="badge bg-secondary rounded-pill px-3 py-2">
                      <FiCheck className="me-1" />
                      Friend Request Sent
                    </span>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'photos' && !canViewContent && (
              <div className="private-profile-content">
                <div className="private-profile-icon-wrapper">
                  <div className="private-profile-icon">
                    <FiImage size={48} />
                  </div>
                </div>
                <h3 className="private-profile-title">Photos are Private</h3>
                <p className="private-profile-description">
                  {viewingUser?.name || 'This user'}'s photos are only visible to friends. Become friends to see their photo gallery!
                </p>
                {!isMe && !requestSent && !requestReceived && !isFriend && (
                  <button 
                    className="btn btn-primary rounded-pill px-4 py-2 mt-3"
                    onClick={handleAddFriend}
                    disabled={friendActionLoading}
                    style={{ fontWeight: '600' }}
                  >
                    <FiUserPlus className="me-2" />
                    {friendActionLoading ? 'Sending...' : 'Send Friend Request'}
                  </button>
                )}
                {requestSent && (
                  <div className="mt-3">
                    <span className="badge bg-secondary rounded-pill px-3 py-2">
                      <FiCheck className="me-1" />
                      Friend Request Sent
                    </span>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'posts' && canViewContent && (
              <div>
                {loadingPosts ? (
                  <div>
                    {[1, 2, 3].map(i => <PostCardSkeleton key={i} />)}
                  </div>
                ) : filteredUserPosts.length > 0 ? (
                  <div>
                    {filteredUserPosts.map((post) => (
                      <PostCard
                        key={post._id}
                        post={post}
                        onToggleLike={handleToggleLike}
                        onAddComment={handleAddComment}
                        onPostDelete={handlePostDelete}
                        onPostSave={handlePostSave}
                        currentUser={user}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="card shadow-sm">
                    <div className="card-body text-center py-5">
                      <FiImage size={48} className="text-muted mb-3" />
                      <p className="text-muted">No posts yet</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="card shadow-sm about-section-card">
                <div className="card-body">
                  <div className="about-section-header">
                    <h5 className="fw-bold mb-0" style={{ fontSize: '24px', color: '#050505' }}>About</h5>
                  </div>
                  <div className="about-section-content">
                    <div className="about-info-group">
                      <h6 className="about-section-title">
                        <FiUser className="about-section-icon" />
                        Basic Information
                      </h6>
                    {editingField === 'name' && isMe ? (
                      <div className="about-info-item">
                        <div className="about-info-label">Name</div>
                        <div className="d-flex align-items-center gap-2">
                          <input 
                            type="text"
                            className="form-control"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            placeholder="Enter your name"
                            style={{ border: '1px solid #1877f2' }}
                            autoFocus
                          />
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSaveField('name')}
                            disabled={uploadingEdit}
                            style={{ minWidth: '60px' }}
                          >
                            {uploadingEdit ? '...' : 'Save'}
                          </button>
                          <button 
                            className="btn btn-light btn-sm"
                            onClick={handleCancelEdit}
                            disabled={uploadingEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : viewingUser?.name && (
                      <div className="about-info-item">
                        <div className="about-info-label">Name</div>
                        <div className="d-flex align-items-center gap-2">
                          <div className="about-info-value">{viewingUser.name}</div>
                          {isMe && (
                            <button 
                              className="btn btn-link p-0 text-decoration-none about-edit-btn"
                              onClick={() => handleEditField('name')}
                              title="Edit name"
                            >
                              <FiEdit2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {editingField === 'city' && isMe ? (
                      <div className="about-info-item">
                        <div className="about-info-label">City</div>
                        <div className="d-flex align-items-center gap-2">
                          <input 
                            type="text"
                            className="form-control"
                            value={editFormData.city}
                            onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                            placeholder="Enter your city"
                            style={{ border: '1px solid #1877f2' }}
                            autoFocus
                          />
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSaveField('city')}
                            disabled={uploadingEdit}
                            style={{ minWidth: '60px' }}
                          >
                            {uploadingEdit ? '...' : 'Save'}
                          </button>
                          <button 
                            className="btn btn-light btn-sm"
                            onClick={handleCancelEdit}
                            disabled={uploadingEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : viewingUser?.city && (
                      <div className="about-info-item">
                        <div className="about-info-label">City</div>
                        <div className="d-flex align-items-center gap-2">
                          <div className="about-info-value">{viewingUser.city}</div>
                          {isMe && (
                            <button 
                              className="btn btn-link p-0 text-decoration-none about-edit-btn"
                              onClick={() => handleEditField('city')}
                              title="Edit city"
                            >
                              <FiEdit2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {viewingUser?.email && (
                      <div className="about-info-item">
                        <div className="about-info-label">Email</div>
                        <div className="about-info-value">{viewingUser.email}</div>
                      </div>
                    )}
                  </div>
                  </div>
                  {editingField === 'bio' && isMe ? (
                    <div className="about-info-group">
                      <h6 className="about-section-title">
                        <FiEdit2 className="about-section-icon" />
                        Bio
                      </h6>
                      <textarea 
                        className="form-control"
                        rows="4"
                        value={editFormData.bio}
                        onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                        placeholder="Tell people about yourself"
                        style={{ resize: 'none', border: '1px solid #1877f2' }}
                        autoFocus
                      />
                      <div className="d-flex gap-2 mt-2">
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSaveField('bio')}
                          disabled={uploadingEdit}
                          style={{ minWidth: '60px' }}
                        >
                          {uploadingEdit ? '...' : 'Save'}
                        </button>
                        <button 
                          className="btn btn-light btn-sm"
                          onClick={handleCancelEdit}
                          disabled={uploadingEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {viewingUser?.bio && (
                        <div className="about-info-group">
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <h6 className="about-section-title mb-0">
                              <FiEdit2 className="about-section-icon" />
                              Bio
                            </h6>
                            {isMe && (
                              <button 
                                className="btn btn-link p-0 text-decoration-none about-edit-btn"
                                onClick={() => handleEditField('bio')}
                                title="Edit bio"
                              >
                                <FiEdit2 size={14} />
                              </button>
                            )}
                          </div>
                          <p className="about-bio-text">{viewingUser.bio}</p>
                        </div>
                      )}
                      {isMe && !viewingUser?.bio && (
                        <div className="about-info-group">
                          <h6 className="about-section-title">
                            <FiEdit2 className="about-section-icon" />
                            Bio
                          </h6>
                          <button 
                            className="btn btn-link p-0 text-decoration-none about-add-bio-btn"
                            onClick={() => handleEditField('bio')}
                          >
                            Add bio
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'friends' && !canViewContent && (
              <div className="private-profile-content">
                <div className="private-profile-icon-wrapper">
                  <div className="private-profile-icon">
                    <FiUsers size={56} />
                  </div>
                </div>
                <h3 className="private-profile-title">Friends List is Private</h3>
                <p className="private-profile-description">
                  {viewingUser?.name || 'This user'}'s friends list is only visible to friends. Connect with them to see mutual friends!
                </p>
                {!isMe && !requestSent && !requestReceived && !isFriend && (
                  <button 
                    className="btn btn-primary rounded-pill px-4 py-2 mt-3"
                    onClick={handleAddFriend}
                    disabled={friendActionLoading}
                    style={{ fontWeight: '600' }}
                  >
                    <FiUserPlus className="me-2" />
                    {friendActionLoading ? 'Sending...' : 'Send Friend Request'}
                  </button>
                )}
                {requestSent && (
                  <div className="mt-3">
                    <span className="badge bg-secondary rounded-pill px-3 py-2">
                      <FiCheck className="me-1" />
                      Friend Request Sent
                    </span>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'friends' && canViewContent && (
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0">Friends</h5>
                    <span className="text-muted small">{userFriends.length} friends</span>
                  </div>
                  {loadingFriends ? (
                    <div className="row g-3">
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="col-6 col-md-4">
                          <div className="skeleton-image" style={{ width: '100%', height: '150px', borderRadius: '8px' }}></div>
                        </div>
                      ))}
                    </div>
                  ) : userFriends.length > 0 ? (
                    <div className="row g-3">
                      {userFriends.map((friend) => {
                        const friendId = typeof friend === 'string' ? friend : friend._id;
                        const friendName = typeof friend === 'object' ? friend.name : 'Friend';
                        const friendPic = (typeof friend === 'object' && friend.hasProfilePicture && friend.profilePicture)
                          ? `http://localhost:3000/${friend.profilePicture}` 
                          : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
                        return (
                          <div key={friendId} className="col-6 col-md-4">
                            <Link 
                              to={`/profile?userId=${friendId}`}
                              className="text-decoration-none text-dark"
                            >
                              <div className="card h-100 shadow-sm">
                                <img 
                                  src={friendPic} 
                                  alt={friendName}
                                  className="card-img-top"
                                  style={{ height: '150px', objectFit: 'cover' }}
                                />
                                <div className="card-body p-2">
                                  <div className="fw-semibold small">{friendName}</div>
                                </div>
                              </div>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <FiUsers size={48} className="text-muted mb-3" />
                      <p className="text-muted">No friends yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'photos' && !canViewContent && (
              <div className="private-profile-content">
                <div className="private-profile-icon-wrapper">
                  <div className="private-profile-icon">
                    <FiImage size={56} />
                  </div>
                </div>
                <h3 className="private-profile-title">Photos are Private</h3>
                <p className="private-profile-description">
                  {viewingUser?.name || 'This user'}'s photos are only visible to friends. Become friends to see their photo gallery!
                </p>
                {!isMe && !requestSent && !requestReceived && !isFriend && (
                  <button 
                    className="btn btn-primary rounded-pill px-4 py-2 mt-3"
                    onClick={handleAddFriend}
                    disabled={friendActionLoading}
                    style={{ fontWeight: '600' }}
                  >
                    <FiUserPlus className="me-2" />
                    {friendActionLoading ? 'Sending...' : 'Send Friend Request'}
                  </button>
                )}
                {requestSent && (
                  <div className="mt-3">
                    <span className="badge bg-secondary rounded-pill px-3 py-2">
                      <FiCheck className="me-1" />
                      Friend Request Sent
                    </span>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'photos' && canViewContent && (
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0">Photos</h5>
                    <span className="text-muted small">{userPhotos.length} photos</span>
                  </div>
                  {userPhotos.length > 0 ? (
                    <div className="row g-2">
                      {userPhotos.map((photo) => (
                        <div key={photo.id} className="col-4">
                          <Link to={`/community/post/${photo.id}`}>
                            <img 
                              src={photo.url} 
                              alt="Post"
                              className="w-100 rounded"
                              style={{ height: '200px', objectFit: 'cover' }}
                            />
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <FiImage size={48} className="text-muted mb-3" />
                      <p className="text-muted">No photos yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="col-12 col-lg-3">
            {!canViewContent && (
              <div className="private-profile-content">
                <div className="private-profile-icon-wrapper">
                  <div className="private-profile-icon">
                    <FiLock size={48} />
                  </div>
                </div>
                <h3 className="private-profile-title">This Content is Private</h3>
                <p className="private-profile-description">
                  {viewingUser?.name || 'This user'}'s posts are only visible to friends. Send a friend request to see their posts and connect!
                </p>
                {!isMe && !requestSent && !requestReceived && !isFriend && (
                  <button 
                    className="btn btn-primary rounded-pill px-4 py-2 mt-3"
                    onClick={handleAddFriend}
                    disabled={friendActionLoading}
                    style={{ fontWeight: '600' }}
                  >
                    <FiUserPlus className="me-2" />
                    {friendActionLoading ? 'Sending...' : 'Send Friend Request'}
                  </button>
                )}
                {requestSent && (
                  <div className="mt-3">
                    <span className="badge bg-secondary rounded-pill px-3 py-2">
                      <FiCheck className="me-1" />
                      Friend Request Sent
                    </span>
                  </div>
                )}
              </div>
            )}
            {canViewContent && (
              <div className="card shadow-sm">
                <div className="card-body">
                  <h6 className="fw-bold mb-3">Photos</h6>
                  {userPhotos.length > 0 ? (
                  <div className="row g-2">
                    {userPhotos.slice(0, 9).map((photo) => (
                      <div key={photo.id} className="col-4">
                        <Link to={`/community/post/${photo.id}`}>
                          <img 
                            src={photo.url} 
                            alt="Post"
                            className="w-100 rounded"
                            style={{ height: '80px', objectFit: 'cover' }}
                          />
                        </Link>
                      </div>
                    ))}
                  </div>
                  ) : (
                    <p className="text-muted small">No photos yet</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
