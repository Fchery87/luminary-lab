import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateUploadUrl, generateFileKey, isValidRawFile, RAW_MIME_TYPES } from '@/lib/s3';
import { db, projects, images } from '@/db';
import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';
import { withUsageLimits } from '@/lib/usage-limits';
import { extractRawMetadata, formatMetadataForDisplay, validateRawFile } from '@/lib/raw-metadata';
import { AuditLogger } from '@/lib/audit-logger';

const uploadSchema = z.object({
  filename: z.string().min(1),
  fileSize: z.number().min(1),
  mimeType: z.string().min(1),
  projectName: z.string().min(1).optional(),
});

export const POST = withUsageLimits(async (request: NextRequest) => {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = uploadSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validated.error },
        { status: 400 }
      );
    }

    const { filename, fileSize, mimeType, projectName } = validated.data;

    // Validate file type (RAW only)
    if (!isValidRawFile(mimeType)) {
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

    // Generate project ID
    const projectId = uuidv7();

    // Create project in database
    await db.insert(projects).values({
      id: projectId,
      userId: session.user.id,
      name: projectName || `Project ${new Date().toLocaleString()}`,
      status: 'pending',
    });

    // Generate file keys
    const originalKey = generateFileKey(
      session.user.id,
      projectId,
      filename,
      'original'
    );
    const thumbnailKey = generateFileKey(
      session.user.id,
      projectId,
      `thumb_${filename}`,
      'thumbnail'
    );

    // Extract RAW metadata
    let metadata = null;
    let metadataDisplay = {};
    try {
      // For demo purposes, we'll simulate metadata extraction
      // In production, you'd extract from actual file
      metadata = {
        make: 'Canon',
        model: 'EOS R5',
        lensModel: 'RF 24-70mm f/2.8L IS USM',
        width: 8192,
        height: 5464,
        iso: 400,
        aperture: 'f/5.6',
        focalLength: '50mm',
        shutterSpeed: '1/250',
        whiteBalance: 'Auto',
        colorSpace: 'sRGB',
        dateTime: new Date(),
        bitsPerSample: [16],
        samplesPerPixel: 3,
      };
      
      metadataDisplay = formatMetadataForDisplay(metadata);
      
      // Validate RAW file
      const validation = validateRawFile(filename, mimeType);
      if (!validation.isValid) {
        console.warn('RAW file validation warnings:', validation.errors);
      }
      
    } catch (error) {
      console.error('Metadata extraction failed:', error);
    }

    // Create image records with metadata
    await db.insert(images).values([
      {
        id: uuidv7(),
        projectId,
        type: 'original',
        storageKey: originalKey,
        filename,
        sizeBytes: fileSize,
        mimeType,
        width: metadata?.width,
        height: metadata?.height,
      },
      {
        id: uuidv7(),
        projectId,
        type: 'thumbnail',
        storageKey: thumbnailKey,
        filename: `thumb_${filename}`,
        sizeBytes: 0, // Will be updated after processing
        mimeType: 'image/jpeg',
        width: metadata?.width ? Math.min(metadata.width, 400) : undefined,
        height: metadata?.height ? Math.min(metadata.height, 300) : undefined,
      },
    ]);

    // Generate signed URLs for upload
    const uploadUrl = await generateUploadUrl(originalKey, mimeType);
    const thumbnailUploadUrl = await generateUploadUrl(thumbnailKey, 'image/jpeg');

    // Add usage limits info to response
    const usageLimits = JSON.parse(request.headers.get('x-usage-limits') || '{}');
    
    // Log successful upload
    await AuditLogger.logSuccess(
      'file_upload',
      'image',
      session.user.id,
      projectId,
      {
        filename,
        fileSize,
        mimeType,
        metadata: metadataDisplay,
        usageLimits
      },
      request
    );
    
    return NextResponse.json({
      success: true,
      projectId,
      uploadUrl,
      thumbnailUploadUrl,
      fileKey: originalKey,
      thumbnailKey,
      fileExtension: RAW_MIME_TYPES[mimeType as keyof typeof RAW_MIME_TYPES],
      usage: usageLimits,
      metadata: metadataDisplay,
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Log failed upload
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });
      
      await AuditLogger.logFailure(
        'file_upload',
        'image',
        error instanceof Error ? error.message : String(error),
        session?.user?.id,
        undefined,
        {
          filename: validated?.filename,
          fileSize: validated?.fileSize
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
