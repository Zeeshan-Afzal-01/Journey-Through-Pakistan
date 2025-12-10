import jwt from 'jsonwebtoken';
import User from '../models/user.models.js';

// Admin roles hierarchy
export const ADMIN_ROLES = {
  CEO: 'ceo',
  SUPERVISOR: 'supervisor',
  MANAGER: 'manager',
  TEAM_ADMIN: 'team_admin',
};

// Permission levels
export const PERMISSIONS = {
  // User Management
  VIEW_USERS: 'view_users',
  CREATE_USERS: 'create_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',
  
  // Post Management
  VIEW_POSTS: 'view_posts',
  DELETE_POSTS: 'delete_posts',
  MODERATE_POSTS: 'moderate_posts',
  
  // Analytics
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data',
  
  // Settings
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_ADMINS: 'manage_admins',
};

// Role-based permissions mapping
export const ROLE_PERMISSIONS = {
  [ADMIN_ROLES.CEO]: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_USERS,
    PERMISSIONS.EDIT_USERS,
    PERMISSIONS.DELETE_USERS,
    PERMISSIONS.VIEW_POSTS,
    PERMISSIONS.DELETE_POSTS,
    PERMISSIONS.MODERATE_POSTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.MANAGE_ADMINS,
  ],
  [ADMIN_ROLES.SUPERVISOR]: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_USERS,
    PERMISSIONS.EDIT_USERS,
    PERMISSIONS.DELETE_USERS,
    PERMISSIONS.VIEW_POSTS,
    PERMISSIONS.DELETE_POSTS,
    PERMISSIONS.MODERATE_POSTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_DATA,
  ],
  [ADMIN_ROLES.MANAGER]: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.EDIT_USERS,
    PERMISSIONS.VIEW_POSTS,
    PERMISSIONS.MODERATE_POSTS,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  [ADMIN_ROLES.TEAM_ADMIN]: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_POSTS,
    PERMISSIONS.MODERATE_POSTS,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
};

// Check if user has specific permission
export const hasPermission = (userRole, permission) => {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) {
    return false;
  }
  return ROLE_PERMISSIONS[userRole].includes(permission);
};

// Check if user has any of the required permissions
export const hasAnyPermission = (userRole, permissions) => {
  return permissions.some(permission => hasPermission(userRole, permission));
};

// Check if user has all required permissions
export const hasAllPermissions = (userRole, permissions) => {
  return permissions.every(permission => hasPermission(userRole, permission));
};

// Verify admin token and get user
export const verifyAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.adminToken) {
      token = req.cookies.adminToken;
    } else if (req.cookies && req.cookies.appToken) {
      // Fallback to appToken for backward compatibility, but prefer adminToken
      token = req.cookies.appToken;
    }

    if (!token) {
      return res.status(401).json({ message: "Access Denied. No Token Provided." });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check if user is admin
    if (!user.isAdmin || !user.adminRole) {
      return res.status(403).json({ message: "Access Denied. Admin access required." });
    }

    req.user = user;
    req.adminRole = user.adminRole;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or Expired Token!" });
  }
};

// Middleware to check specific permission
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.adminRole) {
      return res.status(403).json({ message: "Admin role not found" });
    }

    if (!hasPermission(req.adminRole, permission)) {
      return res.status(403).json({ 
        message: `Access Denied. Required permission: ${permission}` 
      });
    }

    next();
  };
};

// Middleware to check if user is CEO
export const requireCEO = (req, res, next) => {
  if (req.adminRole !== ADMIN_ROLES.CEO) {
    return res.status(403).json({ message: "Access Denied. CEO access required." });
  }
  next();
};

// Middleware to check if user is CEO or Supervisor
export const requireSupervisorOrAbove = (req, res, next) => {
  if (![ADMIN_ROLES.CEO, ADMIN_ROLES.SUPERVISOR].includes(req.adminRole)) {
    return res.status(403).json({ message: "Access Denied. Supervisor or above access required." });
  }
  next();
};

