import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { BrandSampleContentViewer } from '@/components/BrandSampleContentViewer';

interface BrandViewSamplesTabProps {
  template: BrandTemplate;
}

export function BrandViewSamplesTab({ template }: BrandViewSamplesTabProps) {
  return (
    <BrandSampleContentViewer
      brandTemplateId={template.id}
      brandName={template.brand_name}
      logoUrl={template.logo_url}
    />
  );
}
