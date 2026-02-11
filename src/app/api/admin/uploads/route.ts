import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { desc, eq, like, sql, asc } from 'drizzle-orm';
import { isUserAdmin } from '@/helpers/db/queries';
import {
  getUploadDir,
  ensureDir,
  sanitizePath,
  sanitizeFileName,
  isAllowedMimeType,
  isAllowedFileSize,
  getImagePublicUrl,
} from '@/lib/uploads';
import path from 'path';
import fs from 'fs/promises';

// GET /api/admin/uploads — list all uploaded images
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const admin = await isUserAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const pathFilter = searchParams.get('path') || '';
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(like(schema.uploadedImage.fileName, `%${search}%`));
    }
    if (pathFilter) {
      conditions.push(like(schema.uploadedImage.path, `%${pathFilter}%`));
    }

    const whereClause = conditions.length > 0
      ? sql`${conditions.map((c, i) => i === 0 ? c : sql` AND ${c}`).reduce((a, b) => sql`${a}${b}`)}`
      : undefined;

    let query = db.select().from(schema.uploadedImage);
    
    if (search && pathFilter) {
      query = query.where(sql`${like(schema.uploadedImage.fileName, `%${search}%`)} AND ${like(schema.uploadedImage.path, `%${pathFilter}%`)}`) as any;
    } else if (search) {
      query = query.where(like(schema.uploadedImage.fileName, `%${search}%`)) as any;
    } else if (pathFilter) {
      query = query.where(like(schema.uploadedImage.path, `%${pathFilter}%`)) as any;
    }

    const images = await (query as any)
      .orderBy(desc(schema.uploadedImage.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(schema.uploadedImage);
    if (search && pathFilter) {
      countQuery = countQuery.where(sql`${like(schema.uploadedImage.fileName, `%${search}%`)} AND ${like(schema.uploadedImage.path, `%${pathFilter}%`)}`) as any;
    } else if (search) {
      countQuery = countQuery.where(like(schema.uploadedImage.fileName, `%${search}%`)) as any;
    } else if (pathFilter) {
      countQuery = countQuery.where(like(schema.uploadedImage.path, `%${pathFilter}%`)) as any;
    }
    const [{ count: total }] = await countQuery;

    // Add public URLs to response
    const imagesWithUrls = images.map((img: schema.UploadedImage) => ({
      ...img,
      url: getImagePublicUrl(img.path, img.fileName),
    }));

    return NextResponse.json({
      images: imagesWithUrls,
      pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    });
  } catch (error) {
    console.error('Error fetching uploads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/uploads — upload a new image
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const admin = await isUserAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const customPath = formData.get('path') as string || '';
    const customFileName = formData.get('fileName') as string || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed. Allowed: jpeg, png, gif, webp, svg, avif` },
        { status: 400 }
      );
    }

    if (!isAllowedFileSize(file.size)) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    const sanitizedPath = sanitizePath(customPath);
    const finalFileName = customFileName
      ? sanitizeFileName(customFileName.includes('.') ? customFileName : `${customFileName}${path.extname(file.name)}`)
      : sanitizeFileName(file.name);

    // Write file to disk
    const uploadDir = getUploadDir();
    const targetDir = path.join(uploadDir, sanitizedPath);
    await ensureDir(targetDir);

    const filePath = path.join(targetDir, finalFileName);

    // Check if file already exists
    try {
      await fs.access(filePath);
      return NextResponse.json(
        { error: `File "${finalFileName}" already exists at path "${sanitizedPath}". Use a different name.` },
        { status: 409 }
      );
    } catch {
      // File doesn't exist - good
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Save to database
    const now = new Date().toISOString();
    const [newImage] = await db.insert(schema.uploadedImage).values({
      fileName: finalFileName,
      originalName: file.name,
      path: sanitizedPath || '/',
      mimeType: file.type,
      size: file.size,
      uploadedBy: session.user.id,
      updatedAt: now,
    }).returning();

    return NextResponse.json({
      ...newImage,
      url: getImagePublicUrl(newImage.path, newImage.fileName),
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
