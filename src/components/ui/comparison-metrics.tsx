import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { FileImage, Ruler, Palette, Clock, HardDrive } from "lucide-react";

interface ImageMetrics {
  fileSize: number;
  dimensions: { width: number; height: number };
  colorSpace: string;
  bitDepth: number;
  format: string;
}

interface ComparisonMetricsProps {
  original: ImageMetrics;
  processed?: ImageMetrics;
  processingTime?: string;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function calculateSizeDiff(original: number, processed: number): {
  diff: number;
  percent: string;
  isLarger: boolean;
} {
  const diff = processed - original;
  const percent = ((diff / original) * 100).toFixed(1);
  return { diff, percent, isLarger: diff > 0 };
}

export function ComparisonMetrics({
  original,
  processed,
  processingTime,
  className,
}: ComparisonMetricsProps) {
  const sizeDiff = processed
    ? calculateSizeDiff(original.fileSize, processed.fileSize)
    : null;

  const megapixels = ((original.dimensions.width * original.dimensions.height) / 1000000).toFixed(1);

  return (
    <Card className={cn("w-72 shrink-0", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileImage className="h-4 w-4 text-muted-foreground" />
          Image Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Dimensions */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Ruler className="h-3.5 w-3.5" />
            <span className="text-xs uppercase tracking-wider font-medium">Dimensions</span>
          </div>
          <div className="pl-5 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resolution</span>
              <span className="font-mono text-foreground">
                {original.dimensions.width} × {original.dimensions.height}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Megapixels</span>
              <span className="font-mono text-foreground">{megapixels} MP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Aspect Ratio</span>
              <span className="font-mono text-foreground">
                {(() => {
                  const ratio = original.dimensions.width / original.dimensions.height;
                  if (Math.abs(ratio - 1) < 0.1) return "1:1";
                  if (Math.abs(ratio - 1.5) < 0.1) return "3:2";
                  if (Math.abs(ratio - 1.33) < 0.1) return "4:3";
                  if (Math.abs(ratio - 1.78) < 0.1) return "16:9";
                  if (ratio > 1) return `${ratio.toFixed(2)}:1`;
                  return `1:${(1/ratio).toFixed(2)}`;
                })()}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Color Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Palette className="h-3.5 w-3.5" />
            <span className="text-xs uppercase tracking-wider font-medium">Color</span>
          </div>
          <div className="pl-5 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Color Space</span>
              <span className="font-mono text-foreground">{original.colorSpace}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bit Depth</span>
              <span className="font-mono text-foreground">{original.bitDepth}-bit</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Format</span>
              <span className="font-mono text-foreground uppercase">{original.format}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* File Size Comparison */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <HardDrive className="h-3.5 w-3.5" />
            <span className="text-xs uppercase tracking-wider font-medium">File Size</span>
          </div>
          <div className="pl-5 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original</span>
              <span className="font-mono text-foreground">{formatBytes(original.fileSize)}</span>
            </div>
            {processed && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processed</span>
                  <span className="font-mono text-foreground">{formatBytes(processed.fileSize)}</span>
                </div>
                {sizeDiff && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Change</span>
                    <span
                      className={cn(
                        "font-mono text-xs",
                        sizeDiff.isLarger ? "text-amber-500" : "text-green-500"
                      )}
                    >
                      {sizeDiff.isLarger ? "+" : ""}
                      {sizeDiff.percent}%
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Processing Time */}
        {processingTime && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wider font-medium">Processing</span>
              </div>
              <div className="pl-5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-mono text-foreground">{processingTime}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Hook to extract image metrics from a file or URL
export function useImageMetrics(imageUrl: string | null): {
  metrics: ImageMetrics | null;
  isLoading: boolean;
} {
  const [metrics, setMetrics] = React.useState<ImageMetrics | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!imageUrl) {
      setMetrics(null);
      return;
    }

    setIsLoading(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Try to get file size from headers or estimate
      fetch(imageUrl, { method: "HEAD" })
        .then((res) => {
          const size = res.headers.get("content-length");
          return size ? parseInt(size, 10) : 0;
        })
        .catch(() => 0)
        .then((fileSize) => {
          setMetrics({
            fileSize: fileSize || 0,
            dimensions: {
              width: img.naturalWidth,
              height: img.naturalHeight,
            },
            colorSpace: "sRGB", // Default, would need EXIF data for accuracy
            bitDepth: 8, // Default for web images
            format: imageUrl.split("?")[0].split(".").pop()?.toUpperCase() || "UNKNOWN",
          });
          setIsLoading(false);
        });
    };

    img.onerror = () => {
      setIsLoading(false);
    };

    img.src = imageUrl;
  }, [imageUrl]);

  return { metrics, isLoading };
}

export default ComparisonMetrics;
