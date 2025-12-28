import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ProductCatalogEditor } from '@/components/brand/ProductCatalogEditor';
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
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface BrandFormStepBusinessProps {
  brandTemplateId?: string | null;
  footerInfo: BrandFooterInfo;
  onFooterInfoChange: (info: BrandFooterInfo) => void;
}

export function BrandFormStepBusiness({
  brandTemplateId,
  footerInfo,
  onFooterInfoChange,
}: BrandFormStepBusinessProps) {
  const [isFooterOpen, setIsFooterOpen] = useState(true);
  const [isProductsOpen, setIsProductsOpen] = useState(true);

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

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Thông tin doanh nghiệp</h2>
          <p className="text-sm text-muted-foreground">
            Sản phẩm, dịch vụ và thông tin liên hệ cho nội dung
          </p>
        </div>
      </div>

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
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  isProductsOpen && "rotate-180"
                )} />
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
                  {footerInfo.enabled_for_content && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
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
                  <Input
                    id="company_name"
                    placeholder="Công ty TNHH ABC..."
                    value={footerInfo.company_name}
                    onChange={(e) => updateFooterField('company_name', e.target.value)}
                  />
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
                  />
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
                  />
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
                    placeholder="https://www.company.com"
                    value={footerInfo.website}
                    onChange={(e) => updateFooterField('website', e.target.value)}
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
                <div className="space-y-3 pt-2 border-t">
                  <Label className="text-sm">Thông tin hiển thị trong nội dung</Label>
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
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
