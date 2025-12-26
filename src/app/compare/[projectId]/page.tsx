'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  Sparkles,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/ui/header';

interface ProjectData {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  images?: Array<{
    id: string;
    type: 'original' | 'processed' | 'thumbnail';
    url: string;
    filename: string;
    mimeType: string;
  }>;
  styleName?: string;
  intensity?: number;
}

export default function ComparePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const isOnboarding = searchParams.get('onboarding') === 'true';

  const [zoomLevel, setZoomLevel] = useState(100);
  const [dividerPosition, setDividerPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showAhaMoment, setShowAhaMoment] = useState(false);

  // Show "Aha" moment celebration on mount if onboarding
  useEffect(() => {
    if (isOnboarding) {
      // Delay the celebration slightly for better UX
      const timer = setTimeout(() => {
        setShowAhaMoment(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnboarding]);

  // Fetch project data from API
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Project not found');
        throw new Error('Failed to fetch project');
      }
      return res.json() as Promise<ProjectData>;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return (status === 'processing' || status === 'queued') ? 2000 : false;
    }
  });

  // Extract image URLs from project images array
  // For RAW files, we need to use the thumbnail since browsers can't display RAW
  // Priority: large thumbnail > medium thumbnail > small thumbnail > original (for non-RAW)
  const largeThumbnail = project?.images?.find((img: any) => img.type === 'thumbnail' && img.filename?.includes('thumb_large'))?.url;
  const mediumThumbnail = project?.images?.find((img: any) => img.type === 'thumbnail' && img.filename?.includes('thumb_medium'))?.url;
  const anyThumbnail = project?.images?.find((img: any) => img.type === 'thumbnail')?.url;
  const originalImageObj = project?.images?.find((img: any) => img.type === 'original');
  const isRawFile = originalImageObj?.mimeType?.startsWith('image/x-');
  
  // Use large thumbnail for RAW files, otherwise use original
  const originalImageUrl = (isRawFile ? (largeThumbnail || mediumThumbnail || anyThumbnail) : originalImageObj?.url)
    || largeThumbnail   // Fallback to large thumbnail
    || mediumThumbnail  // Then medium
    || anyThumbnail     // Then any thumbnail
    || originalImageObj?.url;  // Try original anyway
    
  const processedImageUrl = project?.images?.find((img: any) => img.type === 'processed')?.url;

  // Debug logging
  useEffect(() => {
    if (project) {
      console.log('[Compare] Project data loaded:', {
        projectId: project.id,
        status: project.status,
        imagesCount: project.images?.length || 0,
        images: project.images?.map((img: any) => ({
          type: img.type,
          hasUrl: !!img.url,
          filename: img.filename
        }))
      });
      
      if (!originalImageUrl) {
        console.warn('[Compare] No original image URL found. Images:', project.images);
      } else {
        console.log('[Compare] Original image URL:', originalImageUrl);
      }
    }
  }, [project, originalImageUrl]);

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

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-destructive">Error Loading Project</h2>
          <p className="text-muted-foreground mb-6">
            {error instanceof Error ? error.message : 'An error occurred while loading the project.'}
          </p>
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
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
      <Header
        variant="minimal"
        showUserMenu={true}
      />

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
              {/* Show original-only view or handle missing images */}
              {showOriginal || !originalImageUrl || !processedImageUrl ? (
                <div className="w-full h-full flex items-center justify-center">
                  {showOriginal ? (
                    <div className="text-white text-center">
                    <p className="text-lg font-medium mb-2">Original Image</p>
                    <div className="text-sm text-muted">
                      {originalImageUrl && !isRawFile ? (
                        <Image
                          src={originalImageUrl}
                          alt="Original"
                          width={1200}
                          height={800}
                          className="max-w-full max-h-full object-contain"
                          style={{ transform: `scale(${zoomLevel / 100})` }}
                        />
                      ) : isRawFile && !thumbnailUrl ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-3">
                          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="text-base font-medium">RAW File Uploaded</p>
                          <p className="text-sm text-muted-foreground">{originalImageObj?.filename || 'Unknown file'}</p>
                          <p className="text-xs text-muted-foreground max-w-xs">
                            Preview not available. Process your image to see the result.
                          </p>
                        </div>
                      ) : originalImageUrl ? (
                        <Image
                          src={originalImageUrl}
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
                    </div>
                  </div>
                  ) : (
                    <div className="text-white text-center">
                      <p className="text-lg font-medium mb-2">Processed Image</p>
                      <div className="text-sm text-muted">
                        {processedImageUrl ? (
                          <Image
                            src={processedImageUrl}
                            alt="Processed"
                            width={1200}
                            height={800}
                            className="max-w-full max-h-full object-contain"
                            style={{ transform: `scale(${zoomLevel / 100})` }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 space-y-3">
                            {project.status === 'pending' || project.status === 'processing' || project.status === 'queued' ? (
                              <>
                                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                <p className="text-base">
                                  {project.status === 'processing'
                                    ? 'Processing your image...'
                                    : project.status === 'queued'
                                    ? 'Waiting to process...'
                                    : 'Processing not started'}
                                </p>
                                <p className="text-xs text-muted-foreground max-w-xs mb-4">
                                  {project.status === 'pending'
                                    ? 'Go to the editor to start processing your image.'
                                    : 'This may take 2-3 minutes. You can come back later or refresh the page.'}
                                </p>
                                {project.status === 'pending' && (
                                  <Button asChild>
                                    <Link href={`/edit/${projectId}`}>
                                      <Sparkles className="mr-2 h-4 w-4" />
                                      Go to Editor to Start Processing
                                    </Link>
                                  </Button>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="text-base">Processing not completed</p>
                                <p className="text-xs text-muted-foreground max-w-xs">
                                  The processed image is not available yet.
                                </p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
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
                       src={originalImageUrl!}
                       alt="Original"
                       fill
                       sizes="100vw"
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
                       src={processedImageUrl!}
                       alt="Processed"
                       fill
                       sizes="100vw"
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

        {/* "Aha" Moment Celebration */}
        <AnimatePresence>
          {showAhaMoment && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="relative"
            >
              <Card className="mb-6 border-2 border-[hsl(var(--gold))] bg-gradient-to-br from-[hsl(var(--gold))]/10 to-[hsl(var(--gold-light))]/5 overflow-hidden">
                {/* Animated sparkles */}
                <div className="absolute top-0 right-0 w-32 h-32 opacity-30">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-full h-full text-[hsl(var(--gold))]" />
                  </motion.div>
                </div>
                <div className="absolute bottom-0 left-0 w-24 h-24 opacity-20">
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-full h-full text-[hsl(var(--gold-light))]" />
                  </motion.div>
                </div>

                <CardContent className="p-6 relative z-10">
                  <div className="flex items-start gap-4">
                    {/* Close button */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowAhaMoment(false)}
                      className="flex-shrink-0 p-1.5 rounded-full hover:bg-[hsl(var(--gold))]/20 transition-colors text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))]"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>

                    <div className="flex-1">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                      >
                        <h3 className="font-display text-2xl font-bold text-[hsl(var(--gold))] mb-2">
                          🎉 Your First Aha Moment!
                        </h3>
                        <p className="font-body text-[hsl(var(--foreground))] mb-4 leading-relaxed">
                          Compare the <strong>Original</strong> and <strong>Processed</strong> images above to see the magic of AI photo enhancement. Drag the divider to reveal the stunning improvements!
                        </p>

                        <div className="flex flex-wrap gap-3">
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] px-4 py-2 rounded-sm text-sm font-semibold font-display uppercase tracking-wider"
                            onClick={() => setShowAhaMoment(false)}
                          >
                            Got It, Let&apos;s Explore!
                          </motion.div>
                          <Link href="/dashboard">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="border border-[hsl(var(--gold))] text-[hsl(var(--gold))] px-4 py-2 rounded-sm text-sm font-semibold font-display uppercase tracking-wider hover:bg-[hsl(var(--gold))]/10"
                            >
                              Back to Dashboard
                            </motion.button>
                          </Link>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

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
