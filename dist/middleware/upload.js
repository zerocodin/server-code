"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLocalFile = exports.uploadSyncMedia = exports.uploadMessageMedia = exports.uploadAvatar = exports.uploadSingle = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || "uploads";
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Storage configuration
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});
// File filter - allow images and videos
const fileFilter = (_req, file, cb) => {
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
    }
    else {
        cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
};
// Maximum file size: 100MB (from env or default)
const maxSize = parseInt(process.env.MAX_FILE_SIZE || "104857600", 10);
// General upload middleware (single file, any field name)
exports.uploadSingle = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: maxSize,
    },
}).single("file");
// Avatar upload middleware (image only, max 5MB)
exports.uploadAvatar = (0, multer_1.default)({
    storage,
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("Only JPEG, PNG, and WebP images are allowed for avatars"));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
}).single("avatar");
// Message media upload (single file)
exports.uploadMessageMedia = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: maxSize,
    },
}).single("media");
// Sync media upload (multiple files, for background uploads)
exports.uploadSyncMedia = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: maxSize,
        files: 10, // Max 10 files per batch upload
    },
}).array("files", 10);
// Utility: Delete local file after ImageKit upload
const deleteLocalFile = (filePath) => {
    try {
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
    catch (error) {
        console.error(`[Multer] Failed to delete local file: ${filePath}`, error);
    }
};
exports.deleteLocalFile = deleteLocalFile;
exports.default = exports.uploadSingle;
//# sourceMappingURL=upload.js.map