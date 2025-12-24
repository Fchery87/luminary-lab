import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, projects, processingJobs, images, systemStyles } from '@/db';
import { imageProcessingQueue, ImageProcessingJob } from '@/lib/queue';
import { notifyJobStatusChange, notifyUserProjectUpdate } from '@/lib/websocket-server';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';
import { eq, and } from 'drizzle-orm';

const processSchema = z.object({
  projectId: z.string().min(1),
  presetId: z.string().min(1),
  intensity: z.number().min(0).max(1),
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
    const validated = processSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validated.error },
        { status: 400 }
      );
    }

    const { projectId, presetId, intensity } = validated.data;

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

    // Verify style exists and is active
    const [style] = await db
      .select()
      .from(systemStyles)
      .where(and(
        eq(systemStyles.id, presetId),
        eq(systemStyles.isActive, true)
      ));

    if (!style) {
      return NextResponse.json(
        { error: 'Style not found or not active' },
        { status: 404 }
      );
    }

    // Get original image
    const [originalImage] = await db
      .select()
      .from(images)
      .where(and(
        eq(images.projectId, projectId),
        eq(images.type, 'original')
      ));

    if (!originalImage) {
      return NextResponse.json(
        { error: 'Original image not found' },
        { status: 404 }
      );
    }

    // Create processing job
    const jobId = uuidv7();
    await db.insert(processingJobs).values({
      id: jobId,
      projectId,
      styleId: presetId,
      intensity: intensity.toString(),
      status: 'queued',
    });

    // Add job to queue
    const jobData: ImageProcessingJob = {
      id: jobId,
      projectId,
      styleId: presetId,
      intensity,
      originalImageKey: originalImage.storageKey,
      userId: session.user.id,
    };

    const job = await imageProcessingQueue.add('process image', jobData, {
      delay: 0,
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: false,
    });

    // Update project status
    await db.update(projects)
      .set({ status: 'processing' })
      .where(eq(projects.id, projectId));

    // Send real-time notifications
    await notifyJobStatusChange(jobId, 'queued', {
      projectId,
      styleName: style.name,
      intensity: intensity * 100,
    });

    await notifyUserProjectUpdate(session.user.id, projectId, {
      type: 'status_change',
      data: {
        status: 'processing',
        styleName: style.name,
        intensity: intensity * 100,
        jobId,
      }
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Processing started successfully',
      estimatedTime: '2-3 minutes',
    });

  } catch (error) {
    console.error('Process error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
