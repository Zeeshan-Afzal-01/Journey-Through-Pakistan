import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiHeart, FiMessageSquare, FiBookmark, FiUsers, FiMapPin, FiTag, FiArrowLeft } from "react-icons/fi";
import { getSavedPosts, toggleSavePost } from "../api/postsApi.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { PostCardSkeleton } from '../components/SkeletonLoader.jsx';
import "../assests/css/community.css";

// Reuse PostCard from Community
function renderWithHashtags(text, onHashtagClick) {
  if (!text) return null;
  const regex = /(^|\s)(#\w{2,})/g;
  const segments = [];
  let lastIndex = 0;
  let match;
  let hasMatches = false;
  while ((match = regex.exec(text)) !== null) {
    hasMatches = true;
    segments.push(text.slice(lastIndex, match.index + match[1].length));
    segments.push(
      <span
        key={match.index}
        className="text-primary"
        style={{ cursor: "pointer" }}
        onClick={() => onHashtagClick?.(match[2].substring(1))}
      >
        {match[2]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (hasMatches) {
    segments.push(text.slice(lastIndex));
  }
  return hasMatches ? segments : text;
}

function PostCard({ post, currentUser, onUnsave }) {
  const likeCount = post.likes?.length || 0;
  const commentCount = post.comments?.length || 0;
  const time = new Date(post.createdAt).toLocaleString();
  const [unsaving, setUnsaving] = useState(false);
  const { user, setUser } = useAuth();
  const hasLiked = post.likes && currentUser && post.likes.some(u => (u._id || u) === (currentUser._id || currentUser.id));
  const isGif = post.imageUrl && /\.gif($|\?)/i.test(post.imageUrl);

  const handleUnsave = async () => {
    if (unsaving || !post?._id) return;
    setUnsaving(true);
    try {
      await toggleSavePost(post._id);
      // Update user's savedPosts
      if (setUser && user) {
        setUser(prev => {
          if (!prev) return prev;
          const savedPosts = prev.savedPosts || [];
          return {
            ...prev,
            savedPosts: savedPosts.filter(id => {
              const savedId = typeof id === 'string' ? id : id._id || id;
              const pid = typeof post._id === 'string' ? post._id : post._id.toString();
              return savedId !== pid && String(savedId) !== String(pid);
            })
          };
        });
      }
      onUnsave?.(post._id);
    } catch (err) {
      console.error('Failed to unsave post', err);
    } finally {
      setUnsaving(false);
    }
  };

  return (
    <div className="card shadow-sm mb-3 post-card" style={{ border: 'none', borderRadius: '8px', overflow: 'hidden' }}>
      <div className="card-body p-3">
        {/* Header */}
        <div className="d-flex align-items-center gap-2 mb-3">
          <Link to={`/profile?userId=${post.author?._id || post.author}`} className="text-decoration-none">
            <img 
              className="rounded-circle" 
              style={{ width: '40px', height: '40px', objectFit: 'cover' }}
              src={post.author?.profilePicture ? `http://localhost:3000/${post.author.profilePicture}` : "/default-avatar.png"} 
              alt={post.author?.name || "User"} 
            />
          </Link>
          <div className="flex-grow-1">
            <Link to={`/profile?userId=${post.author?._id || post.author}`} className="text-decoration-none text-dark">
              <div className="fw-semibold small">{post.author?.name || "Unknown"}</div>
            </Link>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
              {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {post.author?.city && ` • ${post.author.city}`}
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
          <button
            type="button"
            onClick={handleUnsave}
            disabled={unsaving}
            className="btn btn-sm btn-link text-primary p-1"
            title="Remove from saved"
            style={{ minWidth: 'auto' }}
          >
            <FiBookmark fill="currentColor" size={20} /> 
          </button>
        </div>

        {/* Post Text */}
        {post.text && (
          <p className="mb-3" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>{renderWithHashtags(post.text)}</p>
        )}

        {/* Post Image */}
        {post.imageUrl && (
          <div className="mb-3" style={{ borderRadius: '8px', overflow: 'hidden' }}>
            <Link to={`/community/post/${post._id}`}>
              {isGif ? (
                <img 
                  className="w-100 rounded" 
                  style={{ maxHeight: '500px', objectFit: 'contain', backgroundColor: '#f0f0f0' }}
                  src={post.imageUrl.startsWith('http') ? post.imageUrl : `http://localhost:3000/${post.imageUrl}`} 
                  alt="post" 
                />
              ) : (
                <img 
                  className="w-100 rounded" 
                  style={{ maxHeight: '500px', objectFit: 'cover', cursor: 'pointer' }}
                  src={post.imageUrl.startsWith('http') ? post.imageUrl : `http://localhost:3000/${post.imageUrl}`} 
                  alt="post" 
                />
              )}
            </Link>
          </div>
        )}

        {/* Place and Feeling */}
        {(post.place || post.feeling) && (
          <div className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
            {post.place && (
              <span className="me-3 d-inline-flex align-items-center">
                <FiMapPin className="me-1" size={14}/>{post.place}
              </span>
            )}
            {post.feeling && (
              <span className="me-2">{post.feeling}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="d-flex align-items-center gap-4 pt-2 border-top">
          <Link 
            to={`/community/post/${post._id}`} 
            className="text-decoration-none text-muted d-inline-flex align-items-center gap-1"
            style={{ fontSize: '0.9rem', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.classList.add('text-dark')}
            onMouseLeave={(e) => e.currentTarget.classList.remove('text-dark')}
          >
            <FiHeart 
              size={18} 
              color={hasLiked ? '#dc3545' : undefined} 
              fill={hasLiked ? '#dc3545' : 'none'}
            /> 
            <span>{likeCount}</span>
          </Link>
          <Link 
            to={`/community/post/${post._id}`} 
            className="text-decoration-none text-muted d-inline-flex align-items-center gap-1"
            style={{ fontSize: '0.9rem', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.classList.add('text-dark')}
            onMouseLeave={(e) => e.currentTarget.classList.remove('text-dark')}
          >
            <FiMessageSquare size={18}/> 
            <span>{commentCount}</span>
          </Link>
          <div className="ms-auto d-inline-flex align-items-center gap-1 text-primary" style={{ fontSize: '0.9rem' }}>
            <FiBookmark fill="currentColor" size={18}/> 
            <span>Saved</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SavedPosts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSavedPosts = async () => {
      try {
        setLoading(true);
        const { data } = await getSavedPosts();
        setSavedPosts(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load saved posts");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSavedPosts();
    }
  }, [user]);

  const handleUnsave = (postId) => {
    setSavedPosts(prev => prev.filter(p => p._id !== postId));
  };

  return (
    <div className="container-fluid py-4" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="row">
        <div className="col-12">
          {/* Header */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-3 mb-3">
              <button 
                className="btn btn-link p-0 d-flex align-items-center justify-content-center rounded-circle"
                onClick={() => navigate('/community')}
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <FiArrowLeft size={22} />
              </button>
              <div className="flex-grow-1">
                <h2 className="fw-bold mb-1" style={{ fontSize: '1.5rem' }}>Saved Posts</h2>
                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                  {savedPosts.length > 0 
                    ? `${savedPosts.length} ${savedPosts.length === 1 ? 'post' : 'posts'} saved`
                    : "Posts you've saved for later"
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div>
              {[1, 2, 3].map(i => <PostCardSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="alert alert-danger rounded" style={{ border: 'none' }}>
              {error}
            </div>
          ) : savedPosts.length === 0 ? (
            <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
              <div className="card-body text-center py-5 px-4">
                <div 
                  className="rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
                  style={{ 
                    width: '100px', 
                    height: '100px', 
                    backgroundColor: '#f0f2f5',
                    margin: '0 auto'
                  }}
                >
                  <FiBookmark size={48} className="text-muted" />
                </div>
                <h4 className="fw-semibold mb-2">No saved posts yet</h4>
                <p className="text-muted mb-4" style={{ fontSize: '0.95rem' }}>
                  Start saving posts you want to view later. They'll appear here.
                </p>
                <button 
                  className="btn btn-primary rounded-pill px-4"
                  onClick={() => navigate('/community')}
                  style={{ fontWeight: '500' }}
                >
                  Browse Community
                </button>
              </div>
            </div>
          ) : (
            <div>
              {savedPosts.map(post => (
                <PostCard 
                  key={post._id} 
                  post={post}
                  currentUser={user}
                  onUnsave={handleUnsave}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

