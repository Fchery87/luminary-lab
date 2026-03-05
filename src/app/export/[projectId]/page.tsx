"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Download,
  ArrowLeft,
  CheckCircle,
  Settings,
  ImageIcon,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/ui/header";
import {
  IndustrialCard,
  AmberButton,
  SectionHeader,
  Frame,
} from "@/components/ui/industrial-ui";
import { cn } from "@/lib/utils";

export default function ExportPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [format, setFormat] = useState("jpg");
  const [quality, setQuality] = useState("high");
  const [size, setSize] = useState("web");
  const [isExporting, setIsExporting] = useState(false);

  const formats = [
    {
      value: "jpg",
      label: "JPEG",
      description: "Best for web and email",
      colorSpace: "sRGB",
      bitDepth: "8-bit",
    },
    {
      value: "tiff",
      label: "TIFF",
      description: "Professional printing",
      colorSpace: "ProPhoto RGB",
      bitDepth: "16-bit",
    },
    {
      value: "png",
      label: "PNG",
      description: "Lossless compression",
      colorSpace: "sRGB",
      bitDepth: "16-bit",
    },
  ];

  const qualities = [
    {
      value: "standard",
      label: "Standard",
      description: "Fast export, good quality",
      settings: { jpeg: 85, tiff: 8, png: 6 },
    },
    {
      value: "high",
      label: "High",
      description: "Best balance",
      settings: { jpeg: 95, tiff: 16, png: 8 },
    },
    {
      value: "ultra",
      label: "Ultra",
      description: "Maximum quality",
      settings: { jpeg: 100, tiff: 16, png: 8 },
    },
  ];

  const sizes = [
    {
      value: "web",
      label: "Web (2048px)",
      description: "Optimized for web use",
    },
    {
      value: "print",
      label: "Print (4000px)",
      description: "High resolution for printing",
    },
    {
      value: "original",
      label: "Original",
      description: "Full resolution",
    },
  ];

  const selectedFormat = formats.find((f) => f.value === format);
  const selectedQuality = qualities.find((q) => q.value === quality);
  const selectedSize = sizes.find((s) => s.value === size);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          format,
          quality,
          size,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Export failed");
      }

      // Trigger download
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Export completed successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--charcoal))]">
      <div className="film-grain" />
      <div className="scanlines" />

      <Header variant="minimal" showUserMenu={true} />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="max-w-5xl mx-auto">
          {/* Back Link */}
          <div className="mb-6">
            <AmberButton
              variant="ghost"
              size="sm"
              href={`/compare/${projectId}`}
              icon={<ChevronLeft className="w-4 h-4" />}
            >
              Back to Comparison
            </AmberButton>
          </div>

          <SectionHeader
            label="Export"
            title="Export Image"
            description="Choose your export settings and download the processed image"
            className="mb-8"
          />

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Format Selection */}
            <IndustrialCard>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-4 h-4 text-[hsl(var(--gold))]" />
                  <h2 className="font-display font-semibold">Format</h2>
                </div>

                <div className="space-y-2">
                  {formats.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFormat(f.value)}
                      className={cn(
                        "w-full p-3 text-left rounded-sm border transition-all",
                        format === f.value
                          ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10"
                          : "border-[hsl(var(--border))] hover:border-[hsl(var(--gold))]/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{f.label}</span>
                        {format === f.value && <CheckCircle className="w-4 h-4 text-[hsl(var(--gold))]" />}
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        {f.description}
                      </p>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {f.colorSpace} • {f.bitDepth}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </IndustrialCard>

            {/* Quality Selection */}
            <IndustrialCard>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-4 h-4 text-[hsl(var(--gold))]" />
                  <h2 className="font-display font-semibold">Quality</h2>
                </div>

                <div className="space-y-2">
                  {qualities.map((q) => (
                    <button
                      key={q.value}
                      onClick={() => setQuality(q.value)}
                      className={cn(
                        "w-full p-3 text-left rounded-sm border transition-all",
                        quality === q.value
                          ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10"
                          : "border-[hsl(var(--border))] hover:border-[hsl(var(--gold))]/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{q.label}</span>
                        {quality === q.value && <CheckCircle className="w-4 h-4 text-[hsl(var(--gold))]" />}
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        {q.description}
                      </p>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        JPEG: {q.settings.jpeg}%, TIFF: {q.settings.tiff}-bit
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </IndustrialCard>

            {/* Size Selection */}
            <IndustrialCard>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-4 h-4 text-[hsl(var(--gold))]" />
                  <h2 className="font-display font-semibold">Resolution</h2>
                </div>

                <div className="space-y-2">
                  {sizes.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSize(s.value)}
                      className={cn(
                        "w-full p-3 text-left rounded-sm border transition-all",
                        size === s.value
                          ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10"
                          : "border-[hsl(var(--border))] hover:border-[hsl(var(--gold))]/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{s.label}</span>
                        {size === s.value && <CheckCircle className="w-4 h-4 text-[hsl(var(--gold))]" />}
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        {s.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </IndustrialCard>
          </div>

          {/* Export Summary */}
          <IndustrialCard className="mt-6" accent>
            <div className="p-6">
              <SectionHeader title="Export Summary" className="mb-4" />

              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(var(--muted-foreground))]">Format:</span>
                    <span>{selectedFormat?.label} ({selectedFormat?.bitDepth})</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(var(--muted-foreground))]">Color Space:</span>
                    <span>{selectedFormat?.colorSpace}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(var(--muted-foreground))]">Quality:</span>
                    <span>{selectedQuality?.label}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(var(--muted-foreground))]">Resolution:</span>
                    <span>{selectedSize?.label}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(var(--muted-foreground))]">File Type:</span>
                    <span className="font-mono text-[hsl(var(--gold))]">
                      luminary_{projectId.substring(0, 8)}.{format.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(var(--muted-foreground))]">Expires:</span>
                    <span>1 hour</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[hsl(var(--border))]">
                <AmberButton
                  variant="secondary"
                  href={`/compare/${projectId}`}
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </AmberButton>

                <AmberButton
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex-1"
                  icon={isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                >
                  {isExporting ? "Exporting..." : `Export ${selectedFormat?.label}`}
                </AmberButton>
              </div>
            </div>
          </IndustrialCard>
        </div>
      </main>
    </div>
  );
}
