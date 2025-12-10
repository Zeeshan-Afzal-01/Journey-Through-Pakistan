import {
  FiCalendar,
  FiUsers,
  FiClock,
  FiActivity,
  FiTrendingUp,
  FiMapPin,
  FiMessageCircle,
  FiCamera,
  FiHeart
} from 'react-icons/fi';
import { useState, useEffect } from 'react';
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
import { SkeletonKPICard, SkeletonChart } from '../components/SkeletonLoader';
import { 
  getAnalytics, 
  getUserTrends, 
  getTopPlaces, 
  getChatActivity, 
  getPakistanRegions, 
  getTourismMetrics 
} from '../api/adminApi';
import { useToast } from '../components/ToastContainer';
import './Analytics.css';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState(null);
  const [userTrends, setUserTrends] = useState([]);
  const [topPlaces, setTopPlaces] = useState([]);
  const [chatActivity, setChatActivity] = useState([]);
  const [pakistanRegions, setPakistanRegions] = useState([]);
  const [tourismMetrics, setTourismMetrics] = useState(null);
  const { error: showError } = useToast();

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      
      const [analyticsRes, trendsRes, placesRes, chatRes, regionsRes, tourismRes] = await Promise.all([
        getAnalytics(),
        getUserTrends(),
        getTopPlaces(),
        getChatActivity(),
        getPakistanRegions(),
        getTourismMetrics()
      ]);

      setKpiData(analyticsRes.data);
      setUserTrends(trendsRes.data || []);
      setTopPlaces((placesRes.data || []).slice(0, 5)); // Top 5 places
      setChatActivity(chatRes.data || []);
      setPakistanRegions(regionsRes.data || []);
      setTourismMetrics(tourismRes.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      showError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Format KPI cards data
  const kpiCards = kpiData ? [
    {
      title: 'Total Signups',
      value: kpiData.kpis?.totalSignups?.toLocaleString() || '0',
      change: `+${kpiData.newSignups || 0} in last 30 days`,
      trend: 'positive',
      icon: FiUsers
    },
    {
      title: 'Current Active Users',
      value: kpiData.kpis?.activeUsers?.toLocaleString() || '0',
      change: 'Last 24 hours',
      trend: 'positive',
      icon: FiActivity
    },
    {
      title: 'Avg. Session Duration',
      value: kpiData.kpis?.avgSessionDuration || '00:00',
      change: 'Average time spent',
      trend: 'neutral',
      icon: FiClock
    },
    {
      title: 'Content Engagement',
      value: kpiData.kpis?.contentEngagement || '0%',
      change: 'Active users ratio',
      trend: 'positive',
      icon: FiTrendingUp
    }
  ] : [];

  // Tourism metrics summary
  const tourismSummary = tourismMetrics ? [
    { 
      label: 'Places Shared', 
      value: tourismMetrics.totalPlaces || 0, 
      icon: FiMapPin 
    },
    { 
      label: 'New Places Today', 
      value: tourismMetrics.newPlacesToday || 0, 
      icon: FiCamera 
    },
    { 
      label: 'Unique Destinations', 
      value: tourismMetrics.uniquePlacesCount || 0, 
      icon: FiHeart 
    }
  ] : [];

  if (loading) {
    return (
      <div className="analytics-content">
        <div className="analytics-header">
          <div>
            <div className="skeleton-text" style={{ width: '200px', height: '32px', marginBottom: '8px' }}></div>
            <div className="skeleton-text" style={{ width: '300px', height: '16px' }}></div>
          </div>
          <div className="analytics-actions">
            <div className="skeleton-button" style={{ width: '180px', height: '40px' }}></div>
            <div className="skeleton-button" style={{ width: '160px', height: '40px' }}></div>
          </div>
        </div>
        <div className="analytics-grid">
          <SkeletonKPICard />
          <SkeletonKPICard />
          <SkeletonKPICard />
          <SkeletonKPICard />
        </div>
        <div className="analytics-row">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <div className="analytics-row">
          <SkeletonChart />
          <div className="skeleton-card">
            <div className="skeleton-text" style={{ width: '200px', height: '24px', marginBottom: '16px' }}></div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ marginBottom: '16px' }}>
                <div className="skeleton-text" style={{ width: '100%', height: '40px' }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-content">
      <div className="analytics-header">
        <div>
          <h1>Pakistan Tourism Analytics</h1>
          <p>Insights into user growth, engagement, and tourism activity across Pakistan.</p>
        </div>
        <div className="analytics-actions">
          <button className="filter-btn" onClick={fetchAllAnalytics}>
            <FiCalendar />
            Refresh Data
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
            <h3>Top 5 Most Visited Places</h3>
            <p>Most popular destinations shared by users in Pakistan.</p>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPlaces}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="place" 
                  stroke="#94a3b8"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
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
            <h3>Chat Activity & Content Creation</h3>
            <p>Monthly overview of user communication and content sharing.</p>
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
                  name="Posts Created"
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
            <h3>User Distribution by Province</h3>
            <p>Distribution of users across Pakistan's provinces.</p>
          </div>
          <div className="region-list">
            {pakistanRegions.length > 0 ? (
              pakistanRegions.map(({ region, usage, percentage, highlight }) => (
                <div key={region} className={`region-item ${highlight ? 'highlight' : ''}`}>
                  <div>
                    <span className="region-name">{region}</span>
                    <span className="region-usage">{percentage}% ({usage} users)</span>
                  </div>
                  <div className="region-bar">
                    <div className="region-bar-fill" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                No regional data available
              </div>
            )}
          </div>
          <div className="moderation-summary">
            {tourismSummary.map(({ label, value, icon: Icon }) => (
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
