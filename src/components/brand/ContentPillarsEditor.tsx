import React, { useState } from 'react';
import {
  Plus, Trash2, GripVertical, Columns, Palette, Hash, Percent,
  ChevronDown, ChevronUp, Sparkles, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ContentPillar } from '@/types/topicDiscovery';

interface ContentPillarsEditorProps {
  pillars: ContentPillar[];
  onChange: (pillars: ContentPillar[]) => void;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_COLORS = [
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
];

const SUGGESTED_PILLARS: ContentPillar[] = [
  { name: 'Sản phẩm/Dịch vụ', weight: 30, keywords: ['sản phẩm', 'tính năng', 'giải pháp'], color: '#10b981' },
  { name: 'Kiến thức ngành', weight: 25, keywords: ['xu hướng', 'thị trường', 'insight'], color: '#3b82f6' },
  { name: 'Khách hàng', weight: 20, keywords: ['case study', 'testimonial', 'review'], color: '#f59e0b' },
  { name: 'Hậu trường', weight: 15, keywords: ['team', 'văn hóa', 'behind the scenes'], color: '#8b5cf6' },
  { name: 'Khuyến mãi', weight: 10, keywords: ['ưu đãi', 'sale', 'promotion'], color: '#ec4899' },
];

export function ContentPillarsEditor({
  pillars,
  onChange,
  disabled,
  className,
}: ContentPillarsEditorProps) {
  const [isOpen, setIsOpen] = useState(pillars.length > 0);
  const [newKeyword, setNewKeyword] = useState<Record<number, string>>({});

  const totalWeight = pillars.reduce((sum, p) => sum + p.weight, 0);
  const isValidWeight = totalWeight === 100;

  const addPillar = () => {
    const usedColors = pillars.map((p) => p.color);
    const availableColor = DEFAULT_COLORS.find((c) => !usedColors.includes(c)) || DEFAULT_COLORS[0];
    
    onChange([
      ...pillars,
      { name: '', weight: 0, keywords: [], color: availableColor },
    ]);
  };

  const updatePillar = (index: number, updates: Partial<ContentPillar>) => {
    const updated = pillars.map((p, i) => (i === index ? { ...p, ...updates } : p));
    onChange(updated);
  };

  const removePillar = (index: number) => {
    onChange(pillars.filter((_, i) => i !== index));
  };

  const addKeyword = (pillarIndex: number) => {
    const keyword = newKeyword[pillarIndex]?.trim();
    if (!keyword) return;

    const pillar = pillars[pillarIndex];
    if (!pillar.keywords.includes(keyword)) {
      updatePillar(pillarIndex, { keywords: [...pillar.keywords, keyword] });
    }
    setNewKeyword({ ...newKeyword, [pillarIndex]: '' });
  };

  const removeKeyword = (pillarIndex: number, keyword: string) => {
    const pillar = pillars[pillarIndex];
    updatePillar(pillarIndex, {
      keywords: pillar.keywords.filter((k) => k !== keyword),
    });
  };

  const applyTemplate = () => {
    onChange(SUGGESTED_PILLARS);
    setIsOpen(true);
  };

  const autoBalance = () => {
    if (pillars.length === 0) return;
    const equalWeight = Math.floor(100 / pillars.length);
    const remainder = 100 - equalWeight * pillars.length;
    
    const balanced = pillars.map((p, i) => ({
      ...p,
      weight: equalWeight + (i === 0 ? remainder : 0),
    }));
    onChange(balanced);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-3 py-2 h-auto hover:bg-muted/50"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                <Columns className="w-4 h-4 text-violet-500" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">📊 Phân bổ chủ đề nội dung</span>
                  {pillars.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {pillars.length} pillars
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">AI sẽ gợi ý topics theo tỷ lệ này</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pillars.length > 0 && !isValidWeight && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Tổng weight phải = 100% (hiện tại: {totalWeight}%)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-3 space-y-3">
          {/* Quick actions */}
          {pillars.length === 0 && (
            <Card className="p-4 border-dashed">
              <div className="text-center">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-violet-500 opacity-50" />
                <p className="text-sm text-muted-foreground mb-3">
                  Chưa có Content Pillars. Bắt đầu với template gợi ý?
                </p>
                <Button variant="outline" size="sm" onClick={applyTemplate}>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Áp dụng template
                </Button>
              </div>
            </Card>
          )}

          {/* Weight overview */}
          {pillars.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Phân bổ nội dung</span>
                <span className={cn(
                  'font-medium',
                  isValidWeight ? 'text-emerald-500' : 'text-amber-500'
                )}>
                  {totalWeight}% / 100%
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                {pillars.map((pillar, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${pillar.weight}%`,
                            backgroundColor: pillar.color,
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{pillar.name || 'Chưa đặt tên'}: {pillar.weight}%</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
              {!isValidWeight && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={autoBalance}>
                  Cân bằng tự động
                </Button>
              )}
            </div>
          )}

          {/* Pillar list */}
          <div className="space-y-3">
            {pillars.map((pillar, index) => (
              <Card
                key={index}
                className="p-3 animate-fade-in"
                style={{ borderLeftColor: pillar.color, borderLeftWidth: 3 }}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    
                    <Input
                      placeholder="Tên pillar..."
                      value={pillar.name}
                      onChange={(e) => updatePillar(index, { name: e.target.value })}
                      className="h-8 flex-1"
                      disabled={disabled}
                    />

                    {/* Weight input */}
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={pillar.weight}
                        onChange={(e) => updatePillar(index, { weight: parseInt(e.target.value) || 0 })}
                        className="h-8 w-16 text-center"
                        disabled={disabled}
                      />
                      <Percent className="w-3 h-3 text-muted-foreground" />
                    </div>

                    {/* Color picker */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <label className="cursor-pointer">
                            <input
                              type="color"
                              value={pillar.color}
                              onChange={(e) => updatePillar(index, { color: e.target.value })}
                              className="sr-only"
                              disabled={disabled}
                            />
                            <div
                              className="w-8 h-8 rounded-md border-2 border-border"
                              style={{ backgroundColor: pillar.color }}
                            />
                          </label>
                        </TooltipTrigger>
                        <TooltipContent>Chọn màu</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => removePillar(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Keywords */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      Từ khóa liên quan
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {pillar.keywords.map((keyword) => (
                        <Badge
                          key={keyword}
                          variant="secondary"
                          className="text-xs gap-1 pr-1"
                          style={{ backgroundColor: `${pillar.color}20`, color: pillar.color }}
                        >
                          {keyword}
                          {!disabled && (
                            <button
                              onClick={() => removeKeyword(index, keyword)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          )}
                        </Badge>
                      ))}
                      <div className="flex items-center gap-1">
                        <Input
                          placeholder="Thêm..."
                          value={newKeyword[index] || ''}
                          onChange={(e) => setNewKeyword({ ...newKeyword, [index]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addKeyword(index);
                            }
                          }}
                          className="h-6 w-20 text-xs"
                          disabled={disabled}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => addKeyword(index)}
                          disabled={disabled || !newKeyword[index]?.trim()}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Add button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full border-dashed"
            onClick={addPillar}
            disabled={disabled || pillars.length >= 8}
          >
            <Plus className="w-4 h-4 mr-1" />
            Thêm Content Pillar
            {pillars.length >= 8 && (
              <span className="ml-1 text-muted-foreground">(tối đa 8)</span>
            )}
          </Button>

          {/* Tips */}
          <div className="text-[10px] text-muted-foreground bg-muted/50 rounded-lg p-2">
            <strong>💡 Tips:</strong> Content Pillars giúp AI gợi ý chủ đề theo chiến lược. 
            Phân bổ weight để ưu tiên loại nội dung quan trọng.
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
