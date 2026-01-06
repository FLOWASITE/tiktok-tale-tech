import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { AdSequenceStage } from '@/types/adSequence';
import { cn } from '@/lib/utils';
import { 
  Settings, Trash2, Plus, GripVertical, Image 
} from 'lucide-react';

interface SequenceStageCardProps {
  stage: AdSequenceStage;
  config: {
    label: string;
    color: string;
    bgColor: string;
    description?: string;
  };
  icon: React.ReactNode;
  onUpdate: (updates: Partial<AdSequenceStage>) => void;
  onDelete: () => void;
  organizationId?: string;
}

export function SequenceStageCard({ 
  stage, 
  config, 
  icon, 
  onUpdate, 
  onDelete,
  organizationId 
}: SequenceStageCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(stage.stage_label || config.label);
  const [durationDays, setDurationDays] = useState(stage.duration_days);
  const [budgetPercentage, setBudgetPercentage] = useState(stage.budget_percentage);

  const handleSave = () => {
    onUpdate({
      stage_label: label,
      duration_days: durationDays,
      budget_percentage: budgetPercentage,
    });
    setIsEditing(false);
  };

  const adCopies = stage.ad_copies || [];

  return (
    <Card className={cn("w-[280px] shrink-0 border-2", config.bgColor)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg bg-background", config.color)}>
              {icon}
            </div>
            <div>
              <CardTitle className="text-sm">{stage.stage_label || config.label}</CardTitle>
              <p className="text-xs text-muted-foreground">{stage.duration_days} ngày</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Popover open={isEditing} onOpenChange={setIsEditing}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px]" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Tên stage</Label>
                    <Input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Thời gian</Label>
                      <span className="text-xs font-medium">{durationDays} ngày</span>
                    </div>
                    <Slider
                      value={[durationDays]}
                      min={1}
                      max={30}
                      step={1}
                      onValueChange={([value]) => setDurationDays(value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Ngân sách</Label>
                      <span className="text-xs font-medium">{budgetPercentage}%</span>
                    </div>
                    <Slider
                      value={[budgetPercentage]}
                      min={5}
                      max={60}
                      step={5}
                      onValueChange={([value]) => setBudgetPercentage(value)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={onDelete}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Xóa
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      Lưu
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {/* Budget Badge */}
        <Badge variant="secondary" className="text-xs">
          {stage.budget_percentage}% ngân sách
        </Badge>
        
        {/* Ad Copies List */}
        <div className="space-y-1.5 min-h-[80px]">
          {adCopies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center border-2 border-dashed rounded-lg">
              <Image className="h-6 w-6 text-muted-foreground/50 mb-1" />
              <p className="text-xs text-muted-foreground">Chưa có ad copy</p>
            </div>
          ) : (
            adCopies.slice(0, 3).map((copy) => (
              <div 
                key={copy.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-background border text-xs"
              >
                <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{copy.ad_copy?.title || 'Untitled'}</span>
                {copy.is_primary && (
                  <Badge variant="default" className="text-[10px] h-4">Primary</Badge>
                )}
              </div>
            ))
          )}
          {adCopies.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              +{adCopies.length - 3} ads khác
            </p>
          )}
        </div>
        
        {/* Add Ad Copy Button */}
        <Button variant="outline" size="sm" className="w-full h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Thêm Ad Copy
        </Button>
      </CardContent>
    </Card>
  );
}
