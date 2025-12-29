import { useState, useMemo, useEffect } from 'react';
import { 
  FiPlus, 
  FiSearch, 
  FiChevronDown,
  FiMoreVertical,
  FiEye,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiFileText,
  FiUser,
  FiCalendar,
  FiTag,
  FiImage,
  FiRefreshCw
} from 'react-icons/fi';
import { SkeletonKPICard, SkeletonFilters, SkeletonText } from '../components/SkeletonLoader';
import { getPendingPlaces, approvePlace, rejectPlace } from '../api/adminApi';
import Toast from '../components/Toast';
import './ManageRecommendations.css';

const ManageRecommendations = () => {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  // Fetch recommendations from backend
  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getPendingPlaces();
      const places = Array.isArray(response?.data?.places) ? response.data.places : [];
      
      // Transform backend data to match frontend format
      const transformed = places.map(place => ({
        id: place._id,
        title: place.name || 'Untitled Place',
        description: place.description || place.address || 'No description available',
        submittedBy: place.submittedBy?.name || place.submittedBy?.email || 'Unknown',
        date: place.createdAt ? new Date(place.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: place.status === 'pending' ? 'Pending' : place.status === 'approved' ? 'Approved' : 'Rejected',
        category: place.tags && place.tags.length > 0 ? place.tags[0].charAt(0).toUpperCase() + place.tags[0].slice(1) : 'Uncategorized',
        tags: place.tags || [],
        image: place.media && place.media.length > 0 && place.media[0].type === 'image' 
          ? place.media[0].url 
          : null,
        address: place.address || '',
        estimatedCost: place.estimatedCost || 0,
        rejectionReason: place.rejectionReason || null,
        flags: place.rejectionReason ? [place.rejectionReason] : []
      }));
      
      setRecommendations(transformed);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err?.response?.data?.message || 'Failed to load recommendations');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const pending = recommendations.filter(r => r.status === 'Pending').length;
    const today = new Date().toISOString().split('T')[0];
    const approvedToday = recommendations.filter(r => 
      r.status === 'Approved' && r.date === today
    ).length;
    const total = recommendations.length;
    const last7Days = recommendations.filter(r => {
      const date = new Date(r.date);
      const today = new Date();
      const diffTime = Math.abs(today - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }).length;

    return { pending, approvedToday, total, last7Days };
  }, [recommendations]);

  // Get unique categories from tags
  const categories = useMemo(() => {
    const allTags = recommendations.flatMap(r => r.tags || []);
    const unique = [...new Set(allTags.map(tag => tag.charAt(0).toUpperCase() + tag.slice(1)))];
    return ['All Categories', ...unique];
  }, [recommendations]);

  // Filter recommendations
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec => {
      const matchesSearch = 
        rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rec.address && rec.address.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = selectedStatus === 'All Statuses' || rec.status === selectedStatus;
      const matchesCategory = selectedCategory === 'All Categories' || 
        rec.tags.some(tag => tag.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [recommendations, searchQuery, selectedStatus, selectedCategory]);

  // Handle approve
  const handleApprove = async (id) => {
    try {
      setActionLoading(prev => ({ ...prev, [id]: true }));
      await approvePlace(id);
      setRecommendations(prev => prev.filter(r => r.id !== id));
      setToast({ show: true, message: 'Place approved successfully', type: 'success' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    } catch (err) {
      console.error('Error approving place:', err);
      setToast({ show: true, message: err?.response?.data?.message || 'Failed to approve place', type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Handle reject
  const handleReject = async (id) => {
    const reason = window.prompt('Rejection reason (optional):') || 'Rejected by admin';
    if (reason === null) return; // User cancelled
    
    try {
      setActionLoading(prev => ({ ...prev, [id]: true }));
      await rejectPlace(id, reason);
      setRecommendations(prev => prev.filter(r => r.id !== id));
      setToast({ show: true, message: 'Place rejected successfully', type: 'success' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    } catch (err) {
      console.error('Error rejecting place:', err);
      setToast({ show: true, message: err?.response?.data?.message || 'Failed to reject place', type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Get status badge class
  const getStatusClass = (status) => {
    switch (status) {
      case 'Approved':
        return 'status-tag approved';
      case 'Pending':
        return 'status-tag pending';
      case 'Rejected':
        return 'status-tag rejected';
      default:
        return 'status-tag';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="manage-recommendations-page">
        <div className="page-header">
          <div className="skeleton-text" style={{ width: '250px', height: '32px' }}></div>
        </div>
        <div className="kpi-cards-grid">
          <SkeletonKPICard />
          <SkeletonKPICard />
          <SkeletonKPICard />
          <SkeletonKPICard />
        </div>
        <SkeletonFilters />
        <div className="recommendations-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card" style={{ minHeight: '400px' }}>
              <div className="skeleton-text" style={{ width: '100px', height: '24px', marginBottom: '16px' }}></div>
              <div className="skeleton-text" style={{ width: '100%', height: '200px', marginBottom: '16px' }}></div>
              <div className="skeleton-text" style={{ width: '80%', height: '20px', marginBottom: '8px' }}></div>
              <div className="skeleton-text" style={{ width: '100%', height: '16px', marginBottom: '8px' }}></div>
              <div className="skeleton-text" style={{ width: '60%', height: '16px', marginBottom: '16px' }}></div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="skeleton-button" style={{ width: '100px', height: '36px' }}></div>
                <div className="skeleton-button" style={{ width: '100px', height: '36px' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="manage-recommendations-page">
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}

      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="page-title">Manage Recommendations</h1>
          <button 
            onClick={fetchRecommendations} 
            disabled={loading}
            className="refresh-btn"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '8px 16px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            <FiRefreshCw />
            Refresh
          </button>
        </div>
        {error && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>
            {error}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="kpi-cards-grid">
        <div className="kpi-card">
          <div className="kpi-card-content">
            <div className="kpi-icon warning">
              <FiAlertTriangle />
            </div>
            <div className="kpi-info">
              <div className="kpi-value">{kpis.pending}</div>
              <div className="kpi-label">Pending Recommendations</div>
              <div className="kpi-description">Recommendations awaiting review.</div>
              <a 
                href="#" 
                className="kpi-link"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedStatus('Pending');
                }}
              >
                View all pending
              </a>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-content">
            <div className="kpi-icon success">
              <FiCheck />
            </div>
            <div className="kpi-info">
              <div className="kpi-value">{kpis.approvedToday}</div>
              <div className="kpi-label">Approved Today</div>
              <div className="kpi-description">Recommendations approved today.</div>
              <a 
                href="#" 
                className="kpi-link"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedStatus('Approved');
                }}
              >
                View daily approvals
              </a>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-content">
            <div className="kpi-icon info">
              <FiFileText />
            </div>
            <div className="kpi-info">
              <div className="kpi-value">{kpis.total}</div>
              <div className="kpi-label">Total Recommendations</div>
              <div className="kpi-description">Total recommendations in system.</div>
              <a 
                href="#" 
                className="kpi-link"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedStatus('All Statuses');
                }}
              >
                View all recommendations
              </a>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-content">
            <div className="kpi-icon primary">
              <FiPlus />
            </div>
            <div className="kpi-info">
              <div className="kpi-value">{kpis.last7Days}</div>
              <div className="kpi-label">New Submissions (Last 7 Days)</div>
              <div className="kpi-description">Newly submitted items this week.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="filter-action-bar">
        <div className="search-filter">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search recommendations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        <div className="filter-dropdowns">
          <div className="filter-dropdown">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="filter-select"
            >
              <option value="All Statuses">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <FiChevronDown className="dropdown-icon" />
          </div>
          <div className="filter-dropdown">
            <FiTag className="tag-icon" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <FiChevronDown className="dropdown-icon" />
          </div>
        </div>
        <button className="batch-actions-btn">
          <FiMoreVertical />
          Batch Actions
        </button>
      </div>

      {/* Recommendations Grid */}
      <div className="recommendations-grid">
        {filteredRecommendations.map(rec => {
          const isLoading = actionLoading[rec.id];
          return (
            <div key={rec.id} className="recommendation-card">
              <div className="card-header">
                <span className={getStatusClass(rec.status)}>
                  {rec.status}
                </span>
              </div>
              
              <div className="card-image">
                {rec.image ? (
                  <img src={rec.image} alt={rec.title} />
                ) : (
                  <div className="image-placeholder">
                    <svg className="mountain-icon" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="80" cy="15" r="8" fill="#c084fc" opacity="0.7"/>
                      <path d="M0 50 L30 20 L50 35 L70 15 L100 45 L100 60 L0 60 Z" fill="#c084fc" opacity="0.4"/>
                      <path d="M20 50 L40 25 L60 40 L80 20 L100 50 L100 60 L20 60 Z" fill="#c084fc" opacity="0.5"/>
                    </svg>
                  </div>
                )}
              </div>

              <div className="card-body">
                <h3 className="card-title">{rec.title}</h3>
                <p className="card-description">{rec.description}</p>
                
                {rec.address && (
                  <p className="card-address" style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                    📍 {rec.address}
                  </p>
                )}

                {rec.tags && rec.tags.length > 0 && (
                  <div className="card-tags" style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {rec.tags.map((tag, idx) => (
                      <span 
                        key={idx}
                        style={{
                          padding: '4px 8px',
                          background: '#e0e7ff',
                          color: '#4338ca',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {rec.estimatedCost > 0 && (
                  <p style={{ fontSize: '13px', color: '#059669', marginTop: '8px', fontWeight: '500' }}>
                    Estimated Cost: PKR {rec.estimatedCost.toLocaleString()}
                  </p>
                )}
                
                <div className="card-meta">
                  <div className="meta-item">
                    <FiUser className="meta-icon" />
                    <span>{rec.submittedBy}</span>
                    <span className="meta-separator">•</span>
                    <FiCalendar className="meta-icon" />
                    <span>{formatDate(rec.date)}</span>
                  </div>
                </div>

                {rec.flags && rec.flags.length > 0 && (
                  <div className="card-flags">
                    <FiAlertTriangle className="flag-icon" />
                    <span className="flag-text">
                      Flagged: {rec.flags.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              <div className="card-actions">
                <button className="view-details-btn" disabled={isLoading}>
                  <FiEye />
                  View Details
                </button>
                {rec.status === 'Pending' && (
                  <>
                    <button 
                      className="approve-btn"
                      onClick={() => handleApprove(rec.id)}
                      disabled={isLoading}
                    >
                      <FiCheck />
                      {isLoading ? 'Processing...' : 'Approve'}
                    </button>
                    <button 
                      className="reject-btn"
                      onClick={() => handleReject(rec.id)}
                      disabled={isLoading}
                    >
                      <FiX />
                      {isLoading ? 'Processing...' : 'Reject'}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredRecommendations.length === 0 && !loading && (
        <div className="no-results">
          <p>No recommendations found matching your filters.</p>
          {recommendations.length === 0 && (
            <p style={{ marginTop: '8px', color: '#6b7280' }}>
              No recommendations have been submitted yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ManageRecommendations;
