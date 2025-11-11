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
  LineChart,
  Line,
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
import './Dashboard.css';

const Dashboard = () => {
  // Sample data for charts
  const signupData = [
    { month: 'Jan', signups: 200 },
    { month: 'Feb', signups: 250 },
    { month: 'Mar', signups: 280 },
    { month: 'Apr', signups: 240 },
    { month: 'May', signups: 290 },
    { month: 'Jun', signups: 300 },
  ];

  const categoryData = [
    { category: 'Food & Drink', value: 85 },
    { category: 'Attractions', value: 65 },
    { category: 'Shopping', value: 50 },
    { category: 'Nature', value: 35 },
    { category: 'Arts', value: 20 },
  ];

  const activities = [
    { icon: FiUser, text: "New user 'Alice Johnson' registered", time: '2 min ago' },
    { icon: FiMapPin, text: "'Central Park' added to NYC places", time: '15 min ago' },
    { icon: FiBookmark, text: "New recommendation for 'Cafe Mocha'", time: '30 min ago' },
    { icon: FiUser, text: "User 'Bob Smith' updated profile", time: '1 hour ago' },
    { icon: FiBookmark, text: "Content flagged in 'Times Square' listing", time: '2 hours ago' },
    { icon: FiBell, text: "System update notification sent to all admins", time: '4 hours ago' },
  ];

  const moderationItems = [
    { type: 'Comment', content: "Offensive language in 'Park Reviews'", flaggedBy: 'UserReport1' },
    { type: 'Recommendation', content: "Spam content detected for 'Discount Shoes'", flaggedBy: 'Automated System' },
    { type: 'Place', content: "Inaccurate details for 'Old Town Museum'", flaggedBy: 'Admin' },
    { type: 'Photo', content: "Irrelevant image in 'Beach Resort Gallery'", flaggedBy: 'UserReport2' },
  ];

  return (
    <div className="main-content">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Admin Dashboard</h1>
        <div className="action-buttons">
          <button className="action-btn">
            <FiUsers className="action-btn-icon" />
            Manage Users
          </button>
          <button className="action-btn">
            <FiMapPin className="action-btn-icon" />
            Manage Places
          </button>
          <button className="action-btn">
            <FiFileText className="action-btn-icon" />
            Review Flagged Content
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Total Users</span>
            <FiUsers className="kpi-card-icon" />
          </div>
          <div className="kpi-card-value">2,450</div>
          <div className="kpi-card-change positive">+8.2% from last period</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Active Sessions</span>
            <FiClock className="kpi-card-icon" />
          </div>
          <div className="kpi-card-value">850</div>
          <div className="kpi-card-change negative">-2.5% from last period</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Pending Posts</span>
            <FiFileText className="kpi-card-icon" />
          </div>
          <div className="kpi-card-value">45</div>
          <div className="kpi-card-change positive">+15% from last period</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Flagged Content</span>
            <FiAlertTriangle className="kpi-card-icon" />
          </div>
          <div className="kpi-card-value">12</div>
          <div className="kpi-card-change critical">Critical from last period</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">User Signups Over Time</h3>
          <p className="chart-subtitle">Monthly user registrations and growth trend.</p>
          <div style={{ flex: 1, minHeight: '300px' }}>
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
              <YAxis stroke="#666" domain={[0, 300]} ticks={[0, 75, 150, 225, 300]} />
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
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Content Categories Breakdown</h3>
          <p className="chart-subtitle">Distribution of content across major categories.</p>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#666" />
              <YAxis dataKey="category" type="category" stroke="#666" width={100} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Feed & Moderation */}
      <div className="content-grid">
        <div className="content-card">
          <h3 className="content-card-title">Recent Activity Feed</h3>
          <div style={{ flex: 1 }}>
            {activities.map((activity, index) => {
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
            })}
          </div>
        </div>

        <div className="content-card">
          <h3 className="content-card-title">Moderation Queue Snapshot</h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
            <button className="view-all-btn">View All Flagged Content</button>
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

