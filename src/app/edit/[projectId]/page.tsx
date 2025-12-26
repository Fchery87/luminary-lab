'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, Sparkles, ChevronLeft, Filter } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type Preset } from '@/components/ui/preset-gallery';
import { IntensitySlider } from '@/components/ui/intensity-slider';
import { CompareSlider } from '@/components/ui/compare-slider';
import { ExportMenu, type ExportOptions } from '@/components/ui/export-menu';
import { Header } from '@/components/ui/header';
import { WhatsNextPanel } from '@/components/ui/whats-next-panel';
import { motion, AnimatePresence } from 'framer-motion';

// Category configuration with icons
const CATEGORIES = [
  { id: 'all', label: 'All Styles', description: 'View all presets' },
  { id: 'portrait', label: 'Portrait & Beauty', description: 'Beauty retouching & portraits' },
  { id: 'film', label: 'Film Emulation', description: 'Classic film stock looks' },
  { id: 'cinematic', label: 'Cinematic', description: 'Movie-style color grading' },
  { id: 'moody', label: 'Moody & Dramatic', description: 'Dark, dramatic looks' },
  { id: 'creative', label: 'Creative', description: 'Modern artistic effects' },
  { id: 'b&w', label: 'Black & White', description: 'Monochrome styles' },
  { id: 'vintage', label: 'Vintage', description: 'Nostalgic looks' },
  { id: 'ai', label: 'AI Enhanced', description: 'Smart AI-powered edits' },
  { id: 'specialized', label: 'Specialized', description: 'Food, product, landscape' },
];

// Popular preset names for smart defaults
const POPULAR_PRESET_NAMES = [
  'Cinematic Teal & Orange',
  'Clean Commercial Beauty',
  'Soft Editorial',
  'Kodak Portra 400',
];

// Local storage keys
const STORAGE_KEYS = {
  LAST_USED_PRESET: 'luminary_last_used_preset',
  DISMISSED_WHATS_NEXT: 'luminary_dismissed_whats_next',
};

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();
  
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [intensity, setIntensity] = useState(70);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showWhatsNext, setShowWhatsNext] = useState(true);
  const [recommendedPresetId, setRecommendedPresetId] = useState<string | null>(null);
  const [popularPresets, setPopularPresets] = useState<Preset[]>([]);
  
  // Fetch user preferences
  const { data: userPreferences } = useQuery({
    queryKey: ['userPreferences'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/user/preferences', { credentials: 'include' });
        if (!res.ok) return null;
        const data = await res.json();
        return data.preferences;
      } catch (error) {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch Project Data
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: 'include' });
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

  // Fetch presets from API
  const { data: presets = [], isLoading: presetsLoading } = useQuery({
    queryKey: ['presets'],
    queryFn: async () => {
      const res = await fetch('/api/presets', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch presets');
      const data = await res.json();
      return data.presets || data as Preset[];
    },
  });

  // Save user preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save preferences');
      return res.json();
    },
  });

  // Initialize smart defaults when presets are loaded
  useEffect(() => {
    if (presets.length === 0) return;

    // Find popular presets
    const popular = presets.filter((preset: Preset) =>
      POPULAR_PRESET_NAMES.includes(preset.name)
    );
    setPopularPresets(popular);

    // Check local storage for last used preset
    const lastUsedPresetId = localStorage.getItem(STORAGE_KEYS.LAST_USED_PRESET);
    const dismissedWhatsNext = localStorage.getItem(STORAGE_KEYS.DISMISSED_WHATS_NEXT);

    // Set what's next visibility
    setShowWhatsNext(dismissedWhatsNext !== 'true');

    // Determine recommended preset
    let recommended: Preset | null = null;

    // Priority 1: Last used preset from localStorage
    if (lastUsedPresetId) {
      recommended = presets.find((p: Preset) => p.id === lastUsedPresetId) || null;
    }

    // Priority 2: Last used preset from user preferences
    if (!recommended && userPreferences?.lastUsedPreset) {
      recommended = presets.find((p: Preset) => p.id === userPreferences.lastUsedPreset.id) || null;
    }

    // Priority 3: Popular preset (Cinematic Teal & Orange)
    if (!recommended) {
      recommended = presets.find((p: Preset) => p.name === 'Cinematic Teal & Orange') || popular[0] || null;
    }

    if (recommended) {
      setRecommendedPresetId(recommended.id);
      setSelectedPreset(recommended);
      // Also set preferred intensity
      if (userPreferences?.preferredIntensity) {
        setIntensity(Math.round(userPreferences.preferredIntensity * 100));
      }
    }
  }, [presets, userPreferences]);

  // Handle preset selection
  const handlePresetSelect = (preset: Preset) => {
    setSelectedPreset(preset);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.LAST_USED_PRESET, preset.id);
    
    // Save to user preferences (debounced in real app, here immediate)
    savePreferencesMutation.mutate({
      lastUsedPresetId: preset.id,
      preferredIntensity: intensity / 100,
    });
  };

  // Handle intensity change
  const handleIntensityChange = (value: number) => {
    setIntensity(value);
    
    // Save to user preferences
    savePreferencesMutation.mutate({
      preferredIntensity: value / 100,
    });
  };

  // Handle what's next dismiss
  const handleDismissWhatsNext = () => {
    setShowWhatsNext(false);
    localStorage.setItem(STORAGE_KEYS.DISMISSED_WHATS_NEXT, 'true');
    savePreferencesMutation.mutate({
      dismissedWhatNext: true,
    });
  };

  // Filter presets by category
  const filteredPresets = presets.filter((preset: any) => 
    selectedCategory === 'all' || preset.category === selectedCategory
  );

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
              credentials: 'include',
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

  // Handle what's next actions
  const handleWhatsNextAction = (action: string) => {
    switch (action) {
      case 'adjustSettings':
        // Scroll to intensity slider
        document.getElementById('intensity-slider')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      case 'download':
        // Trigger export dialog
        document.getElementById('export-button')?.click();
        break;
      case 'share':
        toast.success('Share functionality coming soon!');
        break;
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
            <p className="text-muted-foreground">The project could not be found or you don&apos;t have permission.</p>
            <Button asChild variant="secondary"><Link href="/dashboard">Return to Dashboard</Link></Button>
        </div>
      )
  }

  // Determine images to show
  // For RAW files, we need to use the thumbnail since browsers can't display RAW
  // Priority: large thumbnail > medium thumbnail > any thumbnail > original (for non-RAW)
  const thumbnailImage = project.images?.find((img: any) => img.type === 'thumbnail')?.url;
  const originalImageObj = project.images?.find((img: any) => img.type === 'original' || !img.type);
  const isRawFile = originalImageObj?.mimeType?.startsWith('image/x-');
  
  // Use thumbnail for RAW files, otherwise use original
  const originalImage = (isRawFile ? thumbnailImage : originalImageObj?.url)
    || thumbnailImage  // Fallback to thumbnail if original not displayable
    || originalImageObj?.url  // Try original anyway
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
                             sizes="(max-width: 1024px) 100vw, 75vw"
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
            
            {/* What's Next Panel */}
            <AnimatePresence>
              {showWhatsNext && (
                <WhatsNextPanel
                  presets={presets}
                  popularPresets={popularPresets}
                  recommendedPresetId={recommendedPresetId}
                  selectedPresetId={selectedPreset?.id || null}
                  onApplyPreset={handlePresetSelect}
                  onAdjustSettings={() => handleWhatsNextAction('adjustSettings')}
                  onDownload={() => handleWhatsNextAction('download')}
                  onShare={() => handleWhatsNextAction('share')}
                  className="shadow-lg"
                />
              )}
            </AnimatePresence>

            <Card className="border-border shadow-lg flex-1 flex flex-col">
                <CardHeader className="pb-4 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Creative Suite
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 flex-1 overflow-y-auto">
                    
                    {/* Category Tabs */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Filter className="h-3 w-3 text-muted-foreground" />
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Filter Styles
                            </label>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {CATEGORIES.map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`
                                        px-2 py-1 text-xs font-medium rounded-sm transition-all duration-200
                                        ${selectedCategory === category.id
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary/70'
                                        }
                                    `}
                                    title={category.description}
                                >
                                    {category.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                {selectedCategory === 'all' ? 'All Styles' : CATEGORIES.find(c => c.id === selectedCategory)?.label}
                            </label>
                            <span className="text-xs text-muted-foreground">
                                {filteredPresets.length} styles
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {filteredPresets.length > 0 ? (
                                filteredPresets.map((preset: any) => {
                                    const isRecommended = preset.id === recommendedPresetId;
                                    const isSelected = selectedPreset?.id === preset.id;
                                    
                                    return (
                                        <div 
                                            key={preset.id}
                                            onClick={() => handlePresetSelect(preset)}
                                            className={`
                                                group relative cursor-pointer overflow-hidden rounded-sm border transition-all duration-200
                                                ${isSelected
                                                    ? 'border-primary ring-1 ring-primary/50 shadow-[0_0_15px_rgba(212,160,86,0.2)]' 
                                                    : isRecommended
                                                    ? 'border-amber-500/60 hover:border-primary/50 hover:shadow-[0_0_12px_rgba(212,160,86,0.15)]'
                                                    : 'border-border hover:border-primary/50'
                                                }
                                            `}
                                        >
                                             <div className="flex items-center gap-3 p-2 bg-card">
                                                 <div className="relative h-12 w-12 rounded-sm overflow-hidden flex-shrink-0">
                                                     <Image
                                                         src={preset.exampleImageUrl}
                                                         alt={preset.name}
                                                         fill
                                                         sizes="48px"
                                                         className="object-cover"
                                                     />
                                                 </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">{preset.name}</p>
                                                        {isRecommended && !isSelected && (
                                                            <div className="flex-shrink-0">
                                                                <Sparkles className="h-3 w-3 text-amber-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {preset.description && (
                                                        <p className="text-xs text-muted-foreground truncate">{preset.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Category badge */}
                                            {preset.category && (
                                                <div className="absolute top-1 right-1">
                                                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-background/90 rounded-sm border border-border/50 text-muted-foreground">
                                                        {preset.category}
                                                    </span>
                                                </div>
                                            )}
                                            {/* Recommended badge (gold) */}
                                            {isRecommended && !isSelected && (
                                                <div className="absolute bottom-1 left-1">
                                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-amber-500/90 text-white rounded-sm border border-amber-400/30 shadow-sm">
                                                        Recommended
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No presets found in this category</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                     <div id="intensity-slider" className="space-y-4 pt-4 border-t border-border/50">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Fine Tune
                        </label>
                        
                         <IntensitySlider
                          value={intensity}
                          onValueChange={handleIntensityChange}
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
