import { createReadStream } from 'fs';
import { promisify } from 'util';
import * as exifParser from 'exif-parser';
import { pipeline } from 'stream/promises';

const pipelineAsync = promisify(pipeline);

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
  aperture?: string;
  focalLength?: string;
  shutterSpeed?: string;
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
  thumbnail?: Buffer;
}

export async function extractRawMetadata(
  filePath: string,
  mimeType: string
): Promise<RawMetadata | null> {
  try {
    // Read file
    const fileStream = createReadStream(filePath);
    const chunks: Buffer[] = [];
    
    for await (const chunk of fileStream) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    
    // Parse EXIF data
    const parser = exifParser.create(buffer);
    const result = parser.parse();
    
    if (!result || !result.tags) {
      console.warn('No EXIF data found in file');
      return null;
    }
    
    // Extract common metadata
    const metadata: RawMetadata = {
      // Camera Information
      make: result.tags.Make,
      model: result.tags.Model,
      lensMake: result.tags.LensMake,
      lensModel: result.tags.LensModel,
      
      // Image Properties
      width: result.tags.ImageWidth || result.imageSize?.width,
      height: result.tags.ImageLength || result.imageSize?.height,
      orientation: result.tags.Orientation,
      resolution: result.tags.XResolution ? {
        x: result.tags.XResolution,
        y: result.tags.YResolution
      } : undefined,
      
      // Capture Information
      dateTime: result.tags.DateTime ? new Date(result.tags.DateTime) : undefined,
      iso: result.tags.ISOSpeedRatings || result.tags.ISO,
      aperture: result.tags.FNumber,
      focalLength: result.tags.FocalLength,
      shutterSpeed: result.tags.ExposureTime || result.tags.ShutterSpeed,
      exposureProgram: result.tags.ExposureProgram,
      
      // Color Information
      whiteBalance: result.tags.WhiteBalance,
      colorSpace: result.tags.ColorSpace,
      flash: result.tags.Flash !== undefined ? result.tags.Flash !== 0 : undefined,
      
      // GPS Information
      gps: result.tags.GPSLatitude && result.tags.GPSLongitude ? {
        latitude: result.tags.GPSLatitude,
        longitude: result.tags.GPSLongitude,
        altitude: result.tags.GPSAltitude,
        direction: result.tags.GPSImgDirection,
      } : undefined,
      
      // File Information
      bitsPerSample: result.tags.BitsPerSample,
      samplesPerPixel: result.tags.SamplesPerPixel,
      compression: result.tags.Compression,
      
      // Software/Processing
      software: result.tags.Software,
      artist: result.tags.Artist,
      copyright: result.tags.Copyright,
      
      // Advanced
      exifVersion: result.tags.ExifVersion,
      userComment: result.tags.UserComment,
      thumbnail: result.thumbnail,
    };
    
    // Add file-specific metadata
    metadata.fileName = filePath.split('/').pop() || filePath;
    metadata.fileSize = buffer.length;
    metadata.mimeType = mimeType;
    
    // Additional processing for specific RAW formats
    if (mimeType.includes('dng')) {
      metadata.compression = metadata.compression || 'DNG Lossless';
    } else if (mimeType.includes('cr2')) {
      metadata.compression = metadata.compression || 'Canon CR2 Lossless';
    } else if (mimeType.includes('nef')) {
      metadata.compression = metadata.compression || 'Nikon NEF Lossless';
    } else if (mimeType.includes('arw')) {
      metadata.compression = metadata.compression || 'Sony ARW Lossless';
    }
    
    return metadata;
    
  } catch (error) {
    console.error('Error extracting RAW metadata:', error);
    return {};
  }
}

export async function extractBasicMetadata(
  filePath: string,
  mimeType: string
): Promise<Partial<RawMetadata>> {
  try {
    // For basic extraction when full EXIF parsing fails
    const metadata: Partial<RawMetadata> = {
      fileName: filePath.split('/').pop() || filePath,
      mimeType,
    };
    
    // Try to get basic image info using a lightweight approach
    if (mimeType.includes('raw') || mimeType.includes('cr2') || 
        mimeType.includes('nef') || mimeType.includes('arw') || 
        mimeType.includes('dng')) {
      
      // This is where you'd integrate with RAW processing libraries
      // For now, we'll return minimal info
      
      metadata.make = 'Unknown';
      metadata.model = 'RAW Camera';
      metadata.bitsPerSample = [16]; // Common for RAW
      metadata.samplesPerPixel = 3; // RGB
    }
    
    return metadata;
    
  } catch (error) {
    console.error('Error extracting basic metadata:', error);
    return {};
  }
}

export function formatMetadataForDisplay(metadata: RawMetadata): Record<string, string> {
  const displayData: Record<string, string> = {};
  
  if (metadata.make && metadata.model) {
    displayData['Camera'] = `${metadata.make} ${metadata.model}`;
  }
  
  if (metadata.lensMake && metadata.lensModel) {
    displayData['Lens'] = `${metadata.lensMake} ${metadata.lensModel}`;
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
  
  if (metadata.shutterSpeed) {
    displayData['Shutter Speed'] = `${metadata.shutterSpeed}s`;
  }
  
  if (metadata.whiteBalance) {
    displayData['White Balance'] = metadata.whiteBalance;
  }
  
  if (metadata.gps) {
    const { latitude, longitude } = metadata.gps;
    if (latitude !== undefined && longitude !== undefined) {
      displayData['GPS'] = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  }
  
  if (metadata.fileSize) {
    displayData['File Size'] = formatFileSize(metadata.fileSize);
  }
  
  if (metadata.bitsPerSample) {
    displayData['Bit Depth'] = `${metadata.bitsPerSample[0]}-bit`;
  }
  
  return displayData;
}

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export function validateRawFile(
  filePath: string,
  mimeType: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check file extension vs MIME type
  const extension = filePath.split('.').pop()?.toLowerCase();
  const supportedFormats = [
    'cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'sr2', 
    'dng', 'pef', 'raf', 'rwz', 'mos', 'mrw', 'iiq'
  ];
  
  if (extension && !supportedFormats.includes(extension)) {
    errors.push(`Unsupported file extension: ${extension}`);
  }
  
  // Check MIME type
  if (!mimeType.includes('raw') && !supportedFormats.some(fmt => mimeType.includes(fmt))) {
    errors.push(`Unsupported MIME type: ${mimeType}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
