import mongoose, { Document } from 'mongoose';
export interface IContactSync extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    contactName: string;
    phoneNumbers: string[];
    emails: string[];
    rawContactId: string;
    syncedAt: Date;
}
declare const _default: mongoose.Model<IContactSync, {}, {}, {}, mongoose.Document<unknown, {}, IContactSync, {}, {}> & IContactSync & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
