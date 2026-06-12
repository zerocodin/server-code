import mongoose, { Document } from 'mongoose';
export type MessageType = 'text' | 'image' | 'video' | 'file';
export interface IMediaMeta {
    fileName: string;
    fileSize: number;
    mimeType: string;
}
export interface IMessage extends Document {
    _id: mongoose.Types.ObjectId;
    conversationId: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    content: string;
    messageType: MessageType;
    mediaUrl: string;
    mediaMeta: IMediaMeta;
    readBy: mongoose.Types.ObjectId[];
    deliveredTo: mongoose.Types.ObjectId[];
    createdAt: Date;
}
declare const _default: mongoose.Model<IMessage, {}, {}, {}, mongoose.Document<unknown, {}, IMessage, {}, {}> & IMessage & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
