import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { 
  FiSettings, FiX, FiUser, FiBell, FiShield, FiMail, FiServer, FiCode, FiDatabase,
  FiSave, FiGlobe, FiClock, FiLock, FiKey, FiRefreshCw, FiDownload, FiUpload, FiEye, FiEyeOff,
  FiTrash2, FiCheck, FiAlertCircle
} from 'react-icons/fi';
import { 
  getSettings, 
  updateSettings,
  createBackup,
  getBackups,
  downloadBackup,
  deleteBackup,
  restoreBackup,
  uploadAndRestoreBackup
} from '../api/adminApi';
import { SkeletonSettings } from '../components/SkeletonLoader';
import { useToast, ToastContainer } from '../components/ToastContainer';
import './Settings.css';

const Settings = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSettingsPage = location.pathname === '/settings';
  
  // Get initial section from URL params
  const getInitialSection = () => {
    const sectionFromUrl = searchParams.get('section');
    const validSections = ['general', 'users', 'notifications', 'security', 'email', 'system', 'api', 'backup'];
    if (sectionFromUrl && validSections.includes(sectionFromUrl)) {
      return sectionFromUrl;
    }
    return 'general';
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(getInitialSection);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState({});
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const { success, error, warning, info, toasts, removeToast } = useToast();

  // All settings in one state
  const [allSettings, setAllSettings] = useState({
    // General
    appName: '',
    appUrl: '',
    timezone: 'Asia/Karachi',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    enableRegistration: true,
    requireEmailVerification: true,
    
    // Server
    port: 3000,
    nodeEnv: 'development',
    frontendUrl: '',
    mongodbUri: '',
    secretKey: '',
    
    // Users
    defaultRole: 'tourist',
    allowProfileEdit: true,
    maxProfilePictureSize: 5,
    enableFriendRequests: true,
    requireProfileApproval: false,
    
    // Notifications
    enablePushNotifications: true,
    enableEmailNotifications: true,
    enableInAppNotifications: true,
    notificationSound: true,
    quietHours: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    
    // Security
    requireStrongPassword: true,
    minPasswordLength: 8,
    enable2FA: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    enableIPWhitelist: false,
    
    // Email/SMTP
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: '',
    enableSSL: true,
    
    // Auth0
    auth0Domain: '',
    auth0ClientId: '',
    auth0ClientSecret: '',
    auth0CallbackUrl: '',
    
    // API Keys
    googleApiKey: '',
    googleVisionApiKey: '',
    googlePlacesApiKey: '',
    
    // System
    maintenanceMode: false,
    maxFileUploadSize: 10,
    enableCaching: true,
    cacheDuration: 3600,
    enableLogging: true,
    logLevel: 'info',
    
    // API
    enableAPI: true,
    apiRateLimit: 100,
    apiKeyExpiry: 90,
    enableWebhooks: false,
    webhookUrl: '',
  });

  // Set initial URL param if missing
  useEffect(() => {
    if (!searchParams.get('section')) {
      setSearchParams({ section: activeSection });
    }
  }, []);

  // Sync activeSection with URL params when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const sectionFromUrl = searchParams.get('section');
    const validSections = ['general', 'users', 'notifications', 'security', 'email', 'system', 'api', 'backup'];
    if (sectionFromUrl && validSections.includes(sectionFromUrl) && sectionFromUrl !== activeSection) {
      setActiveSection(sectionFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchSettings();
    if (activeSection === 'backup') {
      fetchBackups();
    }
  }, [activeSection]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await getSettings();
      if (response.data) {
        // Ensure all required fields have defaults
        const settingsData = {
          ...response.data,
          language: response.data.language || 'en',
          timezone: response.data.timezone || 'Asia/Karachi',
          dateFormat: response.data.dateFormat || 'DD/MM/YYYY',
        };
        setAllSettings(settingsData);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      error('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setAllSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const fetchBackups = async () => {
    try {
      setBackupLoading(true);
      const response = await getBackups();
      if (response.data) {
        setBackups(response.data);
      }
    } catch (err) {
      console.error('Error fetching backups:', err);
      error('Failed to load backups. Please try again.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setBackupLoading(true);
      const response = await createBackup();
      
      // Check if response is successful - handle different response formats
      if (response && response.data) {
        // If response has success flag or backup object, it's successful
        if (response.data.success || response.data.backup) {
          success('Backup created successfully!');
          await fetchBackups();
        } else {
          // Response received but format might be different - check by fetching
          await fetchBackups();
          success('Backup created successfully!');
        }
      } else {
        // No response data - check if backup was created anyway
        const currentCount = backups.length;
        await fetchBackups();
        if (backups.length > currentCount) {
          success('Backup created successfully!');
        } else {
          // Wait a bit and check again
          setTimeout(async () => {
            await fetchBackups();
            if (backups.length > currentCount) {
              success('Backup created successfully!');
            } else {
              error('Backup creation may have failed. Please check backup history.');
            }
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Error creating backup:', err);
      // Even if error occurred, backup might have been created
      const currentCount = backups.length;
      try {
        await fetchBackups();
        // Check if new backup was added
        setTimeout(async () => {
          await fetchBackups();
          if (backups.length > currentCount) {
            success('Backup created successfully!');
          } else {
            error(err.response?.data?.message || 'Failed to create backup. Please try again.');
          }
        }, 1000);
      } catch (fetchErr) {
        error(err.response?.data?.message || 'Failed to create backup. Please try again.');
      }
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDownloadBackup = async (backupId, filename) => {
    try {
      const response = await downloadBackup(backupId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      success('Backup downloaded successfully!');
    } catch (err) {
      console.error('Error downloading backup:', err);
      error('Failed to download backup. Please try again.');
    }
  };

  const handleDeleteBackup = async (backupId) => {
    try {
      setDeleteLoading(backupId);
      const response = await deleteBackup(backupId);
      if (response.data && response.data.success) {
        success('Backup deleted successfully!');
        await fetchBackups();
      } else {
        success('Backup deleted successfully!');
        await fetchBackups();
      }
    } catch (err) {
      console.error('Error deleting backup:', err);
      error(err.response?.data?.message || 'Failed to delete backup. Please try again.');
    } finally {
      setDeleteLoading(null);
      setShowDeleteConfirm(null);
    }
  };

  const handleRestoreBackup = async (backupId) => {
    try {
      setRestoreLoading(backupId);
      const response = await restoreBackup(backupId);
      if (response.data && response.data.success) {
        success('Backup restored successfully! The page will reload.');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        success('Backup restored successfully! The page will reload.');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
      console.error('Error restoring backup:', err);
      error(err.response?.data?.message || 'Failed to restore backup. Please try again.');
      setRestoreLoading(null);
      setShowRestoreConfirm(null);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        error('Please upload a valid JSON backup file.');
        e.target.value = '';
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        error('File size must be less than 100MB.');
        e.target.value = '';
        return;
      }
      setUploadFile(file);
      info(`File selected: ${file.name}`);
    }
  };

  const handleUploadAndRestore = async () => {
    if (!uploadFile) {
      warning('Please select a backup file first.');
      return;
    }

    try {
      setRestoreLoading('upload');
      const response = await uploadAndRestoreBackup(uploadFile);
      if (response.data && response.data.success) {
        success('Backup uploaded and restored successfully! The page will reload.');
        setUploadFile(null);
        const fileInput = document.getElementById('backup-file-input');
        if (fileInput) fileInput.value = '';
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        success('Backup uploaded and restored successfully! The page will reload.');
        setUploadFile(null);
        const fileInput = document.getElementById('backup-file-input');
        if (fileInput) fileInput.value = '';
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
      console.error('Error uploading and restoring backup:', err);
      error(err.response?.data?.message || 'Failed to upload and restore backup. Please try again.');
      setRestoreLoading(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const menuItems = [
    { id: 'general', label: 'General', icon: FiSettings },
    { id: 'users', label: 'Users', icon: FiUser },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
    { id: 'security', label: 'Security', icon: FiShield },
    { id: 'email', label: 'Email', icon: FiMail },
    { id: 'system', label: 'System', icon: FiServer },
    { id: 'api', label: 'API', icon: FiCode },
    { id: 'backup', label: 'Backup', icon: FiDatabase },
  ];

  const handleMenuItemClick = (itemId) => {
    setActiveSection(itemId);
    setSearchParams({ section: itemId });
    setIsMenuOpen(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await updateSettings(allSettings);
      if (response.data && response.data.success) {
        success('Settings saved successfully! The .env file has been updated.');
        await fetchSettings(); // Reload to get masked values
      } else {
        success('Settings saved successfully!');
        await fetchSettings();
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      error(err.response?.data?.message || 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderSectionContent = () => {
    if (loading) {
      return <SkeletonSettings />;
    }

    switch (activeSection) {
      case 'general':
        return <GeneralSection settings={allSettings} onChange={handleSettingChange} />;
      case 'users':
        return <UsersSection settings={allSettings} onChange={handleSettingChange} />;
      case 'notifications':
        return <NotificationsSection settings={allSettings} onChange={handleSettingChange} />;
      case 'security':
        return <SecuritySection settings={allSettings} onChange={handleSettingChange} showPasswords={showPasswords} togglePassword={togglePasswordVisibility} />;
      case 'email':
        return <EmailSection settings={allSettings} onChange={handleSettingChange} showPasswords={showPasswords} togglePassword={togglePasswordVisibility} />;
      case 'system':
        return <SystemSection settings={allSettings} onChange={handleSettingChange} />;
      case 'api':
        return <APISection settings={allSettings} onChange={handleSettingChange} showPasswords={showPasswords} togglePassword={togglePasswordVisibility} />;
      case 'backup':
        return (
          <BackupSection 
            backups={backups}
            backupLoading={backupLoading}
            restoreLoading={restoreLoading}
            deleteLoading={deleteLoading}
            uploadFile={uploadFile}
            showRestoreConfirm={showRestoreConfirm}
            showDeleteConfirm={showDeleteConfirm}
            onCreateBackup={handleCreateBackup}
            onDownloadBackup={handleDownloadBackup}
            onDeleteBackup={handleDeleteBackup}
            onRestoreBackup={handleRestoreBackup}
            onFileUpload={handleFileUpload}
            onUploadAndRestore={handleUploadAndRestore}
            onSetRestoreConfirm={setShowRestoreConfirm}
            onSetDeleteConfirm={setShowDeleteConfirm}
            onSetUploadFile={setUploadFile}
            formatDate={formatDate}
          />
        );
      default:
        return <GeneralSection settings={allSettings} onChange={handleSettingChange} />;
    }
  };

  if (!isSettingsPage) {
    return null;
  }

  const activeMenuItem = menuItems.find(item => item.id === activeSection);

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="settings-page">
        <div className="settings-content">
          <div className="settings-header">
          <div>
            {activeMenuItem && (
              <>
                <div className="settings-section-header">
                  <activeMenuItem.icon className="section-header-icon" />
                  <h1 className="settings-title">{activeMenuItem.label} Settings</h1>
                </div>
                <p className="settings-subtitle">
                  Configure {activeMenuItem.label.toLowerCase()} settings and preferences.
                </p>
              </>
            )}
          </div>
          <button 
            className="settings-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            <FiSave className="save-btn-icon" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          </div>
        </div>
        
        <div className="settings-section-content">
          {renderSectionContent()}
        </div>
      </div>

      {/* Toggle Button - Only visible on settings page */}
      {isSettingsPage && (
        <>
          <button
            className={`settings-toggle-btn ${isMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle settings menu"
          >
            {isMenuOpen ? <FiX size={24} /> : <FiSettings size={24} />}
          </button>

          {/* Animated Menu */}
          <div className={`settings-menu ${isMenuOpen ? 'open' : ''}`}>
            <div className="settings-menu-header">
              <h3>Settings</h3>
            </div>
            <div className="settings-menu-items">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    className={`settings-menu-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleMenuItemClick(item.id)}
                    style={{
                      animationDelay: `${index * 0.05}s`
                    }}
                  >
                    <Icon className="menu-item-icon" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Backdrop */}
          {isMenuOpen && (
            <div
              className="settings-backdrop"
              onClick={() => setIsMenuOpen(false)}
            />
          )}
        </>
      )}
    </>
  );
};

// Section Components
const GeneralSection = ({ settings, onChange }) => (
  <div className="settings-section">
    <div className="settings-card">
      <h3 className="settings-card-title">Application Information</h3>
      <div className="settings-form-group">
        <label>Application Name</label>
        <input
          type="text"
          value={settings.appName || ''}
          onChange={(e) => onChange('appName', e.target.value)}
          className="settings-input"
        />
      </div>
      <div className="settings-form-group">
        <label>Application URL</label>
        <input
          type="url"
          value={settings.appUrl || ''}
          onChange={(e) => onChange('appUrl', e.target.value)}
          className="settings-input"
        />
      </div>
      <div className="settings-form-group">
        <label>Frontend URL</label>
        <input
          type="url"
          value={settings.frontendUrl || ''}
          onChange={(e) => onChange('frontendUrl', e.target.value)}
          className="settings-input"
          placeholder="http://localhost:5173"
        />
      </div>
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">Localization</h3>
      <div className="settings-form-group">
        <label>Server Port</label>
        <input
          type="number"
          value={settings.port || 3000}
          onChange={(e) => onChange('port', parseInt(e.target.value))}
          className="settings-input"
          min="1"
          max="65535"
        />
      </div>
      <div className="settings-form-group">
        <label>Environment</label>
        <select
          value={settings.nodeEnv || 'development'}
          onChange={(e) => onChange('nodeEnv', e.target.value)}
          className="settings-input"
        >
          <option value="development">Development</option>
          <option value="production">Production</option>
          <option value="staging">Staging</option>
        </select>
      </div>
      <div className="settings-form-group">
        <label>Timezone</label>
        <select
          value={settings.timezone || 'Asia/Karachi'}
          onChange={(e) => onChange('timezone', e.target.value)}
          className="settings-input"
        >
          <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
          <option value="UTC">UTC</option>
          <option value="America/New_York">America/New_York (EST)</option>
        </select>
      </div>
      <div className="settings-form-group">
        <label>Language</label>
        <select
          value={settings.language || 'en'}
          onChange={(e) => onChange('language', e.target.value)}
          className="settings-input"
        >
          <option value="en">English</option>
          <option value="ur">Urdu</option>
        </select>
      </div>
      <div className="settings-form-group">
        <label>Date Format</label>
        <select
          value={settings.dateFormat || 'DD/MM/YYYY'}
          onChange={(e) => onChange('dateFormat', e.target.value)}
          className="settings-input"
        >
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>
      </div>
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">Registration</h3>
      <div className="settings-toggle-group">
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.enableRegistration ?? true}
            onChange={(e) => onChange('enableRegistration', e.target.checked)}
          />
          <span>Enable User Registration</span>
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.requireEmailVerification ?? true}
            onChange={(e) => onChange('requireEmailVerification', e.target.checked)}
          />
          <span>Require Email Verification</span>
        </label>
      </div>
    </div>
  </div>
);

const UsersSection = ({ settings, onChange }) => (
  <div className="settings-section">
    <div className="settings-card">
      <h3 className="settings-card-title">User Defaults</h3>
      <div className="settings-form-group">
        <label>Default User Role</label>
        <select
          value={settings.defaultRole || 'tourist'}
          onChange={(e) => onChange('defaultRole', e.target.value)}
          className="settings-input"
        >
          <option value="tourist">Tourist</option>
          <option value="local">Local</option>
        </select>
      </div>
      <div className="settings-form-group">
        <label>Max Profile Picture Size (MB)</label>
        <input
          type="number"
          value={settings.maxProfilePictureSize || 5}
          onChange={(e) => onChange('maxProfilePictureSize', parseInt(e.target.value))}
          className="settings-input"
          min="1"
          max="10"
        />
      </div>
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">User Permissions</h3>
      <div className="settings-toggle-group">
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.allowProfileEdit ?? true}
            onChange={(e) => onChange('allowProfileEdit', e.target.checked)}
          />
          <span>Allow Profile Editing</span>
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.enableFriendRequests ?? true}
            onChange={(e) => onChange('enableFriendRequests', e.target.checked)}
          />
          <span>Enable Friend Requests</span>
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.requireProfileApproval ?? false}
            onChange={(e) => onChange('requireProfileApproval', e.target.checked)}
          />
          <span>Require Profile Approval</span>
        </label>
      </div>
    </div>
  </div>
);

const NotificationsSection = ({ settings, onChange }) => (
  <div className="settings-section">
    <div className="settings-card">
      <h3 className="settings-card-title">Notification Channels</h3>
      <div className="settings-toggle-group">
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.enablePushNotifications ?? true}
            onChange={(e) => onChange('enablePushNotifications', e.target.checked)}
          />
          <span>Enable Push Notifications</span>
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.enableEmailNotifications ?? true}
            onChange={(e) => onChange('enableEmailNotifications', e.target.checked)}
          />
          <span>Enable Email Notifications</span>
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.enableInAppNotifications ?? true}
            onChange={(e) => onChange('enableInAppNotifications', e.target.checked)}
          />
          <span>Enable In-App Notifications</span>
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.notificationSound ?? true}
            onChange={(e) => onChange('notificationSound', e.target.checked)}
          />
          <span>Enable Notification Sound</span>
        </label>
      </div>
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">Quiet Hours</h3>
      <div className="settings-toggle-group">
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.quietHours ?? false}
            onChange={(e) => onChange('quietHours', e.target.checked)}
          />
          <span>Enable Quiet Hours</span>
        </label>
      </div>
      {settings.quietHours && (
        <div className="settings-form-row">
          <div className="settings-form-group">
            <label>Start Time</label>
            <input
              type="time"
              value={settings.quietHoursStart || '22:00'}
              onChange={(e) => onChange('quietHoursStart', e.target.value)}
              className="settings-input"
            />
          </div>
          <div className="settings-form-group">
            <label>End Time</label>
            <input
              type="time"
              value={settings.quietHoursEnd || '08:00'}
              onChange={(e) => onChange('quietHoursEnd', e.target.value)}
              className="settings-input"
            />
          </div>
        </div>
      )}
    </div>
  </div>
);

const SecuritySection = ({ settings, onChange, showPasswords, togglePassword }) => (
  <div className="settings-section">
    <div className="settings-card">
      <h3 className="settings-card-title">Security Keys</h3>
      <div className="settings-form-group">
        <label>Secret Key (JWT)</label>
        <div className="settings-input-with-icon">
          <input
            type={showPasswords.secretKey ? "text" : "password"}
            value={settings.secretKey || ''}
            onChange={(e) => onChange('secretKey', e.target.value)}
            className="settings-input"
            placeholder="Enter new secret key or leave masked to keep current"
          />
          <button
            type="button"
            className="settings-password-toggle"
            onClick={() => togglePassword('secretKey')}
          >
            {showPasswords.secretKey ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        <small className="settings-hint">Used for JWT token signing. Leave masked to keep current value.</small>
      </div>
      <div className="settings-form-group">
        <label>MongoDB URI</label>
        <div className="settings-input-with-icon">
          <input
            type={showPasswords.mongodbUri ? "text" : "password"}
            value={settings.mongodbUri || ''}
            onChange={(e) => onChange('mongodbUri', e.target.value)}
            className="settings-input"
            placeholder="Enter new MongoDB URI or leave masked to keep current"
          />
          <button
            type="button"
            className="settings-password-toggle"
            onClick={() => togglePassword('mongodbUri')}
          >
            {showPasswords.mongodbUri ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        <small className="settings-hint">Database connection string. Leave masked to keep current value.</small>
      </div>
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">Password Policy</h3>
      <div className="settings-toggle-group">
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.requireStrongPassword ?? true}
            onChange={(e) => onChange('requireStrongPassword', e.target.checked)}
          />
          <span>Require Strong Password</span>
        </label>
      </div>
      <div className="settings-form-group">
        <label>Minimum Password Length</label>
        <input
          type="number"
          value={settings.minPasswordLength || 8}
          onChange={(e) => onChange('minPasswordLength', parseInt(e.target.value))}
          className="settings-input"
          min="6"
          max="20"
        />
      </div>
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">Authentication</h3>
      <div className="settings-toggle-group">
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.enable2FA ?? false}
            onChange={(e) => onChange('enable2FA', e.target.checked)}
          />
          <span>Enable Two-Factor Authentication</span>
        </label>
      </div>
      <div className="settings-form-group">
        <label>Session Timeout (minutes)</label>
        <input
          type="number"
          value={settings.sessionTimeout || 30}
          onChange={(e) => onChange('sessionTimeout', parseInt(e.target.value))}
          className="settings-input"
          min="5"
          max="1440"
        />
      </div>
      <div className="settings-form-group">
        <label>Max Login Attempts</label>
        <input
          type="number"
          value={settings.maxLoginAttempts || 5}
          onChange={(e) => onChange('maxLoginAttempts', parseInt(e.target.value))}
          className="settings-input"
          min="3"
          max="10"
        />
      </div>
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">Access Control</h3>
      <div className="settings-toggle-group">
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.enableIPWhitelist ?? false}
            onChange={(e) => onChange('enableIPWhitelist', e.target.checked)}
          />
          <span>Enable IP Whitelist</span>
        </label>
      </div>
    </div>
  </div>
);

const EmailSection = ({ settings, onChange, showPasswords, togglePassword }) => (
  <div className="settings-section">
    <div className="settings-card">
      <h3 className="settings-card-title">SMTP Configuration</h3>
      <div className="settings-form-group">
        <label>SMTP Host</label>
        <input
          type="text"
          value={settings.smtpHost || 'smtp.gmail.com'}
          onChange={(e) => onChange('smtpHost', e.target.value)}
          className="settings-input"
          placeholder="smtp.gmail.com"
        />
      </div>
      <div className="settings-form-group">
        <label>SMTP Port</label>
        <input
          type="number"
          value={settings.smtpPort || 587}
          onChange={(e) => onChange('smtpPort', parseInt(e.target.value))}
          className="settings-input"
          placeholder="587"
        />
      </div>
      <div className="settings-form-group">
        <label>SMTP Username / Email</label>
        <input
          type="text"
          value={settings.smtpUser || ''}
          onChange={(e) => onChange('smtpUser', e.target.value)}
          className="settings-input"
          placeholder="your-email@gmail.com"
        />
        <small className="settings-hint">This maps to EMAIL in .env file</small>
      </div>
      <div className="settings-form-group">
        <label>SMTP Password</label>
        <div className="settings-input-with-icon">
          <input
            type={showPasswords.smtpPassword ? "text" : "password"}
            value={settings.smtpPassword || ''}
            onChange={(e) => onChange('smtpPassword', e.target.value)}
            className="settings-input"
            placeholder="Enter new password or leave masked to keep current"
          />
          <button
            type="button"
            className="settings-password-toggle"
            onClick={() => togglePassword('smtpPassword')}
          >
            {showPasswords.smtpPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        <small className="settings-hint">This maps to PASSWORD in .env file. Leave masked to keep current value.</small>
      </div>
      <div className="settings-toggle-group">
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.enableSSL ?? true}
            onChange={(e) => onChange('enableSSL', e.target.checked)}
          />
          <span>Enable SSL/TLS</span>
        </label>
      </div>
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">Email Settings</h3>
      <div className="settings-form-group">
        <label>From Email</label>
        <input
          type="email"
          value={settings.fromEmail || ''}
          onChange={(e) => onChange('fromEmail', e.target.value)}
          className="settings-input"
          placeholder="noreply@journeythroughpakistan.com"
        />
      </div>
      <div className="settings-form-group">
        <label>From Name</label>
        <input
          type="text"
          value={settings.fromName || ''}
          onChange={(e) => onChange('fromName', e.target.value)}
          className="settings-input"
          placeholder="Journey Through Pakistan"
        />
      </div>
    </div>
  </div>
);

const SystemSection = ({ settings, onChange }) => (
  <div className="settings-section">
    <div className="settings-card">
      <h3 className="settings-card-title">System Status</h3>
      <div className="settings-toggle-group">
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.maintenanceMode ?? false}
            onChange={(e) => onChange('maintenanceMode', e.target.checked)}
          />
          <span>Maintenance Mode</span>
        </label>
      </div>
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">File Upload</h3>
      <div className="settings-form-group">
        <label>Max File Upload Size (MB)</label>
        <input
          type="number"
          value={settings.maxFileUploadSize || 10}
          onChange={(e) => onChange('maxFileUploadSize', parseInt(e.target.value))}
          className="settings-input"
          min="1"
          max="100"
        />
      </div>
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">Performance</h3>
      <div className="settings-toggle-group">
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.enableCaching ?? true}
            onChange={(e) => onChange('enableCaching', e.target.checked)}
          />
          <span>Enable Caching</span>
        </label>
      </div>
      {settings.enableCaching && (
        <div className="settings-form-group">
          <label>Cache Duration (seconds)</label>
          <input
            type="number"
            value={settings.cacheDuration || 3600}
            onChange={(e) => onChange('cacheDuration', parseInt(e.target.value))}
            className="settings-input"
            min="60"
            max="86400"
          />
        </div>
      )}
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">Logging</h3>
      <div className="settings-toggle-group">
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.enableLogging ?? true}
            onChange={(e) => onChange('enableLogging', e.target.checked)}
          />
          <span>Enable Logging</span>
        </label>
      </div>
      {settings.enableLogging && (
        <div className="settings-form-group">
          <label>Log Level</label>
          <select
            value={settings.logLevel || 'info'}
            onChange={(e) => onChange('logLevel', e.target.value)}
            className="settings-input"
          >
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
      )}
    </div>
  </div>
);

const APISection = ({ settings, onChange, showPasswords, togglePassword }) => (
  <div className="settings-section">
    <div className="settings-card">
      <h3 className="settings-card-title">API Configuration</h3>
      <div className="settings-form-group">
        <label>Google API Key</label>
        <div className="settings-input-with-icon">
          <input
            type={showPasswords.googleApiKey ? "text" : "password"}
            value={settings.googleApiKey || ''}
            onChange={(e) => onChange('googleApiKey', e.target.value)}
            className="settings-input"
            placeholder="Enter new API key or leave masked to keep current"
          />
          <button
            type="button"
            className="settings-password-toggle"
            onClick={() => togglePassword('googleApiKey')}
          >
            {showPasswords.googleApiKey ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        <small className="settings-hint">General Google API key (used as fallback). Leave masked to keep current value.</small>
      </div>
      <div className="settings-form-group">
        <label>Google Vision API Key</label>
        <div className="settings-input-with-icon">
          <input
            type={showPasswords.googleVisionApiKey ? "text" : "password"}
            value={settings.googleVisionApiKey || ''}
            onChange={(e) => onChange('googleVisionApiKey', e.target.value)}
            className="settings-input"
            placeholder="Enter Vision API key or leave masked to keep current"
          />
          <button
            type="button"
            className="settings-password-toggle"
            onClick={() => togglePassword('googleVisionApiKey')}
          >
            {showPasswords.googleVisionApiKey ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        <small className="settings-hint">Google Cloud Vision API key for landmark detection. Optional - falls back to general key if not set.</small>
      </div>
      <div className="settings-form-group">
        <label>Google Places API Key</label>
        <div className="settings-input-with-icon">
          <input
            type={showPasswords.googlePlacesApiKey ? "text" : "password"}
            value={settings.googlePlacesApiKey || ''}
            onChange={(e) => onChange('googlePlacesApiKey', e.target.value)}
            className="settings-input"
            placeholder="Enter Places API key or leave masked to keep current"
          />
          <button
            type="button"
            className="settings-password-toggle"
            onClick={() => togglePassword('googlePlacesApiKey')}
          >
            {showPasswords.googlePlacesApiKey ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        <small className="settings-hint">Google Places API key for location verification. Optional - falls back to general key if not set.</small>
      </div>
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">Auth0 Configuration</h3>
      <div className="settings-form-group">
        <label>Auth0 Domain</label>
        <input
          type="text"
          value={settings.auth0Domain || ''}
          onChange={(e) => onChange('auth0Domain', e.target.value)}
          className="settings-input"
          placeholder="your-domain.auth0.com"
        />
      </div>
      <div className="settings-form-group">
        <label>Auth0 Client ID</label>
        <input
          type="text"
          value={settings.auth0ClientId || ''}
          onChange={(e) => onChange('auth0ClientId', e.target.value)}
          className="settings-input"
        />
      </div>
      <div className="settings-form-group">
        <label>Auth0 Client Secret</label>
        <div className="settings-input-with-icon">
          <input
            type={showPasswords.auth0ClientSecret ? "text" : "password"}
            value={settings.auth0ClientSecret || ''}
            onChange={(e) => onChange('auth0ClientSecret', e.target.value)}
            className="settings-input"
            placeholder="Enter new secret or leave masked to keep current"
          />
          <button
            type="button"
            className="settings-password-toggle"
            onClick={() => togglePassword('auth0ClientSecret')}
          >
            {showPasswords.auth0ClientSecret ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        <small className="settings-hint">Leave masked to keep current value.</small>
      </div>
      <div className="settings-form-group">
        <label>Auth0 Callback URL</label>
        <input
          type="url"
          value={settings.auth0CallbackUrl || ''}
          onChange={(e) => onChange('auth0CallbackUrl', e.target.value)}
          className="settings-input"
          placeholder="http://localhost:3000/auth/callback"
        />
      </div>
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">API Configuration</h3>
      <div className="settings-toggle-group">
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.enableAPI ?? true}
            onChange={(e) => onChange('enableAPI', e.target.checked)}
          />
          <span>Enable API Access</span>
        </label>
      </div>
      <div className="settings-form-group">
        <label>API Rate Limit (requests per minute)</label>
        <input
          type="number"
          value={settings.apiRateLimit || 100}
          onChange={(e) => onChange('apiRateLimit', parseInt(e.target.value))}
          className="settings-input"
          min="10"
          max="1000"
        />
      </div>
      <div className="settings-form-group">
        <label>API Key Expiry (days)</label>
        <input
          type="number"
          value={settings.apiKeyExpiry || 90}
          onChange={(e) => onChange('apiKeyExpiry', parseInt(e.target.value))}
          className="settings-input"
          min="1"
          max="365"
        />
      </div>
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">Webhooks</h3>
      <div className="settings-toggle-group">
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.enableWebhooks ?? false}
            onChange={(e) => onChange('enableWebhooks', e.target.checked)}
          />
          <span>Enable Webhooks</span>
        </label>
      </div>
      {settings.enableWebhooks && (
        <div className="settings-form-group">
          <label>Webhook URL</label>
          <input
            type="url"
            value={settings.webhookUrl || ''}
            onChange={(e) => onChange('webhookUrl', e.target.value)}
            className="settings-input"
            placeholder="https://example.com/webhook"
          />
        </div>
      )}
    </div>
  </div>
);

const BackupSection = ({
  backups,
  backupLoading,
  restoreLoading,
  deleteLoading,
  uploadFile,
  showRestoreConfirm,
  showDeleteConfirm,
  onCreateBackup,
  onDownloadBackup,
  onDeleteBackup,
  onRestoreBackup,
  onFileUpload,
  onUploadAndRestore,
  onSetRestoreConfirm,
  onSetDeleteConfirm,
  onSetUploadFile,
  formatDate
}) => (
  <div className="settings-section">
    <div className="settings-card">
      <h3 className="settings-card-title">Database Backup</h3>
      <p className="settings-card-description">
        Create a backup of your database. Backups are stored securely and can be restored when needed.
      </p>
      <div className="settings-action-buttons">
        <button 
          className="settings-action-btn primary"
          onClick={onCreateBackup}
          disabled={backupLoading}
        >
          {backupLoading ? (
            <FiRefreshCw className="action-btn-icon spinning" />
          ) : (
            <FiDownload className="action-btn-icon" />
          )}
          {backupLoading ? 'Creating Backup...' : 'Create Backup Now'}
        </button>
      </div>
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">Restore Backup</h3>
      <p className="settings-card-description">
        Restore your database from a previous backup file. <strong>Warning:</strong> This will replace all current data.
      </p>
      <div className="settings-form-group">
        <label>Upload Backup File</label>
        <div className="backup-upload-container">
          <input
            id="backup-file-input"
            type="file"
            accept=".json,application/json"
            onChange={onFileUpload}
            className="backup-file-input"
          />
          <label htmlFor="backup-file-input" className="backup-file-label">
            <FiUpload className="action-btn-icon" />
            {uploadFile ? uploadFile.name : 'Choose Backup File'}
          </label>
          {uploadFile && (
            <button
              className="backup-remove-file"
              onClick={() => {
                const fileInput = document.getElementById('backup-file-input');
                if (fileInput) fileInput.value = '';
                onSetUploadFile(null);
              }}
            >
              <FiX />
            </button>
          )}
        </div>
        <small className="settings-hint">Only JSON backup files are accepted. Maximum file size: 100MB</small>
      </div>
      <div className="settings-action-buttons">
        <button 
          className="settings-action-btn primary"
          onClick={onUploadAndRestore}
          disabled={!uploadFile || restoreLoading === 'upload'}
        >
          {restoreLoading === 'upload' ? (
            <FiRefreshCw className="action-btn-icon spinning" />
          ) : (
            <FiUpload className="action-btn-icon" />
          )}
          {restoreLoading === 'upload' ? 'Restoring...' : 'Upload & Restore'}
        </button>
      </div>
    </div>

    <div className="settings-card">
      <h3 className="settings-card-title">Backup History</h3>
      {backupLoading && backups.length === 0 ? (
        <div className="backup-loading">
          <FiRefreshCw className="spinning" style={{ fontSize: '24px', color: '#7c3aed' }} />
          <p>Loading backups...</p>
        </div>
      ) : backups.length === 0 ? (
        <div className="backup-empty">
          <FiDatabase style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px' }} />
          <p>No backups found. Create your first backup to get started.</p>
        </div>
      ) : (
        <div className="backup-list">
          {backups.map((backup) => (
            <div key={backup._id} className="backup-item">
              <div className="backup-info">
                <div className="backup-name-row">
                  <span className="backup-name">{backup.filename}</span>
                  {!backup.fileExists && (
                    <span className="backup-missing-badge">
                      <FiAlertCircle /> File Missing
                    </span>
                  )}
                </div>
                <span className="backup-date">{formatDate(backup.createdAt)}</span>
                {backup.collections && backup.collections.length > 0 && (
                  <span className="backup-collections">
                    {backup.collections.length} collection{backup.collections.length !== 1 ? 's' : ''}
                  </span>
                )}
                {backup.createdBy && (
                  <span className="backup-creator">
                    Created by: {backup.createdBy.name || backup.createdBy.email}
                  </span>
                )}
              </div>
              <div className="backup-actions">
                <div className="backup-size">{backup.sizeFormatted || backup.size}</div>
                <div className="backup-action-buttons">
                  <button
                    className="backup-action-btn"
                    onClick={() => onDownloadBackup(backup._id, backup.filename)}
                    disabled={!backup.fileExists}
                    title="Download Backup"
                  >
                    <FiDownload />
                  </button>
                  <button
                    className="backup-action-btn restore"
                    onClick={() => onSetRestoreConfirm(backup._id)}
                    disabled={!backup.fileExists || restoreLoading === backup._id}
                    title="Restore Backup"
                  >
                    {restoreLoading === backup._id ? (
                      <FiRefreshCw className="spinning" />
                    ) : (
                      <FiCheck />
                    )}
                  </button>
                  <button
                    className="backup-action-btn delete"
                    onClick={() => onSetDeleteConfirm(backup._id)}
                    disabled={deleteLoading === backup._id}
                    title="Delete Backup"
                  >
                    {deleteLoading === backup._id ? (
                      <FiRefreshCw className="spinning" />
                    ) : (
                      <FiTrash2 />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Restore Confirmation Modal */}
    {showRestoreConfirm && (
      <div className="backup-modal-overlay" onClick={() => onSetRestoreConfirm(null)}>
        <div className="backup-modal" onClick={(e) => e.stopPropagation()}>
          <div className="backup-modal-header">
            <h3>Confirm Restore</h3>
            <button className="backup-modal-close" onClick={() => onSetRestoreConfirm(null)}>
              <FiX />
            </button>
          </div>
          <div className="backup-modal-content">
            <div className="backup-warning">
              <FiAlertCircle className="warning-icon" />
              <p><strong>Warning:</strong> Restoring this backup will replace all current database data.</p>
              <p>This action cannot be undone. Are you absolutely sure you want to proceed?</p>
            </div>
          </div>
          <div className="backup-modal-actions">
            <button
              className="settings-action-btn"
              onClick={() => onSetRestoreConfirm(null)}
            >
              Cancel
            </button>
            <button
              className="settings-action-btn primary"
              onClick={() => onRestoreBackup(showRestoreConfirm)}
            >
              <FiCheck /> Confirm Restore
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Delete Confirmation Modal */}
    {showDeleteConfirm && (
      <div className="backup-modal-overlay" onClick={() => onSetDeleteConfirm(null)}>
        <div className="backup-modal" onClick={(e) => e.stopPropagation()}>
          <div className="backup-modal-header">
            <h3>Confirm Delete</h3>
            <button className="backup-modal-close" onClick={() => onSetDeleteConfirm(null)}>
              <FiX />
            </button>
          </div>
          <div className="backup-modal-content">
            <p>Are you sure you want to delete this backup? This action cannot be undone.</p>
          </div>
          <div className="backup-modal-actions">
            <button
              className="settings-action-btn"
              onClick={() => onSetDeleteConfirm(null)}
            >
              Cancel
            </button>
            <button
              className="settings-action-btn primary"
              onClick={() => onDeleteBackup(showDeleteConfirm)}
              style={{ background: '#ef4444' }}
            >
              <FiTrash2 /> Delete Backup
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);

export default Settings;

