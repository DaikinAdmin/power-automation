import { NextRequest, NextResponse } from 'next/server';
import { getUploadDir } from '@/lib/uploads';
import path from 'path';
import fs from 'fs/promises';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
};

// GET /api/public/uploads/[...path] — serve uploaded images publicly
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const relativePath = segments.join('/');

    // Prevent directory traversal
    if (relativePath.includes('..') || relativePath.includes('\0')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const uploadDir = getUploadDir();
    const filePath = path.join(uploadDir, relativePath);

    // Ensure the resolved path is within the upload directory
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(uploadDir);
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Check file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    const fileBuffer = await fs.readFile(filePath);
    const stat = await fs.stat(filePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Last-Modified': stat.mtime.toUTCString(),
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
