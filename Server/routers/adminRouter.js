import express from 'express';
import { verifyAdminToken, requirePermission, requireCEO, requireSupervisorOrAbove, PERMISSIONS } from '../middleware/adminAuth.js';
import { getAllUsers, getUserById, updateUserById, deleteUserById } from '../controller/userController.js';
import { 
  getDashboardStats, 
  getUserSignupsOverTime, 
  getContentCategoriesBreakdown, 
  getRecentActivities, 
  sendNotificationToAllUsers,
  saveNotificationDraft,
  getNotificationDrafts,
  getNotificationDraft,
  updateNotificationDraft,
  deleteNotificationDraft,
  getAnalytics,
  getUserTrends,
  getTopPlaces,
  getChatActivity,
  getPakistanRegions,
  getTourismMetrics
} from '../controller/adminController.js';
import { getSettings, updateSettings } from '../controller/settingsController.js';
import { 
  createBackup, 
  getBackups, 
  downloadBackup, 
  deleteBackup, 
  restoreBackup, 
  uploadAndRestoreBackup 
} from '../controller/backupController.js';
import {
  getSecurityLogs,
  getSecurityLog,
  deleteSecurityLogs,
  exportSecurityLogs,
  getSecurityLogStats
} from '../controller/securityLogController.js';
import {
  getReports,
  getReportStats,
  handleReport
} from '../controller/reportController.js';
import User from '../models/user.models.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer setup for backup file upload
const backupStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'backups', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `uploaded_backup_${timestamp}${path.extname(file.originalname)}`);
  }
});

const uploadBackup = multer({ 
  storage: backupStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON backup files are allowed'), false);
    }
  }
});

const router = express.Router();

// All admin routes require admin authentication
router.use(verifyAdminToken);

// Get all users (all admins can view)
router.get('/users', requirePermission(PERMISSIONS.VIEW_USERS), getAllUsers);

// Get user by ID
router.get('/users/:id', requirePermission(PERMISSIONS.VIEW_USERS), getUserById);

// Create user (Supervisor and above)
router.post('/users', requireSupervisorOrAbove, async (req, res) => {
  // This will be handled by the existing register endpoint
  // Just verify permission here
  res.json({ message: 'Use /users/register endpoint to create users' });
});

// Update user (all admins can edit)
router.put('/users/:id', requirePermission(PERMISSIONS.EDIT_USERS), updateUserById);

// Delete user (only CEO)
router.delete('/users/:id', requirePermission(PERMISSIONS.DELETE_USERS), deleteUserById);

// Update user admin role (only CEO)
router.put('/users/:id/admin-role', requireCEO, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminRole, isAdmin } = req.body;
    const adminId = req.user?._id || req.user?.id;

    // Validate admin role
    const validRoles = ['ceo', 'supervisor', 'manager', 'team_admin', null];
    if (adminRole && !validRoles.includes(adminRole)) {
      return res.status(400).json({ message: 'Invalid admin role' });
    }

    // Get user before update for logging
    const userBeforeUpdate = await User.findById(id).select("name email isAdmin adminRole");

    const updates = {};
    if (adminRole !== undefined) {
      updates.adminRole = adminRole;
      updates.isAdmin = adminRole !== null && adminRole !== undefined;
    }
    if (isAdmin !== undefined) {
      updates.isAdmin = isAdmin;
      if (!isAdmin) {
        updates.adminRole = null;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Log security event (CRITICAL - admin role change)
    try {
      const { createSecurityLog } = await import('../controller/securityLogController.js');
      const { getClientIP } = await import('../utils/getClientIP.js');
      const oldRole = userBeforeUpdate?.adminRole || 'none';
      const newRole = updatedUser.adminRole || 'none';
      
      await createSecurityLog({
        eventType: 'role_change',
        adminId: adminId,
        targetUserId: id,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        description: `Admin role changed for ${userBeforeUpdate?.name || userBeforeUpdate?.email}: ${oldRole} → ${newRole}`,
        severity: 'critical',
        status: 'success',
        details: {
          targetUser: userBeforeUpdate?.email,
          oldAdminRole: oldRole,
          newAdminRole: newRole,
          wasAdmin: userBeforeUpdate?.isAdmin,
          isNowAdmin: updatedUser.isAdmin
        }
      });
    } catch (logError) {
      console.error('Error logging admin role change:', logError);
    }

    res.json({ 
      message: "User admin role updated successfully!", 
      user: updatedUser 
    });
  } catch (err) {
    res.status(500).json({ message: "Error updating admin role", error: err.message });
  }
});

// Get all admins (all admins can view)
router.get('/admins', async (req, res) => {
  try {
    const admins = await User.find({ 
      isAdmin: true,
      adminRole: { $ne: null }
    }).select("-password").sort({ adminRole: 1, createdAt: -1 });

    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: "Error fetching admins", error: err.message });
  }
});

// Get admin permissions
router.get('/permissions', async (req, res) => {
  try {
    const { ROLE_PERMISSIONS } = await import('../middleware/adminAuth.js');
    const permissions = ROLE_PERMISSIONS[req.adminRole] || [];
    res.json({
      adminRole: req.adminRole,
      permissions: permissions
    });
  } catch (err) {
    console.error('Error fetching permissions:', err);
    res.status(500).json({ message: "Error fetching permissions", error: err.message });
  }
});

// Dashboard statistics
router.get('/dashboard/stats', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getDashboardStats);
router.get('/dashboard/signups', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getUserSignupsOverTime);
router.get('/dashboard/categories', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getContentCategoriesBreakdown);
router.get('/dashboard/activities', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getRecentActivities);

// Analytics routes
router.get('/analytics', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getAnalytics);
router.get('/analytics/user-trends', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getUserTrends);
router.get('/analytics/top-places', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getTopPlaces);
router.get('/analytics/chat-activity', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getChatActivity);
router.get('/analytics/pakistan-regions', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getPakistanRegions);
router.get('/analytics/tourism-metrics', requirePermission(PERMISSIONS.VIEW_ANALYTICS), getTourismMetrics);

// Send notification to all users (Supervisor and above)
router.post('/notifications/send-all', requireSupervisorOrAbove, sendNotificationToAllUsers);

// Notification drafts (Supervisor and above)
router.post('/notifications/drafts', requireSupervisorOrAbove, saveNotificationDraft);
router.get('/notifications/drafts', requireSupervisorOrAbove, getNotificationDrafts);
router.get('/notifications/drafts/:id', requireSupervisorOrAbove, getNotificationDraft);
router.put('/notifications/drafts/:id', requireSupervisorOrAbove, updateNotificationDraft);
router.delete('/notifications/drafts/:id', requireSupervisorOrAbove, deleteNotificationDraft);

// Settings (CEO only for security)
router.get('/settings', requireCEO, getSettings);
router.put('/settings', requireCEO, updateSettings);

// Backup routes (CEO only for security)
router.post('/backup/create', requireCEO, createBackup);
router.get('/backup', requireCEO, getBackups);
router.get('/backup/:id/download', requireCEO, downloadBackup);
router.delete('/backup/:id', requireCEO, deleteBackup);
router.post('/backup/:id/restore', requireCEO, restoreBackup);
router.post('/backup/upload-restore', requireCEO, uploadBackup.single('backupFile'), uploadAndRestoreBackup);

// Security Logs routes (Supervisor and above)
// IMPORTANT: Specific routes must come BEFORE parameterized routes
router.get('/security-logs', requireSupervisorOrAbove, getSecurityLogs);
router.get('/security-logs/stats', requireSupervisorOrAbove, getSecurityLogStats);
router.get('/security-logs/export', requireSupervisorOrAbove, exportSecurityLogs); // Must be before /:id
router.get('/security-logs/:id', requireSupervisorOrAbove, getSecurityLog);
router.delete('/security-logs', requireSupervisorOrAbove, deleteSecurityLogs);

// Moderation/Reports routes (Supervisor and above)
router.get('/moderation/reports', requireSupervisorOrAbove, getReports);
router.get('/moderation/reports/stats', requireSupervisorOrAbove, getReportStats);
router.post('/moderation/reports/:reportId/handle', requireSupervisorOrAbove, handleReport);

export default router;

