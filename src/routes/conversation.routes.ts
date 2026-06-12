import { Router } from 'express';
import {
  getConversations,
  createConversation,
  getConversationById,
} from '../controllers/conversation.controller';
import { getMessages, sendMessage } from '../controllers/message.controller';
import { protect } from '../middleware/auth';
import { uploadMessageMedia } from '../middleware/upload';

const router = Router();

// All routes are protected
router.use(protect);

// Conversation routes
router.get('/', getConversations);
router.post('/', createConversation);
router.get('/:id', getConversationById);

// Message routes (nested under conversations)
router.get('/:id/messages', getMessages);
router.post('/:id/messages', uploadMessageMedia, sendMessage);

export default router;