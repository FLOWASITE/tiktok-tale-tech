import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, Target, User, ShieldCheck, Lock, Wand2, 
  Briefcase, Coffee, Code, GraduationCap, Heart, Plane, ShoppingCart,
  Megaphone, Scale, Hammer, Sparkles, Store, Factory, Leaf, Truck, Shield,
  Landmark, Smartphone, Gamepad2, Palette, Dumbbell, Sofa, Ship, Rocket,
  Bitcoin, UsersRound, PartyPopper, Home, Baby, PawPrint, Car, Building2
} from 'lucide-react';
import { useIndustryTemplates, IndustryTemplate } from '@/hooks/useIndustryTemplates';
import { cn } from '@/lib/utils';

const INDUSTRY_ICONS: Record<string, React.ReactNode> = {
  accounting: <Briefcase className="w-5 h-5" />,
  banking: <Landmark className="w-5 h-5" />,
  insurance: <Shield className="w-5 h-5" />,
  crypto_fintech: <Bitcoin className="w-5 h-5" />,
  it: <Code className="w-5 h-5" />,
  telecom: <Smartphone className="w-5 h-5" />,
  gaming: <Gamepad2 className="w-5 h-5" />,
  startup: <Rocket className="w-5 h-5" />,
  ecommerce: <ShoppingCart className="w-5 h-5" />,
  retail: <Store className="w-5 h-5" />,
  import_export: <Ship className="w-5 h-5" />,
  healthcare: <Heart className="w-5 h-5" />,
  education: <GraduationCap className="w-5 h-5" />,
  legal: <Scale className="w-5 h-5" />,
  consulting: <UsersRound className="w-5 h-5" />,
  hr: <UsersRound className="w-5 h-5" />,
  fnb: <Coffee className="w-5 h-5" />,
  travel: <Plane className="w-5 h-5" />,
  fashion: <Sparkles className="w-5 h-5" />,
  beauty: <Palette className="w-5 h-5" />,
  fitness: <Dumbbell className="w-5 h-5" />,
  pet: <PawPrint className="w-5 h-5" />,
  realestate: <Building2 className="w-5 h-5" />,
  construction: <Hammer className="w-5 h-5" />,
  interior: <Sofa className="w-5 h-5" />,
  manufacturing: <Factory className="w-5 h-5" />,
  agriculture: <Leaf className="w-5 h-5" />,
  logistics: <Truck className="w-5 h-5" />,
  automotive: <Car className="w-5 h-5" />,
  marketing: <Megaphone className="w-5 h-5" />,
  events: <PartyPopper className="w-5 h-5" />,
  home_services: <Home className="w-5 h-5" />,
  mother_baby: <Baby className="w-5 h-5" />,
};

interface BrandFormQuickStartProps {
  onSelectIndustry: (template: IndustryTemplate) => void;
  onStartManual: () => void;
}

export function BrandFormQuickStart({
  onSelectIndustry,
  onStartManual,
}: BrandFormQuickStartProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { templates, isLoading } = useIndustryTemplates({
    countryCode: 'VN',
    languageCode: 'vi',
  });

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(t => 
      t.name.toLowerCase().includes(query) ||
      (t.short_name?.toLowerCase() || '').includes(query) ||
      (t.brand_positioning?.toLowerCase() || '').includes(query)
    );
  }, [templates, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Legal Statement */}
      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
          <Lock className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            <span className="font-medium">Industry Memory</span> là bộ quy tắc bắt buộc nhằm đảm bảo tuân thủ ngành & quốc gia. 
            Chọn ngành để được bảo vệ tự động.
          </span>
        </p>
      </div>

      {/* Path 1: Select Industry (Recommended) */}
      <Card className="p-5 border-2 border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-full bg-emerald-500/10">
            <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-emerald-700 dark:text-emerald-300">
                Chọn ngành của bạn
              </h3>
              <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0 text-xs">
                Recommended
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Tự động áp dụng bộ quy tắc tuân thủ ngành + Brand Voice chuẩn
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="p-3 rounded-lg bg-background/50 border mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">⚡ Pack đã chọn sẽ tự động:</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-destructive" />
              <span>Áp dụng từ cấm ngành <span className="text-destructive font-medium">(LOCKED)</span></span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Áp dụng compliance rules <span className="text-emerald-600 dark:text-emerald-400 font-medium">(LOCKED)</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Thiết lập Brand Voice nền <span className="text-muted-foreground">(có thể tinh chỉnh)</span></span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm ngành... (VD: tài chính, thời trang, F&B)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Results count */}
        {searchQuery && (
          <p className="text-xs text-muted-foreground mb-2">
            Tìm thấy {filteredTemplates.length} ngành
          </p>
        )}

        {/* Industry Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[320px] overflow-y-auto pr-1">
            {filteredTemplates.map((template) => {
              const icon = INDUSTRY_ICONS[template.code] || <Briefcase className="w-5 h-5" />;
              
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onSelectIndustry(template)}
                  className={cn(
                    "p-3 rounded-lg border bg-background text-center transition-all",
                    "hover:border-emerald-500/50 hover:shadow-sm hover:bg-emerald-500/5",
                    "flex flex-col items-center gap-2 cursor-pointer"
                  )}
                >
                  <div className="p-2 rounded-full bg-muted">
                    {icon}
                  </div>
                  <span className="text-xs font-medium line-clamp-2">
                    {template.short_name || template.name}
                  </span>
                </button>
              );
            })}
            {filteredTemplates.length === 0 && (
              <div className="col-span-full py-8 text-center text-muted-foreground">
                <p>Không tìm thấy ngành phù hợp</p>
                <p className="text-xs mt-1">Thử từ khóa khác hoặc bắt đầu thủ công</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Hoặc</span>
        </div>
      </div>

      {/* Path 2: Start from Scratch */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-muted">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">Bắt đầu từ đầu</h3>
            <p className="text-sm text-muted-foreground">
              Tự nhập tất cả thông tin, có thể liên kết Industry Memory sau
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onStartManual}
            className="gap-2 shrink-0"
          >
            <Wand2 className="w-4 h-4" />
            Bắt đầu
          </Button>
        </div>
      </Card>
    </div>
  );
}
