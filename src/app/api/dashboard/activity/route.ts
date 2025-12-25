import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { auditLogs, projects, images, systemStyles, processingJobs } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { eq, desc, gte, sql } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    const userId = session.user.id;

    // Get recent audit logs for the user
    const activities = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resource: auditLogs.resource,
        resourceId: auditLogs.resourceId,
        details: auditLogs.details,
        timestamp: auditLogs.timestamp,
        success: auditLogs.success,
      })
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);

    // Enrich activities with additional context
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        let context: any = {};

        // Add project name if the resource is a project
        if (activity.resource === 'project' && activity.resourceId) {
          const project = await db
            .select({ name: projects.name, status: projects.status })
            .from(projects)
            .where(eq(projects.id, activity.resourceId as string))
            .limit(1);

          if (project[0]) {
            context.projectName = project[0].name;
            context.projectStatus = project[0].status;
          }
        }

        // Add style name if the action involves applying a style
        if (activity.action === 'style_applied' && activity.details) {
          const styleId = (activity.details as any)?.styleId;
          if (styleId) {
            const style = await db
              .select({ name: systemStyles.name })
              .from(systemStyles)
              .where(eq(systemStyles.id, styleId))
              .limit(1);

            if (style[0]) {
              context.styleName = style[0].name;
            }
          }
        }

        return {
          ...activity,
          ...context,
        };
      })
    );

    // Transform activities into a user-friendly format
    const transformedActivities = enrichedActivities.map((activity) => {
      const actionType = getActivityType(activity);
      const description = getActivityDescription(activity);

      return {
        id: activity.id,
        type: actionType.type,
        description,
        projectName: activity.projectName,
        styleName: activity.styleName,
        timestamp: activity.timestamp,
        success: activity.success,
      };
    });

    return NextResponse.json(transformedActivities);
  } catch (error) {
    console.error('[DASHBOARD_ACTIVITY]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

function getActivityType(activity: any): { type: string; icon: string } {
  const action = activity.action;
  const resource = activity.resource;

  if (action === 'upload' || action === 'image_uploaded') {
    return { type: 'uploaded', icon: 'upload' };
  }
  if (action === 'processing_complete' || action === 'job_completed') {
    return { type: 'completed', icon: 'check' };
  }
  if (action === 'style_applied') {
    return { type: 'styled', icon: 'palette' };
  }
  if (action === 'delete' || action === 'project_deleted' || action === 'image_deleted') {
    return { type: 'deleted', icon: 'trash' };
  }
  if (action === 'project_created') {
    return { type: 'created', icon: 'plus' };
  }
  if (action === 'processing_started') {
    return { type: 'processing', icon: 'clock' };
  }

  // Default fallback
  return { type: action, icon: 'activity' };
}

function getActivityDescription(activity: any): string {
  const action = activity.action;
  const projectName = activity.projectName || 'Unknown project';
  const styleName = activity.styleName;

  switch (action) {
    case 'upload':
    case 'image_uploaded':
      return `Uploaded images to "${projectName}"`;
    case 'project_created':
      return `Created project "${projectName}"`;
    case 'processing_complete':
    case 'job_completed':
      return `Completed processing for "${projectName}"`;
    case 'processing_started':
      return `Started processing "${projectName}"`;
    case 'style_applied':
      return styleName
        ? `Applied style "${styleName}" to "${projectName}"`
        : `Applied style to "${projectName}"`;
    case 'delete':
    case 'project_deleted':
      return `Deleted "${projectName}"`;
    case 'image_deleted':
      return `Deleted image from "${projectName}"`;
    default:
      return `${action.replace(/_/g, ' ')} - ${projectName}`;
  }
}
