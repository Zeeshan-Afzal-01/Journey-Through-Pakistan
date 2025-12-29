import { useState, useEffect, useRef } from 'react';
import { 
  FiUser, FiMail, FiShield, FiCalendar, FiEdit2, FiCamera, 
  FiSave, FiX, FiCheck, FiLock, FiGlobe, FiMapPin, FiAward,
  FiActivity, FiBarChart2, FiUsers, FiFileText, FiBell, FiEye, FiEyeOff,
  FiKey, FiBellOff, FiSettings
} from 'react-icons/fi';
import { getAdminProfile, getAdminPermissions, getDashboardStats } from '../api/adminApi';
import api from '../api/api';
import { SkeletonCard, SkeletonText } from '../components/SkeletonLoader';
import { getProfilePictureUrl } from '../utils/imageUtils';
import './Profile.css';

const Profile = () => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    city: '',
    bio: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [stats, setStats] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'security'
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const profilePicInputRef = useRef(null);

  useEffect(() => {
    fetchAdminProfile();
    fetchStats();
    fetchPermissions();
  }, []);

  const fetchAdminProfile = async () => {
    try {
      setLoading(true);
      const response = await getAdminProfile();
      if (response.data) {
        setAdmin(response.data);
        setEditData({
          name: response.data.name || '',
          email: response.data.email || '',
          city: response.data.city || '',
          bio: response.data.bio || ''
        });
        // Update localStorage
        localStorage.setItem('adminUser', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getDashboardStats();
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await getAdminPermissions();
      if (response.data) {
        setPermissions(response.data.permissions || []);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditData({
      name: admin?.name || '',
      email: admin?.email || '',
      city: admin?.city || '',
      bio: admin?.bio || ''
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('name', editData.name);
      if (editData.city) formData.append('city', editData.city);
      if (editData.bio) formData.append('bio', editData.bio);

      const response = await api.put('/users/me', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data && response.data.user) {
        setAdmin(response.data.user);
        setEditing(false);
        localStorage.setItem('adminUser', JSON.stringify(response.data.user));
        // Trigger profile update in TopNav
        window.dispatchEvent(new Event('adminProfileUpdated'));
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      alert('Please fill all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('password', passwordData.newPassword);

      const response = await api.put('/users/me', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data && response.data.user) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordModal(false);
        alert('Password changed successfully!');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert(error.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !emailPassword) {
      alert('Please fill all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    if (newEmail === admin.email) {
      alert('New email must be different from current email');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('email', newEmail);
      formData.append('password', emailPassword); // For verification

      const response = await api.put('/users/me', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data && response.data.user) {
        setAdmin(response.data.user);
        setEditingEmail(false);
        setNewEmail('');
        setEmailPassword('');
        localStorage.setItem('adminUser', JSON.stringify(response.data.user));
        window.dispatchEvent(new Event('adminProfileUpdated'));
        alert('Email changed successfully!');
      }
    } catch (error) {
      console.error('Error changing email:', error);
      alert(error.response?.data?.message || 'Failed to change email. Please verify your password.');
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingPic(true);
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await api.put('/users/me', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data && response.data.user) {
        setAdmin(response.data.user);
        localStorage.setItem('adminUser', JSON.stringify(response.data.user));
        alert('Profile picture updated successfully!');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingPic(false);
      if (profilePicInputRef.current) {
        profilePicInputRef.current.value = '';
      }
    }
  };

  const getInitials = (name) => {
    if (!name) return 'A';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const getRoleColor = (role) => {
    const colors = {
      'ceo': '#8b5cf6',
      'supervisor': '#3b82f6',
      'moderator': '#10b981',
      'support': '#f59e0b',
      'analyst': '#ef4444'
    };
    return colors[role?.toLowerCase()] || '#6b7280';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="admin-profile-wrapper">
        <div className="admin-profile-page">
          {/* Header Skeleton */}
          <div className="admin-profile-header">
            <div className="admin-profile-header-content">
              <div className="admin-profile-avatar-section">
                <div className="admin-profile-avatar-wrapper">
                  <div className="skeleton-avatar" style={{ width: '120px', height: '120px', borderRadius: '50%' }}></div>
                </div>
                <div className="admin-profile-basic-info">
                  <SkeletonText width="200px" height="32px" />
                  <SkeletonText width="250px" height="20px" style={{ marginTop: '10px' }} />
                  <SkeletonText width="150px" height="18px" style={{ marginTop: '10px' }} />
                </div>
              </div>
              <div className="admin-profile-actions">
                <div className="skeleton-button" style={{ width: '140px', height: '40px' }}></div>
                <div className="skeleton-button" style={{ width: '160px', height: '40px' }}></div>
              </div>
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="admin-profile-tabs">
            <div className="skeleton-text" style={{ width: '180px', height: '50px', borderRadius: '8px' }}></div>
            <div className="skeleton-text" style={{ width: '200px', height: '50px', borderRadius: '8px' }}></div>
          </div>

          {/* Content Skeleton */}
          <div className="admin-profile-content">
            <div className="admin-profile-grid">
              <div className="admin-profile-left">
                <SkeletonCard>
                  <SkeletonText width="120px" height="24px" style={{ marginBottom: '20px' }} />
                  <SkeletonText width="100%" height="16px" style={{ marginBottom: '10px' }} />
                  <SkeletonText width="90%" height="16px" style={{ marginBottom: '10px' }} />
                  <SkeletonText width="80%" height="16px" style={{ marginBottom: '20px' }} />
                  <SkeletonText width="100px" height="16px" style={{ marginBottom: '10px' }} />
                  <SkeletonText width="150px" height="16px" />
                </SkeletonCard>
              </div>
              <div className="admin-profile-right">
                <SkeletonCard>
                  <SkeletonText width="150px" height="24px" style={{ marginBottom: '20px' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div className="skeleton-icon" style={{ width: '50px', height: '50px', borderRadius: '12px' }}></div>
                        <div>
                          <SkeletonText width="60px" height="24px" style={{ marginBottom: '5px' }} />
                          <SkeletonText width="80px" height="14px" />
                        </div>
                      </div>
                    ))}
                  </div>
                </SkeletonCard>
                <SkeletonCard>
                  <SkeletonText width="180px" height="24px" style={{ marginBottom: '20px' }} />
                  <SkeletonText width="100%" height="16px" style={{ marginBottom: '15px' }} />
                  <SkeletonText width="100%" height="16px" style={{ marginBottom: '15px' }} />
                  <SkeletonText width="100%" height="16px" />
                </SkeletonCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="admin-profile-page">
        <div className="admin-profile-error">
          <p>Failed to load profile. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-profile-wrapper">
      <div className="admin-profile-page">
        {/* Header Section */}
        <div className="admin-profile-header">
        <div className="admin-profile-header-content">
          <div className="admin-profile-avatar-section">
            <div className="admin-profile-avatar-wrapper">
              <img 
                src={getProfilePictureUrl(admin.profilePicture, admin.hasProfilePicture)} 
                alt={admin.name}
                className="admin-profile-avatar"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const placeholder = e.target.parentElement.querySelector('.admin-profile-avatar-placeholder');
                  if (placeholder) placeholder.style.display = 'flex';
                }}
              />
              <div 
                className="admin-profile-avatar-placeholder"
                style={{ display: (!admin.hasProfilePicture || !admin.profilePicture) ? 'flex' : 'none' }}
              >
                {getInitials(admin.name)}
              </div>
              <button
                className="admin-profile-avatar-edit"
                onClick={() => profilePicInputRef.current?.click()}
                disabled={uploadingPic}
                title="Change profile picture"
              >
                {uploadingPic ? (
                  <div className="admin-profile-avatar-spinner"></div>
                ) : (
                  <FiCamera size={20} />
                )}
              </button>
              <input
                ref={profilePicInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                style={{ display: 'none' }}
              />
            </div>
            <div className="admin-profile-basic-info">
              <div className="admin-profile-name-section">
                {editing ? (
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="admin-profile-edit-input"
                    placeholder="Full Name"
                  />
                ) : (
                  <h1 className="admin-profile-name">{admin.name || 'Admin User'}</h1>
                )}
                {admin.adminRole && (
                  <span 
                    className="admin-profile-role-badge"
                    style={{ backgroundColor: getRoleColor(admin.adminRole) }}
                  >
                    <FiShield className="me-1" />
                    {admin.adminRole.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="admin-profile-email-section">
                {editingEmail ? (
                  <div className="admin-profile-email-edit">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="admin-profile-edit-input"
                      placeholder="New email address"
                      style={{ marginBottom: '10px', width: '100%' }}
                    />
                    <input
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      className="admin-profile-edit-input"
                      placeholder="Enter password to verify"
                      style={{ marginBottom: '10px', width: '100%' }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className="admin-profile-btn admin-profile-btn-save"
                        onClick={handleChangeEmail}
                        disabled={saving}
                        style={{ padding: '8px 16px', fontSize: '14px' }}
                      >
                        {saving ? 'Saving...' : 'Save Email'}
                      </button>
                      <button
                        className="admin-profile-btn admin-profile-btn-cancel"
                        onClick={() => {
                          setEditingEmail(false);
                          setNewEmail('');
                          setEmailPassword('');
                        }}
                        disabled={saving}
                        style={{ padding: '8px 16px', fontSize: '14px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-profile-email-display">
                    <p className="admin-profile-email">
                      <FiMail className="me-1" />
                      {admin.email}
                    </p>
                    <button
                      className="admin-profile-email-edit-btn"
                      onClick={() => {
                        setEditingEmail(true);
                        setNewEmail(admin.email);
                      }}
                      title="Change email"
                    >
                      <FiEdit2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              {admin.city && (
                <p className="admin-profile-location">
                  <FiMapPin className="me-1" />
                  {admin.city}
                </p>
              )}
            </div>
          </div>
          <div className="admin-profile-actions">
            {editing ? (
              <>
                <button
                  className="admin-profile-btn admin-profile-btn-cancel"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <FiX className="me-1" />
                  Cancel
                </button>
                <button
                  className="admin-profile-btn admin-profile-btn-save"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="admin-profile-btn-spinner"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiSave className="me-1" />
                      Save Changes
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  className="admin-profile-btn admin-profile-btn-edit"
                  onClick={handleEdit}
                >
                  <FiEdit2 className="me-1" />
                  Edit Profile
                </button>
                <button
                  className="admin-profile-btn admin-profile-btn-security"
                  onClick={() => setActiveTab('security')}
                >
                  <FiKey className="me-1" />
                  Security
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-profile-content">
        {/* Tabs */}
        <div className="admin-profile-tabs">
          <button
            className={`admin-profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FiUser className="me-2" />
            Profile Information
          </button>
          <button
            className={`admin-profile-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <FiLock className="me-2" />
            Security & Privacy
          </button>
        </div>

        {activeTab === 'profile' && (
          <div className="admin-profile-grid">
            {/* Left Column */}
            <div className="admin-profile-left">
              {/* About Section */}
              <div className="admin-profile-card">
              <div className="admin-profile-card-header">
                <h3 className="admin-profile-card-title">
                  <FiUser className="me-2" />
                  About
                </h3>
              </div>
              <div className="admin-profile-card-body">
                {editing ? (
                  <div className="admin-profile-edit-section">
                    <label className="admin-profile-edit-label">Bio</label>
                    <textarea
                      value={editData.bio || ''}
                      onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                      className="admin-profile-edit-textarea"
                      placeholder="Tell us about yourself..."
                      rows="4"
                    />
                    <label className="admin-profile-edit-label">City</label>
                    <input
                      type="text"
                      value={editData.city || ''}
                      onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                      className="admin-profile-edit-input"
                      placeholder="City"
                    />
                  </div>
                ) : (
                  <>
                    {admin.bio ? (
                      <p className="admin-profile-bio">{admin.bio}</p>
                    ) : (
                      <p className="admin-profile-bio-empty">No bio added yet.</p>
                    )}
                    <div className="admin-profile-info-list">
                      <div className="admin-profile-info-item">
                        <FiCalendar className="admin-profile-info-icon" />
                        <div>
                          <span className="admin-profile-info-label">Member Since</span>
                          <span className="admin-profile-info-value">
                            {formatDate(admin.createdAt)}
                          </span>
                        </div>
                      </div>
                      {admin.lastLogin && (
                        <div className="admin-profile-info-item">
                          <FiActivity className="admin-profile-info-icon" />
                          <div>
                            <span className="admin-profile-info-label">Last Login</span>
                            <span className="admin-profile-info-value">
                              {formatDate(admin.lastLogin)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Permissions Section */}
            {permissions.length > 0 && (
              <div className="admin-profile-card">
                <div className="admin-profile-card-header">
                  <h3 className="admin-profile-card-title">
                    <FiLock className="me-2" />
                    Permissions
                  </h3>
                </div>
                <div className="admin-profile-card-body">
                  <div className="admin-profile-permissions">
                    {permissions.map((permission, index) => (
                      <span key={index} className="admin-profile-permission-badge">
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="admin-profile-right">
            {/* Statistics Section */}
            {stats && (
              <div className="admin-profile-card">
                <div className="admin-profile-card-header">
                  <h3 className="admin-profile-card-title">
                    <FiBarChart2 className="me-2" />
                    Statistics
                  </h3>
                </div>
                <div className="admin-profile-card-body">
                  <div className="admin-profile-stats-grid">
                    <div className="admin-profile-stat-item">
                      <div className="admin-profile-stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <FiUsers />
                      </div>
                      <div className="admin-profile-stat-content">
                        <span className="admin-profile-stat-value">
                          {stats.totalUsers || 0}
                        </span>
                        <span className="admin-profile-stat-label">Total Users</span>
                      </div>
                    </div>
                    <div className="admin-profile-stat-item">
                      <div className="admin-profile-stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                        <FiFileText />
                      </div>
                      <div className="admin-profile-stat-content">
                        <span className="admin-profile-stat-value">
                          {stats.totalPosts || 0}
                        </span>
                        <span className="admin-profile-stat-label">Total Posts</span>
                      </div>
                    </div>
                    <div className="admin-profile-stat-item">
                      <div className="admin-profile-stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                        <FiBell />
                      </div>
                      <div className="admin-profile-stat-content">
                        <span className="admin-profile-stat-value">
                          {stats.totalNotifications || 0}
                        </span>
                        <span className="admin-profile-stat-label">Notifications</span>
                      </div>
                    </div>
                    <div className="admin-profile-stat-item">
                      <div className="admin-profile-stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                        <FiAward />
                      </div>
                      <div className="admin-profile-stat-content">
                        <span className="admin-profile-stat-value">
                          {stats.totalAdmins || 0}
                        </span>
                        <span className="admin-profile-stat-label">Total Admins</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Account Information */}
            <div className="admin-profile-card">
              <div className="admin-profile-card-header">
                <h3 className="admin-profile-card-title">
                  <FiGlobe className="me-2" />
                  Account Information
                </h3>
              </div>
              <div className="admin-profile-card-body">
                <div className="admin-profile-info-list">
                  <div className="admin-profile-info-item">
                    <FiShield className="admin-profile-info-icon" />
                    <div>
                      <span className="admin-profile-info-label">Admin Role</span>
                      <span 
                        className="admin-profile-info-value admin-profile-role-text"
                        style={{ color: getRoleColor(admin.adminRole) }}
                      >
                        {admin.adminRole ? admin.adminRole.toUpperCase() : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="admin-profile-info-item">
                    <FiMail className="admin-profile-info-icon" />
                    <div>
                      <span className="admin-profile-info-label">Email</span>
                      <span className="admin-profile-info-value">{admin.email}</span>
                    </div>
                  </div>
                  {admin.city && (
                    <div className="admin-profile-info-item">
                      <FiMapPin className="admin-profile-info-icon" />
                      <div>
                        <span className="admin-profile-info-label">Location</span>
                        <span className="admin-profile-info-value">{admin.city}</span>
                      </div>
                    </div>
                  )}
                  <div className="admin-profile-info-item">
                    <FiCalendar className="admin-profile-info-icon" />
                    <div>
                      <span className="admin-profile-info-label">Account Created</span>
                      <span className="admin-profile-info-value">
                        {formatDate(admin.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'security' && (
          <div className="admin-profile-grid">
            {/* Security Settings */}
            <div className="admin-profile-left">
              <div className="admin-profile-card">
                <div className="admin-profile-card-header">
                  <h3 className="admin-profile-card-title">
                    <FiKey className="me-2" />
                    Change Password
                  </h3>
                </div>
                <div className="admin-profile-card-body">
                  <div className="admin-profile-edit-section">
                    <div className="admin-profile-form-group">
                      <label className="admin-profile-edit-label">Current Password</label>
                      <div className="admin-profile-password-input-wrapper">
                        <input
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="admin-profile-edit-input"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          className="admin-profile-password-toggle"
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        >
                          {showPasswords.current ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>
                    <div className="admin-profile-form-group">
                      <label className="admin-profile-edit-label">New Password</label>
                      <div className="admin-profile-password-input-wrapper">
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="admin-profile-edit-input"
                          placeholder="Enter new password (min 6 characters)"
                        />
                        <button
                          type="button"
                          className="admin-profile-password-toggle"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        >
                          {showPasswords.new ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>
                    <div className="admin-profile-form-group">
                      <label className="admin-profile-edit-label">Confirm New Password</label>
                      <div className="admin-profile-password-input-wrapper">
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="admin-profile-edit-input"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          className="admin-profile-password-toggle"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        >
                          {showPasswords.confirm ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>
                    <div className="admin-profile-form-actions">
                      <button
                        className="admin-profile-btn admin-profile-btn-save"
                        onClick={handleChangePassword}
                        disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      >
                        {saving ? (
                          <>
                            <div className="admin-profile-btn-spinner"></div>
                            Changing...
                          </>
                        ) : (
                          <>
                            <FiKey className="me-1" />
                            Change Password
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Security */}
              <div className="admin-profile-card">
                <div className="admin-profile-card-header">
                  <h3 className="admin-profile-card-title">
                    <FiShield className="me-2" />
                    Account Security
                  </h3>
                </div>
                <div className="admin-profile-card-body">
                  <div className="admin-profile-info-list">
                    <div className="admin-profile-info-item">
                      <FiLock className="admin-profile-info-icon" />
                      <div>
                        <span className="admin-profile-info-label">Password Last Changed</span>
                        <span className="admin-profile-info-value">
                          {admin.passwordChangedAt ? formatDate(admin.passwordChangedAt) : 'Never'}
                        </span>
                      </div>
                    </div>
                    <div className="admin-profile-info-item">
                      <FiActivity className="admin-profile-info-icon" />
                      <div>
                        <span className="admin-profile-info-label">Last Login</span>
                        <span className="admin-profile-info-value">
                          {admin.lastLogin ? formatDate(admin.lastLogin) : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="admin-profile-info-item">
                      <FiCalendar className="admin-profile-info-icon" />
                      <div>
                        <span className="admin-profile-info-label">Account Created</span>
                        <span className="admin-profile-info-value">
                          {formatDate(admin.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Privacy Settings */}
            <div className="admin-profile-right">
              <div className="admin-profile-card">
                <div className="admin-profile-card-header">
                  <h3 className="admin-profile-card-title">
                    <FiSettings className="me-2" />
                    Privacy Settings
                  </h3>
                </div>
                <div className="admin-profile-card-body">
                  <div className="admin-profile-privacy-settings">
                    <div className="admin-profile-privacy-item">
                      <div>
                        <h4 className="admin-profile-privacy-title">Profile Visibility</h4>
                        <p className="admin-profile-privacy-desc">Control who can see your profile information</p>
                      </div>
                      <label className="admin-profile-toggle">
                        <input
                          type="checkbox"
                          checked={admin.isProfilePrivate || false}
                          onChange={async (e) => {
                            try {
                              const formData = new FormData();
                              formData.append('isProfilePrivate', e.target.checked);
                              const response = await api.put('/users/me', formData);
                              if (response.data && response.data.user) {
                                setAdmin(response.data.user);
                                localStorage.setItem('adminUser', JSON.stringify(response.data.user));
                                window.dispatchEvent(new Event('adminProfileUpdated'));
                              }
                            } catch (error) {
                              console.error('Error updating privacy:', error);
                              alert('Failed to update privacy settings');
                            }
                          }}
                        />
                        <span className="admin-profile-toggle-slider"></span>
                      </label>
                    </div>
                    <div className="admin-profile-privacy-item">
                      <div>
                        <h4 className="admin-profile-privacy-title">Email Notifications</h4>
                        <p className="admin-profile-privacy-desc">Receive email notifications for important updates</p>
                      </div>
                      <label className="admin-profile-toggle">
                        <input
                          type="checkbox"
                          checked={true}
                          disabled
                        />
                        <span className="admin-profile-toggle-slider"></span>
                      </label>
                    </div>
                    <div className="admin-profile-privacy-item">
                      <div>
                        <h4 className="admin-profile-privacy-title">Activity Logging</h4>
                        <p className="admin-profile-privacy-desc">Track your admin activities and actions</p>
                      </div>
                      <label className="admin-profile-toggle">
                        <input
                          type="checkbox"
                          checked={true}
                          disabled
                        />
                        <span className="admin-profile-toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Profile;

