'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, Loader2, Aperture, XCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { OnboardingChecklist, type OnboardingStep } from '@/components/ui/onboarding-checklist';
import { Header } from '@/components/ui/header';

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

interface MultipartUploadData {
  uploadType: 'single-part' | 'multipart';
  projectId: string;
  uploadId?: string;
  uploadUrl?: string;
  fileKey: string;
  totalParts?: number;
  chunkSize?: number;
  partUrls?: Array<{ partNumber: number; url: string }>;
}

export default function UploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get('onboarding') === 'true';

  const [projectName, setProjectName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Onboarding state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('name');
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];

    // Validate file type
    const rawExtensions = ['.cr2', '.nef', '.arw', '.dng', '.raf', '.rw2', '.orf', '.pef'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!rawExtensions.includes(fileExtension)) {
      toast.error('Please upload a RAW file format');
      return;
    }

    // Validate file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size must be less than 100MB');
      return;
    }

    // Update onboarding state
    if (isOnboarding) {
      setSelectedFile(file);
      setCompletedSteps((prev) => [...new Set([...prev, 'upload'])]);
      setCurrentStep('preview');
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Initializing...');
    abortControllerRef.current = new AbortController();

    try {
      // Get upload configuration from API
      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type,
          projectName: projectName || undefined,
        }),
      });

      const data: MultipartUploadData = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get upload URL');
      }

      // Handle multipart or single-part upload
      if (data.uploadType === 'multipart' && data.uploadId) {
        await handleMultipartUpload(file, data);
      } else if (data.uploadType === 'single-part' && data.uploadUrl) {
        await handleSinglePartUpload(file, data);
      } else {
        throw new Error('Invalid upload response from server');
      }

      toast.success('File uploaded successfully!');

      // For onboarding, redirect to compare page to show the "Aha" moment
      // Otherwise, redirect to editing page
      if (isOnboarding) {
        router.push(`/compare/${data.projectId}?onboarding=true`);
      } else {
        router.push(`/edit/${data.projectId}`);
      }
    } catch (error) {
      import('@/lib/logger').then(({ logger }) => {
        logger.error('Upload failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      });
      toast.error(error instanceof Error ? error.message : 'Upload failed');
      // Reset onboarding state on error
      if (isOnboarding) {
        setSelectedFile(null);
        setCompletedSteps((prev) => prev.filter((s) => s !== 'upload'));
        setCurrentStep('name');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
      abortControllerRef.current = null;
    }
  }, [projectName, router, isOnboarding]);

  const handleSinglePartUpload = async (
    file: File,
    data: MultipartUploadData
  ): Promise<void> => {
    setUploadStatus('Uploading file...');

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', data.uploadUrl!);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
          setUploadStatus(`Uploading... ${progress}%`);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error('Failed to upload file'));
        }
      };

      xhr.onerror = () => reject(new Error('Failed to upload file'));
      xhr.send(file);
    });
  };

  const handleMultipartUpload = async (
    file: File,
    data: MultipartUploadData
  ): Promise<void> => {
    const totalParts = data.totalParts || 1;
    const chunkSize = data.chunkSize || CHUNK_SIZE;
    const parts = data.partUrls || [];

    let uploadedParts = 0;

    for (let i = 0; i < totalParts; i++) {
      if (!abortControllerRef.current) {
        throw new Error('Upload was cancelled');
      }

      const partNumber = i + 1;
      const partUrl = parts[i]?.url;
      if (!partUrl) {
        throw new Error(`No URL found for part ${partNumber}`);
      }

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      setUploadStatus(`Uploading part ${partNumber} of ${totalParts}...`);

      // Upload part to S3
      const etag = await uploadPartToS3(partUrl, chunk);

      // Register part with server
      await registerPart(data.uploadId!, partNumber, chunk.size, etag);

      uploadedParts++;
      const progress = Math.round((uploadedParts / totalParts) * 100);
      setUploadProgress(progress);
    }

    // Complete the multipart upload
    setUploadStatus('Finalizing upload...');
    await completeMultipartUpload(file, data);
  };

  const uploadPartToS3 = (url: string, chunk: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Extract ETag from response headers
          const etag = xhr.getResponseHeader('ETag');
          if (!etag) {
            reject(
              new Error(
                'Missing ETag from storage response. Ensure your bucket CORS exposes the ETag header.'
              )
            );
            return;
          }
          resolve(etag);
        } else {
          reject(new Error(`Failed to upload part. Status: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Failed to upload part to S3'));
      xhr.send(chunk);
    });
  };

  const registerPart = async (
    uploadId: string,
    partNumber: number,
    sizeBytes: number,
    etag: string
  ): Promise<void> => {
    const response = await fetch('/api/upload/chunk', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'register',
        uploadId,
        partNumber,
        etag,
        sizeBytes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to register part');
    }
  };

  const completeMultipartUpload = async (
    file: File,
    data: MultipartUploadData
  ): Promise<void> => {
    const response = await fetch('/api/upload/chunk', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'complete',
        uploadId: data.uploadId,
        projectId: data.projectId,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to complete upload');
    }

    setUploadProgress(100);
    setUploadStatus('Upload complete!');
  };

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
      abortControllerRef.current = null;
      toast.info('Upload cancelled');
      // Reset onboarding state on cancel
      if (isOnboarding) {
        setSelectedFile(null);
        setCompletedSteps([]);
        setCurrentStep('name');
      }
    }
  }, [isOnboarding]);

  const handleProjectNameChange = (value: string) => {
    setProjectName(value);
    // Update onboarding state
    if (isOnboarding && value.trim().length > 0 && !completedSteps.includes('name')) {
      setCompletedSteps((prev) => [...prev, 'name']);
    }
  };

  const handleStepClick = (step: OnboardingStep) => {
    // Only allow navigating to completed steps or next step
    const steps: OnboardingStep[] = ['name', 'upload', 'preview', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    const targetIndex = steps.indexOf(step);

    if (completedSteps.includes(step) || targetIndex === currentIndex + 1) {
      setCurrentStep(step);
    }
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/x-canon-cr2': ['.cr2'],
      'image/x-nikon-nef': ['.nef'],
      'image/x-sony-arw': ['.arw'],
      'image/x-adobe-dng': ['.dng'],
      'image/x-fuji-raf': ['.raf'],
      'image/x-panasonic-rw2': ['.rw2'],
      'image/x-olympus-orf': ['.orf'],
      'image/x-pentax-pef': ['.pef'],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* Texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]">
        <div className="absolute inset-0 grid-pattern" />
      </div>

      <Header 
        variant="minimal"
        navigation={
          <Link
            href="/dashboard"
            className="font-body text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors flex items-center h-8 relative group"
          >
            Dashboard
            <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[hsl(var(--gold))] group-hover:w-full transition-all duration-300" />
          </Link>
        }
        showUserMenu={true}
      />

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        {isOnboarding ? (
          <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-[320px_1fr] gap-8 items-start">
            {/* Onboarding Checklist Sidebar */}
            <div className="hidden lg:block">
              <OnboardingChecklist
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepClick={handleStepClick}
              />
            </div>

            {/* Main Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-sm overflow-hidden relative">
                {/* Top amber accent line */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--gold-light))]/50 to-transparent opacity-40" />
                <div className="absolute -top-2 -left-2 w-8 h-8 border-l-2 border-t-2 border-[hsl(var(--gold))]/30 rounded-tl-sm" />

                <CardHeader className="pb-4">
                  <CardTitle className="font-display text-2xl font-bold tracking-tight">
                    Upload RAW File
                  </CardTitle>
                  <CardDescription className="font-body text-[hsl(var(--muted-foreground))]">
                    Upload your RAW file to start AI editing process. Supported formats: CR2, NEF, ARW, DNG, RAF, RW2, ORF, PEF
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="projectName" className="font-body text-xs uppercase tracking-wider text-[hsl(var(--foreground))]">
                      Project Name (Optional)
                    </Label>
                    <Input
                      id="projectName"
                      type="text"
                      placeholder="My Project"
                      value={projectName}
                      onChange={(e) => handleProjectNameChange(e.target.value)}
                      disabled={isUploading}
                      className="rounded-sm border-[hsl(var(--border))] bg-[hsl(var(--secondary))] focus:border-[hsl(var(--gold))] font-body"
                    />
                  </div>

                  <div
                    {...getRootProps()}
                    className={`relative border-2 border-dashed rounded-sm p-12 text-center cursor-pointer transition-all duration-300 ${
                      isDragActive
                        ? 'border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/5'
                        : isDragReject
                        ? 'border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/5'
                        : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary))] hover:border-[hsl(var(--gold))]/50'
                    } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    <input {...getInputProps()} />

                    {isUploading ? (
                      <div className="flex flex-col items-center space-y-4">
                        <Loader2 className="h-10 w-10 text-[hsl(var(--gold))] animate-spin" />
                        <div className="space-y-3 w-full max-w-xs">
                          <div className="h-1 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadProgress}%` }}
                              transition={{ duration: 0.3 }}
                              className="h-full bg-[hsl(var(--gold))]"
                            />
                          </div>
                          <p className="font-body text-sm text-[hsl(var(--muted-foreground))]">
                            {uploadStatus || `Uploading file... ${uploadProgress}%`}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={cancelUpload}
                            className="rounded-sm border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:border-[hsl(var(--destructive))]"
                          >
                            <XCircle className="h-3 w-3 mr-2" />
                            Cancel Upload
                          </Button>
                        </div>
                      </div>
                    ) : isDragActive ? (
                      <div className="flex flex-col items-center space-y-2">
                        <Upload className="h-10 w-10 text-[hsl(var(--gold))]" />
                        <p className="font-body text-sm text-[hsl(var(--gold))] font-medium">
                          Drop your RAW file here
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-16 h-16 rounded-sm bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] flex items-center justify-center">
                          <FileImage className="h-8 w-8 text-[hsl(var(--muted-foreground))]/40" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-body text-sm text-[hsl(var(--foreground))] font-medium">
                            Drag & drop your RAW file here, or click to select
                          </p>
                          <p className="font-body text-xs text-[hsl(var(--muted-foreground))]">
                            Maximum file size: 100MB. Large files (&gt;10MB) will be uploaded in chunks.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Mobile Onboarding Checklist */}
              <div className="mt-6 lg:hidden">
                <OnboardingChecklist
                  currentStep={currentStep}
                  completedSteps={completedSteps}
                  onStepClick={handleStepClick}
                />
              </div>
            </motion.div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl mx-auto"
          >
            <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-sm overflow-hidden relative">
              {/* Top amber accent line */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--gold-light))]/50 to-transparent opacity-40" />
              <div className="absolute -top-2 -left-2 w-8 h-8 border-l-2 border-t-2 border-[hsl(var(--gold))]/30 rounded-tl-sm" />

              <CardHeader className="pb-4">
                <CardTitle className="font-display text-2xl font-bold tracking-tight">
                  Upload RAW File
                </CardTitle>
                <CardDescription className="font-body text-[hsl(var(--muted-foreground))]">
                  Upload your RAW file to start AI editing process. Supported formats: CR2, NEF, ARW, DNG, RAF, RW2, ORF, PEF
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="projectName" className="font-body text-xs uppercase tracking-wider text-[hsl(var(--foreground))]">
                    Project Name (Optional)
                  </Label>
                  <Input
                    id="projectName"
                    type="text"
                    placeholder="My Project"
                    value={projectName}
                    onChange={(e) => handleProjectNameChange(e.target.value)}
                    disabled={isUploading}
                    className="rounded-sm border-[hsl(var(--border))] bg-[hsl(var(--secondary))] focus:border-[hsl(var(--gold))] font-body"
                  />
                </div>

                <div
                  {...getRootProps()}
                  className={`relative border-2 border-dashed rounded-sm p-12 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive
                      ? 'border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/5'
                      : isDragReject
                      ? 'border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/5'
                      : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary))] hover:border-[hsl(var(--gold))]/50'
                  } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <input {...getInputProps()} />

                  {isUploading ? (
                    <div className="flex flex-col items-center space-y-4">
                      <Loader2 className="h-10 w-10 text-[hsl(var(--gold))] animate-spin" />
                      <div className="space-y-3 w-full max-w-xs">
                        <div className="h-1 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.3 }}
                            className="h-full bg-[hsl(var(--gold))]"
                          />
                        </div>
                        <p className="font-body text-sm text-[hsl(var(--muted-foreground))]">
                          {uploadStatus || `Uploading file... ${uploadProgress}%`}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={cancelUpload}
                          className="rounded-sm border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:border-[hsl(var(--destructive))]"
                        >
                          <XCircle className="h-3 w-3 mr-2" />
                          Cancel Upload
                        </Button>
                      </div>
                    </div>
                  ) : isDragActive ? (
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="h-10 w-10 text-[hsl(var(--gold))]" />
                      <p className="font-body text-sm text-[hsl(var(--gold))] font-medium">
                        Drop your RAW file here
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-16 h-16 rounded-sm bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] flex items-center justify-center">
                        <FileImage className="h-8 w-8 text-[hsl(var(--muted-foreground))]/40" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-body text-sm text-[hsl(var(--foreground))] font-medium">
                          Drag & drop your RAW file here, or click to select
                        </p>
                        <p className="font-body text-xs text-[hsl(var(--muted-foreground))]">
                          Maximum file size: 100MB. Large files (&gt;10MB) will be uploaded in chunks.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
