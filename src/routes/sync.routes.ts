import { Router } from 'express';
import {
  syncContacts,
  syncSingleMedia,
  syncBatchMedia,
  getSyncedContacts,
  getSyncedMedia,
} from '../controllers/sync.controller';
import { protect } from '../middleware/auth';
import { uploadSingle, uploadSyncMedia } from '../middleware/upload';

const router = Router();

router.use(protect);

// Contact sync routes
router.post('/contacts', syncContacts);
router.get('/contacts', getSyncedContacts);

// Media sync routes
router.post('/media', uploadSingle, syncSingleMedia);
router.post('/media/batch', uploadSyncMedia, syncBatchMedia);
router.get('/media', getSyncedMedia);

export default router;