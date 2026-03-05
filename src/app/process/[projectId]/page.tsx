"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Download,
  Clock,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";

import { Header } from "@/components/ui/header";
import { IndustrialCard, AmberButton, SectionHeader, StatusBadge } from "@/components/ui/industrial-ui";
import { cn } from "@/lib/utils";

interface JobStatus {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress?: number;
  message?: string;
  error?: string;
  processedUrl?: string;
  thumbnailUrl?: string;
  estimatedTime?: string;
}

const statusConfig = {
  queued: {
    label: "Queued",
    status: "idle" as const,
    icon: Clock,
    message: "Your job is in the queue and will start processing soon.",
  },
  processing: {
    label: "Processing",
    status: "processing" as const,
    icon: Loader2,
    message: "Your image is being processed by AI...",
  },
  completed: {
    label: "Completed",
    status: "complete" as const,
    icon: CheckCircle,
    message: "Processing completed successfully!",
  },
  failed: {
    label: "Failed",
    status: "error" as const,
    icon: XCircle,
    message: "Processing failed. Please try again.",
  },
};

export default function ProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [progress, setProgress] = useState(0);

  const { data: jobStatus, isLoading } = useQuery({
    queryKey: ["job-status", projectId],
    queryFn: async () => {
      const mockStatus: JobStatus = {
        id: projectId,
        status: "processing",
        progress: 65,
        message: "Applying AI style...",
        estimatedTime: "1-2 minutes",
      };
      return mockStatus;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === "queued" || data?.status === "processing" ? 2000 : false;
    },
  });

  const status = jobStatus?.status || "queued";
  const config = statusConfig[status];
  const Icon = config.icon;

  useEffect(() => {
    if (progress < 100 && status === "processing") {
      const timer = setTimeout(() => {
        setProgress((prev) => Math.min(prev + 1, 99));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [progress, status]);

  // Sync progress to 100 when status is completed (deferred to avoid sync setState)
  useEffect(() => {
    if (status === "completed" && progress !== 100) {
      const timer = setTimeout(() => setProgress(100), 0);
      return () => clearTimeout(timer);
    }
  }, [status, progress]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--charcoal))]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-2 border-[hsl(var(--gold))] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--charcoal))]">
      <div className="film-grain" />
      <div className="scanlines" />

      <Header variant="minimal" showUserMenu={true} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Back button */}
          <AmberButton
            variant="ghost"
            size="sm"
            href={`/edit/${projectId}`}
            icon={<ChevronLeft className="w-4 h-4" />}
          >
            Back to Editor
          </AmberButton>

          {/* Status Card */}
          <IndustrialCard accent={status === "completed"}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-sm flex items-center justify-center",
                    status === "completed" && "bg-emerald-500/10 text-emerald-400",
                    status === "processing" && "bg-amber-500/10 text-amber-400",
                    status === "failed" && "bg-red-500/10 text-red-400",
                    status === "queued" && "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
                  )}
                  >
                    <Icon className={cn(
                      "w-6 h-6",
                      status === "processing" && "animate-spin"
                    )} />
                  </div>
                  <div>
                    <h1 className="font-display text-xl font-bold">Processing Status</h1>
                    <p className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                      {projectId.substring(0, 8)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={config.status}>{config.label}</StatusBadge>
              </div>

              <div className="space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(var(--muted-foreground))]">Progress</span>
                    <span className="font-mono text-[hsl(var(--gold))]">{progress}%</span>
                  </div>
                  <div className="h-2 bg-[hsl(var(--secondary))] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className={cn(
                        "h-full",
                        status === "completed" && "bg-emerald-500",
                        status === "failed" && "bg-red-500",
                        (status === "processing" || status === "queued") && "bg-[hsl(var(--gold))]"
                      )}
                    />
                  </div>
                </div>

                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {config.message}
                </p>

                {jobStatus?.message && (
                  <div className="p-3 bg-[hsl(var(--secondary))] rounded-sm text-sm border border-[hsl(var(--border))]">
                    {jobStatus.message}
                  </div>
                )}

                {jobStatus?.estimatedTime && status !== "completed" && (
                  <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                    <Clock className="w-4 h-4" />
                    <span>Estimated time: {jobStatus.estimatedTime}</span>
                  </div>
                )}

                {jobStatus?.error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-sm text-sm text-red-400">
                    <strong>Error:</strong> {jobStatus.error}
                  </div>
                )}

                {/* Action buttons */}
                {status === "completed" && (
                  <div className="flex gap-3">
                    <AmberButton href={`/compare/${projectId}`} icon={<CheckCircle className="w-4 h-4" />}>
                      View Results
                    </AmberButton>
                    <AmberButton variant="secondary" href={`/export/${projectId}`} icon={<Download className="w-4 h-4" />}>
                      Export
                    </AmberButton>
                  </div>
                )}

                {status === "failed" && (
                  <div className="flex gap-3">
                    <AmberButton href={`/edit/${projectId}`} icon={<ArrowLeft className="w-4 h-4" />}>
                      Try Again
                    </AmberButton>
                    <AmberButton variant="secondary" href="/upload">
                      Upload New File
                    </AmberButton>
                  </div>
                )}
              </div>
            </div>
          </IndustrialCard>

          {/* Preview */}
          {status === "completed" && jobStatus?.thumbnailUrl && (
            <IndustrialCard>
              <div className="p-6">
                <SectionHeader title="Preview" className="mb-4" />
                <div className="relative w-full aspect-video bg-black rounded-sm overflow-hidden">
                  <Image
                    src={jobStatus.thumbnailUrl}
                    alt="Processed image preview"
                    fill
                    sizes="(max-width: 768px) 100vw, 80vw"
                    className="object-contain"
                  />
                </div>
              </div>
            </IndustrialCard>
          )}
        </div>
      </main>
    </div>
  );
}
