import { useEffect, useState } from 'react';
import { GlobalPackForSelection } from '@/hooks/useGlobalPacksForBrandSelection';
import { IndustrySelectionDialog } from '@/components/brand/IndustrySelectionDialog';

interface BrandFormQuickStartProps {
  onSelectIndustry: (pack: GlobalPackForSelection) => void;
}

export function BrandFormQuickStart({
  onSelectIndustry,
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
    />
  );
}
