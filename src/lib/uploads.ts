import path from 'path';
import fs from 'fs/promises';

/**
 * Get the base upload directory.
 * In Docker: /app/public/uploads (via UPLOAD_DIR env or default)
 * Locally: public/uploads
 */
export function getUploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Get the full filesystem path for an uploaded image.
 */
export function getImageFilePath(imagePath: string, fileName: string): string {
  return path.join(getUploadDir(), imagePath, fileName);
}

/**
 * Get the public URL path for an image.
 * If IMAGE_SERVICE_URL is set, use it as base. Otherwise use /api/public/uploads.
 */
export function getImagePublicUrl(imagePath: string, fileName: string): string {
  const relativePath = `${imagePath}/${fileName}`.replace(/\/+/g, '/');
  return `/api/public/uploads/${relativePath}`;
}

/**
 * Sanitize a path to prevent directory traversal attacks.
 */
export function sanitizePath(inputPath: string): string {
  // Remove leading/trailing slashes, normalize, prevent traversal
  return inputPath
    .replace(/\.\./g, '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/')
    .replace(/[^a-zA-Z0-9_\-\/]/g, '-');
}

/**
 * Sanitize a filename.
 */
export function sanitizeFileName(name: string): string {
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  const sanitized = base.replace(/[^a-zA-Z0-9_\-]/g, '-').replace(/-+/g, '-');
  return `${sanitized}${ext.toLowerCase()}`;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

export function isAllowedFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}
