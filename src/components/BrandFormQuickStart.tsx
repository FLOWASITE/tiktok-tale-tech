import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Search, Target, Wand2, Info, ChevronRight, Layers, Grid3X3,
  Briefcase, Coffee, Code, GraduationCap, Heart, Plane, ShoppingCart,
  Megaphone, Scale, Hammer, Sparkles, Store, Factory, Leaf, Truck, Shield,
  Landmark, Smartphone, Gamepad2, Palette, Dumbbell, Sofa, Ship, Rocket,
  Bitcoin, UsersRound, PartyPopper, Home, Baby, PawPrint, Car, Building2,
  Zap, Globe, Film, Music, BookOpen, Wrench, Cpu, Stethoscope, Building,
  Utensils, Shirt, Gem, TreePine, Waves, Mountain, Sun, Moon
} from 'lucide-react';
import { useGlobalPacksForBrandSelection, GlobalPackForSelection } from '@/hooks/useGlobalPacksForBrandSelection';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Extended icon mapping for more industries
const INDUSTRY_ICONS: Record<string, React.ReactNode> = {
  accounting: <Briefcase className="w-4 h-4" />,
  banking: <Landmark className="w-4 h-4" />,
  insurance: <Shield className="w-4 h-4" />,
  crypto_fintech: <Bitcoin className="w-4 h-4" />,
  fintech: <Bitcoin className="w-4 h-4" />,
  it: <Code className="w-4 h-4" />,
  technology: <Cpu className="w-4 h-4" />,
  telecom: <Smartphone className="w-4 h-4" />,
  gaming: <Gamepad2 className="w-4 h-4" />,
  startup: <Rocket className="w-4 h-4" />,
  ecommerce: <ShoppingCart className="w-4 h-4" />,
  retail: <Store className="w-4 h-4" />,
  import_export: <Ship className="w-4 h-4" />,
  healthcare: <Heart className="w-4 h-4" />,
  medical: <Stethoscope className="w-4 h-4" />,
  education: <GraduationCap className="w-4 h-4" />,
  legal: <Scale className="w-4 h-4" />,
  consulting: <UsersRound className="w-4 h-4" />,
  hr: <UsersRound className="w-4 h-4" />,
  fnb: <Coffee className="w-4 h-4" />,
  restaurant: <Utensils className="w-4 h-4" />,
  travel: <Plane className="w-4 h-4" />,
  tourism: <Globe className="w-4 h-4" />,
  fashion: <Sparkles className="w-4 h-4" />,
  apparel: <Shirt className="w-4 h-4" />,
  beauty: <Palette className="w-4 h-4" />,
  cosmetics: <Gem className="w-4 h-4" />,
  fitness: <Dumbbell className="w-4 h-4" />,
  pet: <PawPrint className="w-4 h-4" />,
  realestate: <Building2 className="w-4 h-4" />,
  property: <Building className="w-4 h-4" />,
  construction: <Hammer className="w-4 h-4" />,
  interior: <Sofa className="w-4 h-4" />,
  manufacturing: <Factory className="w-4 h-4" />,
  agriculture: <Leaf className="w-4 h-4" />,
  farming: <TreePine className="w-4 h-4" />,
  logistics: <Truck className="w-4 h-4" />,
  automotive: <Car className="w-4 h-4" />,
  marketing: <Megaphone className="w-4 h-4" />,
  media: <Film className="w-4 h-4" />,
  entertainment: <Music className="w-4 h-4" />,
  events: <PartyPopper className="w-4 h-4" />,
  home_services: <Home className="w-4 h-4" />,
  mother_baby: <Baby className="w-4 h-4" />,
  energy: <Zap className="w-4 h-4" />,
  environmental: <Waves className="w-4 h-4" />,
  publishing: <BookOpen className="w-4 h-4" />,
  services: <Wrench className="w-4 h-4" />,
};

// Popular industries to highlight
const POPULAR_CODES = ['ecommerce', 'fnb', 'healthcare', 'realestate', 'it', 'fashion', 'beauty', 'education'];

interface BrandFormQuickStartProps {
  onSelectIndustry: (pack: GlobalPackForSelection) => void;
  onStartManual: () => void;
}

export function BrandFormQuickStart({
  onSelectIndustry,
  onStartManual,
}: BrandFormQuickStartProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyCore, setShowOnlyCore] = useState(true);
  const [expandedCores, setExpandedCores] = useState<Set<string>>(new Set());
  
  const { data: packs = [], isLoading } = useGlobalPacksForBrandSelection({
    languageCode: 'vi',
    includeSubIndustries: true,
  });

  // Process packs into hierarchical structure
  const { 
    corePacks, 
    subPacksByParent, 
    popularPacks, 
    filteredPacks,
    totalCount,
    coreCount 
  } = useMemo(() => {
    const cores = packs.filter(p => p.industryLevel === 'core');
    const subs = packs.filter(p => p.industryLevel === 'sub');
    
    // Group subs by parent
    const subsByParent: Record<string, GlobalPackForSelection[]> = {};
    subs.forEach(sub => {
      if (sub.parentPackId) {
        if (!subsByParent[sub.parentPackId]) {
          subsByParent[sub.parentPackId] = [];
        }
        subsByParent[sub.parentPackId].push(sub);
      }
    });
    
    const popular = packs.filter(p => POPULAR_CODES.includes(p.code));
    
    // Filter based on search
    let filtered: GlobalPackForSelection[] = [];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = packs.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.shortName?.toLowerCase() || '').includes(query) ||
        p.code.toLowerCase().includes(query)
      );
    }
    
    return {
      corePacks: cores,
      subPacksByParent: subsByParent,
      popularPacks: popular,
      filteredPacks: filtered,
      totalCount: packs.length,
      coreCount: cores.length,
    };
  }, [packs, searchQuery]);

  const toggleCoreExpand = (coreId: string) => {
    setExpandedCores(prev => {
      const next = new Set(prev);
      if (next.has(coreId)) {
        next.delete(coreId);
      } else {
        next.add(coreId);
      }
      return next;
    });
  };

  const getIcon = (code: string) => {
    // Try exact match first, then prefix match
    if (INDUSTRY_ICONS[code]) return INDUSTRY_ICONS[code];
    
    // Try to find a matching prefix
    for (const key of Object.keys(INDUSTRY_ICONS)) {
      if (code.startsWith(key) || code.includes(key)) {
        return INDUSTRY_ICONS[key];
      }
    }
    return <Briefcase className="w-4 h-4" />;
  };

  const IndustryButton = ({ 
    pack, 
    isSubIndustry = false,
    showExpandIcon = false,
    hasChildren = false,
    isExpanded = false,
    onToggle,
  }: { 
    pack: GlobalPackForSelection;
    isSubIndustry?: boolean;
    showExpandIcon?: boolean;
    hasChildren?: boolean;
    isExpanded?: boolean;
    onToggle?: () => void;
  }) => {
    const icon = getIcon(pack.code);
    const isPopular = POPULAR_CODES.includes(pack.code);
    
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSelectIndustry(pack)}
          className={cn(
            "flex-1 p-2 rounded-lg border bg-background transition-all text-left",
            "hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm",
            "flex items-center gap-2",
            isSubIndustry && "ml-4 border-dashed",
            isPopular && !isSubIndustry && "ring-1 ring-primary/20"
          )}
        >
          <div className={cn(
            "p-1.5 rounded-md shrink-0",
            isSubIndustry ? "bg-muted/50" : "bg-muted"
          )}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <span className={cn(
              "text-xs font-medium truncate block",
              isSubIndustry && "text-muted-foreground"
            )}>
              {pack.shortName || pack.name}
            </span>
          </div>
          {isPopular && !isSubIndustry && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">
              Hot
            </Badge>
          )}
        </button>
        {showExpandIcon && hasChildren && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
          >
            <ChevronRight className={cn(
              "w-4 h-4 transition-transform",
              isExpanded && "rotate-90"
            )} />
          </Button>
        )}
      </div>
    );
  };

  // Render search results
  const renderSearchResults = () => (
    <ScrollArea className="h-[320px]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-3">
        {filteredPacks.map((pack) => (
          <IndustryButton 
            key={pack.id} 
            pack={pack} 
            isSubIndustry={pack.industryLevel === 'sub'}
          />
        ))}
      </div>
      {filteredPacks.length === 0 && (
        <div className="py-8 text-center text-muted-foreground text-sm">
          Không tìm thấy ngành phù hợp với "{searchQuery}"
        </div>
      )}
    </ScrollArea>
  );

  // Render hierarchical list
  const renderHierarchicalList = () => (
    <ScrollArea className="h-[320px]">
      <div className="space-y-1 pr-3">
        {corePacks.map((core) => {
          const subs = subPacksByParent[core.id] || [];
          const hasChildren = subs.length > 0;
          const isExpanded = expandedCores.has(core.id);
          
          return (
            <div key={core.id}>
              <IndustryButton
                pack={core}
                showExpandIcon={!showOnlyCore}
                hasChildren={hasChildren}
                isExpanded={isExpanded}
                onToggle={() => toggleCoreExpand(core.id)}
              />
              
              {!showOnlyCore && hasChildren && isExpanded && (
                <div className="mt-1 space-y-1 animate-in slide-in-from-top-2">
                  {subs.map((sub) => (
                    <IndustryButton
                      key={sub.id}
                      pack={sub}
                      isSubIndustry
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );

  // Render popular grid
  const renderPopularGrid = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Phổ biến nhất
        </p>
        <Badge variant="outline" className="text-[10px]">
          {popularPacks.length} ngành
        </Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {popularPacks.slice(0, 8).map((pack) => (
          <button
            key={pack.id}
            type="button"
            onClick={() => onSelectIndustry(pack)}
            className={cn(
              "p-3 rounded-xl border-2 bg-gradient-to-br from-background to-muted/30",
              "hover:border-primary hover:shadow-md transition-all",
              "flex flex-col items-center gap-2 text-center"
            )}
          >
            <div className="p-2.5 rounded-xl bg-primary/10">
              {getIcon(pack.code)}
            </div>
            <span className="text-xs font-medium">
              {pack.shortName || pack.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header with info tooltip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Chọn ngành để bắt đầu</h3>
          <Badge variant="secondary" className="text-[10px]">
            {totalCount} ngành
          </Badge>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Info className="w-4 h-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[280px]">
              <p className="text-xs">
                <strong>Industry Memory v2</strong> bao gồm {coreCount} ngành chính 
                và {totalCount - coreCount} ngành phụ với quy tắc tuân thủ & Brand Voice chuẩn.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Two-column layout: Industries left, Manual option right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,220px] gap-4">
        {/* Left: Industry Selection */}
        <div className="space-y-3 p-4 rounded-xl border bg-muted/20">
          {/* Search & Filter row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm ngành theo tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            {!searchQuery && (
              <div className="flex rounded-lg border bg-background p-0.5">
                <Button
                  type="button"
                  variant={showOnlyCore ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => setShowOnlyCore(true)}
                >
                  <Layers className="w-3.5 h-3.5 mr-1" />
                  Chính
                </Button>
                <Button
                  type="button"
                  variant={!showOnlyCore ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => setShowOnlyCore(false)}
                >
                  <Grid3X3 className="w-3.5 h-3.5 mr-1" />
                  Tất cả
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : searchQuery ? (
            // Search results
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                Tìm thấy {filteredPacks.length} kết quả
              </p>
              {renderSearchResults()}
            </div>
          ) : (
            // Tabs for Popular vs Browse
            <Tabs defaultValue="popular" className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-9">
                <TabsTrigger value="popular" className="text-xs">
                  ⭐ Phổ biến
                </TabsTrigger>
                <TabsTrigger value="browse" className="text-xs">
                  📂 Duyệt ngành ({showOnlyCore ? coreCount : totalCount})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="popular" className="mt-3">
                {renderPopularGrid()}
              </TabsContent>
              
              <TabsContent value="browse" className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    {showOnlyCore ? 'Ngành chính' : 'Tất cả ngành'}
                  </p>
                  {!showOnlyCore && (
                    <p className="text-[10px] text-muted-foreground">
                      Nhấn mũi tên để xem ngành phụ
                    </p>
                  )}
                </div>
                {renderHierarchicalList()}
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Right: Manual option */}
        <div className="p-4 rounded-xl border bg-gradient-to-b from-muted/10 to-muted/30 flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3 rounded-full bg-muted">
            <Wand2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">Không có ngành phù hợp?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tự thiết lập Brand Voice theo ý bạn
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onStartManual}
            className="w-full"
          >
            Bắt đầu thủ công
          </Button>
          
          {/* Stats */}
          <div className="mt-2 pt-3 border-t w-full text-[10px] text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Ngành chính:</span>
              <span className="font-medium">{coreCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Ngành phụ:</span>
              <span className="font-medium">{totalCount - coreCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
