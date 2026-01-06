import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAdSequences } from '@/hooks/useAdSequences';
import { AdSequence, SequenceType, SEQUENCE_TYPES } from '@/types/adSequence';
import { cn } from '@/lib/utils';
import { Layers, RotateCw, Rocket, Calendar, Loader2 } from 'lucide-react';

interface CreateSequenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string;
  campaignId?: string;
  brandTemplateId?: string;
  onCreated?: (sequence: AdSequence) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Layers,
  RotateCw,
  Rocket,
  Calendar,
};

export function CreateSequenceDialog({
  open,
  onOpenChange,
  organizationId,
  campaignId,
  brandTemplateId,
  onCreated
}: CreateSequenceDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sequenceType, setSequenceType] = useState<SequenceType>('funnel');
  
  const { createSequence } = useAdSequences({ organizationId });

  const handleSubmit = async () => {
    if (!name || !organizationId) return;
    
    try {
      const result = await createSequence.mutateAsync({
        name,
        description: description || undefined,
        sequence_type: sequenceType,
        organization_id: organizationId,
        campaign_id: campaignId,
        brand_template_id: brandTemplateId,
        createDefaultStages: true,
      });
      
      onOpenChange(false);
      setName('');
      setDescription('');
      setSequenceType('funnel');
      
      if (onCreated) {
        onCreated(result as AdSequence);
      }
    } catch (error) {
      console.error('Failed to create sequence:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tạo Ad Sequence mới</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên sequence *</Label>
            <Input
              id="name"
              placeholder="VD: Black Friday 2024 Funnel"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              placeholder="Mô tả ngắn về sequence..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Loại sequence *</Label>
            <RadioGroup
              value={sequenceType}
              onValueChange={(value) => setSequenceType(value as SequenceType)}
              className="grid grid-cols-2 gap-3"
            >
              {SEQUENCE_TYPES.map(type => {
                const Icon = ICON_MAP[type.icon];
                const isSelected = sequenceType === type.value;
                
                return (
                  <Label
                    key={type.value}
                    htmlFor={type.value}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-muted hover:border-muted-foreground/25"
                    )}
                  >
                    <RadioGroupItem value={type.value} id={type.value} className="sr-only" />
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      type.value === 'funnel' && "bg-blue-100 text-blue-600",
                      type.value === 'retargeting' && "bg-green-100 text-green-600",
                      type.value === 'launch' && "bg-purple-100 text-purple-600",
                      type.value === 'seasonal' && "bg-orange-100 text-orange-600",
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!name || createSequence.isPending}
          >
            {createSequence.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Tạo Sequence
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
