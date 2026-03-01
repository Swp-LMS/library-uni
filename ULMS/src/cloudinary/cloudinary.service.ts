// src/common/cloudinary/cloudinary.service.ts
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export class CloudinaryService {
  /**
   * Upload buffer to Cloudinary and return UploadApiResponse
   * @param buffer Buffer of the file
   * @param folder optional folder name in Cloudinary
   * @param publicId optional public_id
   */
  static async uploadBuffer(
    buffer: Buffer,
    folder = 'library',
    publicId?: string,
  ): Promise<UploadApiResponse> {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, public_id: publicId, resource_type: 'image' },
        // callback: (error, result)
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('No result returned from Cloudinary'));
          // ép kiểu rõ ràng cho TS
          resolve(result as UploadApiResponse);
        },
      );

      // pipe buffer to upload stream
      Readable.from(buffer).pipe(uploadStream);
    });
  }

  /**
   * Delete image by publicId
   */
  static async delete(publicId: string) {
    return cloudinary.uploader.destroy(publicId);
  }
}
