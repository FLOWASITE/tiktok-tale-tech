import { Film, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function StoryboardVideoTab() {
  const navigate = useNavigate();
  return (
    <div className="text-center py-12 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
        <Film className="w-6 h-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">Video từ Storyboard</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Tạo kịch bản trước, AI sẽ chia cảnh thành nhiều shot ngắn rồi sinh từng video và ghép lại.
          Hỗ trợ cả 9:16 (TikTok) và 16:9 (YouTube). Sắp ra mắt ở Phase 4.
        </p>
      </div>
      <div className="flex items-center justify-center gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/scripts/new')} className="gap-1">
          Tạo kịch bản trước
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
