/**
 * GlossaryTab - Display glossary terms with VI/EN translations
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  Search,
  Copy,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TranslationData } from '@/hooks/useGlobalPack';

interface GlossaryTabProps {
  translations: Record<string, TranslationData>;
}

export function GlossaryTab({ translations }: GlossaryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Combine glossary from all translations
  const allGlossaryItems: Array<{
    key: string;
    translations: Record<string, string>;
  }> = [];

  const glossaryMap = new Map<string, Record<string, string>>();

  Object.entries(translations).forEach(([lang, t]) => {
    if (t.glossary && typeof t.glossary === 'object') {
      Object.entries(t.glossary).forEach(([key, value]) => {
        const existing = glossaryMap.get(key) || {};
        existing[lang] = value;
        glossaryMap.set(key, existing);
      });
    }
  });

  glossaryMap.forEach((translations, key) => {
    allGlossaryItems.push({ key, translations });
  });

  const filteredItems = allGlossaryItems.filter(item =>
    !searchTerm ||
    item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    Object.values(item.translations).some(v => 
      v.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã copy vào clipboard');
  };

  const exportCSV = () => {
    const languages = Object.keys(translations);
    const headers = ['Key', ...languages];
    const rows = allGlossaryItems.map(item => [
      item.key,
      ...languages.map(lang => item.translations[lang] || '')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'glossary.csv';
    link.click();
    toast.success('Đã tải xuống glossary.csv');
  };

  if (allGlossaryItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Chưa có thuật ngữ Glossary nào</p>
          <p className="text-xs text-muted-foreground mt-2">
            Glossary được lưu trong industry_pack_translations
          </p>
        </CardContent>
      </Card>
    );
  }

  const availableLanguages = Object.keys(translations);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Tìm kiếm thuật ngữ..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary">
          {allGlossaryItems.length} thuật ngữ
        </Badge>
        {availableLanguages.map(lang => (
          <Badge key={lang} variant="outline" className="uppercase font-mono">
            {lang}
          </Badge>
        ))}
      </div>

      {/* Glossary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Glossary ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[60vh] sm:max-h-[500px] overflow-y-auto overscroll-contain">
            <div className="divide-y">
              {filteredItems.map((item, i) => (
                <div 
                  key={i} 
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {item.key}
                        </Badge>
                      </div>
                      <div className="grid gap-2">
                        {availableLanguages.map(lang => (
                          item.translations[lang] && (
                            <div key={lang} className="flex items-start gap-2">
                              <span className="text-xs uppercase font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                {lang}
                              </span>
                              <span className="text-sm">
                                {item.translations[lang]}
                              </span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(
                        availableLanguages.map(lang => 
                          item.translations[lang] || ''
                        ).filter(Boolean).join(' / ')
                      )}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {filteredItems.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                Không tìm thấy thuật ngữ nào
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
