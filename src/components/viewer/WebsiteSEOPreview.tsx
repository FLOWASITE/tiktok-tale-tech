import React, { useMemo, useState } from 'react';
import { Globe, Search, FileText, Link2, Clock, Hash, ChevronRight, Copy, Check, AlertCircle, CheckCircle2, Facebook, Twitter, Lightbulb, BarChart3, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { WebsiteSEOData } from '@/types/multichannel';

interface WebsiteSEOPreviewProps {
  seoData: WebsiteSEOData | null;
  content: string | null;
  brandName?: string;
}

// SEO Score calculation
function calculateSEOScore(seoData: WebsiteSEOData | null, content: string | null): {
  overall: number;
  title: { score: number; message: string };
  meta: { score: number; message: string };
  keyword: { score: number; message: string };
  headings: { score: number; message: string };
  readability: { score: number; message: string };
} {
  if (!seoData) {
    return {
      overall: 0,
      title: { score: 0, message: 'Không có SEO title' },
      meta: { score: 0, message: 'Không có meta description' },
      keyword: { score: 0, message: 'Không có focus keyword' },
      headings: { score: 0, message: 'Không có heading structure' },
      readability: { score: 0, message: 'Không có nội dung' },
    };
  }

  // Title score (20 points max)
  const titleLength = seoData.seo_title?.length || 0;
  let titleScore = 0;
  let titleMessage = '';
  if (titleLength === 0) {
    titleMessage = 'Thiếu SEO title';
  } else if (titleLength < 30) {
    titleScore = 10;
    titleMessage = `Quá ngắn (${titleLength}/50-60 ký tự)`;
  } else if (titleLength >= 50 && titleLength <= 60) {
    titleScore = 20;
    titleMessage = `Tối ưu (${titleLength} ký tự)`;
  } else if (titleLength > 60 && titleLength <= 70) {
    titleScore = 15;
    titleMessage = `Hơi dài (${titleLength}/60 ký tự)`;
  } else if (titleLength > 70) {
    titleScore = 8;
    titleMessage = `Quá dài (${titleLength}/60 ký tự)`;
  } else {
    titleScore = 15;
    titleMessage = `Chấp nhận được (${titleLength} ký tự)`;
  }

  // Meta score (20 points max)
  const metaLength = seoData.meta_description?.length || 0;
  let metaScore = 0;
  let metaMessage = '';
  if (metaLength === 0) {
    metaMessage = 'Thiếu meta description';
  } else if (metaLength < 100) {
    metaScore = 10;
    metaMessage = `Quá ngắn (${metaLength}/150-160 ký tự)`;
  } else if (metaLength >= 150 && metaLength <= 160) {
    metaScore = 20;
    metaMessage = `Tối ưu (${metaLength} ký tự)`;
  } else if (metaLength > 160 && metaLength <= 180) {
    metaScore = 15;
    metaMessage = `Hơi dài (${metaLength}/160 ký tự)`;
  } else if (metaLength > 180) {
    metaScore = 8;
    metaMessage = `Quá dài, sẽ bị cắt (${metaLength}/160 ký tự)`;
  } else {
    metaScore = 15;
    metaMessage = `Chấp nhận được (${metaLength} ký tự)`;
  }

  // Keyword score (20 points max)
  let keywordScore = 0;
  let keywordMessage = '';
  if (!seoData.focus_keyword) {
    keywordMessage = 'Chưa có focus keyword';
  } else {
    keywordScore = 10;
    keywordMessage = 'Có focus keyword';
    
    // Check if keyword in title
    if (seoData.seo_title?.toLowerCase().includes(seoData.focus_keyword.toLowerCase())) {
      keywordScore += 5;
      keywordMessage = 'Keyword có trong title';
    }
    
    // Check if keyword in meta
    if (seoData.meta_description?.toLowerCase().includes(seoData.focus_keyword.toLowerCase())) {
      keywordScore += 5;
      keywordMessage = 'Keyword có trong title & meta';
    }
  }

  // Headings score (20 points max)
  let headingsScore = 0;
  let headingsMessage = '';
  const h2Count = seoData.heading_structure?.h2s?.length || 0;
  
  if (!seoData.heading_structure?.h1) {
    headingsMessage = 'Thiếu H1';
  } else {
    headingsScore = 5;
    if (h2Count === 0) {
      headingsMessage = 'Có H1, thiếu H2';
    } else if (h2Count >= 3 && h2Count <= 6) {
      headingsScore = 20;
      headingsMessage = `Tối ưu: H1 + ${h2Count} H2s`;
    } else if (h2Count < 3) {
      headingsScore = 12;
      headingsMessage = `Nên thêm H2 (${h2Count}/3-6)`;
    } else {
      headingsScore = 15;
      headingsMessage = `Hơi nhiều H2 (${h2Count}/6)`;
    }
  }

  // Readability score (20 points max)
  let readabilityScore = 0;
  let readabilityMessage = '';
  const wordCount = seoData.word_count || (content?.split(/\s+/).length || 0);
  
  if (wordCount === 0) {
    readabilityMessage = 'Không có nội dung';
  } else if (wordCount < 500) {
    readabilityScore = 8;
    readabilityMessage = `Nội dung ngắn (${wordCount}/1000+ từ)`;
  } else if (wordCount >= 1000 && wordCount <= 2000) {
    readabilityScore = 20;
    readabilityMessage = `Độ dài tối ưu (${wordCount} từ)`;
  } else if (wordCount >= 500 && wordCount < 1000) {
    readabilityScore = 15;
    readabilityMessage = `Chấp nhận được (${wordCount} từ)`;
  } else {
    readabilityScore = 18;
    readabilityMessage = `Bài dài (${wordCount} từ)`;
  }

  const overall = titleScore + metaScore + keywordScore + headingsScore + readabilityScore;

  return {
    overall,
    title: { score: titleScore, message: titleMessage },
    meta: { score: metaScore, message: metaMessage },
    keyword: { score: keywordScore, message: keywordMessage },
    headings: { score: headingsScore, message: headingsMessage },
    readability: { score: readabilityScore, message: readabilityMessage },
  };
}

// SERP Preview component
function SERPPreview({ seoData, brandName }: { seoData: WebsiteSEOData; brandName?: string }) {
  const domain = brandName ? `${brandName.toLowerCase().replace(/\s+/g, '')}.com` : 'example.com';
  const slug = seoData.slug_suggestion || 'bai-viet';
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  
  const handleCopy = async (text: string, field: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`Đã copy ${field}`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Không thể copy');
    }
  };
  
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Search className="h-3 w-3" />
          Google Search Preview
        </div>
        {/* Quick Copy Actions */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleCopy(seoData.seo_title || '', 'Title')}
                  disabled={!seoData.seo_title}
                >
                  {copiedField === 'Title' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy SEO Title</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleCopy(seoData.meta_description || '', 'Meta')}
                  disabled={!seoData.meta_description}
                >
                  {copiedField === 'Meta' ? <Check className="h-3 w-3 text-green-500" /> : <FileText className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy Meta Description</TooltipContent>
            </Tooltip>
            {seoData.focus_keyword && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleCopy(seoData.focus_keyword || '', 'Keyword')}
                  >
                    {copiedField === 'Keyword' ? <Check className="h-3 w-3 text-green-500" /> : <Hash className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy Focus Keyword</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>
      
      {/* Google result card */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Globe className="h-3 w-3 text-primary" />
          </div>
          <div className="text-xs text-muted-foreground">
            {domain} › {slug}
          </div>
        </div>
        
        <h3 className="text-lg text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium line-clamp-1">
          {seoData.seo_title || 'Chưa có SEO title'}
        </h3>
        
        <p className="text-sm text-muted-foreground line-clamp-2">
          {seoData.meta_description || 'Chưa có meta description'}
        </p>
      </div>
      
      {/* Character counts */}
      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
        <span className={seoData.seo_title?.length && seoData.seo_title.length > 60 ? 'text-destructive' : ''}>
          Title: {seoData.seo_title?.length || 0}/60
        </span>
        <span className={seoData.meta_description?.length && seoData.meta_description.length > 160 ? 'text-destructive' : ''}>
          Meta: {seoData.meta_description?.length || 0}/160
        </span>
      </div>
    </div>
  );
}

// Score Card component
function SEOScoreCard({ scores }: { scores: ReturnType<typeof calculateSEOScore> }) {
  const getScoreColor = (score: number, max: number) => {
    const percent = (score / max) * 100;
    if (percent >= 80) return 'text-green-600 dark:text-green-400';
    if (percent >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getOverallLabel = (score: number) => {
    if (score >= 80) return { label: 'Xuất sắc', color: 'bg-green-500' };
    if (score >= 60) return { label: 'Tốt', color: 'bg-blue-500' };
    if (score >= 40) return { label: 'Trung bình', color: 'bg-amber-500' };
    return { label: 'Cần cải thiện', color: 'bg-red-500' };
  };

  const overall = getOverallLabel(scores.overall);

  return (
    <div className="space-y-4">
      {/* Overall score */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/20"
            />
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${(scores.overall / 100) * 201} 201`}
              className={overall.color.replace('bg-', 'text-')}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold">{scores.overall}</span>
          </div>
        </div>
        
        <div>
          <Badge className={overall.color}>{overall.label}</Badge>
          <p className="text-sm text-muted-foreground mt-1">Điểm SEO tổng thể</p>
        </div>
      </div>

      {/* Individual scores */}
      <div className="space-y-3">
        {[
          { label: 'SEO Title', ...scores.title, max: 20, icon: FileText },
          { label: 'Meta Description', ...scores.meta, max: 20, icon: FileText },
          { label: 'Keywords', ...scores.keyword, max: 20, icon: Hash },
          { label: 'Headings', ...scores.headings, max: 20, icon: ChevronRight },
          { label: 'Readability', ...scores.readability, max: 20, icon: Clock },
        ].map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </div>
              <span className={getScoreColor(item.score, item.max)}>
                {item.score}/{item.max}
              </span>
            </div>
            <Progress value={(item.score / item.max) * 100} className="h-1.5" />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {item.score >= item.max * 0.8 ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : item.score >= item.max * 0.5 ? (
                <AlertCircle className="h-3 w-3 text-amber-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
              {item.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Heading Structure Tree
function HeadingStructureTree({ headingStructure }: { headingStructure: WebsiteSEOData['heading_structure'] }) {
  if (!headingStructure) {
    return <p className="text-sm text-muted-foreground">Không có dữ liệu heading</p>;
  }

  return (
    <div className="space-y-2">
      {/* H1 */}
      <div className="flex items-start gap-2">
        <Badge variant="outline" className="text-xs shrink-0">H1</Badge>
        <span className="text-sm font-medium">{headingStructure.h1 || 'Chưa có H1'}</span>
      </div>
      
      {/* H2s */}
      {headingStructure.h2s?.map((h2, idx) => (
        <div key={idx} className="flex items-start gap-2 ml-4">
          <Badge variant="secondary" className="text-xs shrink-0">H2</Badge>
          <span className="text-sm">{h2}</span>
        </div>
      ))}
      
      {/* H3s if available */}
      {headingStructure.h3s?.map((h3, idx) => (
        <div key={idx} className="flex items-start gap-2 ml-8">
          <Badge variant="outline" className="text-xs shrink-0 opacity-60">H3</Badge>
          <span className="text-sm text-muted-foreground">{h3}</span>
        </div>
      ))}
    </div>
  );
}

// Schema Generator
function SchemaGenerator({ seoData, brandName }: { seoData: WebsiteSEOData; brandName?: string }) {
  const [copied, setCopied] = React.useState(false);

  const schema = useMemo(() => {
    const schemaType = seoData.schema_type || 'Article';
    const baseSchema = {
      "@context": "https://schema.org",
      "@type": schemaType,
      "headline": seoData.seo_title,
      "description": seoData.meta_description,
      "keywords": [seoData.focus_keyword, ...(seoData.secondary_keywords || [])].join(', '),
      "author": {
        "@type": "Organization",
        "name": brandName || "Author"
      },
      "datePublished": new Date().toISOString().split('T')[0],
      "wordCount": seoData.word_count,
    };

    if (schemaType === 'HowTo' && seoData.heading_structure?.h2s) {
      return {
        ...baseSchema,
        "step": seoData.heading_structure.h2s.map((h2, idx) => ({
          "@type": "HowToStep",
          "position": idx + 1,
          "name": h2
        }))
      };
    }

    return baseSchema;
  }, [seoData, brandName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
    setCopied(true);
    toast.success('Đã copy Schema JSON-LD');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{seoData.schema_type || 'Article'}</Badge>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <pre className="bg-muted rounded-lg p-3 text-xs overflow-auto max-h-64">
        {JSON.stringify(schema, null, 2)}
      </pre>
    </div>
  );
}

// Social Share Preview Component
function SocialSharePreview({ seoData, brandName }: { seoData: WebsiteSEOData; brandName?: string }) {
  const domain = brandName ? `${brandName.toLowerCase().replace(/\s+/g, '')}.com` : 'example.com';
  
  // Use AI-generated OG data if available, fallback to SEO data
  const ogTitle = seoData.og_title || seoData.seo_title;
  const ogDescription = seoData.og_description || seoData.meta_description;
  
  // Calculate actual word count for validation
  const actualWordCount = useMemo(() => {
    const content = seoData.content || '';
    return content.split(/\s+/).filter(w => w.length > 0).length;
  }, [seoData.content]);
  
  const isContentShort = actualWordCount > 0 && actualWordCount < 500;
  
  return (
    <div className="space-y-4">
      {/* Warning for short content */}
      {isContentShort && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Nội dung chỉ có <strong>{actualWordCount} từ</strong> (yêu cầu 800-1500 từ). 
            Bài viết quá ngắn có thể ảnh hưởng SEO. Hãy thử tạo lại với chủ đề chi tiết hơn.
          </AlertDescription>
        </Alert>
      )}
      
      {/* AI SEO Score Badge if available */}
      {seoData.seo_score_estimate !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI SEO Score</span>
          </div>
          <Badge className={cn(
            seoData.seo_score_estimate >= 80 ? "bg-green-500" :
            seoData.seo_score_estimate >= 60 ? "bg-blue-500" :
            seoData.seo_score_estimate >= 40 ? "bg-amber-500" : "bg-red-500"
          )}>
            {seoData.seo_score_estimate}/100
          </Badge>
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* Facebook OG Preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Facebook className="h-3 w-3" />
            Facebook Share
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg border overflow-hidden">
            <div className="h-24 bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
              <Globe className="h-8 w-8 opacity-30" />
            </div>
            <div className="p-3 border-t">
              <p className="text-[10px] text-muted-foreground uppercase">{domain}</p>
              <p className="text-sm font-medium line-clamp-1">{ogTitle || 'Chưa có title'}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{ogDescription || 'Chưa có description'}</p>
            </div>
          </div>
        </div>
        
        {/* Twitter Card Preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Twitter className="h-3 w-3" />
            Twitter Card
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden">
            <div className="h-24 bg-gradient-to-br from-sky-500/20 to-sky-500/40 flex items-center justify-center">
              <Globe className="h-8 w-8 opacity-30" />
            </div>
            <div className="p-3">
              <p className="text-sm font-medium line-clamp-1">{ogTitle || 'Chưa có title'}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{ogDescription || 'Chưa có description'}</p>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                {domain}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* FAQ Schema Preview */}
      {seoData.faq_items && seoData.faq_items.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            FAQ Schema ({seoData.faq_items.length} items)
          </h4>
          <div className="space-y-2">
            {seoData.faq_items.map((faq, idx) => (
              <Collapsible key={idx}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <ChevronRight className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{faq.question}</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 pr-2 py-2 text-sm text-muted-foreground">
                  {faq.answer}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// SEO Improvement Tips Component
function SEOImprovementTips({ scores }: { scores: ReturnType<typeof calculateSEOScore> }) {
  const tips = useMemo(() => {
    const result: { type: 'error' | 'warning' | 'success'; message: string }[] = [];
    
    if (scores.title.score < 15) {
      result.push({ type: 'error', message: 'Title nên dài 50-60 ký tự để hiển thị đầy đủ trên SERP' });
    }
    if (scores.meta.score < 15) {
      result.push({ type: 'error', message: 'Meta description nên dài 150-160 ký tự để tối ưu CTR' });
    }
    if (scores.keyword.score < 10) {
      result.push({ type: 'warning', message: 'Thêm focus keyword vào title và meta description' });
    }
    if (scores.headings.score < 10) {
      result.push({ type: 'warning', message: 'Sử dụng heading H2/H3 để cấu trúc nội dung rõ ràng' });
    }
    if (scores.readability.score < 10) {
      result.push({ type: 'warning', message: 'Nội dung nên dài ít nhất 800 từ cho SEO tốt hơn' });
    }
    if (scores.overall >= 80) {
      result.push({ type: 'success', message: 'SEO đã được tối ưu tốt! Tiếp tục duy trì chất lượng.' });
    }
    
    return result;
  }, [scores]);
  
  if (tips.length === 0) return null;
  
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        Gợi ý cải thiện
      </h4>
      <div className="space-y-1.5">
        {tips.map((tip, idx) => (
          <div 
            key={idx}
            className={cn(
              "flex items-start gap-2 text-xs p-2 rounded-lg",
              tip.type === 'error' && "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300",
              tip.type === 'warning' && "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
              tip.type === 'success' && "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
            )}
          >
            {tip.type === 'error' && <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
            {tip.type === 'warning' && <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
            {tip.type === 'success' && <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
            <span>{tip.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Keyword Density Component - supports AI-generated density
function KeywordDensity({ content, focusKeyword, aiDensity }: { 
  content: string | null; 
  focusKeyword?: string;
  aiDensity?: number;
}) {
  const density = useMemo(() => {
    // Use AI-generated density if available
    if (aiDensity !== undefined && focusKeyword) {
      const wordCount = content?.split(/\s+/).length || 0;
      const estimatedCount = Math.round((aiDensity / 100) * wordCount);
      return {
        count: estimatedCount,
        total: wordCount,
        percentage: aiDensity.toFixed(2),
        status: aiDensity >= 1 && aiDensity <= 3 ? 'optimal' : aiDensity < 1 ? 'low' : 'high',
        source: 'ai' as const
      };
    }
    
    // Fallback to manual calculation
    if (!content || !focusKeyword) return null;
    
    const words = content.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    const keywordLower = focusKeyword.toLowerCase();
    const keywordCount = words.filter(w => w.includes(keywordLower)).length;
    const percentage = totalWords > 0 ? (keywordCount / totalWords) * 100 : 0;
    
    return {
      count: keywordCount,
      total: totalWords,
      percentage: percentage.toFixed(2),
      status: percentage >= 1 && percentage <= 3 ? 'optimal' : percentage < 1 ? 'low' : 'high',
      source: 'calculated' as const
    };
  }, [content, focusKeyword, aiDensity]);
  
  if (!density) return null;
  
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        Keyword Density
        {density.source === 'ai' && (
          <Badge variant="outline" className="text-[10px] h-4 px-1">AI</Badge>
        )}
      </h4>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Progress 
            value={Math.min(100, parseFloat(density.percentage) * 33)} 
            className="h-2"
          />
        </div>
        <Badge 
          variant={density.status === 'optimal' ? 'default' : 'secondary'}
          className={cn(
            density.status === 'optimal' && "bg-green-500",
            density.status === 'low' && "bg-amber-500",
            density.status === 'high' && "bg-red-500"
          )}
        >
          {density.percentage}%
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        "{focusKeyword}" xuất hiện ~{density.count} lần trong {density.total} từ
        {density.status === 'optimal' && ' - Tối ưu!'}
        {density.status === 'low' && ' - Nên thêm keyword'}
        {density.status === 'high' && ' - Có thể bị xem là spam'}
      </p>
    </div>
  );
}

export function WebsiteSEOPreview({ seoData, content, brandName }: WebsiteSEOPreviewProps) {
  const scores = useMemo(() => calculateSEOScore(seoData, content), [seoData, content]);
  const [showTips, setShowTips] = useState(false);

  // Copy all SEO data
  const handleCopyAllSEO = async () => {
    if (!seoData) return;
    const allData = {
      title: seoData.seo_title,
      metaDescription: seoData.meta_description,
      focusKeyword: seoData.focus_keyword,
      secondaryKeywords: seoData.secondary_keywords,
      slug: seoData.slug_suggestion,
      wordCount: seoData.word_count,
      readingTime: seoData.reading_time_minutes
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(allData, null, 2));
      toast.success('Đã copy tất cả dữ liệu SEO');
    } catch {
      toast.error('Không thể copy');
    }
  };

  if (!seoData) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Không có dữ liệu SEO</p>
          <p className="text-xs mt-1">Nội dung website được tạo ở phiên bản cũ</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Header with Copy All button */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Search className="h-4 w-4" />
            SEO Analysis
          </h3>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleCopyAllSEO}>
            <Copy className="h-3 w-3 mr-1" />
            Copy All
          </Button>
        </div>
        
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="preview" className="text-xs">SERP</TabsTrigger>
            <TabsTrigger value="social" className="text-xs">Social</TabsTrigger>
            <TabsTrigger value="score" className="text-xs">Score</TabsTrigger>
            <TabsTrigger value="structure" className="text-xs">Headings</TabsTrigger>
            <TabsTrigger value="schema" className="text-xs">Schema</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4 space-y-4">
            <SERPPreview seoData={seoData} brandName={brandName} />
            
            {/* Keyword Density */}
            {seoData.focus_keyword && (
              <KeywordDensity 
                content={content} 
                focusKeyword={seoData.focus_keyword}
                aiDensity={seoData.keyword_density_percent}
              />
            )}
            
            {/* Keywords */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">{seoData.focus_keyword}</Badge>
                {seoData.secondary_keywords?.map((kw, idx) => (
                  <Badge key={idx} variant="secondary">{kw}</Badge>
                ))}
              </div>
            </div>

            {/* Featured Snippet */}
            {seoData.featured_snippet && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Featured Snippet</h4>
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm">{seoData.featured_snippet}</p>
                </div>
              </div>
            )}

            {/* Internal Links */}
            {seoData.internal_link_anchors && seoData.internal_link_anchors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Internal Link Suggestions
                </h4>
                <div className="flex flex-wrap gap-2">
                  {seoData.internal_link_anchors.map((anchor, idx) => (
                    <Tooltip key={idx}>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="cursor-help">
                          {anchor}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Gợi ý anchor text cho internal link</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}

            {/* Reading time & word count */}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {seoData.reading_time_minutes || Math.ceil((seoData.word_count || 0) / 200)} phút đọc
              </span>
              <span>
                {seoData.word_count || content?.split(/\s+/).length || 0} từ
              </span>
            </div>
          </TabsContent>

          <TabsContent value="social" className="mt-4">
            <SocialSharePreview seoData={seoData} brandName={brandName} />
          </TabsContent>

          <TabsContent value="score" className="mt-4 space-y-4">
            <SEOScoreCard scores={scores} />
            
            {/* Collapsible Improvement Tips */}
            <Collapsible open={showTips} onOpenChange={setShowTips}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Gợi ý cải thiện SEO
                  </span>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", showTips && "rotate-90")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <SEOImprovementTips scores={scores} />
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          <TabsContent value="structure" className="mt-4">
            <HeadingStructureTree headingStructure={seoData.heading_structure} />
          </TabsContent>

          <TabsContent value="schema" className="mt-4">
            <SchemaGenerator seoData={seoData} brandName={brandName} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

export default WebsiteSEOPreview;
