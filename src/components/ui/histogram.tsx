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

interface HistogramSelectorProps {
  selectedChannel: "red" | "green" | "blue" | "luminance" | null;
  onChannelChange: (channel: "red" | "green" | "blue" | "luminance" | null) => void;
  className?: string;
}

export function HistogramSelector({
  selectedChannel,
  onChannelChange,
  className,
}: HistogramSelectorProps) {
  const channels: { key: "red" | "green" | "blue" | "luminance" | null; label: string; color: string }[] = [
    { key: null, label: "RGB", color: "bg-gradient-to-r from-red-500 via-green-500 to-blue-500" },
    { key: "red", label: "R", color: "bg-red-500" },
    { key: "green", label: "G", color: "bg-green-500" },
    { key: "blue", label: "B", color: "bg-blue-500" },
    { key: "luminance", label: "Luma", color: "bg-gray-400" },
  ];

  return (
    <div className={cn("flex gap-1", className)}>
      {channels.map((ch) => (
        <button
          key={ch.key ?? "rgb"}
          onClick={() => onChannelChange(ch.key)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-sm transition-all",
            selectedChannel === ch.key
              ? "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
              : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          )}
        >
          <span className={cn("w-2 h-2 rounded-full", ch.color)} />
          {ch.label}
        </button>
      ))}
    </div>
  );
}

// Hook to compute histogram from canvas
export function useImageHistogram(imageUrl: string | null) {
  const [histogram, setHistogram] = React.useState<HistogramData | null>(null);
  const [isComputing, setIsComputing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!imageUrl) {
      setHistogram(generateHistogramData()); // Generate sample data if no image
      setIsComputing(false);
      setError(null);
      return;
    }

    setIsComputing(true);
    setError(null);

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    const computeHistogram = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setError("Canvas not supported");
          setHistogram(generateHistogramData());
          setIsComputing(false);
          return;
        }

        // Downsample for performance
        const maxSize = 400;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        canvas.width = Math.max(1, img.width * scale);
        canvas.height = Math.max(1, img.height * scale);

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
      } catch (err) {
        console.warn("[Histogram] Failed to compute, using sample data:", err);
        setHistogram(generateHistogramData());
        setError("Using sample data");
      }
      setIsComputing(false);
    };

    img.onload = computeHistogram;

    img.onerror = () => {
      console.warn("[Histogram] Image failed to load, using sample data");
      setHistogram(generateHistogramData());
      setError("Image unavailable - showing sample");
      setIsComputing(false);
    };

    // Set src after setting up handlers
    img.src = imageUrl;
  }, [imageUrl]);

  return { histogram, isComputing, error };
}

export default Histogram;
