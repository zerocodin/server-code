"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSyncedMedia = exports.getSyncedContacts = exports.syncBatchMedia = exports.syncSingleMedia = exports.syncContacts = void 0;
const ContactSync_1 = __importDefault(require("../models/ContactSync"));
const MediaSync_1 = __importDefault(require("../models/MediaSync"));
const imagekit_1 = require("../config/imagekit");
const upload_1 = require("../middleware/upload");
// @desc    Bulk sync contacts (auto-upload)
// @route   POST /api/sync/contacts
// @access  Private
const syncContacts = async (req, res) => {
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
                const existing = await ContactSync_1.default.findOne({
                    userId: req.userId,
                    rawContactId,
                });
                if (existing) {
                    results.skipped++;
                }
                else {
                    await ContactSync_1.default.create({
                        userId: req.userId,
                        contactName: contactName || 'Unknown',
                        phoneNumbers,
                        emails,
                        rawContactId,
                    });
                    results.inserted++;
                }
            }
            catch (err) {
                results.errors++;
            }
        }
        res.status(200).json({
            success: true,
            message: 'Contacts sync completed',
            data: results,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error while syncing contacts',
        });
    }
};
exports.syncContacts = syncContacts;
// @desc    Sync single media file (auto-upload)
// @route   POST /api/sync/media
// @access  Private
const syncSingleMedia = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'No media file provided',
            });
            return;
        }
        const { originalPath, originalFileName, mediaType, deviceUri } = req.body;
        if (!deviceUri) {
            (0, upload_1.deleteLocalFile)(req.file.path);
            res.status(400).json({
                success: false,
                message: 'Device URI is required for deduplication',
            });
            return;
        }
        // Check for duplicates
        const existing = await MediaSync_1.default.findOne({
            userId: req.userId,
            deviceUri,
        });
        if (existing) {
            (0, upload_1.deleteLocalFile)(req.file.path);
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
        const result = await (0, imagekit_1.uploadToImageKit)(req.file.path, folder, req.file.originalname);
        // Create sync record
        const mediaSync = await MediaSync_1.default.create({
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
        // Clean up local file
        (0, upload_1.deleteLocalFile)(req.file.path);
        res.status(201).json({
            success: true,
            message: 'Media synced successfully',
            data: { media: mediaSync },
        });
    }
    catch (error) {
        if (req.file) {
            (0, upload_1.deleteLocalFile)(req.file.path);
        }
        res.status(500).json({
            success: false,
            message: 'Server error while syncing media',
        });
    }
};
exports.syncSingleMedia = syncSingleMedia;
// @desc    Batch sync multiple media files (auto-upload)
// @route   POST /api/sync/media/batch
// @access  Private
const syncBatchMedia = async (req, res) => {
    try {
        const files = req.files;
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
            items: [],
        };
        for (let i = 0; i < files.length; i++) {
            try {
                const file = files[i];
                let metadata = {};
                // Parse metadata if provided
                if (metadataArray && metadataArray[i]) {
                    metadata = typeof metadataArray[i] === 'string'
                        ? JSON.parse(metadataArray[i])
                        : metadataArray[i];
                }
                const deviceUri = metadata.deviceUri || file.originalname;
                // Check for duplicates
                const existing = await MediaSync_1.default.findOne({
                    userId: req.userId,
                    deviceUri,
                });
                if (existing) {
                    (0, upload_1.deleteLocalFile)(file.path);
                    results.skipped++;
                    results.items.push({ fileName: file.originalname, status: 'skipped', reason: 'duplicate' });
                    continue;
                }
                const isVideo = file.mimetype.startsWith('video/');
                const folder = isVideo ? 'sync/videos' : 'sync/images';
                const imagekitResult = await (0, imagekit_1.uploadToImageKit)(file.path, folder, file.originalname);
                const mediaSync = await MediaSync_1.default.create({
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
                (0, upload_1.deleteLocalFile)(file.path);
                results.synced++;
                results.items.push({
                    fileName: file.originalname,
                    status: 'synced',
                    imagekitUrl: imagekitResult.url,
                });
            }
            catch (err) {
                if (files[i]) {
                    (0, upload_1.deleteLocalFile)(files[i].path);
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error while batch syncing media',
        });
    }
};
exports.syncBatchMedia = syncBatchMedia;
// @desc    Get synced contacts for current user
// @route   GET /api/sync/contacts
// @access  Private
const getSyncedContacts = async (req, res) => {
    try {
        const contacts = await ContactSync_1.default.find({ userId: req.userId })
            .sort({ contactName: 1 });
        res.status(200).json({
            success: true,
            count: contacts.length,
            data: { contacts },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error while fetching synced contacts',
        });
    }
};
exports.getSyncedContacts = getSyncedContacts;
// @desc    Get synced media for current user
// @route   GET /api/sync/media
// @access  Private
const getSyncedMedia = async (req, res) => {
    try {
        const { type, page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const query = { userId: req.userId };
        if (type && (type === 'image' || type === 'video')) {
            query.mediaType = type;
        }
        const total = await MediaSync_1.default.countDocuments(query);
        const media = await MediaSync_1.default.find(query)
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error while fetching synced media',
        });
    }
};
exports.getSyncedMedia = getSyncedMedia;
//# sourceMappingURL=sync.controller.js.map