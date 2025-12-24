'use client';

import * as React from 'react';
import { PresetGallery, Preset } from '@/components/ui/preset-gallery';
import { CompareSlider } from '@/components/ui/compare-slider';
import { ExportMenu, ExportOptions } from '@/components/ui/export-menu';
import { IntensitySlider } from '@/components/ui/intensity-slider';

const MOCK_PRESETS: Preset[] = [
  {
    id: 'p1',
    name: 'Cinematic Teal',
    description: 'Classic teal and orange look for dramatic impact.',
    exampleImageUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=600&auto=format&fit=crop', // Placeholder
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
];

export default function CoreUITestPage() {
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null);
  const [intensity, setIntensity] = React.useState(75);
  const [isExporting, setIsExporting] = React.useState(false);

  // Use reliable placeholders for diff
  const beforeImage = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=2000&auto=format&fit=crop";
  const afterImage = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2000&auto=format&fit=crop"; // Different look for contrast

  const handleExport = (options: ExportOptions) => {
    console.log('Exporting with options:', options);
    setIsExporting(true);
    // Simulate export delay
    setTimeout(() => {
        setIsExporting(false);
        alert(`Exported as ${options.format.toUpperCase()}!`);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-12 max-w-7xl mx-auto">
      
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Core UI Components Verification</h1>
         <p className="text-muted-foreground">Testing new components for Task 008, 011, 012</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-8">
            <section className="space-y-4">
                <h2 className="text-xl font-semibold border-b border-border pb-2">Preset Selection</h2>
                <PresetGallery 
                    presets={MOCK_PRESETS}
                    selectedPresetId={selectedPreset}
                    onSelect={(p) => setSelectedPreset(p.id)}
                />
            </section>
            
            <section className="space-y-4">
                <h2 className="text-xl font-semibold border-b border-border pb-2">Adjustments</h2>
                <IntensitySlider 
                    value={intensity}
                    onValueChange={setIntensity}
                />
            </section>

             <section className="space-y-4">
                <h2 className="text-xl font-semibold border-b border-border pb-2">Actions</h2>
                <div className="p-6 bg-card rounded-md border border-border flex flex-col items-center justify-center gap-4">
                    <p className="text-sm text-muted-foreground text-center">Ready to save your masterpiece?</p>
                    <ExportMenu onExport={handleExport} isExporting={isExporting} />
                </div>
            </section>
        </div>

        {/* Right Column: Display */}
        <div className="lg:col-span-8 space-y-8">
             <section className="space-y-4 h-full">
                <div className="flex justify-between items-end border-b border-border pb-2 mb-4">
                    <h2 className="text-xl font-semibold">Comparison View</h2>
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">Interactive Preview</span>
                </div>
                
                <div className="aspect-[3/2] w-full bg-card rounded-lg border border-border overflow-hidden relative shadow-2xl">
                    <CompareSlider 
                        beforeImage={beforeImage}
                        afterImage={afterImage}
                        beforeLabel="Original RAW"
                        afterLabel="Processed (AI)"
                    />
                </div>
                
                 <div className="grid grid-cols-2 gap-4 mt-4">
                     <div className="p-4 rounded-sm border border-border bg-card/50">
                         <h4 className="text-sm font-medium text-white mb-1">Before Stats</h4>
                         <p className="text-xs text-muted-foreground">Resolution: 6000x4000</p>
                         <p className="text-xs text-muted-foreground">Format: CR3 (Canon)</p>
                     </div>
                      <div className="p-4 rounded-sm border border-border bg-card/50">
                         <h4 className="text-sm font-medium text-primary mb-1">After Stats</h4>
                         <p className="text-xs text-muted-foreground">Filter: {MOCK_PRESETS.find(p => p.id === selectedPreset)?.name || "None"}</p>
                         <p className="text-xs text-muted-foreground">Intensity: {intensity}%</p>
                     </div>
                 </div>
            </section>
        </div>

      </div>

    </div>
  );
}
