import User from '../models/user.models.js';
import Post from '../models/post.models.js';
import Notification from '../models/notification.models.js';
import NotificationDraft from '../models/notificationDraft.models.js';
import Message from '../models/message.models.js';
import Conversation from '../models/conversation.models.js';
import mongoose from 'mongoose';

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    // Total Users (excluding admins)
    const totalUsers = await User.countDocuments({
      $or: [
        { isAdmin: false },
        { isAdmin: { $exists: false } },
        { adminRole: null }
      ]
    });

    // Total Users from last period (30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const totalUsersLastPeriod = await User.countDocuments({
      $or: [
        { isAdmin: false },
        { isAdmin: { $exists: false } },
        { adminRole: null }
      ],
      createdAt: { $lt: thirtyDaysAgo }
    });
    const userGrowth = totalUsersLastPeriod > 0 
      ? ((totalUsers - totalUsersLastPeriod) / totalUsersLastPeriod * 100).toFixed(1)
      : '0.0';

    // Active Sessions (users who logged in within last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const activeSessions = await User.countDocuments({
      $or: [
        { isAdmin: false },
        { isAdmin: { $exists: false } },
        { adminRole: null }
      ],
      updatedAt: { $gte: oneDayAgo }
    });
    const activeSessionsLastPeriod = await User.countDocuments({
      $or: [
        { isAdmin: false },
        { isAdmin: { $exists: false } },
        { adminRole: null }
      ],
      updatedAt: { 
        $gte: new Date(oneDayAgo.getTime() - 24 * 60 * 60 * 1000),
        $lt: oneDayAgo
      }
    });
    const activeSessionsChange = activeSessionsLastPeriod > 0
      ? ((activeSessions - activeSessionsLastPeriod) / activeSessionsLastPeriod * 100).toFixed(1)
      : '0.0';

    // Pending Posts (posts created in last 7 days that need moderation)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const pendingPosts = await Post.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    const pendingPostsLastPeriod = await Post.countDocuments({
      createdAt: { 
        $gte: new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000),
        $lt: sevenDaysAgo
      }
    });
    const pendingPostsChange = pendingPostsLastPeriod > 0
      ? ((pendingPosts - pendingPostsLastPeriod) / pendingPostsLastPeriod * 100).toFixed(1)
      : '0.0';

    // Flagged Content (notifications with type 'report' or 'flag')
    const flaggedContent = await Notification.countDocuments({
      type: { $in: ['report', 'flag', 'spam'] }
    });
    const flaggedContentLastPeriod = await Notification.countDocuments({
      type: { $in: ['report', 'flag', 'spam'] },
      createdAt: { $lt: thirtyDaysAgo }
    });
    const flaggedContentChange = flaggedContent > flaggedContentLastPeriod ? 'Critical' : '0.0';

    res.json({
      totalUsers: totalUsers,
      totalUsersChange: userGrowth,
      activeSessions: activeSessions,
      activeSessionsChange: activeSessionsChange,
      pendingPosts: pendingPosts,
      pendingPostsChange: pendingPostsChange,
      flaggedContent: flaggedContent,
      flaggedContentChange: flaggedContentChange
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ message: "Failed to fetch dashboard stats", error: err.message });
  }
};

// Get user signups over time (monthly data for last 6 months)
export const getUserSignupsOverTime = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const signups = await User.aggregate([
      {
        $match: {
          $or: [
            { isAdmin: false },
            { isAdmin: { $exists: false } },
            { adminRole: null }
          ],
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Map to month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    const now = new Date();
    
    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const signupData = signups.find(s => 
        s._id.year === date.getFullYear() && s._id.month === date.getMonth() + 1
      );
      result.push({
        month: monthNames[date.getMonth()],
        signups: signupData ? signupData.count : 0
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Error fetching user signups over time:', err);
    res.status(500).json({ message: "Failed to fetch user signups data", error: err.message });
  }
};

// Get content categories breakdown
export const getContentCategoriesBreakdown = async (req, res) => {
  try {
    // Extract categories from post places/feelings or hashtags
    // For now, we'll use a simple categorization based on post content
    const allPosts = await Post.find({}).select('text place feeling hashtags').lean();
    
    // Simple categorization logic
    const categories = {
      'Food & Drink': 0,
      'Attractions': 0,
      'Shopping': 0,
      'Nature': 0,
      'Arts': 0
    };

    const foodKeywords = ['food', 'restaurant', 'cafe', 'dining', 'meal', 'drink', 'coffee', 'tea', 'eat'];
    const attractionKeywords = ['attraction', 'monument', 'landmark', 'tower', 'museum', 'palace', 'fort'];
    const shoppingKeywords = ['shopping', 'market', 'mall', 'store', 'bazaar', 'shop'];
    const natureKeywords = ['nature', 'park', 'mountain', 'lake', 'beach', 'forest', 'garden', 'river'];
    const artsKeywords = ['art', 'gallery', 'theater', 'cinema', 'music', 'culture', 'festival'];

    allPosts.forEach(post => {
      const text = ((post.text || '') + ' ' + (post.place || '') + ' ' + (post.feeling || '')).toLowerCase();
      const hashtags = (post.hashtags || []).join(' ').toLowerCase();
      const combined = text + ' ' + hashtags;

      if (foodKeywords.some(keyword => combined.includes(keyword))) {
        categories['Food & Drink']++;
      } else if (attractionKeywords.some(keyword => combined.includes(keyword))) {
        categories['Attractions']++;
      } else if (shoppingKeywords.some(keyword => combined.includes(keyword))) {
        categories['Shopping']++;
      } else if (natureKeywords.some(keyword => combined.includes(keyword))) {
        categories['Nature']++;
      } else if (artsKeywords.some(keyword => combined.includes(keyword))) {
        categories['Arts']++;
      } else {
        // Default to Attractions if no match
        categories['Attractions']++;
      }
    });

    // Convert to array format
    const result = Object.entries(categories).map(([category, value]) => ({
      category,
      value
    }));

    res.json(result);
  } catch (err) {
    console.error('Error fetching content categories breakdown:', err);
    res.status(500).json({ message: "Failed to fetch content categories", error: err.message });
  }
};

// Get recent activities
export const getRecentActivities = async (req, res) => {
  try {
    const recentUsers = await User.find({
      $or: [
        { isAdmin: false },
        { isAdmin: { $exists: false } },
        { adminRole: null }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name createdAt')
    .lean();

    const recentPosts = await Post.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('author', 'name')
      .select('text place createdAt author')
      .lean();

    const activities = [];

    // Add user registrations
    recentUsers.forEach(user => {
      activities.push({
        type: 'user_registered',
        text: `New user '${user.name}' registered`,
        time: user.createdAt,
        icon: 'user'
      });
    });

    // Add posts
    recentPosts.forEach(post => {
      if (post.place) {
        activities.push({
          type: 'place_added',
          text: `'${post.place}' added to places`,
          time: post.createdAt,
          icon: 'mapPin'
        });
      } else {
        activities.push({
          type: 'post_created',
          text: `New post by '${post.author?.name || 'User'}'`,
          time: post.createdAt,
          icon: 'bookmark'
        });
      }
    });

    // Sort by time and limit to 6 most recent
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recentActivities = activities.slice(0, 6).map(activity => {
      const timeAgo = getTimeAgo(new Date(activity.time));
      return {
        ...activity,
        time: timeAgo
      };
    });

    res.json(recentActivities);
  } catch (err) {
    console.error('Error fetching recent activities:', err);
    res.status(500).json({ message: "Failed to fetch recent activities", error: err.message });
  }
};

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} sec ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

// Send notification to all users
export const sendNotificationToAllUsers = async (req, res) => {
  try {
    const { message, title, draftId } = req.body;
    const adminId = req.user?._id || req.user?.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Notification message is required" });
    }

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get all non-admin users
    const allUsers = await User.find({
      $or: [
        { isAdmin: false },
        { isAdmin: { $exists: false } },
        { adminRole: null }
      ]
    }).select('_id');

    if (allUsers.length === 0) {
      return res.status(404).json({ message: "No users found to send notification" });
    }

    // Create notifications for all users
    const notificationTitle = title?.trim() || 'Admin Announcement';
    const notifications = allUsers.map(user => ({
      recipient: user._id,
      actor: adminId,
      type: 'admin_announcement',
      message: message.trim(),
      title: notificationTitle
    }));

    // Insert all notifications
    const createdNotifications = await Notification.insertMany(notifications);

    // Get the admin user for socket broadcast
    const adminUser = await User.findById(adminId).select('name profilePicture').lean();

    // Prepare notification data for socket broadcast
    const notificationData = {
      type: 'admin_announcement',
      message: message.trim(),
      title: title || 'Admin Announcement',
      actor: {
        _id: adminId,
        name: adminUser?.name || 'Admin',
        profilePicture: adminUser?.profilePicture
      },
      createdAt: new Date()
    };

    // Get io from app
    const io = req.app.get('io');
    
    // Broadcast notification to all connected users via Socket.IO
    // Emit to all users' personal rooms
    if (io) {
      allUsers.forEach(user => {
        io.to(`user_${user._id}`).emit('new-notification', notificationData);
      });

      // Also emit a general broadcast for real-time updates
      io.emit('admin-announcement', notificationData);
    }
    
    // If draftId is provided, update draft status
    if (draftId) {
      await NotificationDraft.findByIdAndUpdate(draftId, {
        status: 'sent',
        sentAt: new Date(),
        sentToCount: allUsers.length
      });
    }

    res.json({
      success: true,
      message: `Notification sent to ${allUsers.length} users`,
      notificationsCount: createdNotifications.length
    });
  } catch (err) {
    console.error('Error sending notifications to all users:', err);
    res.status(500).json({ message: "Failed to send notifications", error: err.message });
  }
};

// Save notification draft
export const saveNotificationDraft = async (req, res) => {
  try {
    const { title, message, targetAudience, deliveryMethod, schedule } = req.body;
    const adminId = req.user?._id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Notification message is required" });
    }

    const draft = await NotificationDraft.create({
      createdBy: adminId,
      title: title?.trim() || '',
      message: message.trim(),
      targetAudience: targetAudience || 'all',
      deliveryMethod: deliveryMethod || { push: false, inApp: true },
      schedule: schedule ? new Date(schedule) : null,
      status: 'draft'
    });

    res.json({
      success: true,
      message: "Draft saved successfully",
      draft: draft
    });
  } catch (err) {
    console.error('Error saving notification draft:', err);
    res.status(500).json({ message: "Failed to save draft", error: err.message });
  }
};

// Get all notification drafts
export const getNotificationDrafts = async (req, res) => {
  try {
    const adminId = req.user?._id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const drafts = await NotificationDraft.find({ createdBy: adminId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')
      .lean();

    res.json(drafts);
  } catch (err) {
    console.error('Error fetching notification drafts:', err);
    res.status(500).json({ message: "Failed to fetch drafts", error: err.message });
  }
};

// Get single notification draft
export const getNotificationDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const draft = await NotificationDraft.findOne({ _id: id, createdBy: adminId })
      .populate('createdBy', 'name')
      .lean();

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    res.json(draft);
  } catch (err) {
    console.error('Error fetching notification draft:', err);
    res.status(500).json({ message: "Failed to fetch draft", error: err.message });
  }
};

// Update notification draft
export const updateNotificationDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, targetAudience, deliveryMethod, schedule } = req.body;
    const adminId = req.user?._id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title?.trim() || '';
    if (message !== undefined) updateData.message = message.trim();
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
    if (deliveryMethod !== undefined) updateData.deliveryMethod = deliveryMethod;
    if (schedule !== undefined) updateData.schedule = schedule ? new Date(schedule) : null;

    const draft = await NotificationDraft.findOneAndUpdate(
      { _id: id, createdBy: adminId, status: 'draft' },
      updateData,
      { new: true }
    );

    if (!draft) {
      return res.status(404).json({ message: "Draft not found or already sent" });
    }

    res.json({
      success: true,
      message: "Draft updated successfully",
      draft: draft
    });
  } catch (err) {
    console.error('Error updating notification draft:', err);
    res.status(500).json({ message: "Failed to update draft", error: err.message });
  }
};

// Delete notification draft
export const deleteNotificationDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const draft = await NotificationDraft.findOneAndDelete({ _id: id, createdBy: adminId });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    res.json({
      success: true,
      message: "Draft deleted successfully"
    });
  } catch (err) {
    console.error('Error deleting notification draft:', err);
    res.status(500).json({ message: "Failed to delete draft", error: err.message });
  }
};

// Get comprehensive analytics for Pakistan tourism app
export const getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total Users (excluding admins)
    const totalUsers = await User.countDocuments({
      $or: [
        { isAdmin: false },
        { isAdmin: { $exists: false } },
        { adminRole: null }
      ]
    });

    // Active Users (last 24 hours)
    const activeUsers = await User.countDocuments({
      $or: [
        { isAdmin: false },
        { isAdmin: { $exists: false } },
        { adminRole: null }
      ],
      updatedAt: { $gte: oneDayAgo }
    });

    // New Signups (last 30 days)
    const newSignups = await User.countDocuments({
      $or: [
        { isAdmin: false },
        { isAdmin: { $exists: false } },
        { adminRole: null }
      ],
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Total Posts
    const totalPosts = await Post.countDocuments({});
    
    // Posts in last 30 days
    const recentPosts = await Post.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Total Messages
    const totalMessages = await Message.countDocuments({});
    
    // Messages in last 30 days
    const recentMessages = await Message.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Total Conversations
    const totalConversations = await Conversation.countDocuments({});

    // Calculate engagement rate (users who posted or messaged in last 30 days / total users)
    const engagedUsers = await User.distinct('_id', {
      $or: [
        { isAdmin: false },
        { isAdmin: { $exists: false } },
        { adminRole: null }
      ]
    });
    
    const usersWithActivity = await Post.distinct('author', {
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    const engagementRate = totalUsers > 0 
      ? ((usersWithActivity.length / totalUsers) * 100).toFixed(1)
      : '0.0';

    // Calculate average session duration (simplified - based on last update)
    const avgSessionDuration = '05:32'; // This would need actual session tracking

    res.json({
      kpis: {
        totalSignups: totalUsers,
        activeUsers: activeUsers,
        avgSessionDuration: avgSessionDuration,
        contentEngagement: `${engagementRate}%`
      },
      totalPosts,
      totalMessages,
      totalConversations,
      recentPosts,
      recentMessages,
      newSignups
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ message: "Failed to fetch analytics", error: err.message });
  }
};

// Get user trends (new and active users over time)
export const getUserTrends = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // Get new users by month
    const newUsers = await User.aggregate([
      {
        $match: {
          $or: [
            { isAdmin: false },
            { isAdmin: { $exists: false } },
            { adminRole: null }
          ],
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get active users by month (users who updated their profile or posted)
    const activeUsers = await User.aggregate([
      {
        $match: {
          $or: [
            { isAdmin: false },
            { isAdmin: { $exists: false } },
            { adminRole: null }
          ],
          updatedAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$updatedAt' },
            month: { $month: '$updatedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const newUserData = newUsers.find(s => 
        s._id.year === date.getFullYear() && s._id.month === date.getMonth() + 1
      );
      const activeUserData = activeUsers.find(s => 
        s._id.year === date.getFullYear() && s._id.month === date.getMonth() + 1
      );
      
      result.push({
        month: monthNames[date.getMonth()],
        newUsers: newUserData ? newUserData.count : 0,
        activeUsers: activeUserData ? activeUserData.count : 0
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Error fetching user trends:', err);
    res.status(500).json({ message: "Failed to fetch user trends", error: err.message });
  }
};

// Get top searched places in Pakistan
export const getTopPlaces = async (req, res) => {
  try {
    const places = await Post.aggregate([
      {
        $match: {
          place: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$place',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const result = places.map(p => ({
      place: p._id,
      searches: p.count
    }));

    res.json(result);
  } catch (err) {
    console.error('Error fetching top places:', err);
    res.status(500).json({ message: "Failed to fetch top places", error: err.message });
  }
};

// Get chat activity and content downloads
export const getChatActivity = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // Get messages by month
    const messages = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get posts (as content) by month
    const posts = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const messageData = messages.find(s => 
        s._id.year === date.getFullYear() && s._id.month === date.getMonth() + 1
      );
      const postData = posts.find(s => 
        s._id.year === date.getFullYear() && s._id.month === date.getMonth() + 1
      );
      
      result.push({
        month: monthNames[date.getMonth()],
        chat: messageData ? messageData.count : 0,
        downloads: postData ? postData.count : 0 // Using posts as content downloads
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Error fetching chat activity:', err);
    res.status(500).json({ message: "Failed to fetch chat activity", error: err.message });
  }
};

// Get Pakistan provinces/cities distribution
export const getPakistanRegions = async (req, res) => {
  try {
    // Pakistan provinces
    const provinces = {
      'Punjab': ['Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Sialkot', 'Sargodha', 'Bahawalpur'],
      'Sindh': ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Nawabshah', 'Mirpur Khas'],
      'Khyber Pakhtunkhwa': ['Peshawar', 'Mardan', 'Abbottabad', 'Swat', 'Nowshera', 'Charsadda'],
      'Balochistan': ['Quetta', 'Turbat', 'Gwadar', 'Chaman', 'Khuzdar'],
      'Gilgit-Baltistan': ['Gilgit', 'Skardu', 'Hunza', 'Chitral'],
      'Azad Kashmir': ['Muzaffarabad', 'Mirpur', 'Kotli', 'Rawalakot']
    };

    const result = [];
    
    for (const [province, cities] of Object.entries(provinces)) {
      let count = 0;
      
      // Count users from cities in this province
      for (const city of cities) {
        const cityCount = await User.countDocuments({
          $or: [
            { isAdmin: false },
            { isAdmin: { $exists: false } },
            { adminRole: null }
          ],
          city: { $regex: new RegExp(city, 'i') }
        });
        count += cityCount;
      }
      
      // Also check for province name directly
      const provinceCount = await User.countDocuments({
        $or: [
          { isAdmin: false },
          { isAdmin: { $exists: false } },
          { adminRole: null }
        ],
        $or: [
          { city: { $regex: new RegExp(province, 'i') } },
          { country: { $regex: new RegExp(province, 'i') } }
        ]
      });
      count += provinceCount;
      
      result.push({
        region: province,
        usage: count
      });
    }

    // Calculate percentages
    const total = result.reduce((sum, r) => sum + r.usage, 0);
    if (total > 0) {
      result.forEach(r => {
        r.percentage = ((r.usage / total) * 100).toFixed(0);
      });
    } else {
      result.forEach(r => {
        r.percentage = '0';
      });
    }

    // Sort by usage descending
    result.sort((a, b) => b.usage - a.usage);
    
    // Highlight top region
    if (result.length > 0) {
      result[0].highlight = true;
    }

    res.json(result);
  } catch (err) {
    console.error('Error fetching Pakistan regions:', err);
    res.status(500).json({ message: "Failed to fetch regions", error: err.message });
  }
};

// Get tourism metrics (posts with places, popular destinations)
export const getTourismMetrics = async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Posts with places (tourism-related posts)
    const postsWithPlaces = await Post.countDocuments({
      place: { $exists: true, $ne: null, $ne: '' }
    });

    // New posts with places today
    const newPlacesToday = await Post.countDocuments({
      place: { $exists: true, $ne: null, $ne: '' },
      createdAt: { $gte: oneDayAgo }
    });

    // Posts with places in last 7 days
    const recentPlaces = await Post.countDocuments({
      place: { $exists: true, $ne: null, $ne: '' },
      createdAt: { $gte: sevenDaysAgo }
    });

    // Total unique places
    const uniquePlaces = await Post.distinct('place', {
      place: { $exists: true, $ne: null, $ne: '' }
    });

    res.json({
      totalPlaces: postsWithPlaces,
      newPlacesToday: newPlacesToday,
      recentPlaces: recentPlaces,
      uniquePlacesCount: uniquePlaces.length
    });
  } catch (err) {
    console.error('Error fetching tourism metrics:', err);
    res.status(500).json({ message: "Failed to fetch tourism metrics", error: err.message });
  }
};

