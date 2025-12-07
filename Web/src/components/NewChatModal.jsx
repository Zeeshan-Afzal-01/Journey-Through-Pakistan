import React, { useState, useEffect } from 'react';
import { FiX, FiUser, FiUsers, FiSearch } from 'react-icons/fi';
import { getFriends } from '../api/authApi';
import { getMyGroups } from '../api/groupsApi';
import '../assests/css/newChatModal.css';

export default function NewChatModal({ isOpen, onClose, onSelectFriend, onSelectGroup }) {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'groups'
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      fetchGroups();
    }
  }, [isOpen]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const response = await getFriends();
      setFriends(response.data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await getMyGroups();
      setGroups(response.data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const handleFriendClick = (friend) => {
    onSelectFriend(friend);
    onClose();
  };

  const handleGroupClick = (group) => {
    onSelectGroup(group);
    onClose();
  };

  const filteredFriends = friends.filter(friend =>
    friend.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(group =>
    group.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="new-chat-modal-overlay" onClick={onClose}>
      <div className="new-chat-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="new-chat-modal-header">
          <h5 className="mb-0">New Message</h5>
          <button className="btn-close-modal" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className="new-chat-modal-tabs">
          <button
            className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            <FiUser size={18} />
            Friends
          </button>
          <button
            className={`tab-button ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            <FiUsers size={18} />
            Groups
          </button>
        </div>

        <div className="new-chat-modal-search">
          <FiSearch className="search-icon" size={18} />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'friends' ? 'friends' : 'groups'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="new-chat-modal-list">
          {loading ? (
            <div className="text-center py-4 text-muted">Loading...</div>
          ) : activeTab === 'friends' ? (
            filteredFriends.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <FiUser size={48} className="mb-2 opacity-50" />
                <p>No friends found</p>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend._id}
                  className="new-chat-item"
                  onClick={() => handleFriendClick(friend)}
                >
                  <div className="avatar-container">
                    <img
                      src={
                        friend.hasProfilePicture && friend.profilePicture
                          ? `http://localhost:3000/${friend.profilePicture}`
                          : 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
                      }
                      alt={friend.name}
                      className="avatar"
                    />
                  </div>
                  <div className="item-info">
                    <div className="item-name">{friend.name}</div>
                    {friend.city && <div className="item-subtitle">{friend.city}</div>}
                  </div>
                </div>
              ))
            )
          ) : (
            filteredGroups.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <FiUsers size={48} className="mb-2 opacity-50" />
                <p>No groups found</p>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div
                  key={group._id}
                  className="new-chat-item"
                  onClick={() => handleGroupClick(group)}
                >
                  <div className="avatar-container">
                    <img
                      src={
                        group.groupPhoto
                          ? `http://localhost:3000/${group.groupPhoto}`
                          : group.coverImage
                          ? `http://localhost:3000/${group.coverImage}`
                          : 'https://via.placeholder.com/200'
                      }
                      alt={group.name}
                      className="avatar"
                    />
                  </div>
                  <div className="item-info">
                    <div className="item-name">{group.name}</div>
                    <div className="item-subtitle">
                      {group.members?.length || 0} members
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}

