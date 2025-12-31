import { Palette, User, Building2, Plus, Upload, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';
import { cn } from '@/lib/utils';

interface BrandHeroSectionProps {
  totalBrands: number;
  personalCount: number;
  orgCount: number;
  averageCompleteness: number;
  onCreateNew: () => void;
  onImport: () => void;
  onExport: () => void;
  isExportDisabled: boolean;
}

function StatCard({
  value,
  label,
  icon: Icon,
  isPercentage = false,
  colorClass = '',
}: {
  value: number;
  label: string;
  icon: React.ElementType;
  isPercentage?: boolean;
  colorClass?: string;
}) {
  const animatedValue = useAnimatedCounter(value, 800);

  return (
    <div className="glass-card rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform duration-300">
      <div className={cn('p-2.5 rounded-lg bg-primary/10', colorClass)}>
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-2xl sm:text-3xl font-bold text-foreground">
          {animatedValue}{isPercentage && '%'}
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function CompletenessRing({ value }: { value: number }) {
  const animatedValue = useAnimatedCounter(value, 1000);
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  const getColor = () => {
    if (animatedValue >= 100) return 'stroke-emerald-500';
    if (animatedValue >= 70) return 'stroke-blue-500';
    if (animatedValue >= 40) return 'stroke-amber-500';
    return 'stroke-destructive';
  };

  return (
    <div className="glass-card rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform duration-300">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-muted/30"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            className={cn('transition-all duration-1000 ease-out', getColor())}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{animatedValue}%</span>
        </div>
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground text-center">Hoàn thiện TB</p>
    </div>
  );
}

export function BrandHeroSection({
  totalBrands,
  personalCount,
  orgCount,
  averageCompleteness,
  onCreateNew,
  onImport,
  onExport,
  isExportDisabled,
}: BrandHeroSectionProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/15 to-primary/10 animate-gradient-shift" />
      
      {/* Floating decorative elements */}
      <div className="absolute top-4 right-10 w-20 h-20 rounded-full bg-primary/10 blur-2xl animate-float-slow" />
      <div className="absolute bottom-8 left-16 w-16 h-16 rounded-full bg-secondary/10 blur-xl animate-float-slow" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 right-1/4 w-12 h-12 rounded-full bg-primary/5 blur-lg animate-float-slow" style={{ animationDelay: '4s' }} />

      {/* Content */}
      <div className="relative z-10 p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 glow-primary-subtle">
              <Palette className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Quản lý Brand</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Xây dựng thương hiệu nhất quán cho mọi nội dung
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onImport} className="h-9">
              <Upload className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onExport} disabled={isExportDisabled} className="h-9">
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button onClick={onCreateNew} size="sm" className="h-9 shimmer-btn">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Tạo Brand mới</span>
              <span className="sm:hidden">Tạo</span>
              <Sparkles className="w-3.5 h-3.5 ml-1.5 text-primary-foreground/70" />
            </Button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            value={totalBrands}
            label="Tổng brands"
            icon={Palette}
          />
          <StatCard
            value={personalCount}
            label="Cá nhân"
            icon={User}
          />
          <StatCard
            value={orgCount}
            label="Tổ chức"
            icon={Building2}
          />
          <CompletenessRing value={averageCompleteness} />
        </div>
      </div>
    </div>
  );
}
