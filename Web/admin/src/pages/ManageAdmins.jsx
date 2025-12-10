import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FiPlus, 
  FiSearch, 
  FiChevronDown,
  FiMoreVertical,
  FiEdit,
  FiTrash2,
  FiEye,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiUser,
  FiShield
} from 'react-icons/fi';
import { getAllAdmins, updateUserAdminRole, getAdminPermissions, getUserById } from '../api/adminApi';
import { SkeletonPageHeader, SkeletonFilters, SkeletonTable } from '../components/SkeletonLoader';
import './ManageAdmins.css';

const ManageAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAdminDetails, setShowAdminDetails] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminDetails, setAdminDetails] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentAdminRole, setCurrentAdminRole] = useState(null);
  const [newAdminData, setNewAdminData] = useState({
    email: '',
    adminRole: 'team_admin'
  });
  const actionMenuRefs = useRef({});
  const itemsPerPage = 10;

  // Fetch admins from server
  useEffect(() => {
    fetchAdmins();
    fetchCurrentAdminRole();
  }, []);

  const fetchCurrentAdminRole = async () => {
    try {
      const { getAdminProfile } = await import('../api/adminApi');
      const response = await getAdminProfile();
      if (response.data && response.data.adminRole) {
        setCurrentAdminRole(response.data.adminRole);
      }
    } catch (error) {
      console.error('Error fetching admin role:', error);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllAdmins();
      if (response.data) {
        const adminsList = Array.isArray(response.data) ? response.data : [];
        setAdmins(adminsList);
      } else {
        setAdmins([]);
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
      let errorMessage = 'Failed to fetch admins';
      
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        errorMessage = 'Network error: Unable to connect to server';
      } else if (err.response?.status === 401) {
        errorMessage = 'Unauthorized: Please login again';
      } else if (err.response?.status === 403) {
        errorMessage = 'Forbidden: You do not have permission';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get unique admin roles for filter
  const adminRoles = useMemo(() => {
    const unique = [...new Set(admins.map(a => a.adminRole).filter(Boolean))];
    return ['All Roles', ...unique.sort()];
  }, [admins]);

  // Filter admins
  const filteredAdmins = useMemo(() => {
    return admins.filter(admin => {
      const matchesSearch = 
        !searchQuery ||
        admin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin._id?.toString().includes(searchQuery.toLowerCase());
      
      const matchesRole = selectedRole === 'All Roles' || admin.adminRole === selectedRole;

      return matchesSearch && matchesRole;
    });
  }, [admins, searchQuery, selectedRole]);

  // Pagination
  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAdmins = filteredAdmins.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    Object.keys(actionMenuRefs.current).forEach(key => {
      if (actionMenuRefs.current[key]) {
        actionMenuRefs.current[key].style.display = 'none';
      }
    });
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedRole('All Roles');
    setCurrentPage(1);
  };

  // Handle add admin (convert existing user to admin)
  const handleAddAdmin = async () => {
    if (!newAdminData.email) {
      setError('Please enter user email');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      
      // First, find user by email
      const api = await import('../api/api');
      const searchResponse = await api.default.get('/users/search', {
        params: { q: newAdminData.email }
      });

      if (!searchResponse.data || searchResponse.data.length === 0) {
        setError('User not found with this email');
        return;
      }

      const user = searchResponse.data[0];
      
      // Check if user is already an admin
      if (user.isAdmin && user.adminRole) {
        setError('User is already an admin');
        return;
      }

      // Check if trying to create CEO and CEO already exists
      if (newAdminData.adminRole === 'ceo') {
        const existingCEO = admins.find(a => a.adminRole === 'ceo');
        if (existingCEO) {
          setError('CEO already exists. Only one CEO can be assigned.');
          return;
        }
      }

      // Update user to admin
      await updateUserAdminRole(user._id, newAdminData.adminRole, true);
      setSuccessMessage(`User promoted to ${newAdminData.adminRole.toUpperCase().replace('_', ' ')} successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowAddAdminModal(false);
      setNewAdminData({ email: '', adminRole: 'team_admin' });
      await fetchAdmins();
    } catch (error) {
      console.error('Error adding admin:', error);
      setError(error.response?.data?.message || 'Failed to add admin');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle update admin role
  const handleUpdateAdminRole = async (adminId, adminRole, isAdmin) => {
    try {
      setActionLoading(true);
      setError(null);

      // Check if trying to set CEO and CEO already exists
      if (adminRole === 'ceo') {
        const existingCEO = admins.find(a => a.adminRole === 'ceo' && a._id !== adminId);
        if (existingCEO) {
          setError('CEO already exists. Only one CEO can be assigned.');
          setActionLoading(false);
          return;
        }
      }

      await updateUserAdminRole(adminId, adminRole, isAdmin);
      setSuccessMessage('Admin role updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchAdmins();
      setShowEditAdminModal(false);
      setSelectedAdmin(null);
    } catch (error) {
      console.error('Error updating admin role:', error);
      setError(error.response?.data?.message || 'Failed to update admin role');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle remove admin (convert back to regular user)
  const handleRemoveAdmin = async () => {
    try {
      setActionLoading(true);
      setError(null);
      await updateUserAdminRole(selectedAdmin._id, null, false);
      setSuccessMessage('Admin removed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchAdmins();
      setShowDeleteConfirm(false);
      setSelectedAdmin(null);
    } catch (error) {
      console.error('Error removing admin:', error);
      setError(error.response?.data?.message || 'Failed to remove admin');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle view admin details
  const handleViewAdmin = async (admin) => {
    try {
      setActionLoading(true);
      setError(null);
      const response = await getUserById(admin._id);
      if (response.data) {
        setAdminDetails(response.data);
        setShowAdminDetails(true);
      }
    } catch (error) {
      console.error('Error fetching admin details:', error);
      setError(error.response?.data?.message || 'Failed to fetch admin details');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle action menu
  const toggleActionMenu = (adminId, event) => {
    event.stopPropagation();
    const menuId = `menu-${adminId}`;
    const menu = actionMenuRefs.current[menuId];
    const button = event.currentTarget;
    
    Object.keys(actionMenuRefs.current).forEach(key => {
      if (key !== menuId && actionMenuRefs.current[key]) {
        actionMenuRefs.current[key].style.display = 'none';
      }
    });

    if (menu) {
      const isOpen = menu.style.display !== 'none';
      if (!isOpen) {
        // Calculate position for fixed dropdown
        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.bottom = `${window.innerHeight - rect.top + 4}px`;
        menu.style.right = `${window.innerWidth - rect.right}px`;
        menu.style.display = 'block';
      } else {
        menu.style.display = 'none';
      }
    }
  };

  // Close action menus on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(actionMenuRefs.current).forEach(key => {
        const menu = actionMenuRefs.current[key];
        if (menu && !menu.contains(event.target) && !event.target.closest('.action-menu-btn')) {
          menu.style.display = 'none';
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get admin role badge class
  const getAdminRoleClass = (adminRole) => {
    switch (adminRole) {
      case 'ceo':
        return 'admin-role-badge ceo';
      case 'supervisor':
        return 'admin-role-badge supervisor';
      case 'manager':
        return 'admin-role-badge manager';
      case 'team_admin':
        return 'admin-role-badge team-admin';
      default:
        return '';
    }
  };

  // Get admin role icon
  const getAdminRoleIcon = (adminRole) => {
    switch (adminRole) {
      case 'ceo':
        return <FiShield style={{ color: '#fbbf24' }} />; // Gold color for CEO
      case 'supervisor':
        return <FiShield style={{ color: '#3b82f6' }} />; // Blue for Supervisor
      case 'manager':
        return <FiUser style={{ color: '#6366f1' }} />; // Indigo for Manager
      case 'team_admin':
        return <FiUser style={{ color: '#10b981' }} />; // Green for Team Admin
      default:
        return <FiUser />;
    }
  };

  // Get user initials
  const getInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Check if current user is CEO
  const isCEO = currentAdminRole === 'ceo';

  if (loading && admins.length === 0) {
    return (
      <div className="manage-admins-page">
        <SkeletonPageHeader />
        <div className="skeleton-text" style={{ width: '100%', height: '60px', marginBottom: '24px', borderRadius: '12px' }}></div>
        <SkeletonFilters />
        <div className="table-container">
          <SkeletonTable rows={10} columns={7} />
        </div>
      </div>
    );
  }

  return (
    <div className="manage-admins-page">
      {/* Success Message */}
      {successMessage && (
        <div className="success-message">
          <FiCheck className="success-icon" />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-message-banner">
          <FiAlertCircle className="error-icon" />
          {error}
          <button className="error-close" onClick={() => setError(null)}>
            <FiX />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Admins</h1>
          <p className="page-subtitle">Manage supervisors and managers</p>
        </div>
        {isCEO && (
          <button 
            className="add-admin-btn-primary" 
            onClick={() => setShowAddAdminModal(true)}
            disabled={actionLoading}
          >
            <FiPlus className="btn-icon" />
            Add New Admin
          </button>
        )}
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <FiShield className="info-icon" />
        <div>
          <strong>Admin Hierarchy:</strong>
          <span className="info-badge ceo">CEO</span> - Full access (Only one)
          <span className="info-badge supervisor">Supervisor</span> - Can delete users/posts
          <span className="info-badge manager">Manager</span> - Edit & moderate
          <span className="info-badge team-admin">Team Admin</span> - View & moderate only
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-filter">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search admins by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
            />
          </div>
        </div>
        <div className="filter-dropdowns">
          <div className="filter-dropdown">
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              {adminRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <FiChevronDown className="dropdown-icon" />
          </div>
          <button className="clear-filters-btn" onClick={handleClearFilters}>
            Clear filters
          </button>
        </div>
      </div>

      {/* Admins Table */}
      <div className="table-container">
        {loading && admins.length > 0 ? (
          <SkeletonTable rows={10} columns={7} />
        ) : filteredAdmins.length === 0 ? (
          <div className="empty-state">
            <FiShield className="empty-icon" />
            <p>No admins found</p>
          </div>
        ) : (
          <table className="admins-table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Name</th>
                <th>Email</th>
                <th>Admin Role</th>
                <th>User Role</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedAdmins.map(admin => (
                <tr key={admin._id}>
                  <td>
                    <div className="avatar-circle">
                      {admin.profilePicture ? (
                        <>
                          <img 
                            src={`http://localhost:3000/${admin.profilePicture}`} 
                            alt={admin.name || 'Admin'}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const span = e.target.nextElementSibling;
                              if (span) span.style.display = 'flex';
                            }}
                          />
                          <span style={{ display: 'none' }}>
                            {getInitials(admin.name)}
                          </span>
                        </>
                      ) : (
                        <span>
                          {getInitials(admin.name)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="name-cell">
                    <div className="name-with-icon">
                      {getAdminRoleIcon(admin.adminRole)}
                      {admin.name || 'N/A'}
                    </div>
                  </td>
                  <td>{admin.email || 'N/A'}</td>
                  <td>
                    <span className={getAdminRoleClass(admin.adminRole)}>
                      {admin.adminRole ? admin.adminRole.toUpperCase() : 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={`role-badge ${admin.role || 'tourist'}`}>
                      {admin.role || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${admin.isActive !== false ? 'active' : 'inactive'}`}>
                      {admin.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {admin.createdAt 
                      ? new Date(admin.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td>
                    <div className="action-menu-wrapper">
                      <button 
                        className="action-menu-btn"
                        onClick={(e) => toggleActionMenu(admin._id, e)}
                      >
                        <FiMoreVertical />
                      </button>
                      <div 
                        ref={el => actionMenuRefs.current[`menu-${admin._id}`] = el}
                        className="action-menu"
                        style={{ display: 'none' }}
                      >
                        <button 
                          onClick={() => {
                            handleViewAdmin(admin);
                            actionMenuRefs.current[`menu-${admin._id}`].style.display = 'none';
                          }}
                        >
                          <FiEye /> View Details
                        </button>
                        {isCEO && (
                          <>
                            <button 
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setShowEditAdminModal(true);
                                actionMenuRefs.current[`menu-${admin._id}`].style.display = 'none';
                              }}
                            >
                              <FiEdit /> Edit Role
                            </button>
                            {admin.adminRole !== 'ceo' && (
                              <button 
                                className="delete-action"
                                onClick={() => {
                                  setSelectedAdmin(admin);
                                  setShowDeleteConfirm(true);
                                  actionMenuRefs.current[`menu-${admin._id}`].style.display = 'none';
                                }}
                              >
                                <FiTrash2 /> Remove Admin
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredAdmins.length)} of {filteredAdmins.length} admins
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || actionLoading}
            >
              &lt; Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
              let page;
              if (totalPages <= 10) {
                page = i + 1;
              } else if (currentPage <= 5) {
                page = i + 1;
              } else if (currentPage >= totalPages - 4) {
                page = totalPages - 9 + i;
              } else {
                page = currentPage - 5 + i;
              }
              return (
                <button
                  key={page}
                  className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => handlePageChange(page)}
                  disabled={actionLoading}
                >
                  {page}
                </button>
              );
            })}
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || actionLoading}
            >
              Next &gt;
            </button>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="modal-overlay" onClick={() => setShowAddAdminModal(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-header">
              <FiUser className="confirm-icon" />
              <h3>Add New Admin</h3>
            </div>
            <div className="admin-role-form">
              <div className="form-group">
                <label>User Email <span className="required">*</span></label>
                <input
                  type="email"
                  value={newAdminData.email}
                  onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                  placeholder="Enter user email to promote"
                  className="form-input"
                />
                <small className="form-hint">Enter the email of an existing user to make them an admin</small>
              </div>
              <div className="form-group">
                <label>Admin Role <span className="required">*</span></label>
                <select
                  value={newAdminData.adminRole}
                  onChange={(e) => {
                    const role = e.target.value;
                    // Check if CEO already exists
                    if (role === 'ceo') {
                      const existingCEO = admins.find(a => a.adminRole === 'ceo');
                      if (existingCEO) {
                        setError('CEO already exists. Only one CEO can be assigned.');
                        return;
                      }
                    }
                    setNewAdminData({ ...newAdminData, adminRole: role });
                    setError(null);
                  }}
                  className="form-select"
                >
                  <option value="team_admin">Team Admin</option>
                  <option value="manager">Manager</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="ceo" disabled={admins.some(a => a.adminRole === 'ceo')}>
                    CEO {admins.some(a => a.adminRole === 'ceo') ? '(Already Exists)' : ''}
                  </option>
                </select>
                {admins.some(a => a.adminRole === 'ceo') && newAdminData.adminRole === 'ceo' && (
                  <small className="error-message">CEO already exists. Only one CEO can be assigned.</small>
                )}
              </div>
            </div>
            <div className="confirm-actions">
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setShowAddAdminModal(false);
                  setNewAdminData({ email: '', adminRole: 'team_admin' });
                  setError(null);
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className="btn-submit" 
                onClick={handleAddAdmin}
                disabled={actionLoading || !newAdminData.email || (newAdminData.adminRole === 'ceo' && admins.some(a => a.adminRole === 'ceo'))}
              >
                {actionLoading ? 'Adding...' : 'Add Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Admin Role Modal */}
      {showEditAdminModal && selectedAdmin && (
        <div className="modal-overlay" onClick={() => {
          setShowEditAdminModal(false);
          setSelectedAdmin(null);
        }}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-header">
              <FiEdit className="confirm-icon" />
              <h3>Edit Admin Role</h3>
            </div>
            <p>Update admin role for <strong>{selectedAdmin.name || selectedAdmin.email}</strong></p>
            <div className="admin-role-form">
              <div className="form-group">
                <label>Admin Role</label>
                <select
                  value={selectedAdmin.adminRole || ''}
                  onChange={(e) => {
                    const role = e.target.value === '' ? null : e.target.value;
                    // Check if trying to set CEO and CEO already exists
                    if (role === 'ceo') {
                      const existingCEO = admins.find(a => a.adminRole === 'ceo' && a._id !== selectedAdmin._id);
                      if (existingCEO) {
                        setError('CEO already exists. Only one CEO can be assigned.');
                        return;
                      }
                    }
                    setSelectedAdmin({
                      ...selectedAdmin,
                      adminRole: role,
                      isAdmin: role !== null
                    });
                    setError(null);
                  }}
                  className="form-select"
                >
                  <option value="team_admin">Team Admin</option>
                  <option value="manager">Manager</option>
                  <option value="supervisor">Supervisor</option>
                  <option 
                    value="ceo" 
                    disabled={admins.some(a => a.adminRole === 'ceo' && a._id !== selectedAdmin._id)}
                  >
                    CEO {admins.some(a => a.adminRole === 'ceo' && a._id !== selectedAdmin._id) ? '(Already Exists)' : ''}
                  </option>
                </select>
                {admins.some(a => a.adminRole === 'ceo' && a._id !== selectedAdmin._id) && selectedAdmin.adminRole === 'ceo' && (
                  <small className="error-message">CEO already exists. Only one CEO can be assigned.</small>
                )}
              </div>
            </div>
            <div className="confirm-actions">
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setShowEditAdminModal(false);
                  setSelectedAdmin(null);
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className="btn-submit" 
                onClick={() => handleUpdateAdminRole(
                  selectedAdmin._id,
                  selectedAdmin.adminRole,
                  selectedAdmin.isAdmin
                )}
                disabled={actionLoading || (selectedAdmin.adminRole === 'ceo' && admins.some(a => a.adminRole === 'ceo' && a._id !== selectedAdmin._id))}
              >
                {actionLoading ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Admin Confirmation Modal */}
      {showDeleteConfirm && selectedAdmin && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-header">
              <FiAlertCircle className="confirm-icon" />
              <h3>Remove Admin</h3>
            </div>
            <p>Are you sure you want to remove <strong>{selectedAdmin.name || selectedAdmin.email}</strong> from admin role? They will become a regular user.</p>
            <div className="confirm-actions">
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedAdmin(null);
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className="btn-delete" 
                onClick={handleRemoveAdmin}
                disabled={actionLoading}
              >
                {actionLoading ? 'Removing...' : 'Remove Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Details Modal */}
      {showAdminDetails && adminDetails && (
        <div className="modal-overlay" onClick={() => {
          setShowAdminDetails(false);
          setAdminDetails(null);
        }}>
          <div className="user-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Admin Details</h2>
              <button className="modal-close-btn" onClick={() => {
                setShowAdminDetails(false);
                setAdminDetails(null);
              }}>
                <FiX />
              </button>
            </div>
            <div className="user-details-content">
              <div className="user-details-avatar">
                {adminDetails.profilePicture ? (
                  <>
                    <img 
                      src={`http://localhost:3000/${adminDetails.profilePicture}`} 
                      alt={adminDetails.name || 'Admin'}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const span = e.target.nextElementSibling;
                        if (span) span.style.display = 'flex';
                      }}
                    />
                    <span style={{ display: 'none' }}>
                      {getInitials(adminDetails.name)}
                    </span>
                  </>
                ) : (
                  <span>{getInitials(adminDetails.name)}</span>
                )}
              </div>
              <div className="user-details-info">
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{adminDetails.name || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{adminDetails.email || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Admin Role:</span>
                  <span className={`detail-value ${getAdminRoleClass(adminDetails.adminRole)}`}>
                    {adminDetails.adminRole ? adminDetails.adminRole.toUpperCase() : 'N/A'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">User Role:</span>
                  <span className="detail-value">{adminDetails.role || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">{adminDetails.phone || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">City:</span>
                  <span className="detail-value">{adminDetails.city || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`detail-value status-badge ${adminDetails.isActive !== false ? 'active' : 'inactive'}`}>
                    {adminDetails.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Created At:</span>
                  <span className="detail-value">
                    {adminDetails.createdAt ? new Date(adminDetails.createdAt).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAdmins;

