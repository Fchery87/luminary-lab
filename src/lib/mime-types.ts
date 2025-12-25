/**
 * MIME type detection utilities for server-side file type identification
 * Uses file signatures (magic numbers) as primary method, with extension fallback
 */

/**
 * File signature (magic number) definitions
 * Maps byte signatures to MIME types
 */
const FILE_SIGNATURES: Record<string, string> = {
  // JPEG images
  '\xff\xd8\xff': 'image/jpeg',
  
  // PNG images
  '\x89\x50\x4e\x47\x0d\x0a\x1a\x0a': 'image/png',
  
  // GIF images
  'GIF87a': 'image/gif',
  'GIF89a': 'image/gif',
  
  // WebP images
  'RIFF\x00\x00\x00\x00WEBP': 'image/webp',
  
  // BMP images
  'BM': 'image/bmp',
  
  // TIFF images (little-endian and big-endian)
  'II\x2a\x00': 'image/tiff',
  'MM\x00\x2a': 'image/tiff',
  
  // PDF documents
  '%PDF': 'application/pdf',
  
  // RAW file signatures (camera-specific)
  // Canon CR2
  '\x49\x49\x2a\x00\x10\x00\x00\x00CR': 'image/x-canon-cr2',
  
  // Nikon NEF
  '\x4d\x4d\x00\x2a\x00\x00\x00\x08': 'image/x-nikon-nef',
  
  // Sony ARW
  '\x00\x00\x00\x18ftypsony': 'image/x-sony-arw',
  
  // Adobe DNG
  '\x49\x49\x2a\x00\x08\x00\x00\x00': 'image/x-adobe-dng',
  
  // Fuji RAF
  'FUJIFILMCCD-RAW': 'image/x-fuji-raf',
  
  // Panasonic RW2
  'II\x1c\x00\x00\x00\x10': 'image/x-panasonic-rw2',
  
  // Olympus ORF
  'IIRO\x08\x00\x00\x00': 'image/x-olympus-orf',
  'MMOR': 'image/x-olympus-orf',
  
  // Pentax PEF
  '\x00\x00\x00\x18PENTAX': 'image/x-pentax-pef',
};

/**
 * Extension to MIME type mapping
 * Used as fallback when signature detection fails
 */
export const EXTENSION_TO_MIME: Record<string, string> = {
  // Common image formats
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.svg': 'image/svg+xml',
  
  // RAW formats
  '.cr2': 'image/x-canon-cr2',
  '.cr3': 'image/x-canon-cr2',
  '.nef': 'image/x-nikon-nef',
  '.nrw': 'image/x-nikon-nef',
  '.arw': 'image/x-sony-arw',
  '.srf': 'image/x-sony-arw',
  '.sr2': 'image/x-sony-arw',
  '.dng': 'image/x-adobe-dng',
  '.raf': 'image/x-fuji-raf',
  '.rw2': 'image/x-panasonic-rw2',
  '.orf': 'image/x-olympus-orf',
  '.pef': 'image/x-pentax-pef',
  '.ptx': 'image/x-pentax-pef',
  '.mos': 'image/x-leaf-mos',
  '.mrw': 'image/x-minolta-mrw',
  '.erf': 'image/x-epson-erf',
  '.3fr': 'image/x-hasselblad-3fr',
  '.fff': 'image/x-hasselblad-fff',
  '.kdc': 'image/x-kodak-kdc',
  '.dcr': 'image/x-kodak-dcr',
  '.k25': 'image/x-kodak-k25',
  '.rwl': 'image/x-leica-rwl',
  
  // Document formats
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.ts': 'application/typescript',
  
  // Video formats
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.flv': 'video/x-flv',
  
  // Audio formats
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
};

/**
 * MIME type to extension mapping
 * Reverse of EXTENSION_TO_MIME
 */
export const MIME_TO_EXTENSION: Record<string, string> = Object.fromEntries(
  Object.entries(EXTENSION_TO_MIME).map(([ext, mime]) => [mime, ext])
);

/**
 * Detect MIME type from file buffer using magic numbers
 * @param buffer - File buffer (first 32 bytes is sufficient for most signatures)
 * @returns Detected MIME type or null if not found
 */
export function detectMimeTypeFromBuffer(buffer: Buffer): string | null {
  if (!buffer || buffer.length === 0) {
    return null;
  }

  // Read first 32 bytes for signature detection
  const header = buffer.subarray(0, 32).toString('binary');

  // Check each signature
  for (const [signature, mimeType] of Object.entries(FILE_SIGNATURES)) {
    if (header.startsWith(signature)) {
      return mimeType;
    }
  }

  return null;
}

/**
 * Get MIME type from file extension
 * @param filename - Filename with extension
 * @returns MIME type or empty string if not found
 */
export function getMimeTypeFromExtension(filename: string): string {
  if (!filename) {
    return '';
  }

  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return EXTENSION_TO_MIME[ext] || '';
}

/**
 * Detect MIME type using multiple strategies in priority order:
 * 1. Provided MIME type (if valid)
 * 2. File signature (magic numbers) from buffer
 * 3. File extension fallback
 * @param filename - Filename
 * @param buffer - Optional file buffer for signature detection
 * @param providedMimeType - Optional MIME type provided by client
 * @returns Detected MIME type
 */
export function detectMimeType(
  filename: string,
  buffer?: Buffer,
  providedMimeType?: string
): string {
  // If a valid MIME type is provided, use it
  if (providedMimeType && isValidMimeType(providedMimeType)) {
    return providedMimeType;
  }

  // Try to detect from file buffer
  if (buffer) {
    const detectedFromBuffer = detectMimeTypeFromBuffer(buffer);
    if (detectedFromBuffer) {
      return detectedFromBuffer;
    }
  }

  // Fall back to extension-based detection
  const mimeTypeFromExtension = getMimeTypeFromExtension(filename);
  if (mimeTypeFromExtension) {
    return mimeTypeFromExtension;
  }

  // Default to binary if nothing matches
  return 'application/octet-stream';
}

/**
 * Validate if a MIME type is valid
 * @param mimeType - MIME type to validate
 * @returns true if valid, false otherwise
 */
export function isValidMimeType(mimeType: string): boolean {
  if (!mimeType || typeof mimeType !== 'string') {
    return false;
  }

  // Basic MIME type format validation
  const mimePattern = /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*$/;
  return mimePattern.test(mimeType);
}

/**
 * Check if a MIME type is an image type
 * @param mimeType - MIME type to check
 * @returns true if image type, false otherwise
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Check if a MIME type is a RAW image format
 * @param mimeType - MIME type to check
 * @returns true if RAW format, false otherwise
 */
export function isRawMimeType(mimeType: string): boolean {
  const rawMimeTypes = [
    'image/x-canon-cr2',
    'image/x-nikon-nef',
    'image/x-sony-arw',
    'image/x-adobe-dng',
    'image/x-fuji-raf',
    'image/x-panasonic-rw2',
    'image/x-olympus-orf',
    'image/x-pentax-pef',
  ];

  return rawMimeTypes.includes(mimeType);
}

/**
 * Get file extension from MIME type
 * @param mimeType - MIME type
 * @returns File extension with leading dot, or empty string if not found
 */
export function getExtensionFromMimeType(mimeType: string): string {
  return MIME_TO_EXTENSION[mimeType] || '';
}
