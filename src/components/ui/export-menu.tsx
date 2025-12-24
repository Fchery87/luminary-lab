'use client';

import * as React from 'react';
import { Download, Check, FileImage, ImageIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ExportOptions {
  format: 'jpg' | 'png' | 'tiff';
  quality: number;
  scale: number;
}

interface ExportMenuProps {
  onExport: (options: ExportOptions) => void;
  isExporting?: boolean;
}

export function ExportMenu({ onExport, isExporting = false }: ExportMenuProps) {
  const [format, setFormat] = React.useState<ExportOptions['format']>('jpg');
  const [quality, setQuality] = React.useState(100);

  const handleExport = () => {
    onExport({
        format,
        quality,
        scale: 1
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" className="min-w-[140px] gap-2 font-semibold shadow-lg shadow-primary/20">
            {isExporting ? (
                <>
                    <span className="animate-pulse">Exporting...</span>
                </>
            ) : (
                <>
                    <Download className="w-4 h-4" />
                    Export
                    <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
                </>
            )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Export Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
           <DropdownMenuLabel className="text-xs font-normal text-muted-foreground p-2 pb-0">Format</DropdownMenuLabel>
           
           <DropdownMenuItem onClick={() => setFormat('jpg')} className="justify-between">
              <span className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  JPEG
              </span>
              {format === 'jpg' && <Check className="w-4 h-4 text-primary" />}
           </DropdownMenuItem>
           
           <DropdownMenuItem onClick={() => setFormat('png')} className="justify-between">
              <span className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  PNG (Lossless)
              </span>
              {format === 'png' && <Check className="w-4 h-4 text-primary" />}
           </DropdownMenuItem>

           <DropdownMenuItem onClick={() => setFormat('tiff')} className="justify-between">
              <span className="flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-muted-foreground" />
                  TIFF (Print)
              </span>
              {format === 'tiff' && <Check className="w-4 h-4 text-primary" />}
           </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleExport} className="bg-primary/10 focus:bg-primary/20 text-primary justify-center font-semibold mt-1 cursor-pointer">
            Download {format.toUpperCase()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
