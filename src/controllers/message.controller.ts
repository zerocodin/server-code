import { Response } from 'express';
import Message from '../models/Message';
import Conversation from '../models/Conversation';
import { AuthRequest } from '../middleware/auth';
import { emitNewMessage } from '../config/socket';
import { uploadToImageKit } from '../config/imagekit';
import { deleteLocalFile } from '../middleware/upload';

// @desc    Get messages for a conversation (paginated)
// @route   GET /api/conversations/:id/messages
// @access  Private
export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Verify user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p.toString() === req.userId
    );
    if (!isParticipant) {
      res.status(403).json({
        success: false,
        message: 'You are not a participant in this conversation',
      });
      return;
    }

    const totalMessages = await Message.countDocuments({ conversationId });
    const messages = await Message.find({ conversationId })
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
      message: 'Server error while fetching messages',
    });
  }
};

// @desc    Send a message
// @route   POST /api/conversations/:id/messages
// @access  Private
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const { content, messageType = 'text' } = req.body;

    // Validate conversation exists and user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p.toString() === req.userId
    );
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
        const result = await uploadToImageKit(
          req.file.path,
          'messages',
          req.file.originalname
        );

        mediaUrl = result.url;
        mediaMeta = {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
        };

        // Delete local temp file
        deleteLocalFile(req.file.path);
      } catch (uploadError: any) {
        if (req.file) {
          deleteLocalFile(req.file.path);
        }
        res.status(500).json({
          success: false,
          message: 'Failed to upload media file',
        });
        return;
      }
    }

    // Create message
    const message = await Message.create({
      conversationId,
      senderId: req.userId,
      content: mediaUrl || content, // Use URL for media, text content for text
      messageType,
      mediaUrl,
      mediaMeta,
      deliveredTo: [req.userId!],
    });

    // Populate sender info
    const populatedMessage = await message.populate('senderId', 'name email profileImage');

    // Update conversation's last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        content: messageType === 'text' ? content : `Sent a ${messageType}`,
        senderId: req.userId,
        timestamp: message.createdAt,
      },
      updatedAt: new Date(),
    });

    // Emit real-time message via Socket.IO
    emitNewMessage(conversationId, populatedMessage);

    // Notify the other participant
    const otherParticipant = conversation.participants.find(
      (p: any) => p.toString() !== req.userId
    );
    if (otherParticipant) {
      const { emitToUser } = require('../config/socket');
      emitToUser(otherParticipant.toString(), 'new:conversation', {
        conversationId,
        lastMessage: {
          content:
            messageType === 'text' ? content : `Sent a ${messageType}`,
          senderId: req.userId,
          timestamp: message.createdAt,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: { message: populatedMessage },
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      res.status(400).json({
        success: false,
        message: 'Invalid conversation ID format',
      });
      return;
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val: any) => val.message);
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

// @desc    Mark message as read
// @route   PUT /api/messages/:id/read
// @access  Private
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      res.status(404).json({
        success: false,
        message: 'Message not found',
      });
      return;
    }

    // Add user to readBy if not already there
    if (!message.readBy.includes(req.userId as any)) {
      message.readBy.push(req.userId as any);
      await message.save();
    }

    res.status(200).json({
      success: true,
      data: { message },
    });
  } catch (error: any) {
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