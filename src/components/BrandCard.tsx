import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandTemplate, BrandScope } from '@/hooks/useBrandTemplates';
import { BrandUsageStats } from '@/hooks/useBrandAnalytics';
import { BrandCounts } from '@/hooks/useBrandCounts';
import { calculateBrandCompleteness, getCompletenessColor, getCompletenessRingColor } from '@/utils/brandCompleteness';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit2, Trash2, Star, Check, Copy, User, Building2, Eye, Users, Package, Scroll, ChevronDown, ChevronUp, Link2Off, Facebook, Instagram, Linkedin, Twitter, Youtube, Globe, MessageCircle } from 'lucide-react';
import { ChannelIcon } from '@/components/multichannel/streaming/ChannelIcon';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface BrandCardProps {
  template: BrandTemplate;
  organizationName?: string;
  onEdit: (template: BrandTemplate) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onDuplicate?: (id: string, scope?: BrandScope) => void;
  compact?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (id: string, checked: boolean) => void;
  usageStats?: BrandUsageStats | null;
  brandCounts?: BrandCounts;
  connectedPlatforms?: string[];
}

// Animated Completeness Ring Component
function CompletenessRing({ 
  score, 
  level, 
  size = 64 
}: { 
  score: number; 
  level: 'low' | 'medium' | 'high' | 'complete';
  size?: number;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className={cn('transition-all duration-700 ease-out', getCompletenessRingColor(level))}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn('text-sm font-bold', getCompletenessColor(level))}>
          {score}%
        </span>
      </div>
    </div>
  );
}

export function BrandCard({ 
  template, 
  organizationName,
  onEdit, 
  onDelete, 
  onSetDefault, 
  onDuplicate, 
  compact = false,
  selectable = false,
  selected = false,
  onSelectChange,
  brandCounts,
  hasSocialConnections = false,
}: BrandCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Determine ownership
  const isOrganizationBrand = !!template.organization_id;
  
  // Calculate brand completeness
  const completeness = useMemo(() => {
    return calculateBrandCompleteness(
      template, 
      brandCounts?.personasCount || 0, 
      brandCounts?.productsCount || 0
    );
  }, [template, brandCounts]);

  // Logo Component
  const LogoDisplay = ({ size = 48 }: { size?: number }) => {
    return template.logo_url ? (
      <div 
        className="rounded-xl border border-border overflow-hidden bg-muted shrink-0"
        style={{ width: size, height: size }}
      >
        <img
          src={template.logo_url}
          alt={`${template.brand_name} logo`}
          className="w-full h-full object-contain"
        />
      </div>
    ) : (
      <div 
        className="rounded-xl border border-dashed border-border flex items-center justify-center shrink-0"
        style={{ 
          width: size, 
          height: size,
          backgroundColor: template.primary_color ? `${template.primary_color}15` : undefined 
        }}
      >
        <span 
          className="text-xl font-bold"
          style={{ color: template.primary_color || 'hsl(var(--muted-foreground))' }}
        >
          {template.brand_name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  // Compact List View
  if (compact) {
    return (
      <Card className={cn(
        'relative transition-all duration-300 hover:border-primary/40 hover:shadow-md group overflow-hidden',
        template.is_default && 'ring-1 ring-primary/30 bg-primary/[0.02]',
        selected && 'ring-2 ring-primary bg-primary/5'
      )}>
        <div className="flex items-center gap-4 p-3">
          {selectable && (
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectChange?.(template.id, !!checked)}
              className="shrink-0"
            />
          )}
          
          <LogoDisplay size={40} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {template.is_default && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />}
              <span className="font-medium truncate">{template.name}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{template.brand_name}</p>
          </div>
          
          <CompletenessRing score={completeness.score} level={completeness.level} size={40} />
          
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link to={`/brands/${template.id}`}><Eye className="w-4 h-4" /></Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(template)}>
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Grid View - Redesigned
  return (
    <Card 
      className={cn(
        'relative overflow-hidden transition-all duration-300 group',
        'hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1',
        template.is_default && 'brand-card-default',
        selected && 'ring-2 ring-primary bg-primary/5'
      )}
    >
      {/* Animated gradient border for default brand */}
      {template.is_default && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-gradient-shift opacity-20" />
      )}
      
      {/* Selection Checkbox */}
      {selectable && (
        <div className="absolute top-3 left-3 z-10">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectChange?.(template.id, !!checked)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="relative p-5">
        {/* Top Section - Logo + Ring + Name */}
        <div className="flex items-start gap-4">
          <LogoDisplay size={56} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {template.is_default && (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
              )}
              <h3 className="font-semibold text-base truncate">{template.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground truncate">{template.brand_name}</p>
            
            {/* Ownership Badge */}
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant={isOrganizationBrand ? 'outline' : 'secondary'} 
                className={cn(
                  'text-[10px] gap-1',
                  isOrganizationBrand && 'bg-primary/5 border-primary/20'
                )}
              >
                {isOrganizationBrand ? (
                  <><Building2 className="w-3 h-3" />{organizationName || 'Tổ chức'}</>
                ) : (
                  <><User className="w-3 h-3" />Cá nhân</>
                )}
              </Badge>
              {template.primary_color && (
                <div 
                  className="w-4 h-4 rounded-full border-2 border-background shadow-sm"
                  style={{ backgroundColor: template.primary_color }}
                />
              )}
            </div>
          </div>
          
          {/* Completeness Ring - Visual Focus */}
          <div className="shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <CompletenessRing 
                    score={completeness.score} 
                    level={completeness.level} 
                    size={64} 
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">Brand Completeness</p>
                  <p className="text-xs text-muted-foreground">
                    {completeness.level === 'complete' ? 'Hoàn thiện!' : 
                     completeness.level === 'high' ? 'Gần hoàn thiện' :
                     completeness.level === 'medium' ? 'Đang phát triển' : 'Cần bổ sung'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Quick Stats - Always Visible */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
            <Users className="w-3 h-3" />
            {brandCounts?.personasCount || 0}
          </Badge>
          <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
            <Package className="w-3 h-3" />
            {brandCounts?.productsCount || 0}
          </Badge>
          {brandCounts?.industryMemoryName && (
            <Badge 
              variant="outline" 
              className="text-[10px] gap-1 px-2 py-0.5 bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300"
            >
              <Scroll className="w-3 h-3" />
              {brandCounts.industryMemoryName}
            </Badge>
          )}
          {!hasSocialConnections && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to={`/brands/${template.id}?tab=connections`}>
                    <Badge 
                      variant="outline" 
                      className="text-[10px] gap-1 px-2 py-0.5 bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 cursor-pointer hover:bg-amber-500/20"
                    >
                      <Link2Off className="w-3 h-3" />
                      Chưa kết nối
                    </Badge>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Kết nối mạng xã hội để đăng bài trực tiếp</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Expandable Details */}
        <div 
          className={cn(
            'overflow-hidden transition-all duration-300',
            isExpanded ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'
          )}
        >
          <div className="space-y-2 text-xs text-muted-foreground">
            {template.industry && template.industry.length > 0 && (
              <p><span className="font-medium">Ngành:</span> {template.industry.join(', ')}</p>
            )}
            {template.tagline && (
              <p><span className="font-medium">Tagline:</span> {template.tagline}</p>
            )}
            {template.tone_of_voice && template.tone_of_voice.length > 0 && (
              <p><span className="font-medium">Tone:</span> {template.tone_of_voice.slice(0, 3).join(', ')}</p>
            )}
          </div>
        </div>

        {/* Expand Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-3 py-1 transition-colors"
        >
          {isExpanded ? (
            <><ChevronUp className="w-3 h-3" /> Thu gọn</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Xem thêm</>
          )}
        </button>

        {/* Actions - Appear on Hover */}
        <div className={cn(
          'flex items-center justify-between gap-2 pt-3 mt-3 border-t border-border/50',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
        )}>
          <div className="flex gap-1">
            {!template.is_default && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onSetDefault(template.id)}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Đặt mặc định</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {onDuplicate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onDuplicate(template.id)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Tạo bản sao</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
              <Link to={`/brands/${template.id}`}>
                <Eye className="w-3.5 h-3.5 mr-1" />
                Xem
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onEdit(template)}>
              <Edit2 className="w-3.5 h-3.5 mr-1" />
              Sửa
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa Brand Template?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn có chắc muốn xóa template "{template.name}"? Hành động này không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(template.id)}>Xóa</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </Card>
  );
}
