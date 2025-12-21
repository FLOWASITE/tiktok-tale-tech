import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BrandTemplate, BrandScope } from '@/hooks/useBrandTemplates';
import { 
  BRAND_POSITIONING_OPTIONS, 
  TONE_OF_VOICE_OPTIONS, 
  FORMALITY_LEVEL_OPTIONS 
} from '@/components/BrandVoiceSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit2, Trash2, Star, Check, Calendar, Volume2, Smile, Ban, Copy, Settings2, Globe, Facebook, Instagram, Twitter, MapPin, Linkedin, Mail, Youtube, MessageCircle, Send, User, Building2, Eye } from 'lucide-react';
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
}: BrandCardProps) {
  const formattedDate = format(new Date(template.created_at), 'dd/MM/yyyy', { locale: vi });
  
  // Determine ownership
  const isOrganizationBrand = !!template.organization_id;
  
  // Calculate channel overrides
  const channelOverridesInfo = useMemo(() => {
    if (!template.channel_overrides) return { count: 0, channels: [] as Channel[] };
    const channels = Object.keys(template.channel_overrides) as Channel[];
    return { count: channels.length, channels };
  }, [template.channel_overrides]);

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
        'relative transition-all duration-200 hover:border-primary/40 hover:shadow-md group',
        template.is_default && 'ring-1 ring-primary/30',
        selected && 'ring-2 ring-primary bg-primary/5'
      )}>
        <div className="flex items-center gap-4 p-3">
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
          </div>
          
          {/* Voice Tags - hidden on small screens */}
          <div className="hidden md:flex gap-1">
            {template.tone_of_voice?.slice(0, 2).map(tone => (
              <Badge key={tone} variant="secondary" className="text-[10px] px-1.5 py-0">
                {TONE_OF_VOICE_OPTIONS.find(o => o.value === tone)?.label || tone}
              </Badge>
            ))}
            {template.tone_of_voice && template.tone_of_voice.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{template.tone_of_voice.length - 2}
              </Badge>
            )}
          </div>
          
          {/* Channel Overrides indicator */}
          {channelOverridesInfo.count > 0 && (
            <Badge variant="outline" className="hidden sm:flex text-[10px] gap-1 border-primary/50">
              <Settings2 className="w-3 h-3" />
              {channelOverridesInfo.count}
            </Badge>
          )}
          
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
        <Card className={cn(
          'relative gradient-card border-border/50 transition-all duration-300 ease-out hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 group overflow-hidden',
          template.is_default && 'ring-2 ring-primary/50',
          selected && 'ring-2 ring-primary bg-primary/5'
        )}>
          {/* Selection Checkbox */}
          {selectable && (
            <div className="absolute top-3 left-3 z-10">
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelectChange?.(template.id, !!checked)}
              />
            </div>
          )}
          
          {/* Glow effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <CardHeader className={cn('pb-3', selectable && 'pl-10')}>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground line-clamp-2 cursor-help">
                    {template.brand_guideline}
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="text-xs whitespace-pre-wrap">{template.brand_guideline}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

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
            
            {/* Channel Overrides Badge */}
            {channelOverridesInfo.count > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer text-xs border-primary/50 hover:bg-primary/10 transition-colors"
                  >
                    <Settings2 className="w-3 h-3 mr-1" />
                    {channelOverridesInfo.count} kênh tuỳ chỉnh
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Channel Settings Override</p>
                    <p className="text-xs text-muted-foreground">
                      Các kênh sau có cấu hình riêng thay vì mặc định:
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {channelOverridesInfo.channels.map((channel) => (
                        <Badge 
                          key={channel} 
                          variant="secondary" 
                          className="text-xs gap-1"
                        >
                          {channelIcons[channel]}
                          {channelLabels[channel]}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                      Nhấn "Sửa" để xem chi tiết các tuỳ chỉnh
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <div className="flex items-center gap-2">
              <Badge variant={template.include_logo ? 'default' : 'outline'} className="text-xs">
                Logo: {template.include_logo ? 'Có' : 'Không'}
              </Badge>
            </div>

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
