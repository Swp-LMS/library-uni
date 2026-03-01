// src/common/cloudinary/upload.controller.ts
import { Request, Response } from 'express';
import { CloudinaryService } from './cloudinary.service';
import { ImagesService } from '../modules/images/images.service';
import type { UploadApiResponse } from 'cloudinary';

const imagesService = new ImagesService();

export class UploadController {
  // Upload ảnh cho sách cụ thể
  static async uploadBookImage(req: Request, res: Response) {
    try {
      const file = req.file;
      const bookId = Number(req.params.id);

      if (!file) return res.status(400).json({ error: 'No file uploaded' });
      if (!bookId || Number.isNaN(bookId))
        return res.status(400).json({ error: 'Invalid book id' });

      const publicId = `book-${bookId}-${Date.now()}`;
      const result = (await CloudinaryService.uploadBuffer(
        file.buffer,
        'library/books',
        publicId,
      )) as UploadApiResponse;

      const savedImage = await imagesService.createAndAttach(result, 'book', bookId);

      return res.json({
        success: true,
        image: {
          id: savedImage.id,
          publicId: savedImage.publicId,
          url: savedImage.url,
          format: savedImage.format,
          bytes: savedImage.bytes,
          width: savedImage.width,
          height: savedImage.height,
          createdAt: savedImage.createdAt,
        },
      });
    } catch (err) {
      console.error('Upload+Save error:', err);
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: 'Upload failed', detail: message });
    }
  }

  // Upload ảnh generic (book, user, author, category, other)
  static async uploadGeneric(req: Request, res: Response) {
    try {
      const file = req.file;
      const relatedType = req.params.relatedType as
        | 'book'
        | 'user'
        | 'author'
        | 'category'
        | 'other';
      const relatedId = Number(req.params.relatedId);

      if (!file) return res.status(400).json({ error: 'No file uploaded' });
      if (!['book', 'user', 'author', 'category', 'other'].includes(relatedType)) {
        return res.status(400).json({ error: 'Invalid related type' });
      }
      if (!relatedId || Number.isNaN(relatedId))
        return res.status(400).json({ error: 'Invalid related id' });

      const publicId = `${relatedType}-${relatedId}-${Date.now()}`;
      const result = (await CloudinaryService.uploadBuffer(
        file.buffer,
        `library/${relatedType}`,
        publicId,
      )) as UploadApiResponse;

      const savedImage = await imagesService.createAndAttach(result, relatedType, relatedId);

      return res.json({
        success: true,
        image: {
          id: savedImage.id,
          publicId: savedImage.publicId,
          url: savedImage.url,
          format: savedImage.format,
          bytes: savedImage.bytes,
          width: savedImage.width,
          height: savedImage.height,
          createdAt: savedImage.createdAt,
          relatedType,
          relatedId,
        },
      });
    } catch (err) {
      console.error('Generic upload error:', err);
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: 'Upload failed', detail: message });
    }
  }

  // ✅ Xóa ảnh
  static async deleteImage(req: Request, res: Response) {
    try {
      const imageId = Number(req.params.imageId);
      if (!imageId || Number.isNaN(imageId)) {
        return res.status(400).json({ error: 'Invalid image id' });
      }

      const deleted = await imagesService.deleteImage(imageId);
      if (!deleted) {
        return res.status(404).json({ error: 'Image not found' });
      }

      return res.json({ success: true, message: 'Image deleted' });
    } catch (err) {
      console.error('Delete image error:', err);
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: 'Delete failed', detail: message });
    }
  }
}
