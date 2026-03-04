import React, { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, Heart, Clock, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-performance";
import { type Preset } from "@/components/ui/preset-gallery";

interface PresetSearchProps {
  presets: Preset[];
  favoriteIds: string[];
  recentIds: string[];
  selectedId?: string | null;
  onSelect: (preset: Preset) => void;
  onToggleFavorite: (presetId: string) => void;
  className?: string;
}

type FilterType = "all" | "favorites" | "recent";

export function PresetSearch({
  presets,
  favoriteIds,
  recentIds,
  selectedId,
  onSelect,
  onToggleFavorite,
  className,
}: PresetSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  
  // Debounce search query for performance
  const debouncedQuery = useDebounce(searchQuery, 200);

  const filteredPresets = useMemo(() => {
    let filtered = presets;

    // Apply category filter
    if (activeFilter === "favorites") {
      filtered = presets.filter((p) => favoriteIds.includes(p.id));
    } else if (activeFilter === "recent") {
      // Sort by recent order
      filtered = recentIds
        .map((id) => presets.find((p) => p.id === id))
        .filter((p): p is Preset => p !== undefined);
    }

    // Apply search filter
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [presets, favoriteIds, recentIds, activeFilter, debouncedQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  const getFilterCount = (filter: FilterType) => {
    switch (filter) {
      case "favorites":
        return favoriteIds.length;
      case "recent":
        return recentIds.length;
      default:
        return presets.length;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search presets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5">
        <FilterButton
          active={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
          count={getFilterCount("all")}
        >
          All
        </FilterButton>
        <FilterButton
          active={activeFilter === "favorites"}
          onClick={() => setActiveFilter("favorites")}
          count={getFilterCount("favorites")}
          icon={<Heart className="h-3 w-3" />}
        >
          Favorites
        </FilterButton>
        <FilterButton
          active={activeFilter === "recent"}
          onClick={() => setActiveFilter("recent")}
          count={getFilterCount("recent")}
          icon={<Clock className="h-3 w-3" />}
        >
          Recent
        </FilterButton>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filteredPresets.length} preset{filteredPresets.length !== 1 ? "s" : ""}
          {debouncedQuery && ` for "${debouncedQuery}"`}
        </span>
        {activeFilter !== "all" && (
          <button
            onClick={() => setActiveFilter("all")}
            className="text-primary hover:underline"
          >
            Show all
          </button>
        )}
      </div>
    </div>
  );
}

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  count: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function FilterButton({ active, onClick, count, icon, children }: FilterButtonProps) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={cn(
        "h-7 text-xs flex-1",
        active && "bg-primary text-primary-foreground"
      )}
    >
      {icon && <span className="mr-1.5">{icon}</span>}
      {children}
      <span
        className={cn(
          "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]",
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </Button>
  );
}

export default PresetSearch;
