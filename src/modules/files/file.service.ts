import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly uploadDir = 'uploads';

  constructor() {
    // Ensure upload directory exists
    this.initializeUploadDirectory();
  }

  private async initializeUploadDirectory() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<{ filePath: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Validate file
      this.validateFile(file);

      // Generate safe filename
      const safeFileName = this.generateSafeFileName(file.originalname);
      const filePath = path.join(this.uploadDir, safeFileName);

      // Save file
      await fs.writeFile(filePath, file.buffer);

      return { filePath: safeFileName };
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`, error.stack);
      throw new BadRequestException(
        error.message || 'File could not be saved'
      );
    }
  }

  private validateFile(file: Express.Multer.File) {
    // Max file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB');
    }

    // Allowed file types
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type');
    }
  }

  private generateSafeFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = path.extname(originalName);
    const safeName = `${timestamp}-${randomString}${extension}`;
    return safeName;
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.uploadDir, filePath);
      await fs.unlink(fullPath);
    } catch (error) {
      this.logger.error(`File deletion failed: ${error.message}`, error.stack);
      // Don't throw on deletion errors, just log them
    }
  }
}