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
  FiImage
} from 'react-icons/fi';
import { SkeletonKPICard, SkeletonFilters, SkeletonText } from '../components/SkeletonLoader';
import './ManageRecommendations.css';

const ManageRecommendations = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);
  // Sample recommendation data - matching exact image
  const [recommendations] = useState([
    {
      id: 1,
      title: 'Hidden Garden Oasis in City Center',
      description: 'A serene and tranquil garden spot, perfect for a quiet afternoon escape from the bustling city.',
      submittedBy: 'Alice Johnson',
      date: '2024-07-20',
      status: 'Pending',
      category: 'Nature',
      image: null,
      flags: []
    },
    {
      id: 2,
      title: 'Sunset Rooftop Cafe with Live Music',
      description: 'Enjoy breathtaking sunset views and live acoustic music every evening. Serves artisanal coffee.',
      submittedBy: 'Bob Smith',
      date: '2024-07-19',
      status: 'Approved',
      category: 'Food & Drink',
      image: null,
      flags: ['Potential spam', 'Incorrect category']
    },
    {
      id: 3,
      title: 'Vibrant Street Art Alley',
      description: 'A hidden alleyway transformed into an open-air gallery by local street artists. Constantly evolving with new murals and graffiti masterpieces.',
      submittedBy: 'Charlie Brown',
      date: '2024-07-18',
      status: 'Pending',
      category: 'Arts',
      image: null,
      flags: []
    },
    {
      id: 4,
      title: 'Cozy Vintage Bookstore & Tea Room',
      description: 'Step back in time in this charming bookstore, offering rare first editions and a selection of fine teas and pastries.',
      submittedBy: 'Diana Prince',
      date: '2024-07-17',
      status: 'Rejected',
      category: 'Shopping',
      image: null,
      flags: ['Duplicate entry', 'Business closed']
    },
    {
      id: 5,
      title: 'Weekly Organic Farmers Market',
      description: 'Every Saturday, local farmers bring their freshest goods.',
      submittedBy: 'Eve Adams',
      date: '2024-07-16',
      status: 'Pending',
      category: 'Shopping',
      image: null,
      flags: []
    },
    {
      id: 6,
      title: 'Historic Coastal Lighthouse Walk',
      description: 'A scenic walk leading to a beautifully preserved 19th-century lighthouse. Offers stunning coastal views.',
      submittedBy: 'Frank White',
      date: '2024-07-15',
      status: 'Approved',
      category: 'Attractions',
      image: null,
      flags: []
    },
    {
      id: 7,
      title: 'Immersive VR Gaming Arena',
      description: 'Experience the future of gaming in this state-of-the-art VR arena. Group experiences and solo adventures available.',
      submittedBy: 'Grace Lee',
      date: '2024-07-14',
      status: 'Pending',
      category: 'Attractions',
      image: null,
      flags: []
    },
    {
      id: 8,
      title: 'Popular Urban Skatepark',
      description: 'A lively hub for skateboarders and rollerbladers of all skill levels. Features various ramps, rails, and a community atmosphere.',
      submittedBy: 'Harry Quinn',
      date: '2024-07-13',
      status: 'Approved',
      category: 'Attractions',
      image: null,
      flags: []
    },
  ]);

  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  // Calculate KPIs
  const kpis = useMemo(() => {
    const pending = recommendations.filter(r => r.status === 'Pending').length;
    const approvedToday = recommendations.filter(r => 
      r.status === 'Approved' && r.date === new Date().toISOString().split('T')[0]
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

  // Get unique categories
  const categories = useMemo(() => {
    const unique = [...new Set(recommendations.map(r => r.category))];
    return ['All Categories', ...unique];
  }, [recommendations]);

  // Filter recommendations
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec => {
      const matchesSearch = 
        rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.submittedBy.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = selectedStatus === 'All Statuses' || rec.status === selectedStatus;
      const matchesCategory = selectedCategory === 'All Categories' || rec.category === selectedCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [recommendations, searchQuery, selectedStatus, selectedCategory]);

  // Handle status change
  const handleStatusChange = (id, newStatus) => {
    // In a real app, this would update the backend
    console.log(`Changing recommendation ${id} status to ${newStatus}`);
    // For now, we'll just show an alert
    alert(`Recommendation status changed to ${newStatus}`);
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
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Manage Recommendations</h1>
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
              <a href="#" className="kpi-link">View all pending</a>
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
              <a href="#" className="kpi-link">View daily approvals</a>
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
              <a href="#" className="kpi-link">View all recommendations</a>
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
        {filteredRecommendations.map(rec => (
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
              
              <div className="card-meta">
                <div className="meta-item">
                  <FiUser className="meta-icon" />
                  <span>{rec.submittedBy}</span>
                  <span className="meta-separator">•</span>
                  <FiCalendar className="meta-icon" />
                  <span>{rec.date}</span>
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
              <button className="view-details-btn">
                <FiEye />
                View Details
              </button>
              {rec.status === 'Pending' && (
                <>
                  <button 
                    className="approve-btn"
                    onClick={() => handleStatusChange(rec.id, 'Approved')}
                  >
                    <FiCheck />
                    Approve
                  </button>
                  <button 
                    className="reject-btn"
                    onClick={() => handleStatusChange(rec.id, 'Rejected')}
                  >
                    <FiX />
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRecommendations.length === 0 && (
        <div className="no-results">
          <p>No recommendations found matching your filters.</p>
        </div>
      )}
    </div>
  );
};

export default ManageRecommendations;

