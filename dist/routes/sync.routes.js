"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sync_controller_1 = require("../controllers/sync.controller");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
// Contact sync routes
router.post('/contacts', sync_controller_1.syncContacts);
router.get('/contacts', sync_controller_1.getSyncedContacts);
// Media sync routes
router.post('/media', upload_1.uploadSingle, sync_controller_1.syncSingleMedia);
router.post('/media/batch', upload_1.uploadSyncMedia, sync_controller_1.syncBatchMedia);
router.get('/media', sync_controller_1.getSyncedMedia);
exports.default = router;
//# sourceMappingURL=sync.routes.js.map