import SupportTicket from '../models/supportTicket.models.js';
import Notification from '../models/notification.models.js';
import User from '../models/user.models.js';

/**
 * Escalate issue to admin team
 */
export const escalateToAdmin = async (req, res) => {
  try {
    const { userId, userName, userEmail, issue, currentPage } = req.body;
    const requestingUserId = req.user?.id || req.user?._id || userId;

    if (!issue || !issue.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Issue description is required'
      });
    }

    // Determine priority based on keywords
    const urgentKeywords = ['urgent', 'critical', 'broken', 'not working', 'error', 'bug'];
    const highKeywords = ['problem', 'issue', 'help', 'support'];
    const lowerIssue = issue.toLowerCase();
    
    let priority = 'medium';
    if (urgentKeywords.some(keyword => lowerIssue.includes(keyword))) {
      priority = 'urgent';
    } else if (highKeywords.some(keyword => lowerIssue.includes(keyword))) {
      priority = 'high';
    }

    // Create support ticket
    const ticket = new SupportTicket({
      userId: requestingUserId,
      userName: userName || req.user?.name || 'Unknown User',
      userEmail: userEmail || req.user?.email || 'No email',
      issue: issue.trim(),
      currentPage: currentPage || 'Unknown',
      priority
    });

    await ticket.save();

    // Get all admin users
    const admins = await User.find({
      $or: [
        { isAdmin: true },
        { adminRole: { $exists: true, $ne: null } }
      ]
    }).select('_id name');

    if (admins.length > 0) {
      // Create notifications for all admins
      const notifications = admins.map(admin => ({
        recipient: admin._id,
        actor: requestingUserId,
        type: 'support_ticket',
        title: `New Support Ticket - ${priority.toUpperCase()} Priority`,
        message: `User ${userName || 'Unknown'} reported: ${issue.substring(0, 100)}${issue.length > 100 ? '...' : ''}`,
        metadata: {
          ticketId: ticket._id,
          priority,
          currentPage
        }
      }));

      await Notification.insertMany(notifications);

      // Get io from app for real-time notifications
      const io = req.app.get('io');
      if (io) {
        admins.forEach(admin => {
          io.to(`user_${admin._id}`).emit('new-notification', {
            type: 'support_ticket',
            title: `New Support Ticket - ${priority.toUpperCase()} Priority`,
            message: `User ${userName || 'Unknown'} reported an issue`,
            ticketId: ticket._id,
            priority
          });
        });
      }
    }

    res.json({
      success: true,
      message: 'Issue escalated to admin team successfully',
      ticketId: ticket._id,
      priority
    });
  } catch (error) {
    console.error('Error escalating to admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to escalate issue. Please try again.',
      error: error.message
    });
  }
};

/**
 * Get user's support tickets
 */
export const getMyTickets = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const tickets = await SupportTicket.find({ userId })
      .sort({ createdAt: -1 })
      .populate('resolvedBy', 'name email')
      .lean();

    res.json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
      error: error.message
    });
  }
};

