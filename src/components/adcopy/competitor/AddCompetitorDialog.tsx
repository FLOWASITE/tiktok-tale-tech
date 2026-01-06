import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useCompetitors } from '@/hooks/useCompetitors';
import type { CompetitorFormData } from '@/types/competitor';

interface AddCompetitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCompetitorDialog({ open, onOpenChange }: AddCompetitorDialogProps) {
  const { addCompetitor, isAdding } = useCompetitors();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompetitorFormData>({
    defaultValues: {
      competitor_name: '',
      website_url: '',
      industry: '',
      notes: '',
    },
  });

  const onSubmit = async (data: CompetitorFormData) => {
    try {
      await addCompetitor(data);
      reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm đối thủ cạnh tranh</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="competitor_name">Tên đối thủ *</Label>
            <Input
              id="competitor_name"
              placeholder="VD: Shopee, Lazada..."
              {...register('competitor_name', { required: 'Vui lòng nhập tên đối thủ' })}
            />
            {errors.competitor_name && (
              <p className="text-sm text-destructive">{errors.competitor_name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="website_url">Website</Label>
            <Input
              id="website_url"
              placeholder="https://..."
              {...register('website_url')}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="industry">Ngành nghề</Label>
            <Input
              id="industry"
              placeholder="VD: E-commerce, F&B, Beauty..."
              {...register('industry')}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              placeholder="Thông tin bổ sung..."
              rows={2}
              {...register('notes')}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isAdding}>
              {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Thêm đối thủ
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
