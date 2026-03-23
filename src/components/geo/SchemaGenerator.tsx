import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Code, Copy, Check, FileJson } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SCHEMA_TYPES = [
  { value: 'Article', label: 'Article', description: 'Bài viết, blog post' },
  { value: 'FAQPage', label: 'FAQ Page', description: 'Câu hỏi thường gặp' },
  { value: 'HowTo', label: 'How To', description: 'Hướng dẫn từng bước' },
  { value: 'Product', label: 'Product', description: 'Sản phẩm, dịch vụ' },
];

interface SchemaGeneratorProps {
  contentText: string;
  brandName?: string;
  contentId?: string;
  organizationId?: string;
}

export function SchemaGenerator({ contentText, brandName, contentId, organizationId }: SchemaGeneratorProps) {
  const [schemaType, setSchemaType] = useState('Article');
  const [generating, setGenerating] = useState(false);
  const [jsonLd, setJsonLd] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!contentText.trim()) {
      toast.error('Không có nội dung để tạo schema');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('geo-generate-schema', {
        body: { contentText, schemaType, brandName },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setJsonLd(data.json_ld);

      // Save to DB if contentId provided
      if (contentId && organizationId) {
        await supabase.from('geo_schema_outputs').upsert({
          content_id: contentId,
          content_type: 'multi_channel',
          organization_id: organizationId,
          schema_type: schemaType,
          json_ld_code: data.json_ld,
          status: 'generated',
        } as any);
      }

      toast.success('Schema markup đã được tạo!');
    } catch (err: any) {
      toast.error('Lỗi: ' + (err.message || 'Không thể tạo schema'));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!jsonLd) return;
    const scriptTag = `<script type="application/ld+json">\n${jsonLd}\n</script>`;
    await navigator.clipboard.writeText(scriptTag);
    setCopied(true);
    toast.success('Đã copy schema markup!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileJson className="h-4 w-4 text-primary" />
          Schema Markup Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Select value={schemaType} onValueChange={setSchemaType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEMA_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  <div>
                    <span>{type.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{type.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={generating} size="sm">
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Code className="h-4 w-4 mr-1" />}
            {generating ? 'Đang tạo...' : 'Generate'}
          </Button>
        </div>

        {jsonLd && (
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="text-xs">
                {schemaType} — JSON-LD
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <pre className="bg-muted/50 rounded-lg p-3 text-xs overflow-x-auto max-h-[300px] overflow-y-auto border border-border/30">
              <code>{jsonLd}</code>
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
