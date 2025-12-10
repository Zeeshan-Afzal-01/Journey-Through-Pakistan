import { isMaintenanceMode } from '../utils/settingsHelper.js';

export const checkMaintenanceMode = async (req, res, next) => {
  try {
    // Skip maintenance check for admin routes
    if (req.path.startsWith('/admin')) {
      return next();
    }

    const maintenance = await isMaintenanceMode();
    
    if (maintenance) {
      return res.status(503).json({
        message: 'System is currently under maintenance. Please try again later.',
        maintenance: true
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    // Don't block requests if there's an error checking maintenance mode
    next();
  }
};

