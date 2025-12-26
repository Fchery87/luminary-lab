import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, systemStyles } from '@/db';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const updatePresetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  aiPrompt: z.string().min(1).max(2000).optional(),
  blendingParams: z.record(z.string(), z.any()).optional(),
  exampleImageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().min(0).optional(),
});

// PUT - Update preset (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.email?.endsWith('@admin.com') ||
                  session.user.email === 'admin@luminarylab.com';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Preset ID required' }, { status: 400 });
    }

    const body = await request.json();
    const validated = updatePresetSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validated.error },
        { status: 400 }
      );
    }

    // Check if preset exists
    const [existingPreset] = await db
      .select()
      .from(systemStyles)
      .where(eq(systemStyles.id, id))
      .limit(1);

    if (!existingPreset) {
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      );
    }

    // Update preset
    const [updatedPreset] = await db
      .update(systemStyles)
      .set({
        ...validated.data,
        updatedAt: new Date(),
      })
      .where(eq(systemStyles.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      preset: updatedPreset,
    });

  } catch (error) {
    console.error('Update preset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete preset (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.email?.endsWith('@admin.com') ||
                  session.user.email === 'admin@luminarylab.com';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Preset ID required' }, { status: 400 });
    }

    // Check if preset exists
    const [existingPreset] = await db
      .select()
      .from(systemStyles)
      .where(eq(systemStyles.id, id))
      .limit(1);

    if (!existingPreset) {
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      );
    }

    // Delete preset
    await db.delete(systemStyles).where(eq(systemStyles.id, id));

    return NextResponse.json({
      success: true,
      message: 'Preset deleted successfully',
    });

  } catch (error) {
    console.error('Delete preset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Toggle active status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.email?.endsWith('@admin.com') ||
                  session.user.email === 'admin@luminarylab.com';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Preset ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    // Check if preset exists
    const [existingPreset] = await db
      .select()
      .from(systemStyles)
      .where(eq(systemStyles.id, id))
      .limit(1);

    if (!existingPreset) {
      return NextResponse.json(
        { error: 'Preset not found' },
        { status: 404 }
      );
    }

    // Update active status
    const [updatedPreset] = await db
      .update(systemStyles)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(systemStyles.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      preset: updatedPreset,
    });

  } catch (error) {
    console.error('Toggle preset status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
