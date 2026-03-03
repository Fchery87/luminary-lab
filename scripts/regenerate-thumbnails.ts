/**
 * Regenerate thumbnails for existing projects
 *
 * Deletes old thumbnails (from R2 + DB) and regenerates them with the
 * corrected fit:"inside" config and proper EXIF rotation.
 *
 * Usage:
 *   bun run scripts/regenerate-thumbnails.ts                # all projects
 *   bun run scripts/regenerate-thumbnails.ts <projectId>    # single project
 *   DRY_RUN=true bun run scripts/regenerate-thumbnails.ts   # preview only
 */

import { db, images, projects, users } from '@/db';
import { eq, and } from 'drizzle-orm';
import {
  downloadImageFromS3,
  generateThumbnail,
  DEFAULT_THUMBNAIL_CONFIGS,
} from '@/lib/thumbnail-generator';
import { uploadFile, deleteFile } from '@/lib/s3';
import { v7 as uuidv7 } from 'uuid';

const DRY_RUN = process.env.DRY_RUN === 'true';

interface RegenerateStats {
  projectsProcessed: number;
  projectsSkipped: number;
  projectsFailed: number;
  thumbnailsDeleted: number;
  thumbnailsCreated: number;
}

async function regenerateThumbnails(targetProjectId?: string) {
  const stats: RegenerateStats = {
    projectsProcessed: 0,
    projectsSkipped: 0,
    projectsFailed: 0,
    thumbnailsDeleted: 0,
    thumbnailsCreated: 0,
  };

  console.log('🔄 Thumbnail Regeneration Script');
  console.log(`   Mode: ${DRY_RUN ? '🏜️  DRY RUN (no changes)' : '🔥 LIVE'}`);
  console.log('');

  // Get projects to process
  const projectRows = targetProjectId
    ? await db
        .select({
          projectId: projects.id,
          userId: projects.userId,
          projectName: projects.name,
        })
        .from(projects)
        .where(eq(projects.id, targetProjectId))
    : await db
        .select({
          projectId: projects.id,
          userId: projects.userId,
          projectName: projects.name,
        })
        .from(projects);

  if (projectRows.length === 0) {
    console.log('❌ No projects found');
    return;
  }

  console.log(`📦 Found ${projectRows.length} project(s) to process\n`);

  for (const row of projectRows) {
    const { projectId, userId, projectName } = row;

    try {
      // Find the original image for this project
      const [originalImage] = await db
        .select()
        .from(images)
        .where(
          and(
            eq(images.projectId, projectId),
            eq(images.type, 'original'),
          ),
        )
        .limit(1);

      if (!originalImage) {
        console.log(`⏭️  [${projectName}] No original image found — skipping`);
        stats.projectsSkipped++;
        continue;
      }

      // Find existing thumbnails
      const existingThumbnails = await db
        .select()
        .from(images)
        .where(
          and(
            eq(images.projectId, projectId),
            eq(images.type, 'thumbnail'),
          ),
        );

      console.log(
        `🖼️  [${projectName}] Original: ${originalImage.filename} (${originalImage.mimeType})`,
      );
      console.log(
        `   Found ${existingThumbnails.length} existing thumbnail(s)`,
      );

      if (DRY_RUN) {
        console.log('   ➡️  Would delete old thumbnails and regenerate\n');
        stats.projectsProcessed++;
        stats.thumbnailsDeleted += existingThumbnails.length;
        stats.thumbnailsCreated += Object.keys(DEFAULT_THUMBNAIL_CONFIGS).length;
        continue;
      }

      // Step 1: Delete old thumbnails from R2
      for (const thumb of existingThumbnails) {
        try {
          await deleteFile(thumb.storageKey);
        } catch (e) {
          // File may already be gone from R2, continue
          console.warn(`   ⚠️  Could not delete R2 object: ${thumb.storageKey}`);
        }
      }

      // Step 2: Delete old thumbnail records from DB
      if (existingThumbnails.length > 0) {
        await db
          .delete(images)
          .where(
            and(
              eq(images.projectId, projectId),
              eq(images.type, 'thumbnail'),
            ),
          );
        stats.thumbnailsDeleted += existingThumbnails.length;
        console.log(`   🗑️  Deleted ${existingThumbnails.length} old thumbnail(s)`);
      }

      // Step 3: Download original image from R2
      const imageBuffer = await downloadImageFromS3(originalImage.storageKey);

      // Step 4: Regenerate thumbnails with corrected config
      for (const [size, config] of Object.entries(DEFAULT_THUMBNAIL_CONFIGS)) {
        try {
          const { buffer, width, height, size: sizeBytes, blurHash } =
            await generateThumbnail(imageBuffer, config, originalImage.mimeType);

          const filename = `thumb_${size}_${originalImage.storageKey.split('/').pop()}`;
          const storageKey = `users/${userId}/projects/${projectId}/thumbnail/${Date.now()}-${filename}`;

          const mimeType =
            config.format === 'jpeg'
              ? 'image/jpeg'
              : config.format === 'png'
                ? 'image/png'
                : 'image/webp';

          await uploadFile(storageKey, buffer, mimeType);

          await db.insert(images).values({
            id: uuidv7(),
            projectId,
            type: 'thumbnail',
            storageKey,
            filename,
            sizeBytes,
            mimeType,
            width,
            height,
            blurHash,
          });

          stats.thumbnailsCreated++;
          console.log(
            `   ✅ ${size}: ${width}x${height} (${Math.round(sizeBytes / 1024)}KB)`,
          );
        } catch (e) {
          console.error(`   ❌ Failed to generate ${size} thumbnail:`, e);
        }
      }

      stats.projectsProcessed++;
      console.log('');
    } catch (error) {
      console.error(`❌ [${projectName}] Failed:`, error);
      stats.projectsFailed++;
    }
  }

  // Summary
  console.log('━'.repeat(50));
  console.log('📊 Summary');
  console.log(`   Projects processed: ${stats.projectsProcessed}`);
  console.log(`   Projects skipped:   ${stats.projectsSkipped}`);
  console.log(`   Projects failed:    ${stats.projectsFailed}`);
  console.log(`   Thumbnails deleted: ${stats.thumbnailsDeleted}`);
  console.log(`   Thumbnails created: ${stats.thumbnailsCreated}`);
  if (DRY_RUN) {
    console.log('\n   ℹ️  This was a dry run. No changes were made.');
    console.log('   Run without DRY_RUN=true to apply changes.');
  }
}

// Entry point
const targetProjectId = process.argv[2];

if (import.meta.main) {
  regenerateThumbnails(targetProjectId)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}
