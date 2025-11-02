import React, { useEffect, useMemo, useState } from "react";
import { FiCamera, FiHeart } from "react-icons/fi";
import "../assests/css/profile.css";
import { AuthContext } from "../context/AuthContext";
import { useContext } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/api.jsx";
import { listPostsByAuthor } from "../api/postsApi.jsx";
import { listGroups } from "../api/groupsApi.jsx";
import { Link } from "react-router-dom";
import { updateMe as apiUpdateMe } from "../api/authApi.jsx";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  unfriend
} from "../api/authApi.jsx";
import { ProfileSkeleton, PostCardSkeleton } from '../components/SkeletonLoader.jsx';
import "../assests/css/skeleton.css";

export default function Profile() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [otherUser, setOtherUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(false)
  const [userPosts, setUserPosts] = useState([])
  const [filteredUserPosts, setFilteredUserPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [uploadingPic, setUploadingPic] = useState(false)
  const [groups, setGroups] = useState([])

  // Friend request state logic
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const isMe = !otherUser || user?._id === otherUser?._id;
  const isFriend = user?.friends?.includes(otherUser?._id);
  const requestSent = user?.sentRequests?.includes(otherUser?._id);
  const requestReceived = user?.friendRequests?.includes(otherUser?._id);

  const handleAddFriend = async () => {
    setFriendActionLoading(true);
    try {
      await sendFriendRequest(otherUser._id);
      // refetch or patch state manually
      setOtherUser({ ...otherUser });
      if (user.sentRequests) user.sentRequests.push(otherUser._id);
    } finally { setFriendActionLoading(false); }
  };
  const handleCancelRequest = async () => {
    setFriendActionLoading(true);
    try {
      await cancelFriendRequest(otherUser._id);
      if (user.sentRequests) user.sentRequests = user.sentRequests.filter(id => id !== otherUser._id);
      setOtherUser({ ...otherUser });
    } finally { setFriendActionLoading(false); }
  };
  const handleAccept = async () => {
    setFriendActionLoading(true);
    try {
      await acceptFriendRequest(otherUser._id);
      if (user.friends) user.friends.push(otherUser._id);
      if (user.friendRequests) user.friendRequests = user.friendRequests.filter(id => id !== otherUser._id);
      setOtherUser({ ...otherUser });
    } finally { setFriendActionLoading(false); }
  };
  const handleDecline = async () => {
    setFriendActionLoading(true);
    try {
      await declineFriendRequest(otherUser._id);
      if (user.friendRequests) user.friendRequests = user.friendRequests.filter(id => id !== otherUser._id);
      setOtherUser({ ...otherUser });
    } finally { setFriendActionLoading(false); }
  };
  const handleUnfriend = async () => {
    setFriendActionLoading(true);
    try {
      await unfriend(otherUser._id);
      if (user.friends) user.friends = user.friends.filter(id => id !== otherUser._id);
      setOtherUser({ ...otherUser });
    } finally { setFriendActionLoading(false); }
  };

  const queryUserId = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('userId')
  }, [location.search])

  useEffect(() => {
    const load = async () => {
      if (queryUserId && (!user || user._id !== queryUserId)) {
        try {
          setLoadingUser(true);
          const res = await api.get(`/users/${queryUserId}`)
          setOtherUser(res.data)
        } catch {}
        finally {
          setLoadingUser(false);
        }
      } else {
        setOtherUser(null)
        setLoadingUser(false);
      }
    }
    load()
  }, [queryUserId, user])

  // Fetch groups to check membership
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
      const targetId = otherUser?._id || user?._id
      if (!targetId) return
      try {
        setLoadingPosts(true)
        const res = await listPostsByAuthor(targetId)
        const allPosts = Array.isArray(res.data) ? res.data : [];
        setUserPosts(allPosts);
      } finally {
        setLoadingPosts(false)
      }
    }
    fetchPosts()
  }, [otherUser, user])

  // Filter posts based on group membership
  useEffect(() => {
    if (!user?._id || isMe) {
      // If viewing own profile, show all posts
      setFilteredUserPosts(userPosts);
      return;
    }

    // If viewing someone else's profile, filter out group posts where current user is not a member
    const filtered = userPosts.filter(post => {
      // If post doesn't belong to a group, show it
      if (!post.group) return true;

      // If post belongs to a group, check if current user is a member
      const groupId = post.group._id || post.group;
      const group = groups.find(g => g._id === groupId);
      
      // If group not found in our list, it means user doesn't have access to it, so hide the post
      // This could happen if the group is private and user hasn't joined/requested
      if (!group) return false;

      // Check if current user is a member or admin of the group
      const isMember = group.members?.some(m => (m._id || m) === user._id) || 
                      group.admin?._id === user._id || 
                      (typeof group.admin === 'string' && group.admin === user._id);
      
      return isMember; // Show post only if user is a member
    });

    setFilteredUserPosts(filtered);
  }, [userPosts, groups, user, isMe])

  const viewingUser = otherUser || user
  const profilePicture = viewingUser?.profilePicture ? `http://localhost:3000/${viewingUser.profilePicture}` : "https://via.placeholder.com/80";

  const handleChangePicture = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingPic(true)
      const res = await apiUpdateMe({ profilePicture: file })
      if (res?.data?.user) {
        // update context user
        if (typeof setUser === 'function') setUser(res.data.user)
      }
    } finally {
      setUploadingPic(false)
    }
  }
  
  return (
    <div className="container-fluid profile-page py-53">
      <h2 className="fw-bold mb-3">{otherUser ? `${viewingUser?.name || ''}'s Profile` : "Your Profile"}</h2>
      {loadingUser ? (
        <ProfileSkeleton />
      ) : (
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
                {!otherUser && (
                  <>
                    <input id="profilePicInput" type="file" accept="image/*" className="d-none" onChange={handleChangePicture} />
                    <button disabled={uploadingPic} className="btn btn-light btn-sm rounded-3 position-absolute upload-btn" onClick={() => document.getElementById('profilePicInput')?.click()}>
                      <FiCamera className="me-2" /> {uploadingPic ? 'Uploading...' : 'Upload Photo'}
                    </button>
                  </>
                )}
              </div>
              <div className="small text-muted mb-2">Must be a .jpg or .png file smaller than 5MB</div>
              <h5 className="mb-1">{viewingUser?.name}</h5>
              <p className="text-muted mb-0 small w-100 w-md-75">
                Passionate explorer of Pakistani culture and hidden gems. Sharing my journey, one discovery at a time.
              </p>
            </div>
          </div>
          {/* Personal Information or Actions */}
          {otherUser ? (
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <div className="d-flex gap-2 align-items-center">
                  {!isFriend && !requestSent && !requestReceived && (
                    <button className="btn btn-primary" disabled={friendActionLoading} onClick={handleAddFriend}>Add Friend</button>
                  )}
                  {requestSent && (
                    <button className="btn btn-outline-danger" disabled={friendActionLoading} onClick={handleCancelRequest}>Cancel Request</button>
                  )}
                  {requestReceived && (
                    <>
                      <button className="btn btn-success" disabled={friendActionLoading} onClick={handleAccept}>Accept</button>
                      <button className="btn btn-outline-secondary" disabled={friendActionLoading} onClick={handleDecline}>Decline</button>
                    </>
                  )}
                  {isFriend && (
                    <>
                      <button className="btn btn-outline-danger" disabled={friendActionLoading} onClick={handleUnfriend}>Unfriend</button>
                      <Link to={`/chats?user=${otherUser._id}`} className="btn btn-outline-secondary">Message</Link>
                    </>
                  )}
                  {!isFriend && !requestSent && !requestReceived && (
                    <button className="btn btn-secondary" disabled title="Only friends can message">Message</button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Personal Information</h6>
                <div className="mb-3">
                  <label className="form-label">Name (Required)*</label>
                  <input className="form-control" defaultValue={viewingUser?.name || ""} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Location</label>
                  <input className="form-control" defaultValue={viewingUser?.shippingAddress?.city || ""} />
                </div>
                <div className="mb-3">
                  <label className="form-label">About Me</label>
                  <textarea className="form-control" rows={4} defaultValue={
                    "I am a passionate explorer of Pakistani culture and hidden gems. Sharing my journey, one discovery at a time, and connecting with fellow travelers."
                  } />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary">Cancel</button>
                  <button className="btn btn-primary">Save Changes</button>
                </div>
              </div>
            </div>
          )}
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
                {(filteredUserPosts.slice(0,5)).map((p) => (
                  <li key={p._id} className="d-flex align-items-start gap-2 py-2 border-bottom last-border-0">
                    <span className="activity-dot mt-1"></span>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between">
                        <span>Posted: {p.text?.slice(0, 60) || 'Photo'}</span>
                        <small className="text-muted">{new Date(p.createdAt).toLocaleDateString()}</small>
                      </div>
                    </div>
                  </li>
                ))}
                {filteredUserPosts.length === 0 ? (
                  <li className="text-muted small">No recent activity yet</li>
                ) : null}
              </ul>
            </div>
          </div>
          {/* Contributions grid */}
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="fw-bold mb-3">{otherUser ? `${viewingUser?.name || ''}'s Posts` : 'My Contributions'}</h6>
              {loadingPosts ? (
                <div className="row g-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="col-12 col-md-6">
                      <div className="card h-100 shadow-sm">
                        <div className="skeleton-image" style={{ width: '100%', height: '180px', borderRadius: '8px 8px 0 0' }}></div>
                        <div className="card-body">
                          <div className="skeleton-text mb-2" style={{ width: '100%', height: '16px' }}></div>
                          <div className="skeleton-text mb-2" style={{ width: '80%', height: '16px' }}></div>
                          <div className="skeleton-text" style={{ width: '60px', height: '12px' }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="row g-3">
                  {filteredUserPosts.map((p) => (
                    <div key={p._id} className="col-12 col-md-6">
                      <div className="card h-100 contribution-card shadow-sm">
                        {p.imageUrl ? (
                          <Link to={`/community/post/${p._id}`}>
                            <img src={p.imageUrl.startsWith('http') ? p.imageUrl : `http://localhost:3000/${p.imageUrl}`} className="card-img-top" alt={p.text?.slice(0,40) || 'Post image'} />
                          </Link>
                        ) : (
                          <Link to={`/community/post/${p._id}`}>
                            <div className="card-img-top d-flex align-items-center justify-content-center bg-light" style={{ height: 180 }}>
                              <span className="text-muted small">Text Post</span>
                            </div>
                          </Link>
                        )}
                        <div className="card-body">
                          <div className="small fw-semibold mb-1" style={{ minHeight: 40 }}>
                            {p.text && p.text.trim().length > 0 ? p.text : '—'}
                          </div>
                          <div className="text-muted xsmall mb-2">{new Date(p.createdAt).toLocaleDateString()}</div>
                          <div className="text-muted small d-flex align-items-center gap-1">
                            <FiHeart className="text-danger" /> {(p.likes || []).length} Likes
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredUserPosts.length === 0 ? (
                    <div className="text-muted small">No posts yet</div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}