'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BatchUploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [batchName, setBatchName] = useState('');
  const [batchDescription, setBatchDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...newFiles].slice(0, 50));
      setError(null);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles].slice(0, 50));
      setError(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      if (batchName) formData.append('name', batchName);
      if (batchDescription) formData.append('description', batchDescription);

      const response = await fetch('/api/batches', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      router.push(`/batches/${data.batchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Batch Upload</CardTitle>
            <CardDescription>
              Upload multiple RAW images at once for batch processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Drag-drop zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25'
                }`}
              >
                <div className="space-y-2">
                  <p className="text-sm font-medium">Drag files here or click to browse</p>
                  <p className="text-xs text-muted-foreground">
                    RAW images only • Max 100MB each • Up to 50 files
                  </p>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".raw,.cr2,.nef,.dng,.arw,.rw2,.raf,.orf,.pef,.rwl"
                  onChange={handleFileInput}
                  className="hidden"
                  aria-label="File input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4"
                >
                  Select Files
                </Button>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Selected Files ({files.length}/50)
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {files.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                      >
                        <span className="truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(idx)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Batch metadata */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="text-sm font-medium">
                    Batch Name (optional)
                  </label>
                  <Input
                    id="name"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="e.g., Wedding Photos Feb 2025"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="text-sm font-medium">
                    Description (optional)
                  </label>
                  <Textarea
                    id="description"
                    value={batchDescription}
                    onChange={(e) => setBatchDescription(e.target.value)}
                    placeholder="Add notes about this batch..."
                    className="mt-1 min-h-20"
                  />
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
                  {error}
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                disabled={files.length === 0 || isLoading}
                className="w-full"
              >
                {isLoading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
