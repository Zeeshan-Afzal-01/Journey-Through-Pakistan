import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiUsers, 
  FiClock, 
  FiFileText, 
  FiAlertTriangle,
  FiMapPin,
  FiUser,
  FiBookmark,
  FiBell
} from 'react-icons/fi';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { 
  getDashboardStats, 
  getUserSignupsOverTime, 
  getContentCategoriesBreakdown, 
  getRecentActivities,
  sendNotificationToAllUsers
} from '../api/adminApi';
import { 
  SkeletonKPICard, 
  SkeletonChart, 
  SkeletonActivityFeed,
  SkeletonCard 
} from '../components/SkeletonLoader';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalUsersChange: '0.0',
    activeSessions: 0,
    activeSessionsChange: '0.0',
    pendingPosts: 0,
    pendingPostsChange: '0.0',
    flaggedContent: 0,
    flaggedContentChange: '0.0'
  });
  const [signupData, setSignupData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [activities, setActivities] = useState([]);
  const [moderationItems, setModerationItems] = useState([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);

  // Icon mapping for activities
  const iconMap = {
    'user': FiUser,
    'mapPin': FiMapPin,
    'bookmark': FiBookmark,
    'bell': FiBell
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [statsRes, signupsRes, categoriesRes, activitiesRes] = await Promise.all([
        getDashboardStats(),
        getUserSignupsOverTime(),
        getContentCategoriesBreakdown(),
        getRecentActivities()
      ]);

      if (statsRes.data) {
        setStats(statsRes.data);
      }

      if (signupsRes.data) {
        setSignupData(signupsRes.data);
      }

      if (categoriesRes.data) {
        setCategoryData(categoriesRes.data);
      }

      if (activitiesRes.data) {
        const formattedActivities = activitiesRes.data.map(activity => ({
          ...activity,
          icon: iconMap[activity.icon] || FiUser
        }));
        setActivities(formattedActivities);
      }

      // For moderation items, we can use flagged content from stats
      // This is a simplified version - you can enhance it later
      if (statsRes.data && statsRes.data.flaggedContent > 0) {
        setModerationItems([
          { type: 'Post', content: 'Content requires review', flaggedBy: 'System' },
          { type: 'Comment', content: 'Reported content pending moderation', flaggedBy: 'User' }
        ]);
      } else {
        setModerationItems([]);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Get change class based on value
  const getChangeClass = (change, isCritical = false) => {
    if (isCritical) return 'critical';
    const numChange = parseFloat(change);
    if (numChange > 0) return 'positive';
    if (numChange < 0) return 'negative';
    return '';
  };

  // Format change text
  const formatChange = (change, isCritical = false) => {
    if (isCritical) return 'Critical from last period';
    const numChange = parseFloat(change);
    if (numChange > 0) return `+${change}% from last period`;
    if (numChange < 0) return `${change}% from last period`;
    return 'No change from last period';
  };

  // Handle send notification
  const handleSendNotification = async () => {
    if (!notificationMessage.trim()) {
      alert('Please enter a notification message');
      return;
    }

    try {
      setSendingNotification(true);
      const response = await sendNotificationToAllUsers({
        title: notificationTitle.trim() || 'Admin Announcement',
        message: notificationMessage.trim()
      });

      if (response.data.success) {
        alert(`Successfully sent notification to ${response.data.notificationsCount} users!`);
        setNotificationTitle('');
        setNotificationMessage('');
        setShowNotificationModal(false);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert(error.response?.data?.message || 'Failed to send notification. Please try again.');
    } finally {
      setSendingNotification(false);
    }
  };

  // Calculate max value for Y axis
  const getMaxSignups = () => {
    if (signupData.length === 0) return 300;
    const max = Math.max(...signupData.map(d => d.signups));
    return Math.ceil(max / 75) * 75; // Round up to nearest 75
  };

  // Calculate max value for categories
  const getMaxCategoryValue = () => {
    if (categoryData.length === 0) return 100;
    const max = Math.max(...categoryData.map(d => d.value));
    return Math.ceil(max / 25) * 25; // Round up to nearest 25
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Admin Dashboard</h1>
          <div className="action-buttons">
            <div className="skeleton-button" style={{ width: '140px', height: '40px' }}></div>
            <div className="skeleton-button" style={{ width: '140px', height: '40px' }}></div>
            <div className="skeleton-button" style={{ width: '180px', height: '40px' }}></div>
          </div>
        </div>

        {/* KPI Cards Skeleton */}
        <div className="kpi-grid">
          <SkeletonKPICard />
          <SkeletonKPICard />
          <SkeletonKPICard />
          <SkeletonKPICard />
        </div>

        {/* Charts Skeleton */}
        <div className="charts-grid">
          <SkeletonChart />
          <SkeletonChart />
        </div>

        {/* Activity Feed & Moderation Skeleton */}
        <div className="content-grid">
          <SkeletonCard>
            <div className="skeleton-text" style={{ width: '200px', height: '24px', marginBottom: '16px' }}></div>
            <SkeletonActivityFeed items={6} />
          </SkeletonCard>
          <SkeletonCard>
            <div className="skeleton-text" style={{ width: '250px', height: '24px', marginBottom: '16px' }}></div>
            <div className="skeleton-table">
              <div className="skeleton-table-header">
                <div className="skeleton-text skeleton-header-cell"></div>
                <div className="skeleton-text skeleton-header-cell"></div>
                <div className="skeleton-text skeleton-header-cell"></div>
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-table-row">
                  <div className="skeleton-text skeleton-cell"></div>
                  <div className="skeleton-text skeleton-cell"></div>
                  <div className="skeleton-text skeleton-cell"></div>
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Admin Dashboard</h1>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => navigate('/users')}>
            <FiUsers className="action-btn-icon" />
            Manage Users
          </button>
          <button className="action-btn" onClick={() => navigate('/recommendations')}>
            <FiMapPin className="action-btn-icon" />
            Manage Places
          </button>
          <button className="action-btn" onClick={() => navigate('/moderation')}>
            <FiFileText className="action-btn-icon" />
            Review Flagged Content
          </button>
          <button className="action-btn" onClick={() => setShowNotificationModal(true)}>
            <FiBell className="action-btn-icon" />
            Send Notification
          </button>
        </div>
      </div>

      {/* Notification Send Modal */}
      {showNotificationModal && (
        <div className="notification-modal-overlay" onClick={() => !sendingNotification && setShowNotificationModal(false)}>
          <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notification-modal-header">
              <h2 className="notification-modal-title">Send Notification to All Users</h2>
              <button 
                className="notification-modal-close" 
                onClick={() => setShowNotificationModal(false)}
                disabled={sendingNotification}
              >
                ×
              </button>
            </div>
            <div className="notification-modal-body">
              <div className="notification-form-group">
                <label className="notification-label">Title (Optional)</label>
                <input
                  type="text"
                  className="notification-input"
                  placeholder="Enter notification title"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  disabled={sendingNotification}
                />
              </div>
              <div className="notification-form-group">
                <label className="notification-label">Message *</label>
                <textarea
                  className="notification-textarea"
                  placeholder="Enter notification message"
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  rows={6}
                  disabled={sendingNotification}
                />
              </div>
              <div className="notification-modal-footer">
                <button
                  className="notification-btn-cancel"
                  onClick={() => setShowNotificationModal(false)}
                  disabled={sendingNotification}
                >
                  Cancel
                </button>
                <button
                  className="notification-btn-send"
                  onClick={handleSendNotification}
                  disabled={sendingNotification || !notificationMessage.trim()}
                >
                  {sendingNotification ? 'Sending...' : 'Send to All Users'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Total Users</span>
            <FiUsers className="kpi-card-icon" />
          </div>
          <div className="kpi-card-value">{formatNumber(stats.totalUsers)}</div>
          <div className={`kpi-card-change ${getChangeClass(stats.totalUsersChange)}`}>
            {formatChange(stats.totalUsersChange)}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Active Sessions</span>
            <FiClock className="kpi-card-icon" />
          </div>
          <div className="kpi-card-value">{formatNumber(stats.activeSessions)}</div>
          <div className={`kpi-card-change ${getChangeClass(stats.activeSessionsChange)}`}>
            {formatChange(stats.activeSessionsChange)}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Pending Posts</span>
            <FiFileText className="kpi-card-icon" />
          </div>
          <div className="kpi-card-value">{formatNumber(stats.pendingPosts)}</div>
          <div className={`kpi-card-change ${getChangeClass(stats.pendingPostsChange)}`}>
            {formatChange(stats.pendingPostsChange)}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Flagged Content</span>
            <FiAlertTriangle className="kpi-card-icon" />
          </div>
          <div className="kpi-card-value">{formatNumber(stats.flaggedContent)}</div>
          <div className={`kpi-card-change ${getChangeClass(stats.flaggedContentChange, stats.flaggedContentChange === 'Critical')}`}>
            {formatChange(stats.flaggedContentChange, stats.flaggedContentChange === 'Critical')}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">User Signups Over Time</h3>
          <p className="chart-subtitle">Monthly user registrations and growth trend.</p>
          <div style={{ flex: 1, minHeight: '300px' }}>
            {signupData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={signupData}>
                  <defs>
                    <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" domain={[0, 15]} />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="signups" 
                    stroke="#7c3aed" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSignups)" 
                    dot={{ fill: '#7c3aed', r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#666' }}>
                No data available
              </div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Content Categories Breakdown</h3>
          <p className="chart-subtitle">Distribution of content across major categories.</p>
          <div style={{ flex: 1, minHeight: '300px' }}>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#666" domain={[0, getMaxCategoryValue()]} />
                  <YAxis dataKey="category" type="category" stroke="#666" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#666' }}>
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Feed & Moderation */}
      <div className="content-grid">
        <div className="content-card">
          <h3 className="content-card-title">Recent Activity Feed</h3>
          <div style={{ flex: 1 }}>
            {activities.length > 0 ? (
              activities.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={index} className="activity-item">
                    <Icon className="activity-icon" />
                    <div className="activity-content">
                      <div className="activity-text">{activity.text}</div>
                      <div className="activity-time">{activity.time}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                No recent activities
              </div>
            )}
          </div>
        </div>

        <div className="content-card">
          <h3 className="content-card-title">Moderation Queue Snapshot</h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {moderationItems.length > 0 ? (
              <>
                <table className="moderation-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Content</th>
                      <th>Flagged By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moderationItems.map((item, index) => (
                      <tr key={index}>
                        <td className="moderation-type">{item.type}</td>
                        <td>{item.content}</td>
                        <td>{item.flaggedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="view-all-btn" onClick={() => navigate('/moderation')}>
                  View All Flagged Content
                </button>
              </>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p>No flagged content</p>
                <button className="view-all-btn" onClick={() => navigate('/moderation')} style={{ marginTop: '20px' }}>
                  View Moderation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="system-health">
        <h3 className="system-health-title">System Health Overview</h3>
        <p className="system-health-subtitle">Current status of critical services.</p>
        <div className="system-item">
          <span className="system-name">Database Connection</span>
          <span className="status-badge operational">Operational</span>
        </div>
        <div className="system-item">
          <span className="system-name">API Gateway Status</span>
          <span className="status-badge operational">Operational</span>
        </div>
        <div className="system-item">
          <span className="system-name">Storage Usage</span>
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '70%' }}></div>
            </div>
            <span className="progress-text">70%</span>
          </div>
        </div>
        <div className="system-item">
          <span className="system-name">Email Service</span>
          <span className="status-badge degraded">Degraded</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

