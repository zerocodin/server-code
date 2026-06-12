"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversationById = exports.createConversation = exports.getConversations = void 0;
const Conversation_1 = __importDefault(require("../models/Conversation"));
// @desc    Get all conversations for current user
// @route   GET /api/conversations
// @access  Private
const getConversations = async (req, res) => {
    try {
        const conversations = await Conversation_1.default.find({
            participants: req.userId,
        })
            .populate('participants', 'name email profileImage status lastSeen')
            .sort({ updatedAt: -1 });
        res.status(200).json({
            success: true,
            count: conversations.length,
            data: { conversations },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error while fetching conversations',
        });
    }
};
exports.getConversations = getConversations;
// @desc    Create a new conversation (or return existing one)
// @route   POST /api/conversations
// @access  Private
const createConversation = async (req, res) => {
    try {
        const { participantId } = req.body;
        if (!participantId) {
            res.status(400).json({
                success: false,
                message: 'Participant ID is required',
            });
            return;
        }
        // Can't create conversation with yourself
        if (participantId === req.userId) {
            res.status(400).json({
                success: false,
                message: 'Cannot create a conversation with yourself',
            });
            return;
        }
        // Check if conversation already exists between these two users
        const existingConversation = await Conversation_1.default.findOne({
            participants: {
                $all: [req.userId, participantId],
                $size: 2,
            },
        }).populate('participants', 'name email profileImage status lastSeen');
        if (existingConversation) {
            res.status(200).json({
                success: true,
                message: 'Conversation already exists',
                data: { conversation: existingConversation },
            });
            return;
        }
        // Create new conversation
        const conversation = await Conversation_1.default.create({
            participants: [req.userId, participantId],
        });
        const populatedConversation = await conversation.populate('participants', 'name email profileImage status lastSeen');
        res.status(201).json({
            success: true,
            message: 'Conversation created',
            data: { conversation: populatedConversation },
        });
    }
    catch (error) {
        if (error.name === 'CastError') {
            res.status(400).json({
                success: false,
                message: 'Invalid participant ID format',
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Server error while creating conversation',
        });
    }
};
exports.createConversation = createConversation;
// @desc    Get conversation by ID
// @route   GET /api/conversations/:id
// @access  Private
const getConversationById = async (req, res) => {
    try {
        const conversation = await Conversation_1.default.findById(req.params.id)
            .populate('participants', 'name email profileImage status lastSeen');
        if (!conversation) {
            res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
            return;
        }
        // Check if user is a participant
        const isParticipant = conversation.participants.some((p) => p._id.toString() === req.userId);
        if (!isParticipant) {
            res.status(403).json({
                success: false,
                message: 'You are not a participant in this conversation',
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: { conversation },
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
            message: 'Server error while fetching conversation',
        });
    }
};
exports.getConversationById = getConversationById;
//# sourceMappingURL=conversation.controller.js.map