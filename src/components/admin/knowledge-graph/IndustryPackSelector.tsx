/**
 * IndustryPackSelector - Sidebar for selecting Industry Packs with Category Groups
 */

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Search, Factory, Users, Building2, ChevronDown, FolderOpen } from "lucide-react";
import { useIndustryPacksList, type IndustryPackInfo } from "@/hooks/useIndustryPackKnowledge";
import { useIndustryCategories, type IndustryCategory } from "@/hooks/useIndustryCategories";
import { getIconByName } from "@/lib/iconMapper";
import { cn } from "@/lib/utils";

interface IndustryPackSelectorProps {
  selectedPackId: string | null;
  onSelectPack: (packId: string) => void;
}

interface GroupedPacks {
  category: IndustryCategory | null;
  packs: IndustryPackInfo[];
  totalNodes: number;
}

export function IndustryPackSelector({ selectedPackId, onSelectPack }: IndustryPackSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const { data: packs, isLoading: packsLoading } = useIndustryPacksList();
  const { data: categories, isLoading: categoriesLoading } = useIndustryCategories();

  const isLoading = packsLoading || categoriesLoading;

  // Filter packs by search query
  const filteredPacks = useMemo(() => {
    if (!packs) return [];
    if (!searchQuery.trim()) return packs;

    const query = searchQuery.toLowerCase();
    return packs.filter(
      pack =>
        pack.name.toLowerCase().includes(query) ||
        pack.industryCode.toLowerCase().includes(query)
    );
  }, [packs, searchQuery]);

  // Group packs by category
  const groupedPacks = useMemo(() => {
    const groups = new Map<string, GroupedPacks>();

    // Initialize groups from categories
    categories?.forEach(cat => {
      groups.set(cat.id, {
        category: cat,
        packs: [],
        totalNodes: 0,
      });
    });

    // Add packs to their categories
    filteredPacks.forEach(pack => {
      const categoryId = pack.categoryId || 'uncategorized';
      
      if (!groups.has(categoryId)) {
        groups.set(categoryId, {
          category: null,
          packs: [],
          totalNodes: 0,
        });
      }
      
      const group = groups.get(categoryId)!;
      group.packs.push(pack);
      group.totalNodes += pack.nodeCount || 0;
    });

    // Sort and filter empty groups
    return Array.from(groups.entries())
      .filter(([_, group]) => group.packs.length > 0)
      .sort((a, b) => {
        const orderA = a[1].category?.sortOrder ?? 999;
        const orderB = b[1].category?.sortOrder ?? 999;
        return orderA - orderB;
      });
  }, [filteredPacks, categories]);

  // Total stats
  const totalPacks = filteredPacks.length;
  const totalCategories = groupedPacks.length;

  // Auto-expand category containing selected pack
  useEffect(() => {
    if (selectedPackId && packs) {
      const pack = packs.find(p => p.id === selectedPackId);
      if (pack?.categoryId) {
        setExpandedCategories(prev => new Set([...prev, pack.categoryId!]));
      }
    }
  }, [selectedPackId, packs]);

  // Auto-expand categories with search matches
  useEffect(() => {
    if (searchQuery.trim()) {
      const matchingCategoryIds = new Set(
        filteredPacks.map(p => p.categoryId || 'uncategorized')
      );
      setExpandedCategories(matchingCategoryIds);
    }
  }, [searchQuery, filteredPacks]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const getAudienceIcon = (audience: 'B2B' | 'B2C' | 'both') => {
    switch (audience) {
      case 'B2B':
        return <Building2 className="h-3 w-3" />;
      case 'B2C':
        return <Users className="h-3 w-3" />;
      default:
        return <Factory className="h-3 w-3" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-9 w-full" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <div className="pl-4 space-y-1">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm ngành..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {totalPacks} ngành • {totalCategories} nhóm
          {searchQuery && ` (lọc từ ${packs?.length || 0})`}
        </p>
      </div>

      {/* Category Groups */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {groupedPacks.map(([categoryId, group]) => (
            <CategoryGroup
              key={categoryId}
              categoryId={categoryId}
              category={group.category}
              packs={group.packs}
              totalNodes={group.totalNodes}
              isExpanded={expandedCategories.has(categoryId)}
              onToggle={() => toggleCategory(categoryId)}
              selectedPackId={selectedPackId}
              onSelectPack={onSelectPack}
              getAudienceIcon={getAudienceIcon}
            />
          ))}

          {groupedPacks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Factory className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Không tìm thấy ngành</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface CategoryGroupProps {
  categoryId: string;
  category: IndustryCategory | null;
  packs: IndustryPackInfo[];
  totalNodes: number;
  isExpanded: boolean;
  onToggle: () => void;
  selectedPackId: string | null;
  onSelectPack: (packId: string) => void;
  getAudienceIcon: (audience: 'B2B' | 'B2C' | 'both') => React.ReactNode;
}

function CategoryGroup({
  categoryId,
  category,
  packs,
  totalNodes,
  isExpanded,
  onToggle,
  selectedPackId,
  onSelectPack,
  getAudienceIcon,
}: CategoryGroupProps) {
  const CategoryIcon = category?.iconName 
    ? getIconByName(category.iconName) 
    : FolderOpen;

  const categoryLabel = category?.label || 'Chưa phân loại';
  const hasSelectedPack = packs.some(p => p.id === selectedPackId);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="w-full">
        <div
          className={cn(
            "flex items-center justify-between p-2 rounded-md transition-colors",
            "hover:bg-accent/50",
            hasSelectedPack && "bg-accent/30"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "p-1.5 rounded-md shrink-0",
              hasSelectedPack ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <CategoryIcon className="h-4 w-4" />
            </div>
            <span className={cn(
              "font-medium text-sm truncate",
              hasSelectedPack && "text-primary"
            )}>
              {categoryLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {packs.length}
            </Badge>
            {totalNodes > 0 && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-muted-foreground">
                {totalNodes}
              </Badge>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="pl-3 pt-1 space-y-0.5">
          {packs.map((pack) => (
            <PackItem
              key={pack.id}
              pack={pack}
              isSelected={selectedPackId === pack.id}
              onClick={() => onSelectPack(pack.id)}
              audienceIcon={getAudienceIcon(pack.targetAudience)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface PackItemProps {
  pack: IndustryPackInfo;
  isSelected: boolean;
  onClick: () => void;
  audienceIcon: React.ReactNode;
}

function PackItem({ pack, isSelected, onClick, audienceIcon }: PackItemProps) {
  const hasNodes = (pack.nodeCount ?? 0) > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-2.5 rounded-lg transition-colors",
        "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring",
        isSelected && "bg-accent border border-primary/30"
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "font-medium text-sm truncate flex-1",
                isSelected && "text-primary"
              )}
            >
              {pack.name}
            </p>
            {/* Node count badge */}
            {hasNodes ? (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] shrink-0">
                {pack.nodeCount}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="h-4 px-1 text-[9px] text-muted-foreground shrink-0"
              >
                Trống
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <code className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
              {pack.industryCode}
            </code>
            <Badge variant="outline" className="h-4 px-1 gap-0.5 text-[10px]">
              {audienceIcon}
              {pack.targetAudience}
            </Badge>
          </div>
        </div>
      </div>
    </button>
  );
}
