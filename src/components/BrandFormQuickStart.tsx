import { useEffect, useState } from 'react';
import { GlobalPackForSelection } from '@/hooks/useGlobalPacksForBrandSelection';
import { IndustrySelectionDialog } from '@/components/brand/IndustrySelectionDialog';

interface BrandFormQuickStartProps {
  onSelectIndustry: (pack: GlobalPackForSelection) => void;
  suggestedContext?: string;
  recentlyUsedIds?: string[];
}

export function BrandFormQuickStart({
  onSelectIndustry,
  suggestedContext,
  recentlyUsedIds,
}: BrandFormQuickStartProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Auto-open dialog on mount
  useEffect(() => {
    setDialogOpen(true);
  }, []);

  return (
    <IndustrySelectionDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      onSelectIndustry={onSelectIndustry}
      suggestedContext={suggestedContext}
      recentlyUsedIds={recentlyUsedIds}
    />
  );
}
