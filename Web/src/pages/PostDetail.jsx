import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiHeart, FiMessageSquare, FiShare2, FiBookmark } from "react-icons/fi";
import "../assests/css/post-detail.css";
import { getPost, addComment, toggleLike, sharePost } from "../api/postsApi.jsx";

export default function PostDetail() {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState("");

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
      alert("Post shared!");
    } catch {}
  };

  return (
    <div className="container-fluid py-3 post-detail-page">
      <div className="row g-3">
        {/* Main column */}
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body">
              {!loading && post && (
                <>
              <div className="text-center mb-3">
                    <img className="rounded-circle me-2 post-avatar" src={post.author?.profilePicture || "https://placehold.co/64x64"} alt={post.author?.name || "User"} />
                    <div className="fw-semibold">{post.author?.name || "Unknown"}</div>
                    <div className="text-muted xsmall">{new Date(post.createdAt).toLocaleString()}</div>
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
                    <span className="d-inline-flex align-items-center gap-1"><FiHeart/> {likesCount}</span>
                    <span className="d-inline-flex align-items-center gap-1"><FiMessageSquare/> {commentsCount}</span>
                    <span className="d-inline-flex align-items-center gap-1"><FiShare2/> {sharesCount}</span>
                <span className="d-inline-flex align-items-center gap-1"><FiBookmark/> Save</span>
              </div>
                </>
              )}
              {loading && <div className="text-center text-muted small">Loading...</div>}
              {error && <div className="alert alert-danger mt-2">{error}</div>}
            </div>
          </div>

          {/* Comments */}
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
                    <img className="rounded-circle post-avatar" src={c.author?.profilePicture || "https://placehold.co/64x64"} alt={c.author?.name || "User"} />
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
                  <img className="rounded-circle post-avatar" src={post.author?.profilePicture || "https://placehold.co/64x64"} alt={post.author?.name || "User"} />
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
    </div>
  );
}


