"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_controller_1 = require("../controllers/upload.controller");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.post('/avatar', upload_1.uploadAvatar, upload_controller_1.uploadAvatarController);
router.post('/message', upload_1.uploadMessageMedia, upload_controller_1.uploadMessageMediaController);
exports.default = router;
//# sourceMappingURL=upload.routes.js.map