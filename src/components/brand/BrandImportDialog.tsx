import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Facebook, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useBrandImport, type BrandImportResult, type ImportableField } from '@/hooks/useBrandImport';
import { useSocialConnections } from '@/hooks/useSocialConnections';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBrandTemplates, type BrandTemplate } from '@/hooks/useBrandTemplates';
import { BrandImportProgressPanel } from './BrandImportProgressPanel';

interface BrandImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, applies suggestions to this existing brand. Otherwise: imports → fills form for create. */
  targetBrand?: BrandTemplate | null;
  /** Called after successful apply (to existing brand) or when user wants to "Create new with these values". */
  onApplied?: (brand: BrandTemplate | null, suggestion: BrandImportResult) => void;
}

const ALL_FIELDS: { key: ImportableField; label: string; group: string }[] = [
  { key: 'brand_name', label: 'Tên thương hiệu', group: 'Identity' },
  { key: 'tagline', label: 'Tagline', group: 'Identity' },
  { key: 'mission', label: 'Sứ mệnh', group: 'Identity' },
  { key: 'industry', label: 'Ngành (gợi ý)', group: 'Identity' },
  { key: 'target_audience', label: 'Đối tượng mục tiêu', group: 'Identity' },
  { key: 'logo_url', label: 'Logo', group: 'Identity' },
  { key: 'primary_color', label: 'Màu chủ đạo', group: 'Identity' },
  { key: 'tone_of_voice', label: 'Tone of voice', group: 'Voice' },
  { key: 'sample_texts', label: 'Sample texts (clone voice)', group: 'Voice' },
  { key: 'content_pillars', label: 'Content pillars', group: 'Strategy' },
  { key: 'usps', label: 'USPs', group: 'Strategy' },
  { key: 'attach_fanpage', label: 'Gắn fanpage này vào brand', group: 'Connection' },
];

export function BrandImportDialog({ open, onOpenChange, targetBrand, onApplied }: BrandImportDialogProps) {
  const { currentOrganization } = useOrganizationContext();
  const { importFromWebsite, importFromFanpage, loading, progress, events, cancel } = useBrandImport();
  const { updateTemplate } = useBrandTemplates();
  const { connections } = useSocialConnections({
    organizationId: currentOrganization?.id,
  });

  const [tab, setTab] = useState<'website' | 'fanpage'>('website');
  const [url, setUrl] = useState('');
  const [includeAbout, setIncludeAbout] = useState(true);
  const [selectedFanpageId, setSelectedFanpageId] = useState<string>('');
  const [result, setResult] = useState<BrandImportResult | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<ImportableField>>(new Set());
  const [selectedLogoUrl, setSelectedLogoUrl] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const logoCandidates = useMemo(() => {
    if (!result) return [] as Array<{ url: string; source: string }>;
    const meta: any = result.raw_meta || {};
    const arr: Array<{ url: string; source: string }> = Array.isArray(meta.logo_candidates) ? [...meta.logo_candidates] : [];
    const seen = new Set(arr.map((c) => c.url));
    const fallbacks: Array<[string | null | undefined, string]> = [
      [meta.logo_url, 'logo'],
      [meta.picture, 'picture'],
      [meta.og_image, 'og:image'],
      [meta.favicon, 'favicon'],
    ];
    for (const [u, s] of fallbacks) {
      if (u && !seen.has(u)) { arr.push({ url: u, source: s }); seen.add(u); }
    }
    return arr;
  }, [result]);

  const fanpages = useMemo(
    () => connections.filter((c) => c.platform === 'facebook' && c.is_active),
    [connections],
  );

  useEffect(() => {
    if (!open) {
      setUrl('');
      setSelectedFanpageId('');
      setResult(null);
      setSelectedFields(new Set());
      setSelectedLogoUrl(null);
      setTab('website');
    }
  }, [open]);

  // Auto-select all available fields once result arrives
  useEffect(() => {
    if (!result) return;
    const next = new Set<ImportableField>();
    const s = result.suggestion;
    if (s.brand_name) next.add('brand_name');
    if (s.tagline) next.add('tagline');
    if (s.mission) next.add('mission');
    if (s.industry_suggestion) next.add('industry');
    if (s.target_audience && (s.target_audience.age_range || s.target_audience.gender || (s.target_audience.locations?.length ?? 0) > 0)) {
      next.add('target_audience');
    }
    if ((s.tone_of_voice?.length ?? 0) > 0) next.add('tone_of_voice');
    if ((s.sample_texts?.length ?? 0) > 0) next.add('sample_texts');
    if ((s.content_pillars?.length ?? 0) > 0) next.add('content_pillars');
    if ((s.usps?.length ?? 0) > 0) next.add('usps');
    if (result.raw_meta?.logo_url || result.raw_meta?.og_image || result.raw_meta?.picture) next.add('logo_url');
    if (result.raw_meta?.theme_color || result.suggestion?.primary_color_suggestion) next.add('primary_color');
    if (result.source === 'fanpage') next.add('attach_fanpage');
    setSelectedFields(next);
    const meta: any = result.raw_meta || {};
    const firstLogo = (Array.isArray(meta.logo_candidates) && meta.logo_candidates[0]?.url)
      || meta.logo_url || meta.picture || meta.og_image || null;
    setSelectedLogoUrl(firstLogo);
  }, [result]);

  const handleAnalyze = async () => {
    if (tab === 'website') {
      if (!url.trim()) {
        toast.error('Vui lòng nhập URL');
        return;
      }
      const extras = includeAbout ? ['/about', '/about-us', '/gioi-thieu'] : [];
      const r = await importFromWebsite(url, {
        extra_paths: extras,
        organization_id: currentOrganization?.id,
      });
      if (r) setResult(r);
    } else {
      if (!selectedFanpageId) {
        toast.error('Vui lòng chọn fanpage');
        return;
      }
      const r = await importFromFanpage(selectedFanpageId, {
        organization_id: currentOrganization?.id,
      });
      if (r) setResult(r);
    }
  };

  const toggleField = (k: ImportableField) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const buildUpdates = (): Partial<BrandTemplate> & { imported_from?: any } => {
    if (!result) return {};
    const s = result.suggestion;
    const updates: any = {};
    if (selectedFields.has('brand_name') && s.brand_name) updates.brand_name = s.brand_name;
    if (selectedFields.has('tagline') && s.tagline) updates.tagline = s.tagline;
    if (selectedFields.has('mission') && s.mission) updates.mission = s.mission;
    if (selectedFields.has('industry') && s.industry_suggestion) {
      updates.industry = [s.industry_suggestion];
    }
    if (selectedFields.has('target_audience') && s.target_audience) {
      if (s.target_audience.age_range) updates.target_age_range = s.target_audience.age_range;
      if (s.target_audience.gender) updates.target_gender = s.target_audience.gender;
      if (s.target_audience.locations?.length) updates.target_locations = s.target_audience.locations;
    }
    if (selectedFields.has('tone_of_voice') && s.tone_of_voice?.length) updates.tone_of_voice = s.tone_of_voice;
    if (selectedFields.has('content_pillars') && s.content_pillars?.length) {
      updates.content_pillars = s.content_pillars.map((p) => ({ name: p.name, description: p.description || '' }));
    }
    if (selectedFields.has('usps') && s.usps?.length) {
      updates.competitive_advantages = s.usps;
    }
    if (selectedFields.has('sample_texts') && s.sample_texts?.length) {
      const existing = (targetBrand?.sample_texts as Record<string, string> | null) || {};
      const merged = { ...existing };
      s.sample_texts.forEach((txt, i) => {
        merged[`imported_${Date.now()}_${i}`] = txt;
      });
      updates.sample_texts = merged;
    }
    if (selectedFields.has('logo_url')) {
      const logo = selectedLogoUrl || result.raw_meta?.logo_url || result.raw_meta?.picture || result.raw_meta?.og_image;
      if (logo) updates.logo_url = logo;
    }
    if (selectedFields.has('primary_color')) {
      const color = result.raw_meta?.theme_color || s.primary_color_suggestion;
      if (color) updates.primary_color = color;
    }
    updates.imported_from = {
      source: result.source,
      url: result.raw_meta?.source_url || null,
      page_id: result.raw_meta?.page_id || null,
      imported_at: new Date().toISOString(),
      applied_fields: Array.from(selectedFields),
    };
    return updates;
  };

  const handleApply = async () => {
    if (!result) return;
    // Inject user's selected logo into raw_meta so downstream consumers (BrandCreate hydrate) honor it
    const effectiveLogo = selectedLogoUrl || result.raw_meta?.logo_url || result.raw_meta?.picture || result.raw_meta?.og_image || null;
    const enriched: BrandImportResult = {
      ...result,
      raw_meta: { ...(result.raw_meta || {}), logo_url: effectiveLogo },
    };
    if (!targetBrand) {
      // No target — pass back to caller (e.g. open create-form prefilled)
      onApplied?.(null, enriched);
      onOpenChange(false);
      return;
    }
    setApplying(true);
    try {
      const updates = buildUpdates();
      const updated = await updateTemplate(targetBrand.id, updates as any);
      if (updated) {
        // Auto-attach fanpage to brand
        if (selectedFields.has('attach_fanpage') && result.source === 'fanpage' && result.raw_meta?.social_connection_id) {
          const { error } = await supabase
            .from('social_connections')
            .update({ brand_template_id: targetBrand.id })
            .eq('id', result.raw_meta.social_connection_id);
          if (error) console.error('Attach fanpage error:', error);
        }
        toast.success('Đã áp dụng vào brand', {
          description: `${selectedFields.size} nhóm dữ liệu đã được cập nhật`,
        });
        onApplied?.(updated, enriched);
        onOpenChange(false);
      }
    } finally {
      setApplying(false);
    }
  };

  const handleSelectAll = () => {
    if (!result) return;
    const all = new Set<ImportableField>(ALL_FIELDS.map((f) => f.key));
    setSelectedFields(all);
  };

  const renderPreviewValue = (key: ImportableField): string | null => {
    if (!result) return null;
    const s = result.suggestion;
    switch (key) {
      case 'brand_name': return s.brand_name || null;
      case 'tagline': return s.tagline || null;
      case 'mission': return s.mission || null;
      case 'industry': return s.industry_suggestion || null;
      case 'target_audience': {
        const t = s.target_audience;
        if (!t) return null;
        const parts = [t.age_range, t.gender, t.locations?.join(', ')].filter(Boolean);
        return parts.join(' • ') || null;
      }
      case 'tone_of_voice': return s.tone_of_voice?.join(', ') || null;
      case 'content_pillars': return s.content_pillars?.map((p) => p.name).join(' • ') || null;
      case 'usps': return s.usps?.join(' • ') || null;
      case 'sample_texts': return `${s.sample_texts?.length || 0} đoạn văn mẫu`;
      case 'logo_url': return selectedLogoUrl || result.raw_meta?.logo_url || result.raw_meta?.picture || result.raw_meta?.og_image || null;
      case 'primary_color': return result.raw_meta?.theme_color || s.primary_color_suggestion || null;
      case 'attach_fanpage':
        return result.source === 'fanpage' ? `Page: ${result.raw_meta?.page_name || result.raw_meta?.page_id}` : null;
    }
  };

  const groupedFields = useMemo(() => {
    const groups: Record<string, typeof ALL_FIELDS> = {};
    ALL_FIELDS.forEach((f) => {
      const v = renderPreviewValue(f.key);
      if (!v) return;
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push(f);
    });
    return groups;
  }, [result]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] h-[90vh] sm:h-auto flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Import Brand từ website hoặc fanpage
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 space-y-4">
            {loading && (
              <BrandImportProgressPanel progress={progress} events={events} onCancel={cancel} />
            )}
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="website" className="gap-2"><Globe className="w-4 h-4" /> Website</TabsTrigger>
                <TabsTrigger value="fanpage" className="gap-2"><Facebook className="w-4 h-4" /> Facebook Fanpage</TabsTrigger>
              </TabsList>

              <TabsContent value="website" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>URL website</Label>
                  <Input
                    placeholder="https://your-brand.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-about"
                    checked={includeAbout}
                    onCheckedChange={(v) => setIncludeAbout(!!v)}
                  />
                  <Label htmlFor="include-about" className="text-sm font-normal cursor-pointer">
                    Scrape thêm trang /about, /gioi-thieu (chậm hơn nhưng chính xác hơn)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI sẽ đọc nội dung công khai, suy luận tên, tagline, tone, content pillars và rút trích đoạn văn mẫu.
                </p>
              </TabsContent>

              <TabsContent value="fanpage" className="space-y-4 mt-4">
                {fanpages.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
                    <AlertCircle className="w-6 h-6 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Chưa có Facebook Page nào được kết nối trong workspace.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vào tab "Kết nối" của Brand để kết nối Facebook trước.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Chọn fanpage</Label>
                    <Select value={selectedFanpageId} onValueChange={setSelectedFanpageId}>
                      <SelectTrigger>
                        <SelectValue placeholder="-- Chọn page --" />
                      </SelectTrigger>
                      <SelectContent>
                        {fanpages.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.platform_display_name || f.platform_username || f.platform_user_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      AI đọc About + ~20 bài viết gần nhất để suy luận giọng nói thương hiệu.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Tick các mục muốn áp dụng vào brand{targetBrand ? ` "${targetBrand.name}"` : ''}.
                </p>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>Chọn tất cả</Button>
              </div>

              {Object.entries(groupedFields).map(([group, fields]) => (
                <div key={group} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h4>
                  <div className="space-y-2">
                    {fields.map((f) => {
                      const value = renderPreviewValue(f.key);
                      const checked = selectedFields.has(f.key);
                      const existing = readExistingFieldLabel(targetBrand, f.key);
                      const isLogo = f.key === 'logo_url' && value;
                      const isColor = f.key === 'primary_color' && value;
                      const colorIsAiGuess = f.key === 'primary_color' && !result?.raw_meta?.theme_color && result?.suggestion?.primary_color_suggestion;
                      return (
                        <label
                          key={f.key}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 cursor-pointer transition-colors"
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleField(f.key)} className="mt-1" />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{f.label}</span>
                              {existing && (
                                <Badge variant="outline" className="text-[10px]">đã có</Badge>
                              )}
                              {colorIsAiGuess && (
                                <Badge variant="secondary" className="text-[10px]">AI gợi ý</Badge>
                              )}
                            </div>
                            {existing && (
                              <p className="text-xs text-muted-foreground line-through truncate">{existing}</p>
                            )}
                            {isLogo && logoCandidates.length > 1 ? (
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">
                                  Tìm thấy {logoCandidates.length} logo. Chọn 1 để lưu:
                                </p>
                                <div
                                  className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
                                  onClick={(e) => e.preventDefault()}
                                >
                                  {logoCandidates.map((c) => {
                                    const active = (selectedLogoUrl || logoCandidates[0]?.url) === c.url;
                                    return (
                                      <button
                                        type="button"
                                        key={c.url}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setSelectedLogoUrl(c.url);
                                          setSelectedFields((prev) => new Set(prev).add('logo_url'));
                                        }}
                                        title={c.source}
                                        className={`shrink-0 w-16 h-16 rounded-md border-2 bg-muted p-1 transition-all ${
                                          active
                                            ? 'border-primary ring-2 ring-primary/30'
                                            : 'border-border hover:border-muted-foreground/40'
                                        }`}
                                      >
                                        <img
                                          src={c.url}
                                          alt={c.source}
                                          className="w-full h-full object-contain"
                                          onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.opacity = '0.3'; }}
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {selectedLogoUrl || logoCandidates[0]?.url}
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isLogo && (
                                  <img
                                    src={value as string}
                                    alt="Logo"
                                    className="w-10 h-10 rounded border bg-muted object-contain shrink-0"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                )}
                                {isColor && (
                                  <span
                                    className="w-6 h-6 rounded border shrink-0"
                                    style={{ backgroundColor: value as string }}
                                  />
                                )}
                                <p className="text-sm break-words flex-1 min-w-0">{value}</p>
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              {Object.keys(groupedFields).length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">AI không trích xuất được dữ liệu nào hữu ích.</p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0">
          {!result ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button onClick={handleAnalyze} disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang phân tích...</> : 'Phân tích'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setResult(null)} disabled={applying}>← Quay lại</Button>
              <Button
                onClick={handleApply}
                disabled={applying || selectedFields.size === 0}
              >
                {applying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang áp dụng...</> : (
                  targetBrand ? `Áp dụng (${selectedFields.size})` : 'Tiếp tục tạo brand'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function readExistingFieldLabel(brand: BrandTemplate | null | undefined, key: ImportableField): string | null {
  if (!brand) return null;
  switch (key) {
    case 'brand_name': return brand.brand_name || null;
    case 'tagline': return brand.tagline || null;
    case 'mission': return brand.mission || null;
    case 'industry': return brand.industry?.[0] || null;
    case 'target_audience': {
      const parts = [brand.target_age_range, brand.target_gender, brand.target_locations?.join(', ')].filter(Boolean);
      return parts.join(' • ') || null;
    }
    case 'tone_of_voice': return brand.tone_of_voice?.join(', ') || null;
    case 'content_pillars': return brand.content_pillars?.map((p) => p.name).join(' • ') || null;
    case 'usps': return brand.competitive_advantages?.join(' • ') || null;
    case 'sample_texts': {
      const n = brand.sample_texts ? Object.keys(brand.sample_texts).length : 0;
      return n ? `${n} đoạn hiện có (sẽ thêm vào)` : null;
    }
    case 'logo_url': return brand.logo_url || null;
    case 'primary_color': return brand.primary_color || null;
    default: return null;
  }
}
