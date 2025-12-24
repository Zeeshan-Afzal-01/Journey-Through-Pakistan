import Report from '../models/report.models.js';
import Post from '../models/post.models.js';
import User from '../models/user.models.js';

// Helper function to find comment in post
const findCommentInPost = (post, commentId) => {
  const findInComments = (comments, targetId) => {
    for (const comment of comments) {
      if (comment._id.toString() === targetId) {
        return comment;
      }
      if (comment.replies && comment.replies.length > 0) {
        const found = findInComments(comment.replies, targetId);
        if (found) return found;
      }
    }
    return null;
  };
  return findInComments(post.comments, commentId);
};

// Report a post
export const reportPost = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { postId } = req.params;
    const { reason, description } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user already reported this post
    const existingReport = await Report.findOne({
      reporter: userId,
      contentType: 'post',
      contentId: postId
    });

    if (existingReport) {
      return res.status(400).json({ message: "You have already reported this post" });
    }

    const report = await Report.create({
      reporter: userId,
      contentType: 'post',
      contentId: postId,
      contentModel: 'Post',
      reason,
      description: description || ''
    });

    await report.populate('reporter', 'name email');

    res.status(201).json({
      message: "Post reported successfully",
      report
    });
  } catch (err) {
    console.error('Error reporting post:', err);
    res.status(500).json({ message: "Failed to report post", error: err.message });
  }
};

// Report a comment
export const reportComment = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { postId, commentId } = req.params;
    const { reason, description } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const post = await Post.findById(postId).populate('comments.author');
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = findCommentInPost(post, commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user already reported this comment
    const existingReport = await Report.findOne({
      reporter: userId,
      contentType: 'comment',
      contentId: commentId
    });

    if (existingReport) {
      return res.status(400).json({ message: "You have already reported this comment" });
    }

    const report = await Report.create({
      reporter: userId,
      contentType: 'comment',
      contentId: commentId,
      contentModel: 'Comment',
      reason,
      description: description || ''
    });

    await report.populate('reporter', 'name email');

    res.status(201).json({
      message: "Comment reported successfully",
      report
    });
  } catch (err) {
    console.error('Error reporting comment:', err);
    res.status(500).json({ message: "Failed to report comment", error: err.message });
  }
};

// Get all reports (Admin only)
export const getReports = async (req, res) => {
  try {
    const { status, contentType } = req.query;

    const filter = {};
    if (status && status !== 'All') {
      filter.status = status;
    }
    if (contentType && contentType !== 'All') {
      filter.contentType = contentType.toLowerCase();
    }

    const reports = await Report.find(filter)
      .populate('reporter', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Enrich reports with actual content data
    const enrichedReports = await Promise.all(reports.map(async (report) => {
      let contentData = null;
      let contentText = '';
      
      if (report.contentType === 'post') {
        const post = await Post.findById(report.contentId)
          .populate('author', 'name')
          .select('text imageUrl author createdAt')
          .lean();
        if (post) {
          contentData = post;
          contentText = post.text || '';
        }
      } else if (report.contentType === 'comment') {
        // Find comment in any post
        const posts = await Post.find({ 'comments._id': report.contentId })
          .populate('comments.author', 'name')
          .select('comments author')
          .lean();
        
        for (const post of posts) {
          const comment = findCommentInPost(post, report.contentId);
          if (comment) {
            contentData = {
              text: comment.text,
              author: comment.author,
              createdAt: comment.createdAt,
              postId: post._id
            };
            contentText = comment.text || '';
            break;
          }
        }
      }

      return {
        ...report,
        content: contentData,
        contentPreview: contentText.length > 100 
          ? contentText.substring(0, 100) + '...' 
          : contentText,
        fullContent: contentText
      };
    }));

    res.json(enrichedReports);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ message: "Failed to fetch reports", error: err.message });
  }
};

// Get report statistics
export const getReportStats = async (req, res) => {
  try {
    const totalReports = await Report.countDocuments({});
    const pendingReports = await Report.countDocuments({ status: 'Pending' });
    const resolvedReports = await Report.countDocuments({ status: 'Resolved' });
    
    // Last 7 days resolved
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const resolvedLast7Days = await Report.countDocuments({
      status: 'Resolved',
      resolvedAt: { $gte: sevenDaysAgo }
    });

    res.json({
      total: totalReports,
      pending: pendingReports,
      resolved: resolvedReports,
      resolvedLast7Days
    });
  } catch (err) {
    console.error('Error fetching report stats:', err);
    res.status(500).json({ message: "Failed to fetch report stats", error: err.message });
  }
};

// Handle a report (Admin only) - Approve, Dismiss, or Delete content
export const handleReport = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?._id;
    const { reportId } = req.params;
    const { action, resolutionNote } = req.body;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!['approve', 'dismiss', 'delete'].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Must be 'approve', 'dismiss', or 'delete'" });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (report.status !== 'Pending') {
      return res.status(400).json({ message: "Report has already been handled" });
    }

    let updateData = {
      resolvedBy: adminId,
      resolvedAt: new Date(),
      resolutionNote: resolutionNote || ''
    };

    if (action === 'delete') {
      // Delete the content
      if (report.contentType === 'post') {
        await Post.findByIdAndDelete(report.contentId);
      } else if (report.contentType === 'comment') {
        // Find and remove comment from post
        const posts = await Post.find({ 'comments._id': report.contentId });
        for (const post of posts) {
          const removeFromComments = (comments, targetId) => {
            for (let i = 0; i < comments.length; i++) {
              if (comments[i]._id.toString() === targetId) {
                comments.splice(i, 1);
                return true;
              }
              if (comments[i].replies && comments[i].replies.length > 0) {
                if (removeFromComments(comments[i].replies, targetId)) {
                  return true;
                }
              }
            }
            return false;
          };
          if (removeFromComments(post.comments, report.contentId)) {
            await post.save();
            break;
          }
        }
      }
      updateData.status = 'Resolved';
    } else if (action === 'approve') {
      // Approve means resolve (content is fine, but we mark it resolved)
      updateData.status = 'Resolved';
    } else if (action === 'dismiss') {
      updateData.status = 'Dismissed';
    }

    const updatedReport = await Report.findByIdAndUpdate(
      reportId,
      updateData,
      { new: true }
    ).populate('reporter', 'name email')
     .populate('resolvedBy', 'name email');

    res.json({
      message: `Report ${action}ed successfully`,
      report: updatedReport
    });
  } catch (err) {
    console.error('Error handling report:', err);
    res.status(500).json({ message: "Failed to handle report", error: err.message });
  }
};

