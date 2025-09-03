import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadDir = join(process.cwd(), 'uploads');
  private readonly baseUrl = process.env.API_URL || 'http://localhost:3000';

  constructor() {
    this.initializeUploadDirectory();
  }

  private async initializeUploadDirectory() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<{ fileUrl: string, filePath: string }> {
    try {
      // Validate file exists
      if (!file) {
        throw new BadRequestException('No file provided');
      }

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new BadRequestException('File size too large');
      }

      // Validate file type
      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException('Invalid file type');
      }

      // Generate safe filename
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = join(this.uploadDir, fileName);

      // Save file
      await fs.writeFile(filePath, file.buffer);

      return {
        fileUrl: `${this.baseUrl}/uploads/${fileName}`,
        filePath: fileName
      };
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`, error.stack);
      throw new BadRequestException('File could not be saved');
    }
  }

  async getFile(fileName: string): Promise<Buffer> {
    try {
      const filePath = join(this.uploadDir, fileName);
      return await fs.readFile(filePath);
    } catch (error) {
      this.logger.error(`File read failed: ${error.message}`, error.stack);
      throw new BadRequestException('File not found');
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      const filePath = join(this.uploadDir, fileName);
      await fs.unlink(filePath);
    } catch (error) {
      this.logger.error(`File deletion failed: ${error.message}`, error.stack);
      throw new BadRequestException('File could not be deleted');
    }
  }
}
