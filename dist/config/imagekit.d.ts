import ImageKit from 'imagekit';
declare const imagekit: ImageKit;
export declare const uploadToImageKit: (filePath: string, folder: string, fileName?: string) => Promise<{
    url: string;
    fileId: string;
}>;
export declare const deleteFromImageKit: (fileId: string) => Promise<void>;
export default imagekit;
