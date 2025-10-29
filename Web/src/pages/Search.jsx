import React, { useEffect, useMemo, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { searchUsers } from "../api/authApi.jsx";
import { searchPosts } from "../api/postsApi.jsx";

export default function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  const q = useMemo(() => new URLSearchParams(location.search).get('q') || '', [location.search]);
  const [query, setQuery] = useState(q);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // all | people | posts | places

  useEffect(() => { setQuery(q); }, [q]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!query || query.trim().length === 0) {
        setUsers([]); setPosts([]); setLoading(false); return;
      }
      try {
        setLoading(true)
        const [u, p] = await Promise.all([
          searchUsers(query),
          searchPosts(query)
        ])
        if (mounted) {
          setUsers(u.data || [])
          setPosts(p.data || [])
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

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-column gap-2 mb-3">
        <input value={query} onChange={(e)=>{ setQuery(e.target.value); navigate(`/search?q=${encodeURIComponent(e.target.value)}`) }} className="form-control" placeholder="Search people, posts, places..." />
        <div className="btn-group">
          <button onClick={()=>setActiveTab('all')} className={`btn btn-light border ${activeTab==='all'?'active':''}`}>All</button>
          <button onClick={()=>setActiveTab('people')} className={`btn btn-light border ${activeTab==='people'?'active':''}`}>People</button>
          <button onClick={()=>setActiveTab('posts')} className={`btn btn-light border ${activeTab==='posts'?'active':''}`}>Posts</button>
          <button onClick={()=>setActiveTab('places')} className={`btn btn-light border ${activeTab==='places'?'active':''}`}>Places</button>
        </div>
      </div>

      {!query || query.trim().length===0 ? (
        <div className="text-muted small">Type to search people, posts, and places</div>
      ) : loading ? (
        <div className="text-muted small">Searching...</div>
      ) : (
        <div className="row g-3">
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
                      <button className="btn btn-sm btn-primary">Add Friend</button>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && <div className="text-muted small">No people found</div>}
                </div>
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="card shadow-sm">
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
                  {filteredPosts.length === 0 && <div className="text-muted small">No {activeTab==='places'?'places':'posts'} found</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


