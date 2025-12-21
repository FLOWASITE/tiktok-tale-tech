import { useState, useEffect, useRef } from 'react';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DEFAULT_BRAND_GUIDELINE } from '@/types/carousel';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface BrandFormProps {
  template?: BrandTemplate | null;
  onSubmit: (data: Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at'>, logoFile?: File | null, deleteLogo?: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function BrandForm({ template, onSubmit, onCancel, isLoading }: BrandFormProps) {
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandGuideline, setBrandGuideline] = useState('');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [deleteLogo, setDeleteLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setBrandName(template.brand_name);
      setBrandGuideline(template.brand_guideline);
      setIncludeLogo(template.include_logo);
      setIsDefault(template.is_default);
      setLogoPreview(template.logo_url);
      setLogoFile(null);
      setDeleteLogo(false);
    } else {
      setName('');
      setBrandName('');
      setBrandGuideline(DEFAULT_BRAND_GUIDELINE);
      setIncludeLogo(true);
      setIsDefault(false);
      setLogoPreview(null);
      setLogoFile(null);
      setDeleteLogo(false);
    }
  }, [template]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setDeleteLogo(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
        brand_guideline: brandGuideline.trim(),
        include_logo: includeLogo,
        is_default: isDefault,
        logo_url: deleteLogo ? null : template?.logo_url || null,
      },
      logoFile,
      deleteLogo
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      {/* Logo upload */}
      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-start gap-4">
          {logoPreview ? (
            <div className="relative w-20 h-20 rounded-lg border border-border overflow-hidden bg-muted">
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
            <div className="w-20 h-20 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/50">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
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
              {logoPreview ? 'Thay đổi' : 'Upload Logo'}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG, SVG. Tối đa 2MB
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="brandGuideline">Brand Guideline</Label>
        <Textarea
          id="brandGuideline"
          value={brandGuideline}
          onChange={(e) => setBrandGuideline(e.target.value)}
          placeholder="Mô tả phong cách, màu sắc, tone of voice..."
          rows={6}
        />
      </div>

      <div className="flex items-center gap-4">
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

      <div className="flex justify-end gap-2 pt-4">
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
