import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Radar, Plus, X, Loader2 } from 'lucide-react';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useGEOMonitors, GEOMonitor } from '@/hooks/useGEOMonitors';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const AI_ENGINES = [
  { id: 'chatgpt', label: 'ChatGPT', icon: '🤖' },
  { id: 'gemini', label: 'Google Gemini', icon: '✨' },
  { id: 'perplexity', label: 'Perplexity', icon: '🔍' },
];

interface GEOSetupWizardProps {
  existingMonitors?: GEOMonitor[];
}

export function GEOSetupWizard({ existingMonitors }: GEOSetupWizardProps) {
  const { currentBrand } = useCurrentBrand();
  const { currentOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const { createMonitor } = useGEOMonitors();
  const [saving, setSaving] = useState(false);

  const [selectedEngines, setSelectedEngines] = useState<string[]>(['chatgpt', 'gemini', 'perplexity']);
  const [keywords, setKeywords] = useState<string[]>(currentBrand?.brand_name ? [currentBrand.brand_name] : []);
  const [competitors, setCompetitors] = useState<string[]>(currentBrand?.main_competitors || []);
  const [newKeyword, setNewKeyword] = useState('');
  const [newCompetitor, setNewCompetitor] = useState('');

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords(prev => [...prev, kw]);
      setNewKeyword('');
    }
  };

  const addCompetitor = () => {
    const c = newCompetitor.trim();
    if (c && !competitors.includes(c)) {
      setCompetitors(prev => [...prev, c]);
      setNewCompetitor('');
    }
  };

  const handleSave = async () => {
    if (!currentBrand || !currentOrganization || !user) {
      toast.error('Vui lòng chọn brand và organization trước');
      return;
    }
    if (keywords.length === 0) {
      toast.error('Cần ít nhất 1 keyword');
      return;
    }

    setSaving(true);
    try {
      await createMonitor({
        organization_id: currentOrganization.id,
        brand_template_id: currentBrand.id,
        brand_name: currentBrand.brand_name,
        ai_engines: selectedEngines,
        keywords,
        competitors,
        scan_frequency: 'weekly',
        is_active: true,
      });
      toast.success('Đã tạo GEO Monitor thành công!');
    } catch (err: any) {
      toast.error('Lỗi: ' + (err.message || 'Không thể tạo monitor'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Radar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Thiết lập GEO Monitor</CardTitle>
            <CardDescription>Theo dõi cách AI engines đề cập đến thương hiệu của bạn</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brand Info */}
        <div>
          <Label className="text-sm font-medium">Brand đang chọn</Label>
          <p className="text-sm text-muted-foreground mt-1">
            {currentBrand?.brand_name || 'Chưa chọn brand'}
          </p>
        </div>

        {/* AI Engines */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">AI Engines cần theo dõi</Label>
          <div className="flex flex-wrap gap-3">
            {AI_ENGINES.map(engine => (
              <label key={engine.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedEngines.includes(engine.id)}
                  onCheckedChange={(checked) => {
                    setSelectedEngines(prev =>
                      checked ? [...prev, engine.id] : prev.filter(e => e !== engine.id)
                    );
                  }}
                />
                <span className="text-sm">{engine.icon} {engine.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Keywords theo dõi</Label>
          <div className="flex flex-wrap gap-2">
            {keywords.map(kw => (
              <Badge key={kw} variant="secondary" className="gap-1">
                {kw}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setKeywords(prev => prev.filter(k => k !== kw))} />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              placeholder="Thêm keyword..."
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              className="max-w-xs"
            />
            <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Competitors */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Đối thủ cạnh tranh</Label>
          <div className="flex flex-wrap gap-2">
            {competitors.map(c => (
              <Badge key={c} variant="outline" className="gap-1">
                {c}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setCompetitors(prev => prev.filter(x => x !== c))} />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newCompetitor}
              onChange={e => setNewCompetitor(e.target.value)}
              placeholder="Thêm đối thủ..."
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCompetitor())}
              className="max-w-xs"
            />
            <Button type="button" variant="outline" size="sm" onClick={addCompetitor}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Radar className="h-4 w-4 mr-2" />}
          {existingMonitors?.length ? 'Cập nhật Monitor' : 'Tạo GEO Monitor'}
        </Button>
      </CardContent>
    </Card>
  );
}
