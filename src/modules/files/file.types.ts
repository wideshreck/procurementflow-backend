export enum FileType {
  DOCUMENT = 'DOCUMENT',
  IMAGE = 'IMAGE',
}

export interface FileUpload {
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
}