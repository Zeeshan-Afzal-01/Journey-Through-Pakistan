import { useState, useEffect, useMemo } from 'react';
import { 
  FiDownload, 
  FiSearch, 
  FiFilter,
  FiX,
  FiEye,
  FiTrash2,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiAlertTriangle,
  FiShield,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import { 
  getSecurityLogs, 
  getSecurityLogStats,
  deleteSecurityLogs,
  exportSecurityLogs,
  getSecurityLog
} from '../api/adminApi';
import { useToast, ToastContainer } from '../components/ToastContainer';
import { SkeletonPageHeader, SkeletonTable } from '../components/SkeletonLoader';
import './SecurityLogs.css';

const SecurityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [itemsPerPage] = useState(50);

  // Filters
  const [filters, setFilters] = useState({
    eventType: '',
    severity: '',
    status: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const { success, error, warning, info, toasts, removeToast } = useToast();

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [currentPage, filters, sortBy, sortOrder]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      };

      const response = await getSecurityLogs(params);
      if (response.data && response.data.success) {
        setLogs(response.data.logs || []);
        setTotalPages(response.data.pagination?.pages || 1);
        setTotal(response.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching security logs:', err);
      error('Failed to load security logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await getSecurityLogStats(params);
      if (response.data && response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const clearFilters = () => {
    setFilters({
      eventType: '',
      severity: '',
      status: '',
      search: '',
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
  };

  const handleViewLog = async (logId) => {
    try {
      const response = await getSecurityLog(logId);
      if (response.data && response.data.success) {
        setSelectedLog(response.data.log);
        setShowLogDetails(true);
      }
    } catch (err) {
      console.error('Error fetching log details:', err);
      error('Failed to load log details.');
    }
  };

  const handleDeleteLogs = async () => {
    try {
      setDeleteLoading(true);
      const deleteFilters = {};
      if (filters.eventType) deleteFilters.eventType = filters.eventType;
      if (filters.severity) deleteFilters.severity = filters.severity;
      if (filters.status) deleteFilters.status = filters.status;
      if (filters.startDate) deleteFilters.startDate = filters.startDate;
      if (filters.endDate) deleteFilters.endDate = filters.endDate;

      const response = await deleteSecurityLogs(deleteFilters);
      if (response.data && response.data.success) {
        success(`Successfully deleted ${response.data.deletedCount} log(s).`);
        setShowDeleteConfirm(false);
        fetchLogs();
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting logs:', err);
      error(err.response?.data?.message || 'Failed to delete logs.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = async (format = 'json') => {
    try {
      setExportLoading(true);
      const params = {
        format,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      };

      let response;
      try {
        response = await exportSecurityLogs(params);
      } catch (err) {
        // Axios throws error for non-2xx status codes
        if (err.response) {
          // Check if error response is a blob (JSON error)
          if (err.response.data instanceof Blob) {
            const errorText = await err.response.data.text();
            try {
              const errorData = JSON.parse(errorText);
              error(errorData.message || errorData.error || 'Failed to export security logs.');
              return;
            } catch (parseError) {
              error('Failed to export security logs. Please check server logs.');
              return;
            }
          } else if (err.response.data && typeof err.response.data === 'object') {
            error(err.response.data.message || err.response.data.error || 'Failed to export security logs.');
            return;
          }
        }
        throw err; // Re-throw if we can't handle it
      }
      
      // Check response status
      if (response.status && response.status >= 400) {
        // Error response
        if (response.data instanceof Blob) {
          const errorText = await response.data.text();
          try {
            const errorData = JSON.parse(errorText);
            error(errorData.message || errorData.error || 'Failed to export security logs.');
            return;
          } catch (e) {
            error('Failed to export security logs.');
            return;
          }
        }
        error('Failed to export security logs.');
        return;
      }
      
      // Handle successful blob response
      let blob;
      if (response.data instanceof Blob) {
        // For successful responses, check if it's actually valid data
        // Read a small portion to check if it's JSON error
        const blobText = await response.data.text();
        
        // Check if it's a JSON error (starts with { and has "success": false)
        if (blobText.trim().startsWith('{') && blobText.includes('"success"')) {
          try {
            const parsed = JSON.parse(blobText);
            if (parsed.success === false || parsed.message) {
              error(parsed.message || parsed.error || 'Failed to export security logs.');
              return;
            }
          } catch (e) {
            // Not a JSON error, continue
          }
        }
        
        // Recreate blob from text (since we read it)
        blob = new Blob([blobText], {
          type: format === 'csv' ? 'text/csv' : 'application/json'
        });
      } else {
        // If response is not blob, convert to blob
        const contentType = format === 'csv' ? 'text/csv' : 'application/json';
        blob = new Blob([typeof response.data === 'string' ? response.data : JSON.stringify(response.data)], {
          type: contentType
        });
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `security-logs-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      success(`Security logs exported successfully as ${format.toUpperCase()}.`);
    } catch (err) {
      console.error('Error exporting logs:', err);
      console.error('Error response:', err.response);
      
      // Handle axios error - check if response data is a blob (error JSON)
      if (err.response && err.response.data) {
        if (err.response.data instanceof Blob) {
          try {
            const errorText = await err.response.data.text();
            console.log('Error blob text:', errorText);
            const errorData = JSON.parse(errorText);
            error(errorData.message || errorData.error || 'Failed to export security logs.');
          } catch (parseError) {
            console.error('Error parsing error blob:', parseError);
            error('Failed to export security logs. Please check server logs.');
          }
        } else if (typeof err.response.data === 'object') {
          // Direct JSON error response
          error(err.response.data.message || err.response.data.error || 'Failed to export security logs.');
        } else {
          error('Failed to export security logs. Please try again.');
        }
      } else {
        const errorMessage = err.message || 'Failed to export security logs. Please try again.';
        error(errorMessage);
      }
    } finally {
      setExportLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <FiCheckCircle className="status-icon success" />;
      case 'failed': return <FiX className="status-icon failed" />;
      case 'warning': return <FiAlertTriangle className="status-icon warning" />;
      default: return <FiInfo className="status-icon info" />;
    }
  };

  const getEventTypeLabel = (eventType) => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const eventTypes = [
    'login_success', 'login_failed', 'logout', 'password_change', 'password_reset',
    'permission_change', 'role_change', 'admin_action', 'suspicious_activity',
    'account_locked', 'account_unlocked', 'email_change', 'profile_update',
    'api_access', 'file_upload', 'data_export', 'settings_change',
    'backup_created', 'backup_restored', 'backup_deleted', 'other'
  ];

  const severities = ['low', 'medium', 'high', 'critical'];
  const statuses = ['success', 'failed', 'warning', 'info'];

  return (
    <div className="security-logs-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <div className="security-logs-header">
        <div>
          <h1 className="page-title">
            <FiShield className="title-icon" />
            Security Logs
          </h1>
          <p className="page-subtitle">Monitor and track security events across the platform</p>
        </div>
        <div className="header-actions">
          <button
            className="action-btn secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FiFilter /> Filters
          </button>
          <button
            className="action-btn secondary"
            onClick={fetchLogs}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'spinning' : ''} /> Refresh
          </button>
          <div className="export-dropdown">
            <button
              className="action-btn primary"
              onClick={() => handleExport('json')}
              disabled={exportLoading}
            >
              <FiDownload /> {exportLoading ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="security-stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total || 0}</div>
            <div className="stat-label">Total Logs</div>
          </div>
          <div className="stat-card critical">
            <div className="stat-value">{stats.criticalLast24h || 0}</div>
            <div className="stat-label">Critical (24h)</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-value">{stats.failedLoginsLast24h || 0}</div>
            <div className="stat-label">Failed Logins (24h)</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {stats.bySeverity?.find(s => s._id === 'high')?.count || 0}
            </div>
            <div className="stat-label">High Severity</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="security-filters">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Event Type</label>
              <select
                value={filters.eventType}
                onChange={(e) => handleFilterChange('eventType', e.target.value)}
              >
                <option value="">All Types</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>{getEventTypeLabel(type)}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
              >
                <option value="">All Severities</option>
                {severities.map(severity => (
                  <option key={severity} value={severity}>
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div className="filter-group full-width">
              <label>Search</label>
              <div className="search-input-wrapper">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by description, IP address..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="filters-actions">
            <button className="btn-clear" onClick={clearFilters}>
              Clear Filters
            </button>
            <button className="btn-apply" onClick={() => setShowFilters(false)}>
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="security-logs-table-container">
        {loading ? (
          <SkeletonTable rows={10} cols={7} />
        ) : (
          <>
            <table className="security-logs-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Event Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>User</th>
                  <th>IP Address</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-data">
                      <FiInfo /> No security logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id}>
                      <td>{formatDate(log.createdAt)}</td>
                      <td>
                        <span className="event-type-badge">
                          {getEventTypeLabel(log.eventType)}
                        </span>
                      </td>
                      <td>
                        <span
                          className="severity-badge"
                          style={{ backgroundColor: getSeverityColor(log.severity) }}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td>
                        <div className="status-cell">
                          {getStatusIcon(log.status)}
                          <span>{log.status}</span>
                        </div>
                      </td>
                      <td>
                        {log.userId ? (
                          <div className="user-cell">
                            <div className="user-name">{log.userId.name}</div>
                            <div className="user-email">{log.userId.email}</div>
                          </div>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td>
                        <span className="ip-address">{log.ipAddress || 'N/A'}</span>
                      </td>
                      <td>
                        <div className="description-cell" title={log.description}>
                          {log.description.length > 50
                            ? `${log.description.substring(0, 50)}...`
                            : log.description}
                        </div>
                      </td>
                      <td>
                        <button
                          className="action-icon-btn"
                          onClick={() => handleViewLog(log._id)}
                          title="View Details"
                        >
                          <FiEye />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <FiChevronLeft /> Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages} ({total} total)
                </span>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next <FiChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Log Details Modal */}
      {showLogDetails && selectedLog && (
        <div className="modal-overlay" onClick={() => setShowLogDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Security Log Details</h2>
              <button
                className="modal-close"
                onClick={() => setShowLogDetails(false)}
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Basic Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Event Type</label>
                    <span>{getEventTypeLabel(selectedLog.eventType)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Severity</label>
                    <span
                      className="severity-badge"
                      style={{ backgroundColor: getSeverityColor(selectedLog.severity) }}
                    >
                      {selectedLog.severity}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <div className="status-cell">
                      {getStatusIcon(selectedLog.status)}
                      <span>{selectedLog.status}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <label>Date & Time</label>
                    <span>{formatDate(selectedLog.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Description</h3>
                <p>{selectedLog.description}</p>
              </div>

              <div className="detail-section">
                <h3>User Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>User</label>
                    <span>
                      {selectedLog.userId
                        ? `${selectedLog.userId.name} (${selectedLog.userId.email})`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Admin</label>
                    <span>
                      {selectedLog.adminId
                        ? `${selectedLog.adminId.name} (${selectedLog.adminId.adminRole})`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Target User</label>
                    <span>
                      {selectedLog.targetUserId
                        ? `${selectedLog.targetUserId.name} (${selectedLog.targetUserId.email})`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Network Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>IP Address</label>
                    <span>{selectedLog.ipAddress || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>User Agent</label>
                    <span className="text-muted">
                      {selectedLog.userAgent || 'N/A'}
                    </span>
                  </div>
                  {selectedLog.location && (
                    <>
                      <div className="detail-item">
                        <label>Country</label>
                        <span>{selectedLog.location.country || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <label>City</label>
                        <span>{selectedLog.location.city || 'N/A'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="detail-section">
                  <h3>Additional Details</h3>
                  <pre className="details-json">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowLogDetails(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Security Logs</h2>
              <button
                className="modal-close"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete security logs matching the current filters?
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={handleDeleteLogs}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Logs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityLogs;

