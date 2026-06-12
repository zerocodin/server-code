import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getConversations: (req: AuthRequest, res: Response) => Promise<void>;
export declare const createConversation: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getConversationById: (req: AuthRequest, res: Response) => Promise<void>;
