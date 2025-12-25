import { NextRequest, NextResponse } from 'next/server';
import { db, systemStyles } from '@/db';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Fetch all active styles/presets
    const presets = await db
      .select()
      .from(systemStyles)
      .where(eq(systemStyles.isActive, true))
      .orderBy(systemStyles.sortOrder);

    return NextResponse.json({
      success: true,
      presets: presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        description: preset.description,
        exampleImageUrl: preset.exampleImageUrl,
        category: preset.category,
        // Don't expose internal prompt structure
        blendingParams: preset.blendingParams,
      })),
    });
  } catch (error) {
    console.error('Error fetching presets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch presets' },
      { status: 500 }
    );
  }
}
