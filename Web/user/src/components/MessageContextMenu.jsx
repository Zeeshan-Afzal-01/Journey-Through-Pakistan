import React, { useEffect, useRef } from 'react';
import { FiEdit3, FiTrash2, FiX } from 'react-icons/fi';
import '../assests/css/message-context-menu.css';

export default function MessageContextMenu({ 
  isOpen, 
  position, 
  message, 
  currentUserId,
  onClose,
  onEdit,
  onDelete,
  onDeleteForMe,
  onUnsend 
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  const isOwnMessage = message.sender?._id?.toString() === currentUserId?.toString() || 
                       message.sender?._id === currentUserId ||
                       message.type === 'sent';

  // Check if message is within 1 hour for unsend option
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const messageDate = new Date(message.createdAt);
  const canUnsend = isOwnMessage && messageDate >= oneHourAgo && !message.unsent;

  const menuStyle = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 1000
  };

  const isReceivedMessage = !isOwnMessage;
  const canDeleteForMe = !message.deleted && 
    ((isOwnMessage && !message.deletedForSender) || 
     (isReceivedMessage && !message.deletedForRecipient));

  return (
    <div ref={menuRef} className="message-context-menu" style={menuStyle}>
      {isOwnMessage && (
        <>
          {canUnsend && (
            <button className="context-menu-item" onClick={onUnsend}>
              <FiX size={16} />
              <span>Unsend</span>
            </button>
          )}
          {!message.deleted && !message.deletedForSender && (
            <>
              <button className="context-menu-item" onClick={onEdit}>
                <FiEdit3 size={16} />
                <span>Edit</span>
              </button>
              <button className="context-menu-item" onClick={onDeleteForMe}>
                <FiTrash2 size={16} />
                <span>Delete for me</span>
              </button>
              <button className="context-menu-item" onClick={onDelete}>
                <FiTrash2 size={16} />
                <span>Delete for everyone</span>
              </button>
            </>
          )}
        </>
      )}
      {isReceivedMessage && canDeleteForMe && (
        <button className="context-menu-item" onClick={onDeleteForMe}>
          <FiTrash2 size={16} />
          <span>Delete for me</span>
        </button>
      )}
    </div>
  );
}

