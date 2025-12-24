import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { projects, images } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { eq, and } from 'drizzle-orm';

// Helper to validate session and getting DB
async function getContext(req: Request, params: { id: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: new NextResponse('Unauthorized', { status: 401 }) };
  }

  const db = getDb();

  // Verify ownership
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, params.id), eq(projects.userId, session.user.id))
    )
    .limit(1);

  if (!project) {
    return { error: new NextResponse('Project not found', { status: 404 }) };
  }

  return { session, db, project };
}

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { error, db, project } = await getContext(req, params);
  if (error) return error;

  // Get images for the project
  const projectImages = await db
    .select()
    .from(images)
    .where(eq(images.projectId, project.id));

  // Construct response object
  const response = {
    ...project,
    images: projectImages.map((img) => ({
      ...img,
      // Construct valid URLs (mock for now if local, or presigned if real S3)
      url: `/api/images/${img.storageKey}`,
    })),
  };

  return NextResponse.json(response);
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { error, db, project } = await getContext(req, params);
  if (error) return error;

  try {
    await db.delete(projects).where(eq(projects.id, project.id));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error('[PROJECT_DELETE]', e);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { error, db, project } = await getContext(req, params);
  if (error) return error;

  try {
    const body = await req.json();
    const { name } = body; // Only allow updating name for now

    if (!name) {
      return new NextResponse('Name is required', { status: 400 });
    }

    const [updatedProject] = await db
      .update(projects)
      .set({ name, updatedAt: new Date() })
      .where(eq(projects.id, project.id))
      .returning();

    return NextResponse.json(updatedProject);
  } catch (e) {
    console.error('[PROJECT_PDATE]', e);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
