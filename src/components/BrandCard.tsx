import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BrandTemplate, BrandScope } from '@/hooks/useBrandTemplates';
import { BrandUsageStats } from '@/hooks/useBrandAnalytics';
import { BrandCounts } from '@/hooks/useBrandCounts';
import { calculateBrandCompleteness, getCompletenessColor } from '@/utils/brandCompleteness';
import { 
  BRAND_POSITIONING_OPTIONS, 
  TONE_OF_VOICE_OPTIONS, 
  FORMALITY_LEVEL_OPTIONS 
} from '@/components/BrandVoiceSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Edit2, Trash2, Star, Check, Calendar, Volume2, Smile, Ban, Copy, Settings2, Globe, Facebook, Instagram, Twitter, MapPin, Linkedin, Mail, Youtube, MessageCircle, Send, User, Building2, Eye, Music2, AtSign, FileText, ExternalLink, Scroll, AlertTriangle, CheckCircle2, Users, Package } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { BrandVoicePreview } from '@/components/BrandVoicePreview';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Channel } from '@/types/multichannel';
import { cn } from '@/lib/utils';

const channelIcons: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-3.5 h-3.5" />,
  facebook: <Facebook className="w-3.5 h-3.5" />,
  instagram: <Instagram className="w-3.5 h-3.5" />,
  twitter: <Twitter className="w-3.5 h-3.5" />,
  google_maps: <MapPin className="w-3.5 h-3.5" />,
  linkedin: <Linkedin className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  youtube: <Youtube className="w-3.5 h-3.5" />,
  zalo_oa: <MessageCircle className="w-3.5 h-3.5" />,
  telegram: <Send className="w-3.5 h-3.5" />,
  tiktok: <Music2 className="w-3.5 h-3.5" />,
  threads: <AtSign className="w-3.5 h-3.5" />,
};

const channelLabels: Record<Channel, string> = {
  website: 'Website',
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'X (Twitter)',
  google_maps: 'Google Maps',
  linkedin: 'LinkedIn',
  email: 'Email',
  youtube: 'YouTube',
  zalo_oa: 'Zalo OA',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  threads: 'Threads',
};

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
  usageStats,
  brandCounts,
}: BrandCardProps) {
  const formattedDate = format(new Date(template.created_at), 'dd/MM/yyyy', { locale: vi });
  
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
  
  // Calculate channel overrides
  const channelOverridesInfo = useMemo(() => {
    if (!template.channel_overrides) return { count: 0, channels: [] as Channel[] };
    const channels = Object.keys(template.channel_overrides) as Channel[];
    return { count: channels.length, channels };
  }, [template.channel_overrides]);

  // Get completeness bar color
  const completenessBarColor = useMemo(() => {
    switch (completeness.level) {
      case 'complete': return 'bg-emerald-500';
      case 'high': return 'bg-blue-500';
      case 'medium': return 'bg-amber-500';
      case 'low': default: return 'bg-destructive';
    }
  }, [completeness.level]);

  // Ownership Badge Component
  const OwnershipBadge = () => (
    isOrganizationBrand ? (
      <Badge variant="outline" className="text-[10px] gap-1 shrink-0 bg-primary/5 border-primary/20">
        <Building2 className="w-3 h-3" />
        {organizationName || 'Tổ chức'}
      </Badge>
    ) : (
      <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
        <User className="w-3 h-3" />
        Cá nhân
      </Badge>
    )
  );

  // Logo Component
  const LogoDisplay = ({ size = 'default' }: { size?: 'default' | 'small' }) => {
    const dimensions = size === 'small' ? 'w-10 h-10' : 'w-14 h-14';
    const textSize = size === 'small' ? 'text-base' : 'text-xl';
    
    return template.logo_url ? (
      <div className={cn(dimensions, 'rounded-lg border border-border overflow-hidden bg-muted shrink-0')}>
        <img
          src={template.logo_url}
          alt={`${template.brand_name} logo`}
          className="w-full h-full object-contain"
        />
      </div>
    ) : (
      <div 
        className={cn(dimensions, 'rounded-lg border border-dashed border-border flex items-center justify-center shrink-0')}
        style={{ backgroundColor: template.primary_color ? `${template.primary_color}20` : undefined }}
      >
        <span 
          className={cn(textSize, 'font-bold')}
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
        'relative transition-all duration-200 hover:border-primary/40 hover:shadow-md group overflow-hidden',
        template.is_default && 'ring-1 ring-primary/30',
        selected && 'ring-2 ring-primary bg-primary/5'
      )}>
        {/* Completeness Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted/30">
          <div 
            className={cn("h-full transition-all", completenessBarColor)}
            style={{ width: `${completeness.score}%` }}
          />
        </div>
        
        <div className="flex items-center gap-4 p-3 pt-4">
          {/* Selection Checkbox */}
          {selectable && (
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectChange?.(template.id, !!checked)}
              className="shrink-0"
            />
          )}
          
          {/* Logo mini */}
          <LogoDisplay size="small" />
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {template.is_default && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />}
              <span className="font-medium truncate">{template.name}</span>
              <OwnershipBadge />
              {/* Completeness Badge */}
              <Badge 
                variant="outline" 
                className={cn("text-[10px] px-1.5 py-0 shrink-0", getCompletenessColor(completeness.level))}
              >
                {completeness.score}%
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground truncate">{template.brand_name}</p>
              {template.primary_color && (
                <div 
                  className="w-3 h-3 rounded-full border border-border shrink-0"
                  style={{ backgroundColor: template.primary_color }}
                />
              )}
            </div>
            
            {/* Quick Stats Row */}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                <Users className="w-3 h-3" />
                {brandCounts?.personasCount || 0}
              </Badge>
              <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                <Package className="w-3 h-3" />
                {brandCounts?.productsCount || 0}
              </Badge>
              {channelOverridesInfo.count > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                  <Settings2 className="w-3 h-3" />
                  {channelOverridesInfo.count}
                </Badge>
              )}
            </div>
          </div>
          
          
          {/* Actions */}
          <div className="flex gap-1 shrink-0">
            {!template.is_default && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onSetDefault(template.id)}
                    >
                      <Check className="w-4 h-4" />
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onDuplicate(template.id)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Tạo bản sao</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              asChild
            >
              <Link to={`/brands/${template.id}`}>
                <Eye className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(template)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
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
                  <AlertDialogAction onClick={() => onDelete(template.id)}>
                    Xóa
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>
    );
  }

  // Grid View with Hover Preview
  return (
    <HoverCard openDelay={400} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Card 
          className={cn(
            'relative gradient-card border-border/50 transition-all duration-300 ease-out hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 group overflow-hidden',
            template.is_default && 'ring-2 ring-primary/50',
            selected && 'ring-2 ring-primary bg-primary/5'
          )}
          style={{
            background: template.primary_color 
              ? `linear-gradient(135deg, ${template.primary_color}08 0%, transparent 50%, ${template.secondary_colors?.[0] || template.primary_color}05 100%)`
              : undefined
          }}
        >
          {/* Completeness Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-muted/30">
            <div 
              className={cn("h-full transition-all duration-500", completenessBarColor)}
              style={{ width: `${completeness.score}%` }}
            />
          </div>
          
          {/* Selection Checkbox */}
          {selectable && (
            <div className="absolute top-5 left-3 z-10">
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelectChange?.(template.id, !!checked)}
              />
            </div>
          )}
          
          {/* Glow effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <CardHeader className={cn('pb-3 pt-4', selectable && 'pl-10')}>
            <div className="flex items-start justify-between gap-3">
              {/* Logo - larger */}
              <LogoDisplay />
              
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate flex items-center gap-2">
                  {template.is_default && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />}
                  {template.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1 truncate">{template.brand_name}</p>
                {template.industry && template.industry.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">{template.industry.join(', ')}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {/* Ownership Badge */}
                  <OwnershipBadge />
                  
                  {/* Primary Color indicator */}
                  {template.primary_color && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="w-4 h-4 rounded-full border border-border shrink-0"
                            style={{ backgroundColor: template.primary_color }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Màu chủ đạo: {template.primary_color}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formattedDate}
                  </span>
                </div>
              </div>
              
              {template.is_default && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  Mặc định
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Brand Guideline Section - Highlighted */}
            {template.brand_guideline?.trim() ? (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Scroll className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-primary">Nguyên tắc Brand</span>
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-2 cursor-help">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <span className="text-sm text-muted-foreground">{children}</span>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em>{children}</em>,
                          }}
                        >
                          {template.brand_guideline.slice(0, 150) + (template.brand_guideline.length > 150 ? '...' : '')}
                        </ReactMarkdown>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm max-h-64 overflow-auto">
                      <div className="prose prose-xs dark:prose-invert">
                        <ReactMarkdown
                          components={{
                            h2: ({ children }) => <h2 className="text-xs font-semibold mt-2 mb-1">{children}</h2>,
                            p: ({ children }) => <p className="text-xs mb-1">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-3 text-xs">{children}</ul>,
                            li: ({ children }) => <li className="text-xs">{children}</li>,
                          }}
                        >
                          {template.brand_guideline}
                        </ReactMarkdown>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-amber-500/50 bg-amber-500/10">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-600">Thiếu Nguyên tắc Brand</p>
                    <p className="text-xs text-amber-600/80 mt-0.5">
                      AI cần hướng dẫn để tạo nội dung đúng phong cách brand.
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs text-amber-600 hover:text-amber-700 mt-1"
                      onClick={() => onEdit(template)}
                    >
                      Thêm ngay →
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Brand Voice Summary */}
            {(template.tone_of_voice?.length || template.formality_level || template.brand_positioning) && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Volume2 className="w-3 h-3 text-muted-foreground shrink-0" />
                {template.brand_positioning && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {BRAND_POSITIONING_OPTIONS.find(o => o.value === template.brand_positioning)?.label || template.brand_positioning}
                  </Badge>
                )}
                {template.tone_of_voice?.slice(0, 2).map(tone => (
                  <Badge key={tone} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {TONE_OF_VOICE_OPTIONS.find(o => o.value === tone)?.label || tone}
                  </Badge>
                ))}
                {template.formality_level && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {FORMALITY_LEVEL_OPTIONS.find(o => o.value === template.formality_level)?.label || template.formality_level}
                  </Badge>
                )}
                {template.allow_emoji === false && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Ban className="w-3 h-3 text-destructive" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Không dùng emoji</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {template.allow_emoji !== false && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Smile className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Cho phép emoji</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
            
            {/* Quick Stats Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0.5">
                      <Users className="w-3 h-3" />
                      {brandCounts?.personasCount || 0} Personas
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Customer Personas</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0.5">
                      <Package className="w-3 h-3" />
                      {brandCounts?.productsCount || 0} Sản phẩm
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Sản phẩm/Dịch vụ</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {channelOverridesInfo.count > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5 border-primary/50">
                  <Settings2 className="w-3 h-3" />
                  {channelOverridesInfo.count} Kênh
                </Badge>
              )}
              {/* Completeness Badge */}
              <Badge 
                variant="outline" 
                className={cn("text-[10px] px-1.5 py-0.5 ml-auto", getCompletenessColor(completeness.level))}
              >
                {completeness.score}% hoàn thành
              </Badge>
            </div>
            
            {/* Brand Analytics - Usage Stats */}
            {usageStats && usageStats.multiChannelCount > 0 && (
              <Link 
                to={`/multichannel?brand=${template.id}`}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group/link"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{usageStats.multiChannelCount} nội dung sử dụng</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
              </Link>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              {!template.is_default && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => onSetDefault(template.id)}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Đặt mặc định
                </Button>
              )}
              {onDuplicate && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 transition-all duration-200 hover:scale-110 hover:bg-secondary/50"
                        onClick={() => onDuplicate(template.id)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Tạo bản sao</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 transition-all duration-200 hover:scale-110 hover:bg-secondary/50"
                asChild
              >
                <Link to={`/brands/${template.id}`}>
                  <Eye className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 transition-all duration-200 hover:scale-110 hover:bg-primary/10"
                onClick={() => onEdit(template)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive transition-all duration-200 hover:scale-110 hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
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
                    <AlertDialogAction onClick={() => onDelete(template.id)}>
                      Xóa
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </HoverCardTrigger>
      
      {/* Hover Preview */}
      <HoverCardContent side="right" align="start" className="w-80 p-0">
        <BrandVoicePreview 
          brandName={template.brand_name}
          positioning={template.brand_positioning || undefined}
          toneOfVoice={template.tone_of_voice || []}
          formalityLevel={template.formality_level || 'semi_formal'}
          languageStyle={template.language_style || []}
          allowEmoji={template.allow_emoji ?? true}
          preferredWords={template.preferred_words || []}
          forbiddenWords={template.forbidden_words || []}
        />
      </HoverCardContent>
    </HoverCard>
  );
}
