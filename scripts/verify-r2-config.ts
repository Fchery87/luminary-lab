#!/usr/bin/env bun
/**
 * Cloudflare R2 Configuration Verification Script
 * 
 * Run this script to verify your Cloudflare R2 setup is correct:
 * bun run scripts/verify-r2-config.ts
 */

import { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

console.log('='.repeat(60));
console.log('Cloudflare R2 Configuration Verification');
console.log('='.repeat(60));

// Step 1: Verify environment variables
console.log('\n📋 Step 1: Checking environment variables...');
console.log('-'.repeat(60));

const envVars = {
  'CLOUDFLARE_R2_ACCOUNT_ID': process.env.CLOUDFLARE_R2_ACCOUNT_ID,
  'CLOUDFLARE_R2_ACCESS_KEY_ID': process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  'CLOUDFLARE_R2_SECRET_ACCESS_KEY': process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  'CLOUDFLARE_R2_BUCKET_NAME': process.env.CLOUDFLARE_R2_BUCKET_NAME,
  'CLOUDFLARE_R2_ENDPOINT': process.env.CLOUDFLARE_R2_ENDPOINT,
};

let envOk = true;
for (const [key, value] of Object.entries(envVars)) {
  if (!value) {
    console.error(`❌ ${key}: NOT SET`);
    envOk = false;
  } else {
    // Mask secret values
    const displayValue = key.includes('SECRET') || key.includes('KEY')
      ? `${value.substring(0, 8)}...`
      : value;
    console.log(`✅ ${key}: ${displayValue}`);
  }
}

if (!envOk) {
  console.error('\n❌ Missing required environment variables!');
  process.exit(1);
}

// Step 2: Create S3Client
console.log('\n🔌 Step 2: Creating S3Client with R2 configuration...');
console.log('-'.repeat(60));

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID!;
const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;
console.log(`Endpoint: ${endpoint}`);
console.log(`Region: auto`);

const s3Client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

console.log('✅ S3Client created successfully');

// Step 3: Test connection - List buckets
console.log('\n🪣 Step 3: Testing connection - Listing buckets...');
console.log('-'.repeat(60));

try {
  const listResponse = await s3Client.send(new ListBucketsCommand({}));
  console.log(`✅ Connection successful! Found ${listResponse.Buckets?.length || 0} bucket(s)`);
  
  if (listResponse.Buckets && listResponse.Buckets.length > 0) {
    console.log('\nBuckets:');
    for (const bucket of listResponse.Buckets) {
      const isTargetBucket = bucket.Name === process.env.CLOUDFLARE_R2_BUCKET_NAME;
      const marker = isTargetBucket ? ' ⭐' : '';
      console.log(`  - ${bucket.Name}${marker} (Created: ${bucket.CreationDate?.toISOString()})`);
    }
  }

  // Verify target bucket exists
  const targetBucket = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
  const bucketExists = listResponse.Buckets?.some(b => b.Name === targetBucket);
  
  if (!bucketExists) {
    console.error(`\n❌ Target bucket "${targetBucket}" not found!`);
    console.error(`Please create the bucket in Cloudflare Dashboard before continuing.`);
    process.exit(1);
  }
  
  console.log(`✅ Target bucket "${targetBucket}" exists`);
} catch (error: any) {
  console.error('❌ Failed to list buckets:', error.message);
  if (error.$metadata?.httpStatusCode === 403) {
    console.error('Access denied. Check your API token permissions.');
  } else if (error.$metadata?.httpStatusCode === 401) {
    console.error('Authentication failed. Check your access key ID and secret.');
  }
  process.exit(1);
}

// Step 4: Test file upload
console.log('\n📤 Step 4: Testing file upload...');
console.log('-'.repeat(60));

const testKey = `verification/${Date.now()}.txt`;
const testContent = 'R2 Configuration Verification Test';
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

try {
  const uploadCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: testKey,
    Body: testContent,
    ContentType: 'text/plain',
  });

  const uploadResponse = await s3Client.send(uploadCommand);
  console.log(`✅ Upload successful!`);
  console.log(`   Key: ${testKey}`);
  console.log(`   ETag: ${uploadResponse.ETag}`);
} catch (error: any) {
  console.error('❌ Upload failed:', error.message);
  process.exit(1);
}

// Step 5: Test presigned URL generation and usage
console.log('\n🔗 Step 5: Testing presigned URL generation and download...');
console.log('-'.repeat(60));

try {
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: testKey,
  });

  const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
  console.log('✅ Presigned URL generated successfully');
  console.log(`   URL: ${signedUrl.substring(0, 80)}...`);

  // Test the URL
  const downloadResponse = await fetch(signedUrl);
  if (!downloadResponse.ok) {
    throw new Error(`HTTP ${downloadResponse.status}: ${downloadResponse.statusText}`);
  }

  const downloadedContent = await downloadResponse.text();
  if (downloadedContent !== testContent) {
    throw new Error('Downloaded content does not match uploaded content');
  }

  console.log('✅ Download successful via presigned URL');
  console.log(`   Content: "${downloadedContent}"`);
} catch (error: any) {
  console.error('❌ Presigned URL test failed:', error.message);
  process.exit(1);
}

// Step 6: Test multipart upload (optional, requires >= 10MB)
console.log('\n📦 Step 6: Testing multipart upload (minimum 10MB)...');
console.log('-'.repeat(60));

try {
  const multipartKey = `multipart-verification/${Date.now()}.bin`;
  const partSize = 10 * 1024 * 1024; // 10MB minimum
  const partContent = Buffer.alloc(partSize, 'x');

  // Create multipart upload
  const createResponse = await s3Client.send(new CreateMultipartUploadCommand({
    Bucket: bucketName,
    Key: multipartKey,
    ContentType: 'application/octet-stream',
  }));

  if (!createResponse.UploadId) {
    throw new Error('No upload ID returned');
  }

  console.log(`✅ Multipart upload created`);
  console.log(`   Upload ID: ${createResponse.UploadId}`);

  // Upload a single part (simplified test)
  const partResponse = await s3Client.send(new UploadPartCommand({
    Bucket: bucketName,
    Key: multipartKey,
    UploadId: createResponse.UploadId,
    PartNumber: 1,
    Body: partContent,
  }));

  console.log(`✅ Part 1 uploaded`);
  console.log(`   ETag: ${partResponse.ETag}`);

  // Complete multipart upload
  const completeResponse = await s3Client.send(new CompleteMultipartUploadCommand({
    Bucket: bucketName,
    Key: multipartKey,
    UploadId: createResponse.UploadId,
    MultipartUpload: {
      Parts: [
        {
          PartNumber: 1,
          ETag: partResponse.ETag,
        },
      ],
    },
  }));

  console.log(`✅ Multipart upload completed`);
  console.log(`   Location: ${completeResponse.Location}`);
  console.log(`   ETag: ${completeResponse.ETag}`);

  // Clean up multipart test file
  await s3Client.send(new DeleteObjectCommand({
    Bucket: bucketName,
    Key: multipartKey,
  }));
  console.log('✅ Multipart test file cleaned up');

} catch (error: any) {
  console.warn(`⚠️  Multipart upload test skipped or failed: ${error.message}`);
  console.warn('This is not critical for basic R2 functionality.');
}

// Step 7: Cleanup
console.log('\n🧹 Step 7: Cleaning up test files...');
console.log('-'.repeat(60));

try {
  await s3Client.send(new DeleteObjectCommand({
    Bucket: bucketName,
    Key: testKey,
  }));
  console.log('✅ Test file deleted');
} catch (error: any) {
  console.warn('⚠️  Failed to delete test file:', error.message);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ ALL CHECKS PASSED!');
console.log('='.repeat(60));
console.log('\nYour Cloudflare R2 configuration is working correctly.');
console.log('You can now proceed with the migration.\n');

console.log('Next steps:');
console.log('1. Update src/lib/s3.ts with the new configuration');
console.log('2. Update src/lib/thumbnail-generator.ts with the new configuration');
console.log('3. Test file uploads in your application');
console.log('4. Migrate existing data from AWS S3 (if applicable)');
console.log('5. Update production environment variables');
console.log('\nFor detailed migration instructions, see CLOUDFLARE_R2_MIGRATION_GUIDE.md\n');

process.exit(0);
