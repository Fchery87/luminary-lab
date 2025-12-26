import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { projects, images, processingJobs, systemStyles, tags, projectTags } from '@/db/schema';
import { auth } from '@/lib/auth'; // Ensure this path is correct for Better Auth
import { headers } from 'next/headers';
import { desc, eq, and, sql, or, like, gte, lte } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { generateDownloadUrl } from '@/lib/s3';

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

    // Extract filter parameters
    const searchQuery = searchParams.get('search') || '';
    const cameraMake = searchParams.get('cameraMake');
    const cameraModel = searchParams.get('cameraModel');
    const lensModel = searchParams.get('lensModel');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const isoMin = searchParams.get('isoMin');
    const isoMax = searchParams.get('isoMax');
    const tag = searchParams.get('tag');
    const filterStatus = searchParams.get('status') || 'all';

    // Build filter conditions
    const conditions = [eq(projects.userId, session.user.id)];

    // Status filter
    if (filterStatus !== 'all') {
      conditions.push(eq(projects.status, filterStatus));
    }

    // Search filter (name or tag)
    if (searchQuery) {
      // Search in project name
      const nameCondition = like(projects.name, `%${searchQuery}%`);
      
      // Search in tags
      const tagCondition = sql`${tags.id} IN (
        SELECT pt.tag_id FROM ${projectTags} pt
        INNER JOIN ${tags} t ON t.id = pt.tag_id
        WHERE t.name ILIKE ${`%${searchQuery}%`}
      )`;

      conditions.push(or(nameCondition, tagCondition)!);
    }

    // Tag filter
    if (tag) {
      conditions.push(sql`${projects.id} IN (
        SELECT project_id FROM ${projectTags}
        WHERE tag_id = (SELECT id FROM ${tags} WHERE name = ${tag} AND user_id = ${session.user.id} LIMIT 1)
      )`);
    }

    // Date range filter
    if (dateFrom) {
      conditions.push(gte(projects.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(projects.createdAt, new Date(dateTo)));
    }

    // Camera make/model filter from metadata
    if (cameraMake || cameraModel) {
      conditions.push(sql`(images.metadata->>'make')::text ILIKE ${`%${cameraMake || ''}%`}`);
      if (cameraModel) {
        conditions.push(sql`(images.metadata->>'model')::text ILIKE ${`%${cameraModel}%`}`);
      }
    }

    // Lens filter from metadata
    if (lensModel) {
      conditions.push(sql`(images.metadata->>'lensModel')::text ILIKE ${`%${lensModel}%`}`);
    }

    // ISO range filter from metadata
    if (isoMin) {
      conditions.push(sql`(images.metadata->>'iso')::numeric >= ${parseInt(isoMin)}`);
    }
    if (isoMax) {
      conditions.push(sql`(images.metadata->>'iso')::numeric <= ${parseInt(isoMax)}`);
    }

    // Fetch projects with their original images and processing job info
    // We'll fetch thumbnails separately
    const userProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        createdAt: projects.createdAt,
        originalStorageKey: images.storageKey,
        styleName: systemStyles.name,
        intensity: processingJobs.intensity,
        metadata: images.metadata,
      })
      .from(projects)
      .leftJoin(
        images,
        and(
          eq(images.projectId, projects.id),
          eq(images.type, 'original')
        )
      )
      .leftJoin(
        processingJobs,
        eq(processingJobs.projectId, projects.id)
      )
      .leftJoin(
        systemStyles,
        eq(systemStyles.id, processingJobs.styleId)
      )
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt));

    // Get thumbnail URLs for each project (prefer thumbnail type over original)
    const projectsWithThumbnails = await Promise.all(
      userProjects.map(async (project) => {
        const [thumbnail] = await db
          .select({ storageKey: images.storageKey })
          .from(images)
          .where(
            and(
              eq(images.projectId, project.id),
              eq(images.type, 'thumbnail')
            )
          )
          .limit(1);

        return {
          ...project,
          thumbnailUrl: thumbnail?.storageKey || project.originalStorageKey || null,
        };
      })
    );

    // Get tags for each project
    const projectsWithTags = await Promise.all(
      projectsWithThumbnails.map(async (project) => {
        const projectTagsList = await db
          .select({
            name: tags.name,
            type: tags.type,
          })
          .from(projectTags)
          .innerJoin(tags, eq(projectTags.tagId, tags.id))
          .where(eq(projectTags.projectId, project.id));

        return {
          ...project,
          tags: projectTagsList,
        };
      })
    );

    // Generate signed URLs for thumbnails from S3 and convert intensity to number
    const formattedProjects = await Promise.all(
      projectsWithTags.map(async (p) => ({
        ...p,
        thumbnailUrl: p.thumbnailUrl
          ? await generateDownloadUrl(p.thumbnailUrl, 3600) // 1 hour expiry
          : null,
        intensity: p.intensity ? parseFloat(p.intensity as string) * 100 : undefined,
      }))
    );

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
