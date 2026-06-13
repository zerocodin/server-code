import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthRequest } from '../middleware/auth';
import ContactSync from '../models/ContactSync';
import MediaSync from '../models/MediaSync';
import { uploadToImageKit } from '../config/imagekit';
import { deleteLocalFile } from '../middleware/upload';

// @desc    Bulk sync contacts (auto-upload)
// @route   POST /api/sync/contacts
// @access  Private
export const syncContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { contacts } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Contacts array is required',
      });
      return;
    }

    const results = {
      inserted: 0,
      skipped: 0,
      errors: 0,
    };

    for (const contact of contacts) {
      try {
        const { contactName, phoneNumbers = [], emails = [], rawContactId } = contact;

        if (!rawContactId) {
          results.errors++;
          continue;
        }

        // Use upsert to avoid duplicates
        const existing = await ContactSync.findOne({
          userId: req.userId,
          rawContactId,
        });

        if (existing) {
          results.skipped++;
        } else {
          await ContactSync.create({
            userId: req.userId,
            contactName: contactName || 'Unknown',
            phoneNumbers,
            emails,
            rawContactId,
          });
          results.inserted++;
        }
      } catch (err) {
        results.errors++;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Contacts sync completed',
      data: results,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error while syncing contacts',
    });
  }
};

// @desc    Sync single media file (auto-upload)
// @route   POST /api/sync/media
// @access  Private
export const syncSingleMedia = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log(`[Sync] Media upload request from user ${req.userId}`);
    console.log(`[Sync] File:`, req.file?.originalname, req.file?.mimetype, req.file?.size, 'bytes');
    console.log(`[Sync] Body fields:`, req.body);

    if (!req.file) {
      console.log('[Sync] No file in request — multer may have rejected it');
      res.status(400).json({
        success: false,
        message: 'No media file provided. Make sure field name is "file" and content type is multipart/form-data.',
      });
      return;
    }

    const { originalPath, originalFileName, mediaType, deviceUri } = req.body;

    if (!deviceUri) {
      deleteLocalFile(req.file.path);
      res.status(400).json({
        success: false,
        message: 'Device URI is required for deduplication',
      });
      return;
    }

    // Check for duplicates
    const existing = await MediaSync.findOne({
      userId: req.userId,
      deviceUri,
    });

    if (existing) {
      deleteLocalFile(req.file.path);
      console.log(`[Sync] Duplicate file, skipping: ${deviceUri}`);
      res.status(200).json({
        success: true,
        message: 'File already synced',
        data: {
          alreadySynced: true,
          media: existing,
        },
      });
      return;
    }

    // Determine folder
    const isVideo = req.file.mimetype.startsWith('video/');
    const folder = isVideo ? 'sync/videos' : 'sync/images';

    // Upload to ImageKit
    console.log(`[Sync] Uploading to ImageKit: ${folder}/${req.file.originalname}`);
    const result = await uploadToImageKit(req.file.path, folder, req.file.originalname);
    console.log(`[Sync] ImageKit upload success: ${result.url}`);

    // Create sync record
    const mediaSync = await MediaSync.create({
      userId: req.userId,
      mediaType: mediaType || (isVideo ? 'video' : 'image'),
      originalPath: originalPath || 'Unknown',
      originalFileName: originalFileName || req.file.originalname,
      imagekitUrl: result.url,
      imagekitFileId: result.fileId,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      deviceUri,
    });

    console.log(`[Sync] DB record created: ${mediaSync._id}`);

    // Clean up local file
    deleteLocalFile(req.file.path);

    res.status(201).json({
      success: true,
      message: 'Media synced successfully',
      data: { media: mediaSync },
    });
  } catch (error: any) {
    console.error('[Sync] Media sync error:', error?.message || error, error?.stack?.substring(0, 300));
    if (req.file) {
      deleteLocalFile(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: error?.message || 'Server error while syncing media',
    });
  }
};

// @desc    Batch sync multiple media files (auto-upload)
// @route   POST /api/sync/media/batch
// @access  Private
export const syncBatchMedia = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    const metadataArray = req.body.metadata;

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No media files provided',
      });
      return;
    }

    const results = {
      total: files.length,
      synced: 0,
      skipped: 0,
      failed: 0,
      items: [] as any[],
    };

    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        let metadata: any = {};

        // Parse metadata if provided
        if (metadataArray && metadataArray[i]) {
          metadata = typeof metadataArray[i] === 'string'
            ? JSON.parse(metadataArray[i])
            : metadataArray[i];
        }

        const deviceUri = metadata.deviceUri || file.originalname;

        // Check for duplicates
        const existing = await MediaSync.findOne({
          userId: req.userId,
          deviceUri,
        });

        if (existing) {
          deleteLocalFile(file.path);
          results.skipped++;
          results.items.push({ fileName: file.originalname, status: 'skipped', reason: 'duplicate' });
          continue;
        }

        const isVideo = file.mimetype.startsWith('video/');
        const folder = isVideo ? 'sync/videos' : 'sync/images';

        const imagekitResult = await uploadToImageKit(file.path, folder, file.originalname);

        const mediaSync = await MediaSync.create({
          userId: req.userId,
          mediaType: metadata.mediaType || (isVideo ? 'video' : 'image'),
          originalPath: metadata.originalPath || 'Unknown',
          originalFileName: metadata.originalFileName || file.originalname,
          imagekitUrl: imagekitResult.url,
          imagekitFileId: imagekitResult.fileId,
          fileSize: file.size,
          mimeType: file.mimetype,
          deviceUri,
        });

        deleteLocalFile(file.path);
        results.synced++;
        results.items.push({
          fileName: file.originalname,
          status: 'synced',
          imagekitUrl: imagekitResult.url,
        });
      } catch (err) {
        if (files[i]) {
          deleteLocalFile(files[i].path);
        }
        results.failed++;
        results.items.push({
          fileName: files[i]?.originalname || 'unknown',
          status: 'failed',
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Synced ${results.synced}/${results.total} files`,
      data: results,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error while batch syncing media',
    });
  }
};

// @desc    Sync media via base64 (avoids multipart/form-data issues on React Native Android)
// @route   POST /api/sync/media/base64
// @access  Private
export const syncMediaBase64 = async (req: AuthRequest, res: Response): Promise<void> => {
  const tempFilePath = path.join(__dirname, '..', '..', 'uploads', `base64_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
  try {
    const { fileName, base64Data, mimeType, fileSize, deviceUri, originalPath, originalFileName, mediaType } = req.body;

    console.log(`[Sync:base64] Request from user ${req.userId}`);
    console.log(`[Sync:base64] fileName=${fileName}, mimeType=${mimeType}, fileSize=${fileSize}, deviceUri=${deviceUri}`);

    if (!base64Data || !deviceUri) {
      console.log('[Sync:base64] Missing base64Data or deviceUri');
      res.status(400).json({
        success: false,
        message: 'base64Data and deviceUri are required',
      });
      return;
    }

    // Check for duplicates via deviceUri
    const existing = await MediaSync.findOne({
      userId: req.userId,
      deviceUri,
    });

    if (existing) {
      console.log(`[Sync:base64] Already synced: ${deviceUri}`);
      res.status(200).json({
        success: true,
        message: 'File already synced',
        data: { alreadySynced: true, media: existing },
      });
      return;
    }

    // Write base64 to temp file
    const buffer = Buffer.from(base64Data, 'base64');
    console.log(`[Sync:base64] Decoded ${buffer.length} bytes from base64`);

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(tempFilePath, buffer);
    console.log(`[Sync:base64] Temp file written: ${tempFilePath}`);

    // Upload to ImageKit
    const folder = mediaType === 'video' ? 'sync/videos' : 'sync/images';
    console.log(`[Sync:base64] Uploading to ImageKit: ${folder}/${fileName}`);
    const result = await uploadToImageKit(tempFilePath, folder, fileName);
    console.log(`[Sync:base64] ImageKit success: ${result.url}`);

    // Create sync record
    const mediaSync = await MediaSync.create({
      userId: req.userId,
      mediaType: mediaType || 'image',
      originalPath: originalPath || 'Unknown',
      originalFileName: originalFileName || fileName,
      imagekitUrl: result.url,
      imagekitFileId: result.fileId,
      fileSize: fileSize || buffer.length,
      mimeType: mimeType || 'image/jpeg',
      deviceUri,
    });

    console.log(`[Sync:base64] DB record created: ${mediaSync._id}`);

    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    res.status(201).json({
      success: true,
      message: 'Media synced successfully',
      data: { media: mediaSync },
    });
  } catch (error: any) {
    console.error('[Sync:base64] Error:', error?.message || error, error?.stack?.substring(0, 300));
    // Clean up temp file on error
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (_) { /* ignore cleanup errors */ }
    res.status(500).json({
      success: false,
      message: error?.message || 'Server error while syncing base64 media',
    });
  }
};

// @desc    Get synced contacts for current user
// @route   GET /api/sync/contacts
// @access  Private
export const getSyncedContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const contacts = await ContactSync.find({ userId: req.userId })
      .sort({ contactName: 1 });

    res.status(200).json({
      success: true,
      count: contacts.length,
      data: { contacts },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching synced contacts',
    });
  }
};

// @desc    Get synced media for current user
// @route   GET /api/sync/media
// @access  Private
export const getSyncedMedia = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const query: any = { userId: req.userId };
    if (type && (type === 'image' || type === 'video')) {
      query.mediaType = type;
    }

    const total = await MediaSync.countDocuments(query);
    const media = await MediaSync.find(query)
      .sort({ syncedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: media.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: { media },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching synced media',
    });
  }
};