import express from 'express';
import {
    registerUser,
    login,
    getAllUsers,
    getUserById,
    updateUserById,
    getMe,
    updateMe,
    verifyOtp,
    resendOtp,
    logout
} from '../controller/userController.js'
import { verifyToken } from '../middleware/auth.js';
import Upload from '../middleware/upload.js'

const router = express.Router()
// router.get('/login', login)
router.post('/register', Upload.single('profilePicture'), registerUser);
router.post('/login', login);
// static routes before param routes
router.get('/getMe', verifyToken, getMe);
router.put('/me', verifyToken, Upload.single('profilePicture'), updateMe);
router.get('/search', verifyToken, (await import('../controller/userController.js')).searchUsers);
router.get('/top-creators', verifyToken, (await import('../controller/userController.js')).getTopCreators);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/logout', logout);
router.get('/:id', verifyToken, getUserById);
router.get('/show-all-users',verifyToken, getAllUsers)

export default router;