import { AlertTriangle, ArrowUpRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { UpgradePlanDialog } from '@/components/UpgradePlanDialog';
import { AddonPurchaseDialog } from '@/components/AddonPurchaseDialog';

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
  const [addonOpen, setAddonOpen] = useState(false);

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
            Mua thêm lượt hoặc nâng cấp gói để tiếp tục.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" className="text-xs h-7" onClick={() => setAddonOpen(true)}>
            <Package className="h-3 w-3 mr-1" />
            Mua thêm
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setUpgradeOpen(true)}>
            Nâng cấp
            <ArrowUpRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <AddonPurchaseDialog open={addonOpen} onOpenChange={setAddonOpen} />
    </>
  );
}
