import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrash2, FiCopy, FiCheck, FiX, FiAlertCircle, FiUser, FiClock, FiFileText, FiFlag, FiInfo, FiExternalLink } from 'react-icons/fi';
import { SkeletonKPICard, SkeletonTable, SkeletonFilters } from '../components/SkeletonLoader';
import { getReports, getReportStats, handleReport as handleReportAction, getUserById } from '../api/adminApi';
import Toast from '../components/Toast';
import './Moderation.css';

const Moderation = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, resolvedLast7Days: 0 });
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedContentType, setSelectedContentType] = useState('All');
  const [selectedItems, setSelectedItems] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [handling, setHandling] = useState(false);
  const [viewUserModal, setViewUserModal] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [selectedStatus, selectedContentType]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (selectedContentType !== 'All') params.contentType = selectedContentType;
      const response = await getReports(params);
      setReports(response.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      showToast('Failed to fetch reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getReportStats();
      setStats(response.data || { total: 0, pending: 0, resolved: 0, resolvedLast7Days: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
  };

  const handleOpenModal = (report) => {
    setSelectedReport(report);
  };

  const handleCloseModal = () => {
    setSelectedReport(null);
  };

  const handleAction = async (action) => {
    if (!selectedReport) return;
    
    setHandling(true);
    try {
      await handleReportAction(selectedReport._id, action);
      showToast(`Report ${action}ed successfully`, 'success');
      handleCloseModal();
      fetchReports();
      fetchStats();
    } catch (error) {
      console.error('Error handling report:', error);
      showToast(error?.response?.data?.message || `Failed to ${action} report`, 'error');
    } finally {
      setHandling(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      handleAction('delete');
    }
  };

  const handleApprove = () => {
    handleAction('approve');
  };

  const handleDismiss = () => {
    handleAction('dismiss');
  };

  const handleViewUser = async (userId) => {
    if (!userId) return;
    try {
      const response = await getUserById(userId);
      if (response.data) {
        setViewingUser(response.data);
        setViewUserModal(true);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      showToast('Failed to load user details', 'error');
    }
  };

  const handleViewUserInUsersPage = (userId) => {
    navigate(`/users?userId=${userId}`);
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="moderation-stats">
          <SkeletonKPICard />
          <SkeletonKPICard />
          <SkeletonKPICard />
        </div>
        <SkeletonFilters />
        <div className="moderation-table-container">
          <SkeletonTable rows={5} columns={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="moderation-page">
      {/* Statistics Cards */}
      <div className="moderation-stats">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Reports</span>
          </div>
          <div className="stat-card-value">{stats.total}</div>
          <div className="stat-card-subtitle">Overall Reports</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Pending</span>
          </div>
          <div className="stat-card-value">{stats.pending}</div>
          <div className="stat-card-subtitle">Awaiting Review</div>
        </div>

        <div className="stat-card resolved-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Resolved Last 7 Days</span>
          </div>
          <div className="stat-card-value">{stats.resolvedLast7Days}</div>
          <div className="stat-card-subtitle">Content items resolved</div>
        </div>
      </div>

      {/* Filter and Batch Actions */}
      <div className="moderation-controls">
        <div className="filter-group">
          <label htmlFor="status-filter">Filter Status:</label>
          <select
            id="status-filter"
            className="status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Resolved">Resolved</option>
            <option value="Dismissed">Dismissed</option>
          </select>
        </div>
        <div className="filter-group" style={{ marginLeft: '15px' }}>
          <label htmlFor="content-type-filter">Content Type:</label>
          <select
            id="content-type-filter"
            className="status-filter"
            value={selectedContentType}
            onChange={(e) => setSelectedContentType(e.target.value)}
          >
            <option value="All">All</option>
            <option value="post">Posts</option>
            <option value="comment">Comments</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="moderation-table-container">
        <table className="moderation-data-table">
          <thead>
            <tr>
              <th>Content</th>
              <th>Type</th>
              <th>Reporter</th>
              <th>Reason</th>
              <th>Date Flagged</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 && !loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                  <FiAlertCircle size={48} style={{ color: '#ccc', marginBottom: '10px' }} />
                  <div>No reports found</div>
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report._id}>
                  <td className="comment-cell">
                    {report.contentPreview || report.fullContent || 'Content not available'}
                  </td>
                  <td>
                    <span className={`reason-badge reason-${report.contentType}`}>
                      {report.contentType === 'post' ? 'Post' : 'Comment'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="table-user-link"
                      onClick={() => handleViewUser(report.reporter?._id || report.reporter)}
                    >
                      {report.reporter?.name || 'Unknown'}
                    </button>
                  </td>
                  <td>
                    <span className={`reason-badge reason-${report.reason.toLowerCase().replace(/\s+/g, '-')}`}>
                      {report.reason}
                    </span>
                  </td>
                  <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge status-${report.status.toLowerCase()}`}>
                      {report.status}
                    </span>
                  </td>
                  <td>
                    {report.status === 'Pending' && (
                    <button
                      className="action-btn-table"
                        onClick={() => handleOpenModal(report)}
                    >
                      Review
                    </button>
                    )}
                    {report.status !== 'Pending' && (
                      <button
                        className="action-btn-table"
                        onClick={() => handleOpenModal(report)}
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Moderating Report Modal */}
      {selectedReport && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="moderation-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-header-icon">
                  <FiFlag className="modal-icon" />
                </div>
                <div>
              <h2 className="modal-title">
                    Review {selectedReport.contentType === 'post' ? 'Post' : 'Comment'} Report
              </h2>
                  <p className="modal-subtitle">
                    Report ID: {selectedReport._id.substring(0, 8)}...
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>

            <div className="moderation-modal-content">
              {/* Status Banner */}
              <div className={`modal-status-banner status-${selectedReport.status.toLowerCase()}`}>
                <div className="status-banner-content">
                  <FiInfo className="status-banner-icon" />
                  <div>
                    <div className="status-banner-title">
                      Status: {selectedReport.status}
                    </div>
                    {selectedReport.status === 'Pending' && (
                      <div className="status-banner-text">
                        This report is awaiting your review and action.
                      </div>
                    )}
                    {selectedReport.status === 'Resolved' && selectedReport.resolvedBy && (
                      <div className="status-banner-text">
                        Resolved by {selectedReport.resolvedBy?.name} on {new Date(selectedReport.resolvedAt).toLocaleString()}
                      </div>
                    )}
                    {selectedReport.status === 'Dismissed' && (
                      <div className="status-banner-text">
                        This report has been dismissed as invalid.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Preview Section */}
              <div className="modal-section">
                <div className="section-header">
                  <FiFileText className="section-icon" />
                  <h3 className="modal-section-title">Reported Content</h3>
                </div>
                <div className="content-preview-box">
                  <div className="content-type-badge">
                    {selectedReport.contentType === 'post' ? 'Post' : 'Comment'}
                  </div>
                  <div className="content-text">
                    {selectedReport.fullContent || selectedReport.contentPreview || 'Content not available'}
                  </div>
                  {selectedReport.content?.imageUrl && (
                    <div className="content-image-container">
                      <img 
                        src={selectedReport.content.imageUrl.startsWith('http') 
                          ? selectedReport.content.imageUrl 
                          : `http://localhost:3000/${selectedReport.content.imageUrl}`} 
                        alt="Content"
                        className="content-image"
                      />
                    </div>
                  )}
                  {selectedReport.content?.author && (
                    <div className="content-author">
                      <FiUser className="content-author-icon" />
                      <span>Author: </span>
                      <button 
                        className="user-link-btn"
                        onClick={() => handleViewUser(selectedReport.content.author._id || selectedReport.content.author)}
                      >
                        {selectedReport.content.author.name || 'Unknown'}
                        <FiExternalLink className="user-link-icon" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Report Details Section */}
              <div className="modal-section">
                <div className="section-header">
                  <FiInfo className="section-icon" />
                  <h3 className="modal-section-title">Report Information</h3>
                </div>
                <div className="report-details-grid">
                  <div className="report-detail-card">
                    <div className="report-detail-icon">
                      <FiUser />
                    </div>
                    <div className="report-detail-content">
                      <div className="report-detail-label">Reported By</div>
                      <div className="report-detail-value">
                        <button 
                          className="user-link-btn-inline"
                          onClick={() => handleViewUser(selectedReport.reporter?._id || selectedReport.reporter)}
                        >
                          {selectedReport.reporter?.name || 'Unknown'}
                          <FiExternalLink className="user-link-icon-small" />
                        </button>
                      </div>
                      {selectedReport.reporter?.email && (
                        <div className="report-detail-subtext">{selectedReport.reporter.email}</div>
                      )}
                    </div>
                  </div>

                  <div className="report-detail-card">
                    <div className="report-detail-icon">
                      <FiClock />
                    </div>
                    <div className="report-detail-content">
                      <div className="report-detail-label">Date Flagged</div>
                      <div className="report-detail-value">{new Date(selectedReport.createdAt).toLocaleDateString()}</div>
                      <div className="report-detail-subtext">{new Date(selectedReport.createdAt).toLocaleTimeString()}</div>
                    </div>
                  </div>

                  <div className="report-detail-card">
                    <div className="report-detail-icon reason-icon">
                      <FiFlag />
                    </div>
                    <div className="report-detail-content">
                      <div className="report-detail-label">Reason</div>
                      <div>
                        <span className={`reason-badge-large reason-${selectedReport.reason.toLowerCase().replace(/\s+/g, '-')}`}>
                          {selectedReport.reason}
                    </span>
                      </div>
                    </div>
                  </div>

                  <div className="report-detail-card">
                    <div className="report-detail-icon">
                      <FiFileText />
                    </div>
                    <div className="report-detail-content">
                      <div className="report-detail-label">Content Type</div>
                      <div>
                        <span className={`content-type-badge-large reason-${selectedReport.contentType}`}>
                          {selectedReport.contentType === 'post' ? 'Post' : 'Comment'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reporter's Description */}
              {selectedReport.description && (
              <div className="modal-section">
                  <div className="section-header">
                    <FiInfo className="section-icon" />
                    <h3 className="modal-section-title">Reporter's Additional Notes</h3>
                  </div>
                  <div className="reporter-description-box">
                    <div className="reporter-description-text">
                      {selectedReport.description}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {selectedReport.status === 'Pending' && (
              <div className="modal-actions">
                <div className="modal-actions-info">
                  <FiInfo className="actions-info-icon" />
                  <span>Select an action to resolve this report</span>
                </div>
                <div className="modal-actions-buttons">
                  <button className="modal-btn modal-btn-cancel" onClick={handleCloseModal} disabled={handling}>
                    Cancel
                  </button>
                  <button className="modal-btn modal-btn-dismiss" onClick={handleDismiss} disabled={handling}>
                    <FiX /> Dismiss Report
                  </button>
                  <button className="modal-btn modal-btn-approve" onClick={handleApprove} disabled={handling}>
                    <FiCheck /> Approve (Keep Content)
                  </button>
                  <button className="modal-btn modal-btn-delete" onClick={handleDelete} disabled={handling}>
                    <FiTrash2 /> Delete Content
                  </button>
                </div>
              </div>
            )}
            {selectedReport.status !== 'Pending' && (
              <div className="modal-actions">
                <button className="modal-btn modal-btn-close" onClick={handleCloseModal}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View User Modal */}
      {viewUserModal && viewingUser && (
        <div className="modal-overlay" onClick={() => { setViewUserModal(false); setViewingUser(null); }}>
          <div className="view-user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-header-icon">
                  <FiUser className="modal-icon" />
                </div>
                <div>
                  <h2 className="modal-title">User Profile</h2>
                  <p className="modal-subtitle">{viewingUser.email}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => { setViewUserModal(false); setViewingUser(null); }}>
                <FiX />
              </button>
            </div>
            <div className="moderation-modal-content">
              <div className="modal-section">
                <div className="user-profile-info">
                  <div className="user-profile-avatar">
                    {viewingUser.hasProfilePicture && viewingUser.profilePicture ? (
                      <img 
                        src={`http://localhost:3000/${viewingUser.profilePicture}`} 
                        alt={viewingUser.name}
                        className="profile-img"
                      />
                    ) : (
                      <div className="profile-img-placeholder">
                        <FiUser size={48} />
                      </div>
                    )}
                  </div>
                  <div className="user-profile-details">
                    <h3>{viewingUser.name || 'Unknown'}</h3>
                    <p className="user-email">{viewingUser.email}</p>
                    {viewingUser.city && <p className="user-city">📍 {viewingUser.city}</p>}
                    <div className="user-stats">
                      <div className="user-stat-item">
                        <span className="stat-label">Posts</span>
                        <span className="stat-value">{viewingUser.postsCount || 0}</span>
                      </div>
                      <div className="user-stat-item">
                        <span className="stat-label">Friends</span>
                        <span className="stat-value">{viewingUser.friendsCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => { setViewUserModal(false); setViewingUser(null); }}>
                Close
              </button>
              <button 
                className="modal-btn modal-btn-approve" 
                onClick={() => {
                  handleViewUserInUsersPage(viewingUser._id || viewingUser.id);
                  setViewUserModal(false);
                  setViewingUser(null);
                }}
              >
                View Full Profile
                <FiExternalLink />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}
    </div>
  );
};

export default Moderation;


