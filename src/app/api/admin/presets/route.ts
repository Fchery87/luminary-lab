import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, systemStyles } from '@/db';
import { z } from 'zod';
import { v7 as uuidv7 } from 'uuid';
import { eq, desc, asc, sql } from 'drizzle-orm';

const presetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  aiPrompt: z.string().min(1).max(2000),
  blendingParams: z.record(z.string(), z.any()).optional().default({}),
  exampleImageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().min(0).default(0),
});

const updatePresetSchema = presetSchema.partial().extend({
  id: z.string().min(1),
});

// GET - List all presets (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (you might want to add an isAdmin field to users table)
    // For now, we'll use a simple check
    const user = session?.user;
    const isAdmin = user?.email?.endsWith('@admin.com') || 
                  user?.email === 'admin@luminarylab.com';
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const search = searchParams.get('search') || '';

    const whereConditions = [];
    if (!includeInactive) {
      whereConditions.push(eq(systemStyles.isActive, true));
    }
    if (search) {
      // Add search conditions (you might want to use ilike for case-insensitive search)
      whereConditions.push(
        sql`(LOWER(${systemStyles.name}) LIKE LOWER(${`%${search}%`}) OR LOWER(${systemStyles.description}) LIKE LOWER(${`%${search}%`}))`
      );
    }

    const presets = await db
      .select({
        id: systemStyles.id,
        name: systemStyles.name,
        description: systemStyles.description,
        aiPrompt: systemStyles.aiPrompt,
        blendingParams: systemStyles.blendingParams,
        exampleImageUrl: systemStyles.exampleImageUrl,
        isActive: systemStyles.isActive,
        sortOrder: systemStyles.sortOrder,
        createdAt: systemStyles.createdAt,
        updatedAt: systemStyles.updatedAt,
      })
      .from(systemStyles)
      .where(whereConditions.length > 0 ? sql`${whereConditions.join(' AND ')}` : sql`1=1`)
      .orderBy(asc(systemStyles.sortOrder), desc(systemStyles.createdAt));

    return NextResponse.json({
      success: true,
      presets,
    });

  } catch (error) {
    console.error('Get presets error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new preset (admin only)
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validated = presetSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validated.error },
        { status: 400 }
      );
    }

    const presetData = {
      id: uuidv7(),
      ...validated.data,
    };

    // Insert new preset
    const [newPreset] = await db
      .insert(systemStyles)
      .values(presetData)
      .returning();

    return NextResponse.json({
      success: true,
      preset: newPreset,
    });

  } catch (error) {
    console.error('Create preset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
