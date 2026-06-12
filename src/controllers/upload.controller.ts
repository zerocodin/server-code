import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { uploadToImageKit } from '../config/imagekit';
import { deleteLocalFile } from '../middleware/upload';

// @desc    Upload profile avatar
// @route   POST /api/upload/avatar
// @access  Private
export const uploadAvatarController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
      return;
    }

    const result = await uploadToImageKit(req.file.path, 'avatars', req.file.originalname);
    deleteLocalFile(req.file.path);

    res.status(200).json({
      success: true,
      data: {
        url: result.url,
        fileId: result.fileId,
      },
    });
  } catch (error: any) {
    if (req.file) {
      deleteLocalFile(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar',
    });
  }
};

// @desc    Upload chat message media
// @route   POST /api/upload/message
// @access  Private
export const uploadMessageMediaController = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const result = await uploadToImageKit(req.file.path, 'messages', req.file.originalname);
    deleteLocalFile(req.file.path);

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
  } catch (error: any) {
    if (req.file) {
      deleteLocalFile(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to upload media',
    });
  }
};