import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShareWithTeamToggleProps {
  scriptId: string;
  initialValue: boolean;
  onUpdate?: (shared: boolean) => void;
}

export function ShareWithTeamToggle({
  scriptId,
  initialValue,
  onUpdate,
}: ShareWithTeamToggleProps) {
  const [shared, setShared] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('scripts')
        .update({ shared_with_org: checked })
        .eq('id', scriptId);

      if (error) throw error;

      setShared(checked);
      onUpdate?.(checked);
      toast.success(checked ? 'Đã chia sẻ với team' : 'Đã tắt chia sẻ');
    } catch (error) {
      console.error('Error updating share setting:', error);
      toast.error('Không thể cập nhật cài đặt chia sẻ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <div>
          <Label htmlFor="share-toggle" className="text-sm font-medium cursor-pointer">
            Chia sẻ với team
          </Label>
          <p className="text-xs text-muted-foreground">
            Cho phép thành viên trong tổ chức xem kịch bản này
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        <Switch
          id="share-toggle"
          checked={shared}
          onCheckedChange={handleToggle}
          disabled={loading}
        />
      </div>
    </div>
  );
}
