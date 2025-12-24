import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

let s3ClientSingleton: S3Client | null = null;

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

export async function generateUploadUrl(
  key: string, 
  contentType: string, 
  expiresIn: number = 3600
): Promise<string> {
  const s3Client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    ContentType: contentType,
    CacheControl: 'max-age=31536000', // 1 year
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function generateDownloadUrl(
  key: string, 
  expiresIn: number = 3600
): Promise<string> {
  const s3Client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
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
    Bucket: process.env.AWS_S3_BUCKET!,
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
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
  });

  await s3Client.send(command);
}

// Generate unique file key for storage
export function generateFileKey(
  userId: string, 
  projectId: string, 
  filename: string, 
  type: 'original' | 'processed' | 'thumbnail'
): string {
  const timestamp = Date.now();
  const hash = crypto.createHash('md5').update(filename).digest('hex');
  return `users/${userId}/projects/${projectId}/${type}/${timestamp}-${hash}`;
}

// Validate file type (RAW formats)
export const RAW_MIME_TYPES = {
  'image/x-canon-cr2': '.cr2',
  'image/x-nikon-nef': '.nef',
  'image/x-sony-arw': '.arw',
  'image/x-adobe-dng': '.dng',
  'image/x-fuji-raf': '.raf',
  'image/x-panasonic-rw2': '.rw2',
  'image/x-olympus-orf': '.orf',
  'image/x-pentax-pef': '.pef',
} as const;

export function isValidRawFile(mimeType: string): boolean {
  return mimeType in RAW_MIME_TYPES;
}
