/**
 * CDN integration for image delivery
 * Generates optimized image URLs with cache headers
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: "webp" | "avif" | "auto";
}

export class CDNClient {
  private cdnUrl: string;
  private bucketName: string;

  constructor(cdnUrl: string, bucketName: string) {
    this.cdnUrl = cdnUrl;
    this.bucketName = bucketName;
  }

  /**
   * Get optimized image URL with caching
   */
  getImageUrl(
    storageKey: string,
    options: ImageOptimizationOptions = {},
  ): string {
    // Build CDN URL with transformation params
    let url = `${this.cdnUrl}/${this.bucketName}/${storageKey}`;

    const params = new URLSearchParams();
    if (options.width) params.set("w", options.width.toString());
    if (options.height) params.set("h", options.height.toString());
    if (options.quality !== undefined)
      params.set("q", options.quality.toString());
    if (options.format && options.format !== "auto")
      params.set("f", options.format);

    if (params.size > 0) {
      url += `?${params.toString()}`;
    }

    return url;
  }

  /**
   * Get thumbnail URL (optimized for small display)
   */
  getThumbnailUrl(storageKey: string): string {
    return this.getImageUrl(storageKey, {
      width: 400,
      height: 300,
      quality: 80,
      format: "webp",
    });
  }

  /**
   * Get preview URL (optimized for preview display)
   */
  getPreviewUrl(storageKey: string): string {
    return this.getImageUrl(storageKey, {
      width: 1200,
      height: 900,
      quality: 85,
      format: "auto",
    });
  }

  /**
   * Get full resolution URL (with caching)
   */
  getFullUrl(storageKey: string): string {
    return this.getImageUrl(storageKey, {
      quality: 92,
      format: "auto",
    });
  }
}

/**
 * Create CDN client from environment
 */
export function createCDNClient(): CDNClient {
  const cdnUrl =
    process.env.CDN_URL ||
    process.env.AWS_S3_ENDPOINT ||
    "https://images.example.com";
  const bucketName = process.env.AWS_S3_BUCKET || "images";

  return new CDNClient(cdnUrl, bucketName);
}

// Export singleton
export const cdnClient = createCDNClient();
