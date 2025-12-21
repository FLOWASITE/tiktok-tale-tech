import { useMemo } from 'react';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { 
  BRAND_POSITIONING_OPTIONS, 
  TONE_OF_VOICE_OPTIONS, 
  FORMALITY_LEVEL_OPTIONS 
} from '@/components/BrandVoiceSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Star, Check, Calendar, Volume2, Smile, Ban, Copy, Settings2, Globe, Facebook, Instagram, Twitter, MapPin, Linkedin, Mail, Youtube, MessageCircle, Send } from 'lucide-react';
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
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Channel } from '@/types/multichannel';

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
  onEdit: (template: BrandTemplate) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

export function BrandCard({ template, onEdit, onDelete, onSetDefault, onDuplicate }: BrandCardProps) {
  const formattedDate = format(new Date(template.created_at), 'dd/MM/yyyy', { locale: vi });
  
  // Calculate channel overrides
  const channelOverridesInfo = useMemo(() => {
    if (!template.channel_overrides) return { count: 0, channels: [] as Channel[] };
    const channels = Object.keys(template.channel_overrides) as Channel[];
    return { count: channels.length, channels };
  }, [template.channel_overrides]);

  return (
    <Card className={`relative gradient-card border-border/50 transition-all duration-300 ease-out hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 group overflow-hidden ${template.is_default ? 'ring-2 ring-primary/50' : ''}`}>
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Logo - larger */}
          {template.logo_url ? (
            <div className="w-14 h-14 rounded-lg border border-border overflow-hidden bg-muted shrink-0">
              <img
                src={template.logo_url}
                alt={`${template.brand_name} logo`}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div 
              className="w-14 h-14 rounded-lg border border-dashed border-border flex items-center justify-center shrink-0"
              style={{ backgroundColor: template.primary_color ? `${template.primary_color}20` : undefined }}
            >
              <span 
                className="text-xl font-bold"
                style={{ color: template.primary_color || 'hsl(var(--muted-foreground))' }}
              >
                {template.brand_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate flex items-center gap-2">
              {template.is_default && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />}
              {template.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 truncate">{template.brand_name}</p>
            {template.industry && template.industry.length > 0 && (
              <p className="text-xs text-muted-foreground truncate">{template.industry.join(', ')}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
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
  );
}
