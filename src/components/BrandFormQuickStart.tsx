import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Target, Wand2, Sparkles, ChevronRight, Star,
  ShoppingCart, Coffee, Heart, Building2, Code, Palette, GraduationCap
} from 'lucide-react';
import { GlobalPackForSelection } from '@/hooks/useGlobalPacksForBrandSelection';
import { IndustrySelectionDialog } from '@/components/brand/IndustrySelectionDialog';
import { cn } from '@/lib/utils';

// Popular industries quick access
const QUICK_ACCESS = [
  { code: 'ecommerce', name: 'Thương mại điện tử', icon: ShoppingCart },
  { code: 'fnb', name: 'F&B', icon: Coffee },
  { code: 'healthcare', name: 'Y tế & Sức khỏe', icon: Heart },
  { code: 'realestate', name: 'Bất động sản', icon: Building2 },
  { code: 'it', name: 'Công nghệ', icon: Code },
  { code: 'beauty', name: 'Làm đẹp', icon: Palette },
  { code: 'education', name: 'Giáo dục', icon: GraduationCap },
];

interface BrandFormQuickStartProps {
  onSelectIndustry: (pack: GlobalPackForSelection) => void;
  onStartManual: () => void;
}

export function BrandFormQuickStart({
  onSelectIndustry,
  onStartManual,
}: BrandFormQuickStartProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Bắt đầu với Industry Memory</h2>
        </div>
        <p className="text-muted-foreground max-w-md mx-auto">
          Chọn ngành nghề để tự động áp dụng Brand Voice, quy tắc tuân thủ và từ vựng chuyên ngành
        </p>
      </div>

      {/* Quick access grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {QUICK_ACCESS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => setDialogOpen(true)}
              className={cn(
                "group p-4 rounded-xl border-2 bg-card transition-all duration-200",
                "hover:border-primary hover:shadow-lg hover:scale-[1.03]",
                "flex flex-col items-center gap-2 text-center"
              )}
            >
              <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium">{item.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {/* Browse all industries */}
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className={cn(
            "group p-5 rounded-2xl border-2 bg-gradient-to-br from-primary/5 to-primary/10",
            "hover:border-primary hover:shadow-xl transition-all duration-200",
            "flex items-center gap-4 text-left"
          )}
        >
          <div className="p-3 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-colors">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold flex items-center gap-2">
              Duyệt tất cả ngành
              <Badge variant="secondary" className="text-[10px]">460+</Badge>
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tìm kiếm và chọn từ 460+ ngành nghề
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        {/* Manual setup */}
        <button
          type="button"
          onClick={onStartManual}
          className={cn(
            "group p-5 rounded-2xl border-2 bg-muted/30",
            "hover:border-muted-foreground/30 hover:shadow-lg transition-all duration-200",
            "flex items-center gap-4 text-left"
          )}
        >
          <div className="p-3 rounded-xl bg-muted group-hover:bg-muted/80 transition-colors">
            <Wand2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Thiết lập thủ công</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tự tùy chỉnh Brand Voice theo ý bạn
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </div>

      {/* Features highlight */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-500" />
          Brand Voice tự động
        </span>
        <span className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-500" />
          Quy tắc tuân thủ
        </span>
        <span className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-500" />
          Từ vựng chuyên ngành
        </span>
      </div>

      {/* Industry selection dialog */}
      <IndustrySelectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelectIndustry={onSelectIndustry}
        onStartManual={onStartManual}
      />
    </div>
  );
}
