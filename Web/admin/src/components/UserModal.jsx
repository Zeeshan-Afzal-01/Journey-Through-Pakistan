import { useState, useEffect } from 'react';
import { FiX, FiUser, FiMail, FiPhone, FiMapPin, FiGlobe, FiLock, FiUnlock, FiShield } from 'react-icons/fi';
import './UserModal.css';

const UserModal = ({ isOpen, onClose, user, onSave, mode = 'add', canManageAdmins = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    country: '',
    role: 'tourist',
    isActive: true,
    isProfilePrivate: false,
    isAdmin: false,
    adminRole: null,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && user) {
        setFormData({
          name: user.name || '',
          email: user.email || '',
          password: '',
          phone: user.phone || '',
          city: user.city || '',
          country: user.country || '',
          role: user.role || 'tourist',
          isActive: user.isActive !== undefined ? user.isActive : true,
          isProfilePrivate: user.isProfilePrivate || false,
          isAdmin: user.isAdmin || false,
          adminRole: user.adminRole || null,
        });
      } else {
        setFormData({
          name: '',
          email: '',
          password: '',
          phone: '',
          city: '',
          country: '',
          role: 'tourist',
          isActive: true,
          isProfilePrivate: false,
          isAdmin: false,
          adminRole: null,
        });
      }
      setErrors({});
    }
  }, [isOpen, user, mode]);

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (mode === 'add' && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const dataToSend = { ...formData };
      if (mode === 'edit' && !dataToSend.password) {
        delete dataToSend.password;
      }
      await onSave(dataToSend);
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
      setErrors({ submit: error.response?.data?.message || 'Failed to save user' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'add' ? 'Add New User' : 'Edit User'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-row">
            <div className="form-group">
              <label>
                <FiUser className="label-icon" />
                Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'error' : ''}
                placeholder="Enter full name"
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label>
                <FiMail className="label-icon" />
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder="Enter email address"
                disabled={mode === 'edit'}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                <FiLock className="label-icon" />
                Password {mode === 'add' && <span className="required">*</span>}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                placeholder={mode === 'edit' ? 'Leave blank to keep current' : 'Enter password'}
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label>
                <FiPhone className="label-icon" />
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                <FiMapPin className="label-icon" />
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter city"
              />
            </div>

            <div className="form-group">
              <label>
                <FiGlobe className="label-icon" />
                Country
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Enter country"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="tourist">Tourist</option>
                <option value="local">Local</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Status
              </label>
              <select
                name="isActive"
                value={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
              >
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isProfilePrivate"
                checked={formData.isProfilePrivate}
                onChange={handleChange}
              />
              <span>Private Profile</span>
            </label>
          </div>

          {canManageAdmins && mode === 'edit' && (
            <div className="admin-section">
              <div className="section-divider"></div>
              <h3 className="section-title">
                <FiShield className="section-icon" />
                Admin Settings
              </h3>
              
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isAdmin"
                    checked={formData.isAdmin}
                    onChange={(e) => {
                      const isAdmin = e.target.checked;
                      setFormData(prev => ({
                        ...prev,
                        isAdmin,
                        adminRole: isAdmin ? (prev.adminRole || 'team_admin') : null
                      }));
                    }}
                  />
                  <span>Make this user an Admin</span>
                </label>
              </div>

              {formData.isAdmin && (
                <div className="form-group">
                  <label>
                    <FiShield className="label-icon" />
                    Admin Role
                  </label>
                  <select
                    name="adminRole"
                    value={formData.adminRole || ''}
                    onChange={handleChange}
                  >
                    <option value="">Select Role</option>
                    <option value="team_admin">Team Admin</option>
                    <option value="manager">Manager</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="ceo">CEO</option>
                  </select>
                  <small className="form-hint">
                    Warning: Granting admin access gives this user administrative privileges.
                  </small>
                </div>
              )}
            </div>
          )}

          {errors.submit && (
            <div className="error-message submit-error">{errors.submit}</div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Saving...' : mode === 'add' ? 'Create User' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;

