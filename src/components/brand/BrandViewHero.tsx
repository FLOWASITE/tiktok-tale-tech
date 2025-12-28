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

interface BrandViewHeroProps {
  template: BrandTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onDuplicate: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function BrandViewHero({
  template,
  onEdit,
  onDelete,
  onSetDefault,
  onDuplicate,
  onRefresh,
  refreshing,
}: BrandViewHeroProps) {
  const { currentOrganization } = useOrganizationContext();
  const isOrganizationBrand = !!template.organization_id;

  const formalityLabel = FORMALITY_LEVEL_OPTIONS.find(
    (o) => o.value === template.formality_level
  )?.label;

  return (
    <div className="relative">
      {/* Background gradient with brand color */}
      <div
        className="absolute inset-0 rounded-xl opacity-10"
        style={{
          background: template.primary_color
            ? `linear-gradient(135deg, ${template.primary_color} 0%, transparent 60%)`
            : undefined,
        }}
      />

      <div className="relative space-y-4 p-4 md:p-6">
        {/* Top row: Back + Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
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
              className="h-8 w-8"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>

            <Button size="sm" onClick={onEdit}>
              <Edit2 className="w-4 h-4 mr-2" />
              Chỉnh sửa
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
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
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Xóa
                    </DropdownMenuItem>
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
                      <AlertDialogAction onClick={onDelete}>Xóa</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Brand Identity */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {template.logo_url ? (
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 border-border overflow-hidden bg-background shadow-sm shrink-0">
              <img
                src={template.logo_url}
                alt={`${template.brand_name} logo`}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div
              className="w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center shrink-0 shadow-sm"
              style={{
                backgroundColor: template.primary_color ? `${template.primary_color}20` : 'hsl(var(--muted))',
              }}
            >
              <span
                className="text-2xl md:text-3xl font-bold"
                style={{ color: template.primary_color || 'hsl(var(--muted-foreground))' }}
              >
                {template.brand_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Info */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {template.is_default && (
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 shrink-0" />
              )}
              <h1 className="text-xl md:text-2xl font-bold truncate">{template.brand_name}</h1>
            </div>

            {template.tagline && (
              <p className="text-sm md:text-base text-muted-foreground italic truncate">
                "{template.tagline}"
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap pt-1">
              {isOrganizationBrand ? (
                <Badge variant="outline" className="gap-1 bg-primary/5 border-primary/20">
                  <Building2 className="w-3 h-3" />
                  {currentOrganization?.name || 'Tổ chức'}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <User className="w-3 h-3" />
                  Cá nhân
                </Badge>
              )}
              {template.is_default && <Badge>Mặc định</Badge>}
              {template.industry?.slice(0, 2).map((ind) => (
                <Badge key={ind} variant="outline">
                  {ind}
                </Badge>
              ))}
            </div>

            {template.mission && (
              <p className="text-sm text-muted-foreground line-clamp-2 pt-2">
                {template.mission}
              </p>
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="flex flex-wrap gap-2 md:gap-3 pt-2">
          {/* Primary Color */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
            <div
              className="w-4 h-4 rounded-full border border-border"
              style={{ backgroundColor: template.primary_color || '#888888' }}
            />
            <span className="text-xs font-mono">{template.primary_color || 'N/A'}</span>
          </div>

          {/* Formality */}
          {formalityLabel && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
              <Target className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs">{formalityLabel}</span>
            </div>
          )}

          {/* Emoji */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
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
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs">{template.target_age_range}</span>
            </div>
          )}

          {/* Target Location */}
          {template.target_locations && template.target_locations.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
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
