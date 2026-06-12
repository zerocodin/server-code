"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.sendMessage = exports.getMessages = void 0;
const Message_1 = __importDefault(require("../models/Message"));
const Conversation_1 = __importDefault(require("../models/Conversation"));
const socket_1 = require("../config/socket");
const imagekit_1 = require("../config/imagekit");
const upload_1 = require("../middleware/upload");
// @desc    Get messages for a conversation (paginated)
// @route   GET /api/conversations/:id/messages
// @access  Private
const getMessages = async (req, res) => {
    try {
        const { id: conversationId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        // Verify user is participant
        const conversation = await Conversation_1.default.findById(conversationId);
        if (!conversation) {
            res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
            return;
        }
        const isParticipant = conversation.participants.some((p) => p.toString() === req.userId);
        if (!isParticipant) {
            res.status(403).json({
                success: false,
                message: 'You are not a participant in this conversation',
            });
            return;
        }
        const totalMessages = await Message_1.default.countDocuments({ conversationId });
        const messages = await Message_1.default.find({ conversationId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('senderId', 'name email profileImage');
        res.status(200).json({
            success: true,
            count: messages.length,
            total: totalMessages,
            page,
            totalPages: Math.ceil(totalMessages / limit),
            data: { messages: messages.reverse() }, // Return oldest first
        });
    }
    catch (error) {
        if (error.name === 'CastError') {
            res.status(400).json({
                success: false,
                message: 'Invalid conversation ID format',
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Server error while fetching messages',
        });
    }
};
exports.getMessages = getMessages;
// @desc    Send a message
// @route   POST /api/conversations/:id/messages
// @access  Private
const sendMessage = async (req, res) => {
    try {
        const { id: conversationId } = req.params;
        const { content, messageType = 'text' } = req.body;
        // Validate conversation exists and user is participant
        const conversation = await Conversation_1.default.findById(conversationId);
        if (!conversation) {
            res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
            return;
        }
        const isParticipant = conversation.participants.some((p) => p.toString() === req.userId);
        if (!isParticipant) {
            res.status(403).json({
                success: false,
                message: 'You are not a participant in this conversation',
            });
            return;
        }
        // Validate content for text messages
        if (messageType === 'text' && (!content || content.trim().length === 0)) {
            res.status(400).json({
                success: false,
                message: 'Message content is required for text messages',
            });
            return;
        }
        let mediaUrl = '';
        let mediaMeta = {
            fileName: '',
            fileSize: 0,
            mimeType: '',
        };
        // Handle media upload
        if (req.file) {
            try {
                const result = await (0, imagekit_1.uploadToImageKit)(req.file.path, 'messages', req.file.originalname);
                mediaUrl = result.url;
                mediaMeta = {
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    mimeType: req.file.mimetype,
                };
                // Delete local temp file
                (0, upload_1.deleteLocalFile)(req.file.path);
            }
            catch (uploadError) {
                if (req.file) {
                    (0, upload_1.deleteLocalFile)(req.file.path);
                }
                res.status(500).json({
                    success: false,
                    message: 'Failed to upload media file',
                });
                return;
            }
        }
        // Create message
        const message = await Message_1.default.create({
            conversationId,
            senderId: req.userId,
            content: mediaUrl || content, // Use URL for media, text content for text
            messageType,
            mediaUrl,
            mediaMeta,
            deliveredTo: [req.userId],
        });
        // Populate sender info
        const populatedMessage = await message.populate('senderId', 'name email profileImage');
        // Update conversation's last message
        await Conversation_1.default.findByIdAndUpdate(conversationId, {
            lastMessage: {
                content: messageType === 'text' ? content : `Sent a ${messageType}`,
                senderId: req.userId,
                timestamp: message.createdAt,
            },
            updatedAt: new Date(),
        });
        // Emit real-time message via Socket.IO
        (0, socket_1.emitNewMessage)(conversationId, populatedMessage);
        // Notify the other participant
        const otherParticipant = conversation.participants.find((p) => p.toString() !== req.userId);
        if (otherParticipant) {
            const { emitToUser } = require('../config/socket');
            emitToUser(otherParticipant.toString(), 'new:conversation', {
                conversationId,
                lastMessage: {
                    content: messageType === 'text' ? content : `Sent a ${messageType}`,
                    senderId: req.userId,
                    timestamp: message.createdAt,
                },
            });
        }
        res.status(201).json({
            success: true,
            data: { message: populatedMessage },
        });
    }
    catch (error) {
        if (error.name === 'CastError') {
            res.status(400).json({
                success: false,
                message: 'Invalid conversation ID format',
            });
            return;
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((val) => val.message);
            res.status(400).json({
                success: false,
                message: messages.join('. '),
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Server error while sending message',
        });
    }
};
exports.sendMessage = sendMessage;
// @desc    Mark message as read
// @route   PUT /api/messages/:id/read
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const message = await Message_1.default.findById(req.params.id);
        if (!message) {
            res.status(404).json({
                success: false,
                message: 'Message not found',
            });
            return;
        }
        // Add user to readBy if not already there
        if (!message.readBy.includes(req.userId)) {
            message.readBy.push(req.userId);
            await message.save();
        }
        res.status(200).json({
            success: true,
            data: { message },
        });
    }
    catch (error) {
        if (error.name === 'CastError') {
            res.status(400).json({
                success: false,
                message: 'Invalid message ID format',
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Server error while marking message as read',
        });
    }
};
exports.markAsRead = markAsRead;
//# sourceMappingURL=message.controller.js.map