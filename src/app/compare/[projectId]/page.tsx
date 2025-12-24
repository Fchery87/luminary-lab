'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  ArrowLeft,
  ArrowRight,
  Share2,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ProjectData {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  originalImageUrl?: string;
  processedImageUrl?: string;
  thumbnailUrl?: string;
  styleName?: string;
  intensity?: number;
}

export default function ComparePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [zoomLevel, setZoomLevel] = useState(100);
  const [dividerPosition, setDividerPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  
  // Mock project data - would fetch from API
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      // Mock API call
      const mockProject: ProjectData = {
        id: projectId,
        name: 'Beauty Portrait Session',
        status: 'completed',
        createdAt: new Date().toISOString(),
        originalImageUrl: 'https://picsum.photos/seed/original/1200/800.jpg',
        processedImageUrl: 'https://picsum.photos/seed/processed/1200/800.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/thumb/400/300.jpg',
        styleName: 'Clean Commercial Beauty',
        intensity: 0.7,
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockProject;
    },
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = (x / rect.width) * 100;
    setDividerPosition(Math.min(100, Math.max(0, position)));
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const rect = document.getElementById('comparison-container')?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left;
      const position = (x / rect.width) * 100;
      setDividerPosition(Math.min(100, Math.max(0, position)));
    };

    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isDragging]);

  const handleZoom = (direction: 'in' | 'out') => {
    if (direction === 'in') {
      setZoomLevel(prev => Math.min(200, prev + 25));
    } else {
      setZoomLevel(prev => Math.max(50, prev - 25));
    }
  };

  const handleExport = async (format: 'jpg' | 'tiff' | 'png') => {
    toast.success(`Exporting ${format.toUpperCase()} file...`);
    // Mock export - would call actual export API
    setTimeout(() => {
      toast.success('Export completed successfully!');
    }, 2000);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
          </p>
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link href="/" className="flex items-center justify-center">
          <h1 className="text-xl font-semibold">Luminary Lab</h1>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link href="/dashboard" className="text-sm font-medium hover:underline">
            Dashboard
          </Link>
          <Link href="/upload" className="text-sm font-medium hover:underline">
            Upload
          </Link>
        </nav>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Project Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary">
                  {project.styleName}
                </Badge>
                <Badge variant="outline">
                  {Math.round((project.intensity || 0) * 100)}% intensity
                </Badge>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Comparison Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Comparison Controls</CardTitle>
            <CardDescription>
              Drag divider or use controls to compare before/after
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium w-20">View:</span>
              <div className="flex gap-2">
                <Button
                  variant={showOriginal ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOriginal(true)}
                >
                  Original
                </Button>
                <Button
                  variant={!showOriginal ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOriginal(false)}
                >
                  Processed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOriginal(!showOriginal)}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Compare
                </Button>
              </div>
            </div>

            {!showOriginal && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-20">Zoom:</span>
                <div className="flex gap-2 items-center flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleZoom('out')}
                    disabled={zoomLevel <= 50}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground w-12 text-center">
                    {zoomLevel}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleZoom('in')}
                    disabled={zoomLevel >= 200}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoomLevel(100)}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparison Viewer */}
        <Card className="mb-6 overflow-hidden">
          <CardContent className="p-0">
            <div
              id="comparison-container"
              className="relative w-full bg-black"
              style={{ height: '600px' }}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
            >
              {(showOriginal || !project.originalImageUrl || !project.processedImageUrl) ? (
                <div className="w-full h-full flex items-center justify-center">
                  {showOriginal ? (
                    <div className="text-white text-center">
                    <p className="text-lg font-medium mb-2">Original Image</p>
                    <p className="text-sm text-muted">
                      {project.originalImageUrl ? (
                        <Image
                          src={project.originalImageUrl}
                          alt="Original"
                          width={1200}
                          height={800}
                          className="max-w-full max-h-full object-contain"
                          style={{ transform: `scale(${zoomLevel / 100})` }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 space-y-3">
                          <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center">
                            <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="text-base">Original image not available</p>
                          <p className="text-xs text-muted-foreground max-w-xs">
                            The original image for this project could not be found.
                          </p>
                        </div>
                      )}
                    </p>
                  </div>
                  ) : (
                    <div className="text-white text-center">
                      <p className="text-lg font-medium mb-2">Processed Image</p>
                      <p className="text-sm text-muted">
                        {project.processedImageUrl ? (
                          <Image
                            src={project.processedImageUrl}
                            alt="Processed"
                            width={1200}
                            height={800}
                            className="max-w-full max-h-full object-contain"
                            style={{ transform: `scale(${zoomLevel / 100})` }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 space-y-3">
                            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                            <p className="text-base">
                              {project.status === 'processing'
                                ? 'Processing your image...'
                                : project.status === 'queued'
                                ? 'Waiting to process...'
                                : 'Processing not completed'}
                            </p>
                            <p className="text-xs text-muted-foreground max-w-xs">
                              This may take 2-3 minutes. You can come back later or refresh the page.
                            </p>
                          </div>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Original Image (Left Side) */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${dividerPosition}%` }}
                  >
                    <Image
                      src={project.originalImageUrl}
                      alt="Original"
                      fill
                      className="object-contain"
                      style={{ transform: `scale(${zoomLevel / 100})` }}
                    />
                  </div>

                  {/* Processed Image (Right Side) */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ 
                      left: `${dividerPosition}%`,
                      width: `${100 - dividerPosition}%` 
                    }}
                  >
                    <Image
                      src={project.processedImageUrl}
                      alt="Processed"
                      fill
                      className="object-contain"
                      style={{ transform: `scale(${zoomLevel / 100})` }}
                    />
                  </div>

                  {/* Divider Line */}
                  <div
                    className={`absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize ${
                      isDragging ? 'opacity-100' : 'opacity-60'
                    }`}
                    style={{ left: `${dividerPosition}%` }}
                    onMouseDown={handleMouseDown}
                  >
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-1">
                      <div className="w-4 h-0.5 bg-gray-600"></div>
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="absolute top-4 left-4 text-white bg-black/50 px-2 py-1 rounded text-sm">
                    Original
                  </div>
                  <div className="absolute top-4 right-4 text-white bg-black/50 px-2 py-1 rounded text-sm">
                    Processed
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Export Options</CardTitle>
            <CardDescription>
              Download your processed image in various formats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => handleExport('jpg')}
              >
                <Download className="mb-2 h-6 w-6" />
                <div className="text-left">
                  <div className="font-medium">JPEG</div>
                  <div className="text-xs text-muted-foreground">
                    sRGB, 8-bit
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => handleExport('tiff')}
              >
                <Download className="mb-2 h-6 w-6" />
                <div className="text-left">
                  <div className="font-medium">TIFF</div>
                  <div className="text-xs text-muted-foreground">
                    16-bit, ProPhoto RGB
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => handleExport('png')}
              >
                <Download className="mb-2 h-6 w-6" />
                <div className="text-left">
                  <div className="font-medium">PNG</div>
                  <div className="text-xs text-muted-foreground">
                    Lossless, 16-bit
                  </div>
                </div>
              </Button>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <div className="flex justify-between items-center">
                <Button asChild variant="outline">
                  <Link href={`/edit/${projectId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Edit
                  </Link>
                </Button>
                
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Save className="mr-2 h-4 w-4" />
                    Save Project
                  </Button>
                  <Button asChild>
                    <Link href={`/process/${projectId}`}>
                      <Download className="mr-2 h-4 w-4" />
                      Re-process
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
