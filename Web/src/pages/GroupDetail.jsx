import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getGroup, joinGroup, leaveGroup, getGroupPosts, updateGroupCover, updateGroupPhoto, updateGroup, addMember, removeMember, approveJoinRequest, declineJoinRequest, deleteGroup } from '../api/groupsApi.jsx';
import { createPost, toggleLike, addComment, updatePost, deletePost } from '../api/postsApi.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { searchUsers } from '../api/authApi.jsx';
import { FiUsers, FiLock, FiGlobe, FiSettings, FiPlus, FiX, FiHeart, FiMessageSquare, FiShare2, FiBookmark, FiMapPin, FiTag, FiCamera, FiEdit2, FiTrash2, FiCheck, FiXCircle, FiMoreHorizontal } from 'react-icons/fi';
import '../assests/css/group-detail.css';
import '../assests/css/community.css';
import { GroupDetailSkeleton, PostCardSkeleton } from '../components/SkeletonLoader.jsx';

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  useEffect(() => {
    // Only load posts if group exists AND user is a member (modal should not be showing)
    if (group && !showPreviewModal) {
      const userIdStr = user?._id ? String(user._id) : null;
      if (userIdStr) {
        const adminId = group?.admin?._id || group?.admin;
        const adminIdStr = adminId ? String(adminId) : null;
        const isAdmin = adminIdStr === userIdStr;
        const isMember = isAdmin || (group?.members?.some(m => {
          const memberId = m?._id || m;
          return memberId ? String(memberId) === userIdStr : false;
        }) || false);
        
        // Only load posts if user is a member or group is public
        if (isMember || group.privacy === 'public') {
          loadGroupPosts();
        }
      } else if (group.privacy === 'public') {
        // Public group, load posts even if not logged in
        loadGroupPosts();
      }
    }
  }, [group, showPreviewModal, user]);

  const loadGroup = async () => {
    try {
      setLoading(true);
      const { data } = await getGroup(groupId);
      
      if (!user?._id) {
        // User not logged in
        setGroup(data);
        if (data?.privacy === 'private') {
          setShowPreviewModal(true);
          setLoading(false);
          return;
        }
        return; // Public group, continue loading
      }

      // Check if user can access this private group
      // Handle both populated members (objects) and IDs (strings)
      const userIdStr = String(user._id);
      const adminId = data?.admin?._id || data?.admin;
      const adminIdStr = adminId ? String(adminId) : null;
      
      const isAdmin = adminIdStr === userIdStr;
      
      // Check membership - handle both populated and non-populated members array
      let isMember = isAdmin;
      if (!isMember && data?.members && Array.isArray(data.members)) {
        isMember = data.members.some(m => {
          if (!m) return false;
          // Handle both object with _id and direct ID
          const memberId = (m._id || m);
          if (!memberId) return false;
          return String(memberId) === userIdStr;
        });
      }
      
      const hasRequested = data?.pendingRequests?.some(r => {
        if (!r) return false;
        const reqId = r?._id || r;
        return reqId ? String(reqId) === userIdStr : false;
      }) || false;
      
      // Set group data first
      setGroup(data);
      
      // Only show preview modal for private groups if user is NOT a member and has NOT requested
      if (data?.privacy === 'private' && !isMember && !hasRequested) {
        setShowPreviewModal(true);
        setLoading(false);
        return; // Don't load posts for non-members
      }
      
      // If user is a member or public group, ensure modal is closed and continue normally
      setShowPreviewModal(false);
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Failed to load group";
      if (err?.response?.status === 403) {
        // User doesn't have access (not a member of private group)
        // Try to fetch group info from listGroups for preview modal
        try {
          const allGroups = await (await import('../api/groupsApi.jsx')).listGroups({});
          const groupData = allGroups.data?.find(g => g._id === groupId);
          if (groupData) {
            setGroup(groupData);
            setShowPreviewModal(true);
            setLoading(false);
            return;
          }
        } catch (e) {
          // If that fails, show error and redirect
          setNotification({ show: true, message: errorMsg, type: 'error' });
          setTimeout(() => navigate('/community'), 2000);
          setLoading(false);
          return;
        }
      } else {
        setNotification({ show: true, message: errorMsg, type: 'error' });
        setTimeout(() => navigate('/community'), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  const loadGroupPosts = async () => {
    try {
      setPostsLoading(true);
      const { data } = await getGroupPosts(groupId);
      setPosts(data || []);
    } catch (err) {
      console.error("Failed to load group posts", err);
    } finally {
      setPostsLoading(false);
    }
  };

  // Robust membership check for rendering
  const userIdStr = user?._id ? String(user._id) : null;
  const adminId = group?.admin?._id || group?.admin;
  const adminIdStr = adminId ? String(adminId) : null;
  const isAdmin = userIdStr && adminIdStr === userIdStr;
  const isMember = isAdmin || (userIdStr && group?.members?.some(m => {
    if (!m) return false;
    const memberId = (m._id || m);
    return memberId ? String(memberId) === userIdStr : false;
  }) || false);
  const hasRequested = userIdStr && (group?.pendingRequests?.some(r => {
    if (!r) return false;
    const reqId = r?._id || r;
    return reqId ? String(reqId) === userIdStr : false;
  }) || false);

  const handleJoinLeave = async () => {
    if (isAdmin) {
      setShowManageModal(true);
      return;
    }
    try {
      setIsJoining(true);
      if (isMember) {
        await leaveGroup(groupId);
        await loadGroup();
      } else {
        await joinGroup(groupId);
        await loadGroup(); // Reload to check if request was sent or joined
        if (group?.privacy === 'public') {
          loadGroupPosts(); // Reload posts after joining public group
        }
      }
    } catch (err) {
      showNotification(err?.response?.data?.message || "Failed to update group membership", 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handleUpdateCover = async (file) => {
    try {
      const { data } = await updateGroupCover(groupId, file);
      setGroup(data);
    } catch (err) {
      showNotification(err?.response?.data?.message || "Failed to update cover", 'error');
    }
  };

  const handleUpdatePhoto = async (file) => {
    try {
      const { data } = await updateGroupPhoto(groupId, file);
      setGroup(data);
    } catch (err) {
      showNotification(err?.response?.data?.message || "Failed to update photo", 'error');
    }
  };

  const handleCreatePost = async (formData) => {
    try {
      setShowCreatePost(false);
      await loadGroupPosts(); // Reload posts
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to create post");
    }
  };

  if (loading) {
    return <GroupDetailSkeleton />;
  }

  if (!group) return null;

  return (
    <div className="group-detail-page">
      {/* Cover Section */}
      <div className="group-cover-container">
        <div 
          className="group-cover" 
          style={{
            backgroundImage: group.coverImage 
              ? `url(http://localhost:3000/${group.coverImage})` 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        {isAdmin && (
          <label className="group-cover-edit-btn" title="Change Cover Photo">
            <FiCamera size={20} />
            <input 
              type="file" 
              accept="image/*" 
              className="d-none" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpdateCover(file);
              }} 
            />
          </label>
        )}
        <div className="group-cover-overlay">
          <div className="container">
            <div className="group-header-info">
              <div className="group-avatar-large position-relative">
                {group.groupPhoto ? (
                  <img 
                    src={`http://localhost:3000/${group.groupPhoto}`} 
                    alt={group.name}
                    className="rounded"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <FiUsers size={48} />
                )}
                {isAdmin && (
                  <label className="group-photo-edit-btn" title="Change Group Photo">
                    <FiCamera size={16} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="d-none" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpdatePhoto(file);
                      }} 
                    />
                  </label>
                )}
              </div>
              <div className="group-header-text">
                <h1 className="group-name">{group.name}</h1>
                <div className="group-meta">
                  <span className="group-privacy">
                    {group.privacy === 'public' ? <FiGlobe size={16} /> : <FiLock size={16} />}
                    {group.privacy === 'public' ? ' Public' : ' Private'} Group
                  </span>
                  <span className="group-member-count">
                    <FiUsers size={16} /> {group.members?.length || 0} members
                  </span>
                </div>
              </div>
              <div className="group-header-actions">
                {isAdmin ? (
                  <button className="btn btn-light" onClick={() => setShowManageModal(true)}>
                    <FiSettings size={18} className="me-2" /> Manage Group
                  </button>
                ) : hasRequested ? (
                  <button className="btn btn-outline-light" disabled>
                    Request Sent
                  </button>
                ) : (
                  <button 
                    className={`btn ${isMember ? 'btn-outline-light' : 'btn-primary'}`}
                    onClick={handleJoinLeave}
                    disabled={isJoining}
                  >
                    {isJoining ? '...' : (isMember ? 'Joined' : group.privacy === 'private' ? 'Request to Join' : 'Join Group')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid">
        <div className="row g-3 mt-3">
          {/* Left Sidebar */}
          <div className="col-12 col-lg-3">
            <div className="group-sidebar">
              <div className="card shadow-sm mb-3">
                <div className="card-body">
                  <h6 className="fw-bold mb-3">About</h6>
                  {group.description && (
                    <p className="small text-muted mb-3">{group.description}</p>
                  )}
                  <div className="group-info-list">
                    {group.category && (
                      <div className="group-info-item">
                        <FiTag size={16} />
                        <span>{group.category}</span>
                      </div>
                    )}
                    {group.location && (
                      <div className="group-info-item">
                        <FiMapPin size={16} />
                        <span>{group.location}</span>
                      </div>
                    )}
                    <div className="group-info-item">
                      <FiUsers size={16} />
                      <span>{group.members?.length || 0} members</span>
                    </div>
                    <div className="group-info-item">
                      {group.privacy === 'public' ? <FiGlobe size={16} /> : <FiLock size={16} />}
                      <span>{group.privacy === 'public' ? 'Public' : 'Private'} Group</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card shadow-sm">
                <div className="card-body">
                  <h6 className="fw-bold mb-3">Members</h6>
                  <div className="group-members-preview">
                    {group.members?.slice(0, 8).map((member, idx) => (
                      <div key={idx} className="member-avatar" title={member?.name || 'Member'}>
                        {member?.profilePicture ? (
                          <img 
                            src={`http://localhost:3000/${member.profilePicture}`} 
                            alt={member?.name || 'Member'}
                            className="rounded-circle"
                          />
                        ) : (
                          <div className="member-avatar-placeholder">
                            {(member?.name || 'M')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))}
                    {group.members?.length > 8 && (
                      <div className="member-avatar member-count">
                        +{group.members.length - 8}
                      </div>
                    )}
                  </div>
                  <button className="btn btn-sm btn-outline-primary w-100 mt-3">
                    See All Members
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-12 col-lg-6">
            {isMember && (
              <div className="card shadow-sm mb-3">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <img 
                      className="rounded-circle" 
                      src={user?.profilePicture ? `http://localhost:3000/${user.profilePicture}` : '/default-avatar.png'} 
                      alt={user?.name}
                      style={{ width: 40, height: 40 }}
                    />
                    <div 
                      className="flex-grow-1 bg-light rounded-pill px-3 py-2"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowCreatePost(true)}
                    >
                      <span className="text-muted">Write something to this group...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showCreatePost && (
              <CreatePostModal 
                group={group}
                currentUser={user}
                onPost={handleCreatePost}
                onClose={() => setShowCreatePost(false)}
              />
            )}

            {postsLoading ? (
              <>
                {[1, 2, 3].map(i => <PostCardSkeleton key={i} />)}
              </>
            ) : posts.length === 0 ? (
              <div className="card shadow-sm">
                <div className="card-body text-center py-5">
                  <FiMessageSquare size={48} className="text-muted mb-3" />
                  <p className="text-muted">No posts yet. Be the first to share!</p>
                </div>
              </div>
            ) : (
              posts.map(post => (
                <GroupPostCard
                  key={post._id}
                  post={post}
                  group={group}
                  onToggleLike={async () => {
                    const { data } = await toggleLike(post._id);
                    setPosts(posts.map(p => p._id === data._id ? data : p));
                  }}
                  onAddComment={async (post, text, parentCommentId) => {
                    const { data } = await addComment(post._id, text, parentCommentId);
                    setPosts(posts.map(p => p._id === data._id ? data : p));
                  }}
                  onPostUpdate={(updatedPost) => {
                    setPosts(posts.map(p => p._id === updatedPost._id ? updatedPost : p));
                  }}
                  onPostDelete={(postId) => {
                    setPosts(posts.filter(p => p._id !== postId));
                    showNotification("Post deleted successfully", 'success');
                  }}
                  onError={(msg) => showNotification(msg, 'error')}
                />
              ))
            )}
          </div>

          {/* Right Sidebar */}
          <div className="col-12 col-lg-3">
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Group Rules</h6>
                {group.rules && group.rules.length > 0 ? (
                  <ul className="list-unstyled small">
                    {group.rules.map((rule, idx) => (
                      <li key={idx} className="mb-2">
                        <span className="badge bg-light text-dark me-2">{idx + 1}</span>
                        {rule}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted small">No rules set yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showManageModal && (
        <ManageGroupModal 
          group={group}
          user={user}
          onClose={() => {
            setShowManageModal(false);
            loadGroup();
          }}
          onGroupUpdate={loadGroup}
        />
      )}

      {showPreviewModal && group && (
        <GroupPreviewModal
          group={group}
          user={user}
          onClose={() => {
            // Check if user is actually a member before navigating away
            const userIdStr = user?._id ? String(user._id) : null;
            let shouldNavigate = true;
            
            if (userIdStr && group) {
              const adminId = group?.admin?._id || group?.admin;
              const adminIdStr = adminId ? String(adminId) : null;
              const isAdmin = adminIdStr === userIdStr;
              const isMember = isAdmin || (group?.members?.some(m => {
                const memberId = m?._id || m;
                return memberId ? String(memberId) === userIdStr : false;
              }) || false);
              
              // If user is a member, just close modal, don't navigate
              if (isMember) {
                setShowPreviewModal(false);
                shouldNavigate = false;
              }
            }
            
            // Only navigate if user is not a member
            if (shouldNavigate) {
              setShowPreviewModal(false);
              navigate('/community');
            }
          }}
          onJoinRequest={async () => {
            try {
              setIsJoining(true);
              await joinGroup(groupId);
              await loadGroup();
              showNotification("Join request sent! Admin will review it.", 'success');
            } catch (err) {
              showNotification(err?.response?.data?.message || "Failed to send request", 'error');
            } finally {
              setIsJoining(false);
            }
          }}
          isJoining={isJoining}
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
                  <h6 className="fw-bold mb-2">Rules</h6>
                  <ul className="list-unstyled small">
                    {group.rules.slice(0, 3).map((rule, idx) => (
                      <li key={idx} className="mb-1">
                        <span className="badge bg-light text-dark me-2">{idx + 1}</span>
                        {rule}
                      </li>
                    ))}
                    {group.rules.length > 3 && (
                      <li className="text-muted small">+{group.rules.length - 3} more rules</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="alert alert-info mb-0">
                <FiLock className="me-2" />
                This is a private group. You need to request to join and wait for admin approval.
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
            {isAdmin ? (
              <button className="btn btn-primary" onClick={onClose}>
                Manage Group
              </button>
            ) : isMember ? (
              <button className="btn btn-success" disabled>
                Already a Member
              </button>
            ) : hasRequested ? (
              <button className="btn btn-outline-primary" disabled>
                Request Sent
              </button>
            ) : (
              <button 
                className="btn btn-primary" 
                onClick={onJoinRequest}
                disabled={isJoining}
              >
                {isJoining ? 'Sending Request...' : 'Request to Join'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ManageGroupModal({ group, user, onClose, onGroupUpdate }) {
  const [activeTab, setActiveTab] = useState('settings');
  const [name, setName] = useState(group.name || '');
  const [description, setDescription] = useState(group.description || '');
  const [privacy, setPrivacy] = useState(group.privacy || 'public');
  const [category, setCategory] = useState(group.category || '');
  const [location, setLocation] = useState(group.location || '');
  const [rules, setRules] = useState(group.rules?.join('\n') || '');
  const [saving, setSaving] = useState(false);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [removingMember, setRemovingMember] = useState('');

  useEffect(() => {
    if (activeTab === 'members' && user?.friends) {
      loadFriends();
    }
  }, [activeTab, user]);

  const loadFriends = async () => {
    try {
      const { data } = await searchUsers('');
      const myFriends = data?.filter(u => user?.friends?.includes(u._id) && !group.members?.some(m => (m._id || m) === u._id)) || [];
      setFriends(myFriends);
    } catch (err) {
      console.error("Failed to load friends", err);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const rulesArray = rules.split('\n').filter(r => r.trim());
      await updateGroup(group._id, { name, description, privacy, category, location, rules: rulesArray });
      onGroupUpdate();
      onClose();
    } catch (err) {
      // Use a simple notification - we'll create a better notification system
      const msg = err?.response?.data?.message || "Failed to update group";
      console.error(msg);
      // For now, we'll show alert but user asked not to use it, so we'll use console.error
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (friendId) => {
    try {
      setAddingMember(friendId);
      await addMember(group._id, friendId);
      onGroupUpdate();
      loadFriends();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      setRemovingMember(memberId);
      await removeMember(group._id, memberId);
      onGroupUpdate();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to remove member");
    } finally {
      setRemovingMember('');
    }
  };

  const handleApproveRequest = async (userId) => {
    try {
      await approveJoinRequest(group._id, userId);
      onGroupUpdate();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to approve request");
    }
  };

  const handleDeclineRequest = async (userId) => {
    try {
      await declineJoinRequest(group._id, userId);
      onGroupUpdate();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to decline request");
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;
    try {
      await deleteGroup(group._id);
      alert("Group deleted successfully");
      window.location.href = '/community';
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete group");
    }
  };

  const filteredFriends = friends.filter(f => 
    f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMembers = (group.members || []).filter(m => {
    const member = typeof m === 'object' ? m : { name: '', email: '' };
    return member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           member.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Manage Group</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <ul className="nav nav-tabs mb-3">
              <li className="nav-item">
                <button className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                  Settings
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
                  Members ({group.members?.length || 0})
                </button>
              </li>
              {group.privacy === 'private' && (
                <li className="nav-item">
                  <button className={`nav-link ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
                    Requests ({group.pendingRequests?.length || 0})
                  </button>
                </li>
              )}
            </ul>

            {activeTab === 'settings' && (
              <div className="d-flex flex-column gap-3">
                <div>
                  <label className="form-label">Group Name *</label>
                  <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <label className="form-label">Privacy</label>
                    <select className="form-select" value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
                      <option value="public">Public (Anyone can join)</option>
                      <option value="private">Private (Admin approval required)</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Category</label>
                    <input type="text" className="form-control" value={category} onChange={(e) => setCategory(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Location</label>
                  <input type="text" className="form-control" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Group Rules (one per line)</label>
                  <textarea className="form-control" rows="4" value={rules} onChange={(e) => setRules(e.target.value)} placeholder="Rule 1&#10;Rule 2&#10;..." />
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="d-flex flex-column gap-3">
                <div>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search members or friends..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <h6>Add Friends</h6>
                  <div className="d-flex flex-column gap-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {filteredFriends.length === 0 ? (
                      <p className="text-muted small">No friends to add</p>
                    ) : (
                      filteredFriends.map(f => (
                        <div key={f._id} className="d-flex align-items-center justify-content-between border rounded p-2">
                          <div className="d-flex align-items-center gap-2">
                            <img 
                              src={f.profilePicture ? `http://localhost:3000/${f.profilePicture}` : '/default-avatar.png'} 
                              className="rounded-circle"
                              style={{ width: 32, height: 32 }}
                            />
                            <div>
                              <div className="small fw-semibold">{f.name}</div>
                              <div className="xsmall text-muted">{f.email}</div>
                            </div>
                          </div>
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => handleAddMember(f._id)}
                            disabled={addingMember === f._id}
                          >
                            {addingMember === f._id ? '...' : 'Add'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <h6>Members</h6>
                  <div className="d-flex flex-column gap-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {filteredMembers.map(m => {
                      const member = typeof m === 'object' ? m : { _id: m, name: 'Member', profilePicture: null };
                      const isAdminMember = (member._id || member) === group.admin?._id || (typeof group.admin === 'string' && group.admin === member._id);
                      return (
                        <div key={member._id || member} className="d-flex align-items-center justify-content-between border rounded p-2">
                          <div className="d-flex align-items-center gap-2">
                            <img 
                              src={member.profilePicture ? `http://localhost:3000/${member.profilePicture}` : '/default-avatar.png'} 
                              className="rounded-circle"
                              style={{ width: 32, height: 32 }}
                            />
                            <div>
                              <div className="small fw-semibold">
                                {member.name || 'Member'}
                                {isAdminMember && <span className="badge bg-primary ms-2">Admin</span>}
                              </div>
                            </div>
                          </div>
                          {!isAdminMember && (
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRemoveMember(member._id || member)}
                              disabled={removingMember === (member._id || member)}
                            >
                              {removingMember === (member._id || member) ? '...' : 'Remove'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'requests' && group.privacy === 'private' && (
              <div className="d-flex flex-column gap-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {group.pendingRequests?.length === 0 ? (
                  <p className="text-muted small">No pending requests</p>
                ) : (
                  group.pendingRequests.map(req => {
                    const requester = typeof req === 'object' ? req : { _id: req, name: 'User', profilePicture: null };
                    return (
                      <div key={requester._id || requester} className="d-flex align-items-center justify-content-between border rounded p-3">
                        <div className="d-flex align-items-center gap-2">
                          <img 
                            src={requester.profilePicture ? `http://localhost:3000/${requester.profilePicture}` : '/default-avatar.png'} 
                            className="rounded-circle"
                            style={{ width: 40, height: 40 }}
                          />
                          <div>
                            <div className="fw-semibold">{requester.name || 'User'}</div>
                            <Link to={`/profile?userId=${requester._id || requester}`} className="text-primary small">
                              View Profile
                            </Link>
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          <button 
                            className="btn btn-sm btn-success"
                            onClick={() => handleApproveRequest(requester._id || requester)}
                          >
                            <FiCheck /> Approve
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeclineRequest(requester._id || requester)}
                          >
                            <FiXCircle /> Decline
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-danger" onClick={handleDeleteGroup}>
              <FiTrash2 className="me-2" /> Delete Group
            </button>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility to render text with clickable hashtags
function renderWithHashtags(text, onHashtagClick) {
  if (!text) return null;
  const regex = /(^|\s)(#\w{2,})/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    segments.push({ type: 'hashtag', content: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return (
    <>
      {segments.map((seg, idx) =>
        seg.type === 'hashtag' ? (
          <span
            key={idx}
            onClick={() => onHashtagClick?.(seg.content)}
            style={{ color: '#1877f2', cursor: 'pointer', fontWeight: 500 }}
          >
            {seg.content}
          </span>
        ) : (
          <span key={idx}>{seg.content}</span>
        )
      )}
    </>
  );
}

function GroupPostCard({ post, onToggleLike, onAddComment, onPostUpdate, onPostDelete, group, onError }) {
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

  const handleLocalAddComment = async (p, text, reset, parentCommentId) => {
    setCommentError("");
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onAddComment(p, text, parentCommentId);
      if (reset) reset();
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
      onError?.(err?.response?.data?.message || "Failed to delete post");
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
          <img 
            className="rounded-circle comm-avatar" 
            src={post.author?.profilePicture ? `http://localhost:3000/${post.author.profilePicture}` : "/default-avatar.png"} 
            alt={post.author?.name || "User"}
            style={{ width: 40, height: 40, objectFit: 'cover' }}
          />
          <div className="flex-grow-1">
            <div className="fw-semibold small">{post.author?.name || "Unknown"}</div>
            <div className="text-muted xsmall">
              {time} • {post.author?.city || "Pakistan"}
              {group && (
                <span className="ms-2">
                  <FiUsers size={12} className="d-inline me-1" />
                  <Link to={`/group/${group._id || group}`} className="text-primary text-decoration-none">
                    {typeof group === 'object' ? group.name : 'Group'}
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
        <p className="mb-2">{renderWithHashtags(post.text)}</p>
        {post.imageUrl && (
          isGif ? (
            <div className="rounded overflow-hidden mb-2">
              <Link to={`/community/post/${post._id}`}>
                <img 
                  style={{ width: '100%', height: 'auto' }} 
                  src={post.imageUrl.startsWith('http') ? post.imageUrl : `http://localhost:3000/${post.imageUrl}`} 
                  alt="post" 
                />
              </Link>
            </div>
          ) : (
            <div className="ratio ratio-16x9 rounded overflow-hidden mb-2">
              <Link to={`/community/post/${post._id}`}>
                <img 
                  className="object-fit-cover" 
                  src={post.imageUrl.startsWith('http') ? post.imageUrl : `http://localhost:3000/${post.imageUrl}`} 
                  alt="post" 
                />
              </Link>
            </div>
          )
        )}
        {(post.place || post.feeling) && (
          <div className="text-muted xsmall mb-2">
            {post.place && (
              <span className="me-2">
                <FiMapPin className="me-1" size={14} />
                {post.place}
              </span>
            )}
            {post.feeling && <span className="me-2">{post.feeling}</span>}
          </div>
        )}
        <div className="d-flex gap-3 text-muted small">
          <button 
            type="button" 
            onClick={() => onToggleLike?.(post)} 
            className="btn btn-link p-0 text-decoration-none d-inline-flex align-items-center gap-1"
          >
            <FiHeart 
              color={hasLiked ? '#dc3545' : undefined} 
              fill={hasLiked ? '#dc3545' : 'none'} 
              style={{ fontWeight: hasLiked ? 'bold' : 'normal' }}
            />
            {' '}{likeCount}
          </button>
          <button 
            type="button" 
            onClick={() => setShowComments(v => !v)} 
            className="btn btn-link p-0 text-decoration-none text-muted d-inline-flex align-items-center gap-1"
          >
            <FiMessageSquare /> {commentCount}
          </button>
          <button 
            type="button" 
            className="btn btn-link p-0 text-decoration-none text-muted d-inline-flex align-items-center gap-1 ms-auto"
          >
            <FiBookmark /> Save
          </button>
        </div>
        {showComments && (
          <div className="mt-3">
            <div className="d-flex flex-column gap-2">
              <GroupCommentThread
                comments={post.comments}
                onReply={cid => { setReplyingId(cid); setReplyText(''); }}
                replyingId={replyingId}
                replyText={replyText}
                onReplyText={e => setReplyText(e.target.value)}
                onSubmitReply={cid => handleLocalAddComment(post, replyText, () => { setReplyText(''); setReplyingId(null); }, cid)}
                submitting={submitting}
              />
              <div className="d-flex align-items-center gap-2">
                <input 
                  className="form-control form-control-sm" 
                  placeholder="Write a comment..." 
                  value={commentText} 
                  onChange={e => setCommentText(e.target.value)} 
                  onKeyDown={e => { 
                    if (e.key === 'Enter') { 
                      handleLocalAddComment(post, commentText, () => setCommentText('')); 
                    } 
                  }} 
                />
                <button 
                  disabled={!commentText.trim() || submitting} 
                  className="btn btn-primary btn-sm" 
                  onClick={() => handleLocalAddComment(post, commentText, () => setCommentText(''))}
                >
                  Comment
                </button>
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
              onError?.(err?.response?.data?.message || "Failed to update post");
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
      // Error handled by parent's onUpdate callback
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

function GroupCommentThread({ comments, onReply, replyingId, replyText, onReplyText, onSubmitReply, submitting }) {
  if (!comments) return null;
  return (
    <div className="d-flex flex-column gap-2 ms-4">
      {comments.map((c) => (
        <div key={c._id} className="mb-2">
          <div className="d-flex align-items-start gap-2">
            <img 
              className="rounded-circle" 
              src={c.author?.profilePicture ? `http://localhost:3000/${c.author.profilePicture}` : '/default-avatar.png'} 
              alt={c.author?.name || 'User'} 
              style={{ width: 28, height: 28, objectFit: 'cover' }} 
            />
            <div className="bg-light rounded px-2 py-1 flex-grow-1">
              <div className="small">
                <span className="fw-semibold">{c.author?.name || 'User'}</span>{' '}
                <span className="text-muted">{new Date(c.createdAt).toLocaleString?.() || ''}</span>
              </div>
              <div className="small">{c.text}</div>
              <button 
                className="btn btn-link btn-sm p-0" 
                style={{ fontSize: '0.9em' }} 
                onClick={() => onReply(c._id)}
              >
                Reply
              </button>
              {replyingId === c._id && (
                <div className="d-flex align-items-center gap-2 mt-1">
                  <input 
                    className="form-control form-control-sm" 
                    style={{ maxWidth: 180 }} 
                    placeholder="Write a reply..." 
                    value={replyText} 
                    onChange={onReplyText} 
                    onKeyDown={(e) => { if (e.key === 'Enter') onSubmitReply(c._id); }} 
                  />
                  <button 
                    disabled={!replyText.trim() || submitting} 
                    className="btn btn-primary btn-sm" 
                    onClick={() => onSubmitReply(c._id)}
                  >
                    Reply
                  </button>
                </div>
              )}
            </div>
          </div>
          {c.replies && c.replies.length > 0 && (
            <GroupCommentThread 
              comments={c.replies} 
              onReply={onReply} 
              replyingId={replyingId} 
              replyText={replyText} 
              onReplyText={onReplyText} 
              onSubmitReply={onSubmitReply} 
              submitting={submitting}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function CreatePostModal({ group, currentUser, onPost, onClose }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    if (!text.trim() && !file) return;
    setSubmitting(true);
    try {
      await createPost({ text, file, group: group._id });
      onPost?.();
      setText("");
      setFile(null);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create Post in {group.name}</h5>
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
            {previewUrl && (
              <div className="position-relative mb-3">
                <img src={previewUrl} alt="Preview" className="img-fluid rounded" />
                <button 
                  className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2"
                  onClick={() => setFile(null)}
                >
                  <FiX />
                </button>
              </div>
            )}
            <div className="d-flex gap-2">
              <label className="btn btn-outline-primary btn-sm">
                <FiPlus className="me-1" /> Photo
                <input type="file" accept="image/*" className="d-none" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleSubmit}
              disabled={(!text.trim() && !file) || submitting}
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

