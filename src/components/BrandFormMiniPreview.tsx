import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Palette, 
  MessageSquare, 
  Hash, 
  Sparkles,
  Globe,
  User,
  Users,
  Image as ImageIcon,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { BrandScope } from '@/hooks/useBrandTemplates';
import { ChannelOverrides } from '@/components/ChannelSettingsEditor';

interface BrandFormMiniPreviewProps {
  brandName: string;
  scope: BrandScope;
  industries: string[];
  primaryColor: string;
  logoPreview: string | null;
  brandPositioning: string;
  toneOfVoice: string[];
  formalityLevel: string;
  languageStyle: string[];
  allowEmoji: boolean;
  preferredWords: string[];
  forbiddenWords: string[];
  channelOverrides: ChannelOverrides;
  completionPercentage: number;
}

const formalityLabels: Record<string, string> = {
  'very_formal': 'Rất trang trọng',
  'formal': 'Trang trọng',
  'neutral': 'Trung tính',
  'casual': 'Thân thiện',
  'very_casual': 'Rất thân thiện',
};

const toneLabels: Record<string, string> = {
  'professional': 'Chuyên nghiệp',
  'friendly': 'Thân thiện',
  'authoritative': 'Uy tín',
  'playful': 'Vui vẻ',
  'inspiring': 'Truyền cảm hứng',
  'educational': 'Giáo dục',
  'empathetic': 'Đồng cảm',
  'innovative': 'Đổi mới',
};

export function BrandFormMiniPreview({
  brandName,
  scope,
  industries,
  primaryColor,
  logoPreview,
  brandPositioning,
  toneOfVoice,
  formalityLevel,
  languageStyle,
  allowEmoji,
  preferredWords,
  forbiddenWords,
  channelOverrides,
  completionPercentage,
}: BrandFormMiniPreviewProps) {
  // Defensive guards: ensure array props are always arrays
  const safeToneOfVoice = Array.isArray(toneOfVoice) ? toneOfVoice : [];
  const safeIndustries = Array.isArray(industries) ? industries : [];
  const safeLanguageStyle = Array.isArray(languageStyle) ? languageStyle : [];
  const safePreferredWords = Array.isArray(preferredWords) ? preferredWords : [];
  const safeForbiddenWords = Array.isArray(forbiddenWords) ? forbiddenWords : [];

  const channelCount = useMemo(() => Object.keys(channelOverrides || {}).length, [channelOverrides]);
  
  const completionItems = useMemo(() => [
    { label: 'Tên thương hiệu', done: !!brandName.trim() },
    { label: 'Ngành', done: safeIndustries.length > 0 },
    { label: 'Màu chủ đạo', done: primaryColor !== '#000000' },
    { label: 'Định vị', done: !!brandPositioning },
    { label: 'Tone of Voice', done: safeToneOfVoice.length > 0 },
    { label: 'Phong cách', done: formalityLevel !== '' },
  ], [brandName, safeIndustries, primaryColor, brandPositioning, safeToneOfVoice, formalityLevel]);

  const doneCount = completionItems.filter(i => i.done).length;

  return (
    <Card className="p-4 space-y-4 bg-muted/30 border-dashed sticky top-20">
      {/* Header with brand identity */}
      <div className="flex items-start gap-3">
        {/* Logo/Color preview */}
        <div 
          className="w-12 h-12 rounded-lg border-2 flex items-center justify-center shrink-0 overflow-hidden"
          style={{ 
            borderColor: primaryColor !== '#000000' ? primaryColor : 'hsl(var(--border))',
            backgroundColor: logoPreview ? 'transparent' : `${primaryColor}15`
          }}
        >
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
          ) : brandName ? (
            <span 
              className="text-lg font-bold"
              style={{ color: primaryColor !== '#000000' ? primaryColor : 'hsl(var(--foreground))' }}
            >
              {brandName.charAt(0).toUpperCase()}
            </span>
          ) : (
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">
            {brandName || <span className="text-muted-foreground italic">Chưa đặt tên</span>}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs gap-1 py-0">
              {scope === 'both' ? (
                <>
                  <Users className="w-3 h-3" />
                  Cả hai
                </>
              ) : scope === 'organization' ? (
                <>
                  <Building2 className="w-3 h-3" />
                  Tổ chức
                </>
              ) : (
                <>
                  <User className="w-3 h-3" />
                  Cá nhân
                </>
              )}
            </Badge>
            {safeIndustries.length > 0 && (
              <Badge variant="secondary" className="text-xs truncate max-w-[100px]">
                {safeIndustries[0]}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Color */}
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: primaryColor }}
          />
          <span className="text-muted-foreground truncate">
            {primaryColor !== '#000000' ? primaryColor.toUpperCase() : 'Chưa chọn'}
          </span>
        </div>

        {/* Emoji */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            {allowEmoji ? 'Dùng emoji' : 'Không emoji'}
          </span>
        </div>

        {/* Tone */}
        {safeToneOfVoice.length > 0 && (
          <div className="flex items-center gap-2 col-span-2">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground truncate">
              {safeToneOfVoice.slice(0, 2).map(t => toneLabels[t] || t).join(', ')}
              {safeToneOfVoice.length > 2 && ` +${safeToneOfVoice.length - 2}`}
            </span>
          </div>
        )}

        {/* Formality */}
        {formalityLevel && (
          <div className="flex items-center gap-2 col-span-2">
            <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">
              {formalityLabels[formalityLevel] || formalityLevel}
            </span>
          </div>
        )}

        {/* Channels */}
        {channelCount > 0 && (
          <div className="flex items-center gap-2 col-span-2">
            <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">
              {channelCount} kênh tuỳ chỉnh
            </span>
          </div>
        )}
      </div>

      {/* Brand positioning preview */}
      {brandPositioning && (
        <>
          <Separator />
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Định vị</span>
            <p className="text-xs line-clamp-2">{brandPositioning}</p>
          </div>
        </>
      )}

      {/* Word badges */}
      {(safePreferredWords.length > 0 || safeForbiddenWords.length > 0) && (
        <>
          <Separator />
          <div className="space-y-2">
            {safePreferredWords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {safePreferredWords.slice(0, 3).map((word, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-200">
                    {word}
                  </Badge>
                ))}
                {safePreferredWords.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{safePreferredWords.length - 3}
                  </Badge>
                )}
              </div>
            )}
            {safeForbiddenWords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {safeForbiddenWords.slice(0, 3).map((word, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20 line-through">
                    {word}
                  </Badge>
                ))}
                {safeForbiddenWords.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{safeForbiddenWords.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <Separator />

      {/* Completion checklist */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Hoàn thành</span>
          <span className="text-xs font-semibold">{doneCount}/{completionItems.length}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {completionItems.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              {item.done ? (
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
              ) : (
                <Circle className="w-3 h-3 text-muted-foreground/50 shrink-0" />
              )}
              <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
