import { NextRequest, NextResponse } from 'next/server';
import { db, userPreferences, systemStyles } from '@/db';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/user/preferences - Fetch user preferences
export async function GET(request: NextRequest) {
  try {
    // Get current authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user preferences
    const preferences = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .leftJoin(systemStyles, eq(userPreferences.lastUsedPresetId, systemStyles.id))
      .limit(1);

    if (preferences.length === 0) {
      // Return default preferences for new users
      return NextResponse.json({
        success: true,
        preferences: {
          lastUsedPreset: null,
          lastUsedPresetId: null,
          preferredIntensity: 0.70,
          preferredViewMode: 'split',
          dismissedWhatNext: false,
          preferences: {},
        },
      });
    }

    const pref = preferences[0];
    return NextResponse.json({
      success: true,
      preferences: {
        lastUsedPreset: pref.system_styles ? {
          id: pref.system_styles.id,
          name: pref.system_styles.name,
          description: pref.system_styles.description,
          exampleImageUrl: pref.system_styles.exampleImageUrl,
          category: pref.system_styles.category,
          blendingParams: pref.system_styles.blendingParams,
        } : null,
        lastUsedPresetId: pref.user_preferences.lastUsedPresetId,
        preferredIntensity: Number(pref.user_preferences.preferredIntensity),
        preferredViewMode: pref.user_preferences.preferredViewMode,
        dismissedWhatNext: pref.user_preferences.dismissedWhatNext,
        preferences: pref.user_preferences.preferences,
      },
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

// PUT /api/user/preferences - Update user preferences
export async function PUT(request: NextRequest) {
  try {
    // Get current authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      lastUsedPresetId,
      preferredIntensity,
      preferredViewMode,
      dismissedWhatNext,
      preferences,
    } = body;

    // Check if preferences exist for this user
    const existingPreferences = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1);

    let result;

    if (existingPreferences.length === 0) {
      // Create new preferences
      const newPreferences = await db
        .insert(userPreferences)
        .values({
          userId: session.user.id,
          lastUsedPresetId: lastUsedPresetId || null,
          preferredIntensity: preferredIntensity?.toString() || '0.70',
          preferredViewMode: preferredViewMode || 'split',
          dismissedWhatNext: dismissedWhatNext || false,
          preferences: preferences || {},
          updatedAt: new Date(),
        })
        .returning();

      result = newPreferences[0];
    } else {
      // Update existing preferences
      const updatedPreferences = await db
        .update(userPreferences)
        .set({
          ...(lastUsedPresetId !== undefined && { lastUsedPresetId }),
          ...(preferredIntensity !== undefined && { preferredIntensity: preferredIntensity.toString() }),
          ...(preferredViewMode !== undefined && { preferredViewMode }),
          ...(dismissedWhatNext !== undefined && { dismissedWhatNext }),
          ...(preferences !== undefined && { preferences }),
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, session.user.id))
        .returning();

      result = updatedPreferences[0];
    }

    return NextResponse.json({
      success: true,
      preferences: {
        lastUsedPresetId: result.lastUsedPresetId,
        preferredIntensity: Number(result.preferredIntensity),
        preferredViewMode: result.preferredViewMode,
        dismissedWhatNext: result.dismissedWhatNext,
        preferences: result.preferences,
      },
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
