'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/ui/header';

interface JobStatus {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  error?: string;
  processedUrl?: string;
  thumbnailUrl?: string;
  estimatedTime?: string;
}

const statusConfig = {
  queued: {
    label: 'Queued',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Loader2,
    message: 'Your job is in the queue and will start processing soon.',
  },
  processing: {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-800',
    icon: Loader2,
    message: 'Your image is being processed by AI...',
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    message: 'Processing completed successfully!',
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    message: 'Processing failed. Please try again.',
  },
} as const;

export default function ProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [progress, setProgress] = useState(0);
  
  // Mock job status polling
  const { data: jobStatus, isLoading } = useQuery({
    queryKey: ['job-status', projectId],
    queryFn: async () => {
      // This would be a real API call to check job status
      // For now, mock the status
      
      const mockStatus: JobStatus = {
        id: projectId,
        status: 'processing',
        progress: 65,
        message: 'Applying AI style...',
        estimatedTime: '1-2 minutes',
      };
      
      return mockStatus;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 2 seconds for queued/processing, stop for completed/failed
      return data?.status === 'queued' || data?.status === 'processing' ? 2000 : false;
    },
  });

  const status = jobStatus?.status || 'queued';
  const config = statusConfig[status];
  const Icon = config.icon;

  useEffect(() => {
    if (progress < 100 && status === 'processing') {
      const timer = setTimeout(() => {
        setProgress((prev) => Math.min(prev + 1, 99));
      }, 100);
      return () => clearTimeout(timer);
    } else if (status === 'completed' && progress !== 100) {
      const timer = setTimeout(() => {
        setProgress(100);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [progress, status]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header 
        variant="minimal"
        navigation={
          <>
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
              Dashboard
            </Link>
            <Link href="/upload" className="text-sm font-medium hover:text-primary transition-colors">
              Upload
            </Link>
          </>
        }
        showUserMenu={true}
      />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Back button */}
          <Button variant="outline" asChild>
            <Link href="/edit/[projectId]" as={`/edit/${projectId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Editor
            </Link>
          </Button>

          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon className={`h-6 w-6 ${
                    status === 'processing' ? 'animate-spin' : ''
                  }`} />
                  <div>
                    <CardTitle>Processing Status</CardTitle>
                    <CardDescription>Project {projectId}</CardDescription>
                  </div>
                </div>
                <Badge className={config.color}>
                  {config.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>

              <div className="text-sm text-muted-foreground">
                {config.message}
              </div>

              {jobStatus?.message && (
                <div className="p-3 bg-muted rounded-sm text-sm">
                  {jobStatus.message}
                </div>
              )}

              {jobStatus?.estimatedTime && (
                <div className="flex items-center space-x-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Estimated time: {jobStatus.estimatedTime}</span>
                </div>
              )}

              {jobStatus?.error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-sm text-sm text-destructive">
                  <strong>Error:</strong> {jobStatus.error}
                </div>
              )}

              {/* Action buttons based on status */}
              {status === 'completed' && (
                <div className="flex space-x-3">
                  <Button asChild>
                    <Link href={`/compare/${projectId}`}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      View Results
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/export/${projectId}`}>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Link>
                  </Button>
                </div>
              )}

              {status === 'failed' && (
                <div className="flex space-x-3">
                  <Button asChild>
                    <Link href={`/edit/${projectId}`}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Try Again
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/upload">
                      Upload New File
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview thumbnail when completed */}
          {status === 'completed' && jobStatus?.thumbnailUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-80">
                  <Image
                    src={jobStatus.thumbnailUrl}
                    alt="Processed image preview"
                    fill
                    className="rounded-sm object-cover"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
