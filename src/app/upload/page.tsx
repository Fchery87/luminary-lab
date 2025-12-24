'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, Loader2, Aperture } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function UploadPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Get upload URL from API
      const response = await fetch('/api/upload', {
        method: 'POST',
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
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get upload URL');
      }
      
      // Upload file to S3
      const uploadResponse = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }
      
      toast.success('File uploaded successfully!');
      
      // Redirect to editing page
      router.push(`/edit/${data.projectId}`);
    } catch (error) {
      import('@/lib/logger').then(({ logger }) => {
        logger.error('Upload failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      });
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [projectName, router]);

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

      <header className="px-4 lg:px-6 h-14 flex items-center border-b border-[hsl(var(--border))] relative">
        {/* Top amber accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold-light))] to-transparent opacity-60" />
        
        <Link href="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 8, ease: "linear" }}
            className="relative w-6 h-6 bg-[hsl(var(--gold))] rounded-sm flex items-center justify-center"
          >
            <Aperture className="h-3 w-3 text-[hsl(var(--charcoal))]" />
          </motion.div>
          <span className="font-display text-sm font-bold uppercase tracking-tight text-[hsl(var(--foreground))]">
            Luminary Lab
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link 
            href="/dashboard" 
            className="font-body text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors flex items-center h-8 relative group"
          >
            Dashboard
            <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[hsl(var(--gold))] group-hover:w-full transition-all duration-300" />
          </Link>
          <Link 
            href="/login" 
            className="font-body text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))] transition-colors flex items-center h-8 relative group"
          >
            Login
            <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[hsl(var(--gold))] group-hover:w-full transition-all duration-300" />
          </Link>
        </nav>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
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
                  onChange={(e) => setProjectName(e.target.value)}
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
                    <div className="space-y-2 w-full max-w-xs">
                      <div className="h-1 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.3 }}
                          className="h-full bg-[hsl(var(--gold))]"
                        />
                      </div>
                      <p className="font-body text-sm text-[hsl(var(--muted-foreground))]">
                        Uploading file... {uploadProgress}%
                      </p>
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
                        Maximum file size: 100MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
