/**
 * TerminologyTab - Display forbidden terms, preferred terms, high-risk keywords, risk weights, auto-block
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Scale,
  Search,
  Copy,
  Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Terminology {
  forbidden_terms_global?: string[];
  preferred_terms?: Record<string, string | string[]>;
}

interface RiskGuidelines {
  high_risk_keywords?: string[];
  weights?: Record<string, number>;
  scoring_weights?: Record<string, number>;
  auto_block_conditions?: string[];
}

interface TerminologyTabProps {
  terminology: Terminology;
  riskGuidelines: RiskGuidelines;
  translationForbiddenTerms?: string[];
  translationPreferredTerms?: string[];
}

const LANG_LABELS: Record<string, string> = {
  vi: '🇻🇳 Tiếng Việt',
  en: '🇬🇧 English',
  zh: '🇨🇳 中文',
  th: '🇹🇭 ไทย',
  id: '🇮🇩 Indonesia',
  ms: '🇲🇾 Malay',
};

export function TerminologyTab({ 
  terminology, 
  riskGuidelines,
  translationForbiddenTerms = [],
  translationPreferredTerms = [],
}: TerminologyTabProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const forbiddenTerms = terminology.forbidden_terms_global || [];
  const preferredTermsRaw = terminology.preferred_terms || {};
  const highRiskKeywords = riskGuidelines.high_risk_keywords || [];
  const weights = riskGuidelines.scoring_weights || riskGuidelines.weights || {};
  const autoBlockConditions = riskGuidelines.auto_block_conditions || [];

  // Normalize preferred_terms to Record<string, string[]>
  const preferredTerms: Record<string, string[]> = Object.fromEntries(
    Object.entries(preferredTermsRaw).map(([k, v]) => [
      k,
      Array.isArray(v) ? v : (typeof v === 'string' && v ? [v] : []),
    ])
  );

  const allForbiddenTerms = [...new Set([...forbiddenTerms, ...translationForbiddenTerms])];

  const filteredForbiddenTerms = allForbiddenTerms.filter(term =>
    !searchTerm || term.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHighRiskKeywords = highRiskKeywords.filter(keyword =>
    !searchTerm || keyword.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAutoBlock = autoBlockConditions.filter(c =>
    !searchTerm || c.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group preferred terms by lang, filtering each
  const filteredPreferredByLang: Array<[string, string[]]> = Object.entries(preferredTerms)
    .map(([lang, terms]) => {
      const filtered = terms.filter(t =>
        !searchTerm ||
        t.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return [lang, filtered] as [string, string[]];
    })
    .filter(([, terms]) => terms.length > 0);

  const totalPreferredCount = filteredPreferredByLang.reduce((s, [, t]) => s + t.length, 0);

  const copyAll = (items: string[], label: string) => {
    navigator.clipboard.writeText(items.join('\n'));
    toast.success(`Đã copy ${items.length} ${label}`);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Tìm kiếm thuật ngữ..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Forbidden Terms */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Forbidden Terms ({filteredForbiddenTerms.length})
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => copyAll(filteredForbiddenTerms, 'forbidden terms')}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[200px]">
            {filteredForbiddenTerms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {filteredForbiddenTerms.map((term, i) => (
                  <Badge 
                    key={i} 
                    variant="destructive" 
                    className="text-sm bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20"
                  >
                    {term}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                {searchTerm ? 'Không tìm thấy' : 'Không có dữ liệu'}
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* High Risk Keywords */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              High Risk Keywords ({filteredHighRiskKeywords.length})
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => copyAll(filteredHighRiskKeywords, 'high risk keywords')}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[200px]">
            {filteredHighRiskKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {filteredHighRiskKeywords.map((keyword, i) => (
                  <Badge 
                    key={i} 
                    variant="outline"
                    className="text-sm bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/20"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                {searchTerm ? 'Không tìm thấy' : 'Không có dữ liệu'}
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Preferred Terms (grouped by language) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Preferred Terms ({totalPreferredCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[400px]">
            {filteredPreferredByLang.length > 0 ? (
              <div className="space-y-4">
                {filteredPreferredByLang.map(([lang, terms]) => (
                  <div key={lang} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono bg-muted">
                        {LANG_LABELS[lang] || lang.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{terms.length} terms</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-2">
                      {terms.map((term, i) => (
                        <Badge 
                          key={i}
                          variant="secondary"
                          className="text-sm bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
                        >
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">
                {searchTerm ? 'Không tìm thấy' : 'Không có dữ liệu'}
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Translation Terms */}
      {translationPreferredTerms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              Preferred Terms (Translation) ({translationPreferredTerms.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {translationPreferredTerms.map((term, i) => (
                <Badge 
                  key={i} 
                  variant="secondary"
                  className="text-sm bg-blue-500/10 text-blue-600 border-blue-500/20"
                >
                  {term}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto Block Conditions */}
      {filteredAutoBlock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" />
              Auto Block Conditions ({filteredAutoBlock.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {filteredAutoBlock.map((cond, i) => (
                <li 
                  key={i}
                  className="flex items-start gap-2 text-sm p-3 rounded bg-red-500/5 border border-red-500/20"
                >
                  <Ban className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{cond}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Risk Scoring Weights */}
      {Object.keys(weights).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Risk Scoring Weights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(weights).map(([key, value]) => (
                <div 
                  key={key} 
                  className="p-3 rounded-lg bg-muted/50 text-center"
                >
                  <p className="text-xs text-muted-foreground mb-1 truncate" title={key}>
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="text-lg font-bold text-primary">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
