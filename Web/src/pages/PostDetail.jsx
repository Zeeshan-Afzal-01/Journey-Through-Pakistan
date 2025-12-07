import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiHeart, FiMessageSquare, FiShare2, FiBookmark, FiMoreHorizontal, FiEdit2, FiTrash2, FiUsers } from "react-icons/fi";
import "../assests/css/post-detail.css";
import { getPost, addComment, toggleLike, sharePost, updatePost, deletePost } from "../api/postsApi.jsx";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { PostDetailSkeleton, CommentSkeleton } from '../components/SkeletonLoader.jsx';
import "../assests/css/skeleton.css";

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState("");
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const { user: currentUser } = useAuth();

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  const isAuthor = currentUser && post && (post.author?._id === currentUser._id || post.author?._id === currentUser.id);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await getPost(postId);
        if (mounted) setPost(data);
      } catch (e) {
        if (mounted) setError("Failed to load post");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [postId]);

  const likesCount = post?.likes?.length || 0;
  const commentsCount = post?.comments?.length || 0;
  const sharesCount = post?.shares || 0;
  const hasLiked = post && currentUser && post.likes && post.likes.some(u => (u._id || u) === (currentUser._id || currentUser.id));

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      const { data } = await addComment(post._id, commentText.trim());
      setPost(data);
      setCommentText("");
    } catch {}
  };

  const handleToggleLike = async () => {
    try {
      const { data } = await toggleLike(post._id);
      setPost(data);
    } catch {}
  };

  const handleShare = async () => {
    try {
      const { data } = await sharePost(post._id);
      setPost(data);
      showNotification("Post shared successfully!", 'success');
    } catch (err) {
      showNotification(err?.response?.data?.message || "Failed to share post", 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deletePost(post._id);
      showNotification("Post deleted successfully", 'success');
      setTimeout(() => navigate('/community'), 1500);
    } catch (err) {
      showNotification(err?.response?.data?.message || "Failed to delete post", 'error');
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
    setShowOptionsMenu(false);
  };

  return (
    <div className="container-fluid py-3 post-detail-page">
      <div className="row g-3">
        {/* Main column */}
        <div className="col-12 col-lg-8">
          {loading ? (
            <PostDetailSkeleton />
          ) : post ? (
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="text-center mb-3 position-relative">
                <div className="position-absolute top-0 end-0">
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
                <img
                  className="rounded-circle me-2 post-avatar"
                  src={
                    post.author?.hasProfilePicture && post.author?.profilePicture
                      ? `http://localhost:3000/${post.author.profilePicture}`
                      : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                  }
                  alt={post.author?.name || "User"}
                /> 
                <div className="fw-semibold">{post.author?.name || "Unknown"}</div>
                <div className="text-muted xsmall">
                  {new Date(post.createdAt).toLocaleString()}
                  {post.group && (
                    <span className="ms-2">
                      • <FiUsers size={12} className="d-inline me-1" />
                      <Link to={`/group/${post.group._id || post.group}`} className="text-primary text-decoration-none">
                        {typeof post.group === 'object' ? post.group.name : 'Group'}
                      </Link>
                    </span>
                  )}
                </div>
              </div>
                  <h2 className="fw-bolder mb-3">{post.text}</h2>
                  {post.imageUrl && (
              <div className="ratio ratio-16x9 rounded overflow-hidden mb-3">
                      <img className="object-fit-cover" src={post.imageUrl.startsWith('http') ? post.imageUrl : `http://localhost:3000/${post.imageUrl}`} alt={post.text} />
                    </div>
                  )}
                  {(post.place || post.feeling) && (
                    <div className="text-muted xsmall mb-2">
                      {post.place && <span className="me-2">📍 {post.place}</span>}
                      {post.feeling && <span className="me-2">{post.feeling}</span>}
              </div>
                  )}
              <div className="d-flex justify-content-between text-muted small pt-2 border-top">
                    <span className="d-inline-flex align-items-center gap-1">
                      <FiHeart color={hasLiked ? '#dc3545' : undefined} fill={hasLiked ? '#dc3545' : 'none'} style={{fontWeight: hasLiked ? 'bold' : 'normal'}}/> {likesCount}
                    </span>
                    <span className="d-inline-flex align-items-center gap-1"><FiMessageSquare/> {commentsCount}</span>
                    <span className="d-inline-flex align-items-center gap-1"><FiShare2/> {sharesCount}</span>
                <span className="d-inline-flex align-items-center gap-1"><FiBookmark/> Save</span>
              </div>
            </div>
          </div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : null}

          {/* Comments */}
          {loading ? (
            <div className="card shadow-sm mt-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Comments</h6>
                <div className="d-flex flex-column gap-3">
                  {[1, 2, 3].map(i => <CommentSkeleton key={i} />)}
                </div>
              </div>
            </div>
          ) : (
          <div className="card shadow-sm mt-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Comments ({commentsCount})</h6>
              <div className="input-group mb-3">
                <input value={commentText} onChange={(e)=>setCommentText(e.target.value)} className="form-control" placeholder="Write a comment..." />
                <button onClick={handleAddComment} className="btn btn-primary">Post Comment</button>
              </div>
              <div className="d-flex flex-column gap-3">
                {post?.comments?.map((c) => (
                  <div className="d-flex gap-2 border-bottom pb-3" key={c._id}>
                   <img
  className="rounded-circle me-2 post-avatar"
  src={
    c.author?.hasProfilePicture && c.author?.profilePicture
      ? `http://localhost:3000/${c.author.profilePicture}`
      : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
  }
  alt={c.author?.name || "User"}
/>
 <div>
                      <div className="fw-semibold small">{c.author?.name || "Unknown"}</div>
                      <div className="text-muted xsmall mb-1">{new Date(c.createdAt).toLocaleString()}</div>
                      <div className="text-muted">{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Actions</h6>
              <div className="d-grid gap-2">
                <button onClick={handleToggleLike} className="btn btn-primary-subtle">♡ Like</button>
                <button className="btn btn-primary-subtle" onClick={()=>{
                  const el = document.querySelector('.input-group input.form-control');
                  if (el) el.focus();
                }}>💬 Comment</button>
                <button onClick={handleShare} className="btn btn-primary-subtle">🔗 Share</button>
                <button className="btn btn-primary-subtle">🔖 Save Post</button>
              </div>
            </div>
          </div>
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-2">Post Tags</h6>
              <div className="d-flex flex-wrap gap-2">
                {[]}
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="fw-bold mb-2">About the Author</h6>
              {post && (
              <div className="d-flex align-items-center gap-2 mb-2">
                                <img
  className="rounded-circle me-2 post-avatar"
  src={
    post.author?.hasProfilePicture && post.author?.profilePicture
      ? `http://localhost:3000/${post.author.profilePicture}`
      : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
  }
  alt={post.author?.name || "User"}
/>
  <div>
                    <div className="fw-semibold">{post.author?.name || "Unknown"}</div>
                  <Link className="xsmall" to="#">View Profile</Link>
                </div>
              </div>
              )}
              <p className="text-muted xsmall mb-0">A passionate traveler sharing experiences across Pakistan.</p>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && post && (
        <EditPostModal
          post={post}
          onClose={() => setShowEditModal(false)}
          onUpdate={async (updatedData) => {
            try {
              const { data } = await updatePost(post._id, updatedData);
              setPost(data);
              setShowEditModal(false);
              showNotification("Post updated successfully", 'success');
            } catch (err) {
              showNotification(err?.response?.data?.message || "Failed to update post", 'error');
            }
          }}
        />
      )}

      {notification.show && (
        <div 
          className={`position-fixed top-0 start-50 translate-middle-x mt-3 alert alert-${notification.type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`}
          style={{ zIndex: 9999, minWidth: '300px' }}
          role="alert"
        >
          {notification.message}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setNotification({ show: false, message: '', type: 'success' })}
          ></button>
        </div>
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


