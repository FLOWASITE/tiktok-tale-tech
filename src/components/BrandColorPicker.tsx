import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Paintbrush } from 'lucide-react';

interface BrandColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899',
  '#6B7280', '#1F2937', '#DC2626', '#EA580C', '#CA8A04',
  '#16A34A', '#0D9488', '#2563EB', '#7C3AED', '#DB2777',
];

export function BrandColorPicker({ value, onChange }: BrandColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleColorPick = (color: string) => {
    setInputValue(color);
    onChange(color);
  };

  return (
    <div className="space-y-2">
      <Label>Màu chủ đạo</Label>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-10 h-10 p-0 border-2"
              style={{ backgroundColor: value }}
            >
              <span className="sr-only">Chọn màu</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-8 h-8 rounded-md border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorPick(color)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => colorInputRef.current?.click()}
                >
                  <Paintbrush className="w-4 h-4" />
                  Tùy chỉnh
                </Button>
                <input
                  ref={colorInputRef}
                  type="color"
                  value={value}
                  onChange={(e) => handleColorPick(e.target.value)}
                  className="sr-only"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="#dd0707"
          className="w-28 font-mono text-sm"
          maxLength={7}
        />
        <div
          className="w-8 h-8 rounded border border-border shrink-0"
          style={{ backgroundColor: value }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        🎨 Chọn màu để ảnh social được tạo đúng với thương hiệu hơn
      </p>
    </div>
  );
}
