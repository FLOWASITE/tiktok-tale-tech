import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { UpgradePlanDialog } from '@/components/UpgradePlanDialog';

const USAGE_LABELS: Record<string, string> = {
  scripts: 'Scripts',
  carousels: 'Carousels',
  multichannel: 'nội dung đa kênh',
  images: 'Ảnh AI',
};

interface QuotaExhaustedBannerProps {
  usageType: string;
  used: number;
  limit: number;
}

export function QuotaExhaustedBanner({ usageType, used, limit }: QuotaExhaustedBannerProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (limit === -1 || used < limit) return null;

  const label = USAGE_LABELS[usageType] || usageType;

  return (
    <>
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">
            Đã hết {limit} lượt {label} tháng này
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Nâng cấp gói để tiếp tục tạo nội dung.
          </p>
        </div>
        <Button size="sm" className="shrink-0 text-xs h-7" onClick={() => setUpgradeOpen(true)}>
          Nâng cấp
          <ArrowUpRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
