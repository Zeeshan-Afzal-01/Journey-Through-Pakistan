import { useState } from 'react';
import { FiSend, FiBell, FiFlag, FiCalendar, FiClock, FiX, FiPlus } from 'react-icons/fi';
import './Notifications.css';

const Notifications = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetAudience: 'all',
    deliveryMethod: {
      push: false,
      inApp: false
    },
    schedule: ''
  });

  const recentNotifications = [
    {
      icon: FiSend,
      title: 'Platform Maintenance Alert',
      description: 'Scheduled downtime on May 20th',
      date: '2024-05-18 10:30 AM',
      color: '#7c3aed'
    },
    {
      icon: FiSend,
      title: 'New Feature Rollout: Advanced Analytics',
      description: 'Introducing new detailed analytics report',
      date: '2024-05-15 09:00 AM',
      color: '#7c3aed'
    },
    {
      icon: FiBell,
      title: 'Community Guidelines Update',
      description: 'Revised guidelines for content submission',
      date: '2024-05-25 08:00 AM',
      color: '#3b82f6'
    },
    {
      icon: FiSend,
      title: 'User Engagement Survey Reminder',
      description: 'Last chance to participate in our annual survey',
      date: '2024-05-10 03:45 PM',
      color: '#7c3aed'
    },
    {
      icon: FiFlag,
      title: 'Security Advisory: Password Policy',
      description: 'Enhanced password security requirements',
      date: '2024-05-08 11:00 AM',
      color: '#ef4444'
    },
    {
      icon: FiSend,
      title: 'Welcome to Admin Hub V2.0!',
      description: 'Explore the new, redesigned Admin Hub',
      date: '2024-05-01 07:00 AM',
      color: '#7c3aed'
    }
  ];

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

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Notification submitted:', formData);
    // Here you would typically send the data to your backend
    // Reset form and close modal
    setFormData({
      title: '',
      message: '',
      targetAudience: 'all',
      deliveryMethod: {
        push: false,
        inApp: false
      },
      schedule: ''
    });
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Reset form when closing
    setFormData({
      title: '',
      message: '',
      targetAudience: 'all',
      deliveryMethod: {
        push: false,
        inApp: false
      },
      schedule: ''
    });
  };

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

          <form onSubmit={handleSubmit} className="notification-form">
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

            {/* Submit Button */}
            <button type="submit" className="submit-btn">
              <FiSend className="submit-btn-icon" />
              Send Notification
            </button>
          </form>
        </div>

        {/* Recent Notifications Sidebar */}
        <div className="recent-notifications-sidebar">
          <div className="section-header">
            <h1 className="section-title">Recent Notifications</h1>
            <p className="section-subtitle">
              Overview of your latest broadcasts and their status.
            </p>
          </div>

          <div className="notifications-list">
            {recentNotifications.map((notification, index) => {
              const Icon = notification.icon;
              return (
                <div key={index} className="notification-card">
                  <div className="notification-icon-wrapper" style={{ backgroundColor: `${notification.color}15` }}>
                    <Icon className="notification-icon" style={{ color: notification.color }} />
                  </div>
                  <div className="notification-content">
                    <h3 className="notification-card-title">{notification.title}</h3>
                    <p className="notification-card-description">{notification.description}</p>
                    <div className="notification-card-date">
                      <FiClock className="date-icon" />
                      <span>{notification.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;

