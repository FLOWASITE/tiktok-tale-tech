import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { BrandScope } from '@/hooks/useBrandTemplates';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { BrandColorPicker } from '@/components/BrandColorPicker';
import { BrandFooterInfo } from '@/components/BrandForm';
import { User, Building2, ShieldCheck, ChevronDown, Upload, Trash2, Phone, Mail, Globe, MapPin, Building, ImageIcon, Target, Lightbulb, Quote, Eye, Briefcase, Palette } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface BrandFormStepIdentityProps {
  brandName: string;
  setBrandName: (value: string) => void;
  scope: BrandScope;
  setScope: (value: BrandScope) => void;
  selectedIndustryName?: string | null; // Industry selected from Quick Start
  setName: (value: string) => void;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  isEditing?: boolean;
  // Logo props
  logoPreview: string | null;
  logoFile: File | null;
  setLogoFile: (file: File | null) => void;
  setLogoPreview: (url: string | null) => void;
  deleteLogo: boolean;
  setDeleteLogo: (value: boolean) => void;
  // Visual props
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  includeLogo: boolean;
  setIncludeLogo: (value: boolean) => void;
  // Footer props
  footerInfo: BrandFooterInfo;
  setFooterInfo: (info: BrandFooterInfo) => void;
  // Strategy props
  mission: string;
  setMission: (value: string) => void;
  vision: string;
  setVision: (value: string) => void;
  uniqueValueProposition: string;
  setUniqueValueProposition: (value: string) => void;
  tagline: string;
  setTagline: (value: string) => void;
  headline: string;
  setHeadline: (value: string) => void;
  subHeadline: string;
  setSubHeadline: (value: string) => void;
  // Focus props
  focusFooterInfo?: boolean;
}

export function BrandFormStepIdentity({
  brandName,
  setBrandName,
  scope,
  setScope,
  selectedIndustryName,
  setName,
  errors,
  setErrors,
  isEditing = false,
  // Logo props
  logoPreview,
  logoFile,
  setLogoFile,
  setLogoPreview,
  deleteLogo,
  setDeleteLogo,
  // Visual props
  primaryColor,
  setPrimaryColor,
  includeLogo,
  setIncludeLogo,
  // Footer props
  footerInfo,
  setFooterInfo,
  // Strategy props
  mission,
  setMission,
  vision,
  setVision,
  uniqueValueProposition,
  setUniqueValueProposition,
  tagline,
  setTagline,
  headline,
  setHeadline,
  subHeadline,
  setSubHeadline,
  // Focus props
  focusFooterInfo = false,
}: BrandFormStepIdentityProps) {
  const { currentOrganization } = useOrganizationContext();
  const [showStrategy, setShowStrategy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const footerInfoRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to footer info when focusFooterInfo is true
  useEffect(() => {
    if (focusFooterInfo && footerInfoRef.current) {
      setTimeout(() => {
        footerInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [focusFooterInfo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setDeleteLogo(false);
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setDeleteLogo(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateFooterField = (field: keyof BrandFooterInfo, value: string) => {
    setFooterInfo({ ...footerInfo, [field]: value });
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Brand Name - Primary focus */}
      <div className="space-y-2">
        <Label htmlFor="brandName" className="text-sm font-medium">
          Tên Thương hiệu <span className="text-destructive">*</span>
        </Label>
        <Input
          id="brandName"
          value={brandName}
          onChange={(e) => {
            const value = e.target.value;
            setBrandName(value);
            if (!isEditing) {
              setName(value);
            }
            if (errors.brandName) {
              setErrors({ ...errors, brandName: '' });
            }
          }}
          placeholder="VD: Thuế Hộ by TAF.vn"
          className={cn(
            "h-11 text-base",
            errors.brandName && 'border-destructive focus-visible:ring-destructive'
          )}
          autoFocus
        />
        {errors.brandName && (
          <p className="text-xs text-destructive">{errors.brandName}</p>
        )}
      </div>

      {/* Scope Selection with Checkboxes */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Phạm vi sử dụng</Label>
        <div className="space-y-3 p-3 rounded-lg bg-muted/30 border">
          {/* Personal Checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="scope-personal"
              checked={scope === 'personal' || scope === 'both'}
              onCheckedChange={(checked) => {
                if (isEditing) return;
                const isOrgChecked = scope === 'organization' || scope === 'both';
                if (checked && isOrgChecked) setScope('both');
                else if (checked) setScope('personal');
                else if (isOrgChecked) setScope('organization');
                else setScope('personal'); // Default if unchecking both
              }}
              disabled={isEditing}
            />
            <div className="grid gap-0.5">
              <label
                htmlFor="scope-personal"
                className="flex items-center gap-2 text-sm font-medium cursor-pointer"
              >
                <User className="w-4 h-4 text-muted-foreground" />
                Cá nhân
              </label>
              <p className="text-xs text-muted-foreground">
                Chỉ bạn có thể xem và sử dụng Brand này
              </p>
            </div>
          </div>

          {/* Organization Checkbox */}
          {currentOrganization && (
            <div className="flex items-start gap-3">
              <Checkbox
                id="scope-organization"
                checked={scope === 'organization' || scope === 'both'}
                onCheckedChange={(checked) => {
                  if (isEditing) return;
                  const isPersonalChecked = scope === 'personal' || scope === 'both';
                  if (checked && isPersonalChecked) setScope('both');
                  else if (checked) setScope('organization');
                  else if (isPersonalChecked) setScope('personal');
                  else setScope('personal'); // Default if unchecking both
                }}
                disabled={isEditing}
              />
              <div className="grid gap-0.5">
                <label
                  htmlFor="scope-organization"
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  {currentOrganization.name}
                </label>
                <p className="text-xs text-muted-foreground">
                  Tất cả thành viên trong tổ chức đều có thể xem và sử dụng
                </p>
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          💡 Có thể chọn một hoặc cả hai phạm vi
        </p>
      </div>

      {/* Industry Display - Read-only (selected from Quick Start) */}
      {selectedIndustryName && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Ngành nghề (Industry Memory)</Label>
          
          <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{selectedIndustryName}</span>
                <Badge variant="secondary" className="text-[10px] h-4 shrink-0">
                  <ShieldCheck className="w-3 h-3 mr-0.5" />
                  Industry Park v2
                </Badge>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            💡 Đã áp dụng Brand Voice & quy tắc tuân thủ từ Industry Park
          </p>
        </div>
      )}

      <Separator />

      {/* Visual Identity Section */}
      <div className="space-y-4">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Nhận diện Thương hiệu
        </Label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/20">
          {/* Logo Upload */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Logo</Label>
            <div className="flex flex-col items-center gap-3">
              {logoPreview && !deleteLogo ? (
                <div className="relative group">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-24 h-24 object-contain rounded-lg border bg-background"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleRemoveLogo}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Tải lên</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Color & Options */}
          <div className="space-y-4">
            <BrandColorPicker
              value={primaryColor}
              onChange={setPrimaryColor}
            />
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="includeLogo"
                checked={includeLogo}
                onCheckedChange={(checked) => setIncludeLogo(!!checked)}
              />
              <label
                htmlFor="includeLogo"
                className="text-sm cursor-pointer flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                Hiển thị logo trong content
              </label>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Footer Info Section (Always visible) */}
      <div ref={footerInfoRef} className="space-y-3">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium">Thông tin liên hệ</h2>
        </div>
        
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-base">💡</span>
          <p className="text-xs text-foreground/80">
            Tự động thêm vào cuối bài viết (Facebook, Threads, Email...) giúp khách hàng liên hệ nhanh hơn!
          </p>
        </div>

        {/* Visual Contact Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Company Name Card */}
          <div className="group relative p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/20 text-blue-600 dark:text-blue-400 shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Tên công ty
                </Label>
                <Input
                  value={footerInfo.company_name || ''}
                  onChange={(e) => updateFooterField('company_name', e.target.value)}
                  placeholder="Công ty TNHH ABC"
                  className="h-9 border-0 bg-transparent p-0 text-sm font-medium placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </div>

          {/* Phone Card */}
          <div className="group relative p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/20 text-green-600 dark:text-green-400 shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Hotline
                </Label>
                <Input
                  value={footerInfo.phone || ''}
                  onChange={(e) => updateFooterField('phone', e.target.value)}
                  placeholder="0901 234 567"
                  className="h-9 border-0 bg-transparent p-0 text-sm font-medium placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </div>

          {/* Email Card */}
          <div className="group relative p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/20 text-amber-600 dark:text-amber-400 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Email
                </Label>
                <Input
                  value={footerInfo.email || ''}
                  onChange={(e) => updateFooterField('email', e.target.value)}
                  placeholder="contact@company.vn"
                  className="h-9 border-0 bg-transparent p-0 text-sm font-medium placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </div>

          {/* Website Card */}
          <div className="group relative p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/20 text-purple-600 dark:text-purple-400 shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Website
                </Label>
                <Input
                  value={footerInfo.website || ''}
                  onChange={(e) => updateFooterField('website', e.target.value)}
                  placeholder="https://company.vn"
                  className="h-9 border-0 bg-transparent p-0 text-sm font-medium placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </div>

          {/* Address Card - Full width */}
          <div className="sm:col-span-2 group relative p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-rose-500/10 to-rose-600/20 text-rose-600 dark:text-rose-400 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Địa chỉ
                </Label>
                <Input
                  value={footerInfo.address || ''}
                  onChange={(e) => updateFooterField('address', e.target.value)}
                  placeholder="123 Nguyễn Văn A, Quận 1, TP. Hồ Chí Minh"
                  className="h-9 border-0 bg-transparent p-0 text-sm font-medium placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Section (Collapsible) */}
      <Collapsible open={showStrategy} onOpenChange={setShowStrategy}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between h-10 px-3"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Target className="w-4 h-4" />
              Chiến lược Thương hiệu (tuỳ chọn)
            </span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              showStrategy && "rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="space-y-3 p-4 rounded-lg border bg-muted/20">
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Sứ mệnh (Mission)
                </Label>
                <Input
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  placeholder="VD: Giúp doanh nghiệp nhỏ quản lý tài chính hiệu quả"
                  className="h-9"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Tầm nhìn (Vision)
                </Label>
                <Input
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  placeholder="VD: Trở thành nền tảng kế toán số 1 Việt Nam"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Giá trị cốt lõi (UVP)
                </Label>
                <Input
                  value={uniqueValueProposition}
                  onChange={(e) => setUniqueValueProposition(e.target.value)}
                  placeholder="VD: Tiết kiệm 80% thời gian với tự động hóa thông minh"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Quote className="w-3.5 h-3.5" />
                  Slogan / Tagline
                </Label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="VD: Kế toán đơn giản, kinh doanh thăng hoa"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Headline
                </Label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="VD: Giải pháp kế toán #1 cho doanh nghiệp SME"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Sub-headline
                </Label>
                <Input
                  value={subHeadline}
                  onChange={(e) => setSubHeadline(e.target.value)}
                  placeholder="VD: Tiết kiệm 80% thời gian xử lý hóa đơn"
                  className="h-9"
                />
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground pt-2 border-t">
              💡 Thông tin chiến lược giúp AI tạo nội dung nhất quán với định hướng thương hiệu
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
