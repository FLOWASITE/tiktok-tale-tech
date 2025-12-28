import { useRef, useCallback, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { BrandColorPicker } from '@/components/BrandColorPicker';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface BrandFormStepVisualProps {
  primaryColor: string;
  setPrimaryColor: (value: string) => void;
  logoPreview: string | null;
  setLogoPreview: (value: string | null) => void;
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

export function BrandFormStepVisual({
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
}: BrandFormStepVisualProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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
  }, [setLogoFile, setDeleteLogo, setLogoPreview]);

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
    setDeleteLogo(!!existingLogoUrl);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column - Logo Upload */}
        <div className="space-y-5">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Logo thương hiệu</Label>
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
                  <div className="relative w-16 h-16 rounded-lg border overflow-hidden bg-muted shrink-0">
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
                  <div className="w-16 h-16 rounded-lg border border-dashed flex items-center justify-center bg-muted/50 shrink-0">
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

          {/* Checkboxes */}
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
        </div>

        {/* Right Column - Color Picker */}
        <div className="space-y-3">
          <BrandColorPicker value={primaryColor} onChange={setPrimaryColor} />
        </div>
      </div>
    </div>
  );
}
