"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromImageKit = exports.uploadToImageKit = void 0;
const imagekit_1 = __importDefault(require("imagekit"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const imagekit = new imagekit_1.default({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
});
const uploadToImageKit = async (filePath, folder, fileName) => {
    try {
        const fileContent = fs_1.default.readFileSync(filePath);
        const result = await imagekit.upload({
            file: fileContent,
            fileName: fileName || `upload-${Date.now()}`,
            folder: `/chatapp/${folder}`,
            useUniqueFileName: true,
        });
        return {
            url: result.url,
            fileId: result.fileId,
        };
    }
    catch (error) {
        console.error('[ImageKit] Upload failed:', error);
        throw new Error('Failed to upload file to ImageKit');
    }
};
exports.uploadToImageKit = uploadToImageKit;
const deleteFromImageKit = async (fileId) => {
    try {
        await imagekit.deleteFile(fileId);
    }
    catch (error) {
        console.error('[ImageKit] Delete failed:', error);
        throw new Error('Failed to delete file from ImageKit');
    }
};
exports.deleteFromImageKit = deleteFromImageKit;
exports.default = imagekit;
//# sourceMappingURL=imagekit.js.map