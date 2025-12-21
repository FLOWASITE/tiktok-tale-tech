import { useState, useEffect, useRef, useCallback } from 'react';
import { BrandTemplate, BrandScope } from '@/hooks/useBrandTemplates';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BrandColorPicker } from '@/components/BrandColorPicker';
import { BrandVoiceSection } from '@/components/BrandVoiceSection';
import { BrandVoicePreview } from '@/components/BrandVoicePreview';
import { AIBrandVoiceGenerator } from '@/components/AIBrandVoiceGenerator';
import { ChannelSettingsEditor, ChannelOverrides } from '@/components/ChannelSettingsEditor';
import { DEFAULT_BRAND_GUIDELINE } from '@/types/carousel';
import { Upload, X, Image as ImageIcon, ChevronsUpDown, Check, User, Building2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

const SUGGESTED_INDUSTRIES = [
  'Tài chính & Kế toán',
  'Bất động sản',
  'F&B (Nhà hàng, Quán cà phê)',
  'Công nghệ thông tin',
  'Giáo dục & Đào tạo',
  'Y tế & Sức khỏe',
  'Du lịch & Khách sạn',
  'Thương mại điện tử',
  'Marketing & Truyền thông',
  'Luật & Pháp lý',
  'Xây dựng & Nội thất',
  'Thời trang & Làm đẹp',
  'Bán lẻ',
  'Sản xuất & Công nghiệp',
  'Nông nghiệp',
  'Logistics & Vận tải',
  'Bảo hiểm',
  'Tư vấn & Dịch vụ chuyên nghiệp',
];

// Type for form data without ownership fields
type BrandFormData = Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'organization_id'>;

interface BrandFormProps {
  template?: BrandTemplate | null;
  onSubmit: (data: BrandFormData, scope: BrandScope, logoFile?: File | null, deleteLogo?: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function BrandForm({ template, onSubmit, onCancel, isLoading }: BrandFormProps) {
  const { currentOrganization } = useOrganizationContext();
  
  // Scope selection
  const [scope, setScope] = useState<BrandScope>('personal');
  
  // Basic info
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [brandGuideline, setBrandGuideline] = useState('');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [deleteLogo, setDeleteLogo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Brand Voice Profile
  const [brandPositioning, setBrandPositioning] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState<string[]>([]);
  const [formalityLevel, setFormalityLevel] = useState('');
  const [languageStyle, setLanguageStyle] = useState<string[]>([]);
  const [preferredWords, setPreferredWords] = useState<string[]>([]);
  const [forbiddenWords, setForbiddenWords] = useState<string[]>([]);
  const [allowEmoji, setAllowEmoji] = useState(true);
  const [complianceRules, setComplianceRules] = useState<string[]>([]);

  // Channel Settings Overrides
  const [channelOverrides, setChannelOverrides] = useState<ChannelOverrides>({});

  useEffect(() => {
    if (template) {
      setName(template.name);
      setBrandName(template.brand_name);
      setIndustries(template.industry || []);
      setBrandGuideline(template.brand_guideline);
      setIncludeLogo(template.include_logo);
      setIsDefault(template.is_default);
      setPrimaryColor(template.primary_color || '#000000');
      setLogoPreview(template.logo_url);
      setLogoFile(null);
      setDeleteLogo(false);
      // Set scope based on existing template
      setScope(template.organization_id ? 'organization' : 'personal');
      // Brand Voice
      setBrandPositioning(template.brand_positioning || '');
      setToneOfVoice(template.tone_of_voice || []);
      setFormalityLevel(template.formality_level || '');
      setLanguageStyle(template.language_style || []);
      setPreferredWords(template.preferred_words || []);
      setForbiddenWords(template.forbidden_words || []);
      setAllowEmoji(template.allow_emoji ?? true);
      setComplianceRules(template.compliance_rules || []);
      setChannelOverrides(template.channel_overrides || {});
    } else {
      setName('');
      setBrandName('');
      setIndustries([]);
      setBrandGuideline(DEFAULT_BRAND_GUIDELINE);
      setIncludeLogo(true);
      setIsDefault(false);
      setPrimaryColor('#000000');
      setLogoPreview(null);
      setLogoFile(null);
      setDeleteLogo(false);
      setScope('personal');
      // Brand Voice defaults
      setBrandPositioning('');
      setToneOfVoice([]);
      setFormalityLevel('');
      setLanguageStyle([]);
      setPreferredWords([]);
      setForbiddenWords([]);
      setAllowEmoji(true);
      setComplianceRules([]);
      setChannelOverrides({});
    }
  }, [template]);

  const toggleIndustry = (item: string) => {
    setIndustries(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item) 
        : [...prev, item]
    );
  };

  const addCustomIndustry = () => {
    const trimmed = searchValue.trim();
    if (trimmed && !industries.includes(trimmed)) {
      setIndustries(prev => [...prev, trimmed]);
      setSearchValue('');
    }
  };

  const removeIndustry = (item: string) => {
    setIndustries(prev => prev.filter(i => i !== item));
  };

  const handleFileSelect = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      setLogoFile(file);
      setDeleteLogo(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setDeleteLogo(!!template?.logo_url);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(
      {
        name: name.trim(),
        brand_name: brandName.trim(),
        industry: industries.length > 0 ? industries : null,
        brand_guideline: brandGuideline.trim(),
        include_logo: includeLogo,
        is_default: isDefault,
        primary_color: primaryColor,
        logo_url: deleteLogo ? null : template?.logo_url || null,
        // Brand Voice Profile
        brand_positioning: brandPositioning || null,
        tone_of_voice: toneOfVoice.length > 0 ? toneOfVoice : null,
        formality_level: formalityLevel || null,
        language_style: languageStyle.length > 0 ? languageStyle : null,
        preferred_words: preferredWords.length > 0 ? preferredWords : null,
        forbidden_words: forbiddenWords.length > 0 ? forbiddenWords : null,
        allow_emoji: allowEmoji,
        compliance_rules: complianceRules.length > 0 ? complianceRules : null,
        channel_overrides: Object.keys(channelOverrides).length > 0 ? channelOverrides : null,
      },
      scope,
      logoFile,
      deleteLogo
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Scope Selection */}
      <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
        <Label className="text-sm font-medium">Phạm vi sử dụng</Label>
        <RadioGroup 
          value={scope} 
          onValueChange={(v) => setScope(v as BrandScope)}
          className="flex flex-col gap-2"
          disabled={!!template} // Can't change scope when editing
        >
          <div className="flex items-center space-x-3 p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="personal" id="personal" />
            <Label htmlFor="personal" className="flex-1 cursor-pointer flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Cá nhân</p>
                <p className="text-xs text-muted-foreground">Chỉ bạn có thể sử dụng template này</p>
              </div>
            </Label>
          </div>
          {currentOrganization && (
            <div className="flex items-center space-x-3 p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="organization" id="organization" />
              <Label htmlFor="organization" className="flex-1 cursor-pointer flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{currentOrganization.name}</p>
                  <p className="text-xs text-muted-foreground">Tất cả thành viên trong tổ chức có thể sử dụng</p>
                </div>
              </Label>
            </div>
          )}
        </RadioGroup>
        {template && (
          <p className="text-xs text-muted-foreground italic">
            * Không thể thay đổi phạm vi khi chỉnh sửa template
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Left Column - Basic Info */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên Template *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Template công ty ABC"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandName">Tên Brand *</Label>
            <Input
              id="brandName"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="VD: Thuế Hộ by TAF.vn"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Ngành nghề</Label>
            {industries.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {industries.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-primary/10 text-primary border border-primary/20"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeIndustry(item)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    'w-full justify-between font-normal',
                    industries.length === 0 && 'text-muted-foreground'
                  )}
                >
                  {industries.length === 0 
                    ? 'Chọn ngành nghề...' 
                    : `${industries.length} ngành đã chọn`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0 z-50 bg-popover" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Tìm hoặc nhập ngành..." 
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <CommandList>
                    {searchValue.trim() && !SUGGESTED_INDUSTRIES.some(i => 
                      i.toLowerCase() === searchValue.trim().toLowerCase()
                    ) && (
                      <CommandItem
                        onSelect={addCustomIndustry}
                        className="text-primary"
                      >
                        <Check className="mr-2 h-4 w-4 opacity-0" />
                        Thêm "{searchValue.trim()}"
                      </CommandItem>
                    )}
                    <CommandGroup heading="Gợi ý">
                      {SUGGESTED_INDUSTRIES.filter(item => 
                        item.toLowerCase().includes(searchValue.toLowerCase())
                      ).map((item) => (
                        <CommandItem
                          key={item}
                          value={item}
                          onSelect={() => toggleIndustry(item)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              industries.includes(item) ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {item}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <BrandColorPicker value={primaryColor} onChange={setPrimaryColor} />

          {/* Logo upload */}
          <div className="space-y-2">
            <Label>Logo</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative w-16 h-16 rounded-lg border border-border overflow-hidden bg-muted shrink-0">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-1 -right-1 p-1 rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/50 shrink-0">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {logoPreview ? 'Thay đổi' : 'Upload'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Kéo thả hoặc click để upload
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Brand Voice Preview & Guideline */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brandGuideline">Brand Guideline</Label>
            <Textarea
              id="brandGuideline"
              value={brandGuideline}
              onChange={(e) => setBrandGuideline(e.target.value)}
              placeholder="Mô tả phong cách, màu sắc, tone of voice..."
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeLogo"
                checked={includeLogo}
                onCheckedChange={(checked) => setIncludeLogo(checked === true)}
              />
              <Label htmlFor="includeLogo" className="text-sm cursor-pointer">
                Bao gồm Logo trong carousel
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              <Label htmlFor="isDefault" className="text-sm cursor-pointer">
                Đặt làm mặc định
              </Label>
            </div>
          </div>

          {/* Brand Voice Preview */}
          <BrandVoicePreview
            brandName={brandName}
            positioning={brandPositioning}
            toneOfVoice={toneOfVoice}
            formalityLevel={formalityLevel}
            languageStyle={languageStyle}
            allowEmoji={allowEmoji}
            preferredWords={preferredWords}
            forbiddenWords={forbiddenWords}
          />
        </div>
      </div>

      {/* Brand Voice Profile Section - Full Width */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Brand Voice Profile</Label>
          <AIBrandVoiceGenerator
            currentIndustry={industries}
            onApply={(suggestions) => {
              if (suggestions.brand_positioning) setBrandPositioning(suggestions.brand_positioning);
              if (suggestions.tone_of_voice) setToneOfVoice(suggestions.tone_of_voice);
              if (suggestions.formality_level) setFormalityLevel(suggestions.formality_level);
              if (suggestions.language_style) setLanguageStyle(suggestions.language_style);
              if (suggestions.preferred_words) setPreferredWords(suggestions.preferred_words);
              if (suggestions.forbidden_words) setForbiddenWords(suggestions.forbidden_words);
              if (suggestions.allow_emoji !== undefined) setAllowEmoji(suggestions.allow_emoji);
            }}
          />
        </div>
        <BrandVoiceSection
          brandPositioning={brandPositioning}
          onBrandPositioningChange={setBrandPositioning}
          toneOfVoice={toneOfVoice}
          onToneOfVoiceChange={setToneOfVoice}
          formalityLevel={formalityLevel}
          onFormalityLevelChange={setFormalityLevel}
          languageStyle={languageStyle}
          onLanguageStyleChange={setLanguageStyle}
          preferredWords={preferredWords}
          onPreferredWordsChange={setPreferredWords}
          forbiddenWords={forbiddenWords}
          onForbiddenWordsChange={setForbiddenWords}
          allowEmoji={allowEmoji}
          onAllowEmojiChange={setAllowEmoji}
          complianceRules={complianceRules}
          onComplianceRulesChange={setComplianceRules}
        />
      </div>

      {/* Channel Settings Override Section */}
      <ChannelSettingsEditor
        value={channelOverrides}
        onChange={setChannelOverrides}
      />

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Hủy
        </Button>
        <Button type="submit" disabled={isLoading || !name.trim() || !brandName.trim()}>
          {isLoading ? 'Đang lưu...' : template ? 'Cập nhật' : 'Tạo mới'}
        </Button>
      </div>
    </form>
  );
}
