# Cloudflare R2 Migration - Executive Summary

## Overview

This document provides a quick reference for migrating the Luminary Lab application from AWS S3 to Cloudflare R2.

## Why Migrate to Cloudflare R2?

**Main Benefit: Zero Egress Fees**

- **AWS S3**: $0.09 per GB for data transfer out
- **Cloudflare R2**: $0.00 per GB for data transfer out

For image-heavy applications like Luminary Lab, this can result in significant cost savings.

## Technical Approach

R2 provides an **S3-compatible API**, which means:
- ✅ No new dependencies required
- ✅ Same AWS SDK v3 packages work with R2
- ✅ Minimal code changes (configuration only)
- ✅ All existing features work (presigned URLs, multipart uploads, etc.)

## Quick Start Migration

### Step 1: Set Up Cloudflare R2 (5 minutes)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → R2 Object Storage
2. Create a bucket (e.g., `luminary-lab-uploads`)
3. Go to "Manage R2 API Tokens" → Create API Token
4. Copy:
   - Account ID
   - Access Key ID
   - Secret Access Key

### Step 2: Update Environment Variables

Replace in `.env`:

```env
# Remove these:
# AWS_S3_BUCKET=your-bucket-name
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# AWS_REGION=us-east-1

# Add these:
CLOUDFLARE_R2_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

### Step 3: Update Code (2 files)

**File 1: `src/lib/s3.ts`**

```typescript
// Replace getS3Client() function:
function getS3Client(): S3Client {
  if (s3ClientSingleton) return s3ClientSingleton;

  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 environment variables are not set');
  }

  s3ClientSingleton = new S3Client({
    region: 'auto', // Always "auto" for R2
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3ClientSingleton;
}

// Replace all: process.env.AWS_S3_BUCKET! → process.env.CLOUDFLARE_R2_BUCKET_NAME!
```

**File 2: `src/lib/thumbnail-generator.ts`**

```typescript
// Same changes as src/lib/s3.ts:
// 1. Update getS3Client() function
// 2. Replace AWS_S3_BUCKET with CLOUDFLARE_R2_BUCKET_NAME
```

### Step 4: Verify Configuration

```bash
# Verify R2 setup works
bun run r2:verify
```

### Step 5: Test the Application

```bash
# Start dev server
bun dev

# Test file upload in the browser
# Check R2 bucket in Cloudflare Dashboard
```

### Step 6: Migrate Existing Data (Optional)

If you have existing data in AWS S3:

```bash
# Dry run to see what will be migrated
bun run r2:migrate:dry-run

# Execute migration
bun run r2:migrate

# Verify migration
bun run r2:verify-migration
```

---

## Key Configuration Differences

| Aspect | AWS S3 | Cloudflare R2 |
|--------|---------|---------------|
| **Region** | Actual region (us-east-1) | Always `"auto"` |
| **Endpoint** | Not needed | Required: `https://{ACCOUNT_ID}.r2.cloudflarestorage.com` |
| **Credentials** | AWS IAM or Access Keys | R2 API Token |
| **Egress Cost** | $0.09/GB | $0.00/GB ✅ |
| **Presigned URLs** | ✅ Supported | ✅ Supported (same code) |
| **Multipart Uploads** | ✅ Supported | ✅ Supported (same code) |

---

## Files Changed Summary

| File | Changes |
|------|----------|
| `src/lib/s3.ts` | Update S3Client config, replace bucket env var |
| `src/lib/thumbnail-generator.ts` | Update S3Client config, replace bucket env var |
| `.env` | Replace AWS vars with R2 vars |
| `.env.example` | Add R2 vars as example |
| `package.json` | Added R2 verification & migration scripts |

**Files NOT changed**:
- All API routes (`src/app/api/upload/*`)
- Multipart upload logic
- Presigned URL generation
- All other functionality

---

## Testing Checklist

- [ ] Run `bun run r2:verify` and see all checks pass
- [ ] Upload a test file via the application
- [ ] Verify file appears in R2 bucket
- [ ] Test presigned URL download
- [ ] Test multipart upload (files > 10MB)
- [ ] Test thumbnail generation
- [ ] Test file deletion

---

## Rollback Plan

If you need to rollback to AWS S3:

1. Restore AWS environment variables in `.env`
2. Revert `getS3Client()` function in both files
3. Revert bucket env var references
4. Run `bun dev` to restart
5. Test uploads

---

## Cost Comparison Example

Assume 1 TB of data transferred out per month:

| Service | Egress Cost | Annual Savings |
|---------|-------------|---------------|
| AWS S3 | 1024 GB × $0.09 = $91.77/month | $0 |
| Cloudflare R2 | 1024 GB × $0.00 = $0.00/month | $1,101/year ✅ |

For higher usage, savings scale proportionally.

---

## Available Scripts

```bash
# Verify R2 configuration
bun run r2:verify

# Migrate data from S3 to R2 (dry run)
bun run r2:migrate:dry-run

# Execute migration
bun run r2:migrate

# Verify migration completed successfully
bun run r2:verify-migration
```

---

## Documentation Files

1. **`CLOUDFLARE_R2_MIGRATION_GUIDE.md`** - Comprehensive migration documentation
2. **`CLOUDFLARE_R2_CODE_CHANGES.md`** - Detailed code change reference
3. **`CLOUDFLARE_R2_SUMMARY.md`** - This executive summary
4. **`scripts/verify-r2-config.ts`** - R2 configuration verification script
5. **`scripts/migrate-s3-to-r2.ts`** - Data migration script

---

## Support & Troubleshooting

### Common Issues

**"Endpoint connection refused"**
- Verify account ID is correct
- Check endpoint format: `https://{ACCOUNT_ID}.r2.cloudflarestorage.com`

**"Access Denied" / 403**
- Check API token has Read & Write permissions
- Verify access key ID and secret are correct

**"Bucket does not exist"**
- Verify bucket name matches exactly
- Create bucket in Cloudflare Dashboard if missing

**Presigned URL fails**
- Ensure same credentials used for generating and using URL
- Check endpoint is configured correctly

### Getting Help

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 S3 API Compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
- [R2 Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)

---

## Next Steps

1. ✅ Set up R2 bucket and API tokens
2. ✅ Update environment variables
3. ✅ Update code files
4. ✅ Run verification script
5. ✅ Test uploads in development
6. ✅ Migrate existing data (if needed)
7. ✅ Update production environment variables
8. ✅ Monitor production for stability
9. ✅ Clean up AWS S3 resources (after successful migration)

---

## Notes

- R2 is S3-compatible - same SDK, same API
- Only configuration changes required
- No application logic changes needed
- Zero egress fees = significant cost savings
- Migration is reversible (can rollback to S3)
