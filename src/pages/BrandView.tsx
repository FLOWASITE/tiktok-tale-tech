import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useBrandTemplates, BrandTemplate, BrandScope } from '@/hooks/useBrandTemplates';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { 
  BRAND_POSITIONING_OPTIONS, 
  TONE_OF_VOICE_OPTIONS, 
  FORMALITY_LEVEL_OPTIONS,
  LANGUAGE_STYLE_OPTIONS 
} from '@/components/BrandVoiceSection';
import { BrandForm } from '@/components/BrandForm';
import { ChannelOverride } from '@/components/ChannelSettingsEditor';
import { DEFAULT_CHANNEL_SETTINGS } from '@/types/channelSettings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  ArrowLeft, 
  Edit2, 
  Star, 
  Calendar, 
  User, 
  Building2, 
  Palette, 
  Volume2, 
  Smile, 
  Ban, 
  Check, 
  X, 
  Settings2,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  MapPin,
  Linkedin,
  Mail,
  Youtube,
  MessageCircle,
  Send,
  Loader2,
  Copy,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Hash,
  Type,
  Megaphone
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Channel } from '@/types/multichannel';
import { toast } from 'sonner';
import { isBrandTemplateChanged } from '@/utils/isBrandTemplateChanged';
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
import { ChannelSettings } from '@/types/channelSettings';

// Channel Override Detail Component
function ChannelOverrideDetail({ 
  channel, 
  override, 
  defaults 
}: { 
  channel: Channel; 
  override: ChannelOverride | undefined;
  defaults: ChannelSettings;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!override) return null;
  
  const lengthUnit = defaults.length_unit === 'chars' ? 'ký tự' : 'chữ';
  
  // Get override values with fallback to defaults
  const minLength = override.min_length ?? defaults.min_length ?? 0;
  const maxLength = override.max_length ?? defaults.max_length;
  const hookRequired = override.hook_required ?? defaults.hook_required;
  const ctaPolicy = override.cta_policy ?? defaults.cta_policy;
  const emojiAllowed = override.emoji_allowed ?? defaults.emoji_allowed;
  const emojiLimit = override.emoji_limit ?? defaults.emoji_limit ?? 0;
  const hashtagLimit = override.hashtag_limit ?? defaults.hashtag_limit;
  const linkPosition = override.link_position ?? defaults.link_position;
  
  // Build list of changed fields
  const changes: { label: string; value: string; icon: React.ReactNode }[] = [];
  
  if (override.min_length !== undefined || override.max_length !== undefined) {
    changes.push({
      label: 'Độ dài',
      value: `${minLength}-${maxLength} ${lengthUnit}`,
      icon: <Type className="w-3.5 h-3.5" />
    });
  }
  if (override.hook_required !== undefined) {
    changes.push({
      label: 'Hook',
      value: hookRequired ? 'Bắt buộc' : 'Không bắt buộc',
      icon: <Megaphone className="w-3.5 h-3.5" />
    });
  }
  if (override.cta_policy !== undefined) {
    changes.push({
      label: 'CTA',
      value: ctaPolicyLabels[ctaPolicy] || ctaPolicy,
      icon: <Megaphone className="w-3.5 h-3.5" />
    });
  }
  if (override.emoji_allowed !== undefined || override.emoji_limit !== undefined) {
    changes.push({
      label: 'Emoji',
      value: emojiAllowed ? `Cho phép (max ${emojiLimit})` : 'Không',
      icon: <Smile className="w-3.5 h-3.5" />
    });
  }
  if (override.hashtag_limit !== undefined) {
    changes.push({
      label: 'Hashtag',
      value: hashtagLimit > 0 ? `Tối đa ${hashtagLimit}` : 'Không',
      icon: <Hash className="w-3.5 h-3.5" />
    });
  }
  if (override.link_position !== undefined) {
    changes.push({
      label: 'Link',
      value: linkPositionLabels[linkPosition] || linkPosition,
      icon: <LinkIcon className="w-3.5 h-3.5" />
    });
  }
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border cursor-pointer transition-colors bg-muted/30"
        >
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{channelIcons[channel]}</span>
            <span className="font-medium text-sm">{channelLabels[channel]}</span>
            <Badge variant="secondary" className="text-xs">
              {changes.length} thay đổi
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {minLength}-{maxLength} {lengthUnit}
            </span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 border border-t-0 border-border/50 rounded-b-lg bg-muted/10 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {changes.map((change, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded-md bg-background border border-border/30">
                <span className="text-muted-foreground mt-0.5">{change.icon}</span>
                <div>
                  <p className="text-xs text-muted-foreground">{change.label}</p>
                  <p className="text-sm font-medium">{change.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

const channelIcons: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  google_maps: <MapPin className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  zalo_oa: <MessageCircle className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
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

const ctaPolicyLabels: Record<string, string> = {
  required: 'Bắt buộc',
  soft: 'Mềm (không bán)',
  optional: 'Tuỳ chọn',
  none: 'Không có',
};

const linkPositionLabels: Record<string, string> = {
  body: 'Trong bài',
  end: 'Cuối bài',
  allowed: 'Có thể',
  none: 'Không link',
};

// Type for form data without ownership fields
type BrandFormData = Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'organization_id'>;

export default function BrandView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationContext();
  const { 
    templates, 
    loading, 
    updateTemplate, 
    deleteTemplate, 
    setDefaultTemplate, 
    duplicateTemplate,
    uploadLogo,
    deleteLogo,
    refetch
  } = useBrandTemplates();
  const [refreshing, setRefreshing] = useState(false);
  const [template, setTemplate] = useState<BrandTemplate | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && id) {
      const found = templates.find(t => t.id === id);
      setTemplate(found || null);
    }
  }, [templates, loading, id]);

  const handleSubmit = async (
    data: BrandFormData,
    scope: BrandScope,
    logoFile?: File | null,
    shouldDeleteLogo?: boolean
  ) => {
    if (!template) return;
    
    setSaving(true);
    try {
      let logoUrl = data.logo_url;

      if (shouldDeleteLogo && template.logo_url) {
        await deleteLogo(template.logo_url);
        logoUrl = null;
      }

      if (logoFile) {
        if (template.logo_url) {
          await deleteLogo(template.logo_url);
        }
        logoUrl = await uploadLogo(logoFile);
      }

      const templateData = { ...data, logo_url: logoUrl };

      // Avoid "phantom saves" when user didn't change anything
      if (!logoFile && !shouldDeleteLogo && !isBrandTemplateChanged(template, templateData)) {
        setEditDialogOpen(false);
        return;
      }
      
      await updateTemplate(template.id, templateData);
      setEditDialogOpen(false);
      toast.success('Đã cập nhật brand template');
      // Auto refresh data after successful edit
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto py-12 text-center space-y-4">
        <Palette className="w-16 h-16 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">Không tìm thấy Brand</h2>
        <p className="text-muted-foreground">Brand template này không tồn tại hoặc đã bị xóa.</p>
        <Button asChild>
          <Link to="/brands">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại danh sách
          </Link>
        </Button>
      </div>
    );
  }

  const isOrganizationBrand = !!template.organization_id;
  const formattedDate = format(new Date(template.created_at), 'dd/MM/yyyy HH:mm', { locale: vi });
  const updatedDate = format(new Date(template.updated_at), 'dd/MM/yyyy HH:mm', { locale: vi });

  const channelOverrides = template.channel_overrides as Record<Channel, unknown> | null;
  const overrideChannels = channelOverrides ? Object.keys(channelOverrides) as Channel[] : [];

  const handleDelete = async () => {
    await deleteTemplate(template.id);
    toast.success('Đã xóa brand template');
    navigate('/brands');
  };

  const handleSetDefault = async () => {
    await setDefaultTemplate(template.id);
    toast.success('Đã đặt làm mặc định');
  };

  const handleDuplicate = async () => {
    await duplicateTemplate(template.id);
    toast.success('Đã tạo bản sao');
    navigate('/brands');
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/brands">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          
          {/* Logo */}
          {template.logo_url ? (
            <div className="w-16 h-16 rounded-xl border border-border overflow-hidden bg-muted shrink-0">
              <img
                src={template.logo_url}
                alt={`${template.brand_name} logo`}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div 
              className="w-16 h-16 rounded-xl border border-dashed border-border flex items-center justify-center shrink-0"
              style={{ backgroundColor: template.primary_color ? `${template.primary_color}20` : undefined }}
            >
              <span 
                className="text-2xl font-bold"
                style={{ color: template.primary_color || 'hsl(var(--muted-foreground))' }}
              >
                {template.brand_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              {template.is_default && <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
              <h1 className="text-2xl font-bold">{template.name}</h1>
            </div>
            <p className="text-muted-foreground">{template.brand_name}</p>
            <div className="flex items-center gap-2 mt-2">
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
              {template.is_default && (
                <Badge variant="default">Mặc định</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={async () => {
              setRefreshing(true);
              await refetch();
              setRefreshing(false);
              toast.success('Đã làm mới dữ liệu');
            }}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          {!template.is_default && (
            <Button variant="outline" size="sm" onClick={handleSetDefault}>
              <Check className="w-4 h-4 mr-1" />
              Đặt mặc định
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy className="w-4 h-4 mr-1" />
            Sao chép
          </Button>
          <Button size="sm" onClick={() => setEditDialogOpen(true)}>
            <Edit2 className="w-4 h-4 mr-1" />
            Chỉnh sửa
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
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
                <AlertDialogAction onClick={handleDelete}>Xóa</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              Thông tin cơ bản
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Tên Template</span>
              <p className="font-medium">{template.name || '-'}</p>
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Tên thương hiệu</span>
              <p className="font-medium">{template.brand_name}</p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Màu chủ đạo</span>
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-md border border-border"
                  style={{ backgroundColor: template.primary_color || '#000000' }}
                />
                <span className="text-sm font-mono">{template.primary_color || 'Chưa đặt'}</span>
              </div>
            </div>
            
            <div>
              <span className="text-sm text-muted-foreground">Ngành nghề</span>
              {template.industry && template.industry.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {template.industry.map(ind => (
                    <Badge key={ind} variant="secondary">{ind}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic mt-1">Chưa chọn ngành</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sử dụng logo</span>
              <Badge variant={template.include_logo ? 'default' : 'secondary'}>
                {template.include_logo ? 'Có' : 'Không'}
              </Badge>
            </div>

            <Separator />
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Tạo ngày
              </span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Cập nhật
              </span>
              <span>{updatedDate}</span>
            </div>
          </CardContent>
        </Card>

        {/* Brand Voice */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              Brand Voice Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Định vị thương hiệu</span>
              {template.brand_positioning ? (
                <div className="mt-1">
                  <Badge variant="outline">
                    {BRAND_POSITIONING_OPTIONS.find(o => o.value === template.brand_positioning)?.label || template.brand_positioning}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic mt-1">Chưa chọn</p>
              )}
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Tone of Voice</span>
              {template.tone_of_voice && template.tone_of_voice.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {template.tone_of_voice.map(tone => (
                    <Badge key={tone} variant="secondary">
                      {TONE_OF_VOICE_OPTIONS.find(o => o.value === tone)?.label || tone}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic mt-1">Chưa chọn</p>
              )}
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Mức độ trang trọng</span>
              {template.formality_level ? (
                <div className="mt-1">
                  <Badge variant="outline">
                    {FORMALITY_LEVEL_OPTIONS.find(o => o.value === template.formality_level)?.label || template.formality_level}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic mt-1">Chưa chọn</p>
              )}
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Phong cách ngôn ngữ</span>
              {template.language_style && template.language_style.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {template.language_style.map(style => (
                    <Badge key={style} variant="secondary">
                      {LANGUAGE_STYLE_OPTIONS.find(o => o.value === style)?.label || style}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic mt-1">Chưa chọn</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              {template.allow_emoji !== false ? (
                <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                  <Smile className="w-3 h-3" />
                  Cho phép emoji
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
                  <Ban className="w-3 h-3" />
                  Không emoji
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brand Guideline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brand Writing Guideline</CardTitle>
        </CardHeader>
        <CardContent>
          {template.brand_guideline ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{template.brand_guideline}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Chưa có guideline</p>
          )}
        </CardContent>
      </Card>

      {/* Keywords - Always show both sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-600">
              <Check className="w-4 h-4" />
              Từ nên dùng
            </CardTitle>
          </CardHeader>
          <CardContent>
            {template.preferred_words && template.preferred_words.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {template.preferred_words.map(word => (
                  <Badge key={word} variant="outline" className="border-green-300 text-green-700 bg-green-50">
                    {word}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Chưa có từ khóa</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <X className="w-4 h-4" />
              Từ cấm dùng
            </CardTitle>
          </CardHeader>
          <CardContent>
            {template.forbidden_words && template.forbidden_words.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {template.forbidden_words.map(word => (
                  <Badge key={word} variant="outline" className="border-destructive/30 text-destructive bg-destructive/5">
                    {word}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Chưa có từ cấm</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Channel Overrides */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            Channel Settings Override
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overrideChannels.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Các kênh sau có cấu hình riêng thay vì mặc định:
              </p>
              <div className="space-y-2">
                {overrideChannels.map(channel => {
                  const override = channelOverrides?.[channel] as ChannelOverride | undefined;
                  const defaults = DEFAULT_CHANNEL_SETTINGS[channel];
                  
                  return (
                    <ChannelOverrideDetail
                      key={channel}
                      channel={channel}
                      override={override}
                      defaults={defaults}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground italic">
                Chưa có cấu hình riêng cho kênh nào. Tất cả kênh sử dụng cài đặt mặc định.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setEditDialogOpen(true)}
                className="gap-1.5"
              >
                <Settings2 className="w-4 h-4" />
                Cấu hình channel settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {template.compliance_rules && template.compliance_rules.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 text-sm">
              {template.compliance_rules.map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">Chưa có quy tắc tuân thủ</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Chỉnh sửa Brand Template
            </DialogTitle>
          </DialogHeader>
          <BrandForm
            template={template}
            onSubmit={handleSubmit}
            onCancel={() => setEditDialogOpen(false)}
            isLoading={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
