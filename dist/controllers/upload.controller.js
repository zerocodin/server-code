"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMessageMediaController = exports.uploadAvatarController = void 0;
const imagekit_1 = require("../config/imagekit");
const upload_1 = require("../middleware/upload");
// @desc    Upload profile avatar
// @route   POST /api/upload/avatar
// @access  Private
const uploadAvatarController = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'No image file provided',
            });
            return;
        }
        const result = await (0, imagekit_1.uploadToImageKit)(req.file.path, 'avatars', req.file.originalname);
        (0, upload_1.deleteLocalFile)(req.file.path);
        res.status(200).json({
            success: true,
            data: {
                url: result.url,
                fileId: result.fileId,
            },
        });
    }
    catch (error) {
        if (req.file) {
            (0, upload_1.deleteLocalFile)(req.file.path);
        }
        res.status(500).json({
            success: false,
            message: 'Failed to upload avatar',
        });
    }
};
exports.uploadAvatarController = uploadAvatarController;
// @desc    Upload chat message media
// @route   POST /api/upload/message
// @access  Private
const uploadMessageMediaController = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'No media file provided',
            });
            return;
        }
        const isVideo = req.file.mimetype.startsWith('video/');
        const resourceType = isVideo ? 'video' : 'image';
        const result = await (0, imagekit_1.uploadToImageKit)(req.file.path, 'messages', req.file.originalname);
        (0, upload_1.deleteLocalFile)(req.file.path);
        res.status(200).json({
            success: true,
            data: {
                url: result.url,
                fileId: result.fileId,
                fileName: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
            },
        });
    }
    catch (error) {
        if (req.file) {
            (0, upload_1.deleteLocalFile)(req.file.path);
        }
        res.status(500).json({
            success: false,
            message: 'Failed to upload media',
        });
    }
};
exports.uploadMessageMediaController = uploadMessageMediaController;
//# sourceMappingURL=upload.controller.js.map