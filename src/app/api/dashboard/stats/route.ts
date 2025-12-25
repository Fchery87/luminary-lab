import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { projects, processingJobs } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { eq, and, gte, sql, count } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const db = getDb();
    const userId = session.user.id;

    // Calculate time thresholds for 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get total projects count
    const totalProjectsResult = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.userId, userId));

    const totalProjects = totalProjectsResult[0]?.count || 0;

    // Get completed projects count
    const completedProjectsResult = await db
      .select({ count: count() })
      .from(projects)
      .where(
        and(
          eq(projects.userId, userId),
          eq(projects.status, 'completed')
        )
      );

    const completedProjects = completedProjectsResult[0]?.count || 0;

    // Get processing projects count
    const processingProjectsResult = await db
      .select({ count: count() })
      .from(projects)
      .where(
        and(
          eq(projects.userId, userId),
          sql`${projects.status} IN ('processing', 'queued', 'pending')`
        )
      );

    const processingProjects = processingProjectsResult[0]?.count || 0;

    // Get processing projects with their start times to calculate ETA
    const processingProjectsDetails = await db
      .select({
        id: projects.id,
        status: projects.status,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(
        and(
          eq(projects.userId, userId),
          sql`${projects.status} IN ('processing', 'queued', 'pending')`
        )
      );

    // Get processing job details for accurate startedAt times
    const processingJobsWithStartTimes = await db
      .select({
        projectId: processingJobs.projectId,
        startedAt: processingJobs.startedAt,
        status: processingJobs.status,
      })
      .from(processingJobs)
      .where(
        sql`${processingJobs.status} IN ('queued', 'processing')`
      );

    // Map project IDs to their job start times
    const projectStartTimes = new Map<string, Date | null>();
    for (const job of processingJobsWithStartTimes) {
      if (!projectStartTimes.has(job.projectId)) {
        projectStartTimes.set(job.projectId, job.startedAt || null);
      }
    }

    // Calculate estimated time remaining (mock: assume 30 seconds per image)
    const avgProcessingTimeSeconds = 30; // Mock average processing time per project
    const totalEstimatedSeconds = processingProjects * avgProcessingTimeSeconds;

    // Calculate progress based on startedAt times
    let totalElapsedSeconds = 0;
    for (const project of processingProjectsDetails) {
      const startTime = projectStartTimes.get(project.id) || project.createdAt;
      const elapsed = (Date.now() - new Date(startTime).getTime()) / 1000;
      totalElapsedSeconds += Math.min(elapsed, avgProcessingTimeSeconds);
    }

    const remainingSeconds = Math.max(0, totalEstimatedSeconds - totalElapsedSeconds);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    const progressPercentage = totalEstimatedSeconds > 0
      ? Math.round((totalElapsedSeconds / totalEstimatedSeconds) * 100)
      : 0;

    // Get recent activity count (last 24 hours)
    // We'll count projects created in the last 24 hours as a proxy for activity
    const recentActivityResult = await db
      .select({ count: count() })
      .from(projects)
      .where(
        and(
          eq(projects.userId, userId),
          gte(projects.createdAt, twentyFourHoursAgo)
        )
      );

    const recentActivity = recentActivityResult[0]?.count || 0;

    return NextResponse.json({
      totalProjects,
      completedProjects,
      processingProjects,
      processingEta: {
        remainingMinutes,
        remainingSeconds: Math.round(remainingSeconds),
        progressPercentage,
      },
      recentActivity,
    });
  } catch (error) {
    console.error('[DASHBOARD_STATS]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
