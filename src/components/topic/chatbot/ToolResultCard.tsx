import { 
  CheckCircle, XCircle, Save, FileText, Images, Share2, Search,
  ExternalLink, ArrowRight, Loader2, Calendar, Play, ListChecks,
  Settings, Eye, Globe, ImageIcon, Paintbrush, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ContentPipelineSteps } from './ContentPipelineSteps';

export interface ToolResult {
  success: boolean;
  tool_name: string;
  result: any;
  error?: string;
}

interface ToolResultCardProps {
  toolResult: ToolResult;
  onNavigate?: (path: string, state?: any) => void;
  className?: string;
}

const TOOL_ICONS: Record<string, React.ElementType> = {
  web_search: Globe,
  save_topic: Save,
  generate_script: FileText,
  generate_carousel: Images,
  generate_multichannel: Share2,
  search_topics: Search,
  start_planning_session: Calendar,
  generate_plan_draft: ListChecks,
  refine_plan: Settings,
  finalize_plan: CheckCircle,
  get_active_session: Eye,
  generate_image: ImageIcon,
  edit_image: Paintbrush,
};

const TOOL_LABELS: Record<string, string> = {
  web_search: 'Tìm kiếm Web',
  save_topic: 'Lưu Topic',
  generate_script: 'Tạo Script',
  generate_carousel: 'Tạo Carousel',
  generate_multichannel: 'Tạo Multi-Channel',
  search_topics: 'Tìm Topics',
  start_planning_session: 'Bắt đầu Planning',
  generate_plan_draft: 'Tạo Kế hoạch',
  refine_plan: 'Chỉnh sửa Plan',
  finalize_plan: 'Hoàn thành Plan',
  get_active_session: 'Xem Session',
  generate_image: 'Tạo Ảnh AI',
  edit_image: 'Chỉnh sửa Ảnh',
};

export function ToolResultCard({ toolResult, onNavigate, className }: ToolResultCardProps) {
  const Icon = TOOL_ICONS[toolResult.tool_name] || FileText;
  const label = TOOL_LABELS[toolResult.tool_name] || toolResult.tool_name;

  if (!toolResult.success) {
    return (
      <Card className={cn("border-destructive/50 bg-destructive/5", className)}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">{label} thất bại</p>
              <p className="text-xs text-muted-foreground mt-1">{toolResult.error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{label}</p>
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                Thành công
              </Badge>
            </div>
            
            {/* Tool-specific content */}
            {toolResult.tool_name === 'save_topic' && (
              <SaveTopicResult result={toolResult.result} />
            )}
            
            {toolResult.tool_name === 'generate_script' && (
              <ScriptResult result={toolResult.result} onNavigate={onNavigate} />
            )}
            
            {toolResult.tool_name === 'generate_carousel' && (
              <CarouselResult result={toolResult.result} onNavigate={onNavigate} />
            )}
            
            {toolResult.tool_name === 'generate_multichannel' && (
              <MultichannelResult result={toolResult.result} onNavigate={onNavigate} />
            )}
            
            {toolResult.tool_name === 'search_topics' && (
              <SearchTopicsResult result={toolResult.result} />
            )}

            {toolResult.tool_name === 'web_search' && (
              <WebSearchResult result={toolResult.result} />
            )}

            {/* Planning tools */}
            {toolResult.tool_name === 'start_planning_session' && (
              <PlanningSessionResult result={toolResult.result} />
            )}

            {toolResult.tool_name === 'generate_plan_draft' && (
              <PlanDraftResult result={toolResult.result} onNavigate={onNavigate} />
            )}

            {toolResult.tool_name === 'refine_plan' && (
              <RefinePlanResult result={toolResult.result} />
            )}

            {toolResult.tool_name === 'finalize_plan' && (
              <FinalizePlanResult result={toolResult.result} onNavigate={onNavigate} />
            )}

            {toolResult.tool_name === 'get_active_session' && (
              <ActiveSessionResult result={toolResult.result} />
            )}

            {toolResult.tool_name === 'generate_image' && (
              <GenerateImageResult result={toolResult.result} />
            )}

            {toolResult.tool_name === 'edit_image' && (
              <EditImageResult result={toolResult.result} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SaveTopicResult({ result }: { result: any }) {
  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs text-muted-foreground">{result.message}</p>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">{result.category}</Badge>
      </div>
    </div>
  );
}

function ScriptResult({ result, onNavigate }: { result: any; onNavigate?: (path: string, state?: any) => void }) {
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-muted-foreground line-clamp-3">{result.preview || result.content?.slice(0, 200)}</p>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">{result.video_type}</Badge>
        <Badge variant="outline" className="text-[10px]">{result.duration}s</Badge>
      </div>
      {onNavigate && (
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-xs gap-1.5"
          onClick={() => onNavigate('/videos', { tab: 'scripts', prefillTopic: result.title, prefillContent: result.content, action: 'new' })}
        >
          Mở & Chỉnh sửa
          <ArrowRight className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

function CarouselResult({ result, onNavigate }: { result: any; onNavigate?: (path: string, state?: any) => void }) {
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-muted-foreground">{result.message}</p>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">{result.platform}</Badge>
        <Badge variant="outline" className="text-[10px]">{result.slide_count} slides</Badge>
      </div>
      {onNavigate && (
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-xs gap-1.5"
          onClick={() => onNavigate('/carousel', { prefillTopic: result.title })}
        >
          Mở & Chỉnh sửa
          <ArrowRight className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

function MultichannelResult({ result, onNavigate }: { result: any; onNavigate?: (path: string, state?: any) => void }) {
  // Use pipeline steps view when data is available (2-step pipeline)
  const hasPipelineData = result.pipeline_steps?.length > 0 && result.content_role;

  if (hasPipelineData) {
    return <ContentPipelineSteps result={result} onNavigate={onNavigate} />;
  }

  // Fallback: simple badges + preview (legacy or topic-based fallback)
  const channels = result.channels || [];
  const previews = result.channel_previews || {};

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-muted-foreground">{result.message}</p>
      <div className="flex flex-wrap gap-1">
        {channels.map((channel: string) => (
          <Badge key={channel} variant="outline" className="text-[10px] capitalize">{channel}</Badge>
        ))}
      </div>
      {Object.keys(previews).length > 0 && (
        <div className="text-[10px] text-muted-foreground bg-muted/50 rounded p-2 max-h-24 overflow-y-auto">
          {Object.entries(previews).slice(0, 2).map(([channel, content]) => (
            <div key={channel} className="mb-1">
              <span className="font-medium capitalize">{channel}:</span>{' '}
              <span className="line-clamp-1">{String(content)}</span>
            </div>
          ))}
        </div>
      )}
      {onNavigate && (
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-xs gap-1.5"
          onClick={() => onNavigate('/multichannel', { prefillTopic: result.topic })}
        >
          Mở & Chỉnh sửa
          <ArrowRight className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

function SearchTopicsResult({ result }: { result: any }) {
  const topics = result.topics || [];

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-muted-foreground">{result.message}</p>
      {topics.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {topics.slice(0, 5).map((topic: any) => (
            <div key={topic.id} className="text-xs p-1.5 bg-muted/50 rounded flex items-center justify-between">
              <span className="line-clamp-1 flex-1">{topic.topic}</span>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {topic.score && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1">{topic.score}pts</Badge>
                )}
                <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">{topic.category}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ WEB SEARCH RESULT ============

function WebSearchResult({ result }: { result: any }) {
  const searchTypeBadges: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    trending: { label: '🔥 Trending', variant: 'default' },
    news: { label: '📰 Tin tức', variant: 'secondary' },
    competitor: { label: '🎯 Competitor', variant: 'outline' },
    general: { label: '🔍 Chung', variant: 'outline' },
  };

  const badge = searchTypeBadges[result.search_type] || searchTypeBadges.general;
  const results = result.results || [];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
        <span className="text-[10px] text-muted-foreground">
          {result.total_results} kết quả cho "{result.query}"
        </span>
      </div>

      {results.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {results.slice(0, 5).map((item: any, index: number) => (
            <div 
              key={index}
              className="p-2 bg-muted/50 rounded-md border border-border/50 space-y-1"
            >
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-primary shrink-0">{index + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-1">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{item.snippet}</p>
                  {item.content_angle && (
                    <p className="text-[10px] text-primary/80 mt-1 italic">
                      💡 {item.content_angle}
                    </p>
                  )}
                  {item.source && (
                    <a 
                      href={item.source} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-1"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      Nguồn
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {result.citations?.length > 0 && (
        <div className="pt-1 border-t border-border/50">
          <p className="text-[9px] text-muted-foreground mb-1">Nguồn tham khảo:</p>
          <div className="flex flex-wrap gap-1">
            {result.citations.slice(0, 3).map((citation: string, i: number) => {
              try {
                const hostname = new URL(citation).hostname;
                return (
                  <a
                    key={i}
                    href={citation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] text-blue-500 hover:underline"
                  >
                    [{i + 1}] {hostname}
                  </a>
                );
              } catch {
                return null;
              }
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ PLANNING RESULT COMPONENTS ============


function PlanningSessionResult({ result }: { result: any }) {
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-muted-foreground">{result.message}</p>
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px] capitalize">{result.session_type}</Badge>
        <Badge variant="secondary" className="text-[10px]">{result.status}</Badge>
      </div>
      <div className="text-[10px] text-muted-foreground">
        {result.timeframe_start} → {result.timeframe_end}
      </div>
    </div>
  );
}

function PlanDraftResult({ result, onNavigate }: { result: any; onNavigate?: (path: string, state?: any) => void }) {
  const items = result.items || [];
  
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-muted-foreground">{result.message}</p>
      <div className="text-[10px] text-muted-foreground">{result.timeframe}</div>
      
      {items.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {items.slice(0, 7).map((item: any, index: number) => (
            <div key={index} className="text-xs p-2 bg-muted/50 rounded flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[10px] text-muted-foreground shrink-0 w-16">{item.date}</span>
                <span className="line-clamp-1">{item.topic}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">{item.format}</Badge>
                <Badge 
                  variant={item.priority === 'high' ? 'destructive' : 'secondary'} 
                  className="text-[9px] h-4 px-1"
                >
                  {item.priority}
                </Badge>
              </div>
            </div>
          ))}
          {items.length > 7 && (
            <p className="text-[10px] text-muted-foreground text-center">
              +{items.length - 7} more items...
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RefinePlanResult({ result }: { result: any }) {
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-muted-foreground">{result.message}</p>
      <Badge variant="outline" className="text-[10px] capitalize">{result.action}</Badge>
      {result.updated_items && (
        <p className="text-[10px] text-muted-foreground">
          {result.updated_items.length} items trong plan
        </p>
      )}
    </div>
  );
}

function FinalizePlanResult({ result, onNavigate }: { result: any; onNavigate?: (path: string, state?: any) => void }) {
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-muted-foreground">{result.message}</p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-[10px]">
          <Save className="w-3 h-3 mr-1" />
          {result.saved_topics} topics saved
        </Badge>
        {result.calendar_entries > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            <Calendar className="w-3 h-3 mr-1" />
            {result.calendar_entries} calendar entries
          </Badge>
        )}
      </div>
      {onNavigate && (
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-xs gap-1.5"
          onClick={() => onNavigate('/topics')}
        >
          Xem Topic Bank
          <ArrowRight className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

function ActiveSessionResult({ result }: { result: any }) {
  const session = result.session || {};
  const items = result.items || [];
  
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-muted-foreground">{result.message}</p>
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px] capitalize">{session.session_type}</Badge>
        <Badge variant="secondary" className="text-[10px]">{session.status}</Badge>
        <Badge variant="secondary" className="text-[10px]">{session.total_topics} topics</Badge>
      </div>
      {items.length > 0 && (
        <div className="text-[10px] text-muted-foreground">
          {items.length} planned items từ {session.timeframe_start} đến {session.timeframe_end}
        </div>
      )}
    </div>
  );
}

// ============ IMAGE RESULT COMPONENTS ============

function GenerateImageResult({ result }: { result: any }) {
  const handleDownload = () => {
    if (result.image_url) {
      window.open(result.image_url, '_blank');
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-muted-foreground">{result.message}</p>
      
      {result.image_url ? (
        <div className="relative rounded-lg overflow-hidden border border-border/50 max-w-[280px]">
          <img 
            src={result.image_url} 
            alt="AI Generated" 
            className="w-full h-auto object-cover"
            loading="lazy"
          />
          <div className="absolute top-1.5 right-1.5">
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-background/80 backdrop-blur-sm">
              {result.model_used}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 max-w-[280px] text-center">
          <p className="text-xs text-muted-foreground">⏳ Ảnh đang được xử lý hoặc không khả dụng.</p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-1">
        {result.style && (
          <Badge variant="outline" className="text-[10px] capitalize">{result.style}</Badge>
        )}
        {result.aspect_ratio && (
          <Badge variant="outline" className="text-[10px]">{result.aspect_ratio}</Badge>
        )}
        {result.channel && result.channel !== 'general' && (
          <Badge variant="secondary" className="text-[10px] capitalize">{result.channel}</Badge>
        )}
      </div>

      {result.image_url && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={handleDownload}
        >
          <Download className="w-3 h-3" />
          Tải ảnh
        </Button>
      )}
    </div>
  );
}

function EditImageResult({ result }: { result: any }) {
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-muted-foreground">{result.message}</p>
      
      {result.edited_url || result.original_url ? (
        <div className="flex gap-2 max-w-[400px]">
          {result.original_url && (
            <div className="flex-1 space-y-1">
              <p className="text-[10px] text-muted-foreground text-center">Gốc</p>
              <div className="rounded-md overflow-hidden border border-border/50">
                <img src={result.original_url} alt="Original" className="w-full h-auto object-cover" loading="lazy" />
              </div>
            </div>
          )}
          {result.edited_url && (
            <div className="flex-1 space-y-1">
              <p className="text-[10px] text-primary text-center font-medium">Đã sửa</p>
              <div className="rounded-md overflow-hidden border border-primary/30">
                <img src={result.edited_url} alt="Edited" className="w-full h-auto object-cover" loading="lazy" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 max-w-[280px] text-center">
          <p className="text-xs text-muted-foreground">⏳ Ảnh chỉnh sửa đang được xử lý hoặc không khả dụng.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px] capitalize">{result.edit_type?.replace('_', ' ')}</Badge>
        {result.model_used && (
          <Badge variant="secondary" className="text-[10px]">{result.model_used}</Badge>
        )}
      </div>
    </div>
  );
}

// Loading state for when tools are being executed
export function ToolExecutionLoading({ toolNames }: { toolNames: string[] }) {
  return (
    <Card className="border-primary/20 bg-primary/5 animate-pulse">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">
            Đang thực thi: {toolNames.map(t => TOOL_LABELS[t] || t).join(', ')}...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
