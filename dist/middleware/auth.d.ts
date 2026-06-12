import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';
export interface AuthRequest extends Request {
    user?: IUser;
    userId?: string;
}
export declare const protect: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
