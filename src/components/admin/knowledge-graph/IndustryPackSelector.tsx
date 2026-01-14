/**
 * IndustryPackSelector - Sidebar for selecting Industry Packs
 */

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Factory, Users, Building2 } from "lucide-react";
import { useIndustryPacksList, type IndustryPackInfo } from "@/hooks/useIndustryPackKnowledge";
import { cn } from "@/lib/utils";

interface IndustryPackSelectorProps {
  selectedPackId: string | null;
  onSelectPack: (packId: string) => void;
}

export function IndustryPackSelector({ selectedPackId, onSelectPack }: IndustryPackSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: packs, isLoading } = useIndustryPacksList();

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
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
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
          {filteredPacks.length} ngành {searchQuery && `(lọc từ ${packs?.length || 0})`}
        </p>
      </div>

      {/* Pack List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredPacks.map((pack) => (
            <PackItem
              key={pack.id}
              pack={pack}
              isSelected={selectedPackId === pack.id}
              onClick={() => onSelectPack(pack.id)}
              audienceIcon={getAudienceIcon(pack.targetAudience)}
            />
          ))}

          {filteredPacks.length === 0 && (
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
        "w-full text-left p-3 rounded-lg transition-colors",
        "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring",
        isSelected && "bg-accent border border-primary/30"
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn(
          "p-1.5 rounded-md mt-0.5",
          isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}>
          <Factory className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              "font-medium text-sm truncate flex-1",
              isSelected && "text-primary"
            )}>
              {pack.name}
            </p>
            {/* Node count badge */}
            {hasNodes ? (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] shrink-0">
                {pack.nodeCount}
              </Badge>
            ) : (
              <Badge variant="outline" className="h-4 px-1 text-[9px] text-muted-foreground shrink-0">
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
