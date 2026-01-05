import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Clock, Hash, Target, Lightbulb, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CAMPAIGN_TEMPLATES, CampaignTemplate } from '@/data/campaignTemplates';

interface CampaignTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: CampaignTemplate) => void;
}

export function CampaignTemplateSelector({
  open,
  onOpenChange,
  onSelect,
}: CampaignTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CampaignTemplate | null>(null);

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
      onOpenChange(false);
      setSelectedTemplate(null);
      setPreviewTemplate(null);
    }
  };

  const displayTemplate = previewTemplate || selectedTemplate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Chọn mẫu chiến dịch
          </DialogTitle>
          <DialogDescription>
            Bắt đầu nhanh với các mẫu có sẵn, bao gồm KPIs và mốc thời gian được gợi ý
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-0 border-t">
          {/* Left: Template List */}
          <div className="md:col-span-2 border-r">
            <ScrollArea className="h-[50vh] md:h-[60vh]">
              <div className="p-4 space-y-2">
                {CAMPAIGN_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    onMouseEnter={() => setPreviewTemplate(template)}
                    onMouseLeave={() => setPreviewTemplate(null)}
                    className={cn(
                      'p-4 rounded-xl border-2 cursor-pointer transition-all',
                      selectedTemplate?.id === template.id
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent hover:border-primary/30 hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-2xl', template.color)}>
                        {template.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{template.name}</p>
                          {selectedTemplate?.id === template.id && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Clock className="h-2.5 w-2.5 mr-0.5" />
                            {template.duration_days} ngày
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {template.milestones.length} mốc
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Template Preview */}
          <div className="md:col-span-3 bg-muted/30">
            <ScrollArea className="h-[50vh] md:h-[60vh]">
              {displayTemplate ? (
                <div className="p-6 space-y-6">
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    <div className={cn('w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0', displayTemplate.color)}>
                      {displayTemplate.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{displayTemplate.name}</h3>
                      <p className="text-muted-foreground mt-1">{displayTemplate.description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          {displayTemplate.duration_days} ngày
                        </Badge>
                        <Badge variant="secondary">
                          <Hash className="h-3 w-3 mr-1" />
                          {displayTemplate.suggested_channels.length} kênh
                        </Badge>
                        <Badge variant="secondary">
                          <Target className="h-3 w-3 mr-1" />
                          {displayTemplate.suggested_goals.length} KPIs
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Channels */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Kênh đề xuất</h4>
                    <div className="flex flex-wrap gap-2">
                      {displayTemplate.suggested_channels.map((channel) => (
                        <Badge key={channel} variant="outline" className="capitalize">
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Goals */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Mục tiêu KPI gợi ý</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {displayTemplate.suggested_goals.map((goal) => (
                        <div key={goal.metric} className="p-3 rounded-lg bg-background border">
                          <p className="text-sm font-medium capitalize">
                            {goal.metric.replace('_', ' ')}
                          </p>
                          <p className="text-lg font-semibold text-primary">
                            {goal.target_suggestion.toLocaleString('vi-VN')}
                            {goal.metric === 'engagement_rate' || goal.metric === 'ctr' ? '%' : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Milestones */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Mốc thời gian</h4>
                    <div className="space-y-2">
                      {displayTemplate.milestones.map((milestone, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{milestone.title}</p>
                            <p className="text-xs text-muted-foreground">{milestone.description}</p>
                            <p className="text-xs text-primary mt-1">
                              Ngày {milestone.day_offset === 0 ? 'bắt đầu' : `+${milestone.day_offset}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tips */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Mẹo hay
                    </h4>
                    <ul className="space-y-1">
                      {displayTemplate.tips.map((tip, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center p-8">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chọn một mẫu để xem chi tiết</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between items-center bg-muted/30">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSelectedTemplate(null);
              }}
            >
              Tạo từ đầu
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!selectedTemplate}
            >
              <Check className="h-4 w-4 mr-2" />
              Dùng mẫu này
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
