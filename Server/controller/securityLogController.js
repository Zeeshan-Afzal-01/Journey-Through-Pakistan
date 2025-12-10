import SecurityLog from '../models/securityLog.models.js';
import User from '../models/user.models.js';

// Helper function to create a security log entry
export const createSecurityLog = async (logData) => {
  try {
    const log = await SecurityLog.create(logData);
    return log;
  } catch (error) {
    console.error('Error creating security log:', error);
    // Don't throw error - logging should not break the main flow
    return null;
  }
};

// Get all security logs with filtering and pagination
export const getSecurityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      eventType,
      severity,
      status,
      userId,
      adminId,
      ipAddress,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (eventType) {
      filter.eventType = eventType;
    }

    if (severity) {
      filter.severity = severity;
    }

    if (status) {
      filter.status = status;
    }

    if (userId) {
      filter.userId = userId;
    }

    if (adminId) {
      filter.adminId = adminId;
    }

    if (ipAddress) {
      filter.ipAddress = { $regex: ipAddress, $options: 'i' };
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Search filter (searches in description and details)
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const total = await SecurityLog.countDocuments(filter);

    // Fetch logs with pagination
    const logs = await SecurityLog.find(filter)
      .populate('userId', 'name email profilePicture')
      .populate('adminId', 'name email adminRole')
      .populate('targetUserId', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get statistics
    const stats = {
      total,
      byEventType: await SecurityLog.aggregate([
        { $match: filter },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      bySeverity: await SecurityLog.aggregate([
        { $match: filter },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      byStatus: await SecurityLog.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      recentCritical: await SecurityLog.countDocuments({
        ...filter,
        severity: 'critical',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      })
    };

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching security logs:', error);
    res.status(500).json({ message: 'Failed to fetch security logs', error: error.message });
  }
};

// Get a single security log by ID
export const getSecurityLog = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await SecurityLog.findById(id)
      .populate('userId', 'name email profilePicture')
      .populate('adminId', 'name email adminRole')
      .populate('targetUserId', 'name email')
      .lean();

    if (!log) {
      return res.status(404).json({ message: 'Security log not found' });
    }

    res.json({
      success: true,
      log
    });
  } catch (error) {
    console.error('Error fetching security log:', error);
    res.status(500).json({ message: 'Failed to fetch security log', error: error.message });
  }
};

// Delete security logs (with filters)
export const deleteSecurityLogs = async (req, res) => {
  try {
    const adminId = req.user?._id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      eventType,
      severity,
      status,
      startDate,
      endDate,
      olderThan // Delete logs older than X days
    } = req.body;

    // Build filter object
    const filter = {};

    if (eventType) {
      filter.eventType = eventType;
    }

    if (severity) {
      filter.severity = severity;
    }

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    if (olderThan) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan));
      filter.createdAt = { $lt: cutoffDate };
    }

    // If no filter, prevent deleting all logs (safety measure)
    if (Object.keys(filter).length === 0) {
      return res.status(400).json({ 
        message: 'Please provide filters to delete logs. Cannot delete all logs at once.' 
      });
    }

    const result = await SecurityLog.deleteMany(filter);

    // Log the deletion action
      const { getClientIP } = await import('../utils/getClientIP.js');
      await createSecurityLog({
        eventType: 'admin_action',
        adminId: adminId,
        description: `Deleted ${result.deletedCount} security log(s)`,
        details: { filter, deletedCount: result.deletedCount },
        severity: 'medium',
        status: 'success',
        ipAddress: getClientIP(req)
      });

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} security log(s)`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting security logs:', error);
    res.status(500).json({ message: 'Failed to delete security logs', error: error.message });
  }
};

// Export security logs to CSV/JSON
export const exportSecurityLogs = async (req, res) => {
  try {
    // Check authentication first
    const adminId = req.user?._id || req.user?.id;
    if (!adminId) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }

    const {
      eventType,
      severity,
      status,
      startDate,
      endDate,
      format = 'json' // 'json' or 'csv'
    } = req.query;

    // Build filter (same as getSecurityLogs)
    const filter = {};

    if (eventType) filter.eventType = eventType;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Fetch logs with safe populate (handle null references)
    let logs;
    try {
      logs = await SecurityLog.find(filter)
        .populate({
          path: 'userId',
          select: 'name email',
          strictPopulate: false
        })
        .populate({
          path: 'adminId',
          select: 'name email adminRole',
          strictPopulate: false
        })
        .populate({
          path: 'targetUserId',
          select: 'name email',
          strictPopulate: false
        })
        .sort({ createdAt: -1 })
        .lean();
    } catch (populateError) {
      console.error('Error populating logs:', populateError);
      // Try without populate if populate fails
      logs = await SecurityLog.find(filter)
        .sort({ createdAt: -1 })
        .lean();
    }

    // Ensure logs is an array
    if (!Array.isArray(logs)) {
      console.error('Logs is not an array:', typeof logs, logs);
      logs = [];
    }

    // Clean logs data for export (remove circular references, handle nulls)
    const cleanedLogs = logs.map(log => {
      try {
        const cleaned = {
          _id: log._id ? String(log._id) : null,
          eventType: log.eventType || 'other',
          severity: log.severity || 'medium',
          status: log.status || 'info',
          description: log.description || '',
          ipAddress: log.ipAddress || null,
          userAgent: log.userAgent || null,
          createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: log.updatedAt ? new Date(log.updatedAt).toISOString() : new Date().toISOString(),
          details: log.details || {}
        };

        // Safely add user info
        if (log.userId && (typeof log.userId === 'object' || typeof log.userId === 'string')) {
          try {
            cleaned.user = {
              _id: log.userId._id ? String(log.userId._id) : (typeof log.userId === 'string' ? log.userId : String(log.userId)),
              name: log.userId.name || 'N/A',
              email: log.userId.email || 'N/A'
            };
          } catch (e) {
            cleaned.user = { _id: 'N/A', name: 'N/A', email: 'N/A' };
          }
        }

        // Safely add admin info
        if (log.adminId && (typeof log.adminId === 'object' || typeof log.adminId === 'string')) {
          try {
            cleaned.admin = {
              _id: log.adminId._id ? String(log.adminId._id) : (typeof log.adminId === 'string' ? log.adminId : String(log.adminId)),
              name: log.adminId.name || 'N/A',
              email: log.adminId.email || 'N/A',
              adminRole: log.adminId.adminRole || null
            };
          } catch (e) {
            cleaned.admin = { _id: 'N/A', name: 'N/A', email: 'N/A', adminRole: null };
          }
        }

        // Safely add target user info
        if (log.targetUserId && (typeof log.targetUserId === 'object' || typeof log.targetUserId === 'string')) {
          try {
            cleaned.targetUser = {
              _id: log.targetUserId._id ? String(log.targetUserId._id) : (typeof log.targetUserId === 'string' ? log.targetUserId : String(log.targetUserId)),
              name: log.targetUserId.name || 'N/A',
              email: log.targetUserId.email || 'N/A'
            };
          } catch (e) {
            cleaned.targetUser = { _id: 'N/A', name: 'N/A', email: 'N/A' };
          }
        }

        // Add location if exists
        if (log.location && typeof log.location === 'object') {
          cleaned.location = {
            country: log.location.country || null,
            city: log.location.city || null,
            region: log.location.region || null
          };
        }

        return cleaned;
      } catch (cleanError) {
        console.error('Error cleaning log entry:', cleanError, log);
        // Return minimal safe log entry
        return {
          _id: log._id ? String(log._id) : 'unknown',
          eventType: log.eventType || 'other',
          severity: log.severity || 'medium',
          status: log.status || 'info',
          description: log.description || 'Error processing log entry',
          ipAddress: null,
          userAgent: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          details: {}
        };
      }
    });

    // Ensure cleanedLogs is an array
    if (!Array.isArray(cleanedLogs)) {
      console.error('Cleaned logs is not an array:', typeof cleanedLogs, cleanedLogs);
      return res.status(500).json({
        success: false,
        message: 'Error processing logs data',
        error: 'Invalid data format'
      });
    }

    // Log the export action AFTER successful export (don't let logging errors break the export)
    // We'll log this after sending the response to avoid any delays

    if (format === 'csv') {
      // Convert to CSV with proper escaping
      const escapeCSV = (value) => {
        if (value === null || value === undefined) return 'N/A';
        const str = String(value);
        // If contains comma, newline, or quote, wrap in quotes and escape quotes
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const headers = ['Date', 'Event Type', 'Severity', 'Status', 'User', 'Admin', 'Target User', 'IP Address', 'User Agent', 'Description'];
      const rows = cleanedLogs.map(log => [
        new Date(log.createdAt).toISOString(),
        log.eventType || 'N/A',
        log.severity || 'N/A',
        log.status || 'N/A',
        log.user ? `${log.user.name || 'N/A'} (${log.user.email || 'N/A'})` : 'N/A',
        log.admin ? `${log.admin.name || 'N/A'} (${log.admin.email || 'N/A'}) [${log.admin.adminRole || 'N/A'}]` : 'N/A',
        log.targetUser ? `${log.targetUser.name || 'N/A'} (${log.targetUser.email || 'N/A'})` : 'N/A',
        log.ipAddress || 'N/A',
        log.userAgent || 'N/A',
        (log.description || 'N/A').replace(/\n/g, ' ').replace(/\r/g, ' ')
      ]);

      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
      ].join('\n');

      // Add BOM for Excel compatibility
      const csvWithBOM = '\uFEFF' + csvContent;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=security-logs-${Date.now()}.csv`);
      res.send(csvWithBOM);
      
      // Log export action after sending response (async, don't wait)
      if (adminId) {
        setImmediate(async () => {
          try {
            const { getClientIP } = await import('../utils/getClientIP.js');
            await createSecurityLog({
              eventType: 'data_export',
              adminId: adminId,
              description: `Exported ${cleanedLogs.length} security log(s) as CSV`,
              details: { format: 'csv', filter, count: cleanedLogs.length },
              severity: 'low',
              status: 'success',
              ipAddress: getClientIP(req)
            });
          } catch (logError) {
            console.error('Error logging export action:', logError);
          }
        });
      }
    } else {
      // Return JSON as string (for blob response)
      const jsonData = {
        success: true,
        exportedAt: new Date().toISOString(),
        count: cleanedLogs.length,
        filters: filter,
        logs: cleanedLogs
      };
      
      // Use JSON.stringify with replacer to handle any circular references
      let jsonString;
      try {
        jsonString = JSON.stringify(jsonData, (key, value) => {
          // Handle circular references and undefined values
          if (value === undefined) return null;
          if (typeof value === 'object' && value !== null) {
            // Handle ObjectId
            if (value._id && typeof value._id === 'object' && value._id.toString) {
              return value._id.toString();
            }
            // Handle Date objects
            if (value instanceof Date) {
              return value.toISOString();
            }
          }
          return value;
        }, 2);
      } catch (stringifyError) {
        console.error('Error stringifying JSON:', stringifyError);
        // Fallback: try without replacer
        jsonString = JSON.stringify(jsonData, null, 2);
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=security-logs-${Date.now()}.json`);
      res.send(jsonString);
      
      // Log export action after sending response (async, don't wait)
      if (adminId) {
        setImmediate(async () => {
          try {
            const { getClientIP } = await import('../utils/getClientIP.js');
            await createSecurityLog({
              eventType: 'data_export',
              adminId: adminId,
              description: `Exported ${cleanedLogs.length} security log(s) as JSON`,
              details: { format: 'json', filter, count: cleanedLogs.length },
              severity: 'low',
              status: 'success',
              ipAddress: getClientIP(req)
            });
          } catch (logError) {
            console.error('Error logging export action:', logError);
          }
        });
      }
    }
  } catch (error) {
    console.error('========== EXPORT ERROR ==========');
    console.error('Error exporting security logs:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request query:', req.query);
    console.error('Request user:', req.user ? { id: req.user._id || req.user.id, role: req.user.adminRole } : 'No user');
    console.error('===================================');
    
    // If headers already sent, we can't send error response
    if (res.headersSent) {
      console.error('Headers already sent, cannot send error response');
      return;
    }
    
    // Send error response as JSON (not blob) so frontend can parse it
    res.status(500).json({ 
      success: false,
      message: 'Failed to export security logs', 
      error: error.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        name: error.name,
        query: req.query
      } : undefined
    });
  }
};

// Get security log statistics
export const getSecurityLogStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const stats = {
      total: await SecurityLog.countDocuments(filter),
      byEventType: await SecurityLog.aggregate([
        { $match: filter },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      bySeverity: await SecurityLog.aggregate([
        { $match: filter },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      byStatus: await SecurityLog.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      recentActivity: await SecurityLog.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ]),
      topIPs: await SecurityLog.aggregate([
        { 
          $match: { 
            ...filter,
            ipAddress: { $exists: true, $ne: null, $ne: '' }
          }
        },
        { $group: { _id: '$ipAddress', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      criticalLast24h: await SecurityLog.countDocuments({
        ...filter,
        severity: 'critical',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      failedLoginsLast24h: await SecurityLog.countDocuments({
        ...filter,
        eventType: 'login_failed',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching security log statistics:', error);
    res.status(500).json({ message: 'Failed to fetch statistics', error: error.message });
  }
};

