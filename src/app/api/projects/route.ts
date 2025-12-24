import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { projects, images } from '@/db/schema';
import { auth } from '@/lib/auth'; // Ensure this path is correct for Better Auth
import { headers } from 'next/headers';
import { desc, eq, and } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const db = getDb();

    // Fetch projects with their optional thumbnails
    // We can do a join or just fetch projects and then fetch thumbnails.
    // Drizzle's query builder is nice for this.
    const userProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        createdAt: projects.createdAt,
        thumbnailUrl: images.storageKey, // Using storageKey as URL placeholder for now
        // We might want to join with images where type = 'thumbnail' or 'processed' or 'original'
      })
      .from(projects)
      .leftJoin(
        images,
        and(
          eq(images.projectId, projects.id),
          eq(images.type, 'thumbnail') // Prefer thumbnail
        )
      )
      .where(eq(projects.userId, session.user.id))
      .orderBy(desc(projects.createdAt));

    // Note: In reality, we'd need to convert storageKey to a signed URL here if using S3
    // For now, returning the raw data or a placeholder
    const formattedProjects = userProjects.map((p) => ({
      ...p,
      thumbnailUrl: p.thumbnailUrl
        ? `/api/images/${p.thumbnailUrl}` // Mock endpoint for serving images if local
        : null,
    }));

    return NextResponse.json(formattedProjects);
  } catch (error) {
    console.error('[PROJECTS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const db = getDb();

    // Create 'Untitled Project' or named from body
    // We expect the client to possibly send a name
    const body = await req.json().catch(() => ({}));
    const name = body.name || 'Untitled Project';

    const [newProject] = await db
      .insert(projects)
      .values({
        id: uuidv7(),
        userId: session.user.id,
        name: name,
        status: 'pending',
      })
      .returning();

    return NextResponse.json(newProject);
  } catch (error) {
    console.error('[PROJECTS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
