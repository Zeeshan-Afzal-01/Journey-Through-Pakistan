import api from './api';

// Admin Authentication
export const adminLogin = async (email, password) => {
  const response = await api.post('/users/login', { 
    email, 
    password 
  }, {
    headers: {
      'x-admin-panel': 'true' // Signal this is admin login
    },
    params: {
      admin: 'true' // Also as query param for backup
    }
  });
  // Store token in localStorage for Authorization header
  if (response.data.token) {
    localStorage.setItem('adminToken', response.data.token);
  }
  // Store user info
  if (response.data.user) {
    localStorage.setItem('adminUser', JSON.stringify(response.data.user));
  }
  return response;
};

export const getAdminProfile = () => {
  return api.get('/users/getMe');
};

// Users Management
export const getAllUsers = (params = {}) => {
  return api.get('/admin/users', { params }).catch(error => {
    console.error('getAllUsers API Error:', error);
    throw error;
  });
};

export const getUserById = (userId) => {
  return api.get(`/admin/users/${userId}`);
};

export const updateUser = (userId, data) => {
  return api.put(`/admin/users/${userId}`, data);
};

export const deleteUser = (userId) => {
  return api.delete(`/admin/users/${userId}`);
};

export const bulkDeleteUsers = (userIds) => {
  return api.post('/users/bulk-delete', { userIds });
};

export const bulkUpdateUsers = (userIds, updates) => {
  return api.put('/users/bulk-update', { userIds, updates });
};

export const searchUsers = (query) => {
  return api.get('/users/search', { params: { q: query } });
};

// Posts Management
export const getAllPosts = (params = {}) => {
  return api.get('/posts', { params });
};

export const getPostById = (postId) => {
  return api.get(`/posts/${postId}`);
};

export const deletePost = (postId) => {
  return api.delete(`/posts/${postId}`);
};

// Notifications
export const getNotifications = () => {
  return api.get('/notifications');
};

export const markNotificationAsRead = (notificationId) => {
  return api.put(`/notifications/${notificationId}/read`);
};

export const markAllNotificationsRead = () => {
  return api.post('/notifications/read-all');
};

// Analytics/Stats
export const getUserStats = () => {
  return api.get('/users/stats');
};

// Admin Management
export const getAllAdmins = () => {
  return api.get('/admin/admins');
};

export const updateUserAdminRole = (userId, adminRole, isAdmin) => {
  return api.put(`/admin/users/${userId}/admin-role`, { adminRole, isAdmin });
};

export const getAdminPermissions = () => {
  return api.get('/admin/permissions');
};

// Dashboard Statistics
export const getDashboardStats = () => {
  return api.get('/admin/dashboard/stats');
};

export const getUserSignupsOverTime = () => {
  return api.get('/admin/dashboard/signups');
};

export const getContentCategoriesBreakdown = () => {
  return api.get('/admin/dashboard/categories');
};

export const getRecentActivities = () => {
  return api.get('/admin/dashboard/activities');
};

// Send notification to all users
export const sendNotificationToAllUsers = (data) => {
  return api.post('/admin/notifications/send-all', data);
};

// Notification drafts
export const saveNotificationDraft = (data) => {
  return api.post('/admin/notifications/drafts', data);
};

export const getNotificationDrafts = () => {
  return api.get('/admin/notifications/drafts');
};

export const getNotificationDraft = (id) => {
  return api.get(`/admin/notifications/drafts/${id}`);
};

export const updateNotificationDraft = (id, data) => {
  return api.put(`/admin/notifications/drafts/${id}`, data);
};

export const deleteNotificationDraft = (id) => {
  return api.delete(`/admin/notifications/drafts/${id}`);
};

// Settings
export const getSettings = () => {
  return api.get('/admin/settings');
};

export const updateSettings = (data) => {
  return api.put('/admin/settings', data);
};

// Backup Management
export const createBackup = () => {
  return api.post('/admin/backup/create');
};

export const getBackups = () => {
  return api.get('/admin/backup');
};

export const downloadBackup = (id) => {
  return api.get(`/admin/backup/${id}/download`, {
    responseType: 'blob'
  });
};

export const deleteBackup = (id) => {
  return api.delete(`/admin/backup/${id}`);
};

export const restoreBackup = (id) => {
  return api.post(`/admin/backup/${id}/restore`);
};

export const uploadAndRestoreBackup = (file) => {
  const formData = new FormData();
  formData.append('backupFile', file);
  return api.post('/admin/backup/upload-restore', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// Security Logs
export const getSecurityLogs = (params = {}) => {
  return api.get('/admin/security-logs', { params });
};

export const getSecurityLog = (id) => {
  return api.get(`/admin/security-logs/${id}`);
};

export const getSecurityLogStats = (params = {}) => {
  return api.get('/admin/security-logs/stats', { params });
};

export const deleteSecurityLogs = (filters) => {
  return api.delete('/admin/security-logs', { data: filters });
};

export const exportSecurityLogs = (params = {}) => {
  return api.get('/admin/security-logs/export', { 
    params,
    responseType: 'blob'
  });
};

// Analytics API
export const getAnalytics = () => {
  return api.get('/admin/analytics');
};

export const getUserTrends = () => {
  return api.get('/admin/analytics/user-trends');
};

export const getTopPlaces = () => {
  return api.get('/admin/analytics/top-places');
};

export const getChatActivity = () => {
  return api.get('/admin/analytics/chat-activity');
};

export const getPakistanRegions = () => {
  return api.get('/admin/analytics/pakistan-regions');
};

export const getTourismMetrics = () => {
  return api.get('/admin/analytics/tourism-metrics');
};

