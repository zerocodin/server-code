import { Router } from 'express';
import { searchUsers, getUserById, updateProfile } from '../controllers/user.controller';
import { protect } from '../middleware/auth';
import { uploadAvatar } from '../middleware/upload';

const router = Router();

// All user routes are protected
router.use(protect);

router.get('/search', searchUsers);
router.get('/:id', getUserById);
router.put('/profile', uploadAvatar, updateProfile);

export default router;