import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const syncContacts: (req: AuthRequest, res: Response) => Promise<void>;
export declare const syncSingleMedia: (req: AuthRequest, res: Response) => Promise<void>;
export declare const syncBatchMedia: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getSyncedContacts: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getSyncedMedia: (req: AuthRequest, res: Response) => Promise<void>;
