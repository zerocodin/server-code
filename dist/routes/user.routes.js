"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// All user routes are protected
router.use(auth_1.protect);
router.get('/search', user_controller_1.searchUsers);
router.get('/:id', user_controller_1.getUserById);
router.put('/profile', upload_1.uploadAvatar, user_controller_1.updateProfile);
exports.default = router;
//# sourceMappingURL=user.routes.js.map