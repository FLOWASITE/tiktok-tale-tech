import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { GEOScorePanel } from './GEOScorePanel';
import { SchemaGenerator } from './SchemaGenerator';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useCurrentBrand } from '@/contexts/BrandContext';

export function GEOContentOptimizerTab() {
  const { currentOrganization } = useOrganizationContext();
  const { currentBrand } = useCurrentBrand();
  const [contentText, setContentText] = useState('');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Dán nội dung cần phân tích</Label>
        <Textarea
          value={contentText}
          onChange={e => setContentText(e.target.value)}
          placeholder="Dán nội dung bài viết, bài đăng mạng xã hội, hoặc core content tại đây để chấm điểm GEO và tạo schema markup..."
          className="min-h-[150px] resize-y"
        />
        <p className="text-xs text-muted-foreground">
          {contentText.length > 0 ? `${contentText.length} ký tự` : 'Hoặc copy nội dung từ mục Nội dung đa kênh'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GEOScorePanel
          contentText={contentText}
          organizationId={currentOrganization?.id || ''}
        />
        <SchemaGenerator
          contentText={contentText}
          brandName={currentBrand?.brand_name}
          organizationId={currentOrganization?.id}
        />
      </div>
    </div>
  );
}
