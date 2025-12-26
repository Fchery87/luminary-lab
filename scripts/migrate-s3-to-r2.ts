#!/usr/bin/env bun
/**
 * AWS S3 to Cloudflare R2 Migration Script
 * 
 * This script migrates all objects from an AWS S3 bucket to Cloudflare R2.
 * 
 * Usage:
 * bun run scripts/migrate-s3-to-r2.ts
 * 
 * Prerequisites:
 * - Both AWS S3 and Cloudflare R2 credentials must be set in .env
 * - Both buckets must exist
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

console.log('='.repeat(60));
console.log('AWS S3 to Cloudflare R2 Migration');
console.log('='.repeat(60));

// Configuration
const SOURCE_BUCKET = process.env.AWS_S3_BUCKET || '';
const DEST_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || '';
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!SOURCE_BUCKET || !DEST_BUCKET) {
  console.error('❌ Both AWS_S3_BUCKET and CLOUDFLARE_R2_BUCKET_NAME must be set in .env');
  process.exit(1);
}

console.log(`\nSource Bucket: ${SOURCE_BUCKET} (AWS S3)`);
console.log(`Destination Bucket: ${DEST_BUCKET} (Cloudflare R2)`);
console.log(`Dry Run: ${DRY_RUN ? 'YES - No actual migration will occur' : 'NO - Migration will execute'}`);

// Create S3 Clients
const awsS3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

// Statistics
let totalObjects = 0;
let migratedObjects = 0;
let skippedObjects = 0;
let failedObjects = 0;
let totalBytes = 0;
let migratedBytes = 0;
let errors: { key: string; error: string }[] = [];

/**
 * Convert stream to buffer
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk as Buffer));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/**
 * List all objects in a bucket
 */
async function listAllObjects(bucket: string, prefix: string = ''): Promise<string[]> {
  const objects: string[] = [];
  let continuationToken: string | undefined = undefined;

  do {
    const response = await awsS3Client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    })) as { Contents?: Array<{ Key?: string }>; NextContinuationToken?: string };

    if (response.Contents) {
      objects.push(...response.Contents.map((obj: { Key?: string }) => obj.Key!).filter(Boolean));
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

/**
 * Check if object exists in R2
 */
async function objectExistsInR2(key: string): Promise<boolean> {
  try {
    await r2Client.send(new GetObjectCommand({
      Bucket: DEST_BUCKET,
      Key: key,
    }));
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * Migrate a single object
 */
async function migrateObject(key: string): Promise<void> {
  try {
    // Get object from S3
    console.log(`  Processing: ${key}`);
    
    const getResponse = await awsS3Client.send(new GetObjectCommand({
      Bucket: SOURCE_BUCKET,
      Key: key,
    }));

    if (!getResponse.Body) {
      throw new Error('No body in response');
    }

    const buffer = await streamToBuffer(getResponse.Body as Readable);
    const size = buffer.length;
    totalBytes += size;

    // Check if object already exists in R2
    const exists = await objectExistsInR2(key);
    if (exists) {
      console.log(`    ⏭️  Skipped (already exists)`);
      skippedObjects++;
      return;
    }

    if (!DRY_RUN) {
      // Upload to R2
      await r2Client.send(new PutObjectCommand({
        Bucket: DEST_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: getResponse.ContentType,
        CacheControl: getResponse.CacheControl,
        Metadata: getResponse.Metadata,
      }));
    }

    console.log(`    ✅ Migrated (${(size / 1024).toFixed(2)} KB)`);
    migratedObjects++;
    migratedBytes += size;
  } catch (error: any) {
    console.error(`    ❌ Failed: ${error.message}`);
    failedObjects++;
    errors.push({ key, error: error.message });
  }
}

/**
 * Main migration function
 */
async function migrate(prefix: string = ''): Promise<void> {
  console.log('\n🔍 Listing objects to migrate...');
  console.log('-'.repeat(60));

  const objects = await listAllObjects(SOURCE_BUCKET, prefix);
  totalObjects = objects.length;

  if (totalObjects === 0) {
    console.log('No objects found in source bucket.');
    return;
  }

  console.log(`Found ${totalObjects} object(s) to migrate\n`);

  if (DRY_RUN) {
    console.log('📋 Dry run - listing objects that would be migrated:\n');
    for (const obj of objects) {
      console.log(`  - ${obj}`);
    }
    console.log('\n✅ Dry run complete.');
    console.log(`To execute the migration, run: DRY_RUN=false bun run scripts/migrate-s3-to-r2.ts`);
    return;
  }

  console.log('🚀 Starting migration...');
  console.log('-'.repeat(60));
  console.log('');

  // Migrate objects with progress
  for (let i = 0; i < objects.length; i++) {
    const key = objects[i];
    console.log(`[${i + 1}/${totalObjects}]`, '');
    await migrateObject(key);
    console.log('');
  }

  // Print summary
  console.log('='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total Objects:      ${totalObjects}`);
  console.log(`Migrated:           ${migratedObjects}`);
  console.log(`Skipped:            ${skippedObjects}`);
  console.log(`Failed:             ${failedObjects}`);
  console.log(`Total Size:          ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Migrated Size:       ${(migratedBytes / 1024 / 1024).toFixed(2)} MB`);

  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(({ key, error }) => {
      console.log(`  - ${key}: ${error}`);
    });
  }

  if (failedObjects === 0) {
    console.log('\n✅ Migration completed successfully!');
  } else {
    console.log(`\n⚠️  Migration completed with ${failedObjects} error(s)`);
  }
}

/**
 * Verify migration
 */
async function verifyMigration(): Promise<void> {
  console.log('\n🔍 Verifying migration...');
  console.log('-'.repeat(60));

  const sourceObjects = await listAllObjects(SOURCE_BUCKET);
  const destObjects = await listAllObjects(DEST_BUCKET);

  const missingInDest = sourceObjects.filter(obj => !destObjects.includes(obj));

  if (missingInDest.length === 0) {
    console.log('✅ All objects verified - no missing objects');
  } else {
    console.log(`⚠️  ${missingInDest.length} object(s) missing in destination:`);
    missingInDest.forEach(obj => console.log(`  - ${obj}`));
  }

  console.log(`\nSource objects:  ${sourceObjects.length}`);
  console.log(`Dest objects:    ${destObjects.length}`);
}

// Main execution
(async () => {
  try {
    const prefix = process.argv[2] || '';
    const mode = process.argv[3] || 'migrate';

    if (mode === 'verify') {
      await verifyMigration();
    } else {
      await migrate(prefix);
      // Automatically verify after migration
      if (!DRY_RUN && failedObjects === 0) {
        console.log('\n');
        await verifyMigration();
      }
    }

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
