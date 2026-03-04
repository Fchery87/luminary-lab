import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
}

interface HistogramProps {
  data: HistogramData;
  height?: number;
  className?: string;
  showChannels?: {
    red?: boolean;
    green?: boolean;
    blue?: boolean;
    luminance?: boolean;
  };
}

export function Histogram({
  data,
  height = 100,
  className,
  showChannels = { red: true, green: true, blue: true, luminance: true },
}: HistogramProps) {
  const maxValue = useMemo(() => {
    const allValues = [
      ...(showChannels.red ? data.red : []),
      ...(showChannels.green ? data.green : []),
      ...(showChannels.blue ? data.blue : []),
      ...(showChannels.luminance ? data.luminance : []),
    ];
    return Math.max(...allValues, 1);
  }, [data, showChannels]);

  const renderChannel = (
    values: number[],
    color: string,
    opacity = 0.5
  ) => {
    if (values.length === 0) return null;

    const points = values
      .map((v, i) => {
        const x = (i / values.length) * 100;
        const y = 100 - (v / maxValue) * 100;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <polygon
        points={`0,100 ${points} 100,100`}
        fill={color}
        fillOpacity={opacity}
        stroke={color}
        strokeOpacity={opacity + 0.2}
        strokeWidth="0.5"
      />
    );
  };

  return (
    <div className={cn("relative w-full", className)}>
      <svg
        viewBox="0 0 100 100"
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        <line
          x1="0"
          y1="25"
          x2="100"
          y2="25"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="0.5"
        />
        <line
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="0.5"
        />
        <line
          x1="0"
          y1="75"
          x2="100"
          y2="75"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="0.5"
        />

        {/* Channels */}
        {showChannels.red && renderChannel(data.red, "rgb(239, 68, 68)", 0.3)}
        {showChannels.green &&
          renderChannel(data.green, "rgb(34, 197, 94)", 0.3)}
        {showChannels.blue &&
          renderChannel(data.blue, "rgb(59, 130, 246)", 0.3)}
        {showChannels.luminance &&
          renderChannel(data.luminance, "rgb(255, 255, 255)", 0.4)}
      </svg>

      {/* Channel indicators */}
      <div className="flex items-center justify-center gap-3 mt-2">
        {showChannels.red && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-muted-foreground">R</span>
          </div>
        )}
        {showChannels.green && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-muted-foreground">G</span>
          </div>
        )}
        {showChannels.blue && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] text-muted-foreground">B</span>
          </div>
        )}
        {showChannels.luminance && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-white" />
            <span className="text-[10px] text-muted-foreground">Luma</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Generate sample histogram data from an image
// This is a mock function - in production, you'd analyze the actual image
export function generateHistogramData(): HistogramData {
  const bins = 256;
  const red: number[] = [];
  const green: number[] = [];
  const blue: number[] = [];
  const luminance: number[] = [];

  // Generate realistic-looking histogram data
  for (let i = 0; i < bins; i++) {
    const normalized = i / bins;

    // Red channel - biased toward shadows with a highlight roll-off
    red.push(
      Math.max(
        0,
        Math.sin(normalized * Math.PI) * 1000 +
          Math.random() * 200 +
          (normalized > 0.8 ? 500 : 0)
      )
    );

    // Green channel - more balanced
    green.push(
      Math.max(
        0,
        Math.sin((normalized - 0.1) * Math.PI) * 1200 + Math.random() * 200
      )
    );

    // Blue channel - biased toward shadows
    blue.push(
      Math.max(
        0,
        Math.sin((normalized - 0.2) * Math.PI) * 900 +
          Math.random() * 200 +
          (normalized < 0.3 ? 400 : 0)
      )
    );

    // Luminance - combination of all channels
    luminance.push(
      Math.max(0, (red[i] + green[i] + blue[i]) / 3 + Math.random() * 100)
    );
  }

  return { red, green, blue, luminance };
}

// Hook to compute histogram from canvas
export function useImageHistogram(imageUrl: string | null) {
  const [histogram, setHistogram] = React.useState<HistogramData | null>(null);
  const [isComputing, setIsComputing] = React.useState(false);

  React.useEffect(() => {
    if (!imageUrl) {
      setHistogram(null);
      return;
    }

    setIsComputing(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Downsample for performance
      const maxSize = 400;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const bins = 256;
      const red = new Array(bins).fill(0);
      const green = new Array(bins).fill(0);
      const blue = new Array(bins).fill(0);
      const luminance = new Array(bins).fill(0);

      // Sample every 4th pixel for performance
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        red[r]++;
        green[g]++;
        blue[b]++;
        luminance[l]++;
      }

      setHistogram({ red, green, blue, luminance });
      setIsComputing(false);
    };

    img.onerror = () => {
      setIsComputing(false);
    };

    img.src = imageUrl;
  }, [imageUrl]);

  return { histogram, isComputing };
}

export default Histogram;
