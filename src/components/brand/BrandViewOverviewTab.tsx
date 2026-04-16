import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  Eye,
  Lightbulb,
  Layers,
  Calendar,
  Sparkles,
  FileText,
  Globe,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { BrandFooterInfo } from '@/components/BrandForm';

interface ContentPillar {
  name: string;
  description?: string;
  color?: string;
}

interface BrandViewOverviewTabProps {
  template: BrandTemplate;
}

export function BrandViewOverviewTab({ template }: BrandViewOverviewTabProps) {
  const formattedDate = format(new Date(template.created_at), 'dd/MM/yyyy', { locale: vi });
  const updatedDate = format(new Date(template.updated_at), 'dd/MM/yyyy HH:mm', { locale: vi });

  const contentPillars = template.content_pillars as ContentPillar[] | null;
  const footerInfo = template.footer_info as BrandFooterInfo | null;

  return (
    <div className="space-y-4">

      {/* Mission & Vision */}
      {(template.mission || template.vision) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Sứ mệnh & Tầm nhìn
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {template.mission && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Sứ mệnh (Mission)</span>
                <p className="text-sm mt-1">{template.mission}</p>
              </div>
            )}
            {template.vision && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Tầm nhìn (Vision)</span>
                <p className="text-sm mt-1">{template.vision}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* UVP & Tagline & Headline */}
      {(template.unique_value_proposition || template.tagline || template.headline || template.sub_headline) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Định vị độc đáo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {template.headline && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Headline</span>
                <p className="text-base font-semibold mt-1">{template.headline}</p>
              </div>
            )}
            {template.sub_headline && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Sub-headline</span>
                <p className="text-sm mt-1 text-muted-foreground">{template.sub_headline}</p>
              </div>
            )}
            {template.unique_value_proposition && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Unique Value Proposition (UVP)
                </span>
                <p className="text-sm mt-1 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  {template.unique_value_proposition}
                </p>
              </div>
            )}
            {template.tagline && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Tagline / Slogan</span>
                <p className="text-base font-medium mt-1 italic">"{template.tagline}"</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content Pillars */}
      {contentPillars && contentPillars.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Content Pillars
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {contentPillars.map((pillar, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border"
                  style={{
                    borderColor: pillar.color ? `${pillar.color}40` : undefined,
                    backgroundColor: pillar.color ? `${pillar.color}10` : undefined,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {pillar.color && (
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: pillar.color }}
                      />
                    )}
                    <span className="font-medium text-sm">{pillar.name}</span>
                  </div>
                  {pillar.description && (
                    <p className="text-xs text-muted-foreground">{pillar.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brand Colors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Visual Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Màu chủ đạo</span>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className="w-8 h-8 rounded-lg border border-border shadow-sm"
                  style={{ backgroundColor: template.primary_color || '#888888' }}
                />
                <span className="text-sm font-mono">{template.primary_color || 'N/A'}</span>
              </div>
            </div>

            {template.secondary_colors && template.secondary_colors.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Màu phụ</span>
                <div className="flex items-center gap-2 mt-1">
                  {template.secondary_colors.map((color, idx) => (
                    <div
                      key={idx}
                      className="w-6 h-6 rounded-md border border-border"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {template.image_style && (
            <div>
              <span className="text-sm text-muted-foreground">Phong cách hình ảnh</span>
              <p className="text-sm mt-1">{template.image_style}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Badge variant={template.include_logo ? 'default' : 'secondary'}>
              {template.include_logo ? 'Có sử dụng logo' : 'Không dùng logo'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Footer Info */}
      {footerInfo && (footerInfo.company_name || footerInfo.address || footerInfo.phone || footerInfo.email || footerInfo.website || footerInfo.social_links) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Thông tin Footer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {footerInfo.company_name && (
              <div>
                <span className="text-sm text-muted-foreground">Tên công ty</span>
                <p className="text-sm font-medium">{footerInfo.company_name}</p>
              </div>
            )}
            {footerInfo.address && (
              <div>
                <span className="text-sm text-muted-foreground">Địa chỉ</span>
                <p className="text-sm">{footerInfo.address}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {footerInfo.phone && (
                <div>
                  <span className="text-sm text-muted-foreground">Điện thoại</span>
                  <p className="text-sm">{footerInfo.phone}</p>
                </div>
              )}
              {footerInfo.email && (
                <div>
                  <span className="text-sm text-muted-foreground">Email</span>
                  <p className="text-sm">{footerInfo.email}</p>
                </div>
              )}
            </div>
            {footerInfo.website && (
              <div>
                <span className="text-sm text-muted-foreground">Website</span>
                <p className="text-sm">{footerInfo.website}</p>
              </div>
            )}
            {footerInfo.social_links && Object.keys(footerInfo.social_links).length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Social Links</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(footerInfo.social_links).map(([platform, url]) => (
                    url && (
                      <Badge key={platform} variant="outline" className="text-xs">
                        {platform}: {url as string}
                      </Badge>
                    )
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Industry & Dates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            Thông tin khác
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <span className="text-sm text-muted-foreground">Ngành nghề</span>
              {template.industry && template.industry.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {template.industry.map((ind) => (
                    <Badge key={ind} variant="secondary">
                      {ind}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic mt-1">Chưa chọn ngành</p>
              )}
            </div>

            {(template as any).country_code && (
              <div className="flex items-start gap-3">
                <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-sm text-muted-foreground">Quốc gia</span>
                  <p className="font-medium">{(template as any).country_code}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Tạo ngày
              </span>
              <span className="font-medium">{formattedDate}</span>
            </div>
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Cập nhật
              </span>
              <span className="font-medium">{updatedDate}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
