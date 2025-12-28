import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { BrandSampleContentViewer } from '@/components/BrandSampleContentViewer';
import { BrandVoiceVariantManager } from '@/components/BrandVoiceVariantManager';

interface BrandViewSamplesTabProps {
  template: BrandTemplate;
}

export function BrandViewSamplesTab({ template }: BrandViewSamplesTabProps) {
  return (
    <div className="space-y-4">
      {/* Sample Content Viewer */}
      <BrandSampleContentViewer
        brandTemplateId={template.id}
        brandName={template.brand_name}
        logoUrl={template.logo_url}
      />

      {/* A/B Testing Variants */}
      <BrandVoiceVariantManager brandTemplate={template} />
    </div>
  );
}
