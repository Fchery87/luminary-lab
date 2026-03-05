"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Layers, Plus, ChevronRight, Loader2 } from "lucide-react";

import { Header } from "@/components/ui/header";
import {
  IndustrialCard,
  AmberButton,
  SectionHeader,
  StatusBadge,
} from "@/components/ui/industrial-ui";
import { cn } from "@/lib/utils";

interface Batch {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "partial_failure" | "failed" | "cancelled";
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  createdAt: string;
  completedAt?: string;
}

const statusConfig: Record<Batch["status"], { status: "idle" | "processing" | "complete" | "error"; label: string }> = {
  pending: { status: "idle", label: "Pending" },
  processing: { status: "processing", label: "Processing" },
  completed: { status: "complete", label: "Completed" },
  partial_failure: { status: "error", label: "Partial" },
  failed: { status: "error", label: "Failed" },
  cancelled: { status: "idle", label: "Cancelled" },
};

export default function BatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 20;

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await fetch(`/api/batches?page=${page}&limit=${limit}`);
        if (!response.ok) throw new Error("Failed to fetch batches");
        const data = await response.json();
        setBatches(data.items);
        setTotal(data.total);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading batches");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatches();
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--charcoal))]">
      <div className="film-grain" />
      <div className="scanlines" />

      <Header variant="minimal" showUserMenu={true} />

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-[1px] bg-[hsl(var(--gold))]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
                Batch Processing
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold">Batches</h1>
          </div>

          <AmberButton href="/upload/batch" icon={<Plus className="w-4 h-4" />}>
            New Batch
          </AmberButton>
        </motion.div>

        <div className="max-w-4xl">
          {/* Error */}
          {error && (
            <IndustrialCard className="mb-6 border-red-500/30">
              <div className="p-4 text-sm text-red-400">{error}</div>
            </IndustrialCard>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 border-2 border-[hsl(var(--gold))] border-t-transparent rounded-full"
              />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && batches.length === 0 && (
            <IndustrialCard className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-sm bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] flex items-center justify-center">
                <Layers className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">No Batches Yet</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
                Process multiple images at once with batch processing
              </p>
              <AmberButton href="/upload/batch">
                Create First Batch
              </AmberButton>
            </IndustrialCard>
          )}

          {/* Batch List */}
          {!isLoading && batches.length > 0 && (
            <div className="space-y-3">
              {batches.map((batch, index) => {
                const config = statusConfig[batch.status];
                const progress = Math.round((batch.completedJobs / batch.totalJobs) * 100);

                return (
                  <motion.div
                    key={batch.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <IndustrialCard
                      className="cursor-pointer group"
                      hover
                      onClick={() => router.push(`/batches/${batch.id}`)}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-semibold truncate group-hover:text-[hsl(var(--gold))] transition-colors">
                              {batch.name}
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                              <span>
                                {batch.completedJobs}/{batch.totalJobs} completed
                              </span>
                              {batch.failedJobs > 0 && (
                                <span className="text-red-400">
                                  • {batch.failedJobs} failed
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-2">
                              Created: {new Date(batch.createdAt).toLocaleString()}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <StatusBadge status={config.status}>
                              {config.label}
                            </StatusBadge>

                            {/* Progress Bar */}
                            <div className="w-24 hidden sm:block">
                              <div className="h-1 bg-[hsl(var(--secondary))] rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full transition-all",
                                    batch.status === "completed"
                                      ? "bg-emerald-500"
                                      : "bg-[hsl(var(--gold))]"
                                  )}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                {progress}%
                              </span>
                            </div>

                            <ChevronRight className="w-5 h-5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--gold))] transition-colors" />
                          </div>
                        </div>
                      </div>
                    </IndustrialCard>
                  </motion.div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-xs border border-[hsl(var(--border))] rounded-sm hover:border-[hsl(var(--gold))] disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="font-mono text-xs">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 text-xs border border-[hsl(var(--border))] rounded-sm hover:border-[hsl(var(--gold))] disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
