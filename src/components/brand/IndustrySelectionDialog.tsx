import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, Wand2, ChevronRight, Check, Sparkles, X, Star,
  Briefcase, Coffee, Code, GraduationCap, Heart, Plane, ShoppingCart,
  Megaphone, Scale, Hammer, Store, Factory, Leaf, Truck, Shield,
  Landmark, Smartphone, Gamepad2, Palette, Dumbbell, Sofa, Ship, Rocket,
  Bitcoin, UsersRound, PartyPopper, Home, Baby, PawPrint, Car, Building2,
  Zap, Globe, Film, Music, BookOpen, Wrench, Cpu, Stethoscope, Building,
  Utensils, Shirt, Gem, TreePine, Waves
} from 'lucide-react';
import { useGlobalPacksForBrandSelection, GlobalPackForSelection } from '@/hooks/useGlobalPacksForBrandSelection';
import { cn } from '@/lib/utils';

// Extended icon mapping
const INDUSTRY_ICONS: Record<string, React.ReactNode> = {
  accounting: <Briefcase className="w-5 h-5" />,
  banking: <Landmark className="w-5 h-5" />,
  insurance: <Shield className="w-5 h-5" />,
  crypto_fintech: <Bitcoin className="w-5 h-5" />,
  fintech: <Bitcoin className="w-5 h-5" />,
  it: <Code className="w-5 h-5" />,
  technology: <Cpu className="w-5 h-5" />,
  telecom: <Smartphone className="w-5 h-5" />,
  gaming: <Gamepad2 className="w-5 h-5" />,
  startup: <Rocket className="w-5 h-5" />,
  ecommerce: <ShoppingCart className="w-5 h-5" />,
  retail: <Store className="w-5 h-5" />,
  import_export: <Ship className="w-5 h-5" />,
  healthcare: <Heart className="w-5 h-5" />,
  medical: <Stethoscope className="w-5 h-5" />,
  education: <GraduationCap className="w-5 h-5" />,
  legal: <Scale className="w-5 h-5" />,
  consulting: <UsersRound className="w-5 h-5" />,
  hr: <UsersRound className="w-5 h-5" />,
  fnb: <Coffee className="w-5 h-5" />,
  restaurant: <Utensils className="w-5 h-5" />,
  travel: <Plane className="w-5 h-5" />,
  tourism: <Globe className="w-5 h-5" />,
  fashion: <Sparkles className="w-5 h-5" />,
  apparel: <Shirt className="w-5 h-5" />,
  beauty: <Palette className="w-5 h-5" />,
  cosmetics: <Gem className="w-5 h-5" />,
  fitness: <Dumbbell className="w-5 h-5" />,
  pet: <PawPrint className="w-5 h-5" />,
  realestate: <Building2 className="w-5 h-5" />,
  property: <Building className="w-5 h-5" />,
  construction: <Hammer className="w-5 h-5" />,
  interior: <Sofa className="w-5 h-5" />,
  manufacturing: <Factory className="w-5 h-5" />,
  agriculture: <Leaf className="w-5 h-5" />,
  farming: <TreePine className="w-5 h-5" />,
  logistics: <Truck className="w-5 h-5" />,
  automotive: <Car className="w-5 h-5" />,
  marketing: <Megaphone className="w-5 h-5" />,
  media: <Film className="w-5 h-5" />,
  entertainment: <Music className="w-5 h-5" />,
  events: <PartyPopper className="w-5 h-5" />,
  home_services: <Home className="w-5 h-5" />,
  mother_baby: <Baby className="w-5 h-5" />,
  energy: <Zap className="w-5 h-5" />,
  environmental: <Waves className="w-5 h-5" />,
  publishing: <BookOpen className="w-5 h-5" />,
  services: <Wrench className="w-5 h-5" />,
};

const POPULAR_CODES = ['ecommerce', 'fnb', 'healthcare', 'realestate', 'it', 'fashion', 'beauty', 'education'];

interface IndustrySelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectIndustry: (pack: GlobalPackForSelection) => void;
}

export function IndustrySelectionDialog({
  open,
  onOpenChange,
  onSelectIndustry,
}: IndustrySelectionDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredPack, setHoveredPack] = useState<GlobalPackForSelection | null>(null);
  
  const { data: packs = [], isLoading } = useGlobalPacksForBrandSelection({
    languageCode: 'vi',
    includeSubIndustries: true,
  });

  // Process packs
  const { 
    corePacks, 
    subPacksByParent, 
    filteredPacks,
    totalCount,
    coreCount,
    popularPacks,
  } = useMemo(() => {
    const cores = packs.filter(p => p.industryLevel === 'core');
    const subs = packs.filter(p => p.industryLevel === 'sub');
    
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
    
    let filtered: GlobalPackForSelection[] = [];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = packs.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.shortName?.toLowerCase() || '').includes(query) ||
        p.code.toLowerCase().includes(query)
      );
    } else if (selectedCategory) {
      // Show core + its subs
      const core = cores.find(c => c.id === selectedCategory);
      if (core) {
        filtered = [core, ...(subsByParent[core.id] || [])];
      }
    }
    
    return {
      corePacks: cores,
      subPacksByParent: subsByParent,
      filteredPacks: filtered,
      totalCount: packs.length,
      coreCount: cores.length,
      popularPacks: popular,
    };
  }, [packs, searchQuery, selectedCategory]);

  const getIcon = (code: string, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
    const IconComponent = INDUSTRY_ICONS[code];
    
    if (IconComponent) {
      // Clone with new size
      const iconElement = IconComponent as React.ReactElement;
      return React.cloneElement(iconElement, { className: sizeClass });
    }
    
    // Try prefix match
    for (const key of Object.keys(INDUSTRY_ICONS)) {
      if (code.startsWith(key) || code.includes(key)) {
        const iconEl = INDUSTRY_ICONS[key] as React.ReactElement;
        return React.cloneElement(iconEl, { className: sizeClass });
      }
    }
    return <Briefcase className={sizeClass} />;
  };

  const handleSelect = (pack: GlobalPackForSelection) => {
    onSelectIndustry(pack);
    onOpenChange(false);
  };


  // Render industry card
  const IndustryCard = ({ pack, isSelected = false }: { pack: GlobalPackForSelection; isSelected?: boolean }) => {
    const isPopular = POPULAR_CODES.includes(pack.code);
    const isSub = pack.industryLevel === 'sub';
    const subCount = subPacksByParent[pack.id]?.length || 0;
    
    return (
      <button
        type="button"
        onClick={() => handleSelect(pack)}
        onMouseEnter={() => setHoveredPack(pack)}
        onMouseLeave={() => setHoveredPack(null)}
        className={cn(
          "group relative p-3 sm:p-5 rounded-xl border-2 bg-card text-left transition-all duration-200 min-h-[80px] sm:min-h-[100px]",
          "hover:border-primary hover:shadow-lg sm:hover:scale-[1.02]",
          "active:scale-[0.98] sm:active:scale-100",
          isSelected && "border-primary bg-primary/5",
          isSub && "border-dashed"
        )}
      >
        {/* Popular badge */}
        {isPopular && (
          <div className="absolute -top-2 -right-2 z-10">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] px-1.5">
              <Star className="w-3 h-3 mr-0.5" />
              Hot
            </Badge>
          </div>
        )}
        
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={cn(
            "p-2 sm:p-3 rounded-lg sm:rounded-xl shrink-0 transition-colors",
            "bg-muted group-hover:bg-primary/10"
          )}>
            {getIcon(pack.code, 'md')}
          </div>
          
          <div className="flex-1 min-w-0 pr-2 sm:pr-4">
            <h4 className="font-semibold text-sm sm:text-base leading-snug line-clamp-2">
              {pack.shortName || pack.name}
            </h4>
            {pack.name !== pack.shortName && pack.shortName && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-relaxed line-clamp-1 hidden sm:block">
                {pack.name}
              </p>
            )}
            
            {/* Sub-industries count */}
            {!isSub && subCount > 0 && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">
                +{subCount} ngành phụ
              </p>
            )}
          </div>
          
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground opacity-50 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 sm:mt-1" />
        </div>
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] sm:h-[85vh] p-0 gap-0 overflow-hidden w-[95vw] sm:w-auto">
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b bg-muted/30">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Chọn ngành nghề
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs sm:text-sm hidden sm:block">
                  Chọn ngành để tự động áp dụng Brand Voice, quy tắc tuân thủ và từ vựng chuyên ngành
                </DialogDescription>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Badge variant="secondary" className="text-[10px] sm:text-xs">
                  {coreCount} ngành chính
                </Badge>
                <Badge variant="outline" className="text-[10px] sm:text-xs">
                  +{totalCount - coreCount} phụ
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Search bar */}
          <div className="relative mt-3 sm:mt-4">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm ngành..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedCategory(null);
              }}
              className="pl-9 sm:pl-11 h-10 sm:h-11 text-sm sm:text-base"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Left sidebar - Categories (hidden on mobile, shown as horizontal scroll) */}
          <div className="sm:w-56 lg:w-64 border-b sm:border-b-0 sm:border-r bg-muted/20 flex flex-col shrink-0">
            <div className="p-2 sm:p-3 border-b hidden sm:block">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Danh mục ngành
              </p>
            </div>
            
            {/* Mobile: horizontal scroll */}
            <div className="sm:hidden overflow-x-auto">
              <div className="flex gap-2 p-2">
                {/* Popular option */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearchQuery('');
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors shrink-0",
                    "border",
                    !selectedCategory && !searchQuery 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "bg-background hover:bg-muted border-border"
                  )}
                >
                  <Star className="w-3.5 h-3.5" />
                  Phổ biến
                </button>
                
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-24 rounded-full shrink-0" />
                  ))
                ) : (
                  corePacks.slice(0, 10).map((core) => {
                    const isActive = selectedCategory === core.id;
                    return (
                      <button
                        key={core.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(core.id);
                          setSearchQuery('');
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors shrink-0",
                          "border",
                          isActive 
                            ? "bg-primary text-primary-foreground border-primary" 
                            : "bg-background hover:bg-muted border-border"
                        )}
                      >
                        {getIcon(core.code, 'sm')}
                        {core.shortName || core.name}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            
            {/* Desktop: vertical scroll */}
            <ScrollArea className="flex-1 hidden sm:block">
              <div className="p-2 space-y-1">
                {/* Popular option */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearchQuery('');
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-left transition-colors",
                    "hover:bg-muted",
                    !selectedCategory && !searchQuery && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <Star className="w-4 h-4" />
                  <span className="text-sm">Phổ biến</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {popularPacks.length}
                  </Badge>
                </button>
                
                {/* Core industries */}
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))
                ) : (
                  corePacks.map((core) => {
                    const subCount = subPacksByParent[core.id]?.length || 0;
                    const isActive = selectedCategory === core.id;
                    
                    return (
                      <button
                        key={core.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(core.id);
                          setSearchQuery('');
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-left transition-colors",
                          "hover:bg-muted",
                          isActive && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        {getIcon(core.code, 'sm')}
                        <span className="text-xs sm:text-sm flex-1 truncate">
                          {core.shortName || core.name}
                        </span>
                        {subCount > 0 && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            +{subCount}
                          </Badge>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
            
          </div>

          {/* Right content - Industry grid */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <ScrollArea className="flex-1">
              <div className="p-3 sm:p-6">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 sm:h-24" />
                    ))}
                  </div>
                ) : searchQuery ? (
                  // Search results
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm sm:text-base">
                        Kết quả "{searchQuery}"
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {filteredPacks.length} kết quả
                      </Badge>
                    </div>
                    
                    {filteredPacks.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {filteredPacks.map((pack) => (
                          <IndustryCard key={pack.id} pack={pack} />
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 sm:py-12 text-center">
                        <p className="text-muted-foreground text-sm">
                          Không tìm thấy ngành phù hợp
                        </p>
                      </div>
                    )}
                  </div>
                ) : selectedCategory ? (
                  // Category detail view
                  <div className="space-y-3 sm:space-y-4">
                    {(() => {
                      const core = corePacks.find(c => c.id === selectedCategory);
                      const subs = subPacksByParent[selectedCategory] || [];
                      
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm sm:text-base flex items-center gap-2">
                              {getIcon(core?.code || '', 'sm')}
                              <span className="truncate">{core?.shortName || core?.name}</span>
                            </h3>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {1 + subs.length} ngành
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {/* Core first */}
                            {core && <IndustryCard pack={core} />}
                            {/* Then subs */}
                            {subs.map((sub) => (
                              <IndustryCard key={sub.id} pack={sub} />
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  // Popular view (default)
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h3 className="font-medium text-sm sm:text-base flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-500" />
                          Ngành phổ biến
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {popularPacks.length} ngành
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {popularPacks.map((pack) => (
                          <IndustryCard key={pack.id} pack={pack} />
                        ))}
                      </div>
                    </div>
                    
                    <div className="border-t pt-4 sm:pt-6 hidden sm:block">
                      <p className="text-sm text-muted-foreground text-center">
                        Chọn một danh mục bên trái để xem tất cả ngành trong danh mục đó
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {/* Preview panel */}
            {hoveredPack && (
              <div className="p-4 border-t bg-muted/30">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    {getIcon(hoveredPack.code, 'lg')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{hoveredPack.name}</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {hoveredPack.brandVoice?.tone_of_voice?.slice(0, 3).map((tone, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tone}
                        </Badge>
                      ))}
                      {hoveredPack.brandVoice?.formality_level && (
                        <Badge variant="secondary" className="text-xs">
                          {hoveredPack.brandVoice.formality_level}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button onClick={() => handleSelect(hoveredPack)} size="sm">
                    <Check className="w-4 h-4 mr-1" />
                    Chọn
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
