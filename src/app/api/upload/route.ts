import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  generateUploadUrl,
  generateFileKey,
  isValidRawFile,
  RAW_MIME_TYPES,
  getMimeTypeFromExtension,
  shouldUseMultipartUpload,
  createMultipartUpload,
  calculatePartCount,
  generatePartUploadUrl,
  DEFAULT_MULTIPART_CONFIG,
} from '@/lib/s3';
import { db, projects, images, multipartUploads } from '@/db';
import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';
import { withUsageLimits } from '@/lib/usage-limits';
import { validateRawFile, generateProjectName } from '@/lib/raw-metadata';
import { AuditLogger } from '@/lib/audit-logger';
import { detectMimeType } from '@/lib/mime-types';
import { eq } from 'drizzle-orm';

const uploadSchema = z.object({
  filename: z.string().min(1),
  fileSize: z.number().min(1),
  mimeType: z.string().optional(), // Allow empty for RAW files
  projectName: z.string().min(1).optional(),
});

export const POST = withUsageLimits(async (request: NextRequest) => {
  let filename: string | undefined;
  let fileSize: number | undefined;
  let userId: string | undefined;
  let projectId: string | undefined;

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    userId = session.user.id;

    const body = await request.json();
    const validated = uploadSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validated.error },
        { status: 400 }
      );
    }

    filename = validated.data.filename;
    fileSize = validated.data.fileSize;
    const { mimeType, projectName } = validated.data;

    // Use enhanced MIME type detection with server-side sniffing capability
    const finalMimeType = detectMimeType(filename, undefined, mimeType);

    // Validate file type (RAW only)
    if (!finalMimeType || !isValidRawFile(finalMimeType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only RAW files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (100MB max)
    if (fileSize > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB.' },
        { status: 400 }
      );
    }

    // Check if multipart upload is needed (for large files > 10MB)
    const useMultipart = shouldUseMultipartUpload(fileSize);

    // Generate project ID
    projectId = uuidv7();

    // Validate RAW file
    try {
      const validation = validateRawFile(filename, finalMimeType);
      if (!validation.isValid) {
        console.warn('RAW file validation warnings:', validation.errors);
      }
    } catch (error) {
      console.error('RAW file validation failed:', error);
    }

    // Generate project name from provided name or use a default
    const projectFinalName = projectName || `Project ${new Date().toLocaleDateString()}`;

    // Create project in database
    await db.insert(projects).values({
      id: projectId,
      userId: userId!,
      name: projectFinalName,
      status: 'pending',
    });

    // Handle multipart upload for large files
    if (useMultipart) {
      return await handleMultipartUpload(
        userId!,
        projectId!,
        filename!,
        finalMimeType,
        fileSize,
        request
      );
    }

    // Handle single-part upload for smaller files
    return await handleSinglePartUpload(
      userId!,
      projectId!,
      filename!,
      finalMimeType,
      fileSize,
      request
    );
  } catch (error) {
    console.error('Upload error:', error);
    
    // Log failed upload
    try {
      await AuditLogger.logFailure(
        'file_upload',
        'image',
        error instanceof Error ? error.message : String(error),
        userId,
        projectId,
        {
          filename,
          fileSize
        },
        request
      );
    } catch (logError) {
      console.error('Failed to log upload error:', logError);
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * Handle single-part upload (backward compatibility)
 * Note: This only initializes the upload. Metadata extraction happens after upload completes.
 */
async function handleSinglePartUpload(
  userId: string,
  projectId: string,
  filename: string,
  mimeType: string,
  fileSize: number,
  request: NextRequest
): Promise<NextResponse> {
  // Generate file keys
  const originalKey = generateFileKey(userId, projectId, filename, 'original');
  const thumbnailKey = generateFileKey(userId, projectId, `thumb_${filename}`, 'thumbnail');

  // Create image records (metadata will be populated after upload)
  await db.insert(images).values([
    {
      id: uuidv7(),
      projectId,
      type: 'original',
      storageKey: originalKey,
      filename,
      sizeBytes: fileSize,
      mimeType,
    },
    {
      id: uuidv7(),
      projectId,
      type: 'thumbnail',
      storageKey: thumbnailKey,
      filename: `thumb_${filename}`,
      sizeBytes: 0, // Will be updated after processing
      mimeType: 'image/jpeg',
    },
  ]);

  // Generate signed URLs for upload
  const uploadUrl = await generateUploadUrl(originalKey, mimeType);
  const thumbnailUploadUrl = await generateUploadUrl(thumbnailKey, 'image/jpeg');

  // Add usage limits info to response
  const usageLimits = (request as any).usageLimits || {};

  // Log successful upload initialization
  await AuditLogger.logSuccess(
    'file_upload_init',
    'image',
    userId,
    projectId,
    {
      filename,
      fileSize,
      mimeType,
      uploadType: 'single-part',
      usageLimits
    },
    request
  );

  return NextResponse.json({
    success: true,
    projectId,
    uploadType: 'single-part',
    uploadUrl,
    thumbnailUploadUrl,
    fileKey: originalKey,
    thumbnailKey,
    fileExtension: RAW_MIME_TYPES[mimeType as keyof typeof RAW_MIME_TYPES],
    usage: usageLimits,
  });
}

/**
 * Handle multipart upload initialization for large files
 */
async function handleMultipartUpload(
  userId: string,
  projectId: string,
  filename: string,
  mimeType: string,
  fileSize: number,
  request: NextRequest
): Promise<NextResponse> {
  // Generate file key
  const originalKey = generateFileKey(userId, projectId, filename, 'original');

  // Create multipart upload on S3
  const { uploadId } = await createMultipartUpload(originalKey, mimeType);

  // Calculate number of parts
  const totalParts = calculatePartCount(fileSize, DEFAULT_MULTIPART_CONFIG);
  const chunkSize = DEFAULT_MULTIPART_CONFIG.chunkSize;

  // Store multipart upload metadata in database
  await db.insert(multipartUploads).values({
    id: uuidv7(),
    uploadId,
    projectId,
    userId,
    filename,
    fileSize,
    mimeType,
    storageKey: originalKey,
    totalParts,
    uploadedParts: 0,
    status: 'initiated',
  });

  // Generate presigned URLs for each part
  const partUrls: Array<{ partNumber: number; url: string }> = [];
  for (let i = 1; i <= totalParts; i++) {
    const url = await generatePartUploadUrl(originalKey, uploadId, i);
    partUrls.push({ partNumber: i, url });
  }

  // Add usage limits info to response
  const usageLimits = (request as any).usageLimits || {};

  // Log successful multipart upload initialization
  await AuditLogger.logSuccess(
    'multipart_upload_init',
    'image',
    userId,
    projectId,
    {
      filename,
      fileSize,
      mimeType,
      uploadId,
      totalParts,
      chunkSize,
      uploadType: 'multipart',
      usageLimits
    },
    request
  );

  return NextResponse.json({
    success: true,
    projectId,
    uploadType: 'multipart',
    uploadId,
    fileKey: originalKey,
    totalParts,
    chunkSize,
    partUrls,
    usage: usageLimits,
  });
}
