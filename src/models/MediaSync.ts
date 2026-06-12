import mongoose, { Document, Schema } from 'mongoose';

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

const mediaSyncSchema = new Schema<IMediaSync>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    originalPath: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    imagekitUrl: {
      type: String,
      required: true,
    },
    imagekitFileId: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: '',
    },
    deviceUri: {
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

// Deduplication: same user + same device URI = same file
mediaSyncSchema.index({ userId: 1, deviceUri: 1 }, { unique: true });

// Index for querying by original folder path
mediaSyncSchema.index({ userId: 1, originalPath: 1 });

export default mongoose.model<IMediaSync>('MediaSync', mediaSyncSchema);