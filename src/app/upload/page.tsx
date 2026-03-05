"use client";

import { useState, useCallback, useRef, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Upload, FileImage, Loader2, XCircle, Camera, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Link from "next/link";

import { Header } from "@/components/ui/header";
import {
  OnboardingChecklist,
  type OnboardingStep,
} from "@/components/ui/onboarding-checklist";
import {
  IndustrialCard,
  AmberButton,
  SectionHeader,
  Frame,
} from "@/components/ui/industrial-ui";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const CHUNK_SIZE = 10 * 1024 * 1024;

interface MultipartUploadData {
  uploadType: "single-part" | "multipart";
  projectId: string;
  uploadId?: string;
  uploadUrl?: string;
  fileKey: string;
  totalParts?: number;
  chunkSize?: number;
  partUrls?: Array<{ partNumber: number; url: string }>;
}

const SUPPORTED_FORMATS = [
  { ext: "CR2", name: "Canon" },
  { ext: "NEF", name: "Nikon" },
  { ext: "ARW", name: "Sony" },
  { ext: "DNG", name: "Adobe" },
  { ext: "RAF", name: "Fuji" },
  { ext: "RW2", name: "Panasonic" },
  { ext: "ORF", name: "Olympus" },
  { ext: "PEF", name: "Pentax" },
];

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    setIsOnboarding(searchParams.get("onboarding") === "true");
  }, [searchParams]);

  const [projectName, setProjectName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSinglePartUploadRef = useRef<
    ((file: File, data: MultipartUploadData) => Promise<void>) | null
  >(null);
  const handleMultipartUploadRef = useRef<
    ((file: File, data: MultipartUploadData) => Promise<void>) | null
  >(null);

  const [currentStep, setCurrentStep] = useState<OnboardingStep>("name");
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      const rawExtensions = [".cr2", ".nef", ".arw", ".dng", ".raf", ".rw2", ".orf", ".pef"];
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

      if (!rawExtensions.includes(fileExtension)) {
        toast.error("Please upload a RAW file format");
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        toast.error("File size must be less than 100MB");
        return;
      }

      if (isOnboarding) {
        setSelectedFile(file);
        setCompletedSteps((prev) => [...new Set([...prev, "upload" as const])]);
        setCurrentStep("preview");
      }

      setIsUploading(true);
      setUploadProgress(0);
      setUploadStatus("Initializing...");
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            fileSize: file.size,
            mimeType: file.type,
            projectName: projectName || undefined,
          }),
        });

        const data: MultipartUploadData = await response.json();

        if (!response.ok) {
          const errorBody = data as { error?: string };
          throw new Error(errorBody.error || "Failed to get upload URL");
        }

        if (data.uploadType === "multipart" && data.uploadId) {
          await handleMultipartUploadRef.current!(file, data);
        } else if (data.uploadType === "single-part" && data.uploadUrl) {
          await handleSinglePartUploadRef.current!(file, data);
        } else {
          throw new Error("Invalid upload response from server");
        }

        toast.success("File uploaded successfully!");
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (isOnboarding) {
          router.push(`/compare/${data.projectId}?onboarding=true`);
        } else {
          router.push(`/edit/${data.projectId}`);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Upload failed");
        if (isOnboarding) {
          setSelectedFile(null);
          setCompletedSteps((prev) => prev.filter((s) => s !== "upload"));
          setCurrentStep("name");
        }
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus("");
        abortControllerRef.current = null;
      }
    },
    [projectName, router, isOnboarding]
  );

  const handleSinglePartUpload = useCallback(
    async (file: File, data: MultipartUploadData): Promise<void> => {
      setUploadStatus("Uploading file...");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", data.uploadUrl!);

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
            reject(new Error("Failed to upload file"));
          }
        };

        xhr.onerror = () => reject(new Error("Failed to upload file"));
        xhr.send(file);
      });
    },
    []
  );

  handleSinglePartUploadRef.current = handleSinglePartUpload;

  const uploadPartToS3 = useCallback(
    async (url: string, chunk: Blob, partNumber: number): Promise<string> => {
      const response = await fetch(url, { method: "PUT", body: chunk });

      if (!response.ok) {
        throw new Error(`Failed to upload part ${partNumber}`);
      }

      let etag = response.headers.get("ETag");
      if (!etag) {
        throw new Error("Missing ETag from storage response");
      }
      return etag.replace(/^"|"$/g, "");
    },
    []
  );

  const registerPart = useCallback(
    async (uploadId: string, partNumber: number, sizeBytes: number, etag: string): Promise<void> => {
      const response = await fetch("/api/upload/chunk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          uploadId,
          partNumber,
          etag,
          sizeBytes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to register part");
      }
    },
    []
  );

  const completeMultipartUpload = useCallback(
    async (file: File, data: MultipartUploadData): Promise<void> => {
      const response = await fetch("/api/upload/chunk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          uploadId: data.uploadId,
          projectId: data.projectId,
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete upload");
      }

      setUploadProgress(100);
      setUploadStatus("Upload complete!");
    },
    []
  );

  const handleMultipartUpload = useCallback(
    async (file: File, data: MultipartUploadData): Promise<void> => {
      const totalParts = data.totalParts || 1;
      const chunkSize = data.chunkSize || CHUNK_SIZE;
      const parts = data.partUrls || [];

      let uploadedParts = 0;

      for (let i = 0; i < totalParts; i++) {
        if (!abortControllerRef.current) {
          throw new Error("Upload was cancelled");
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

        const etag = await uploadPartToS3(partUrl, chunk, partNumber);
        await registerPart(data.uploadId!, partNumber, chunk.size, etag);

        uploadedParts++;
        const progress = Math.round((uploadedParts / totalParts) * 100);
        setUploadProgress(progress);
      }

      setUploadStatus("Finalizing upload...");
      await completeMultipartUpload(file, data);
    },
    [uploadPartToS3, registerPart, completeMultipartUpload]
  );

  handleMultipartUploadRef.current = handleMultipartUpload;

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus("");
      abortControllerRef.current = null;
      toast.info("Upload cancelled");
      if (isOnboarding) {
        setSelectedFile(null);
        setCompletedSteps([]);
        setCurrentStep("name");
      }
    }
  }, [isOnboarding]);

  const handleProjectNameChange = (value: string) => {
    setProjectName(value);
    if (isOnboarding && value.trim().length > 0 && !completedSteps.includes("name")) {
      setCompletedSteps((prev) => [...prev, "name"]);
    }
  };

  const handleStepClick = (step: OnboardingStep) => {
    const steps: OnboardingStep[] = ["name", "upload", "preview", "complete"];
    const currentIndex = steps.indexOf(currentStep);
    const targetIndex = steps.indexOf(step);

    if (completedSteps.includes(step) || targetIndex === currentIndex + 1) {
      setCurrentStep(step);
    }
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "image/x-canon-cr2": [".cr2"],
      "image/x-nikon-nef": [".nef"],
      "image/x-sony-arw": [".arw"],
      "image/x-adobe-dng": [".dng"],
      "image/x-fuji-raf": [".raf"],
      "image/x-panasonic-rw2": [".rw2"],
      "image/x-olympus-orf": [".orf"],
      "image/x-pentax-pef": [".pef"],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024,
  });

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--charcoal))]">
      <div className="film-grain" />
      <div className="scanlines" />

      <Header variant="minimal" showUserMenu={true} />

      <main className="flex-1 w-full px-4 lg:px-8 py-6 flex items-center justify-center">
        {isOnboarding ? (
          <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-[280px_1fr] gap-6 items-start">
            <div className="hidden lg:block">
              <OnboardingChecklist
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepClick={handleStepClick}
              />
            </div>

            <UploadCard
              projectName={projectName}
              setProjectName={handleProjectNameChange}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              uploadStatus={uploadStatus}
              isDragActive={isDragActive}
              isDragReject={isDragReject}
              getRootProps={getRootProps}
              getInputProps={getInputProps}
              cancelUpload={cancelUpload}
            />

            <div className="mt-6 lg:hidden">
              <OnboardingChecklist
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepClick={handleStepClick}
              />
            </div>
          </div>
        ) : (
          <UploadCard
            projectName={projectName}
            setProjectName={handleProjectNameChange}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            uploadStatus={uploadStatus}
            isDragActive={isDragActive}
            isDragReject={isDragReject}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            cancelUpload={cancelUpload}
          />
        )}
      </main>
    </div>
  );
}

interface UploadCardProps {
  projectName: string;
  setProjectName: (value: string) => void;
  isUploading: boolean;
  uploadProgress: number;
  uploadStatus: string;
  isDragActive: boolean;
  isDragReject: boolean;
  getRootProps: any;
  getInputProps: any;
  cancelUpload: () => void;
}

function UploadCard({
  projectName,
  setProjectName,
  isUploading,
  uploadProgress,
  uploadStatus,
  isDragActive,
  isDragReject,
  getRootProps,
  getInputProps,
  cancelUpload,
}: UploadCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl"
    >
      <div className="overflow-hidden rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl relative">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold-light))] to-transparent opacity-50" />
        <div className="p-6 md:p-8">
          <SectionHeader
            label="Import"
            title="Upload RAW File"
            description="Upload your RAW file to start AI editing"
            className="mb-6"
          />

          <div className="space-y-6">
            {/* Project Name Input */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Project Name (Optional)
              </label>
              <input
                type="text"
                placeholder="My Project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={isUploading}
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--gold))] focus:ring-1 focus:ring-[hsl(var(--gold))]/30 focus:outline-none transition-all disabled:opacity-50 text-white"
              />
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                "relative border border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300",
                isDragActive
                  ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10"
                  : isDragReject
                    ? "border-red-500 bg-red-500/10"
                    : "border-white/20 bg-black/40 hover:border-[hsl(var(--gold))]/50 hover:bg-black/60",
                isUploading && "pointer-events-none opacity-50"
              )}
            >
              <input {...getInputProps()} />

              {isUploading ? (
                <div className="flex flex-col items-center space-y-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 border-2 border-[hsl(var(--gold))] border-t-transparent rounded-full"
                  />
                  <div className="space-y-3 w-full max-w-xs">
                    <div className="h-1.5 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-[hsl(var(--gold))]"
                      />
                    </div>
                    <p className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                      {uploadStatus || `Uploading... ${uploadProgress}%`}
                    </p>
                    <button
                      type="button"
                      onClick={cancelUpload}
                      className="px-4 py-2 text-xs border border-[hsl(var(--border))] rounded-sm hover:border-red-500 hover:text-red-400 transition-colors"
                    >
                      <XCircle className="w-3 h-3 mr-1.5 inline" />
                      Cancel Upload
                    </button>
                  </div>
                </div>
              ) : isDragActive ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-[hsl(var(--gold))]/10 flex items-center justify-center"
                  >
                    <Upload className="w-8 h-8 text-[hsl(var(--gold))]" />
                  </div>
                  <p className="font-display font-semibold text-[hsl(var(--gold))]">
                    Drop your RAW file here
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-sm bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] flex items-center justify-center"
                  >
                    <Camera className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-sm">
                      Drag & drop your RAW file here, or click to select
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Maximum file size: 100MB. Large files (&gt;10MB) will be uploaded in chunks.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Supported Formats */}
            {!isUploading && (
              <div className="flex flex-wrap justify-center gap-2">
                {SUPPORTED_FORMATS.map((format) => (
                  <div
                    key={format.ext}
                    className="px-2.5 py-1 text-[10px] uppercase tracking-wider bg-black/50 border border-white/10 rounded-full text-white/70"
                    title={format.name}
                  >
                    {format.ext}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <AmberButton variant="ghost" size="sm" href="/dashboard" icon={<ChevronLeft className="w-4 h-4" />}>
          Back to Dashboard
        </AmberButton>
      </div>
    </motion.div>
  );
}

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[hsl(var(--charcoal))]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 border-2 border-[hsl(var(--gold))] border-t-transparent rounded-full"
          />
        </div>
      }
    >
      <UploadPageContent />
    </Suspense>
  );
}
