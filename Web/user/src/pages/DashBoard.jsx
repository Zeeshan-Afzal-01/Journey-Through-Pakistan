import React,{useContext, useEffect, useState, useRef, useCallback} from "react";
import { motion } from "framer-motion";
import { FiBookmark, FiGrid, FiUser, FiStar, FiMessageCircle } from "react-icons/fi";
import { Link } from "react-router-dom";
import "../assests/css/dashboard.css";
import { AuthContext } from "../context/AuthContext";
import { getCommunityAttractionsByMonth, getRecentActivities, getUserStats, getLocalConnections } from "../api/authApi.jsx";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardSkeleton } from '../components/SkeletonLoader.jsx';
import "../assests/css/skeleton.css";

const Dashboard = () => {
  const { user } = useContext(AuthContext)
  const userRole = user.role === "tourist"?true:false
  const [attractionsData, setAttractionsData] = useState([])
  const [loadingAttractions, setLoadingAttractions] = useState(true)
  const [timePeriod, setTimePeriod] = useState('12months') // '7days', '30days', '12months', 'year'
  const [activities, setActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [userStats, setUserStats] = useState({ postsCount: 0, savedPostsCount: 0, friendsCount: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [localConnectionsCount, setLocalConnectionsCount] = useState(0)
  const [loadingLocalConnections, setLoadingLocalConnections] = useState(true)
  const pollingIntervalRef = useRef(null)
  const activitiesPollingRef = useRef(null)
  const statsPollingRef = useRef(null)
  const timePeriodRef = useRef('12months') // Keep current timePeriod in ref to avoid stale closure

  const fetchAttractionsData = useCallback(async (skipLoading = false, period = null) => {
    try {
      const periodToUse = period || timePeriodRef.current || timePeriod
      if (!skipLoading) {
        setLoadingAttractions(true)
      }
      const response = await getCommunityAttractionsByMonth(periodToUse)
      const data = response?.data || []
      setAttractionsData(Array.isArray(data) ? data : [])
      setLoadingAttractions(false)
    } catch (error) {
      console.error('Error fetching attractions data:', error)
      setAttractionsData([])
      setLoadingAttractions(false)
    }
  }, [])
  
  // Update ref when timePeriod changes
  useEffect(() => {
    timePeriodRef.current = timePeriod
  }, [timePeriod])
  
  // Handle time period change and polling interval
  useEffect(() => {
    // Refetch when time period changes (only after initial load)
    if (!initialLoading) {
      fetchAttractionsData()
    }
    
    // Clear existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    
    // Create new interval with updated timePeriod (only if not in initial loading)
    if (!initialLoading) {
      pollingIntervalRef.current = setInterval(() => {
        fetchAttractionsData(true, timePeriodRef.current) // Use ref to get current value
      }, 30000)
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [timePeriod, initialLoading, fetchAttractionsData])

  const fetchRecentActivities = async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoadingActivities(true)
      }
      const { data } = await getRecentActivities()
      setActivities(Array.isArray(data) ? data : [])
      setLoadingActivities(false)
    } catch (error) {
      console.error('Error fetching recent activities:', error)
      setLoadingActivities(false)
    }
  }

  const fetchUserStats = async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoadingStats(true)
      }
      const { data } = await getUserStats()
      setUserStats({
        postsCount: data.postsCount || 0,
        savedPostsCount: data.savedPostsCount || 0,
        friendsCount: data.friendsCount || 0
      })
      setLoadingStats(false)
    } catch (error) {
      console.error('Error fetching user stats:', error)
      setLoadingStats(false)
    }
  }

  const fetchLocalConnections = async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoadingLocalConnections(true)
      }
      const { data } = await getLocalConnections()
      setLocalConnectionsCount(Array.isArray(data) ? data.length : 0)
      setLoadingLocalConnections(false)
    } catch (error) {
      console.error('Error fetching local connections:', error)
      setLocalConnectionsCount(0)
      setLoadingLocalConnections(false)
    }
  }

  const getTimeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now - then) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  }

  useEffect(() => {
    // Initial fetch
    const loadInitialData = async () => {
      setInitialLoading(true)
      await Promise.all([
        fetchAttractionsData(),
        fetchRecentActivities(),
        fetchUserStats(),
        fetchLocalConnections()
      ])
      setInitialLoading(false)
    }
    
    loadInitialData()
    
    // Set up polling every 30 seconds for real-time updates (only after initial load)
    // Reduced frequency to avoid constant reloading and improve performance
    const setupPolling = () => {
      pollingIntervalRef.current = setInterval(() => {
        // Use ref to get current timePeriod value, not stale closure value
        fetchAttractionsData(true, timePeriodRef.current)
      }, 30000) // Update every 30 seconds
      
      // Set up polling for activities every 30 seconds
      activitiesPollingRef.current = setInterval(() => {
        fetchRecentActivities(true) // Skip loading state
      }, 30000) // Update every 30 seconds
      
      // Set up polling for stats every 30 seconds
      statsPollingRef.current = setInterval(() => {
        fetchUserStats(true) // Skip loading state
      }, 30000) // Update every 30 seconds
    }
    
    // Setup polling after initial load (wait 2 seconds to avoid immediate reload)
    const timeoutId = setTimeout(setupPolling, 2000)
    
    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      if (activitiesPollingRef.current) {
        clearInterval(activitiesPollingRef.current)
        activitiesPollingRef.current = null
      }
      if (statsPollingRef.current) {
        clearInterval(statsPollingRef.current)
        statsPollingRef.current = null
      }
    }
  }, [])

  if (initialLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="container-fluid p-4 ">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4"
      >
        <h2 className="fw-bold mb-2">Welcome Back,{userRole?"Traveler":"Local"}</h2>
        <p className="text-muted mb-0">
          Explore your personalized journey through the majestic landscapes and rich culture of Pakistan.
        </p>
      </motion.div>

      {/* Quick Actions */}
      <div className="row g-3 mb-4 text-center quick-actions-row">
        <div className="col-6 col-md-3">
          <Link to="/landmark" className="btn btn-primary w-100 py-3 rounded-3 shadow-sm">
            <FiGrid className="me-2" /> Landmark ID
          </Link>
        </div>
        <div className="col-6 col-md-3">
          <Link to="/community" className="btn btn-primary w-100 py-3 rounded-3 shadow-sm">
            <FiGrid className="me-2" /> New Community Post
          </Link>
        </div>
        <div className="col-6 col-md-3">
          <Link to="/chats" className="btn btn-primary w-100 py-3 rounded-3 shadow-sm">
            <FiMessageCircle className="me-2" /> Chat with Local
          </Link>
        </div>
        <div className="col-6 col-md-3">
          <Link to="/recommendations" className="btn btn-primary w-100 py-3 rounded-3 shadow-sm">
            <FiStar className="me-2" /> Get recommendations
          </Link>
        </div>
      </div>

      {/* At a glance */}
      <h5 className="fw-bold mb-3">Your Journey At A Glance</h5>
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted small">Saved Places</div>
                <div className="display-6 fw-bold">42</div>
              </div>
              <FiBookmark size={22} className="text-secondary" />
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted small">Landmarks Identified</div>
                <div className="display-6 fw-bold">18</div>
              </div>
              <FiGrid size={22} className="text-secondary" />
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted small">Community Contributions</div>
                {loadingStats ? (
                  <div className="skeleton-text" style={{ width: '40px', height: '48px' }}></div>
                ) : (
                  <div className="display-6 fw-bold">{userStats.postsCount}</div>
                )}
              </div>
              <FiUser size={22} className="text-secondary" />
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted small">Local Connections</div>
                {loadingLocalConnections ? (
                  <div className="skeleton-text" style={{ width: '40px', height: '48px' }}></div>
                ) : (
                  <div className="display-6 fw-bold">{localConnectionsCount}</div>
                )}
              </div>
              <FiMessageCircle size={22} className="text-secondary" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent + Progress */}
      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Recent Activity</h6>
              {loadingActivities ? (
                <div className="d-flex flex-column gap-2">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="d-flex justify-content-between align-items-center">
                      <div className="skeleton-text" style={{ width: '70%', height: '16px' }}></div>
                      <div className="skeleton-text" style={{ width: '80px', height: '14px' }}></div>
                    </div>
                  ))}
                </div>
              ) : activities.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {activities.slice(0, 6).map((activity, index) => (
                    <li key={index} className="list-group-item d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <span>{activity.description}</span>
                      </div>
                      <small className="text-muted ms-2" style={{ whiteSpace: 'nowrap' }}>
                        {getTimeAgo(activity.timestamp)}
                      </small>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-4 text-muted">
                  <p className="mb-0">No recent activity</p>
                  <small>Your activities will appear here</small>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-6">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">Community Participation</h6>
                <select 
                  className="form-select form-select-sm" 
                  style={{ width: 'auto', minWidth: '140px' }}
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value)}
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="12months">Last 12 Months</option>
                  <option value="year">Last Year</option>
                </select>
              </div>
              {loadingAttractions ? (
                <div className="skeleton-image" style={{ width: '100%', height: '280px', borderRadius: '8px' }}></div>
              ) : (
                <div style={{ width: '100%', height: '280px', minHeight: '280px' }}>
                  {attractionsData && Array.isArray(attractionsData) && attractionsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={attractionsData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e6" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tick={{ fontSize: 11 }}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                          }}
                          labelStyle={{ fontWeight: 'bold' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="posts" 
                          stroke="#4F46E5" 
                          strokeWidth={2}
                          dot={{ fill: '#4F46E5', r: 4 }}
                          activeDot={{ r: 6 }}
                          name="Posts"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="comments" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          dot={{ fill: '#10B981', r: 4 }}
                          activeDot={{ r: 6 }}
                          name="Comments"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="shares" 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          dot={{ fill: '#F59E0B', r: 4 }}
                          activeDot={{ r: 6 }}
                          name="Shares"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#EF4444" 
                          strokeWidth={2}
                          dot={{ fill: '#EF4444', r: 4 }}
                          activeDot={{ r: 6 }}
                          name="Total Participation"
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '280px' }}>
                      <p className="mb-2 text-muted">No participation data available</p>
                      <small className="text-muted">Community activity will appear here</small>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personalized Recommendations */}
      <div className="mt-4">
        <h5 className="fw-bold mb-3">Personalized Recommendations For You</h5>
        <div className="row g-3">
          <div className="col-12 col-md-6 col-xl-4">
            <div className="card recommendation-card shadow-sm h-100">
              <img className="card-img-top" src="https://images.unsplash.com/photo-1605099256177-3b1b43b77fff?q=80&w=1200&auto=format&fit=crop" alt="Neelum Valley" />
              <div className="card-body">
                <h6 className="fw-bold mb-1">Neelum Valley</h6>
                <div className="text-muted small mb-2"><FiGrid className="me-1" />Azad Kashmir</div>
                <p className="mb-0 text-muted">Known for its lush greenery, stunning waterfalls, and serene rivers. Ideal for nature lovers and trekkers.</p>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6 col-xl-4">
            <div className="card recommendation-card shadow-sm h-100">
              <img className="card-img-top" src="https://images.unsplash.com/photo-1591104224523-7a7a00305d01?q=80&w=1200&auto=format&fit=crop" alt="Hunza Valley" />
              <div className="card-body">
                <h6 className="fw-bold mb-1">Hunza Valley</h6>
                <div className="text-muted small mb-2"><FiGrid className="me-1" />Gilgit-Baltistan</div>
                <p className="mb-0 text-muted">A majestic mountain valley famous for its ancient forts, apricot orchards, and breathtaking views of Rakaposhi.</p>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6 col-xl-4">
            <div className="card recommendation-card shadow-sm h-100">
              <img className="card-img-top" src="https://images.unsplash.com/photo-1589307004173-3c952054f62d?q=80&w=1200&auto=format&fit=crop" alt="Badshahi Mosque" />
              <div className="card-body">
                <h6 className="fw-bold mb-1">Badshahi Mosque</h6>
                <div className="text-muted small mb-2"><FiGrid className="me-1" />Lahore, Punjab</div>
                <p className="mb-0 text-muted">An iconic Mughal-era mosque, showcasing exquisite architecture and a rich history.</p>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-xl-4">
            <div className="card recommendation-card shadow-sm h-100">
              <img className="card-img-top" src="https://images.unsplash.com/photo-1569396116180-210c18aa4a9b?q=80&w=1200&auto=format&fit=crop" alt="Fairy Meadows" />
              <div className="card-body">
                <h6 className="fw-bold mb-1">Fairy Meadows</h6>
                <div className="text-muted small mb-2"><FiGrid className="me-1" />Diamer District, Gilgit-Baltistan</div>
                <p className="mb-0 text-muted">A picturesque grassland facing Nanga Parbat, offering unparalleled views and a base camp for trekkers.</p>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6 col-xl-4">
            <div className="card recommendation-card shadow-sm h-100">
              <img className="card-img-top" src="https://images.unsplash.com/photo-1620419930304-6b12b8d3f5a1?q=80&w=1200&auto=format&fit=crop" alt="Mohenjo-Daro" />
              <div className="card-body">
                <h6 className="fw-bold mb-1">Mohenjo-Daro</h6>
                <div className="text-muted small mb-2"><FiGrid className="me-1" />Sindh</div>
                <p className="mb-0 text-muted">Ancient city ruins from the Indus Valley Civilization, a UNESCO World Heritage Site.</p>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6 col-xl-4">
            <div className="card recommendation-card shadow-sm h-100">
              <img className="card-img-top" src="https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=1200&auto=format&fit=crop" alt="Saif-ul-Malook Lake" />
              <div className="card-body">
                <h6 className="fw-bold mb-1">Saif-ul-Malook Lake</h6>
                <div className="text-muted small mb-2"><FiGrid className="me-1" />Naran, Khyber Pakhtunkhwa</div>
                <p className="mb-0 text-muted">A stunning alpine lake at 3,224 meters, surrounded by towering mountains and folklore.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center my-4">
          <Link to="/recommendations" className="btn btn-discover px-4 py-2">Discover More Destinations</Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
