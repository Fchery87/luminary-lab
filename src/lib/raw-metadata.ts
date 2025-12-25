import { parse } from 'exifr';

export interface RawMetadata {
  // Camera Information
  make?: string;
  model?: string;
  lensModel?: string;
  lensMake?: string;
  
  // Image Properties
  width?: number;
  height?: number;
  orientation?: number;
  resolution?: { x: number; y: number };
  
  // Capture Information
  dateTime?: Date;
  iso?: number;
  aperture?: number;
  focalLength?: number;
  shutterSpeed?: number;
  exposureTime?: string;
  exposureProgram?: string;
  
  // Color Information
  whiteBalance?: string;
  colorSpace?: string;
  flash?: boolean;
  
  // GPS Information
  gps?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    direction?: number;
  };
  
  // File Information
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  bitsPerSample?: number[];
  samplesPerPixel?: number;
  compression?: string;
  
  // Software/Processing
  software?: string;
  artist?: string;
  copyright?: string;
  
  // Advanced
  exifVersion?: string;
  userComment?: string;
}

/**
 * Extract RAW metadata from a file path using exifr
 */
export async function extractRawMetadata(
  filePath: string,
  mimeType: string
): Promise<RawMetadata | null> {
  try {
    // Use exifr to extract metadata - supports RAW formats including CR2, NEF, ARW, DNG, etc.
    const options = {
      tiff: true, // Include TIFF tags
      exif: true, // Include EXIF tags
      ifd0: true, // Include IFD0 tags
      gps: true, // Include GPS data
      mergeTags: true, // Merge tags from different locations
    };

    const metadata = await parse(filePath, options);

    if (!metadata) {
      console.warn('No EXIF data found in file:', filePath);
      return null;
    }

    return buildMetadataObject(metadata, filePath, mimeType);

  } catch (error) {
    console.error('Error extracting RAW metadata from file:', error);
    return null;
  }
}

/**
 * Extract RAW metadata from a Buffer using exifr
 * This is used when files are uploaded directly to S3 and downloaded as buffers
 */
export async function extractRawMetadataFromBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<RawMetadata | null> {
  try {
    // Use exifr to extract metadata from buffer
    const options = {
      tiff: true, // Include TIFF tags
      exif: true, // Include EXIF tags
      ifd0: true, // Include IFD0 tags
      gps: true, // Include GPS data
      mergeTags: true, // Merge tags from different locations
    };

    const metadata = await parse(buffer, options);

    if (!metadata) {
      console.warn('No EXIF data found in buffer:', fileName);
      return null;
    }

    return buildMetadataObject(metadata, fileName, mimeType);

  } catch (error) {
    console.error('Error extracting RAW metadata from buffer:', error);
    return null;
  }
}

/**
 * Build the metadata object from exifr data
 */
function buildMetadataObject(
  metadata: any,
  fileName: string,
  mimeType: string
): RawMetadata {
  // Build the metadata object
  const result: RawMetadata = {
      // Camera Information
      make: metadata.Make,
      model: metadata.Model,
      lensMake: metadata.LensMake,
      lensModel: metadata.LensModel,

      // Image Properties
      width: metadata.PixelXDimension || metadata.ImageWidth || metadata.ExifImageWidth,
      height: metadata.PixelYDimension || metadata.ImageHeight || metadata.ExifImageHeight,
      orientation: metadata.Orientation,
      resolution: metadata.XResolution ? {
        x: metadata.XResolution,
        y: metadata.YResolution,
      } : undefined,

      // Capture Information
      dateTime: metadata.DateTimeOriginal || metadata.DateTime || metadata.CreateDate
        ? new Date(metadata.DateTimeOriginal || metadata.DateTime || metadata.CreateDate)
        : undefined,
      iso: metadata.ISO || metadata.ISOSpeedRatings || metadata.PhotographicSensitivity,
      aperture: metadata.FNumber,
      focalLength: metadata.FocalLength,
      exposureTime: formatExposureTime(metadata.ExposureTime),
      exposureProgram: getExposureProgramName(metadata.ExposureProgram),
      shutterSpeed: metadata.ExposureTime,

      // Color Information
      whiteBalance: getWhiteBalanceName(metadata.WhiteBalance),
      colorSpace: metadata.ColorSpace,
      flash: metadata.Flash !== undefined ? metadata.Flash > 0 : undefined,

      // GPS Information
      gps: metadata.latitude !== undefined && metadata.longitude !== undefined
        ? {
            latitude: metadata.latitude,
            longitude: metadata.longitude,
            altitude: metadata.GPSAltitude,
            direction: metadata.GPSImgDirection,
          }
        : undefined,

      // File Information
      bitsPerSample: metadata.BitsPerSample,
      samplesPerPixel: metadata.SamplesPerPixel,
      compression: metadata.Compression,

      // Software/Processing
      software: metadata.Software,
      artist: metadata.Artist,
      copyright: metadata.Copyright,

      // Advanced
      exifVersion: metadata.ExifVersion,
      userComment: metadata.UserComment,
    };

    // Add file-specific metadata
    result.fileName = fileName;
    result.mimeType = mimeType;

    // Additional processing for specific RAW formats
    if (mimeType.includes('dng') || mimeType.includes('image/x-adobe-dng')) {
      result.compression = result.compression || 'DNG Lossless';
    } else if (mimeType.includes('cr2') || mimeType.includes('image/x-canon-cr2')) {
      result.compression = result.compression || 'Canon CR2 Lossless';
    } else if (mimeType.includes('nef') || mimeType.includes('image/x-nikon-nef')) {
      result.compression = result.compression || 'Nikon NEF Lossless';
    } else if (mimeType.includes('arw') || mimeType.includes('image/x-sony-arw')) {
      result.compression = result.compression || 'Sony ARW Lossless';
    } else if (mimeType.includes('raf') || mimeType.includes('image/x-fuji-raf')) {
      result.compression = result.compression || 'Fujifilm RAF Lossless';
    } else if (mimeType.includes('rw2') || mimeType.includes('image/x-panasonic-rw2')) {
      result.compression = result.compression || 'Panasonic RW2 Lossless';
    } else if (mimeType.includes('orf') || mimeType.includes('image/x-olympus-orf')) {
      result.compression = result.compression || 'Olympus ORF Lossless';
    } else if (mimeType.includes('pef') || mimeType.includes('image/x-pentax-pef')) {
      result.compression = result.compression || 'Pentax PEF Lossless';
    }

    return result;
}

/**
 * Format exposure time as a readable string (e.g., "1/250", "1/60", "0.5")
 */
function formatExposureTime(exposureTime?: number): string | undefined {
  if (exposureTime === undefined || exposureTime === null) return undefined;

  // Convert to fraction if it's less than 1 second
  if (exposureTime < 1) {
    const reciprocal = Math.round(1 / exposureTime);
    return `1/${reciprocal}`;
  }

  // For longer exposures, use decimal
  return exposureTime.toFixed(2);
}

/**
 * Get exposure program name from EXIF value
 */
function getExposureProgramName(exposureProgram?: number): string | undefined {
  const programs: Record<number, string> = {
    0: 'Not defined',
    1: 'Manual',
    2: 'Normal program',
    3: 'Aperture priority',
    4: 'Shutter priority',
    5: 'Creative program',
    6: 'Action program',
    7: 'Portrait mode',
    8: 'Landscape mode',
    9: 'Bulb',
  };

  return exposureProgram !== undefined ? programs[exposureProgram] : undefined;
}

/**
 * Get white balance name from EXIF value
 */
function getWhiteBalanceName(whiteBalance?: number): string | undefined {
  const modes: Record<number, string> = {
    0: 'Auto',
    1: 'Manual',
    2: 'Auto (bracketing)',
    3: 'Daylight',
    4: 'Fluorescent',
    5: 'Tungsten',
    6: 'Flash',
    7: 'Custom',
  };

  return whiteBalance !== undefined ? modes[whiteBalance] : undefined;
}

/**
 * Generate an intelligent project name from metadata
 */
export function generateProjectName(metadata: RawMetadata): string {
  const parts: string[] = [];

  // Add camera model if available
  if (metadata.make && metadata.model) {
    parts.push(`${metadata.make} ${metadata.model}`);
  } else if (metadata.model) {
    parts.push(metadata.model);
  }

  // Add date if available
  if (metadata.dateTime) {
    const dateStr = metadata.dateTime.toISOString().split('T')[0];
    parts.push(dateStr);
  }

  // Fallback to generic name
  if (parts.length === 0) {
    return `Project ${new Date().toLocaleDateString()}`;
  }

  return parts.join(' - ');
}

/**
 * Extract tags from metadata
 */
export function extractTagsFromMetadata(metadata: RawMetadata): Array<{ name: string; type: string }> {
  const tags: Array<{ name: string; type: string }> = [];

  // Camera tag
  if (metadata.make && metadata.model) {
    tags.push({ name: `${metadata.make} ${metadata.model}`, type: 'camera' });
  } else if (metadata.model) {
    tags.push({ name: metadata.model, type: 'camera' });
  }

  // Lens tag
  if (metadata.lensModel) {
    tags.push({ name: metadata.lensModel, type: 'lens' });
  }

  // ISO range tags
  if (metadata.iso) {
    const isoRange = getIsoRange(metadata.iso);
    tags.push({ name: isoRange, type: 'iso_range' });
  }

  // Date range tag
  if (metadata.dateTime) {
    const dateRange = getDateRange(metadata.dateTime);
    tags.push({ name: dateRange, type: 'date_range' });
  }

  // Focal length tag
  if (metadata.focalLength) {
    const focalRange = getFocalLengthRange(metadata.focalLength);
    tags.push({ name: focalRange, type: 'focal_length' });
  }

  return tags;
}

/**
 * Get ISO range category
 */
function getIsoRange(iso: number): string {
  if (iso <= 200) return 'ISO Low (≤200)';
  if (iso <= 800) return 'ISO Medium (201-800)';
  if (iso <= 3200) return 'ISO High (801-3200)';
  return 'ISO Ultra High (>3200)';
}

/**
 * Get date range category
 */
function getDateRange(date: Date): string {
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'This Week';
  if (diffDays <= 30) return 'This Month';
  if (diffDays <= 365) return 'This Year';
  return date.getFullYear().toString();
}

/**
 * Get focal length range category
 */
function getFocalLengthRange(focalLength: number): string {
  if (focalLength <= 24) return 'Wide Angle (≤24mm)';
  if (focalLength <= 50) return 'Standard (25-50mm)';
  if (focalLength <= 85) return 'Portrait (51-85mm)';
  if (focalLength <= 135) return 'Telephoto (86-135mm)';
  return 'Super Telephoto (>135mm)';
}

/**
 * Format metadata for display
 */
export function formatMetadataForDisplay(metadata: RawMetadata): Record<string, string> {
  const displayData: Record<string, string> = {};

  if (metadata.make && metadata.model) {
    displayData['Camera'] = `${metadata.make} ${metadata.model}`;
  }

  if (metadata.lensMake && metadata.lensModel) {
    displayData['Lens'] = `${metadata.lensMake} ${metadata.lensModel}`;
  } else if (metadata.lensModel) {
    displayData['Lens'] = metadata.lensModel;
  }

  if (metadata.dateTime) {
    displayData['Date Taken'] = metadata.dateTime.toLocaleDateString();
    displayData['Time Taken'] = metadata.dateTime.toLocaleTimeString();
  }

  if (metadata.width && metadata.height) {
    displayData['Resolution'] = `${metadata.width} × ${metadata.height}`;
  }

  if (metadata.iso) {
    displayData['ISO'] = `ISO ${metadata.iso}`;
  }

  if (metadata.aperture) {
    displayData['Aperture'] = `f/${metadata.aperture}`;
  }

  if (metadata.focalLength) {
    displayData['Focal Length'] = `${metadata.focalLength}mm`;
  }

  if (metadata.exposureTime) {
    displayData['Shutter Speed'] = metadata.exposureTime;
  }

  if (metadata.whiteBalance) {
    displayData['White Balance'] = metadata.whiteBalance;
  }

  if (metadata.gps && metadata.gps.latitude !== undefined && metadata.gps.longitude !== undefined) {
    displayData['GPS'] = `${metadata.gps.latitude.toFixed(6)}, ${metadata.gps.longitude.toFixed(6)}`;
  }

  if (metadata.fileSize) {
    displayData['File Size'] = formatFileSize(metadata.fileSize);
  }

  if (metadata.bitsPerSample) {
    displayData['Bit Depth'] = `${metadata.bitsPerSample[0]}-bit`;
  }

  return displayData;
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate RAW file
 */
export function validateRawFile(
  filePath: string,
  mimeType: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check file extension vs MIME type
  const extension = filePath.split('.').pop()?.toLowerCase();
  const supportedFormats = [
    'cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'sr2',
    'dng', 'pef', 'raf', 'rw2', 'orf', 'iiq', 'mos', 'mrw', '3fr'
  ];

  if (extension && !supportedFormats.includes(extension)) {
    errors.push(`Unsupported file extension: ${extension}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Download file from S3 and extract metadata
 * This is used after upload completion to extract EXIF data
 */
export async function extractMetadataFromS3(
  storageKey: string,
  fileName: string,
  mimeType: string
): Promise<RawMetadata | null> {
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');

  // Get S3 client
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    console.error('AWS S3 environment variables are not set');
    return null;
  }

  const s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    // Download file from S3
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: storageKey,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      console.error('No body in S3 response for key:', storageKey);
      return null;
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as ReadableStream<Uint8Array>;
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);

    // Extract metadata from buffer
    return await extractRawMetadataFromBuffer(buffer, fileName, mimeType);
  } catch (error) {
    console.error('Error extracting metadata from S3:', error);
    return null;
  }
}

