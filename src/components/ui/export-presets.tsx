"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExportPresets, type ExportPreset } from "@/hooks/use-export-presets";
import {
  Download,
  Settings,
  Copy,
  Trash2,
  Plus,
  Check,
  MoreVertical,
  FileImage,
  FileType,
  Palette,
  Type,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

interface ExportPresetsProps {
  onExport: (preset: ExportPreset) => void;
  className?: string;
}

export function ExportPresets({ onExport, className }: ExportPresetsProps) {
  const {
    presets,
    isLoaded,
    savePreset,
    deletePreset,
    duplicatePreset,
    resetToDefaults,
    createPreset,
  } = useExportPresets();

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ExportPreset | null>(null);

  const selectedPreset = presets.find((p) => p.id === selectedPresetId);

  const handleExport = () => {
    if (!selectedPreset) {
      toast.error("Please select an export preset");
      return;
    }
    onExport(selectedPreset);
  };

  const handleCreatePreset = (preset: ExportPreset) => {
    savePreset(preset);
    setIsCreateDialogOpen(false);
    toast.success(`Created preset "${preset.name}"`);
  };

  const handleEditPreset = (preset: ExportPreset) => {
    setEditingPreset(preset);
    setIsEditDialogOpen(true);
  };

  const handleUpdatePreset = (updatedPreset: ExportPreset) => {
    savePreset(updatedPreset);
    setIsEditDialogOpen(false);
    setEditingPreset(null);
    toast.success(`Updated preset "${updatedPreset.name}"`);
  };

  const handleDeletePreset = (id: string, name: string) => {
    deletePreset(id);
    if (selectedPresetId === id) {
      setSelectedPresetId(null);
    }
    toast.success(`Deleted preset "${name}"`);
  };

  const handleDuplicatePreset = (preset: ExportPreset) => {
    const newPreset = duplicatePreset(preset);
    toast.success(`Duplicated preset as "${newPreset.name}"`);
  };

  if (!isLoaded) {
    return (
      <div className={cn("animate-pulse bg-muted rounded-lg h-10", className)} />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Preset Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Export Preset</Label>
        <div className="flex gap-2">
          <Select
            value={selectedPresetId || ""}
            onValueChange={setSelectedPresetId}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a preset..." />
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  <div className="flex items-center gap-2">
                    <FileImage className="h-4 w-4 text-muted-foreground" />
                    <span>{preset.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {preset.format.toUpperCase()}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create New Preset
              </DropdownMenuItem>
              {selectedPreset && (
                <>
                  <DropdownMenuItem onClick={() => handleEditPreset(selectedPreset)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Edit Preset
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicatePreset(selectedPreset)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDeletePreset(selectedPreset.id, selectedPreset.name)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Preset
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={resetToDefaults}>
                <Settings className="mr-2 h-4 w-4" />
                Reset to Defaults
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Preset Details */}
      {selectedPreset && (
        <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <FileType className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Format:</span>
            <span className="font-medium uppercase">{selectedPreset.format}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Color Space:</span>
            <span className="font-medium">{selectedPreset.colorSpace}</span>
            <span className="text-xs text-muted-foreground">
              ({selectedPreset.bitDepth}-bit)
            </span>
          </div>
          {selectedPreset.quality < 100 && (
            <div className="flex items-center gap-2 text-sm">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Quality:</span>
              <span className="font-medium">{selectedPreset.quality}%</span>
            </div>
          )}
          {selectedPreset.resize?.width && (
            <div className="flex items-center gap-2 text-sm">
              <Type className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Resize:</span>
              <span className="font-medium">
                {selectedPreset.resize.width}px
                {selectedPreset.resize.maintainAspectRatio && " (aspect locked)"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Export Button */}
      <Button
        onClick={handleExport}
        disabled={!selectedPreset}
        className="w-full"
        size="lg"
      >
        <Download className="mr-2 h-4 w-4" />
        Export with Preset
      </Button>

      {/* Create Preset Dialog */}
      <PresetDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={handleCreatePreset}
        title="Create Export Preset"
      />

      {/* Edit Preset Dialog */}
      {editingPreset && (
        <PresetDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={handleUpdatePreset}
          preset={editingPreset}
          title="Edit Export Preset"
        />
      )}
    </div>
  );
}

interface PresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (preset: ExportPreset) => void;
  preset?: ExportPreset;
  title: string;
}

function PresetDialog({ open, onOpenChange, onSave, preset, title }: PresetDialogProps) {
  const isEditing = !!preset;
  const [name, setName] = useState(preset?.name || "");
  const [format, setFormat] = useState<"jpg" | "tiff" | "png">(preset?.format || "jpg");
  const [quality, setQuality] = useState(preset?.quality || 90);
  const [colorSpace, setColorSpace] = useState(preset?.colorSpace || "sRGB");
  const [bitDepth, setBitDepth] = useState<8 | 16>(preset?.bitDepth || 8);
  const [resizeEnabled, setResizeEnabled] = useState(!!preset?.resize?.width);
  const [resizeWidth, setResizeWidth] = useState(preset?.resize?.width || 2048);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(
    preset?.resize?.maintainAspectRatio !== false
  );
  const [keepMetadata, setKeepMetadata] = useState(preset?.metadata?.keepExif || false);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a preset name");
      return;
    }

    const newPreset: ExportPreset = {
      id: preset?.id || `custom-${Date.now()}`,
      name: name.trim(),
      format,
      quality,
      colorSpace,
      bitDepth,
      resize: resizeEnabled
        ? { width: resizeWidth, maintainAspectRatio }
        : undefined,
      metadata: { keepExif: keepMetadata, keepXmp: keepMetadata, keepIptc: keepMetadata },
      sharpening: preset?.sharpening || { amount: 25, radius: 1, detail: 25 },
      createdAt: preset?.createdAt || new Date().toISOString(),
    };

    onSave(newPreset);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Configure export settings for this preset
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="preset-name">Preset Name</Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Web Optimized"
            />
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as "jpg" | "tiff" | "png")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jpg">JPEG</SelectItem>
                <SelectItem value="tiff">TIFF</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quality (only for JPEG) */}
          {format === "jpg" && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Quality</Label>
                <span className="text-sm text-muted-foreground">{quality}%</span>
              </div>
              <Slider
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
                min={50}
                max={100}
                step={5}
              />
            </div>
          )}

          {/* Color Space */}
          <div className="space-y-2">
            <Label>Color Space</Label>
            <Select value={colorSpace} onValueChange={setColorSpace}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sRGB">sRGB</SelectItem>
                <SelectItem value="Adobe RGB">Adobe RGB</SelectItem>
                <SelectItem value="ProPhoto RGB">ProPhoto RGB</SelectItem>
                <SelectItem value="Display P3">Display P3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bit Depth */}
          <div className="space-y-2">
            <Label>Bit Depth</Label>
            <Select
              value={String(bitDepth)}
              onValueChange={(v) => setBitDepth(Number(v) as 8 | 16)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8-bit</SelectItem>
                <SelectItem value="16">16-bit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resize */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Resize Output</Label>
              <Switch checked={resizeEnabled} onCheckedChange={setResizeEnabled} />
            </div>
            {resizeEnabled && (
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label htmlFor="resize-width">Max Width (px)</Label>
                  <Input
                    id="resize-width"
                    type="number"
                    value={resizeWidth}
                    onChange={(e) => setResizeWidth(Number(e.target.value))}
                    min={100}
                    max={10000}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={maintainAspectRatio}
                    onCheckedChange={setMaintainAspectRatio}
                    id="maintain-aspect"
                  />
                  <Label htmlFor="maintain-aspect" className="text-sm cursor-pointer">
                    Maintain aspect ratio
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between">
            <Label>Keep Metadata</Label>
            <Switch checked={keepMetadata} onCheckedChange={setKeepMetadata} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Check className="mr-2 h-4 w-4" />
            Save Preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExportPresets;
