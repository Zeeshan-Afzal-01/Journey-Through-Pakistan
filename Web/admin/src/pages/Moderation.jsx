import { useState } from 'react';
import { FiTrash2, FiCopy, FiCheck, FiX } from 'react-icons/fi';
import './Moderation.css';

const Moderation = () => {
  const [selectedComment, setSelectedComment] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedItems, setSelectedItems] = useState([]);

  // Sample data matching the image
  const flaggedComments = [
    {
      id: 'f101',
      comment: 'This place is a scam! Avoid at all costs, terrible service...',
      fullComment: 'This place is a total scam! Avoid at all costs, terrible service and the staff were incredibly rude. I also saw them throwing trash on the street which is disgusting. This establishment should be shut down immediately.',
      reporter: 'Alice Johnson',
      reason: 'Hate speech',
      dateFlagged: '2024-07-28',
      status: 'Pending',
      flagCount: 3,
      reporterComment: 'Offensive language and false accusations.'
    },
    {
      id: 'f102',
      comment: 'This restaurant has poor hygiene standards...',
      fullComment: 'This restaurant has poor hygiene standards and the food quality is subpar. I would not recommend visiting this place.',
      reporter: 'Bob Smith',
      reason: 'Inappropriate content',
      dateFlagged: '2024-07-27',
      status: 'Pending',
      flagCount: 1,
      reporterComment: 'Misleading information about food quality.'
    },
    {
      id: 'f103',
      comment: 'Great place to visit with family...',
      fullComment: 'Great place to visit with family and friends. The ambiance is wonderful and staff is friendly.',
      reporter: 'Charlie Brown',
      reason: 'Spam',
      dateFlagged: '2024-07-26',
      status: 'Resolved',
      flagCount: 2,
      reporterComment: 'Suspected promotional content.'
    }
  ];

  const handleOpenModal = (comment) => {
    setSelectedComment(comment);
  };

  const handleCloseModal = () => {
    setSelectedComment(null);
  };

  const handleDelete = () => {
    // Handle delete action
    console.log('Delete comment:', selectedComment?.id);
    handleCloseModal();
  };

  const handleCopy = () => {
    // Handle copy action
    console.log('Copy comment:', selectedComment?.id);
  };

  const handleApprove = () => {
    // Handle approve action
    console.log('Approve comment:', selectedComment?.id);
    handleCloseModal();
  };

  const pendingComments = flaggedComments.filter(c => c.status === 'Pending');
  const resolvedCount = flaggedComments.filter(c => c.status === 'Resolved').length;

  return (
    <div className="main-content">
      {/* Statistics Cards */}
      <div className="moderation-stats">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Model</span>
          </div>
          <div className="stat-card-value">Total 8</div>
          <div className="stat-card-subtitle">Overall Review</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Flagged</span>
          </div>
          <div className="stat-card-value">{pendingComments.length}</div>
          <div className="stat-card-subtitle">Monthly</div>
        </div>

        <div className="stat-card resolved-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Resolved Last 7 Days</span>
          </div>
          <div className="stat-card-value">{resolvedCount}</div>
          <div className="stat-card-subtitle">Content items resolved</div>
        </div>
      </div>

      {/* Filter and Batch Actions */}
      <div className="moderation-controls">
        <div className="filter-group">
          <label htmlFor="status-filter">Filter Status:</label>
          <select
            id="status-filter"
            className="status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
        <button className="batch-action-btn">
          Apply Batch Action ({selectedItems.length})
        </button>
      </div>

      {/* Table */}
      <div className="moderation-table-container">
        <table className="moderation-data-table">
          <thead>
            <tr>
              <th>Comment</th>
              <th>Reporter</th>
              <th>Reason</th>
              <th>Date Flagged</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {flaggedComments
              .filter(comment => selectedStatus === 'All' || comment.status === selectedStatus)
              .map((comment) => (
                <tr key={comment.id}>
                  <td className="comment-cell">{comment.comment}</td>
                  <td>{comment.reporter}</td>
                  <td>
                    <span className={`reason-badge reason-${comment.reason.toLowerCase().replace(/\s+/g, '-')}`}>
                      {comment.reason}
                    </span>
                  </td>
                  <td>{comment.dateFlagged}</td>
                  <td>
                    <span className={`status-badge status-${comment.status.toLowerCase()}`}>
                      {comment.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="action-btn-table"
                      onClick={() => handleOpenModal(comment)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Moderating Comment Modal */}
      {selectedComment && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="moderation-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <h2 className="modal-title">
                Moderating Comment (ID: {selectedComment.id})
              </h2>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>

            <div className="moderation-modal-content">
              {/* Modal Instructions */}
              <p className="modal-instruction">
                Review the flagged content and take appropriate action.
              </p>

              {/* Content Preview */}
              <div className="modal-section">
                <h3 className="modal-section-title">Content Preview</h3>
                <div className="content-preview">
                  {selectedComment.comment}
                </div>
              </div>

              {/* Flag Details */}
              <div className="modal-section">
                <h3 className="modal-section-title">Flag Details</h3>
                <div className="flag-details-grid">
                  <div className="flag-detail-item">
                    <span className="flag-detail-label">Reported By:</span>
                    <span className="flag-detail-value">{selectedComment.reporter}</span>
                  </div>
                  <div className="flag-detail-item">
                    <span className="flag-detail-label">Date Flagged:</span>
                    <span className="flag-detail-value">{selectedComment.dateFlagged}</span>
                  </div>
                  <div className="flag-detail-item">
                    <span className="flag-detail-label">Reason for Flag:</span>
                    <span className={`reason-badge reason-${selectedComment.reason.toLowerCase().replace(/\s+/g, '-')}`}>
                      {selectedComment.reason}
                    </span>
                  </div>
                  <div className="flag-detail-item">
                    <span className="flag-detail-label">Flag Count:</span>
                    <span className="flag-detail-value">{selectedComment.flagCount}</span>
                  </div>
                </div>
              </div>

              {/* Full Content for Review */}
              <div className="modal-section">
                <h3 className="modal-section-title">Full Content for Review</h3>
                <textarea
                  className="modal-textarea"
                  value={selectedComment.fullComment}
                  readOnly
                  rows="4"
                />
              </div>

              {/* Reporter's Comment */}
              <div className="modal-section">
                <h3 className="modal-section-title">Reporter's Comment</h3>
                <textarea
                  className="modal-textarea"
                  value={selectedComment.reporterComment}
                  readOnly
                  rows="3"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={handleCloseModal}>
                Cancel / Close
              </button>
              <button className="modal-btn modal-btn-delete" onClick={handleDelete}>
                <FiTrash2 />
              </button>
              <button className="modal-btn modal-btn-copy" onClick={handleCopy}>
                <FiCopy />
              </button>
              <button className="modal-btn modal-btn-approve" onClick={handleApprove}>
                <FiCheck />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Moderation;

