import React,{useContext, useEffect, useState, useRef, useCallback} from "react";
import { motion } from "framer-motion";
import { FiBookmark, FiGrid, FiUser, FiStar, FiMessageCircle } from "react-icons/fi";
import { Link } from "react-router-dom";
import "../assests/css/dashboard.css";
import { AuthContext } from "../context/AuthContext";
import { getCommunityAttractionsByMonth, getRecentActivities, getUserStats, getLocalConnections } from "../api/authApi.jsx";
import { getPersonalizedRecommendations } from "../api/recommendationsApi.jsx";
import { markPlaceVisited, toggleSavePlace } from "../api/placesApi.jsx";
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
  const [userStats, setUserStats] = useState({ postsCount: 0, savedPostsCount: 0, friendsCount: 0, landmarksCount: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [localConnectionsCount, setLocalConnectionsCount] = useState(0)
  const [loadingLocalConnections, setLoadingLocalConnections] = useState(true)
  const [recommendations, setRecommendations] = useState([])
  const [recommendationsReason, setRecommendationsReason] = useState("Based on your interests and nearby location")
  const [loadingRecommendations, setLoadingRecommendations] = useState(true)
  const [placeActionLoading, setPlaceActionLoading] = useState({})
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
        friendsCount: data.friendsCount || 0,
        landmarksCount: data.landmarksCount || 0
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

  const getBrowserLocation = () => {
    return new Promise((resolve) => {
      if (!navigator?.geolocation) return resolve(null);

      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => resolve(null),
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 10 * 60 * 1000,
        }
      );
    });
  };

  const formatDistance = (meters) => {
    if (typeof meters !== "number" || !Number.isFinite(meters)) return "Distance unavailable";
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatEstimatedCost = (place) => {
    const value =
      place?.estimatedCost ??
      place?.estimated_cost ??
      place?.cost ??
      place?.price ??
      null;

    if (value === null || value === undefined || value === "") return "N/A";
    if (typeof value === "number" && Number.isFinite(value)) return `PKR ${value.toLocaleString()}`;
    return String(value);
  };

  const fetchRecommendations = async () => {
    try {
      setLoadingRecommendations(true)
      const loc = await getBrowserLocation()
      const params = loc ? { lat: loc.lat, lng: loc.lng } : {}
      const { data } = await getPersonalizedRecommendations(params)

      setRecommendationsReason(data?.reason || "Based on your interests and nearby location")
      setRecommendations(Array.isArray(data?.recommendations) ? data.recommendations : [])
      setLoadingRecommendations(false)
    } catch (error) {
      console.error('Error fetching personalized recommendations:', error)
      setRecommendations([])
      setLoadingRecommendations(false)
    }
  }

  const setActionLoading = (placeId, value) => {
    setPlaceActionLoading((prev) => ({ ...prev, [placeId]: value }));
  };

  const handleMarkVisited = async (placeId) => {
    if (!placeId) return;
    try {
      setActionLoading(placeId, true);
      await markPlaceVisited(placeId);
      // Optimistic UX: remove from list immediately since visited places are excluded in future fetches.
      setRecommendations((prev) => prev.filter((p) => p?._id !== placeId));
    } catch (error) {
      console.error("Error marking visited:", error);
    } finally {
      setActionLoading(placeId, false);
    }
  };

  const handleToggleSave = async (placeId) => {
    if (!placeId) return;
    try {
      setActionLoading(placeId, true);
      await toggleSavePlace(placeId);
    } catch (error) {
      console.error("Error saving place:", error);
    } finally {
      setActionLoading(placeId, false);
    }
  };

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
    fetchRecommendations()
    
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
                {loadingStats ? (
                  <div className="skeleton-text" style={{ width: '40px', height: '48px' }}></div>
                ) : (
                  <div className="display-6 fw-bold">{userStats.landmarksCount}</div>
                )}
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
        <p className="text-muted mb-3">{recommendationsReason}</p>

        {loadingRecommendations ? (
          <div className="row g-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="col-12 col-md-6 col-xl-4">
                <div className="card recommendation-card shadow-sm h-100">
                  <div className="recommendation-cover skeleton-image"></div>
                  <div className="card-body">
                    <div className="skeleton-text mb-2" style={{ width: '70%', height: '16px' }}></div>
                    <div className="skeleton-text mb-2" style={{ width: '50%', height: '14px' }}></div>
                    <div className="skeleton-text" style={{ width: '90%', height: '14px' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : recommendations.length > 0 ? (
          <div className="row g-3">
            {recommendations.slice(0, 10).map((place) => (
              <div key={place._id} className="col-12 col-md-6 col-xl-4">
                <div className="card recommendation-card shadow-sm h-100">
                  <div className="recommendation-cover"></div>
                  <div className="card-body">
                    <h6 className="fw-bold mb-2">{place?.name || 'Unnamed place'}</h6>

                    <div className="d-flex flex-wrap gap-2 text-muted small mb-2">
                      <span><FiGrid className="me-1" />{formatDistance(place?.distanceMeters)}</span>
                      <span><FiBookmark className="me-1" />Estimated cost: {formatEstimatedCost(place)}</span>
                      <span><FiStar className="me-1" />Rating: {typeof place?.rating === 'number' ? place.rating : 0}</span>
                    </div>

                    <p className="mb-0 text-muted small">{recommendationsReason}</p>

                    <div className="d-flex gap-2 mt-3">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleToggleSave(place._id)}
                        disabled={!!placeActionLoading[place._id]}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleMarkVisited(place._id)}
                        disabled={!!placeActionLoading[place._id]}
                      >
                        Mark visited
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted">
            <p className="mb-0">No recommendations found</p>
            <small>Try updating your interests in Settings.</small>
          </div>
        )}

        <div className="text-center my-4">
          <Link to="/recommendations" className="btn btn-discover px-4 py-2">Discover More Destinations</Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
