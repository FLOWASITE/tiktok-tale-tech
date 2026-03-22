import { useState, useCallback } from 'react';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Edit2,
  Star,
  User,
  Building2,
  Palette,
  Smile,
  Ban,
  Check,
  Loader2,
  Copy,
  Trash2,
  RefreshCw,
  MoreVertical,
  Target,
  Users,
  MapPin,
  Package,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { FORMALITY_LEVEL_OPTIONS } from '@/components/BrandVoiceSection';
import { BrandCompleteness } from '@/utils/brandCompleteness';
import { BrandCompletenessRing } from './BrandCompletenessRing';
import { cn } from '@/lib/utils';

interface BrandViewHeroProps {
  template: BrandTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onDuplicate: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  completeness?: BrandCompleteness | null;
  personasCount?: number;
  productsCount?: number;
}

export function BrandViewHero({
  template,
  onEdit,
  onDelete,
  onSetDefault,
  onDuplicate,
  onRefresh,
  refreshing,
  completeness,
  personasCount = 0,
  productsCount = 0,
}: BrandViewHeroProps) {
  const { currentOrganization } = useOrganizationContext();
  const isOrganizationBrand = !!template.organization_id;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const canDelete = deleteConfirmName.trim() === template.brand_name.trim();
  const handleDeleteConfirm = useCallback(() => {
    if (canDelete) {
      onDelete();
      setDeleteDialogOpen(false);
      setDeleteConfirmName('');
    }
  }, [canDelete, onDelete]);
  const handleDeleteOpenChange = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) setDeleteConfirmName('');
  }, []);

  const formalityLabel = FORMALITY_LEVEL_OPTIONS.find(
    (o) => o.value === template.formality_level
  )?.label;

  // Get secondary color or generate a complementary one
  const secondaryColor = template.secondary_colors?.[0] || 
    (template.primary_color ? adjustColor(template.primary_color, 30) : undefined);

  return (
    <div className="relative">
      {/* Enhanced Background gradient with brand colors */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: template.primary_color
            ? `linear-gradient(135deg, ${template.primary_color} 0%, ${secondaryColor || 'transparent'} 50%, transparent 100%)`
            : 'linear-gradient(135deg, hsl(var(--primary)/0.3) 0%, transparent 100%)',
        }}
      />
      
      {/* Decorative pattern overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, ${template.primary_color || 'hsl(var(--primary))'} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative space-y-4 p-4 md:p-6">
        {/* Top row: Back + Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="hover:bg-background/50">
            <Link to="/brands">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Brands
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={refreshing}
              className="h-8 w-8 hover:bg-background/50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>

            <Button size="sm" onClick={onEdit} className="gap-1.5 shadow-sm">
              <Edit2 className="w-4 h-4" />
              Chỉnh sửa
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 bg-background/50">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!template.is_default && (
                  <DropdownMenuItem onClick={onSetDefault}>
                    <Check className="w-4 h-4 mr-2" />
                    Đặt mặc định
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Sao chép
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteOpenChange}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa Brand Template?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>
                        Hành động này <strong>không thể hoàn tác</strong>. Tất cả dữ liệu liên quan đến brand &ldquo;{template.brand_name}&rdquo; sẽ bị xóa vĩnh viễn.
                      </p>
                      <p>
                        Để xác nhận, vui lòng nhập tên brand: <strong className="text-foreground">{template.brand_name}</strong>
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmName}
                        onChange={(e) => setDeleteConfirmName(e.target.value)}
                        placeholder={template.brand_name}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        autoFocus
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteConfirm}
                    disabled={!canDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Xóa vĩnh viễn
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Brand Identity */}
        <div className="flex items-start gap-4 md:gap-6">
          {/* Avatar */}
          {template.logo_url ? (
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl border-2 border-border overflow-hidden bg-background shadow-lg shrink-0 ring-4 ring-background/50">
              <img
                src={template.logo_url}
                alt={`${template.brand_name} logo`}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div
              className="w-16 h-16 md:w-24 md:h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center shrink-0 shadow-lg ring-4 ring-background/50"
              style={{
                backgroundColor: template.primary_color ? `${template.primary_color}30` : 'hsl(var(--muted))',
              }}
            >
              <span
                className="text-2xl md:text-4xl font-bold"
                style={{ color: template.primary_color || 'hsl(var(--muted-foreground))' }}
              >
                {template.brand_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Info */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {template.is_default && (
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 shrink-0 drop-shadow-sm" />
              )}
              <h1 className="text-xl md:text-2xl font-bold truncate">{template.brand_name}</h1>
            </div>

            {template.tagline && (
              <p className="text-sm md:text-base text-muted-foreground italic truncate">
                "{template.tagline}"
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {isOrganizationBrand ? (
                <Badge variant="outline" className="gap-1 bg-primary/10 border-primary/30">
                  <Building2 className="w-3 h-3" />
                  {currentOrganization?.name || 'Tổ chức'}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <User className="w-3 h-3" />
                  Cá nhân
                </Badge>
              )}
              {template.is_default && <Badge className="bg-primary/90">Mặc định</Badge>}
              {template.industry?.slice(0, 2).map((ind) => (
                <Badge key={ind} variant="outline" className="bg-background/50">
                  {ind}
                </Badge>
              ))}
            </div>

            {template.mission && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {template.mission}
              </p>
            )}
          </div>

          {/* Completeness Ring - Desktop */}
          {completeness && (
            <div className="hidden md:block shrink-0">
              <BrandCompletenessRing 
                completeness={completeness} 
                size="xl" 
                showIcon 
                showLabel 
              />
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 pt-2">
          {/* Completeness Ring - Mobile */}
          {completeness && (
            <div className="md:hidden">
              <BrandCompletenessRing 
                completeness={completeness} 
                size="md" 
                showLabel={false} 
                showIcon={false}
              />
            </div>
          )}

          {/* Primary Color */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 border border-border/50 shadow-sm">
            <div
              className="w-4 h-4 rounded-full border border-border shadow-inner"
              style={{ backgroundColor: template.primary_color || '#888888' }}
            />
            <span className="text-xs font-mono">{template.primary_color || 'N/A'}</span>
          </div>

          {/* Personas Count */}
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm",
            personasCount > 0 
              ? "bg-primary/10 border-primary/30" 
              : "bg-background/80 border-border/50"
          )}>
            <Users className={cn("w-3.5 h-3.5", personasCount > 0 ? "text-primary" : "text-muted-foreground")} />
            <span className="text-xs">{personasCount} Personas</span>
          </div>

          {/* Products Count */}
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm",
            productsCount > 0 
              ? "bg-emerald-500/10 border-emerald-500/30" 
              : "bg-background/80 border-border/50"
          )}>
            <Package className={cn("w-3.5 h-3.5", productsCount > 0 ? "text-emerald-600" : "text-muted-foreground")} />
            <span className="text-xs">{productsCount} Sản phẩm</span>
          </div>

          {/* Formality */}
          {formalityLabel && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 border border-border/50 shadow-sm">
              <Target className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs">{formalityLabel}</span>
            </div>
          )}

          {/* Emoji */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 border border-border/50 shadow-sm">
            {template.allow_emoji !== false ? (
              <>
                <Smile className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs">Emoji</span>
              </>
            ) : (
              <>
                <Ban className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">No emoji</span>
              </>
            )}
          </div>

          {/* Target Age */}
          {template.target_age_range && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 border border-border/50 shadow-sm">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs">{template.target_age_range}</span>
            </div>
          )}

          {/* Target Location */}
          {template.target_locations && template.target_locations.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 border border-border/50 shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs">{template.target_locations[0]}</span>
              {template.target_locations.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  +{template.target_locations.length - 1}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to adjust color brightness
function adjustColor(hex: string, percent: number): string {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
  } catch {
    return hex;
  }
}
