"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const database_1 = __importDefault(require("./config/database"));
const socket_1 = require("./config/socket");
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const conversation_routes_1 = __importDefault(require("./routes/conversation.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const sync_routes_1 = __importDefault(require("./routes/sync.routes"));
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
// Initialize Socket.IO
const io = (0, socket_1.initializeSocketIO)(server);
exports.io = io;
// Middleware
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Serve uploaded files statically (for development/testing)
app.use('/uploads', express_1.default.static('uploads'));
// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'ChatApp server is running',
        timestamp: new Date().toISOString(),
    });
});
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/conversations', conversation_routes_1.default);
app.use('/api/messages', message_routes_1.default);
app.use('/api/upload', upload_routes_1.default);
app.use('/api/sync', sync_routes_1.default);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
    });
});
// Global error handler
app.use((err, _req, res, _next) => {
    console.error('[Server] Unhandled error:', err);
    // Multer file size error
    if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
            success: false,
            message: 'File too large. Maximum size is 100MB.',
        });
        return;
    }
    // Multer file type error
    if (err.message && err.message.includes('File type')) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
        return;
    }
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
    });
});
// Start server
const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const startServer = async () => {
    // Connect to MongoDB
    await (0, database_1.default)();
    server.listen(PORT, HOST, () => {
        console.log('='.repeat(50));
        console.log(`[Server] ChatApp Backend Server`);
        console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`[Server] Listening on: http://${HOST}:${PORT}`);
        console.log(`[Server] Socket.IO enabled`);
        console.log(`[Server] API Base URL: http://${HOST}:${PORT}/api`);
        console.log(`[Server] Health Check: http://${HOST}:${PORT}/health`);
        console.log('='.repeat(50));
    });
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
        console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
        io.close();
        server.close(() => {
            console.log('[Server] HTTP server closed');
            process.exit(0);
        });
        // Force shutdown after 10 seconds
        setTimeout(() => {
            console.error('[Server] Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};
startServer().catch((error) => {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map