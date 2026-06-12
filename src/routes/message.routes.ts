import { Router } from 'express';
import { markAsRead } from '../controllers/message.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.put('/:id/read', markAsRead);

export default router;