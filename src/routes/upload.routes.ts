import { Router } from 'express';
import {
  uploadAvatarController,
  uploadMessageMediaController,
} from '../controllers/upload.controller';
import { protect } from '../middleware/auth';
import { uploadAvatar, uploadMessageMedia } from '../middleware/upload';

const router = Router();

router.use(protect);

router.post('/avatar', uploadAvatar, uploadAvatarController);
router.post('/message', uploadMessageMedia, uploadMessageMediaController);

export default router;