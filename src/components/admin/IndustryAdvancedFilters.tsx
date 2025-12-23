import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Code,
  ShoppingCart,
  Users,
  Heart,
  Building2,
  Factory,
  Megaphone,
  RotateCcw,
} from "lucide-react";
import type { IndustryCategory } from "@/hooks/useIndustryTemplates";

// Icon mapping for categories
const categoryIcons: Record<string, React.ReactNode> = {
  finance: <Briefcase className="h-4 w-4" />,
  technology: <Code className="h-4 w-4" />,
  commerce: <ShoppingCart className="h-4 w-4" />,
  services: <Users className="h-4 w-4" />,
  lifestyle: <Heart className="h-4 w-4" />,
  realestate: <Building2 className="h-4 w-4" />,
  manufacturing: <Factory className="h-4 w-4" />,
  other: <Megaphone className="h-4 w-4" />,
};

export interface IndustryFilters {
  searchQuery: string;
  categoryFilter: string;
  targetAudienceFilter: string;
  statusFilter: string;
  hasEmojiFilter: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

interface IndustryAdvancedFiltersProps {
  filters: IndustryFilters;
  onFiltersChange: (filters: IndustryFilters) => void;
  categories: IndustryCategory[];
  totalCount: number;
  filteredCount: number;
}

const defaultFilters: IndustryFilters = {
  searchQuery: "",
  categoryFilter: "all",
  targetAudienceFilter: "all",
  statusFilter: "all",
  hasEmojiFilter: "all",
  sortBy: "name",
  sortOrder: "asc",
};

export function IndustryAdvancedFilters({
  filters,
  onFiltersChange,
  categories,
  totalCount,
  filteredCount,
}: IndustryAdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = <K extends keyof IndustryFilters>(
    key: K,
    value: IndustryFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange(defaultFilters);
  };

  const activeFilterCount = [
    filters.categoryFilter !== "all",
    filters.targetAudienceFilter !== "all",
    filters.statusFilter !== "all",
    filters.hasEmojiFilter !== "all",
    filters.searchQuery !== "",
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="space-y-4">
      {/* Main search and quick filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, code, positioning..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter("searchQuery", e.target.value)}
            className="pl-9 pr-9"
          />
          {filters.searchQuery && (
            <button
              onClick={() => updateFilter("searchQuery", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Quick Filter */}
        <Select
          value={filters.categoryFilter}
          onValueChange={(v) => updateFilter("categoryFilter", v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả Category</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.code} value={cat.code}>
                <div className="flex items-center gap-2">
                  {categoryIcons[cat.code]}
                  {cat.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Target Audience Quick Filter */}
        <Select
          value={filters.targetAudienceFilter}
          onValueChange={(v) => updateFilter("targetAudienceFilter", v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Target" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả Target</SelectItem>
            <SelectItem value="B2B">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-500" />
                B2B
              </div>
            </SelectItem>
            <SelectItem value="B2C">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                B2C
              </div>
            </SelectItem>
            <SelectItem value="both">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-500" />
                Both
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Advanced Filters Toggle */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Bộ lọc nâng cao
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                  {activeFilterCount}
                </Badge>
              )}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Xóa bộ lọc
          </Button>
        )}

        {/* Results count */}
        <div className="ml-auto text-sm text-muted-foreground">
          Hiển thị <span className="font-medium text-foreground">{filteredCount}</span> / {totalCount} templates
        </div>
      </div>

      {/* Expanded Advanced Filters */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Trạng thái</Label>
                <Select
                  value={filters.statusFilter}
                  onValueChange={(v) => updateFilter("statusFilter", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Active
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        Inactive
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Emoji Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cho phép Emoji</Label>
                <Select
                  value={filters.hasEmojiFilter}
                  onValueChange={(v) => updateFilter("hasEmojiFilter", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Emoji" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="yes">Có emoji</SelectItem>
                    <SelectItem value="no">Không emoji</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sắp xếp theo</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(v) => updateFilter("sortBy", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sắp xếp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Tên</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="target">Target Audience</SelectItem>
                    <SelectItem value="sort_order">Thứ tự</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Thứ tự</Label>
                <Select
                  value={filters.sortOrder}
                  onValueChange={(v) => updateFilter("sortOrder", v as "asc" | "desc")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Thứ tự" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Tăng dần (A-Z)</SelectItem>
                    <SelectItem value="desc">Giảm dần (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Tags */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
                <span className="text-sm text-muted-foreground">Đang lọc:</span>
                
                {filters.searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Tìm: "{filters.searchQuery}"
                    <button onClick={() => updateFilter("searchQuery", "")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {filters.categoryFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Category: {categories.find(c => c.code === filters.categoryFilter)?.name || filters.categoryFilter}
                    <button onClick={() => updateFilter("categoryFilter", "all")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {filters.targetAudienceFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Target: {filters.targetAudienceFilter}
                    <button onClick={() => updateFilter("targetAudienceFilter", "all")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {filters.statusFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {filters.statusFilter === "active" ? "Active" : "Inactive"}
                    <button onClick={() => updateFilter("statusFilter", "all")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {filters.hasEmojiFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Emoji: {filters.hasEmojiFilter === "yes" ? "Có" : "Không"}
                    <button onClick={() => updateFilter("hasEmojiFilter", "all")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export { defaultFilters };
