import { useState, useEffect } from 'react';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DEFAULT_BRAND_GUIDELINE } from '@/types/carousel';

interface BrandFormProps {
  template?: BrandTemplate | null;
  onSubmit: (data: Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function BrandForm({ template, onSubmit, onCancel, isLoading }: BrandFormProps) {
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandGuideline, setBrandGuideline] = useState('');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setBrandName(template.brand_name);
      setBrandGuideline(template.brand_guideline);
      setIncludeLogo(template.include_logo);
      setIsDefault(template.is_default);
    } else {
      setName('');
      setBrandName('');
      setBrandGuideline(DEFAULT_BRAND_GUIDELINE);
      setIncludeLogo(true);
      setIsDefault(false);
    }
  }, [template]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      brand_name: brandName.trim(),
      brand_guideline: brandGuideline.trim(),
      include_logo: includeLogo,
      is_default: isDefault,
    });
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
            Bao gồm Logo
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
