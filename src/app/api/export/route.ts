import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, projects, images } from '@/db';
import { generateDownloadUrl } from '@/lib/s3';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';

const exportSchema = z.object({
  projectId: z.string().min(1),
  format: z.enum(['jpg', 'tiff', 'png']),
  quality: z.enum(['standard', 'high', 'ultra']).default('high'),
  size: z.enum(['original', 'web', 'print']).default('web'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = exportSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validated.error },
        { status: 400 }
      );
    }

    const { projectId, format, quality, size } = validated.data;

    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Get processed image
    const [processedImage] = await db
      .select()
      .from(images)
      .where(and(
        eq(images.projectId, projectId),
        eq(images.type, 'processed')
      ));

    if (!processedImage) {
      return NextResponse.json(
        { error: 'Processed image not found' },
        { status: 404 }
      );
    }

    // Generate export job (in production, this would be a background job)
    const exportId = uuidv7();
    console.log(`Generating export: ${exportId}`, {
      projectId,
      format,
      quality,
      size,
      userId: session.user.id,
    });

    // In a real implementation, you would:
    // 1. Create an export job in the database
    // 2. Process the image based on format/quality/size parameters
    // 3. Upload the exported file to S3
    // 4. Return a download URL

    // For this demo, we'll just return the processed image download URL
    const downloadUrl = await generateDownloadUrl(processedImage.storageKey, 3600); // 1 hour expiry

    // Determine file extension based on format
    const fileExtensions = {
      jpg: '.jpg',
      tiff: '.tif',
      png: '.png',
    };

    const qualitySettings = {
      standard: { jpeg: 85, tiff: 8, png: 6 },
      high: { jpeg: 95, tiff: 16, png: 8 },
      ultra: { jpeg: 100, tiff: 16, png: 8 },
    };

    const sizeSettings = {
      original: 'Original size',
      web: '2048px (web)',
      print: '4000px (print)',
    };

    // Simulate export processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({
      success: true,
      exportId,
      downloadUrl,
      fileName: `luminary_${projectId}_${format}${fileExtensions[format]}`,
      fileSize: processedImage.sizeBytes,
      format,
      quality,
      size: sizeSettings[size],
      qualitySettings: qualitySettings[quality],
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
