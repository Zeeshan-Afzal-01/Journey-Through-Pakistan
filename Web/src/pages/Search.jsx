import React, { useEffect, useMemo, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { searchUsers } from "../api/authApi.jsx";
import { searchPosts } from "../api/postsApi.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  unfriend,
} from "../api/authApi.jsx";
import { listGroups, joinGroup, leaveGroup } from '../api/groupsApi.jsx';
import { UserCardSkeleton, PostCardSkeleton, GroupCardSkeleton } from '../components/SkeletonLoader.jsx';
import { FiUsers, FiLock, FiGlobe, FiTag, FiMapPin } from 'react-icons/fi';
import "../assests/css/skeleton.css";

export default function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  const q = useMemo(() => new URLSearchParams(location.search).get('q') || '', [location.search]);
  const [query, setQuery] = useState(q);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // all | people | posts | places | groups
  const { user } = useAuth();
  const [friendActionLoadingId, setFriendActionLoadingId] = useState("");
  const [groupActionLoadingId, setGroupActionLoadingId] = useState("");
  const [showGroupPreview, setShowGroupPreview] = useState(false);
  const [selectedGroupForPreview, setSelectedGroupForPreview] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => { setQuery(q); }, [q]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!query || query.trim().length === 0) {
        setUsers([]); setPosts([]); setGroups([]); setLoading(false); return;
      }
      try {
        setLoading(true)
        const [u, p, g] = await Promise.all([
          searchUsers(query),
          searchPosts(query),
          listGroups({ search: query })
        ])
        if (mounted) {
          setUsers(u.data || [])
          setPosts(p.data || [])
          setGroups(g.data || [])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [query])

  const filteredUsers = activeTab === 'all' || activeTab === 'people' ? users : [];
  const filteredPosts = (activeTab === 'all' || activeTab === 'posts' || activeTab === 'places')
    ? posts.filter(p => activeTab === 'places' ? Boolean(p.place) : true)
    : [];
  const filteredGroups = activeTab === 'all' || activeTab === 'groups' ? groups : [];

  // helper for friend status
  function friendButton(u) {
    if (!user || u._id === user._id) return null;
    const isFriend = user.friends?.includes(u._id);
    const requestSent = user.sentRequests?.includes(u._id);
    const requestReceived = user.friendRequests?.includes(u._id);
    function setImmed(f) { setUsers(users.map(x => x._id === u._id ? { ...x } : x)); }
    // actions
    const handleAddFriend = async () => { setFriendActionLoadingId(u._id); await sendFriendRequest(u._id); user.sentRequests.push(u._id); setImmed(); setFriendActionLoadingId(""); };
    const handleCancelRequest = async () => { setFriendActionLoadingId(u._id); await cancelFriendRequest(u._id); user.sentRequests = user.sentRequests.filter(x => x !== u._id); setImmed(); setFriendActionLoadingId(""); };
    const handleAccept = async () => { setFriendActionLoadingId(u._id); await acceptFriendRequest(u._id); user.friends.push(u._id); user.friendRequests = user.friendRequests.filter(x => x !== u._id); setImmed(); setFriendActionLoadingId(""); };
    const handleDecline = async () => { setFriendActionLoadingId(u._id); await declineFriendRequest(u._id); user.friendRequests = user.friendRequests.filter(x => x !== u._id); setImmed(); setFriendActionLoadingId(""); };
    const handleUnfriend = async () => { setFriendActionLoadingId(u._id); await unfriend(u._id); user.friends = user.friends.filter(x => x !== u._id); setImmed(); setFriendActionLoadingId(""); };
    // buttons
    if (isFriend)
      return <><button className="btn btn-sm btn-outline-danger" disabled={friendActionLoadingId===u._id} onClick={handleUnfriend}>Unfriend</button> <Link to={`/chats?user=${u._id}`} className="btn btn-sm btn-outline-secondary">Message</Link></>;
    if (requestSent)
      return <button className="btn btn-sm btn-outline-danger" disabled={friendActionLoadingId===u._id} onClick={handleCancelRequest}>Cancel Request</button>;
    if (requestReceived)
      return <><button className="btn btn-sm btn-success" disabled={friendActionLoadingId===u._id} onClick={handleAccept}>Accept</button> <button className="btn btn-sm btn-outline-secondary" disabled={friendActionLoadingId===u._id} onClick={handleDecline}>Decline</button></>;
    return <button className="btn btn-sm btn-primary" disabled={friendActionLoadingId===u._id} onClick={handleAddFriend}>Add Friend</button>;
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-column gap-2 mb-3">
        <input value={query} onChange={(e)=>{ setQuery(e.target.value); navigate(`/search?q=${encodeURIComponent(e.target.value)}`) }} className="form-control" placeholder="Search people, posts, places, groups..." />
        <div className="btn-group">
          <button onClick={()=>setActiveTab('all')} className={`btn btn-light border ${activeTab==='all'?'active':''}`}>All</button>
          <button onClick={()=>setActiveTab('people')} className={`btn btn-light border ${activeTab==='people'?'active':''}`}>People</button>
          <button onClick={()=>setActiveTab('posts')} className={`btn btn-light border ${activeTab==='posts'?'active':''}`}>Posts</button>
          <button onClick={()=>setActiveTab('places')} className={`btn btn-light border ${activeTab==='places'?'active':''}`}>Places</button>
          <button onClick={()=>setActiveTab('groups')} className={`btn btn-light border ${activeTab==='groups'?'active':''}`}><FiUsers className="me-1" />Groups</button>
        </div>
      </div>

      {!query || query.trim().length===0 ? (
        <div className="text-muted small">Type to search people, posts, places, and groups</div>
      ) : loading ? (
        <div className="row g-3">
          {(activeTab === 'all' || activeTab === 'people') && (
            <div className="col-12">
              <div className="card shadow-sm mb-3">
                <div className="card-body">
                  <h6 className="fw-bold mb-2">People</h6>
                  <div className="d-flex flex-column gap-2">
                    {[1, 2, 3].map(i => <UserCardSkeleton key={i} />)}
                  </div>
                </div>
              </div>
            </div>
          )}
          {(activeTab === 'all' || activeTab === 'posts' || activeTab === 'places') && (
            <div className="col-12">
              <div className="card shadow-sm mb-3">
                <div className="card-body">
                  <h6 className="fw-bold mb-2">Posts</h6>
                  <div className="d-flex flex-column gap-2">
                    {[1, 2, 3].map(i => <PostCardSkeleton key={i} />)}
                  </div>
                </div>
              </div>
            </div>
          )}
          {(activeTab === 'all' || activeTab === 'groups') && (
            <div className="col-12">
              <div className="card shadow-sm mb-3">
                <div className="card-body">
                  <h6 className="fw-bold mb-2"><FiUsers className="me-1" />Groups</h6>
                  <div className="d-flex flex-column gap-2">
                    {[1, 2, 3].map(i => <GroupCardSkeleton key={i} />)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="row g-3">
          {(activeTab === 'all' || activeTab === 'people') && filteredUsers.length > 0 && (
            <div className="col-12">
              <div className="card shadow-sm mb-3">
                <div className="card-body">
                  <h6 className="fw-bold mb-2">People</h6>
                  <div className="d-flex flex-column gap-2">
                    {filteredUsers.map(u => (
                      <div key={u._id} className="d-flex align-items-center gap-2" >
                        <img className="rounded-circle" style={{ width: 40, height: 40, objectFit: 'cover' }}  src={u.profilePicture ? `http://localhost:3000/${u.profilePicture}` : '/default-avatar.png'} />
                        <div className="flex-grow-1">
                          <div className="small fw-semibold">{u.name}</div>
                          <div className="xsmall text-muted">{u.email}</div>
                        </div>
                        <Link className="btn btn-sm btn-outline-primary" to={`/profile?userId=${u._id}`}>View</Link>
                        {friendButton(u)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {(activeTab === 'all' || activeTab === 'posts' || activeTab === 'places') && filteredPosts.length > 0 && (
            <div className="col-12">
              <div className="card shadow-sm mb-3">
                <div className="card-body">
                  <h6 className="fw-bold mb-2">{activeTab==='places' ? 'Places' : 'Posts'}</h6>
                  <div className="d-flex flex-column gap-2">
                    {filteredPosts.map(p => (
                      <div key={p._id} className="border rounded p-2">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <img className="rounded-circle" style={{ width: 28, height: 28, objectFit: 'cover' }} src={p.author?.profilePicture ? `http://localhost:3000/${p.author.profilePicture}` : '/default-avatar.png'} />
                          <div className="small">{p.author?.name} {p.place ? `• ${p.place}` : ''}</div>
                        </div>
                        <div className="small mb-1">{p.text}</div>
                        {p.imageUrl && (
                          <Link to={`/community/post/${p._id}`}>
                            <img style={{ maxWidth: '100%', height: 'auto' }} src={p.imageUrl.startsWith('http') ? p.imageUrl : `http://localhost:3000/${p.imageUrl}`} />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {(activeTab === 'all' || activeTab === 'groups') && filteredGroups.length > 0 && (
            <div className="col-12">
              <div className="card shadow-sm mb-3">
                <div className="card-body">
                  <h6 className="fw-bold mb-2"><FiUsers className="me-1" />Groups</h6>
                  <div className="d-flex flex-column gap-2">
                    {filteredGroups.map(g => {
                      const isMember = user?._id && (g.members?.some(m => (m._id || m) === user._id) || g.admin?._id === user._id || (typeof g.admin === 'string' && g.admin === user._id));
                      const handleJoinLeave = async () => {
                        try {
                          setGroupActionLoadingId(g._id);
                          if (isMember) {
                            await leaveGroup(g._id);
                            setGroups(groups.map(gr => gr._id === g._id ? { ...gr, members: gr.members?.filter(m => (m._id || m) !== user._id) || [] } : gr));
                          } else {
                            await joinGroup(g._id);
                            setGroups(groups.map(gr => gr._id === g._id ? { ...gr, members: [...(gr.members || []), user._id] } : gr));
                          }
                        } catch (e) {
                          showNotification(e?.response?.data?.message || "Failed to update group membership", 'error');
                        } finally {
                          setGroupActionLoadingId("");
                        }
                      };
                      const hasRequested = user?._id && g.pendingRequests?.some(r => (r._id || r) === user._id);
                      const handleGroupClick = () => {
                        if (g.privacy === 'private' && !isMember && !hasRequested && (typeof g.admin === 'string' ? g.admin !== user?._id : g.admin?._id !== user?._id)) {
                          setSelectedGroupForPreview(g);
                          setShowGroupPreview(true);
                        } else {
                          navigate(`/group/${g._id}`);
                        }
                      };
                      return (
                        <div key={g._id} className="d-flex align-items-center gap-2 border rounded p-2">
                          <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ cursor: 'pointer' }} onClick={handleGroupClick}>
                            <FiUsers size={24} className="text-primary" />
                            <div>
                              <div className="small fw-semibold">{g.name}</div>
                              <div className="xsmall text-muted">
                                {g.members?.length || 0} members
                                {g.category && ` • ${g.category}`}
                                {g.location && ` • ${g.location}`}
                              </div>
                              {g.description && <div className="xsmall text-muted mt-1">{g.description.slice(0, 100)}</div>}
                            </div>
                          </div>
                          <button 
                            className="btn btn-sm btn-outline-primary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinLeave();
                            }}
                            disabled={groupActionLoadingId === g._id}
                          >
                            {groupActionLoadingId === g._id ? '...' : (isMember ? 'Leave' : hasRequested ? 'Requested' : g.privacy === 'private' ? 'Request' : 'Join')}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
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
                  setGroupActionLoadingId(selectedGroupForPreview._id);
                  await joinGroup(selectedGroupForPreview._id);
                  showNotification("Join request sent! Admin will review it.", 'success');
                  setGroups(groups.map(g => g._id === selectedGroupForPreview._id ? { ...g, pendingRequests: [...(g.pendingRequests || []), user._id] } : g));
                  setShowGroupPreview(false);
                } catch (err) {
                  showNotification(err?.response?.data?.message || "Failed to send request", 'error');
                } finally {
                  setGroupActionLoadingId("");
                }
              }}
              isJoining={groupActionLoadingId === selectedGroupForPreview._id}
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
          {((activeTab === 'all' && filteredUsers.length === 0 && filteredPosts.length === 0 && filteredGroups.length === 0) ||
            (activeTab === 'people' && filteredUsers.length === 0) ||
            ((activeTab === 'posts' || activeTab === 'places') && filteredPosts.length === 0) ||
            (activeTab === 'groups' && filteredGroups.length === 0)) && (
            <div className="col-12">
              <div className="text-center text-muted py-4">
                No {activeTab === 'all' ? 'results' : activeTab} found for "{query}"
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


