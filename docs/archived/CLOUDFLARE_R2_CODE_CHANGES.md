# Cloudflare R2 Code Changes - Quick Reference

## File: `src/lib/s3.ts`

### Change 1: Update `getS3Client()` function

**Before (AWS S3)**:
```typescript
function getS3Client(): S3Client {
  if (s3ClientSingleton) return s3ClientSingleton;

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

  return s3ClientSingleton;
}
```

**After (Cloudflare R2)**:
```typescript
function getS3Client(): S3Client {
  if (s3ClientSingleton) return s3ClientSingleton;

  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 environment variables are not set');
  }

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
```

### Change 2: Replace `AWS_S3_BUCKET` with `CLOUDFLARE_R2_BUCKET_NAME`

**Find and replace all occurrences** of `process.env.AWS_S3_BUCKET!` with `process.env.CLOUDFLARE_R2_BUCKET_NAME!`

Affected functions:
- `generateUploadUrl()`
- `generateDownloadUrl()`
- `uploadFile()`
- `deleteFile()`
- `createMultipartUpload()`
- `generatePartUploadUrl()`
- `uploadPart()`
- `listParts()`
- `completeMultipartUpload()`
- `abortMultipartUpload()`

---

## File: `src/lib/thumbnail-generator.ts`

### Change 1: Update `getS3Client()` function

**Before (AWS S3)**:
```typescript
function getS3Client(): S3Client {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error('AWS S3 environment variables are not set');
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}
```

**After (Cloudflare R2)**:
```typescript
function getS3Client(): S3Client {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 environment variables are not set');
  }

  return new S3Client({
    region: 'auto', // Required by SDK but not used by R2
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}
```

### Change 2: Replace `AWS_S3_BUCKET` with `CLOUDFLARE_R2_BUCKET_NAME` in `downloadImageFromS3()`

**Before**:
```typescript
const command = new GetObjectCommand({
  Bucket: process.env.AWS_S3_BUCKET!,
  Key: storageKey,
});
```

**After**:
```typescript
const command = new GetObjectCommand({
  Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
  Key: storageKey,
});
```

---

## File: `.env`

**Remove these lines**:
```env
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

**Add these lines**:
```env
CLOUDFLARE_R2_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

---

## File: `.env.example`

**Add these lines**:
```env
# Cloudflare R2 (Alternative to AWS S3)
CLOUDFLARE_R2_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

---

## Optional: Support Both Providers

If you want to support both AWS S3 and R2 with conditional logic:

### File: `src/lib/s3.ts` - Add conditional provider

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

Then replace all `process.env.AWS_S3_BUCKET!` and `process.env.CLOUDFLARE_R2_BUCKET_NAME!` with `getBucketName()`.

---

## Summary of Changes

| File | Change Type | Description |
|------|------------|-------------|
| `src/lib/s3.ts` | Update `getS3Client()` | Change from AWS credentials to R2 credentials, add endpoint |
| `src/lib/s3.ts` | Replace bucket env var | Change `AWS_S3_BUCKET` to `CLOUDFLARE_R2_BUCKET_NAME` |
| `src/lib/thumbnail-generator.ts` | Update `getS3Client()` | Same changes as s3.ts |
| `src/lib/thumbnail-generator.ts` | Replace bucket env var | Change `AWS_S3_BUCKET` to `CLOUDFLARE_R2_BUCKET_NAME` |
| `.env` | Replace env vars | Remove AWS vars, add R2 vars |
| `.env.example` | Add R2 vars | Add example R2 configuration |

---

## What Doesn't Need to Change

✅ **No changes needed to:**
- AWS SDK imports (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- Presigned URL generation (`getSignedUrl`)
- Multipart upload logic
- File upload operations
- File download operations
- File delete operations
- All API routes using the S3 client

The migration is primarily configuration-only - no logic changes required!
