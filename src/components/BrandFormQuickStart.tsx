import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, Target, Wand2, Info,
  Briefcase, Coffee, Code, GraduationCap, Heart, Plane, ShoppingCart,
  Megaphone, Scale, Hammer, Sparkles, Store, Factory, Leaf, Truck, Shield,
  Landmark, Smartphone, Gamepad2, Palette, Dumbbell, Sofa, Ship, Rocket,
  Bitcoin, UsersRound, PartyPopper, Home, Baby, PawPrint, Car, Building2
} from 'lucide-react';
import { useGlobalPacksForBrandSelection, GlobalPackForSelection } from '@/hooks/useGlobalPacksForBrandSelection';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const INDUSTRY_ICONS: Record<string, React.ReactNode> = {
  accounting: <Briefcase className="w-4 h-4" />,
  banking: <Landmark className="w-4 h-4" />,
  insurance: <Shield className="w-4 h-4" />,
  crypto_fintech: <Bitcoin className="w-4 h-4" />,
  it: <Code className="w-4 h-4" />,
  telecom: <Smartphone className="w-4 h-4" />,
  gaming: <Gamepad2 className="w-4 h-4" />,
  startup: <Rocket className="w-4 h-4" />,
  ecommerce: <ShoppingCart className="w-4 h-4" />,
  retail: <Store className="w-4 h-4" />,
  import_export: <Ship className="w-4 h-4" />,
  healthcare: <Heart className="w-4 h-4" />,
  education: <GraduationCap className="w-4 h-4" />,
  legal: <Scale className="w-4 h-4" />,
  consulting: <UsersRound className="w-4 h-4" />,
  hr: <UsersRound className="w-4 h-4" />,
  fnb: <Coffee className="w-4 h-4" />,
  travel: <Plane className="w-4 h-4" />,
  fashion: <Sparkles className="w-4 h-4" />,
  beauty: <Palette className="w-4 h-4" />,
  fitness: <Dumbbell className="w-4 h-4" />,
  pet: <PawPrint className="w-4 h-4" />,
  realestate: <Building2 className="w-4 h-4" />,
  construction: <Hammer className="w-4 h-4" />,
  interior: <Sofa className="w-4 h-4" />,
  manufacturing: <Factory className="w-4 h-4" />,
  agriculture: <Leaf className="w-4 h-4" />,
  logistics: <Truck className="w-4 h-4" />,
  automotive: <Car className="w-4 h-4" />,
  marketing: <Megaphone className="w-4 h-4" />,
  events: <PartyPopper className="w-4 h-4" />,
  home_services: <Home className="w-4 h-4" />,
  mother_baby: <Baby className="w-4 h-4" />,
};

// Popular industries to show first
const POPULAR_CODES = ['ecommerce', 'fnb', 'healthcare', 'realestate', 'it', 'fashion'];

interface BrandFormQuickStartProps {
  onSelectIndustry: (pack: GlobalPackForSelection) => void;
  onStartManual: () => void;
}

export function BrandFormQuickStart({
  onSelectIndustry,
  onStartManual,
}: BrandFormQuickStartProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: packs = [], isLoading } = useGlobalPacksForBrandSelection({
    languageCode: 'vi',
    includeSubIndustries: true, // Show all industries
  });

  const { popularPacks, filteredPacks } = useMemo(() => {
    const popular = packs.filter(p => POPULAR_CODES.includes(p.code));
    
    if (!searchQuery.trim()) {
      const others = packs.filter(p => !POPULAR_CODES.includes(p.code));
      return { popularPacks: popular, filteredPacks: others };
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = packs.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.shortName?.toLowerCase() || '').includes(query) ||
      p.code.toLowerCase().includes(query)
    );
    return { popularPacks: [], filteredPacks: filtered };
  }, [packs, searchQuery]);

  const IndustryButton = ({ pack }: { pack: GlobalPackForSelection }) => {
    const icon = INDUSTRY_ICONS[pack.code] || <Briefcase className="w-4 h-4" />;
    return (
      <button
        type="button"
        onClick={() => onSelectIndustry(pack)}
        className={cn(
          "p-2.5 rounded-lg border bg-background transition-all",
          "hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm",
          "flex items-center gap-2 text-left"
        )}
      >
        <div className="p-1.5 rounded-md bg-muted shrink-0">
          {icon}
        </div>
        <span className="text-xs font-medium truncate">
          {pack.shortName || pack.name}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with info tooltip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Chọn ngành để bắt đầu</h3>
          <Badge variant="secondary" className="text-[10px]">Khuyến nghị</Badge>
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
                <strong>Industry Memory</strong> là bộ quy tắc tuân thủ ngành & quốc gia. 
                Chọn ngành để được áp dụng từ cấm, compliance rules và Brand Voice chuẩn tự động.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Two-column layout: Industries left, Manual option right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,240px] gap-4">
        {/* Left: Industry Selection */}
        <div className="space-y-3 p-4 rounded-lg border bg-muted/20">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm ngành..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Popular industries */}
              {popularPacks.length > 0 && !searchQuery && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Phổ biến
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {popularPacks.map((pack) => (
                      <IndustryButton key={pack.id} pack={pack} />
                    ))}
                  </div>
                </div>
              )}

              {/* Other industries */}
              {filteredPacks.length > 0 && (
                <div className="space-y-2">
                  {!searchQuery && (
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      Tất cả ngành
                    </p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {filteredPacks.map((pack) => (
                      <IndustryButton key={pack.id} pack={pack} />
                    ))}
                  </div>
                </div>
              )}

              {filteredPacks.length === 0 && popularPacks.length === 0 && (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  Không tìm thấy ngành phù hợp
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Manual option */}
        <div className="p-4 rounded-lg border bg-muted/10 flex flex-col items-center justify-center text-center gap-3">
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
        </div>
      </div>
    </div>
  );
}
