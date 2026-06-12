import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
export declare const initializeSocketIO: (httpServer: HttpServer) => SocketIOServer;
export declare const emitNewMessage: (conversationId: string, message: any) => void;
export declare const emitToUser: (userId: string, event: string, data: any) => void;
export declare const getIO: () => SocketIOServer;
