import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FiDownload, 
  FiPlus, 
  FiSearch, 
  FiChevronDown,
  FiMoreVertical,
  FiEdit,
  FiTrash2,
  FiEye,
  FiX,
  FiCheck,
  FiAlertCircle
} from 'react-icons/fi';
import { getAllUsers, deleteUser, updateUser, getUserById, getAdminPermissions, updateUserAdminRole } from '../api/adminApi';
import UserModal from '../components/UserModal';
import { SkeletonPageHeader, SkeletonFilters, SkeletonTable } from '../components/SkeletonLoader';
import { getProfilePictureUrl } from '../utils/imageUtils';
import './ManageUsers.css';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [adminPermissions, setAdminPermissions] = useState([]);
  const [currentAdminRole, setCurrentAdminRole] = useState(null);
  const actionMenuRefs = useRef({});
  const itemsPerPage = 10;

  // Fetch users from server
  useEffect(() => {
    fetchUsers();
    fetchAdminPermissions();
  }, []);

  // Fetch admin permissions
  const fetchAdminPermissions = async () => {
    try {
      // First try to get from localStorage for immediate display
      try {
        const cachedUser = localStorage.getItem('adminUser');
        if (cachedUser) {
          const user = JSON.parse(cachedUser);
          if (user.adminRole) {
            setCurrentAdminRole(user.adminRole);
            // Set default permissions based on role
            if (user.adminRole === 'ceo') {
              setAdminPermissions(['view_users', 'create_users', 'edit_users', 'delete_users', 'view_posts', 'delete_posts', 'moderate_posts', 'view_analytics', 'export_data', 'manage_settings', 'manage_admins']);
            } else if (user.adminRole === 'supervisor') {
              setAdminPermissions(['view_users', 'create_users', 'edit_users', 'view_posts', 'moderate_posts', 'view_analytics', 'export_data']);
            } else if (user.adminRole === 'manager') {
              setAdminPermissions(['view_users', 'edit_users', 'view_posts', 'moderate_posts', 'view_analytics']);
            }
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }

      // Then fetch from server
      const response = await getAdminPermissions();
      if (response.data) {
        setAdminPermissions(response.data.permissions || []);
        setCurrentAdminRole(response.data.adminRole);
      }
    } catch (error) {
      console.error('Error fetching admin permissions:', error);
      // Fallback: Try to get permissions from user profile
      try {
        const { getAdminProfile } = await import('../api/adminApi');
        const profileResponse = await getAdminProfile();
        if (profileResponse.data) {
          const adminRole = profileResponse.data.adminRole;
          setCurrentAdminRole(adminRole);
          // Set default permissions based on role
          if (adminRole === 'ceo') {
            setAdminPermissions(['view_users', 'create_users', 'edit_users', 'delete_users', 'view_posts', 'delete_posts', 'moderate_posts', 'view_analytics', 'export_data', 'manage_settings', 'manage_admins']);
          } else if (adminRole === 'supervisor') {
            setAdminPermissions(['view_users', 'create_users', 'edit_users', 'view_posts', 'moderate_posts', 'view_analytics', 'export_data']);
          } else if (adminRole === 'manager') {
            setAdminPermissions(['view_users', 'edit_users', 'view_posts', 'moderate_posts', 'view_analytics']);
          }
        }
      } catch (profileError) {
        console.error('Error fetching admin profile:', profileError);
      }
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllUsers();
      if (response.data) {
        const usersWithStatus = Array.isArray(response.data) 
          ? response.data
              // Filter out admins - only show regular users (not admins)
              .filter(user => !user.isAdmin || !user.adminRole)
              .map(user => ({
                ...user,
                status: user.isActive !== false ? 'Active' : 'Inactive',
                hasProfilePicture: user.hasProfilePicture !== undefined ? user.hasProfilePicture : (user.profilePicture ? true : false)
              }))
          : [];
        setUsers(usersWithStatus);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      let errorMessage = 'Failed to fetch users';
      
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        errorMessage = 'Network error: Unable to connect to server. Please check if the server is running on http://localhost:3000';
      } else if (err.response?.status === 401) {
        errorMessage = 'Unauthorized: Please login again';
      } else if (err.response?.status === 403) {
        errorMessage = 'Forbidden: You do not have permission to access this resource';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filters
  const roles = useMemo(() => {
    const unique = [...new Set(users.map(u => u.role).filter(Boolean))];
    return ['All Roles', ...unique];
  }, [users]);

  const cities = useMemo(() => {
    const unique = [...new Set(users.map(u => u.city).filter(Boolean))];
    return ['All Cities', ...unique.sort()];
  }, [users]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        !searchQuery ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user._id?.toString().includes(searchQuery.toLowerCase());
      
      const matchesRole = selectedRole === 'All Roles' || user.role === selectedRole;
      const matchesStatus = selectedStatus === 'All Status' || 
        (selectedStatus === 'Active' && user.isActive !== false) ||
        (selectedStatus === 'Inactive' && user.isActive === false);
      const matchesCity = selectedCity === 'All Cities' || user.city === selectedCity;

      return matchesSearch && matchesRole && matchesStatus && matchesCity;
    });
  }, [users, searchQuery, selectedRole, selectedStatus, selectedCity]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Handle select all
  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    if (checked) {
      setSelectedUsers(paginatedUsers.map(u => u._id));
    } else {
      setSelectedUsers([]);
    }
  };

  // Handle individual checkbox
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedRole('All Roles');
    setSelectedStatus('All Status');
    setSelectedCity('All Cities');
    setCurrentPage(1);
    setSelectedUsers([]);
    setSelectAll(false);
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectAll(false);
    setSelectedUsers([]);
    // Close all action menus
    Object.keys(actionMenuRefs.current).forEach(key => {
      if (actionMenuRefs.current[key]) {
        actionMenuRefs.current[key].style.display = 'none';
      }
    });
  };

  // Handle add user
  const handleAddUser = async (userData) => {
    try {
      setActionLoading(true);
      setError(null);
      // Register user via API
      const api = await import('../api/api');
      // Create FormData for file upload support
      const formData = new FormData();
      Object.keys(userData).forEach(key => {
        if (userData[key] !== null && userData[key] !== undefined && userData[key] !== '') {
          // Convert boolean to string for FormData
          if (typeof userData[key] === 'boolean') {
            formData.append(key, userData[key].toString());
          } else {
            formData.append(key, userData[key]);
          }
        }
      });
      const response = await api.default.post('/users/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuccessMessage('User created successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchUsers();
      return response;
    } catch (error) {
      console.error('Error creating user:', error);
      const errorMsg = error.response?.data?.message || 'Failed to create user';
      setError(errorMsg);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit user
  const handleEditUser = async (userData) => {
    try {
      setActionLoading(true);
      setError(null);
      
      // Separate admin role update if admin fields are present and user is CEO
      const { isAdmin, adminRole, ...regularUserData } = userData;
      
      // Remove password if empty
      if (!regularUserData.password || regularUserData.password.trim() === '') {
        delete regularUserData.password;
      }
      
      // Update regular user data
      if (Object.keys(regularUserData).length > 0) {
        await updateUser(selectedUser._id, regularUserData);
      }
      
      // Update admin role if changed and user has permission
      if (canManageAdmins() && (isAdmin !== undefined || adminRole !== undefined)) {
        const currentIsAdmin = selectedUser?.isAdmin || false;
        const currentAdminRole = selectedUser?.adminRole || null;
        
        // Only update if values actually changed
        if (isAdmin !== currentIsAdmin || adminRole !== currentAdminRole) {
          await updateUserAdminRole(
            selectedUser._id, 
            isAdmin ? (adminRole || null) : null,
            isAdmin || false
          );
        }
      }
      
      setSuccessMessage('User updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchUsers();
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      setError(error.response?.data?.message || 'Failed to update user');
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    try {
      setActionLoading(true);
      await deleteUser(selectedUser._id);
      setSuccessMessage('User deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchUsers();
      setShowDeleteConfirm(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      setError(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      if (action === 'delete') {
        if (!window.confirm(`Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone.`)) {
          setActionLoading(false);
          return;
        }
        // Delete users one by one with error handling
        const deletePromises = selectedUsers.map(id => 
          deleteUser(id).catch(err => {
            console.error(`Error deleting user ${id}:`, err);
            return { error: true, id, message: err.response?.data?.message || 'Failed to delete' };
          })
        );
        const results = await Promise.all(deletePromises);
        const errors = results.filter(r => r?.error);
        if (errors.length > 0) {
          setError(`Failed to delete ${errors.length} user(s). ${results.length - errors.length} deleted successfully.`);
        } else {
          setSuccessMessage(`${selectedUsers.length} user(s) deleted successfully!`);
        }
      } else if (action === 'activate') {
        const updatePromises = selectedUsers.map(id => 
          updateUser(id, { isActive: true }).catch(err => {
            console.error(`Error activating user ${id}:`, err);
            return { error: true };
          })
        );
        const results = await Promise.all(updatePromises);
        const errors = results.filter(r => r?.error);
        if (errors.length > 0) {
          setError(`Failed to activate ${errors.length} user(s). ${results.length - errors.length} activated successfully.`);
        } else {
          setSuccessMessage(`${selectedUsers.length} user(s) activated successfully!`);
        }
      } else if (action === 'deactivate') {
        const updatePromises = selectedUsers.map(id => 
          updateUser(id, { isActive: false }).catch(err => {
            console.error(`Error deactivating user ${id}:`, err);
            return { error: true };
          })
        );
        const results = await Promise.all(updatePromises);
        const errors = results.filter(r => r?.error);
        if (errors.length > 0) {
          setError(`Failed to deactivate ${errors.length} user(s). ${results.length - errors.length} deactivated successfully.`);
        } else {
          setSuccessMessage(`${selectedUsers.length} user(s) deactivated successfully!`);
        }
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
      
      setSelectedUsers([]);
      setSelectAll(false);
      await fetchUsers();
    } catch (error) {
      console.error('Error in bulk action:', error);
      setError(error.response?.data?.message || 'Failed to perform bulk action');
    } finally {
      setActionLoading(false);
      setBulkAction(null);
    }
  };

  // Handle view user details
  const handleViewUser = async (user) => {
    try {
      setActionLoading(true);
      setError(null);
      const response = await getUserById(user._id);
      if (response.data) {
        // Ensure hasProfilePicture is set
        const userData = {
          ...response.data,
          hasProfilePicture: response.data.hasProfilePicture !== undefined 
            ? response.data.hasProfilePicture 
            : (response.data.profilePicture ? true : false)
        };
        setUserDetails(userData);
        setShowUserDetails(true);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      setError(error.response?.data?.message || 'Failed to fetch user details');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle export
  const handleExport = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'City', 'Country', 'Role', 'Status', 'Profile Private', 'Created At'].join(','),
      ...filteredUsers.map(user => [
        user.name || '',
        user.email || '',
        user.phone || '',
        user.city || '',
        user.country || '',
        user.role || '',
        user.status || '',
        user.isProfilePrivate ? 'Yes' : 'No',
        user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    setSuccessMessage('Users exported successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Toggle action menu
  const toggleActionMenu = (userId, event) => {
    event.stopPropagation();
    const menuId = `menu-${userId}`;
    const menu = actionMenuRefs.current[menuId];
    const button = event.currentTarget;
    
    // Close all other menus
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

  // Get status badge class
  const getStatusClass = (status) => {
    switch (status) {
      case 'Active':
        return 'status-badge active';
      case 'Inactive':
        return 'status-badge inactive';
      default:
        return 'status-badge';
    }
  };

  // Get role badge class
  const getRoleClass = (role) => {
    switch (role) {
      case 'local':
        return 'role-badge local';
      case 'tourist':
        return 'role-badge tourist';
      default:
        return 'role-badge';
    }
  };

  // Get admin role badge class
  const getAdminRoleClass = (adminRole) => {
    switch (adminRole) {
      case 'ceo':
        return 'admin-role-badge ceo';
      case 'supervisor':
        return 'admin-role-badge supervisor';
      case 'manager':
        return 'admin-role-badge manager';
      default:
        return '';
    }
  };

  // Check if user can perform action
  const canDelete = () => {
    // If permissions not loaded yet, allow for CEO (fallback)
    if (adminPermissions.length === 0) {
      if (currentAdminRole) {
        return currentAdminRole === 'ceo';
      }
      // If role also not loaded, check from adminUser in localStorage
      try {
        const cachedUser = localStorage.getItem('adminUser');
        if (cachedUser) {
          const user = JSON.parse(cachedUser);
          return user.adminRole === 'ceo';
        }
      } catch (e) {
        // Ignore
      }
      return false;
    }
    return adminPermissions.includes('delete_users');
  };

  const canCreate = () => {
    // If permissions loaded, check them
    if (adminPermissions.length > 0) {
      return adminPermissions.includes('create_users');
    }
    
    // Fallback: Check role from state
    if (currentAdminRole) {
      return ['ceo', 'supervisor'].includes(currentAdminRole);
    }
    
    // Fallback: Check from localStorage
    try {
      const cachedUser = localStorage.getItem('adminUser');
      if (cachedUser) {
        const user = JSON.parse(cachedUser);
        if (user.adminRole) {
          return ['ceo', 'supervisor'].includes(user.adminRole);
        }
        // If user is admin but role not set, allow (will be checked on backend)
        return user.isAdmin === true;
      }
    } catch (e) {
      // Ignore
    }
    
    // Default: Show button (backend will handle permission check)
    // This ensures button is visible while permissions load
    return true;
  };

  const canManageAdmins = () => {
    if (currentAdminRole) {
      return currentAdminRole === 'ceo';
    }
    // Fallback to localStorage
    try {
      const cachedUser = localStorage.getItem('adminUser');
      if (cachedUser) {
        const user = JSON.parse(cachedUser);
        return user.adminRole === 'ceo';
      }
    } catch (e) {
      // Ignore
    }
    return false;
  };

  // Handle update admin role
  const handleUpdateAdminRole = async (userId, adminRole, isAdmin) => {
    try {
      setActionLoading(true);
      setError(null);
      await updateUserAdminRole(userId, adminRole, isAdmin);
      setSuccessMessage('Admin role updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchUsers();
      setShowAdminRoleModal(false);
      setSelectedUserForRole(null);
    } catch (error) {
      console.error('Error updating admin role:', error);
      setError(error.response?.data?.message || 'Failed to update admin role');
    } finally {
      setActionLoading(false);
    }
  };

  // Get user initials
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading && users.length === 0) {
    return (
      <div className="manage-users-page">
        <SkeletonPageHeader />
        <SkeletonFilters />
        <div className="table-container">
          <SkeletonTable rows={10} columns={9} />
        </div>
      </div>
    );
  }

  return (
    <div className="manage-users-page">
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
        <h1 className="page-title">Manage Users</h1>
        <div className="header-actions">
          {selectedUsers.length > 0 && (
            <div className="bulk-actions">
              <button 
                className="bulk-action-btn activate"
                onClick={() => handleBulkAction('activate')}
                disabled={actionLoading}
              >
                Activate ({selectedUsers.length})
              </button>
              <button 
                className="bulk-action-btn deactivate"
                onClick={() => handleBulkAction('deactivate')}
                disabled={actionLoading}
              >
                Deactivate ({selectedUsers.length})
              </button>
              {canDelete() && (
                <button 
                  className="bulk-action-btn delete"
                  onClick={() => handleBulkAction('delete')}
                  disabled={actionLoading}
                >
                  Delete ({selectedUsers.length})
                </button>
              )}
            </div>
          )}
          <button className="download-btn" onClick={handleExport} disabled={actionLoading}>
            <FiDownload className="btn-icon" />
            Export CSV
          </button>
          {canCreate() && (
            <button 
              className="add-user-btn-primary" 
              onClick={() => setShowAddModal(true)}
              disabled={actionLoading}
            >
            <FiPlus className="btn-icon" />
            Add New User
          </button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-filter">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search users by name, email, or ID..."
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
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <FiChevronDown className="dropdown-icon" />
          </div>
          <div className="filter-dropdown">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="All Status">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <FiChevronDown className="dropdown-icon" />
          </div>
          <div className="filter-dropdown">
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <FiChevronDown className="dropdown-icon" />
          </div>
          <button className="clear-filters-btn" onClick={handleClearFilters}>
            Clear filters
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        {loading && users.length > 0 ? (
          <SkeletonTable rows={10} columns={9} />
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <p>No users found</p>
          </div>
        ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectAll && paginatedUsers.length > 0}
                  onChange={handleSelectAll}
                  className="checkbox-input"
                />
              </th>
              <th>Avatar</th>
              <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Role</th>
              <th>Status</th>
                <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map(user => (
                <tr key={user._id}>
                <td>
                  <input
                    type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={() => handleSelectUser(user._id)}
                    className="checkbox-input"
                  />
                </td>
                <td>
                  <div className="avatar-circle">
                    <img 
                      src={getProfilePictureUrl(user.profilePicture, user.hasProfilePicture)} 
                      alt={user.name || 'User'}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const span = e.target.nextElementSibling;
                        if (span) span.style.display = 'flex';
                      }}
                    />
                    <span style={{ display: 'none' }}>
                      {getInitials(user.name)}
                    </span>
                  </div>
                </td>
                  <td className="name-cell">{user.name || 'N/A'}</td>
                  <td>{user.email || 'N/A'}</td>
                  <td>{user.phone || 'N/A'}</td>
                  <td>{user.city || 'N/A'}</td>
                  <td>
                    <span className={getRoleClass(user.role)}>
                      {user.role || 'N/A'}
                  </span>
                </td>
                <td>
                  <span className={getStatusClass(user.status)}>
                    {user.status}
                  </span>
                </td>
                <td>
                    {user.createdAt 
                      ? new Date(user.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td>
                    <div className="action-menu-wrapper">
                      <button 
                        className="action-menu-btn"
                        onClick={(e) => toggleActionMenu(user._id, e)}
                      >
                    <FiMoreVertical />
                  </button>
                      <div 
                        ref={el => actionMenuRefs.current[`menu-${user._id}`] = el}
                        className="action-menu"
                        style={{ display: 'none' }}
                      >
                        <button 
                          onClick={() => {
                            handleViewUser(user);
                            actionMenuRefs.current[`menu-${user._id}`].style.display = 'none';
                          }}
                        >
                          <FiEye /> View Details
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                            actionMenuRefs.current[`menu-${user._id}`].style.display = 'none';
                          }}
                        >
                          <FiEdit /> Edit
                        </button>
                        {canDelete() && (
                          <button 
                            className="delete-action"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteConfirm(true);
                              actionMenuRefs.current[`menu-${user._id}`].style.display = 'none';
                            }}
                          >
                            <FiTrash2 /> Delete
                          </button>
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
            Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
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

      {/* Add User Modal */}
      <UserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddUser}
        mode="add"
      />

      {/* Edit User Modal */}
      <UserModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSave={handleEditUser}
        mode="edit"
        canManageAdmins={canManageAdmins()}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-header">
              <FiAlertCircle className="confirm-icon" />
              <h3>Delete User</h3>
            </div>
            <p>Are you sure you want to delete <strong>{selectedUser?.name || selectedUser?.email}</strong>? This action cannot be undone.</p>
            <div className="confirm-actions">
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedUser(null);
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className="btn-delete" 
                onClick={handleDeleteUser}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetails && userDetails && (
        <div className="modal-overlay" onClick={() => {
          setShowUserDetails(false);
          setUserDetails(null);
        }}>
          <div className="user-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Details</h2>
              <button className="modal-close-btn" onClick={() => {
                setShowUserDetails(false);
                setUserDetails(null);
              }}>
                <FiX />
              </button>
            </div>
            <div className="user-details-content">
              <div className="user-details-avatar">
                <img 
                  src={getProfilePictureUrl(userDetails.profilePicture, userDetails.hasProfilePicture)} 
                  alt={userDetails.name || 'User'}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const span = e.target.nextElementSibling;
                    if (span) span.style.display = 'flex';
                  }}
                />
                <span style={{ display: 'none' }}>
                  {getInitials(userDetails.name)}
                </span>
              </div>
              <div className="user-details-info">
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{userDetails.name || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{userDetails.email || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">{userDetails.phone || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">City:</span>
                  <span className="detail-value">{userDetails.city || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Country:</span>
                  <span className="detail-value">{userDetails.country || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Role:</span>
                  <span className={`detail-value ${getRoleClass(userDetails.role)}`}>
                    {userDetails.role || 'N/A'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`detail-value ${getStatusClass(userDetails.isActive !== false ? 'Active' : 'Inactive')}`}>
                    {userDetails.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Profile Private:</span>
                  <span className="detail-value">{userDetails.isProfilePrivate ? 'Yes' : 'No'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Friends:</span>
                  <span className="detail-value">{userDetails.friends?.length || 0}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Created At:</span>
                  <span className="detail-value">
                    {userDetails.createdAt ? new Date(userDetails.createdAt).toLocaleString() : 'N/A'}
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

export default ManageUsers;
