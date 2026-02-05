import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Eraser, Palette, Sparkles, ImageIcon, Loader2, 
  RotateCcw, Check, Download, ArrowRight, RefreshCw
} from 'lucide-react';
import { Channel } from '@/types/multichannel';
import { 
  useBackgroundEditor, 
  BackgroundEditType, 
  GradientDirection 
} from '@/hooks/useBackgroundEditor';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BackgroundEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  channel: Channel;
  contentId: string;
  onImageEdited?: (newImageUrl: string) => Promise<void>;
}

// Common color presets
const COLOR_PRESETS = [
  { value: '#ffffff', label: 'Trắng' },
  { value: '#000000', label: 'Đen' },
  { value: '#f5f5f5', label: 'Xám nhạt' },
  { value: '#1a1a2e', label: 'Navy' },
  { value: '#f8fafc', label: 'Slate' },
  { value: '#fef3c7', label: 'Vàng nhạt' },
  { value: '#dbeafe', label: 'Xanh nhạt' },
  { value: '#fce7f3', label: 'Hồng nhạt' },
];

// Gradient presets
const GRADIENT_PRESETS = [
  { from: '#6366f1', to: '#ec4899', label: 'Indigo → Pink' },
  { from: '#3b82f6', to: '#06b6d4', label: 'Blue → Cyan' },
  { from: '#f97316', to: '#eab308', label: 'Orange → Yellow' },
  { from: '#10b981', to: '#06b6d4', label: 'Emerald → Cyan' },
  { from: '#8b5cf6', to: '#d946ef', label: 'Violet → Fuchsia' },
  { from: '#1e293b', to: '#334155', label: 'Dark Slate' },
];

// Scene presets
const SCENE_PRESETS = [
  { label: 'Văn phòng', prompt: 'modern minimalist office with white walls and natural light' },
  { label: 'Thiên nhiên', prompt: 'outdoor nature scene with soft green foliage and gentle sunlight' },
  { label: 'Studio', prompt: 'professional photography studio with soft diffused lighting' },
  { label: 'Abstract', prompt: 'smooth abstract gradient background with soft colors' },
  { label: 'Bokeh', prompt: 'blurred city lights bokeh background at night' },
  { label: 'Marble', prompt: 'elegant white marble texture background with subtle veins' },
  { label: 'Biển', prompt: 'beautiful beach scene with calm ocean and blue sky' },
  { label: 'Cafe', prompt: 'cozy coffee shop interior with warm ambient lighting' },
];

const EDIT_TYPES: { value: BackgroundEditType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'remove', label: 'Xóa nền', icon: <Eraser className="w-4 h-4" />, description: 'Tạo ảnh transparent' },
  { value: 'solid_color', label: 'Màu đơn', icon: <Palette className="w-4 h-4" />, description: 'Background một màu' },
  { value: 'gradient', label: 'Gradient', icon: <Sparkles className="w-4 h-4" />, description: 'Màu chuyển sắc' },
  { value: 'custom_scene', label: 'Cảnh mới', icon: <ImageIcon className="w-4 h-4" />, description: 'Mô tả background' },
];

export function BackgroundEditor({
  open,
  onOpenChange,
  imageUrl,
  channel,
  contentId,
  onImageEdited,
}: BackgroundEditorProps) {
  // Edit type state
  const [editType, setEditType] = useState<BackgroundEditType>('remove');
  
  // Solid color state
  const [solidColor, setSolidColor] = useState('#ffffff');
  
  // Gradient state
  const [gradientFrom, setGradientFrom] = useState('#6366f1');
  const [gradientTo, setGradientTo] = useState('#ec4899');
  const [gradientDirection, setGradientDirection] = useState<GradientDirection>('vertical');
  
  // Custom scene state
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Hook
  const { 
    editBackground, 
    isProcessing, 
    error, 
    previewUrl, 
    reset, 
    clearPreview 
  } = useBackgroundEditor();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      reset();
      setEditType('remove');
      setSolidColor('#ffffff');
      setGradientFrom('#6366f1');
      setGradientTo('#ec4899');
      setGradientDirection('vertical');
      setCustomPrompt('');
    }
  }, [open, reset]);

  const handlePreview = async () => {
    const result = await editBackground({
      imageUrl,
      editType,
      solidColor: editType === 'solid_color' ? solidColor : undefined,
      gradientFrom: editType === 'gradient' ? gradientFrom : undefined,
      gradientTo: editType === 'gradient' ? gradientTo : undefined,
      gradientDirection: editType === 'gradient' ? gradientDirection : undefined,
      customScenePrompt: editType === 'custom_scene' ? customPrompt : undefined,
      contentId,
      channel,
    });

    if (result.success) {
      toast.success('Đã tạo xong! Xem preview bên phải.');
    }
  };

  const handleApply = async () => {
    if (!previewUrl) return;
    
    try {
      if (onImageEdited) {
        await onImageEdited(previewUrl);
      }
      toast.success('Đã áp dụng thay đổi');
      onOpenChange(false);
    } catch (err) {
      toast.error('Không thể lưu ảnh');
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `background-edited-${channel}-${Date.now()}.png`;
    link.target = '_blank';
    link.click();
    toast.success('Đang tải ảnh...');
  };

  const handleRetry = () => {
    clearPreview();
    handlePreview();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Chỉnh sửa Background
          </DialogTitle>
          <DialogDescription>
            Xóa hoặc thay đổi background của ảnh bằng AI
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="flex gap-4 h-full">
            {/* Left Panel - Controls */}
            <div className="w-[320px] flex-shrink-0 space-y-4 overflow-y-auto pr-2">
              {/* Edit Type Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Kiểu chỉnh sửa</Label>
                <div className="grid grid-cols-2 gap-2">
                  {EDIT_TYPES.map(type => {
                    const isSelected = editType === type.value;
                    return (
                      <button
                        key={type.value}
                        onClick={() => {
                          setEditType(type.value);
                          clearPreview();
                        }}
                        disabled={isProcessing}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all',
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border/50 hover:border-primary/40',
                          isProcessing && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-md flex items-center justify-center',
                          isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        )}>
                          {type.icon}
                        </div>
                        <span className={cn(
                          'text-xs font-medium',
                          isSelected ? 'text-primary' : 'text-foreground'
                        )}>
                          {type.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {type.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Options based on edit type */}
              {editType === 'solid_color' && (
                <div className="space-y-2">
                  <Label className="text-sm">Màu nền</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map(color => (
                      <button
                        key={color.value}
                        onClick={() => {
                          setSolidColor(color.value);
                          clearPreview();
                        }}
                        className={cn(
                          'w-8 h-8 rounded-md border-2 transition-all',
                          solidColor === color.value 
                            ? 'border-primary ring-2 ring-primary/30' 
                            : 'border-border hover:border-primary/50'
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={solidColor}
                      onChange={(e) => {
                        setSolidColor(e.target.value);
                        clearPreview();
                      }}
                      className="w-10 h-8 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={solidColor}
                      onChange={(e) => {
                        setSolidColor(e.target.value);
                        clearPreview();
                      }}
                      className="flex-1 h-8 px-2 text-xs border rounded-md bg-background"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              )}

              {editType === 'gradient' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Preset Gradients</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {GRADIENT_PRESETS.map((preset, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setGradientFrom(preset.from);
                            setGradientTo(preset.to);
                            clearPreview();
                          }}
                          className={cn(
                            'h-8 rounded-md border-2 transition-all',
                            gradientFrom === preset.from && gradientTo === preset.to
                              ? 'border-primary ring-2 ring-primary/30'
                              : 'border-border hover:border-primary/50'
                          )}
                          style={{
                            background: `linear-gradient(to right, ${preset.from}, ${preset.to})`
                          }}
                          title={preset.label}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Từ</Label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={gradientFrom}
                          onChange={(e) => {
                            setGradientFrom(e.target.value);
                            clearPreview();
                          }}
                          className="w-8 h-6 rounded cursor-pointer"
                        />
                        <span className="text-xs text-muted-foreground">{gradientFrom}</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Đến</Label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={gradientTo}
                          onChange={(e) => {
                            setGradientTo(e.target.value);
                            clearPreview();
                          }}
                          className="w-8 h-6 rounded cursor-pointer"
                        />
                        <span className="text-xs text-muted-foreground">{gradientTo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Hướng</Label>
                    <div className="flex gap-2">
                      {[
                        { value: 'vertical' as const, label: '↓', title: 'Dọc' },
                        { value: 'horizontal' as const, label: '→', title: 'Ngang' },
                        { value: 'diagonal' as const, label: '↘', title: 'Chéo' },
                      ].map(dir => (
                        <button
                          key={dir.value}
                          onClick={() => {
                            setGradientDirection(dir.value);
                            clearPreview();
                          }}
                          className={cn(
                            'flex-1 py-1.5 rounded-md border-2 text-sm font-medium transition-all',
                            gradientDirection === dir.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50'
                          )}
                          title={dir.title}
                        >
                          {dir.label} {dir.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {editType === 'custom_scene' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Gợi ý nhanh</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {SCENE_PRESETS.map(preset => (
                        <Badge
                          key={preset.label}
                          variant={customPrompt === preset.prompt ? 'default' : 'outline'}
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => {
                            setCustomPrompt(preset.prompt);
                            clearPreview();
                          }}
                        >
                          {preset.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Mô tả cảnh nền</Label>
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => {
                        setCustomPrompt(e.target.value);
                        clearPreview();
                      }}
                      placeholder="Ví dụ: Modern office with white walls, soft natural lighting, minimalist furniture..."
                      rows={3}
                      className="text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Mô tả càng chi tiết, kết quả càng chính xác
                    </p>
                  </div>
                </div>
              )}

              {editType === 'remove' && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-xs text-muted-foreground">
                    AI sẽ tự động nhận diện chủ thể và xóa background, tạo ảnh PNG transparent để bạn dùng trong thiết kế.
                  </p>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}
            </div>

            {/* Right Panel - Preview */}
            <div className="flex-1 border-l pl-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Preview</Label>
                {previewUrl && (
                  <Button variant="ghost" size="sm" onClick={handleRetry} disabled={isProcessing}>
                    <RefreshCw className={cn("w-3.5 h-3.5 mr-1", isProcessing && "animate-spin")} />
                    Thử lại
                  </Button>
                )}
              </div>
              
              <div className="flex gap-3 h-[300px]">
                {/* Original */}
                <div className="flex-1 flex flex-col">
                  <span className="text-xs text-muted-foreground mb-1.5">Ảnh gốc</span>
                  <div className="flex-1 rounded-lg border bg-muted/30 overflow-hidden flex items-center justify-center p-2">
                    <img 
                      src={imageUrl} 
                      alt="Original" 
                      className="max-w-full max-h-full object-contain rounded"
                    />
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* Result */}
                <div className="flex-1 flex flex-col">
                  <span className="text-xs text-muted-foreground mb-1.5">Kết quả</span>
                  <div className={cn(
                    "flex-1 rounded-lg border overflow-hidden flex items-center justify-center p-2",
                    editType === 'remove' 
                      ? "bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23f0f0f0%22%2F%3E%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23f0f0f0%22%2F%3E%3Crect%20x%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23ccc%22%2F%3E%3Crect%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23ccc%22%2F%3E%3C%2Fsvg%3E')]"
                      : "bg-muted/30"
                  )}>
                    {isProcessing ? (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-xs">Đang xử lý...</span>
                      </div>
                    ) : previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt="Edited" 
                        className="max-w-full max-h-full object-contain rounded"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-xs">Nhấn "Xem trước" để tạo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
              Hủy
            </Button>
            
            <div className="flex items-center gap-2">
              {previewUrl && (
                <Button variant="outline" onClick={handleDownload} disabled={isProcessing}>
                  <Download className="w-4 h-4 mr-2" />
                  Tải về
                </Button>
              )}
              
              {!previewUrl ? (
                <Button 
                  onClick={handlePreview} 
                  disabled={isProcessing || (editType === 'custom_scene' && !customPrompt.trim())}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Xem trước
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={handleApply} disabled={isProcessing}>
                  <Check className="w-4 h-4 mr-2" />
                  Áp dụng & Lưu
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
