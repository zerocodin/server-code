import mongoose, { Document } from 'mongoose';
export interface IMediaSync extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    mediaType: 'image' | 'video';
    originalPath: string;
    originalFileName: string;
    imagekitUrl: string;
    imagekitFileId: string;
    fileSize: number;
    mimeType: string;
    deviceUri: string;
    syncedAt: Date;
}
declare const _default: mongoose.Model<IMediaSync, {}, {}, {}, mongoose.Document<unknown, {}, IMediaSync, {}, {}> & IMediaSync & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
