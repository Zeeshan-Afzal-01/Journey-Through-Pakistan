import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  createGroup,
  listGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  getMyGroups,
  getGroupPosts,
  updateGroupCover,
  updateGroupPhoto,
  addMember,
  removeMember,
  approveJoinRequest,
  declineJoinRequest,
} from '../controller/groupController.js';
import uploadGroup from '../middleware/uploadGroup.js';

const router = express.Router();

router.post('/', verifyToken, createGroup);
router.get('/', verifyToken, listGroups);
router.get('/my', verifyToken, getMyGroups);
router.get('/:id', verifyToken, getGroup);
router.put('/:id', verifyToken, updateGroup);
router.delete('/:id', verifyToken, deleteGroup);
router.post('/:id/join', verifyToken, joinGroup);
router.post('/:id/leave', verifyToken, leaveGroup);
router.get('/:id/posts', verifyToken, getGroupPosts);
router.post('/:id/cover', verifyToken, uploadGroup.single('coverImage'), updateGroupCover);
router.post('/:id/photo', verifyToken, uploadGroup.single('photo'), updateGroupPhoto);
router.post('/:id/members', verifyToken, addMember);
router.delete('/:id/members', verifyToken, removeMember);
router.post('/:id/approve-request', verifyToken, approveJoinRequest);
router.post('/:id/decline-request', verifyToken, declineJoinRequest);

export default router;

