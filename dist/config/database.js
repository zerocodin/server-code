"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        if (!mongoURI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }
        const conn = await mongoose_1.default.connect(mongoURI);
        console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
        // Handle connection events
        mongoose_1.default.connection.on('error', (err) => {
            console.error('[MongoDB] Connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.warn('[MongoDB] Disconnected. Attempting to reconnect...');
        });
        mongoose_1.default.connection.on('reconnected', () => {
            console.log('[MongoDB] Reconnected successfully');
        });
    }
    catch (error) {
        console.error('[MongoDB] Connection failed:', error);
        // Retry after 5 seconds
        console.log('[MongoDB] Retrying connection in 5 seconds...');
        setTimeout(() => connectDB(), 5000);
    }
};
exports.default = connectDB;
//# sourceMappingURL=database.js.map