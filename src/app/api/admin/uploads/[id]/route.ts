import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isUserAdmin } from '@/helpers/db/queries';
import {
  getUploadDir,
  ensureDir,
  sanitizePath,
  sanitizeFileName,
  getImagePublicUrl,
} from '@/lib/uploads';
import path from 'path';
import fs from 'fs/promises';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/uploads/[id] — get a single upload details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const admin = await isUserAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const [image] = await db
      .select()
      .from(schema.uploadedImage)
      .where(eq(schema.uploadedImage.id, id))
      .limit(1);

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...image,
      url: getImagePublicUrl(image.path, image.fileName),
    });
  } catch (error) {
    console.error('Error fetching upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/uploads/[id] — update fileName and/or path (moves file on disk)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const admin = await isUserAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { fileName, path: newPath } = body;

    const [existing] = await db
      .select()
      .from(schema.uploadedImage)
      .where(eq(schema.uploadedImage.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const uploadDir = getUploadDir();
    const oldFilePath = path.join(uploadDir, existing.path, existing.fileName);

    const updatedFileName = fileName
      ? sanitizeFileName(fileName.includes('.') ? fileName : `${fileName}${path.extname(existing.fileName)}`)
      : existing.fileName;
    const updatedPath = newPath !== undefined ? sanitizePath(newPath) || '/' : existing.path;

    const newFilePath = path.join(uploadDir, updatedPath, updatedFileName);

    // If file location changed, move it
    if (oldFilePath !== newFilePath) {
      // Ensure target directory exists
      await ensureDir(path.join(uploadDir, updatedPath));

      // Check for conflict
      try {
        await fs.access(newFilePath);
        return NextResponse.json(
          { error: `File "${updatedFileName}" already exists at path "${updatedPath}"` },
          { status: 409 }
        );
      } catch {
        // Good, doesn't exist
      }

      // Move the file
      try {
        await fs.rename(oldFilePath, newFilePath);
      } catch {
        // If rename fails across devices, copy + delete
        await fs.copyFile(oldFilePath, newFilePath);
        await fs.unlink(oldFilePath);
      }

      // Clean up empty old directory
      try {
        const oldDir = path.join(uploadDir, existing.path);
        const files = await fs.readdir(oldDir);
        if (files.length === 0) {
          await fs.rmdir(oldDir);
        }
      } catch {
        // Ignore cleanup errors
      }
    }

    const now = new Date().toISOString();
    const [updated] = await db
      .update(schema.uploadedImage)
      .set({
        fileName: updatedFileName,
        path: updatedPath,
        updatedAt: now,
      })
      .where(eq(schema.uploadedImage.id, id))
      .returning();

    return NextResponse.json({
      ...updated,
      url: getImagePublicUrl(updated.path, updated.fileName),
    });
  } catch (error) {
    console.error('Error updating upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/uploads/[id] — delete an uploaded image
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const admin = await isUserAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const [image] = await db
      .select()
      .from(schema.uploadedImage)
      .where(eq(schema.uploadedImage.id, id))
      .limit(1);

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete file from disk
    const uploadDir = getUploadDir();
    const filePath = path.join(uploadDir, image.path, image.fileName);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('Could not delete file from disk:', filePath, error);
    }

    // Try to clean up empty directory
    try {
      const dir = path.join(uploadDir, image.path);
      const files = await fs.readdir(dir);
      if (files.length === 0) {
        await fs.rmdir(dir);
      }
    } catch {
      // Ignore cleanup errors
    }

    // Delete from database
    await db.delete(schema.uploadedImage).where(eq(schema.uploadedImage.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
