import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Target,
  Users,
  MapPin,
  Hash,
  Quote,
  Megaphone,
  TrendingUp,
  Swords,
  Trophy,
} from 'lucide-react';

interface BrandViewStrategyTabProps {
  template: BrandTemplate;
}

export function BrandViewStrategyTab({ template }: BrandViewStrategyTabProps) {
  const hasTargetMarket =
    template.target_age_range ||
    template.target_gender ||
    template.market_segment ||
    (template.target_locations && template.target_locations.length > 0);

  const hasCompetitors =
    (template.main_competitors && template.main_competitors.length > 0) ||
    (template.competitive_advantages && template.competitive_advantages.length > 0);

  return (
    <div className="space-y-4">
      {/* Target Market */}
      {hasTargetMarket && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Thị trường mục tiêu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {template.target_age_range && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm text-muted-foreground">Độ tuổi</span>
                    <p className="font-medium">{template.target_age_range}</p>
                  </div>
                </div>
              )}

              {template.target_gender && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm text-muted-foreground">Giới tính</span>
                    <p className="font-medium">
                      {template.target_gender === 'all'
                        ? 'Tất cả'
                        : template.target_gender === 'male'
                        ? 'Nam'
                        : template.target_gender === 'female'
                        ? 'Nữ'
                        : template.target_gender}
                    </p>
                  </div>
                </div>
              )}

              {template.market_segment && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <TrendingUp className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm text-muted-foreground">Phân khúc</span>
                    <p className="font-medium">{template.market_segment}</p>
                  </div>
                </div>
              )}

              {template.target_locations && template.target_locations.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm text-muted-foreground">Khu vực</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.target_locations.map((loc) => (
                        <Badge key={loc} variant="secondary" className="text-xs">
                          {loc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competitors */}
      {hasCompetitors && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Swords className="w-4 h-4 text-primary" />
              Đối thủ & Lợi thế
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {template.main_competitors && template.main_competitors.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Đối thủ chính</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {template.main_competitors.map((comp) => (
                    <Badge key={comp} variant="outline">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {template.competitive_advantages && template.competitive_advantages.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  Lợi thế cạnh tranh
                </span>
                <ul className="mt-2 space-y-1.5">
                  {template.competitive_advantages.map((adv, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-1">•</span>
                      {adv}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Brand Assets */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Hashtags */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" />
              Brand Hashtags
            </CardTitle>
          </CardHeader>
          <CardContent>
            {template.brand_hashtags && template.brand_hashtags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {template.brand_hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-sm">
                    #{tag.replace(/^#/, '')}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Chưa có hashtag</p>
            )}
          </CardContent>
        </Card>

        {/* Signature Phrases */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Quote className="w-4 h-4 text-primary" />
              Signature Phrases
            </CardTitle>
          </CardHeader>
          <CardContent>
            {template.signature_phrases && template.signature_phrases.length > 0 ? (
              <ul className="space-y-2">
                {template.signature_phrases.map((phrase, idx) => (
                  <li
                    key={idx}
                    className="text-sm italic p-2 bg-muted/50 rounded-md border-l-2 border-primary"
                  >
                    "{phrase}"
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">Chưa có câu signature</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CTA Templates */}
      {template.cta_templates && template.cta_templates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              CTA Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {template.cta_templates.map((cta, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="bg-primary/5 border-primary/20 text-sm"
                >
                  {cta}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evergreen Themes */}
      {template.evergreen_themes && template.evergreen_themes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Evergreen Themes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {template.evergreen_themes.map((theme, idx) => (
                <Badge key={idx} variant="secondary">
                  {theme}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!hasTargetMarket && !hasCompetitors && (
        <div className="text-center py-8 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Chưa có thông tin chiến lược</p>
          <p className="text-sm">Cập nhật brand template để thêm thông tin target market, đối thủ và assets</p>
        </div>
      )}
    </div>
  );
}
