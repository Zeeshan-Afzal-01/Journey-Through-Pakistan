import api from "./api.jsx";

// REGISTER user
export const signup = async (data) => {
  const formData = new FormData();

  if (data.name) formData.append("name", data.name);
  if (data.email) formData.append("email", data.email);
  if (data.password) formData.append("password", data.password);
  if (data.role) formData.append("role", data.role);
  if (data.phone) formData.append("phone", data.phone);
  if (data.city) formData.append("city", data.city);
  if (data.country) formData.append("country", data.country);
  if (data.profilePicture)
    formData.append("profilePicture", data.profilePicture);

  return api.post("/users/register", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// LOGIN
export const login = (payload) => api.post("/users/login", payload);

// GET logged-in user (note: backend route is /users/getMe)
export const getMe = () => api.get("/users/getMe");

// VERIFY OTP
export const verifyOtp = (payload) => api.post("/users/verify-otp", payload);

// RESEND OTP
export const resendOtp = (payload) => api.post("/users/resend-otp", payload);

// LOGOUT (optional)
export const logout = () => api.post("/users/logout");

// UPDATE ME (profile picture, cover photo and other fields)
export const updateMe = (data) => {
  const fd = new FormData();
  if (data.profilePicture) fd.append("profilePicture", data.profilePicture);
  if (data.coverPhoto) fd.append("coverPhoto", data.coverPhoto);
  if (data.name) fd.append("name", data.name);
  if (data.email) fd.append("email", data.email);
  if (data.username) fd.append("username", data.username);
  if (data.password) fd.append("password", data.password);
  if (data.city) fd.append("city", data.city);
  if (data.bio) fd.append("bio", data.bio);
  if (data.isProfilePrivate !== undefined) fd.append("isProfilePrivate", data.isProfilePrivate);
  if (data.interests !== undefined) fd.append("interests", JSON.stringify(data.interests));
  return api.put("/users/me", fd, { headers: { "Content-Type": "multipart/form-data" } });
};

export const searchUsers = (q) => api.get('/users/search', { params: { q } });
export const getTopCreators = () => api.get('/users/top-creators');
export const sendFriendRequest = (targetUserId) => api.post('/users/friend/send', { targetUserId });
export const acceptFriendRequest = (requestUserId) => api.post('/users/friend/accept', { requestUserId });
export const declineFriendRequest = (requestUserId) => api.post('/users/friend/decline', { requestUserId });
export const cancelFriendRequest = (targetUserId) => api.post('/users/friend/cancel', { targetUserId });
export const unfriend = (targetUserId) => api.post('/users/friend/unfriend', { targetUserId });
export const getFriends = () => api.get('/users/friends');
export const getCommunityAttractionsByMonth = (period = '12months') => api.get('/users/attractions-by-month', { params: { period } });
export const getRecentActivities = () => api.get('/users/recent-activities');
export const getUserStats = () => api.get('/users/stats');
export const getLocalConnections = () => api.get('/users/local-connections');