'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Search,
  Filter,
  Image as ImageIcon,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SystemStyle {
  id: string;
  name: string;
  description: string;
  aiPrompt: string;
  blendingParams: Record<string, any>;
  exampleImageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPresetsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [editingPreset, setEditingPreset] = useState<SystemStyle | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    aiPrompt: '',
    exampleImageUrl: '',
    isActive: true,
    sortOrder: 0,
    blendingParams: {}
  });
  
  const queryClient = useQueryClient();

  // Real API call for presets
  const { data: response, isLoading } = useQuery({
    queryKey: ['admin-presets', { search: searchQuery, includeInactive: showInactive }],
    queryFn: async () => {
      const params = new URLSearchParams({
        includeInactive: showInactive.toString(),
        ...(searchQuery && { search: searchQuery }),
      });
      
      const response = await fetch(`/api/admin/presets?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch presets');
      }
      return response.json();
    },
  });

  const presets = response?.presets || [];

  // Create/Update preset mutation
  const upsertPresetMutation = useMutation({
    mutationFn: async (data: SystemStyle) => {
      const url = editingPreset 
        ? `/api/admin/presets/${data.id}` 
        : '/api/admin/presets';
      
      const response = await fetch(url, {
        method: editingPreset ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save preset');
      }

      return response.json();
    },
    onSuccess: (response) => {
      toast.success(editingPreset ? 'Preset updated successfully' : 'Preset created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-presets'] });
      setEditingPreset(null);
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save preset');
    },
  });

  // Delete preset mutation
  const deletePresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      const response = await fetch(`/api/admin/presets/${presetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete preset');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Preset deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-presets'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete preset');
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/admin/presets/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update preset status');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Preset status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-presets'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update preset status');
    },
  });

  // Filter presets
  const filteredPresets = presets.filter(preset => {
    const matchesSearch = preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         preset.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesActive = showInactive || preset.isActive;
    return matchesSearch && matchesActive;
  });

  // Sort presets by sortOrder
  const sortedPresets = [...filteredPresets].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleEdit = (preset: SystemStyle) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      description: preset.description,
      aiPrompt: preset.aiPrompt,
      exampleImageUrl: preset.exampleImageUrl,
      isActive: preset.isActive,
      sortOrder: preset.sortOrder,
      blendingParams: preset.blendingParams,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPreset(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      aiPrompt: '',
      exampleImageUrl: '',
      isActive: true,
      sortOrder: Math.max(...presets.map(p => p.sortOrder), 0) + 1,
      blendingParams: {}
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!formData.aiPrompt.trim()) {
      toast.error('AI prompt is required');
      return;
    }

    const presetData: SystemStyle = {
      id: editingPreset?.id || Date.now().toString(),
      ...formData,
      createdAt: editingPreset?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    upsertPresetMutation.mutate(presetData);
  };

  const handleDelete = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset && window.confirm(`Are you sure you want to delete "${preset.name}"? This action cannot be undone.`)) {
      deletePresetMutation.mutate(presetId);
    }
  };

  const handleToggleActive = (presetId: string, currentStatus: boolean) => {
    toggleActiveMutation.mutate({ id: presetId, isActive: !currentStatus });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Loading presets">
        <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Loading presets...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen flex-col bg-background">
        <Header 
          variant="minimal"
          navigation={
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
              Back to Dashboard
            </Link>
          }
        />

      <main className="flex-1">
        <section className="w-full py-8 lg:py-12">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            {/* Header */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
            >
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Settings className="h-8 w-8" />
                  <TextShimmer shimmerColor="#30e3ca">Preset Management</TextShimmer>
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  Manage AI processing presets and styles
                </p>
              </div>
              
              <Button onClick={handleCreate} size="lg" className="uppercase tracking-wider">
                <Plus className="mr-2 h-5 w-5" />
                New Preset
              </Button>
            </motion.div>

            {/* Search and Filter */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col lg:flex-row gap-4 mb-8 items-start lg:items-center"
            >
              <div className="relative flex-1 w-full lg:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search presets by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              
              <div className="flex gap-2 items-center">
                <Button
                  variant={showInactive ? "default" : "outline"}
                  onClick={() => setShowInactive(!showInactive)}
                  className="rounded-sm uppercase tracking-wider text-xs"
                >
                  {showInactive ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                  {showInactive ? 'Showing All' : 'Active Only'}
                </Button>
              </div>
            </motion.div>

            {/* Presets Grid */}
            <AnimatePresence mode="wait">
                {sortedPresets.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="text-center py-20 bg-card rounded-sm border border-border"
                >
                    <div className="bg-secondary p-4 rounded-sm inline-flex mb-4 border border-border">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No presets found</h3>
                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    {searchQuery 
                        ? 'Try adjusting your search criteria to find what you are looking for.' 
                        : 'No presets available yet. Create your first preset to get started.'
                    }
                    </p>
                    <Button onClick={handleCreate} size="lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Preset
                    </Button>
                </motion.div>
                ) : (
                <motion.div 
                    layout
                    className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                >
                    <AnimatePresence>
                        {sortedPresets.map((preset) => (
                        <Card key={preset.id} className="group hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CardTitle className="text-lg">{preset.name}</CardTitle>
                                            <Badge variant={preset.isActive ? "default" : "secondary"}>
                                                {preset.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                        <CardDescription className="text-sm">
                                            {preset.description}
                                        </CardDescription>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Order: {preset.sortOrder}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Example Image */}
                                    <div className="aspect-video rounded-sm overflow-hidden bg-muted relative">
                                        <img
                                            src={preset.exampleImageUrl}
                                            alt={preset.name}
                                            className="w-full h-full object-cover"
                                        />
                                        {!preset.isActive && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <EyeOff className="h-8 w-8 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* AI Prompt Preview */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-muted-foreground">AI Prompt</Label>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {preset.aiPrompt}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(preset)}
                                            className="flex-1"
                                        >
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleActive(preset.id, preset.isActive)}
                                        >
                                            {preset.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(preset.id)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        ))}
                    </AnimatePresence>
                </motion.div>
                )}
            </AnimatePresence>
          </div>
        </section>
      </main>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPreset ? 'Edit Preset' : 'Create New Preset'}
            </DialogTitle>
            <DialogDescription>
              {editingPreset ? 'Modify the existing preset settings.' : 'Configure a new AI processing preset.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Clean Commercial Beauty"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the preset style and its intended use..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiPrompt">AI Prompt *</Label>
              <Textarea
                id="aiPrompt"
                value={formData.aiPrompt}
                onChange={(e) => setFormData(prev => ({ ...prev, aiPrompt: e.target.value }))}
                placeholder="Detailed AI processing instructions..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exampleImageUrl">Example Image URL</Label>
              <Input
                id="exampleImageUrl"
                value={formData.exampleImageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, exampleImageUrl: e.target.value }))}
                placeholder="https://example.com/preset-preview.jpg"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Active (available to users)</Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={upsertPresetMutation.isPending}
                className="flex-1"
              >
                {upsertPresetMutation.isPending ? 'Saving...' : (editingPreset ? 'Update Preset' : 'Create Preset')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}
