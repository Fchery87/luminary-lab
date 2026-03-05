"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { decodeBlurHashToPixels } from "@/lib/blurhash";

interface BlurHashImageProps {
  src: string;
  blurHash: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  className?: string;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export function BlurHashImage({
  src,
  blurHash,
  alt,
  width,
  height,
  fill = false,
  sizes,
  className,
  onLoad,
}: BlurHashImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [placeholderColor, setPlaceholderColor] = useState("#1a1a1a");

  // Generate placeholder color from blurhash on mount
  useEffect(() => {
    if (blurHash && blurHash.length > 5) {
      try {
        // Decode first few pixels to get dominant color
        const pixels = decodeBlurHashToPixels(blurHash, 1, 1);
        if (pixels && pixels.length >= 4) {
          const r = pixels[0];
          const g = pixels[1];
          const b = pixels[2];
          // Defer state update to avoid cascading renders
          const timer = setTimeout(() => {
            setPlaceholderColor(`rgb(${r}, ${g}, ${b})`);
          }, 0);
          return () => clearTimeout(timer);
        }
      } catch {
        // Use fallback color if decode fails - defer to avoid cascading renders
        const timer = setTimeout(() => {
          setPlaceholderColor("#1a1a1a");
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [blurHash]);

  if (!blurHash) {
    // No blurhash - render normal image
    return (
      <Image
        src={src || "/placeholder.svg"}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes}
        className={className}
        onLoad={onLoad}
      />
    );
  }

  const containerStyle = fill
    ? { position: "relative" as const, width: "100%", height: "100%" }
    : { width, height };

  return (
    <div className="relative" style={containerStyle}>
      {/* Blur hash placeholder */}
      <div
        data-blurhash
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          backgroundColor: placeholderColor,
          opacity: isLoaded ? 0 : 1,
        }}
      />

      {/* Actual image */}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes}
        className={`${className} transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={(e) => {
          setIsLoaded(true);
          onLoad?.(e);
        }}
      />
    </div>
  );
}
