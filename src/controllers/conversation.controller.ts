import { Response } from 'express';
import Conversation from '../models/Conversation';
import { AuthRequest } from '../middleware/auth';

// @desc    Get all conversations for current user
// @route   GET /api/conversations
// @access  Private
export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId,
    })
      .populate('participants', 'name email profileImage status lastSeen')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: { conversations },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching conversations',
    });
  }
};

// @desc    Create a new conversation (or return existing one)
// @route   POST /api/conversations
// @access  Private
export const createConversation = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const existingConversation = await Conversation.findOne({
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
    const conversation = await Conversation.create({
      participants: [req.userId, participantId],
    });

    const populatedConversation = await conversation.populate(
      'participants',
      'name email profileImage status lastSeen'
    );

    res.status(201).json({
      success: true,
      message: 'Conversation created',
      data: { conversation: populatedConversation },
    });
  } catch (error: any) {
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

// @desc    Get conversation by ID
// @route   GET /api/conversations/:id
// @access  Private
export const getConversationById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'name email profileImage status lastSeen');

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      (p: any) => p._id.toString() === req.userId
    );

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
  } catch (error: any) {
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