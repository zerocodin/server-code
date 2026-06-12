import { Response } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { uploadToImageKit, deleteFromImageKit } from '../config/imagekit';
import { deleteLocalFile } from '../middleware/upload';

// @desc    Search users by email
// @route   GET /api/users/search?q=email
// @access  Private
export const searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const users = await User.find({
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error while searching users',
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('name email profileImage status lastSeen');

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
  } catch (error: any) {
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

// @desc    Update user profile (name + avatar)
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const updateData: any = {};

    // Update name if provided
    if (name && name.trim().length > 0) {
      updateData.name = name.trim();
    }

    // Handle avatar upload
    if (req.file) {
      try {
        // Upload to ImageKit
        const result = await uploadToImageKit(req.file.path, 'avatars', req.file.originalname);

        updateData.profileImage = result.url;
        updateData.profileImageFileId = result.fileId;

        // Delete old avatar from ImageKit if exists
        const user = await User.findById(req.userId);
        if (user && user.profileImageFileId) {
          try {
            await deleteFromImageKit(user.profileImageFileId);
          } catch (deleteErr) {
            console.warn('Failed to delete old avatar:', deleteErr);
          }
        }

        // Delete local temp file
        deleteLocalFile(req.file.path);
      } catch (uploadError: any) {
        // Clean up local file on error
        if (req.file) {
          deleteLocalFile(req.file.path);
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

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile',
    });
  }
};