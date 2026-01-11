'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { decodeBlurHashToPixels } from '@/lib/blurhash';

interface BlurHashImageProps {
  src: string;
  blurHash: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export function BlurHashImage({
  src,
  blurHash,
  alt,
  width,
  height,
  className,
}: BlurHashImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [placeholderColor, setPlaceholderColor] = useState('#1a1a1a');

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
          setPlaceholderColor(`rgb(${r}, ${g}, ${b})`);
        }
      } catch {
        // Use fallback color if decode fails
        setPlaceholderColor('#1a1a1a');
      }
    }
  }, [blurHash]);

  if (!blurHash) {
    // No blurhash - render normal image
    return (
      <Image
        src={src || '/placeholder.svg'}
        alt={alt}
        width={width}
        height={height}
        className={className}
      />
    );
  }

  return (
    <div className="relative" style={{ width, height }}>
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
        width={width}
        height={height}
        className={`${className} transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
}
