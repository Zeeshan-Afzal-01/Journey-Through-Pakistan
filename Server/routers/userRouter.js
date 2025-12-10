import express from 'express';
import {
    registerUser,
    login,
    getAllUsers,
    getUserById,
    updateUserById,
    deleteUserById,
    getMe,
    updateMe,
    verifyOtp,
    resendOtp,
    logout,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    unfriend,
    getFriends,
    getCommunityAttractionsByMonth,
    getRecentActivities,
    getUserStats,
    getLocalConnections
} from '../controller/userController.js'
import { verifyToken } from '../middleware/auth.js';
import Upload from '../middleware/upload.js'
import uploadProfile from '../middleware/uploadProfile.js'

const router = express.Router()

// Helper to wrap async middleware
const asyncMiddleware = (fn) => {
  return async (req, res, next) => {
    try {
      const middleware = await fn();
      if (typeof middleware === 'function') {
        middleware(req, res, next);
      } else {
        next();
      }
    } catch (error) {
      next(error);
    }
  };
};

// router.get('/login', login)
router.post('/register', Upload.single('profilePicture'), registerUser);
router.post('/login', login);
// static routes before param routes
router.get('/getMe', verifyToken, getMe);
router.put('/me', verifyToken, asyncMiddleware(async () => {
  const upload = await uploadProfile();
  return upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'coverPhoto', maxCount: 1 }
  ]);
}), updateMe);
router.get('/search', verifyToken, (await import('../controller/userController.js')).searchUsers);
router.get('/top-creators', verifyToken, (await import('../controller/userController.js')).getTopCreators);
router.get('/attractions-by-month', verifyToken, getCommunityAttractionsByMonth);
router.get('/recent-activities', verifyToken, getRecentActivities);
router.get('/stats', verifyToken, getUserStats);
router.get('/local-connections', verifyToken, getLocalConnections);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/logout', logout);
router.post('/friend/send', verifyToken, sendFriendRequest);
router.post('/friend/accept', verifyToken, acceptFriendRequest);
router.post('/friend/decline', verifyToken, declineFriendRequest);
router.post('/friend/cancel', verifyToken, cancelFriendRequest);
router.post('/friend/unfriend', verifyToken, unfriend);
router.get('/friends', verifyToken, getFriends);
router.get('/show-all-users',verifyToken, getAllUsers);
router.put('/:id', verifyToken, updateUserById);
router.delete('/:id', verifyToken, deleteUserById);
router.get('/:id', verifyToken, getUserById);

export default router;