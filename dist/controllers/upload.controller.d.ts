import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const uploadAvatarController: (req: AuthRequest, res: Response) => Promise<void>;
export declare const uploadMessageMediaController: (req: AuthRequest, res: Response) => Promise<void>;
