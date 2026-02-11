# Cloudflare R2 Migration Guide

## Overview

This guide provides comprehensive documentation for migrating from AWS S3 to Cloudflare R2 storage. R2 is an S3-compatible object storage service with zero egress fees, making it a cost-effective alternative for applications that serve user-uploaded content.

## Table of Contents

1. [Cloudflare R2 Overview](#cloudflare-r2-overview)
2. [Prerequisites](#prerequisites)
3. [Setup Cloudflare R2](#setup-cloudflare-r2)
4. [Environment Variables](#environment-variables)
5. [Code Changes](#code-changes)
6. [Migration Steps](#migration-steps)
7. [Key Differences from AWS S3](#key-differences-from-aws-s3)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Cloudflare R2 Overview

### What is Cloudflare R2?

Cloudflare R2 is object storage that is compatible with the S3 API. Key features:

- **S3-Compatible API**: Uses the same API as AWS S3, enabling easy migration
- **Zero Egress Fees**: No bandwidth charges for downloading data (major cost savings)
- **Same SDK Support**: Can use existing AWS SDK v3 for JavaScript/TypeScript
- **Presigned URLs**: Supports presigned URLs for temporary access
- **Multipart Uploads**: Full support for multipart uploads with same limitations as S3
- **Edge Performance**: Built on Cloudflare's global network for low latency

### Pricing Benefits

The main advantage of R2 over S3:
- **S3**: $0.09/GB for egress (data transfer out)
- **R2**: $0.00/GB for egress (completely free!)

For applications that serve a lot of images or user-generated content, this can result in significant cost savings.

---

## Prerequisites

### Required Accounts and Tools

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Existing Codebase**: Next.js 16 app with TypeScript and Bun runtime

### Current AWS S3 Implementation

The application currently uses:
- `@aws-sdk/client-s3` for S3 operations
- `@aws-sdk/s3-request-presigner` for presigned URLs
- Environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`

### Files Using S3

- `src/lib/s3.ts` - S3 client and all storage operations
- `src/lib/thumbnail-generator.ts` - Downloads/uploads images from S3
- `src/app/api/upload/route.ts` - Uses S3 for uploads
- `src/app/api/upload/chunk/route.ts` - Multipart upload operations
- `src/app/api/upload/complete/route.ts` - Upload completion

---

## Setup Cloudflare R2

### Step 1: Create an R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage** (under "Storage & Databases")
3. Click **Create bucket**
4. Enter a bucket name (e.g., `luminary-lab-uploads`)
5. Choose a location (default is fine)
6. Click **Create bucket**

### Step 2: Generate API Access Keys

1. In the Cloudflare Dashboard, go to **R2 Object Storage** → **Manage R2 API Tokens**
2. Click **Create API Token**
3. Create a new token with:
   - **Permissions**: `Read & Write` access to your bucket
4. Copy the following credentials:
   - **Access Key ID** - save as `CLOUDFLARE_R2_ACCESS_KEY_ID`
   - **Secret Access Key** - save as `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
   - **Account ID** - find this in the Cloudflare Dashboard URL or in your profile settings

### Step 3: Configure CORS (Optional but Recommended)

If you allow direct browser uploads to R2, configure CORS:

1. Go to your bucket in R2
2. Click **Settings** → **CORS Policy**
3. Add a CORS policy:

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Environment Variables

### Update `.env` File

Replace AWS S3 environment variables with R2 equivalents:

```env
# Remove these AWS S3 variables:
# AWS_S3_BUCKET=your-bucket-name
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# AWS_REGION=us-east-1

# Add these Cloudflare R2 variables:
CLOUDFLARE_R2_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com

# Optional: Public URL for accessing files (if using custom domain)
CLOUDFLARE_R2_PUBLIC_URL=https://your-custom-domain.com
```

### Update `.env.example` File

Add R2 variables to the example file:

```env
# Cloudflare R2 (Alternative to AWS S3)
CLOUDFLARE_R2_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

---

## Code Changes

### Main Changes in `src/lib/s3.ts`

The S3 client initialization needs to be updated to use the R2 endpoint:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, ListPartsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

let s3ClientSingleton: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3ClientSingleton) return s3ClientSingleton;

  // R2 Environment Variables
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('Cloudflare R2 environment variables are not set');
  }

  // R2 uses "auto" for region and requires endpoint configuration
  s3ClientSingleton = new S3Client({
    region: 'auto', // Required by SDK but not used by R2
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3ClientSingleton;
}

// Update all references to process.env.AWS_S3_BUCKET to process.env.CLOUDFLARE_R2_BUCKET_NAME

export async function generateUploadUrl(
  key: string, 
  contentType: string, 
  expiresIn: number = 3600
): Promise<string> {
  const s3Client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!, // Changed from AWS_S3_BUCKET
    Key: key,
    ContentType: contentType,
    CacheControl: 'max-age=31536000',
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function generateDownloadUrl(
  key: string, 
  expiresIn: number = 3600
): Promise<string> {
  const s3Client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!, // Changed from AWS_S3_BUCKET
    Key: key,
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function uploadFile(
  key: string, 
  buffer: Buffer, 
  contentType: string
): Promise<void> {
  const s3Client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!, // Changed from AWS_S3_BUCKET
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'max-age=31536000',
  });

  await s3Client.send(command);
}

export async function deleteFile(key: string): Promise<void> {
  const s3Client = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!, // Changed from AWS_S3_BUCKET
    Key: key,
  });

  await s3Client.send(command);
}

// Update multipart upload functions similarly...
```

### Changes in `src/lib/thumbnail-generator.ts`

Update the S3 client initialization:

```typescript
function getS3Client(): S3Client {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 environment variables are not set');
  }

  return new S3Client({
    region: 'auto', // Changed from process.env.AWS_REGION
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}
```

And update the `process.env.AWS_S3_BUCKET` references to `process.env.CLOUDFLARE_R2_BUCKET_NAME`:

```typescript
export async function downloadImageFromS3(storageKey: string): Promise<Buffer> {
  const s3Client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!, // Changed from AWS_S3_BUCKET
    Key: storageKey,
  });

  const response = await s3Client.send(command);
  
  if (!response.Body) {
    throw new Error('No body in S3 response');
  }

  // ... rest of the function remains the same
}
```

### Alternative: Conditional Provider

If you want to support both AWS S3 and R2 (or gradually migrate), create a conditional provider:

```typescript
function getS3Client(): S3Client {
  if (s3ClientSingleton) return s3ClientSingleton;

  // Check which provider to use
  const useR2 = process.env.CLOUDFLARE_R2_ACCOUNT_ID;

  if (useR2) {
    // Use Cloudflare R2
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error('Cloudflare R2 environment variables are not set');
    }

    s3ClientSingleton = new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  } else {
    // Use AWS S3 (legacy)
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error('AWS S3 environment variables are not set');
    }

    s3ClientSingleton = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return s3ClientSingleton;
}

// Helper function to get bucket name
function getBucketName(): string {
  if (process.env.CLOUDFLARE_R2_ACCOUNT_ID) {
    return process.env.CLOUDFLARE_R2_BUCKET_NAME!;
  }
  return process.env.AWS_S3_BUCKET!;
}
```

---

## Migration Steps

### Step 1: Install Dependencies (No Changes Required)

The AWS SDK v3 works with R2 out of the box. No new dependencies needed:

```bash
# Already installed - no action needed
bun install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Step 2: Update Environment Variables

1. Update `.env` with R2 credentials
2. Update `.env.example` with R2 variables
3. Run `bun dev` to restart development server

### Step 3: Update Code Files

Make the following file updates:

1. **`src/lib/s3.ts`**: Update `getS3Client()` and replace `AWS_S3_BUCKET` with `CLOUDFLARE_R2_BUCKET_NAME`
2. **`src/lib/thumbnail-generator.ts`**: Update `getS3Client()` and replace `AWS_S3_BUCKET` references

### Step 4: Test Uploads

Test the upload functionality:

1. Start the dev server: `bun dev`
2. Navigate to the upload page
3. Upload a test image
4. Verify the file appears in your R2 bucket

### Step 5: Data Migration (If Existing Data)

If you have existing data in AWS S3 that needs to be migrated:

#### Option A: AWS CLI with R2 Endpoint

```bash
# Install AWS CLI if not already installed
# Using aws cli to sync from S3 to R2

export AWS_ACCESS_KEY_ID=your-r2-access-key-id
export AWS_SECRET_ACCESS_KEY=your-r2-secret-access-key
export AWS_DEFAULT_REGION=auto

# Sync from S3 to R2
aws s3 sync s3://your-aws-bucket s3://your-r2-bucket \
  --endpoint-url https://your-account-id.r2.cloudflarestorage.com \
  --no-follow-symlinks
```

#### Option B: Rclone (Recommended for Large Files)

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure rclone
rclone config

# When prompted:
# - Name: s3-r2
# - Type: S3
# - Provider: Cloudflare R2
# - Access Key ID: your-r2-access-key-id
# - Secret Access Key: your-r2-secret-access-key
# - Region: auto
# - Endpoint: https://your-account-id.r2.cloudflarestorage.com

# Sync data
rclone sync s3:your-aws-bucket s3-r2:your-r2-bucket --progress
```

### Step 6: Update Database (If URLs Are Stored)

If you have absolute URLs stored in the database, update them:

```sql
-- Update image URLs in database
UPDATE images 
SET url = REPLACE(url, 'https://your-s3-bucket.s3.amazonaws.com', 'https://your-r2-bucket.r2.cloudflarestorage.com')
WHERE url LIKE 'https://your-s3-bucket.s3.amazonaws.com%';
```

### Step 7: Clean Up AWS Resources

After confirming R2 works correctly:

1. Verify all uploads are working with R2
2. Monitor for a few days to ensure no issues
3. Clean up AWS S3 bucket and delete access keys

---

## Key Differences from AWS S3

### 1. Endpoint Configuration

**AWS S3**:
```typescript
new S3Client({
  region: 'us-east-1', // Actual AWS region
  credentials: { accessKeyId, secretAccessKey },
  // No endpoint needed
});
```

**Cloudflare R2**:
```typescript
new S3Client({
  region: 'auto', // Always "auto" for R2
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`, // Required
  credentials: { accessKeyId, secretAccessKey },
});
```

### 2. Region

- **AWS S3**: Actual region names (us-east-1, eu-west-2, etc.)
- **R2**: Always `"auto"` - region is not used but required by AWS SDK

### 3. Authentication

- **AWS S3**: Uses AWS IAM credentials or access keys
- **R2**: Uses R2 API tokens (access key ID and secret access key generated from Cloudflare dashboard)

### 4. Egress Fees

- **AWS S3**: Charged for data transfer out ($0.09/GB)
- **R2**: Zero egress fees - completely free to download data

### 5. Presigned URLs

Both work identically - no code changes needed:

```typescript
// Same for both AWS S3 and R2
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const command = new GetObjectCommand({
  Bucket: bucketName,
  Key: key,
});

const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
```

### 6. Multipart Uploads

R2 fully supports S3-compatible multipart uploads with the same limitations:

| Constraint | Value |
|------------|-------|
| Minimum part size | 5 MiB |
| Maximum part size | 5 GiB |
| Maximum number of parts | 10,000 |
| Parts must be same size | Yes, except last part |

### 7. ETags

- For uploads after June 21, 2023, R2's multipart ETags mimic S3 behavior
- Each part's ETag is MD5 hash of part content
- Final object ETag is hash of concatenated MD5 sums followed by a hyphen and part count

### 8. Object Lifecycle

- **R2 default**: Incomplete multipart uploads are automatically aborted after 7 days
- **AWS S3**: Configurable via lifecycle policies

### 9. Unsupported S3 Features (R2 Limitations)

R2 does not support all S3 features. Check the [Cloudflare R2 S3 API compatibility page](https://developers.cloudflare.com/r2/api/s3/api/) for the latest status.

Common unsupported features:
- Some advanced bucket configuration options
- Certain ACL configurations
- Some object metadata fields

---

## Testing

### Test Script

Create a test script to verify R2 integration:

```typescript
// test-r2.ts
import { uploadFile, generateDownloadUrl, deleteFile } from './src/lib/s3';
import { Buffer } from 'node:buffer';

async function testR2() {
  console.log('Testing Cloudflare R2 integration...');

  const testKey = 'test/test-image.jpg';
  const testContent = Buffer.from('Test file content');

  try {
    // 1. Upload a file
    console.log('1. Uploading file...');
    await uploadFile(testKey, testContent, 'image/jpeg');
    console.log('✓ Upload successful');

    // 2. Generate a download URL
    console.log('2. Generating download URL...');
    const downloadUrl = await generateDownloadUrl(testKey, 60);
    console.log('✓ Download URL generated:', downloadUrl);

    // 3. Test the download URL
    console.log('3. Testing download URL...');
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    const downloadedContent = await response.text();
    if (downloadedContent !== 'Test file content') {
      throw new Error('Downloaded content does not match');
    }
    console.log('✓ Download successful');

    // 4. Delete the file
    console.log('4. Deleting file...');
    await deleteFile(testKey);
    console.log('✓ Delete successful');

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testR2();
```

Run the test:

```bash
bun test-r2.ts
```

### Multipart Upload Test

Test multipart uploads:

```typescript
// test-multipart.ts
import {
  createMultipartUpload,
  generatePartUploadUrl,
  completeMultipartUpload,
  abortMultipartUpload,
} from './src/lib/s3';

async function testMultipartUpload() {
  console.log('Testing multipart upload to Cloudflare R2...');

  const testKey = 'multipart-test/large-file.bin';
  const testContent = Buffer.alloc(20 * 1024 * 1024); // 20MB file
  const contentType = 'application/octet-stream';

  try {
    // 1. Create multipart upload
    console.log('1. Creating multipart upload...');
    const { uploadId } = await createMultipartUpload(testKey, contentType);
    console.log('✓ Upload ID:', uploadId);

    // 2. Upload parts (uploading 3 parts for testing)
    console.log('2. Uploading parts...');
    const partSize = 10 * 1024 * 1024; // 10MB
    const parts = [];

    for (let i = 1; i <= 3; i++) {
      const partUrl = await generatePartUploadUrl(testKey, uploadId, i);
      const partContent = testContent.slice((i - 1) * partSize, i * partSize);
      
      const response = await fetch(partUrl, {
        method: 'PUT',
        body: partContent,
      });

      if (!response.ok) {
        throw new Error(`Part ${i} upload failed: ${response.statusText}`);
      }

      const etag = response.headers.get('ETag');
      parts.push({ partNumber: i, etag: etag! });
      console.log(`  ✓ Part ${i} uploaded, ETag: ${etag}`);
    }

    // 3. Complete multipart upload
    console.log('3. Completing multipart upload...');
    const result = await completeMultipartUpload(testKey, uploadId, parts);
    console.log('✓ Upload completed, Location:', result.location);

    console.log('\n✅ Multipart upload test passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testMultipartUpload();
```

---

## Troubleshooting

### Common Issues

#### 1. "Endpoint connection refused" or "ECONNREFUSED"

**Problem**: Cannot connect to R2 endpoint.

**Solution**: 
- Verify your account ID is correct
- Check that the endpoint URL format is correct: `https://{ACCOUNT_ID}.r2.cloudflarestorage.com`
- Ensure you're not behind a corporate firewall blocking R2

#### 2. "Access Denied" or "403 Forbidden"

**Problem**: Authentication failure.

**Solution**:
- Verify `CLOUDFLARE_R2_ACCESS_KEY_ID` and `CLOUDFLARE_R2_SECRET_ACCESS_KEY` are correct
- Ensure the API token has Read & Write permissions for your bucket
- Check that the bucket name in `CLOUDFLARE_R2_BUCKET_NAME` matches exactly

#### 3. "Bucket does not exist"

**Problem**: Bucket name is incorrect.

**Solution**:
- Verify `CLOUDFLARE_R2_BUCKET_NAME` matches your actual bucket name
- Check the Cloudflare Dashboard to confirm the bucket exists

#### 4. Presigned URL returns "SignatureDoesNotMatch"

**Problem**: Presigned URL signature validation fails.

**Solution**:
- Ensure you're using the same credentials for generating and using the URL
- Check that the endpoint is configured correctly in the S3Client
- Verify the request method (GET, PUT) matches what was presigned

#### 5. Multipart upload fails with "EntityTooSmall"

**Problem**: Part size is too small.

**Solution**:
- Ensure each part is at least 5MB
- All parts except the last one must be the same size

#### 6. "No such host"

**Problem**: DNS resolution failure.

**Solution**:
- Check your internet connection
- Verify the endpoint URL format
- Try using `dig` or `nslookup` to verify DNS resolution

### Debug Logging

Enable AWS SDK debug logging:

```typescript
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
  logger: {
    debug: (message) => console.log('[S3 Debug]', message),
    info: (message) => console.log('[S3 Info]', message),
    warn: (message) => console.warn('[S3 Warn]', message),
    error: (message) => console.error('[S3 Error]', message),
  },
});
```

### Verify Configuration

Add this test to verify your configuration:

```typescript
// verify-r2-config.ts
import { ListBucketsCommand } from '@aws-sdk/client-s3';
import { getS3Client } from './src/lib/s3';

async function verifyConfig() {
  console.log('Verifying Cloudflare R2 configuration...\n');

  console.log('Environment Variables:');
  console.log('  Account ID:', process.env.CLOUDFLARE_R2_ACCOUNT_ID ? '✓ Set' : '✗ Missing');
  console.log('  Access Key ID:', process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ? '✓ Set' : '✗ Missing');
  console.log('  Secret Access Key:', process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ? '✓ Set' : '✗ Missing');
  console.log('  Bucket Name:', process.env.CLOUDFLARE_R2_BUCKET_NAME ? '✓ Set' : '✗ Missing');
  console.log('  Endpoint:', process.env.CLOUDFLARE_R2_ENDPOINT);

  console.log('\nTesting connection...');

  try {
    const s3Client = getS3Client();
    const response = await s3Client.send(new ListBucketsCommand({}));

    console.log('✓ Connection successful!');
    console.log('  Buckets:', response.Buckets?.map(b => b.Name).join(', '));
  } catch (error) {
    console.error('✗ Connection failed:', error);
    throw error;
  }
}

verifyConfig();
```

---

## Summary

### Key Takeaways

1. **No New Dependencies**: The AWS SDK v3 works with R2 out of the box
2. **Simple Configuration**: Only need to change the endpoint URL and credentials
3. **Same API**: All S3 operations work identically with R2
4. **Presigned URLs**: Work exactly the same way
5. **Multipart Uploads**: Fully supported with same limitations as S3
6. **Cost Savings**: Zero egress fees can significantly reduce costs

### Migration Checklist

- [ ] Create R2 bucket in Cloudflare Dashboard
- [ ] Generate R2 API tokens
- [ ] Update `.env` with R2 credentials
- [ ] Update `.env.example` with R2 variables
- [ ] Update `src/lib/s3.ts` client configuration
- [ ] Update `src/lib/thumbnail-generator.ts` client configuration
- [ ] Test single-file uploads
- [ ] Test multipart uploads
- [ ] Test presigned URL generation and usage
- [ ] Migrate existing data (if applicable)
- [ ] Update database URLs (if applicable)
- [ ] Monitor production for a few days
- [ ] Clean up AWS S3 resources (after successful migration)

---

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 S3 API Compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
- [R2 Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [R2 Multipart Upload](https://developers.cloudflare.com/r2/objects/multipart-objects/)
- [AWS SDK v3 Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)

---

## Support

If you encounter issues during migration:

1. Check the Cloudflare Dashboard for any R2 service status issues
2. Review the R2 API compatibility documentation for unsupported features
3. Enable debug logging as shown above
4. Verify all environment variables are set correctly
5. Test with the verification script provided
