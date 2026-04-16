import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, ChevronRight, Check, Sparkles, X, Star,
  Briefcase, Coffee, Code, GraduationCap, Heart, Plane, ShoppingCart,
  Megaphone, Scale, Hammer, Store, Factory, Leaf, Truck, Shield,
  Landmark, Smartphone, Gamepad2, Palette, Dumbbell, Sofa, Ship, Rocket,
  Bitcoin, UsersRound, PartyPopper, Home, Baby, PawPrint, Car, Building2,
  Zap, Globe, Film, Music, BookOpen, Wrench, Cpu, Stethoscope, Building,
  Utensils, Shirt, Gem, TreePine, Waves, ArrowLeft
} from 'lucide-react';
import { useGlobalPacksForBrandSelection, GlobalPackForSelection } from '@/hooks/useGlobalPacksForBrandSelection';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredPack, setHoveredPack] = useState<GlobalPackForSelection | null>(null);
  
  const { data: packs = [], isLoading } = useGlobalPacksForBrandSelection({
    languageCode: 'vi',
    includeSubIndustries: true,
  });

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
      const iconElement = IconComponent as React.ReactElement;
      return React.cloneElement(iconElement, { className: sizeClass });
    }
    
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

  // --- Shared IndustryCard ---
  const IndustryCard = ({ pack, compact = false }: { pack: GlobalPackForSelection; isSelected?: boolean; compact?: boolean }) => {
    const isPopular = POPULAR_CODES.includes(pack.code);
    const isSub = pack.industryLevel === 'sub';
    const subCount = subPacksByParent[pack.id]?.length || 0;
    
    if (compact) {
      return (
        <button
          type="button"
          onClick={() => handleSelect(pack)}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl border bg-card text-left transition-all active:scale-[0.97]",
            "hover:border-primary",
            isSub && "border-dashed"
          )}
        >
          <div className="p-2 rounded-lg bg-muted shrink-0">
            {getIcon(pack.code, 'sm')}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm leading-tight truncate">
              {pack.shortName || pack.name}
            </h4>
            {!isSub && subCount > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">+{subCount} ngành phụ</p>
            )}
          </div>
          {isPopular && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] px-1.5 shrink-0">
              <Star className="w-3 h-3 mr-0.5" />
              Hot
            </Badge>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleSelect(pack)}
        onMouseEnter={() => setHoveredPack(pack)}
        onMouseLeave={() => setHoveredPack(null)}
        className={cn(
          "group relative p-5 rounded-xl border-2 bg-card text-left transition-all duration-200 min-h-[100px]",
          "hover:border-primary hover:shadow-lg hover:scale-[1.02]",
          isSub && "border-dashed"
        )}
      >
        {isPopular && (
          <div className="absolute -top-2 -right-2 z-10">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] px-1.5">
              <Star className="w-3 h-3 mr-0.5" />
              Hot
            </Badge>
          </div>
        )}
        
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl shrink-0 transition-colors bg-muted group-hover:bg-primary/10">
            {getIcon(pack.code, 'md')}
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <h4 className="font-semibold text-base leading-snug line-clamp-2">
              {pack.shortName || pack.name}
            </h4>
            {pack.name !== pack.shortName && pack.shortName && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-1">
                {pack.name}
              </p>
            )}
            {!isSub && subCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">+{subCount} ngành phụ</p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
        </div>
      </button>
    );
  };

  // ==================== MOBILE: Drawer ====================
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh] flex flex-col">
          <DrawerHeader className="pb-2 px-4">
            <div className="flex items-center gap-2">
              {selectedCategory && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setSelectedCategory(null)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <DrawerTitle className="text-base flex items-center gap-2 flex-1">
                <Sparkles className="w-4 h-4 text-primary" />
                {selectedCategory
                  ? (corePacks.find(c => c.id === selectedCategory)?.shortName || 'Ngành phụ')
                  : 'Chọn ngành nghề'
                }
              </DrawerTitle>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {coreCount} ngành
              </Badge>
            </div>

            {/* Search */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm ngành..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedCategory(null);
                }}
                className="pl-9 h-10 text-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : searchQuery ? (
              // Search results
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  {filteredPacks.length} kết quả cho "{searchQuery}"
                </p>
                {filteredPacks.length > 0 ? (
                  filteredPacks.map((pack) => (
                    <IndustryCard key={pack.id} pack={pack} compact />
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Không tìm thấy ngành phù hợp
                  </p>
                )}
              </div>
            ) : selectedCategory ? (
              // Category detail - show core + subs
              <div className="space-y-2">
                {filteredPacks.map((pack) => (
                  <IndustryCard key={pack.id} pack={pack} compact />
                ))}
              </div>
            ) : (
              // Default: Popular + All categories list
              <div className="space-y-4">
                {/* Popular */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    Phổ biến
                  </h4>
                  <div className="space-y-1.5">
                    {popularPacks.map((pack) => (
                      <IndustryCard key={pack.id} pack={pack} compact />
                    ))}
                  </div>
                </div>

                {/* All categories */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Tất cả danh mục
                  </h4>
                  <div className="space-y-1.5">
                    {corePacks.map((core) => {
                      const subCount = subPacksByParent[core.id]?.length || 0;
                      return (
                        <button
                          key={core.id}
                          type="button"
                          onClick={() => {
                            if (subCount > 0) {
                              setSelectedCategory(core.id);
                            } else {
                              handleSelect(core);
                            }
                          }}
                          className="flex items-center gap-3 w-full p-3 rounded-xl border bg-card text-left transition-all active:scale-[0.97]"
                        >
                          <div className="p-2 rounded-lg bg-muted shrink-0">
                            {getIcon(core.code, 'sm')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">
                              {core.shortName || core.name}
                            </h4>
                            {subCount > 0 && (
                              <p className="text-[10px] text-muted-foreground">+{subCount} ngành phụ</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // ==================== DESKTOP: Dialog ====================
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Chọn ngành nghề
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm">
                  Chọn ngành để tự động áp dụng Brand Voice, quy tắc tuân thủ và từ vựng chuyên ngành
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{coreCount} ngành chính</Badge>
                <Badge variant="outline" className="text-xs">+{totalCount - coreCount} phụ</Badge>
              </div>
            </div>
          </div>
          
          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm ngành..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedCategory(null);
              }}
              className="pl-11 h-11 text-base"
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

        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar */}
          <div className="w-56 lg:w-64 border-r bg-muted/20 flex flex-col shrink-0">
            <div className="p-3 border-b">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Danh mục ngành</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                <button
                  type="button"
                  onClick={() => { setSelectedCategory(null); setSearchQuery(''); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-muted",
                    !selectedCategory && !searchQuery && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <Star className="w-4 h-4" />
                  <span className="text-sm">Phổ biến</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">{popularPacks.length}</Badge>
                </button>
                
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
                        onClick={() => { setSelectedCategory(core.id); setSearchQuery(''); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-muted",
                          isActive && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        {getIcon(core.code, 'sm')}
                        <span className="text-sm flex-1 truncate">{core.shortName || core.name}</span>
                        {subCount > 0 && (
                          <Badge variant="outline" className="text-[10px] shrink-0">+{subCount}</Badge>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right content */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <ScrollArea className="flex-1">
              <div className="p-6">
                {isLoading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Kết quả "{searchQuery}"</h3>
                      <Badge variant="secondary" className="text-xs">{filteredPacks.length} kết quả</Badge>
                    </div>
                    {filteredPacks.length > 0 ? (
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPacks.map((pack) => (
                          <IndustryCard key={pack.id} pack={pack} />
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <p className="text-muted-foreground text-sm">Không tìm thấy ngành phù hợp</p>
                      </div>
                    )}
                  </div>
                ) : selectedCategory ? (
                  <div className="space-y-4">
                    {(() => {
                      const core = corePacks.find(c => c.id === selectedCategory);
                      const subs = subPacksByParent[selectedCategory] || [];
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium flex items-center gap-2">
                              {getIcon(core?.code || '', 'sm')}
                              <span className="truncate">{core?.shortName || core?.name}</span>
                            </h3>
                            <Badge variant="secondary" className="text-xs shrink-0">{1 + subs.length} ngành</Badge>
                          </div>
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {core && <IndustryCard pack={core} />}
                            {subs.map((sub) => (
                              <IndustryCard key={sub.id} pack={sub} />
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-500" />
                          Ngành phổ biến
                        </h3>
                        <Badge variant="secondary" className="text-xs">{popularPacks.length} ngành</Badge>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {popularPacks.map((pack) => (
                          <IndustryCard key={pack.id} pack={pack} />
                        ))}
                      </div>
                    </div>
                    <div className="border-t pt-6">
                      <p className="text-sm text-muted-foreground text-center">
                        Chọn một danh mục bên trái để xem tất cả ngành trong danh mục đó
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
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
                        <Badge key={i} variant="outline" className="text-xs">{tone}</Badge>
                      ))}
                      {hoveredPack.brandVoice?.formality_level && (
                        <Badge variant="secondary" className="text-xs">{hoveredPack.brandVoice.formality_level}</Badge>
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
