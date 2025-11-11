import { useState, useMemo } from 'react';
import { 
  FiDownload, 
  FiPlus, 
  FiSearch, 
  FiChevronDown,
  FiMoreVertical
} from 'react-icons/fi';
import './ManageUsers.css';

const ManageUsers = () => {
  // Sample user data
  const [users] = useState([
    {
      id: 1,
      name: 'Elizabeth Lopez',
      employeeId: 'A0001',
      jobTitle: 'XYZ',
      department: 'XYZ',
      employmentType: 'Full-time',
      office: 'Axis Building',
      status: 'Active',
      avatar: 'EL'
    },
    {
      id: 2,
      name: 'Matthew Martinez',
      employeeId: 'A0002',
      jobTitle: 'XYZ',
      department: 'XYZ',
      employmentType: 'Part-time',
      office: 'Elevate Complex',
      status: 'Active',
      avatar: 'MM'
    },
    {
      id: 3,
      name: 'Sarah Johnson',
      employeeId: 'A0003',
      jobTitle: 'XYZ',
      department: 'XYZ',
      employmentType: 'Contractor',
      office: 'Innovate Tower',
      status: 'Inactive',
      avatar: 'SJ'
    },
    {
      id: 4,
      name: 'David Brown',
      employeeId: 'A0004',
      jobTitle: 'XYZ',
      department: 'XYZ',
      employmentType: 'Full-time',
      office: 'Axis Building',
      status: 'Pending',
      avatar: 'DB'
    },
    {
      id: 5,
      name: 'Emily Davis',
      employeeId: 'A0005',
      jobTitle: 'XYZ',
      department: 'XYZ',
      employmentType: 'Part-time',
      office: 'Elevate Complex',
      status: 'Active',
      avatar: 'ED'
    },
    {
      id: 6,
      name: 'Michael Wilson',
      employeeId: 'A0006',
      jobTitle: 'XYZ',
      department: 'XYZ',
      employmentType: 'Full-time',
      office: 'Innovate Tower',
      status: 'Active',
      avatar: 'MW'
    },
    {
      id: 7,
      name: 'Jessica Taylor',
      employeeId: 'A0007',
      jobTitle: 'XYZ',
      department: 'XYZ',
      employmentType: 'Contractor',
      office: 'Axis Building',
      status: 'Inactive',
      avatar: 'JT'
    },
    {
      id: 8,
      name: 'Christopher Anderson',
      employeeId: 'A0008',
      jobTitle: 'XYZ',
      department: 'XYZ',
      employmentType: 'Full-time',
      office: 'Elevate Complex',
      status: 'Active',
      avatar: 'CA'
    },
    {
      id: 9,
      name: 'Amanda White',
      employeeId: 'A0009',
      jobTitle: 'XYZ',
      department: 'XYZ',
      employmentType: 'Part-time',
      office: 'Innovate Tower',
      status: 'Pending',
      avatar: 'AW'
    },
    {
      id: 10,
      name: 'Daniel Harris',
      employeeId: 'A0010',
      jobTitle: 'XYZ',
      department: 'XYZ',
      employmentType: 'Full-time',
      office: 'Axis Building',
      status: 'Active',
      avatar: 'DH'
    },
    {
      id: 11,
      name: 'Lisa Martinez',
      employeeId: 'A0011',
      jobTitle: 'XYZ',
      department: 'XYZ',
      employmentType: 'Contractor',
      office: 'Elevate Complex',
      status: 'Active',
      avatar: 'LM'
    },
    {
      id: 12,
      name: 'Robert Thompson',
      employeeId: 'A0012',
      jobTitle: 'XYZ',
      department: 'XYZ',
      employmentType: 'Full-time',
      office: 'Innovate Tower',
      status: 'Inactive',
      avatar: 'RT'
    },
  ]);

  // State for filters and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('All Offices');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedJobTitle, setSelectedJobTitle] = useState('All Job Titles');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState('All Employment Types');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const itemsPerPage = 8;

  // Get unique values for filters
  const offices = useMemo(() => {
    const unique = [...new Set(users.map(u => u.office))];
    return ['All Offices', ...unique];
  }, [users]);

  const departments = useMemo(() => {
    const unique = [...new Set(users.map(u => u.department))];
    return ['All Departments', ...unique];
  }, [users]);

  const jobTitles = useMemo(() => {
    const unique = [...new Set(users.map(u => u.jobTitle))];
    return ['All Job Titles', ...unique];
  }, [users]);

  const employmentTypes = useMemo(() => {
    const unique = [...new Set(users.map(u => u.employmentType))];
    return ['All Employment Types', ...unique];
  }, [users]);

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesOffice = selectedOffice === 'All Offices' || user.office === selectedOffice;
      const matchesDepartment = selectedDepartment === 'All Departments' || user.department === selectedDepartment;
      const matchesJobTitle = selectedJobTitle === 'All Job Titles' || user.jobTitle === selectedJobTitle;
      const matchesEmploymentType = selectedEmploymentType === 'All Employment Types' || user.employmentType === selectedEmploymentType;

      return matchesSearch && matchesOffice && matchesDepartment && matchesJobTitle && matchesEmploymentType;
    });
  }, [users, searchQuery, selectedOffice, selectedDepartment, selectedJobTitle, selectedEmploymentType]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Handle select all
  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    if (checked) {
      setSelectedUsers(paginatedUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // Handle individual checkbox
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedOffice('All Offices');
    setSelectedDepartment('All Departments');
    setSelectedJobTitle('All Job Titles');
    setSelectedEmploymentType('All Employment Types');
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectAll(false);
    setSelectedUsers([]);
  };

  // Get status badge class
  const getStatusClass = (status) => {
    switch (status) {
      case 'Active':
        return 'status-badge active';
      case 'Inactive':
        return 'status-badge inactive';
      case 'Pending':
        return 'status-badge pending';
      default:
        return 'status-badge';
    }
  };

  // Get employment type badge class
  const getEmploymentTypeClass = (type) => {
    switch (type) {
      case 'Full-time':
        return 'employment-badge fulltime';
      case 'Part-time':
        return 'employment-badge parttime';
      case 'Contractor':
        return 'employment-badge contractor';
      default:
        return 'employment-badge';
    }
  };

  return (
    <div className="manage-users-page">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Manage Users</h1>
        <div className="header-actions">
          <button className="download-btn">
            <FiDownload className="btn-icon" />
            Download
          </button>
          <button className="add-user-btn-primary">
            <FiPlus className="btn-icon" />
            Add New User
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-filter">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search users by name or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
            />
          </div>
        </div>
        <div className="filter-dropdowns">
          <div className="filter-dropdown">
            <select
              value={selectedOffice}
              onChange={(e) => {
                setSelectedOffice(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              {offices.map(office => (
                <option key={office} value={office}>{office}</option>
              ))}
            </select>
            <FiChevronDown className="dropdown-icon" />
          </div>
          <div className="filter-dropdown">
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <FiChevronDown className="dropdown-icon" />
          </div>
          <div className="filter-dropdown">
            <select
              value={selectedJobTitle}
              onChange={(e) => {
                setSelectedJobTitle(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              {jobTitles.map(title => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
            <FiChevronDown className="dropdown-icon" />
          </div>
          <div className="filter-dropdown">
            <select
              value={selectedEmploymentType}
              onChange={(e) => {
                setSelectedEmploymentType(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              {employmentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <FiChevronDown className="dropdown-icon" />
          </div>
          <button className="clear-filters-btn" onClick={handleClearFilters}>
            Clear filters
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectAll && paginatedUsers.length > 0}
                  onChange={handleSelectAll}
                  className="checkbox-input"
                />
              </th>
              <th>Avatar</th>
              <th>Name</th>
              <th>Employee ID</th>
              <th>Job Title</th>
              <th>Department</th>
              <th>Employment Type</th>
              <th>Office</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map(user => (
              <tr key={user.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handleSelectUser(user.id)}
                    className="checkbox-input"
                  />
                </td>
                <td>
                  <div className="avatar-circle">
                    {user.avatar}
                  </div>
                </td>
                <td className="name-cell">{user.name}</td>
                <td>{user.employeeId}</td>
                <td>{user.jobTitle}</td>
                <td>{user.department}</td>
                <td>
                  <span className={getEmploymentTypeClass(user.employmentType)}>
                    {user.employmentType}
                  </span>
                </td>
                <td>{user.office}</td>
                <td>
                  <span className={getStatusClass(user.status)}>
                    {user.status}
                  </span>
                </td>
                <td>
                  <button className="action-menu-btn">
                    <FiMoreVertical />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination-container">
        <div className="pagination-info">
          Show {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} results
        </div>
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            &lt; Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </button>
          ))}
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next &gt;
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageUsers;

