import multer, { FileFilterCallback } from "multer";
import path from "path";
import { Request } from "express";
import fs from "fs";

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ) => {
    cb(null, uploadDir);
  },
  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter - allow images and videos
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void => {
  const allowedImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  const allowedVideoTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/3gpp",
  ];
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

// Maximum file size: 100MB (from env or default)
const maxSize = parseInt(process.env.MAX_FILE_SIZE || "104857600", 10);

// General upload middleware (single file, any field name)
export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSize,
  },
}).single("file");

// Avatar upload middleware (image only, max 5MB)
export const uploadAvatar = multer({
  storage,
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ): void => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed for avatars"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single("avatar");

// Message media upload (single file)
export const uploadMessageMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSize,
  },
}).single("media");

// Sync media upload (multiple files, for background uploads)
export const uploadSyncMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSize,
    files: 10, // Max 10 files per batch upload
  },
}).array("files", 10);

// Utility: Delete local file after ImageKit upload
export const deleteLocalFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`[Multer] Failed to delete local file: ${filePath}`, error);
  }
};

export default uploadSingle;
