import ImageKit from 'imagekit';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
});

export const uploadToImageKit = async (
  filePath: string,
  folder: string,
  fileName?: string
): Promise<{ url: string; fileId: string }> => {
  try {
    const fileContent = fs.readFileSync(filePath);

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
  } catch (error) {
    console.error('[ImageKit] Upload failed:', error);
    throw new Error('Failed to upload file to ImageKit');
  }
};

export const deleteFromImageKit = async (fileId: string): Promise<void> => {
  try {
    await imagekit.deleteFile(fileId);
  } catch (error) {
    console.error('[ImageKit] Delete failed:', error);
    throw new Error('Failed to delete file from ImageKit');
  }
};

export default imagekit;