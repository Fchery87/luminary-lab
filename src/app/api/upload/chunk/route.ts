import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  uploadPart,
  listParts,
  completeMultipartUpload,
  abortMultipartUpload,
} from '@/lib/s3';
import {
  db,
  multipartUploads,
  uploadParts,
  images,
  tags,
  projectTags,
  projects,
} from '@/db';
import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';
import { withUsageLimits } from '@/lib/usage-limits';
import { AuditLogger } from '@/lib/audit-logger';
import {
  extractTagsFromMetadata,
  formatMetadataForDisplay,
  generateProjectName,
  extractMetadataFromS3,
} from '@/lib/raw-metadata';
import { detectMimeType } from '@/lib/mime-types';
import { eq, and } from 'drizzle-orm';
import { generateAndSaveThumbnails } from '@/lib/thumbnail-generator';

// Schema for registering a part upload
const registerPartSchema = z.object({
  uploadId: z.string().min(1),
  partNumber: z.number().int().min(1),
  etag: z.string().min(1),
  sizeBytes: z.number().int().min(1),
});

// Schema for completing multipart upload
const completeUploadSchema = z.object({
  uploadId: z.string().min(1),
  projectId: z.string().min(1),
  filename: z.string().min(1),
  fileSize: z.number().int().min(1),
  mimeType: z.string().optional(),
});

// Schema for getting upload progress
const progressSchema = z.object({
  uploadId: z.string().min(1),
});

// Schema for aborting upload
const abortUploadSchema = z.object({
  uploadId: z.string().min(1),
});

export const POST = withUsageLimits(async (request: NextRequest) => {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'register') {
      return await handlePartRegistration(body, userId, request);
    } else if (action === 'complete') {
      return await handleUploadCompletion(body, userId, request);
    } else if (action === 'progress') {
      return await handleGetProgress(body, userId);
    } else if (action === 'abort') {
      return await handleUploadAbort(body, userId, request);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Chunk upload error:', error);

    // Log failed chunk upload
    try {
      await AuditLogger.logFailure(
        'chunk_upload',
        'image',
        error instanceof Error ? error.message : String(error),
        userId,
        undefined,
        {},
        request
      );
    } catch (logError) {
      console.error('Failed to log chunk upload error:', logError);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * Handle part registration after client uploads part to S3
 */
async function handlePartRegistration(
  body: any,
  userId: string,
  request: NextRequest
): Promise<NextResponse> {
  const validated = registerPartSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: 'Invalid part data', details: validated.error },
      { status: 400 }
    );
  }

  const { uploadId, partNumber, etag, sizeBytes } = validated.data;

  // Verify upload exists and belongs to user
  const [upload] = await db
    .select()
    .from(multipartUploads)
    .where(
      and(
        eq(multipartUploads.uploadId, uploadId),
        eq(multipartUploads.userId, userId)
      )
    );

  if (!upload) {
    return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
  }

  // Store part info in database
  await db.insert(uploadParts).values({
    id: uuidv7(),
    uploadId,
    projectId: upload.projectId,
    partNumber,
    partEtag: etag,
    sizeBytes,
    status: 'uploaded',
  });

  // Update uploaded parts count
  const [existingUpload] = await db
    .select()
    .from(multipartUploads)
    .where(eq(multipartUploads.uploadId, uploadId));

  if (existingUpload) {
    await db
      .update(multipartUploads)
      .set({
        uploadedParts: (existingUpload.uploadedParts || 0) + 1,
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(multipartUploads.uploadId, uploadId));
  }

  // Log part upload
  await AuditLogger.logSuccess(
    'chunk_upload_part',
    'image',
    userId,
    upload.projectId,
    {
      uploadId,
      partNumber,
      sizeBytes,
      etag,
    },
    request
  );

  return NextResponse.json({
    success: true,
    message: 'Part registered successfully',
    uploadedParts: (existingUpload?.uploadedParts || 0) + 1,
    totalParts: upload.totalParts,
    progress: Math.round(
      (((existingUpload?.uploadedParts || 0) + 1) / upload.totalParts) * 100
    ),
  });
}

/**
 * Handle completion of multipart upload
 */
async function handleUploadCompletion(
  body: any,
  userId: string,
  request: NextRequest
): Promise<NextResponse> {
  const validated = completeUploadSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: 'Invalid completion data', details: validated.error },
      { status: 400 }
    );
  }

  const { uploadId, projectId, filename, fileSize, mimeType } = validated.data;

  // Verify upload exists and belongs to user
  const [upload] = await db
    .select()
    .from(multipartUploads)
    .where(
      and(
        eq(multipartUploads.uploadId, uploadId),
        eq(multipartUploads.userId, userId)
      )
    );

  if (!upload) {
    return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
  }

  // Get all uploaded parts from database
  const parts = await db
    .select()
    .from(uploadParts)
    .where(eq(uploadParts.uploadId, uploadId));

  if (parts.length !== upload.totalParts) {
    return NextResponse.json(
      {
        error: 'Not all parts uploaded',
        uploadedParts: parts.length,
        totalParts: upload.totalParts,
      },
      { status: 400 }
    );
  }

  // Complete multipart upload on S3
  const partsArray = parts
    .sort((a, b) => a.partNumber - b.partNumber)
    .map((p) => ({
      partNumber: p.partNumber,
      etag: p.partEtag!,
    }));

  console.log('[Multipart Completion] Starting multipart upload completion:', {
    uploadId,
    storageKey: upload.storageKey,
    totalParts: partsArray.length,
    parts: partsArray.map((p) => ({ partNumber: p.partNumber, etag: p.etag })),
  });

  try {
    const result = await completeMultipartUpload(
      upload.storageKey,
      uploadId,
      partsArray
    );
    console.log('[Multipart Completion] Successfully completed:', {
      uploadId,
      storageKey: upload.storageKey,
      location: result.location,
      etag: result.etag,
    });
  } catch (s3Error) {
    const error = s3Error as any;
    console.error(
      '[Multipart Completion] FAILED - S3 completeMultipartUpload failed:',
      {
        error,
        message: error.message,
        code: error.Code,
        statusCode: error.$metadata?.httpStatusCode,
        requestId: error.$metadata?.requestId,
        uploadId,
        storageKey: upload.storageKey,
        partsProvided: partsArray.length,
      }
    );

    const statusCode = error.$metadata?.httpStatusCode;
    const errorMessage =
      statusCode === 400
        ? 'Invalid part data or ETags. Ensure all parts uploaded successfully.'
        : statusCode === 404
        ? 'Upload not found or expired. Please try again.'
        : error.message || 'Failed to complete upload on storage';

    return NextResponse.json(
      { error: errorMessage, details: error.message },
      { status: 500 }
    );
  }

  // Update multipart upload status
  await db
    .update(multipartUploads)
    .set({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(multipartUploads.uploadId, uploadId));

  // Use enhanced MIME type detection
  const finalMimeType = detectMimeType(filename, undefined, mimeType);

  // Create image record for original file (metadata will be updated after extraction)
  const originalKey = upload.storageKey;
  await db.insert(images).values({
    id: uuidv7(),
    projectId,
    type: 'original',
    storageKey: originalKey,
    filename,
    sizeBytes: fileSize,
    mimeType: finalMimeType,
  });

  // Generate thumbnails server-side
  try {
    await generateAndSaveThumbnails(
      projectId,
      originalKey,
      finalMimeType,
      userId
    );
  } catch (thumbnailError) {
    console.error('Thumbnail generation failed:', thumbnailError);
    // Don't fail the upload if thumbnail generation fails
  }

  // Extract real metadata from the uploaded file
  let metadata = null;
  try {
    metadata = await extractMetadataFromS3(
      originalKey,
      filename,
      finalMimeType
    );
    console.log('Extracted metadata for', filename, ':', metadata);

    // Update image record with extracted metadata
    if (metadata) {
      await db
        .update(images)
        .set({
          width: metadata.width,
          height: metadata.height,
          metadata: metadata,
        })
        .where(eq(images.projectId, projectId));

      // Update project name if it's still a default name
      const [existingProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId));

      if (existingProject && existingProject.name.startsWith('Project ')) {
        const autoGeneratedName = generateProjectName(metadata);
        await db
          .update(projects)
          .set({ name: autoGeneratedName })
          .where(eq(projects.id, projectId));
      }
    }
  } catch (metadataError) {
    console.error('Metadata extraction failed:', metadataError);
    // Don't fail the upload if metadata extraction fails
  }

  // Extract and store tags from metadata
  if (metadata) {
    const extractedTags = extractTagsFromMetadata(metadata);
    for (const tag of extractedTags) {
      const existingTags = await db
        .select()
        .from(tags)
        .where(eq(tags.userId, userId));

      let tagId: string | undefined;
      const existingTag = existingTags.find(
        (t) => t.name === tag.name && t.type === tag.type
      );

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        const [newTag] = await db
          .insert(tags)
          .values({
            id: uuidv7(),
            userId,
            name: tag.name,
            type: tag.type,
          })
          .returning();
        tagId = newTag.id;
      }

      if (tagId) {
        await db.insert(projectTags).values({
          id: uuidv7(),
          projectId,
          tagId,
        });
      }
    }
  }

  // Log successful upload completion
  await AuditLogger.logSuccess(
    'multipart_upload_complete',
    'image',
    userId,
    projectId,
    {
      uploadId,
      filename,
      fileSize,
      totalParts: upload.totalParts,
      mimeType: finalMimeType,
    },
    request
  );

  return NextResponse.json({
    success: true,
    message: 'Upload completed successfully',
    projectId,
    filename,
    fileSize,
  });
}

/**
 * Handle getting upload progress
 */
async function handleGetProgress(
  body: any,
  userId: string
): Promise<NextResponse> {
  const validated = progressSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: 'Invalid progress request', details: validated.error },
      { status: 400 }
    );
  }

  const { uploadId } = validated.data;

  // Get upload progress from database
  const [upload] = await db
    .select()
    .from(multipartUploads)
    .where(
      and(
        eq(multipartUploads.uploadId, uploadId),
        eq(multipartUploads.userId, userId)
      )
    );

  if (!upload) {
    return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
  }

  const parts = await db
    .select()
    .from(uploadParts)
    .where(eq(uploadParts.uploadId, uploadId));

  const progress = Math.round(
    ((upload.uploadedParts || 0) / upload.totalParts) * 100
  );

  return NextResponse.json({
    success: true,
    uploadId,
    status: upload.status,
    uploadedParts: upload.uploadedParts || 0,
    totalParts: upload.totalParts,
    progress,
    parts: parts.map((p) => ({
      partNumber: p.partNumber,
      status: p.status,
      sizeBytes: p.sizeBytes,
    })),
  });
}

/**
 * Handle aborting an upload
 */
async function handleUploadAbort(
  body: any,
  userId: string,
  request: NextRequest
): Promise<NextResponse> {
  const validated = abortUploadSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      { error: 'Invalid abort request', details: validated.error },
      { status: 400 }
    );
  }

  const { uploadId } = validated.data;

  // Verify upload exists and belongs to user
  const [upload] = await db
    .select()
    .from(multipartUploads)
    .where(
      and(
        eq(multipartUploads.uploadId, uploadId),
        eq(multipartUploads.userId, userId)
      )
    );

  if (!upload) {
    return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
  }

  // Abort multipart upload on S3
  try {
    await abortMultipartUpload(upload.storageKey, uploadId);
  } catch (s3Error) {
    console.error('S3 abort failed:', s3Error);
    // Continue anyway to clean up database
  }

  // Update multipart upload status
  await db
    .update(multipartUploads)
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
    })
    .where(eq(multipartUploads.uploadId, uploadId));

  // Log upload abort
  await AuditLogger.logSuccess(
    'multipart_upload_abort',
    'image',
    userId,
    upload.projectId,
    {
      uploadId,
      filename: upload.filename,
      reason: 'Client requested abort',
    },
    request
  );

  return NextResponse.json({
    success: true,
    message: 'Upload aborted successfully',
  });
}
