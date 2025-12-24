import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { projects, images } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { eq, and } from 'drizzle-orm';

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { format = 'jpg', quality = 100 } = body;

    const db = getDb();

    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, session.user.id)))
      .limit(1);

    if (!project) {
      return new NextResponse('Project not found', { status: 404 });
    }

    // In a real app, this would trigger a job or generate a signed URL for a processing lambda
    // For now, we'll return a success with a mock download URL

    // Find if we have a processed image
    const [processedImage] = await db
      .select()
      .from(images)
      .where(and(eq(images.projectId, id), eq(images.type, 'processed')))
      .limit(1);

    const imageUrl = processedImage
      ? processedImage.storageKey
      : 'mock-image-id_processed.jpg';

    return NextResponse.json({
      success: true,
      downloadUrl: `/api/images/${imageUrl}?format=${format}&q=${quality}`,
      message: 'Export ready',
    });
  } catch (error) {
    console.error('[PROJECT_EXPORT]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
