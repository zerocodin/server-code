"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const conversation_controller_1 = require("../controllers/conversation.controller");
const message_controller_1 = require("../controllers/message.controller");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// All routes are protected
router.use(auth_1.protect);
// Conversation routes
router.get('/', conversation_controller_1.getConversations);
router.post('/', conversation_controller_1.createConversation);
router.get('/:id', conversation_controller_1.getConversationById);
// Message routes (nested under conversations)
router.get('/:id/messages', message_controller_1.getMessages);
router.post('/:id/messages', upload_1.uploadMessageMedia, message_controller_1.sendMessage);
exports.default = router;
//# sourceMappingURL=conversation.routes.js.map