import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Upload, Link, FileText, X } from 'lucide-react';
import { useSwipeFiles } from '@/hooks/useSwipeFiles';
import { useCompetitors } from '@/hooks/useCompetitors';
import { AD_PLATFORMS } from '@/types/adCopy';
import { SWIPE_FILE_TAGS, PERFORMANCE_TIERS } from '@/types/swipeFile';
import type { SwipeFileFormData } from '@/types/swipeFile';
import { cn } from '@/lib/utils';

interface AddSwipeFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSwipeFileDialog({ open, onOpenChange }: AddSwipeFileDialogProps) {
  const { addSwipeFile, isAdding } = useSwipeFiles();
  const { competitors } = useCompetitors();
  const [activeTab, setActiveTab] = useState<'manual' | 'competitor'>('manual');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SwipeFileFormData>({
    defaultValues: {
      source_type: 'manual',
      platform: 'facebook_feed',
      tags: [],
    },
  });

  const platform = watch('platform');
  const performanceTier = watch('performance_tier');

  const onSubmit = async (data: SwipeFileFormData) => {
    try {
      await addSwipeFile({
        ...data,
        source_type: activeTab,
        tags: selectedTags,
      });
      reset();
      setSelectedTags([]);
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Thêm Swipe File mới</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'competitor')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="gap-2">
              <FileText className="h-4 w-4" />
              Nhập thủ công
            </TabsTrigger>
            <TabsTrigger value="competitor" className="gap-2">
              <Link className="h-4 w-4" />
              Từ đối thủ
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[60vh] pr-4 mt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {activeTab === 'competitor' && (
                <div className="space-y-2">
                  <Label>Đối thủ</Label>
                  <Select onValueChange={(v) => setValue('competitor_name', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn hoặc nhập tên đối thủ" />
                    </SelectTrigger>
                    <SelectContent>
                      {competitors.map(comp => (
                        <SelectItem key={comp.id} value={comp.competitor_name}>
                          {comp.competitor_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Hoặc nhập tên đối thủ mới..."
                    {...register('competitor_name')}
                  />
                </div>
              )}
              
              {/* Platform */}
              <div className="space-y-2">
                <Label>Platform *</Label>
                <Select 
                  value={platform}
                  onValueChange={(v) => setValue('platform', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AD_PLATFORMS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2">
                          {p.icon} {p.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Screenshot URL */}
              <div className="space-y-2">
                <Label>URL Screenshot</Label>
                <Input
                  placeholder="https://..."
                  {...register('screenshot_url')}
                />
                <p className="text-xs text-muted-foreground">
                  Dán link ảnh screenshot của ad
                </p>
              </div>
              
              {/* Ad Content */}
              <div className="space-y-2">
                <Label>Headline</Label>
                <Input
                  placeholder="Headline của ad..."
                  {...register('headline')}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Primary Text (Nội dung chính)</Label>
                <Textarea
                  placeholder="Nội dung chính của ad..."
                  rows={4}
                  {...register('primary_text')}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Description (nếu có)..."
                  {...register('description')}
                />
              </div>
              
              <div className="space-y-2">
                <Label>CTA Button</Label>
                <Input
                  placeholder="VD: Mua ngay, Tìm hiểu thêm..."
                  {...register('cta_button')}
                />
              </div>
              
              {/* Source URL */}
              <div className="space-y-2">
                <Label>Link nguồn (optional)</Label>
                <Input
                  placeholder="Link tới ad gốc..."
                  {...register('source_url')}
                />
              </div>
              
              {/* Performance Tier */}
              <div className="space-y-2">
                <Label>Performance Tier</Label>
                <div className="flex gap-2">
                  {PERFORMANCE_TIERS.map(tier => (
                    <Button
                      key={tier.value}
                      type="button"
                      variant={performanceTier === tier.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setValue('performance_tier', tier.value)}
                      className={cn(
                        performanceTier === tier.value && tier.bgColor,
                        performanceTier === tier.value && tier.color
                      )}
                    >
                      {tier.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Đánh giá hiệu quả của ad này
                </p>
              </div>
              
              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags (kỹ thuật được sử dụng)</Label>
                <div className="flex flex-wrap gap-2">
                  {SWIPE_FILE_TAGS.map(tag => (
                    <Badge
                      key={tag.value}
                      variant={selectedTags.includes(tag.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag.value)}
                    >
                      {tag.label}
                      {selectedTags.includes(tag.value) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Notes */}
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea
                  placeholder="Ghi chú riêng về ad này..."
                  rows={2}
                  {...register('notes')}
                />
              </div>
              
              {/* Submit */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isAdding}>
                  {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Thêm vào Library
                </Button>
              </div>
            </form>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
