import { useMemo } from 'react';
import { Palette, User, Building2, Users, Package, Sparkles, CheckCircle2, Circle, Hash, AtSign, MessageSquare, Target, Megaphone, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrandScope } from '@/hooks/useBrandTemplates';
import { ChannelOverrides } from '@/components/ChannelSettingsEditor';
import { CustomerPersona } from '@/types/customerPersona';
import { cn } from '@/lib/utils';

interface BrandCreatePreviewPanelProps {
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
  personas: CustomerPersona[];
  localProducts: Array<{ id: string; name: string }>;
  currentStep: number;
  totalSteps: number;
}

const formalityLabels: Record<string, string> = {
  'very-formal': 'Rất trang trọng',
  'formal': 'Trang trọng',
  'neutral': 'Trung lập',
  'casual': 'Thân mật',
  'very-casual': 'Rất thân mật',
};

const toneLabels: Record<string, string> = {
  'professional': 'Chuyên nghiệp',
  'friendly': 'Thân thiện',
  'authoritative': 'Uy quyền',
  'playful': 'Vui tươi',
  'inspirational': 'Truyền cảm hứng',
  'educational': 'Giáo dục',
  'empathetic': 'Đồng cảm',
  'bold': 'Táo bạo',
  'luxury': 'Sang trọng',
  'minimalist': 'Tối giản',
};

const stepInfo: Record<number, { title: string; description: string; icon: React.ElementType }> = {
  1: { title: 'Nhận dạng', description: 'Thiết lập thông tin cơ bản về thương hiệu', icon: Palette },
  2: { title: 'Khách hàng', description: 'Định nghĩa đối tượng mục tiêu', icon: Users },
  3: { title: 'Sản phẩm', description: 'Thêm sản phẩm và dịch vụ', icon: Package },
  4: { title: 'Giọng nói', description: 'Thiết lập Brand Voice & DNA', icon: MessageSquare },
  5: { title: 'Kênh', description: 'Cấu hình nội dung theo kênh', icon: Megaphone },
  6: { title: 'Hoàn tất', description: 'Xem lại và lưu Brand', icon: CheckCircle2 },
};

export function BrandCreatePreviewPanel({
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
  personas,
  localProducts,
  currentStep,
  totalSteps,
}: BrandCreatePreviewPanelProps) {
  const channelCount = useMemo(() => 
    Object.keys(channelOverrides).length,
    [channelOverrides]
  );

  const getCompletenessColor = () => {
    if (completionPercentage >= 100) return 'text-emerald-500';
    if (completionPercentage >= 70) return 'text-blue-500';
    if (completionPercentage >= 40) return 'text-amber-500';
    return 'text-destructive';
  };

  const getProgressColor = () => {
    if (completionPercentage >= 100) return 'bg-emerald-500';
    if (completionPercentage >= 70) return 'bg-blue-500';
    if (completionPercentage >= 40) return 'bg-amber-500';
    return 'bg-destructive';
  };

  const currentStepInfo = stepInfo[currentStep] || stepInfo[1];
  const StepIcon = currentStepInfo.icon;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6">
        {/* Current Step Indicator */}
        <Card className="glass-card overflow-hidden">
          <div className="relative">
            <div 
              className="absolute inset-0 opacity-10"
              style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, transparent 60%)` }}
            />
            <CardContent className="relative p-5">
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="p-2.5 rounded-xl"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <StepIcon className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Bước {currentStep}/{totalSteps}
                  </p>
                  <p className="font-semibold text-foreground">{currentStepInfo.title}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{currentStepInfo.description}</p>
            </CardContent>
          </div>
        </Card>

        {/* Brand Identity Preview */}
        <Card className="glass-card overflow-hidden">
          <div className="relative">
            <div 
              className="absolute inset-0 opacity-10"
              style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, transparent 60%)` }}
            />
            <CardHeader className="relative pb-3">
              <div className="flex items-center gap-3">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-12 h-12 rounded-lg object-cover ring-2 ring-border/50"
                  />
                ) : (
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {brandName ? brandName.charAt(0).toUpperCase() : 'B'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">
                    {brandName || 'Tên thương hiệu'}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {scope === 'personal' ? (
                        <>
                          <User className="w-3 h-3 mr-1" />
                          Cá nhân
                        </>
                      ) : scope === 'organization' ? (
                        <>
                          <Building2 className="w-3 h-3 mr-1" />
                          Tổ chức
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" />
                          Cả hai
                        </>
                      )}
                    </Badge>
                    {industries.length > 0 && (
                      <Badge variant="outline" className="text-xs truncate max-w-[120px]">
                        {industries[0]}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative pt-0">
              {/* Completion Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Hoàn thiện</span>
                  <span className={cn("font-semibold", getCompletenessColor())}>
                    {completionPercentage}%
                  </span>
                </div>
                <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", getProgressColor())}
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold text-foreground">{personas.length}</p>
                  <p className="text-[10px] text-muted-foreground">Personas</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold text-foreground">{localProducts.length}</p>
                  <p className="text-[10px] text-muted-foreground">Sản phẩm</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold text-foreground">{channelCount}</p>
                  <p className="text-[10px] text-muted-foreground">Kênh</p>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Brand Voice Summary */}
        {(toneOfVoice.length > 0 || formalityLevel || brandPositioning) && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Brand Voice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {brandPositioning && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Định vị</p>
                  <p className="text-sm line-clamp-2">{brandPositioning}</p>
                </div>
              )}

              {formalityLevel && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Phong cách</p>
                  <Badge variant="secondary" className="text-xs">
                    {formalityLabels[formalityLevel] || formalityLevel}
                  </Badge>
                </div>
              )}

              {toneOfVoice.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Tone of Voice</p>
                  <div className="flex flex-wrap gap-1">
                    {toneOfVoice.slice(0, 4).map((tone) => (
                      <Badge key={tone} variant="outline" className="text-xs">
                        {toneLabels[tone] || tone}
                      </Badge>
                    ))}
                    {toneOfVoice.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{toneOfVoice.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Emoji indicator */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Emoji:</span>
                <Badge variant={allowEmoji ? 'default' : 'secondary'} className="text-xs">
                  {allowEmoji ? '✓ Cho phép' : '✗ Không dùng'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Words Summary */}
        {(preferredWords.length > 0 || forbiddenWords.length > 0) && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" />
                Từ ngữ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {preferredWords.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Ưu tiên sử dụng
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {preferredWords.slice(0, 5).map((word, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                        {word}
                      </Badge>
                    ))}
                    {preferredWords.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{preferredWords.length - 5}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {forbiddenWords.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Circle className="w-3 h-3 text-destructive" />
                    Không sử dụng
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {forbiddenWords.slice(0, 5).map((word, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                        {word}
                      </Badge>
                    ))}
                    {forbiddenWords.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{forbiddenWords.length - 5}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Personas Preview */}
        {personas.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Customer Personas ({personas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {personas.slice(0, 3).map((persona, i) => (
                  <div 
                    key={persona.id || i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
                  >
                    <span className="text-lg">{persona.avatar_emoji || '👤'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{persona.name}</p>
                      {persona.age_range && (
                        <p className="text-xs text-muted-foreground">{persona.age_range}</p>
                      )}
                    </div>
                    {persona.is_primary && (
                      <Badge variant="secondary" className="text-[10px]">Primary</Badge>
                    )}
                  </div>
                ))}
                {personas.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{personas.length - 3} personas khác
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products Preview */}
        {localProducts.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Sản phẩm ({localProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {localProducts.slice(0, 3).map((product, i) => (
                  <div 
                    key={product.id || i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
                  >
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm truncate">{product.name}</p>
                  </div>
                ))}
                {localProducts.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{localProducts.length - 3} sản phẩm khác
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Checklist */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: 'Tên thương hiệu', done: !!brandName },
                { label: 'Industry/Ngành hàng', done: industries.length > 0 },
                { label: 'Brand Positioning', done: !!brandPositioning },
                { label: 'Tone of Voice', done: toneOfVoice.length > 0 },
                { label: 'Customer Personas', done: personas.length > 0 },
                { label: 'Sản phẩm', done: localProducts.length > 0 },
                { label: 'Channel Settings', done: channelCount > 0 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/50" />
                  )}
                  <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
