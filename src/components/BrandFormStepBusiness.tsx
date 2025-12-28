import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductCatalogEditor } from '@/components/brand/ProductCatalogEditor';
import { CustomerPersonaEditor } from '@/components/brand/CustomerPersonaEditor';
import { BrandColorPicker } from '@/components/BrandColorPicker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Building2, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  Clock,
  MessageSquare,
  ChevronDown,
  Facebook,
  Instagram,
  Youtube,
  Sparkles,
  Info,
  Palette,
  Upload,
  ImageIcon,
  Trash2,
  Star,
  Users,
  Wand2,
  Eye,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomerPersona } from '@/types/customerPersona';

// Footer info type
export interface BrandFooterInfo {
  company_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  social_links: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    zalo?: string;
  };
  tagline: string;
  business_hours: string;
  additional_info: string;
  enabled_for_content: boolean;
  display_fields: string[];
}

export const DEFAULT_FOOTER_INFO: BrandFooterInfo = {
  company_name: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  social_links: {},
  tagline: '',
  business_hours: '',
  additional_info: '',
  enabled_for_content: false,
  display_fields: ['phone', 'website'],
};

const DISPLAY_FIELD_OPTIONS = [
  { id: 'company_name', label: 'Tên công ty', icon: Building2 },
  { id: 'phone', label: 'Số điện thoại', icon: Phone },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'address', label: 'Địa chỉ', icon: MapPin },
  { id: 'social_links', label: 'Mạng xã hội', icon: MessageSquare },
  { id: 'business_hours', label: 'Giờ làm việc', icon: Clock },
  { id: 'tagline', label: 'Slogan', icon: Sparkles },
];

// Footer Templates
const FOOTER_TEMPLATES = [
  { 
    id: 'minimal', 
    label: 'Tối giản', 
    description: 'Chỉ hiển thị thông tin cơ bản',
    fields: ['phone', 'website'] 
  },
  { 
    id: 'full_contact', 
    label: 'Liên hệ đầy đủ', 
    description: 'Hiển thị tất cả thông tin liên hệ',
    fields: ['company_name', 'phone', 'email', 'website', 'address'] 
  },
  { 
    id: 'social_first', 
    label: 'Mạng xã hội', 
    description: 'Ưu tiên các kênh social',
    fields: ['social_links', 'website', 'phone'] 
  },
  { 
    id: 'professional', 
    label: 'Chuyên nghiệp', 
    description: 'Phù hợp cho B2B',
    fields: ['company_name', 'tagline', 'phone', 'email', 'website', 'business_hours'] 
  },
];

// Validation helpers
const isValidEmail = (email: string): boolean => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidVNPhone = (phone: string): boolean => {
  if (!phone) return true;
  const cleaned = phone.replace(/[\s.-]/g, '');
  // Valid VN phone: 0xxxxxxxxx (10 digits) or +84xxxxxxxxx (9-10 digits after +84)
  return /^(0[0-9]{9}|\+84[0-9]{9,10})$/.test(cleaned);
};

const formatWebsiteUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

interface BrandFormStepBusinessProps {
  brandTemplateId?: string | null;
  brandName?: string;
  brandPositioning?: string;
  footerInfo: BrandFooterInfo;
  onFooterInfoChange: (info: BrandFooterInfo) => void;
  // Customer Personas
  personas: CustomerPersona[];
  onPersonasChange: (personas: CustomerPersona[]) => void;
  // Visual props
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  logoPreview: string | null;
  setLogoPreview: (url: string | null) => void;
  logoFile: File | null;
  setLogoFile: (file: File | null) => void;
  deleteLogo: boolean;
  setDeleteLogo: (value: boolean) => void;
  existingLogoUrl?: string | null;
  includeLogo: boolean;
  setIncludeLogo: (value: boolean) => void;
  isDefault: boolean;
  setIsDefault: (value: boolean) => void;
}

export function BrandFormStepBusiness({
  brandTemplateId,
  brandName,
  brandPositioning,
  footerInfo,
  onFooterInfoChange,
  personas,
  onPersonasChange,
  primaryColor,
  setPrimaryColor,
  logoPreview,
  setLogoPreview,
  logoFile,
  setLogoFile,
  deleteLogo,
  setDeleteLogo,
  existingLogoUrl,
  includeLogo,
  setIncludeLogo,
  isDefault,
  setIsDefault,
}: BrandFormStepBusinessProps) {
  // When editing, open sections that have data; when creating, only Visual is open
  const hasVisualData = !!logoPreview || primaryColor !== '#000000';
  const hasPersonasData = personas.length > 0;
  const hasFooterData = !!(footerInfo.company_name || footerInfo.phone || footerInfo.email || footerInfo.website);
  
  const [isVisualOpen, setIsVisualOpen] = useState(true);
  const [isProductsOpen, setIsProductsOpen] = useState(!!brandTemplateId);
  const [isPersonasOpen, setIsPersonasOpen] = useState(hasPersonasData);
  const [isFooterOpen, setIsFooterOpen] = useState(hasFooterData);

  // Completion calculations
  const visualCompletion = (() => {
    let score = 0;
    if (primaryColor && primaryColor !== '#000000') score += 50;
    if (logoPreview) score += 50;
    return score;
  })();

  const personasCompletion = personas.length > 0 ? 100 : 0;

  const footerCompletion = (() => {
    let filled = 0;
    const fields = ['company_name', 'phone', 'email', 'website'] as const;
    fields.forEach(f => {
      if (footerInfo[f]) filled++;
    });
    return Math.round((filled / fields.length) * 100);
  })();

  // Auto-fill company_name from brandName if empty
  const handleUseBrandName = () => {
    if (brandName) {
      onFooterInfoChange({
        ...footerInfo,
        company_name: brandName,
      });
    }
  };

  const updateFooterField = <K extends keyof BrandFooterInfo>(
    field: K,
    value: BrandFooterInfo[K]
  ) => {
    onFooterInfoChange({
      ...footerInfo,
      [field]: value,
    });
  };

  const updateSocialLink = (platform: string, value: string) => {
    onFooterInfoChange({
      ...footerInfo,
      social_links: {
        ...footerInfo.social_links,
        [platform]: value,
      },
    });
  };

  const toggleDisplayField = (fieldId: string) => {
    const newFields = footerInfo.display_fields.includes(fieldId)
      ? footerInfo.display_fields.filter(f => f !== fieldId)
      : [...footerInfo.display_fields, fieldId];
    
    updateFooterField('display_fields', newFields);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setDeleteLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (existingLogoUrl) {
      setDeleteLogo(true);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Doanh nghiệp & Hình ảnh</h2>
          <p className="text-sm text-muted-foreground">
            Thông tin doanh nghiệp, màu sắc và logo thương hiệu
          </p>
        </div>
      </div>

      {/* Visual Section */}
      <Collapsible open={isVisualOpen} onOpenChange={setIsVisualOpen}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Palette className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <CardTitle className="text-base">Nhận diện thương hiệu</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Màu sắc chủ đạo và logo
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {visualCompletion === 100 ? (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0.5 bg-green-500/90">
                      <Check className="w-3 h-3 mr-0.5" /> Hoàn tất
                    </Badge>
                  ) : visualCompletion > 0 ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      {visualCompletion}%
                    </Badge>
                  ) : null}
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    isVisualOpen && "rotate-180"
                  )} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4 space-y-4">
              {/* Color Picker */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Palette className="w-3.5 h-3.5" />
                  Màu chủ đạo
                </Label>
                <BrandColorPicker
                  value={primaryColor}
                  onChange={setPrimaryColor}
                />
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Logo thương hiệu
                </Label>
                <div className="flex items-start gap-4">
                  {logoPreview ? (
                    <div className="relative group">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-20 h-20 object-contain rounded-lg border bg-muted/30"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleRemoveLogo}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                      <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoChange}
                      />
                    </label>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Hiển thị logo trong nội dung</Label>
                      <Switch
                        checked={includeLogo}
                        onCheckedChange={setIncludeLogo}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500" />
                        Đặt làm mặc định
                      </Label>
                      <Switch
                        checked={isDefault}
                        onCheckedChange={setIsDefault}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Products Section */}
      <Collapsible open={isProductsOpen} onOpenChange={setIsProductsOpen}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <CardTitle className="text-base">Sản phẩm & Dịch vụ</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Danh sách sản phẩm, dịch vụ chính của thương hiệu
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!brandTemplateId && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                      Sau khi lưu
                    </Badge>
                  )}
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    isProductsOpen && "rotate-180"
                  )} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4">
              {brandTemplateId ? (
                <ProductCatalogEditor brandTemplateId={brandTemplateId} />
              ) : (
                <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg border border-dashed">
                  <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Bạn có thể thêm sản phẩm sau khi tạo Brand Template.
                  </p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Customer Personas Section */}
      <Collapsible open={isPersonasOpen} onOpenChange={setIsPersonasOpen}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <CardTitle className="text-base">Khách hàng mục tiêu</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Customer Personas giúp AI tạo nội dung phù hợp
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {personasCompletion === 100 ? (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0.5 bg-green-500/90">
                      <Check className="w-3 h-3 mr-0.5" /> {personas.length} persona
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                      Tùy chọn
                    </Badge>
                  )}
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    isPersonasOpen && "rotate-180"
                  )} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4">
              <CustomerPersonaEditor
                personas={personas}
                onPersonasChange={onPersonasChange}
                brandPositioning={brandPositioning}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Footer Info Section */}
      <Collapsible open={isFooterOpen} onOpenChange={setIsFooterOpen}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <CardTitle className="text-base">Thông tin footer</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Thông tin liên hệ có thể đưa vào cuối bài viết
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {footerCompletion === 100 ? (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0.5 bg-green-500/90">
                      <Check className="w-3 h-3 mr-0.5" /> Hoàn tất
                    </Badge>
                  ) : footerCompletion > 0 ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      {footerCompletion}%
                    </Badge>
                  ) : null}
                  {footerInfo.enabled_for_content && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0.5">
                      Đang bật
                    </Badge>
                  )}
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    isFooterOpen && "rotate-180"
                  )} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4 space-y-4">
              {/* Enable for content toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Đưa vào nội dung AI</p>
                    <p className="text-xs text-muted-foreground">
                      AI sẽ tự động thêm thông tin này vào footer bài viết
                    </p>
                  </div>
                </div>
                <Switch
                  checked={footerInfo.enabled_for_content}
                  onCheckedChange={(checked) => updateFooterField('enabled_for_content', checked)}
                />
              </div>

              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="flex items-center gap-1.5 text-sm">
                    <Building2 className="w-3.5 h-3.5" />
                    Tên công ty / Pháp nhân
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="company_name"
                      placeholder="Công ty TNHH ABC..."
                      value={footerInfo.company_name}
                      onChange={(e) => updateFooterField('company_name', e.target.value)}
                      className="flex-1"
                    />
                    {brandName && !footerInfo.company_name && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 h-10 w-10"
                        onClick={handleUseBrandName}
                        title="Sử dụng tên thương hiệu"
                      >
                        <Wand2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline" className="flex items-center gap-1.5 text-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    Slogan / Tagline
                  </Label>
                  <Input
                    id="tagline"
                    placeholder="Khẩu hiệu thương hiệu..."
                    value={footerInfo.tagline}
                    onChange={(e) => updateFooterField('tagline', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-1.5 text-sm">
                  <MapPin className="w-3.5 h-3.5" />
                  Địa chỉ
                </Label>
                <Input
                  id="address"
                  placeholder="Số nhà, đường, quận, thành phố..."
                  value={footerInfo.address}
                  onChange={(e) => updateFooterField('address', e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1.5 text-sm">
                    <Phone className="w-3.5 h-3.5" />
                    Số điện thoại
                  </Label>
                  <Input
                    id="phone"
                    placeholder="0123 456 789"
                    value={footerInfo.phone}
                    onChange={(e) => updateFooterField('phone', e.target.value)}
                    className={cn(
                      footerInfo.phone && !isValidVNPhone(footerInfo.phone) && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {footerInfo.phone && !isValidVNPhone(footerInfo.phone) && (
                    <p className="text-[11px] text-destructive">Số điện thoại không hợp lệ</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1.5 text-sm">
                    <Mail className="w-3.5 h-3.5" />
                    Email liên hệ
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@company.com"
                    value={footerInfo.email}
                    onChange={(e) => updateFooterField('email', e.target.value)}
                    className={cn(
                      footerInfo.email && !isValidEmail(footerInfo.email) && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {footerInfo.email && !isValidEmail(footerInfo.email) && (
                    <p className="text-[11px] text-destructive">Email không hợp lệ</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-1.5 text-sm">
                    <Globe className="w-3.5 h-3.5" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    placeholder="www.company.com"
                    value={footerInfo.website}
                    onChange={(e) => updateFooterField('website', e.target.value)}
                    onBlur={(e) => {
                      const formatted = formatWebsiteUrl(e.target.value);
                      if (formatted !== footerInfo.website) {
                        updateFooterField('website', formatted);
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_hours" className="flex items-center gap-1.5 text-sm">
                    <Clock className="w-3.5 h-3.5" />
                    Giờ làm việc
                  </Label>
                  <Input
                    id="business_hours"
                    placeholder="T2-T6: 8:00 - 17:00"
                    value={footerInfo.business_hours}
                    onChange={(e) => updateFooterField('business_hours', e.target.value)}
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5 text-sm">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Mạng xã hội
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-blue-600 shrink-0" />
                    <Input
                      placeholder="Facebook URL"
                      value={footerInfo.social_links.facebook || ''}
                      onChange={(e) => updateSocialLink('facebook', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-600 shrink-0" />
                    <Input
                      placeholder="Instagram URL"
                      value={footerInfo.social_links.instagram || ''}
                      onChange={(e) => updateSocialLink('instagram', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-600 shrink-0" />
                    <Input
                      placeholder="YouTube URL"
                      value={footerInfo.social_links.youtube || ''}
                      onChange={(e) => updateSocialLink('youtube', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center rounded shrink-0">Z</span>
                    <Input
                      placeholder="Zalo URL / Số điện thoại"
                      value={footerInfo.social_links.zalo || ''}
                      onChange={(e) => updateSocialLink('zalo', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-2">
                <Label htmlFor="additional_info" className="flex items-center gap-1.5 text-sm">
                  <Info className="w-3.5 h-3.5" />
                  Thông tin bổ sung
                </Label>
                <Textarea
                  id="additional_info"
                  placeholder="Mã số thuế, giấy phép kinh doanh, các chứng nhận..."
                  value={footerInfo.additional_info}
                  onChange={(e) => updateFooterField('additional_info', e.target.value)}
                  rows={2}
                />
              </div>

              {/* Display Fields Selection */}
              {footerInfo.enabled_for_content && (
                <div className="space-y-4 pt-3 border-t">
                  {/* Footer Templates */}
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Template nhanh
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {FOOTER_TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => updateFooterField('display_fields', template.fields)}
                          className={cn(
                            "p-2 rounded-lg border text-left transition-all hover:border-primary/50",
                            JSON.stringify(footerInfo.display_fields.sort()) === JSON.stringify(template.fields.sort())
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          )}
                        >
                          <p className="text-xs font-medium">{template.label}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{template.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Field Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm">Tùy chỉnh thông tin hiển thị</Label>
                    <div className="flex flex-wrap gap-2">
                      {DISPLAY_FIELD_OPTIONS.map((field) => {
                        const isSelected = footerInfo.display_fields.includes(field.id);
                        const Icon = field.icon;
                        return (
                          <button
                            key={field.id}
                            type="button"
                            onClick={() => toggleDisplayField(field.id)}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                              isSelected
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              className="w-3.5 h-3.5 pointer-events-none"
                            />
                            <Icon className="w-3 h-3" />
                            {field.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer Preview - always show if there are display fields selected */}
                  {footerInfo.display_fields.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        Xem trước footer
                      </Label>
                      <div className="p-3 bg-muted/30 rounded-lg border border-dashed text-xs space-y-1.5">
                        {footerInfo.display_fields.includes('tagline') && footerInfo.tagline && (
                          <p className="italic text-muted-foreground">{footerInfo.tagline}</p>
                        )}
                        {footerInfo.display_fields.includes('company_name') && footerInfo.company_name && (
                          <p className="font-medium">{footerInfo.company_name}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                          {footerInfo.display_fields.includes('phone') && footerInfo.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {footerInfo.phone}
                            </span>
                          )}
                          {footerInfo.display_fields.includes('email') && footerInfo.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {footerInfo.email}
                            </span>
                          )}
                          {footerInfo.display_fields.includes('website') && footerInfo.website && (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" /> {footerInfo.website}
                            </span>
                          )}
                        </div>
                        {footerInfo.display_fields.includes('address') && footerInfo.address && (
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3 shrink-0" /> {footerInfo.address}
                          </p>
                        )}
                        {footerInfo.display_fields.includes('business_hours') && footerInfo.business_hours && (
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3 shrink-0" /> {footerInfo.business_hours}
                          </p>
                        )}
                        {footerInfo.display_fields.includes('social_links') && Object.values(footerInfo.social_links).some(v => v) && (
                          <div className="flex items-center gap-2 pt-1">
                            {footerInfo.social_links.facebook && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                            {footerInfo.social_links.instagram && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                            {footerInfo.social_links.youtube && <Youtube className="w-3.5 h-3.5 text-red-600" />}
                            {footerInfo.social_links.zalo && (
                              <span className="w-3.5 h-3.5 bg-blue-500 text-white text-[8px] font-bold flex items-center justify-center rounded">Z</span>
                            )}
                          </div>
                        )}
                        {!footerInfo.display_fields.some(f => {
                          if (f === 'company_name') return !!footerInfo.company_name;
                          if (f === 'phone') return !!footerInfo.phone;
                          if (f === 'email') return !!footerInfo.email;
                          if (f === 'website') return !!footerInfo.website;
                          if (f === 'address') return !!footerInfo.address;
                          if (f === 'tagline') return !!footerInfo.tagline;
                          if (f === 'business_hours') return !!footerInfo.business_hours;
                          if (f === 'social_links') return Object.values(footerInfo.social_links).some(v => v);
                          return false;
                        }) && (
                          <p className="text-muted-foreground italic">Chưa có thông tin để hiển thị. Vui lòng điền các trường ở trên.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
