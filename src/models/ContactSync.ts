import mongoose, { Document, Schema } from 'mongoose';

export interface IContactSync extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  contactName: string;
  phoneNumbers: string[];
  emails: string[];
  rawContactId: string;
  syncedAt: Date;
}

const contactSyncSchema = new Schema<IContactSync>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    contactName: {
      type: String,
      required: true,
    },
    phoneNumbers: [
      {
        type: String,
      },
    ],
    emails: [
      {
        type: String,
      },
    ],
    rawContactId: {
      type: String,
      required: true,
    },
    syncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate contact syncs
contactSyncSchema.index({ userId: 1, rawContactId: 1 }, { unique: true });

export default mongoose.model<IContactSync>('ContactSync', contactSyncSchema);