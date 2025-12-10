import { useState, useEffect } from 'react';
import { FiSend, FiBell, FiFlag, FiCalendar, FiClock, FiX, FiPlus, FiSave, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { SkeletonText, SkeletonActivityFeed } from '../components/SkeletonLoader';
import { 
  sendNotificationToAllUsers, 
  saveNotificationDraft, 
  getNotificationDrafts, 
  updateNotificationDraft, 
  deleteNotificationDraft 
} from '../api/adminApi';
import './Notifications.css';

const Notifications = () => {
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetAudience: 'all',
    deliveryMethod: {
      push: false,
      inApp: true
    },
    schedule: ''
  });

  useEffect(() => {
    fetchDrafts();
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const fetchDrafts = async () => {
    try {
      const response = await getNotificationDrafts();
      if (response.data) {
        setDrafts(response.data);
      }
    } catch (error) {
      console.error('Error fetching drafts:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      deliveryMethod: {
        ...prev.deliveryMethod,
        [name]: checked
      }
    }));
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      alert('Please enter a notification message');
      return;
    }

    try {
      setSaving(true);
      let response;
      
      if (editingDraftId) {
        response = await updateNotificationDraft(editingDraftId, formData);
      } else {
        response = await saveNotificationDraft(formData);
      }

      if (response.data.success) {
        alert(editingDraftId ? 'Draft updated successfully!' : 'Draft saved successfully!');
        await fetchDrafts();
        resetForm();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert(error.response?.data?.message || 'Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      alert('Please enter a notification message');
      return;
    }

    try {
      setSending(true);
      const response = await sendNotificationToAllUsers({
        title: formData.title,
        message: formData.message,
        draftId: editingDraftId || null
      });

      if (response.data.success) {
        alert(`Successfully sent notification to ${response.data.notificationsCount} users!`);
        await fetchDrafts();
        resetForm();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert(error.response?.data?.message || 'Failed to send notification. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleEditDraft = (draft) => {
    setEditingDraftId(draft._id);
    setFormData({
      title: draft.title || '',
      message: draft.message || '',
      targetAudience: draft.targetAudience || 'all',
      deliveryMethod: draft.deliveryMethod || { push: false, inApp: true },
      schedule: draft.schedule ? new Date(draft.schedule).toISOString().slice(0, 16) : ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteDraft = async (draftId) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) {
      return;
    }

    try {
      const response = await deleteNotificationDraft(draftId);
      if (response.data.success) {
        alert('Draft deleted successfully!');
        await fetchDrafts();
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      alert(error.response?.data?.message || 'Failed to delete draft. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      targetAudience: 'all',
      deliveryMethod: {
        push: false,
        inApp: true
      },
      schedule: ''
    });
    setEditingDraftId(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="notifications-container">
        <div className="notifications-layout">
          <div className="compose-section">
            <div className="section-header">
              <div className="skeleton-text" style={{ width: '250px', height: '28px', marginBottom: '8px' }}></div>
              <div className="skeleton-text" style={{ width: '400px', height: '16px' }}></div>
            </div>
            <div style={{ marginTop: '24px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ marginBottom: '20px' }}>
                  <div className="skeleton-text" style={{ width: '150px', height: '16px', marginBottom: '8px' }}></div>
                  <div className="skeleton-text" style={{ width: '100%', height: '40px' }}></div>
                </div>
              ))}
            </div>
          </div>
          <div className="recent-notifications-sidebar">
            <div className="section-header">
              <div className="skeleton-text" style={{ width: '200px', height: '28px', marginBottom: '8px' }}></div>
              <div className="skeleton-text" style={{ width: '300px', height: '16px' }}></div>
            </div>
            <SkeletonActivityFeed items={6} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      <div className="notifications-layout">
        {/* Compose Section */}
        <div className="compose-section">
          <div className="section-header">
            <h1 className="section-title">Compose New Notification</h1>
            <p className="section-subtitle">
              Craft your message and select delivery options for your audience.
            </p>
          </div>

          <form className="notification-form" onSubmit={(e) => e.preventDefault()}>
            {/* Notification Title */}
            <div className="form-group">
              <label className="form-label">Notification Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter a concise title for your notification (e.g., 'Important Update', 'New Feature Alert')"
                className="form-input"
              />
            </div>

            {/* Message Content */}
            <div className="form-group">
              <label className="form-label">Message Content</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Type your detailed message here... (e.g., details about a new policy, an upcoming event)"
                className="form-textarea"
                rows="6"
              />
            </div>

            {/* Target Audience */}
            <div className="form-group">
              <label className="form-label">Target Audience</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="targetAudience"
                    value="all"
                    checked={formData.targetAudience === 'all'}
                    onChange={handleInputChange}
                    className="radio-input"
                  />
                  <span className="radio-custom"></span>
                  <span className="radio-text">All Users</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="targetAudience"
                    value="tourists"
                    checked={formData.targetAudience === 'tourists'}
                    onChange={handleInputChange}
                    className="radio-input"
                  />
                  <span className="radio-custom"></span>
                  <span className="radio-text">Tourists</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="targetAudience"
                    value="locals"
                    checked={formData.targetAudience === 'locals'}
                    onChange={handleInputChange}
                    className="radio-input"
                  />
                  <span className="radio-custom"></span>
                  <span className="radio-text">Locals</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="targetAudience"
                    value="regions"
                    checked={formData.targetAudience === 'regions'}
                    onChange={handleInputChange}
                    className="radio-input"
                  />
                  <span className="radio-custom"></span>
                  <span className="radio-text">Specific Regions</span>
                </label>
              </div>
            </div>

            {/* Delivery Method */}
            <div className="form-group">
              <label className="form-label">Delivery Method</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="push"
                    checked={formData.deliveryMethod.push}
                    onChange={handleCheckboxChange}
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-text">Push Notification</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="inApp"
                    checked={formData.deliveryMethod.inApp}
                    onChange={handleCheckboxChange}
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-text">In-App Notification</span>
                </label>
              </div>
            </div>

            {/* Delivery Schedule */}
            <div className="form-group">
              <label className="form-label">Delivery Schedule</label>
              <div className="schedule-input-wrapper">
                <FiCalendar className="schedule-icon" />
                <input
                  type="datetime-local"
                  name="schedule"
                  value={formData.schedule}
                  onChange={handleInputChange}
                  className="form-input schedule-input"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <button 
                type="button" 
                onClick={handleSaveDraft}
                className="save-draft-btn"
                disabled={saving || sending || !formData.message.trim()}
              >
                <FiSave className="submit-btn-icon" />
                {saving ? 'Saving...' : editingDraftId ? 'Update Draft' : 'Save Draft'}
              </button>
              <button 
                type="button" 
                onClick={handleSendNotification}
                className="submit-btn"
                disabled={saving || sending || !formData.message.trim()}
              >
                <FiSend className="submit-btn-icon" />
                {sending ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </form>
        </div>

        {/* Saved Drafts Sidebar */}
        <div className="recent-notifications-sidebar">
          <div className="section-header">
            <h1 className="section-title">Saved Drafts</h1>
            <p className="section-subtitle">
              Your saved notification drafts. Click to edit or send.
            </p>
          </div>

          <div className="notifications-list">
            {drafts.length === 0 ? (
              <div className="no-drafts-message">
                <FiBell className="no-drafts-icon" />
                <p>No saved drafts yet. Create and save your first notification draft!</p>
              </div>
            ) : (
              drafts.map((draft) => {
                const Icon = draft.status === 'sent' ? FiSend : FiBell;
                const color = draft.status === 'sent' ? '#10b981' : '#7c3aed';
                return (
                  <div key={draft._id} className="notification-card draft-card">
                    <div className="notification-icon-wrapper" style={{ backgroundColor: `${color}15` }}>
                      <Icon className="notification-icon" style={{ color: color }} />
                    </div>
                    <div className="notification-content">
                      <div className="draft-header">
                        <h3 className="notification-card-title">
                          {draft.title || 'Untitled Notification'}
                          {draft.status === 'sent' && (
                            <span className="sent-badge">Sent</span>
                          )}
                        </h3>
                        {draft.status === 'draft' && (
                          <div className="draft-actions">
                            <button 
                              className="draft-action-btn"
                              onClick={() => handleEditDraft(draft)}
                              title="Edit"
                            >
                              <FiEdit2 />
                            </button>
                            <button 
                              className="draft-action-btn delete-btn"
                              onClick={() => handleDeleteDraft(draft._id)}
                              title="Delete"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="notification-card-description">
                        {draft.message.length > 100 
                          ? draft.message.substring(0, 100) + '...' 
                          : draft.message}
                      </p>
                      <div className="notification-card-date">
                        <FiClock className="date-icon" />
                        <span>{formatDate(draft.createdAt)}</span>
                        {draft.status === 'sent' && draft.sentToCount > 0 && (
                          <span className="sent-count">• Sent to {draft.sentToCount} users</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;

