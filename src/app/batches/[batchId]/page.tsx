'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Batch {
  id: string;
  name: string;
  status: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  createdAt: string;
  completedAt?: string;
  jobs?: Array<{ id: string; status: string; error?: string }>;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  partial_failure: 'bg-orange-100 text-orange-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const jobStatusColors: Record<string, string> = {
  queued: 'bg-gray-100',
  processing: 'bg-blue-100',
  completed: 'bg-green-100',
  failed: 'bg-red-100',
  cancelled: 'bg-gray-100',
};

export default function BatchStatusPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.batchId as string;

  const [batch, setBatch] = useState<Batch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTerminal, setIsTerminal] = useState(false);

  const isTerminalStatus = (status: string) => {
    return ['completed', 'failed', 'partial_failure', 'cancelled'].includes(status);
  };

  const fetchBatch = async () => {
    try {
      const response = await fetch(`/api/batches/${batchId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch batch');
      }
      const data = await response.json();
      setBatch(data);
      
      if (isTerminalStatus(data.status)) {
        setIsTerminal(true);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading batch');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatch();
  }, [batchId]);

  // Polling
  useEffect(() => {
    if (isTerminal || !batch) return;

    const interval = setInterval(fetchBatch, 3000);
    return () => clearInterval(interval);
  }, [isTerminal, batch, batchId]);

  const handleRetry = async () => {
    try {
      const response = await fetch(`/api/batches/${batchId}/retry`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Retry failed');
      await fetchBatch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed');
    }
  };

  const handleCancel = async () => {
    try {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Cancel failed');
      await fetchBatch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 flex items-center justify-center">
        <p>Loading batch...</p>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">{error || 'Batch not found'}</p>
              <Button onClick={() => router.push('/batches')} className="mt-4">
                Back to Batches
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const progress = batch.totalJobs > 0 ? (batch.completedJobs / batch.totalJobs) * 100 : 0;
  const inProgress = batch.totalJobs - batch.completedJobs - batch.failedJobs;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{batch.name}</CardTitle>
                <CardDescription>
                  Created: {new Date(batch.createdAt).toLocaleString()}
                </CardDescription>
              </div>
              <Badge className={statusColors[batch.status] || 'bg-gray-100'}>
                {batch.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>
                  {batch.completedJobs}/{batch.totalJobs} completed
                  {batch.failedJobs > 0 && ` • ${batch.failedJobs} failed`}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Status summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted rounded">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">{batch.totalJobs}</p>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <p className="text-xs text-green-600">Completed</p>
                <p className="text-lg font-semibold text-green-700">{batch.completedJobs}</p>
              </div>
              <div className="p-3 bg-red-50 rounded">
                <p className="text-xs text-red-600">Failed</p>
                <p className="text-lg font-semibold text-red-700">{batch.failedJobs}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              {batch.status === 'processing' && (
                <Button variant="destructive" onClick={handleCancel}>
                  Cancel Batch
                </Button>
              )}
              {batch.failedJobs > 0 && batch.status !== 'processing' && (
                <Button onClick={handleRetry}>
                  Retry {batch.failedJobs} Failed
                </Button>
              )}
              <Button variant="outline" onClick={() => router.push('/batches')}>
                Back to List
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Job list */}
        {batch.jobs && batch.jobs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Jobs ({batch.jobs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {batch.jobs.map((job) => (
                  <div
                    key={job.id}
                    className={`p-3 rounded flex items-start justify-between ${
                      jobStatusColors[job.status] || 'bg-gray-50'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-mono text-xs">{job.id}</p>
                      <p className="text-sm capitalize mt-1">{job.status}</p>
                      {job.error && (
                        <p className="text-xs text-destructive mt-1">{job.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error message */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
