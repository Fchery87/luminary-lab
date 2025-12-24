'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, Sparkles, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type Preset } from '@/components/ui/preset-gallery';
import { IntensitySlider } from '@/components/ui/intensity-slider';
import { CompareSlider } from '@/components/ui/compare-slider';
import { ExportMenu, type ExportOptions } from '@/components/ui/export-menu';
import { Header } from '@/components/ui/header';
import { motion, AnimatePresence } from 'framer-motion';
import { TextShimmer } from '@/components/ui/text-shimmer';

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();
  
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [intensity, setIntensity] = useState(70);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Fetch Project Data
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
          if (res.status === 404) throw new Error('Project not found');
          throw new Error('Failed to fetch project');
      }
      return res.json();
    },
    // Poll for status if processing
    refetchInterval: (query) => {
        const status = query.state.data?.status;
        return (status === 'processing' || status === 'queued') ? 2000 : false;
    }
  });

  // Fetch presets (Mock for now, or real API if implemented)
  const { data: presets = [], isLoading: presetsLoading } = useQuery({
    queryKey: ['presets'],
    queryFn: async () => {
      // Return mock presets directly for now to ensure UI works
      return [
        {
            id: 'p1',
            name: 'Cinematic Teal',
            description: 'Classic teal and orange look for dramatic impact.',
            exampleImageUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=600&auto=format&fit=crop',
        },
        {
            id: 'p2',
            name: 'Monochrome Noir',
            description: 'High contrast black and white with subtle grain.',
            exampleImageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600&auto=format&fit=crop',
        },
        {
            id: 'p3',
            name: 'Vivid Pop',
            description: 'Enhanced saturation and vibrance for social media.',
            exampleImageUrl: 'https://images.unsplash.com/photo-1504198458649-3128b932f49e?q=80&w=600&auto=format&fit=crop',
        },
        {
            id: 'p4',
            name: 'Vintage Film',
            description: 'Faded blacks and warm highlights mimicking Kodak Gold.',
            exampleImageUrl: 'https://images.unsplash.com/photo-1517502166878-35c93c008235?q=80&w=600&auto=format&fit=crop',
        },
      ] as Preset[];
    },
  });

  // Start processing mutation
  const startProcessingMutation = useMutation({
    mutationFn: async () => {
       // Mock processing trigger
       // In real app: POST /api/projects/[id]/process
       await new Promise(resolve => setTimeout(resolve, 1500)); 
       return { success: true };
    },
    onSuccess: () => {
      toast.success('Processing started!');
      // Optimistically update status
      queryClient.setQueryData(['project', projectId], (old: any) => ({
          ...old,
          status: 'processing'
      }));
      setIsProcessing(false);
      
      // Simulate completion after a few seconds for demo
      setTimeout(() => {
           toast.success('Processing complete!');
           queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      }, 3000);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setIsProcessing(false);
    },
  });

  const handleStartProcessing = () => {
    if (!selectedPreset) {
      toast.error('Please select a preset');
      return;
    }
    setIsProcessing(true);
    startProcessingMutation.mutate();
  };

  const handleExport = async (options: ExportOptions) => {
      setIsExporting(true);
      try {
          const res = await fetch(`/api/projects/${projectId}/export`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(options)
          });
          
          if (!res.ok) throw new Error('Export failed');
          
          const data = await res.json();
          // Mock download
          toast.success(`Export ready: ${options.format.toUpperCase()}`);
          console.log('Download URL:', data.downloadUrl);
          
      } catch (e) {
          toast.error('Failed to export image');
      } finally {
          setIsExporting(false);
      }
  };

  if (projectLoading || presetsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (projectError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-4">
            <h1 className="text-2xl font-bold text-destructive">Error Loading Project</h1>
            <p className="text-muted-foreground">The project could not be found or you don't have permission.</p>
            <Button asChild variant="secondary"><Link href="/dashboard">Return to Dashboard</Link></Button>
        </div>
      )
  }

  // Determine images to show
  // Fallback to placeholder if original URL missing (shouldn't happen in real app)
  const originalImage = project.images?.find((img: any) => img.type === 'original' || !img.type)?.url 
    || project.originalImageUrl 
    || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=2000&auto=format&fit=crop';
    
  // Check if we have a processed image
  const processedImageObj = project.images?.find((img: any) => img.type === 'processed');
  const processedImage = processedImageObj?.url || project.processedImageUrl; 

  // In this demo, we also want to simulate 'processing' state visually if just finished
  const hasProcessed = !!processedImage;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header 
        variant="minimal"
        navigation={
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                    <Link href="/dashboard">
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back
                    </Link>
                </Button>
                <div className="h-4 w-px bg-border" />
                <span className="font-semibold text-sm">{project.name}</span>
            </div>
        }
        showUserMenu={true}
      />

      <main className="flex-1 container mx-auto px-4 py-6 lg:py-8 h-[calc(100vh-64px)] flex flex-col">
        
        <div className="grid gap-6 lg:grid-cols-12 h-full">
            
          {/* Main Canvas Area */}
          <div className="lg:col-span-9 flex flex-col gap-4 h-full min-h-[500px]">
             {/* Toolbar */}
             <div className="flex justify-between items-center bg-card/50 p-2 rounded-sm border border-border">
                 <div className="flex gap-2">
                     <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground px-3 py-1.5">
                         {hasProcessed ? 'Compare Mode' : 'Original Preview'}
                     </span>
                 </div>
                 <div className="flex gap-2">
                     <ExportMenu onExport={handleExport} isExporting={isExporting} />
                 </div>
             </div>

             {/* Viewport */}
             <div className="flex-1 relative rounded-md border border-border bg-secondary/20 overflow-hidden shadow-2xl">
                 {hasProcessed ? (
                     <CompareSlider 
                        beforeImage={originalImage}
                        afterImage={processedImage}
                        className="h-full w-full absolute inset-0"
                        aspectRatio="h-full" // Override aspect
                     />
                 ) : (
                     <div className="h-full w-full relative">
                         <Image 
                            src={originalImage} 
                            alt="Original" 
                            fill 
                            className="object-contain"
                         />
                         {!isProcessing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
                                <div className="bg-background/90 p-4 rounded-md border border-border shadow-xl text-center">
                                    <p className="font-medium">Ready to Process</p>
                                    <p className="text-xs text-muted-foreground mt-1">Select a preset on the right to begin</p>
                                </div>
                            </div>
                         )}
                         {isProcessing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
                                <div className="flex flex-col items-center gap-4">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                    <p className="text-white font-medium animate-pulse">Generating Magic...</p>
                                </div>
                            </div>
                         )}
                     </div>
                 )}
             </div>
          </div>

          {/* Right Sidebar - Tools */}
          <div className="lg:col-span-3 flex flex-col gap-6 h-full overflow-y-auto pr-1">
            
            <Card className="border-border shadow-lg flex-1 flex flex-col">
                <CardHeader className="pb-4 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Creative Suite
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 flex-1 overflow-y-auto">
                    
                    {/* Presets */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            1. Select Style
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                            {presets.map(preset => (
                                <div 
                                    key={preset.id}
                                    onClick={() => setSelectedPreset(preset)}
                                    className={`
                                        group relative cursor-pointer overflow-hidden rounded-sm border transition-all duration-200
                                        ${selectedPreset?.id === preset.id 
                                            ? 'border-primary ring-1 ring-primary/50 shadow-[0_0_15px_rgba(48,227,202,0.15)]' 
                                            : 'border-border hover:border-primary/50'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3 p-2 bg-card">
                                        <div className="relative h-12 w-12 rounded-sm overflow-hidden flex-shrink-0">
                                            <Image src={preset.exampleImageUrl} alt={preset.name} fill className="object-cover" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{preset.name}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Controls */}
                     <div className="space-y-4 pt-4 border-t border-border/50">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            2. Fine Tune
                        </label>
                        
                         <IntensitySlider
                          value={intensity}
                          onValueChange={setIntensity}
                          disabled={!selectedPreset}
                        />
                     </div>

                </CardContent>
                
                {/* Action Footer */}
                <div className="p-4 border-t border-border mt-auto bg-secondary/10">
                    <Button
                        onClick={handleStartProcessing}
                        disabled={isProcessing || !selectedPreset}
                        className="w-full h-10 text-sm font-semibold shadow-md transition-all hover:scale-[1.02] uppercase tracking-wide"
                        size="default"
                    >
                    {isProcessing ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                        </>
                    ) : (
                        <>
                        <Eye className="mr-2 h-4 w-4" />
                        Apply Style
                        </>
                    )}
                    </Button>
                </div>
            </Card>

            <div className="bg-muted/30 rounded-sm p-4 border border-border/50 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                    <span>Source</span>
                    <span className="font-mono text-foreground opacity-70">ORIGINAL</span>
                </div>
                <div className="flex justify-between">
                    <span>Resolution</span>
                    <span className="font-mono text-foreground opacity-70">High-Res</span>
                </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
