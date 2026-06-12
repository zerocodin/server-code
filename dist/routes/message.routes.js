"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const message_controller_1 = require("../controllers/message.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.put('/:id/read', message_controller_1.markAsRead);
exports.default = router;
//# sourceMappingURL=message.routes.js.map