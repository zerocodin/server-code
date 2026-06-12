"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.emitToUser = exports.emitNewMessage = exports.initializeSocketIO = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
let io;
const initializeSocketIO = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });
    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication token is required'));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback_secret');
            socket.userId = decoded.userId;
            next();
        }
        catch (error) {
            next(new Error('Invalid authentication token'));
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.userId;
        console.log(`[Socket.IO] User connected: ${userId}`);
        // Join personal room for direct messages
        if (userId) {
            socket.join(`user:${userId}`);
        }
        // Handle user online status
        socket.broadcast.emit('user:status', {
            userId,
            status: 'online',
        });
        // Handle joining conversation rooms
        socket.on('conversation:join', (conversationId) => {
            socket.join(`conversation:${conversationId}`);
            console.log(`[Socket.IO] User ${userId} joined conversation ${conversationId}`);
        });
        // Handle leaving conversation rooms
        socket.on('conversation:leave', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
        });
        // Handle typing indicator
        socket.on('message:typing', (data) => {
            socket.to(`conversation:${data.conversationId}`).emit('message:typing', {
                userId,
                conversationId: data.conversationId,
                isTyping: data.isTyping,
            });
        });
        // Handle read receipts
        socket.on('message:read', (data) => {
            socket.to(`conversation:${data.conversationId}`).emit('message:read', {
                messageId: data.messageId,
                readBy: userId,
            });
        });
        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`[Socket.IO] User disconnected: ${userId}`);
            socket.broadcast.emit('user:status', {
                userId,
                status: 'offline',
            });
        });
    });
    return io;
};
exports.initializeSocketIO = initializeSocketIO;
// Helper to emit a new message to a conversation room
const emitNewMessage = (conversationId, message) => {
    if (io) {
        io.to(`conversation:${conversationId}`).emit('message:received', message);
    }
};
exports.emitNewMessage = emitNewMessage;
// Helper to emit to specific user
const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};
exports.emitToUser = emitToUser;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO has not been initialized');
    }
    return io;
};
exports.getIO = getIO;
//# sourceMappingURL=socket.js.map