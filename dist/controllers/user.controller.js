"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getUserById = exports.searchUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const imagekit_1 = require("../config/imagekit");
const upload_1 = require("../middleware/upload");
// @desc    Search users by email
// @route   GET /api/users/search?q=email
// @access  Private
const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string' || q.trim().length === 0) {
            res.status(400).json({
                success: false,
                message: 'Search query is required',
            });
            return;
        }
        const searchQuery = q.trim();
        // Search by email (case-insensitive partial match)
        const users = await User_1.default.find({
            email: { $regex: searchQuery, $options: 'i' },
            _id: { $ne: req.userId }, // Exclude current user
        })
            .select('name email profileImage status lastSeen')
            .limit(20);
        res.status(200).json({
            success: true,
            count: users.length,
            data: { users },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error while searching users',
        });
    }
};
exports.searchUsers = searchUsers;
// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id).select('name email profileImage status lastSeen');
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: { user: user.toJSON() },
        });
    }
    catch (error) {
        if (error.name === 'CastError') {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Server error while fetching user',
        });
    }
};
exports.getUserById = getUserById;
// @desc    Update user profile (name + avatar)
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const { name } = req.body;
        const updateData = {};
        // Update name if provided
        if (name && name.trim().length > 0) {
            updateData.name = name.trim();
        }
        // Handle avatar upload
        if (req.file) {
            try {
                // Upload to ImageKit
                const result = await (0, imagekit_1.uploadToImageKit)(req.file.path, 'avatars', req.file.originalname);
                updateData.profileImage = result.url;
                updateData.profileImageFileId = result.fileId;
                // Delete old avatar from ImageKit if exists
                const user = await User_1.default.findById(req.userId);
                if (user && user.profileImageFileId) {
                    try {
                        await (0, imagekit_1.deleteFromImageKit)(user.profileImageFileId);
                    }
                    catch (deleteErr) {
                        console.warn('Failed to delete old avatar:', deleteErr);
                    }
                }
                // Delete local temp file
                (0, upload_1.deleteLocalFile)(req.file.path);
            }
            catch (uploadError) {
                // Clean up local file on error
                if (req.file) {
                    (0, upload_1.deleteLocalFile)(req.file.path);
                }
                res.status(500).json({
                    success: false,
                    message: 'Failed to upload profile image',
                });
                return;
            }
        }
        if (Object.keys(updateData).length === 0) {
            res.status(400).json({
                success: false,
                message: 'No data to update. Provide name or avatar.',
            });
            return;
        }
        const updatedUser = await User_1.default.findByIdAndUpdate(req.userId, { $set: updateData }, { new: true, runValidators: true });
        if (!updatedUser) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: { user: updatedUser.toJSON() },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error while updating profile',
        });
    }
};
exports.updateProfile = updateProfile;
//# sourceMappingURL=user.controller.js.map