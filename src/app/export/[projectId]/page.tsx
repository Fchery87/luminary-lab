'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Download,
  ArrowLeft,
  CheckCircle,
  Settings,
  ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Header } from '@/components/ui/header';

export default function ExportPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [format, setFormat] = useState('jpg');
  const [quality, setQuality] = useState('high');
  const [size, setSize] = useState('web');
  const [isExporting, setIsExporting] = useState(false);

  const formats = [
    {
      value: 'jpg',
      label: 'JPEG',
      description: 'Best for web and email',
      colorSpace: 'sRGB',
      bitDepth: '8-bit',
    },
    {
      value: 'tiff',
      label: 'TIFF',
      description: 'Professional printing',
      colorSpace: 'ProPhoto RGB',
      bitDepth: '16-bit',
    },
    {
      value: 'png',
      label: 'PNG',
      description: 'Lossless compression',
      colorSpace: 'sRGB',
      bitDepth: '16-bit',
    },
  ];

  const qualities = [
    {
      value: 'standard',
      label: 'Standard',
      description: 'Fast export, good quality',
      settings: { jpeg: 85, tiff: 8, png: 6 },
    },
    {
      value: 'high',
      label: 'High',
      description: 'Best balance',
      settings: { jpeg: 95, tiff: 16, png: 8 },
    },
    {
      value: 'ultra',
      label: 'Ultra',
      description: 'Maximum quality',
      settings: { jpeg: 100, tiff: 16, png: 8 },
    },
  ];

  const sizes = [
    {
      value: 'web',
      label: 'Web (2048px)',
      description: 'Optimized for web use',
    },
    {
      value: 'print',
      label: 'Print (4000px)',
      description: 'High resolution for printing',
    },
    {
      value: 'original',
      label: 'Original',
      description: 'Full resolution',
    },
  ];

  const selectedFormat = formats.find(f => f.value === format);
  const selectedQuality = qualities.find(q => q.value === quality);
  const selectedSize = sizes.find(s => s.value === size);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          format,
          quality,
          size,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Export failed');
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export completed successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        variant="minimal"
        showUserMenu={true}
      />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Export Image</h1>
            <p className="text-muted-foreground">
              Choose your export settings and download the processed image
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Format Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Format
                </CardTitle>
                <CardDescription>Choose file format</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={format} onValueChange={setFormat}>
                  {formats.map((f) => (
                    <div key={f.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={f.value} id={f.value} />
                      <Label htmlFor={f.value} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{f.label}</span>
                          {format === f.value && <CheckCircle className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {f.description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {f.colorSpace} • {f.bitDepth}
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Quality Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Quality
                </CardTitle>
                <CardDescription>Export quality settings</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={quality} onValueChange={setQuality}>
                  {qualities.map((q) => (
                    <div key={q.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={q.value} id={q.value} />
                      <Label htmlFor={q.value} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{q.label}</span>
                          {quality === q.value && <CheckCircle className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {q.description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          JPEG: {q.settings.jpeg}%, 
                          TIFF: {q.settings.tiff}-bit, 
                          PNG: {q.settings.png}-bit
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Size Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Resolution</CardTitle>
                <CardDescription>Output image dimensions</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={size} onValueChange={setSize}>
                  {sizes.map((s) => (
                    <div key={s.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={s.value} id={s.value} />
                      <Label htmlFor={s.value} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{s.label}</span>
                          {size === s.value && <CheckCircle className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {s.description}
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Export Summary */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Export Summary</CardTitle>
              <CardDescription>Review your settings before export</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Format:</span>
                    <span className="text-sm">
                      {selectedFormat?.label} ({selectedFormat?.bitDepth})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Color Space:</span>
                    <span className="text-sm">{selectedFormat?.colorSpace}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Quality:</span>
                    <span className="text-sm">{selectedQuality?.label}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Resolution:</span>
                    <span className="text-sm">{selectedSize?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">File Type:</span>
                    <Badge variant="secondary">
                      luminary_{projectId}.{format.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Expires:</span>
                    <span className="text-sm">1 hour</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex gap-4">
                  <Button variant="outline" asChild>
                    <Link href={`/compare/${projectId}`}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Link>
                  </Button>
                  
                  <Button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex-1"
                  >
                    {isExporting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Export {selectedFormat?.label}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
