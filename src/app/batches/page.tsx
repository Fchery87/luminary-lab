"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Batch {
  id: string;
  name: string;
  status: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  createdAt: string;
  completedAt?: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  partial_failure: "bg-orange-100 text-orange-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
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
        const response = await fetch(
          `/api/batches?page=${page}&limit=${limit}`,
        );
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
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Batches</h1>
            <p className="text-muted-foreground mt-1">
              Manage your batch uploads
            </p>
          </div>
          <Button onClick={() => router.push("/upload/batch")}>
            New Batch
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && (
          <Card>
            <CardContent className="pt-6">
              <p>Loading batches...</p>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && batches.length === 0 && (
          <Card>
            <CardContent className="pt-12 text-center">
              <p className="text-muted-foreground mb-4">No batches yet</p>
              <Button onClick={() => router.push("/upload/batch")}>
                Create First Batch
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Batch list */}
        {batches.length > 0 && (
          <div className="space-y-3">
            {batches.map((batch) => (
              <Card
                key={batch.id}
                className="cursor-pointer hover:shadow-md transition"
                onClick={() => router.push(`/batches/${batch.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{batch.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {batch.completedJobs}/{batch.totalJobs} completed
                        {batch.failedJobs > 0 &&
                          ` • ${batch.failedJobs} failed`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(batch.createdAt).toLocaleString()}
                        {batch.completedAt &&
                          ` • Completed: ${new Date(batch.completedAt).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={statusColors[batch.status] || "bg-gray-100"}
                      >
                        {batch.status}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
