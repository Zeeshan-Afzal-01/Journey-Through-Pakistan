import {
  FiCalendar,
  FiUsers,
  FiClock,
  FiActivity,
  FiTrendingUp,
  FiTarget,
  FiMapPin,
  FiMessageCircle,
  FiFlag
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
  ResponsiveContainer,
  Legend
} from 'recharts';
import './Analytics.css';

const Analytics = () => {
  const kpiCards = [
    {
      title: 'Total Signups',
      value: '1,200',
      change: '+15% vs last month',
      trend: 'positive',
      icon: FiUsers
    },
    {
      title: 'Current Active Users',
      value: '850',
      change: '+8% vs yesterday',
      trend: 'positive',
      icon: FiActivity
    },
    {
      title: 'Avg. Session Duration',
      value: '05:32',
      change: '-2% vs last week',
      trend: 'negative',
      icon: FiClock
    },
    {
      title: 'Content Engagement',
      value: '72%',
      change: '+3% vs last month',
      trend: 'positive',
      icon: FiTrendingUp
    }
  ];

  const userTrends = [
    { month: 'Jan', newUsers: 220, activeUsers: 480 },
    { month: 'Feb', newUsers: 300, activeUsers: 520 },
    { month: 'Mar', newUsers: 960, activeUsers: 610 },
    { month: 'Apr', newUsers: 400, activeUsers: 560 },
    { month: 'May', newUsers: 520, activeUsers: 600 },
    { month: 'Jun', newUsers: 680, activeUsers: 640 },
    { month: 'Jul', newUsers: 720, activeUsers: 680 },
    { month: 'Aug', newUsers: 780, activeUsers: 720 },
    { month: 'Sep', newUsers: 820, activeUsers: 760 },
    { month: 'Oct', newUsers: 860, activeUsers: 810 },
    { month: 'Nov', newUsers: 910, activeUsers: 850 },
    { month: 'Dec', newUsers: 940, activeUsers: 900 }
  ];

  const searchedPlaces = [
    { place: 'Eiffel Tower', searches: 1520 },
    { place: 'Central Park', searches: 1280 },
    { place: 'Colosseum', searches: 1040 },
    { place: 'Tokyo Skytree', searches: 840 },
    { place: 'Burj Khalifa', searches: 760 }
  ];

  const chatActivity = [
    { month: 'Jan', chat: 600, downloads: 220 },
    { month: 'Feb', chat: 720, downloads: 260 },
    { month: 'Mar', chat: 900, downloads: 310 },
    { month: 'Apr', chat: 960, downloads: 340 },
    { month: 'May', chat: 1040, downloads: 420 },
    { month: 'Jun', chat: 1180, downloads: 500 },
    { month: 'Jul', chat: 1320, downloads: 590 },
    { month: 'Aug', chat: 1460, downloads: 640 },
    { month: 'Sep', chat: 1580, downloads: 720 },
    { month: 'Oct', chat: 1660, downloads: 780 },
    { month: 'Nov', chat: 1780, downloads: 850 },
    { month: 'Dec', chat: 1920, downloads: 940 }
  ];

  const regionUsage = [
    { region: 'South Asia', usage: 42, highlight: true },
    { region: 'Middle East', usage: 30 },
    { region: 'Europe', usage: 18 },
    { region: 'North America', usage: 10 }
  ];

  const moderationSummary = [
    { label: 'New Reports', value: 18, icon: FiFlag },
    { label: 'Resolved Today', value: 12, icon: FiTarget },
    { label: 'Open Tickets', value: 26, icon: FiMessageCircle }
  ];

  return (
    <div className="analytics-content">
      <div className="analytics-header">
        <div>
          <h1>Platform Analytics</h1>
          <p>Insight into user growth, engagement, and platform health.</p>
        </div>
        <div className="analytics-actions">
          <button className="filter-btn">
            <FiCalendar />
            Filter by Date Range
          </button>
          <button className="filter-btn secondary">
            <FiUsers />
            Filter by Segment
          </button>
        </div>
      </div>

      <div className="analytics-grid">
        {kpiCards.map(({ title, value, change, trend, icon: Icon }) => (
          <div key={title} className="analytics-card kpi-card">
            <div className="card-icon">
              <Icon />
            </div>
            <div className="card-label">{title}</div>
            <div className="card-value">{value}</div>
            <div className={`card-change ${trend}`}>{change}</div>
          </div>
        ))}
      </div>

      <div className="analytics-row">
        <div className="analytics-card chart-card">
          <div className="card-header">
            <h3>New & Active User Trends</h3>
            <p>Monthly trends for new registrations and daily active users.</p>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userTrends}>
                <defs>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="activeUsers"
                  name="Active Users"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#colorActive)"
                />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  name="New Users"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="analytics-card chart-card">
          <div className="card-header">
            <h3>Top 5 Most Searched Places</h3>
            <p>Insights into the most frequently searched locations.</p>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={searchedPlaces}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="place" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="searches" radius={[8, 8, 0, 0]} fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="analytics-row">
        <div className="analytics-card chart-card">
          <div className="card-header">
            <h3>Chat Activity & Content Downloads</h3>
            <p>Monthly overview of platform communication and content consumption.</p>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chatActivity}>
                <defs>
                  <linearGradient id="colorChat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="chat"
                  name="Chat Messages"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#colorChat)"
                  dot={{ r: 3 }}
                />
                <Area
                  type="monotone"
                  dataKey="downloads"
                  name="Downloads"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#colorDownloads)"
                  dot={{ r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="analytics-card region-card">
          <div className="card-header">
            <h3>Landmark Usage by Region</h3>
            <p>Distribution of landmark engagement across regions.</p>
          </div>
          <div className="region-list">
            {regionUsage.map(({ region, usage, highlight }) => (
              <div key={region} className={`region-item ${highlight ? 'highlight' : ''}`}>
                <div>
                  <span className="region-name">{region}</span>
                  <span className="region-usage">{usage}% of total</span>
                </div>
                <div className="region-bar">
                  <div className="region-bar-fill" style={{ width: `${usage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          <div className="moderation-summary">
            {moderationSummary.map(({ label, value, icon: Icon }) => (
              <div key={label} className="summary-item">
                <div className="summary-icon">
                  <Icon />
                </div>
                <div>
                  <div className="summary-value">{value}</div>
                  <div className="summary-label">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

