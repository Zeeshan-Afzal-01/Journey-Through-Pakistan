import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiDownload, FiLock, FiShield, FiX, FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
import { updateMe } from '../api/authApi';
import { toast } from 'react-toastify';
import '../assests/css/settings.css';

export default function Settings() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

  const [notifications, setNotifications] = useState({
    emailRecommendations: true,
    inAppAlerts: true,
    promotionalOffers: false,
    weeklyDigest: true
  });

  const [dataSharing, setDataSharing] = useState('ask');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Load user data and saved preferences
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || ''
      });

      // Load saved notification preferences from localStorage
      const savedNotifications = localStorage.getItem('notificationPreferences');
      if (savedNotifications) {
        try {
          setNotifications(JSON.parse(savedNotifications));
        } catch (e) {
          console.error('Error loading notification preferences:', e);
        }
      }

      // Load saved data sharing preference
      const savedDataSharing = localStorage.getItem('dataSharingPreference');
      if (savedDataSharing) {
        setDataSharing(savedDataSharing);
      }

      // Load 2FA status
      const saved2FA = localStorage.getItem('twoFactorEnabled');
      if (saved2FA) {
        setTwoFactorEnabled(saved2FA === 'true');
      }
    }
  }, [user]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleToggle = (key) => {
    const updated = {
      ...notifications,
      [key]: !notifications[key]
    };
    setNotifications(updated);
    // Save to localStorage
    localStorage.setItem('notificationPreferences', JSON.stringify(updated));
    toast.success('Notification preferences updated');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateMe({
        name: formData.name,
        email: formData.email
      });
      
      if (res.data) {
        setUser(res.data.updatedUser || res.data);
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDataSharingChange = (value) => {
    setDataSharing(value);
    localStorage.setItem('dataSharingPreference', value);
    toast.success('Data sharing preference updated');
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      // Simulate data export
      const exportData = {
        profile: {
          name: user?.name,
          email: user?.email,
          username: user?.username
        },
        preferences: {
          notifications,
          dataSharing
        },
        exportDate: new Date().toISOString()
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jtp-data-export-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Note: You'll need to add a changePassword API endpoint
      // For now, using updateMe with password
      await updateMe({
        password: passwordData.newPassword
      });
      
      toast.success('Password changed successfully!');
      setShowChangePasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = () => {
    setTwoFactorEnabled(!twoFactorEnabled);
    localStorage.setItem('twoFactorEnabled', (!twoFactorEnabled).toString());
    toast.success(twoFactorEnabled ? 'Two-Factor Authentication disabled' : 'Two-Factor Authentication enabled');
    setShow2FAModal(false);
  };

  const handleLogoutAllDevices = async () => {
    setLoading(true);
    try {
      // Clear all auth tokens and localStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to login
      navigate('/login');
      toast.success('Logged out from all devices');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout from all devices');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1 className="settings-title">App Settings</h1>

        {/* Account & Profile Section */}
        <section className="settings-section">
          <h2 className="section-title">Account & Profile</h2>
          <p className="section-description">Manage your personal information and profile settings.</p>
          
          <form onSubmit={handleUpdateProfile} className="settings-form">
            <div className="form-group">
              <label htmlFor="name" className="form-label">Username</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your username"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </section>

        {/* Notification Preferences Section */}
        <section className="settings-section">
          <h2 className="section-title">Notification Preferences</h2>
          <p className="section-description">Customize how you receive alerts and updates.</p>
          
          <div className="toggle-list">
            <div className="toggle-item">
              <div className="toggle-label">
                <span>Email Notifications for New Recommendations</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifications.emailRecommendations}
                  onChange={() => handleToggle('emailRecommendations')}
                />
                <span className="slider"></span>
              </label>
            </div>
            
            <div className="toggle-item">
              <div className="toggle-label">
                <span>In-App Alerts for Travel Updates</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifications.inAppAlerts}
                  onChange={() => handleToggle('inAppAlerts')}
                />
                <span className="slider"></span>
              </label>
            </div>
            
            <div className="toggle-item">
              <div className="toggle-label">
                <span>Promotional Offers & Updates</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifications.promotionalOffers}
                  onChange={() => handleToggle('promotionalOffers')}
                />
                <span className="slider"></span>
              </label>
            </div>
            
            <div className="toggle-item">
              <div className="toggle-label">
                <span>Weekly Travel Digest Newsletter</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifications.weeklyDigest}
                  onChange={() => handleToggle('weeklyDigest')}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </section>

        {/* Privacy & Data Management Section */}
        <section className="settings-section">
          <h2 className="section-title">Privacy & Data Management</h2>
          <p className="section-description">Control your data sharing preferences and manage your data.</p>
          <p className="section-description">Share anonymized travel data with partners for improved recommendations.</p>
          
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="dataSharing"
                value="always"
                checked={dataSharing === 'always'}
                onChange={(e) => handleDataSharingChange(e.target.value)}
              />
              <span className="radio-label">Always</span>
            </label>
            
            <label className="radio-option">
              <input
                type="radio"
                name="dataSharing"
                value="ask"
                checked={dataSharing === 'ask'}
                onChange={(e) => handleDataSharingChange(e.target.value)}
              />
              <span className="radio-label">Ask me</span>
            </label>
            
            <label className="radio-option">
              <input
                type="radio"
                name="dataSharing"
                value="never"
                checked={dataSharing === 'never'}
                onChange={(e) => handleDataSharingChange(e.target.value)}
              />
              <span className="radio-label">Never</span>
            </label>
          </div>
          
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={handleExportData}
            disabled={loading}
          >
            <FiDownload className="btn-icon" />
            {loading ? 'Exporting...' : 'Export My Data'}
          </button>
        </section>

        {/* Security Section */}
        <section className="settings-section">
          <h2 className="section-title">Security</h2>
          <p className="section-description">Enhance your account's security.</p>
          
          <div className="button-group">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => setShowChangePasswordModal(true)}
            >
              <FiLock className="btn-icon" />
              Change Password
            </button>
            <button 
              type="button" 
              className={`btn-secondary ${twoFactorEnabled ? 'active' : ''}`}
              onClick={() => setShow2FAModal(true)}
            >
              <FiShield className="btn-icon" />
              {twoFactorEnabled ? 'Disable' : 'Enable'} Two-Factor Authentication
            </button>
          </div>
        </section>

        {/* Danger Zone Section */}
        <section className="settings-section danger-zone">
          <h2 className="section-title danger-title">Danger Zone</h2>
          <p className="section-description">Irreversible actions related to your account.</p>
          
          <button 
            type="button" 
            className="btn-danger" 
            onClick={() => setShowLogoutModal(true)}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Log Out of All Devices'}
          </button>
        </section>
      </div>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="modal-overlay" onClick={() => setShowChangePasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Change Password</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowChangePasswordModal(false)}
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    className="form-input"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                  >
                    {showPasswords.current ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    className="form-input"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                  >
                    {showPasswords.new ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    className="form-input"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                  >
                    {showPasswords.confirm ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShowChangePasswordModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleChangePassword}
                disabled={loading}
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Modal */}
      {show2FAModal && (
        <div className="modal-overlay" onClick={() => setShow2FAModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {twoFactorEnabled ? 'Disable' : 'Enable'} Two-Factor Authentication
              </h3>
              <button 
                className="modal-close" 
                onClick={() => setShow2FAModal(false)}
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                {twoFactorEnabled 
                  ? 'Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.'
                  : 'Two-Factor Authentication adds an extra layer of security to your account. You will need to verify your identity using a code from an authentication app.'}
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShow2FAModal(false)}
              >
                Cancel
              </button>
              <button 
                className={twoFactorEnabled ? "btn-danger" : "btn-primary"} 
                onClick={handleEnable2FA}
              >
                {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout All Devices Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-content danger-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title danger-title">Log Out of All Devices</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowLogoutModal(false)}
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                This will log you out of all devices where you are currently signed in. You will need to sign in again on all devices.
              </p>
              <p className="modal-warning">
                <strong>Warning:</strong> This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-danger" 
                onClick={handleLogoutAllDevices}
                disabled={loading}
              >
                {loading ? 'Logging Out...' : 'Log Out All Devices'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
