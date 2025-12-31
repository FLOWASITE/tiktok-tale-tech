import { 
  CheckCircle, XCircle, Save, FileText, Images, Share2, Search,
  ExternalLink, ArrowRight, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  save_topic: Save,
  generate_script: FileText,
  generate_carousel: Images,
  generate_multichannel: Share2,
  search_topics: Search,
};

const TOOL_LABELS: Record<string, string> = {
  save_topic: 'Lưu Topic',
  generate_script: 'Tạo Script',
  generate_carousel: 'Tạo Carousel',
  generate_multichannel: 'Tạo Multi-Channel',
  search_topics: 'Tìm Topics',
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
          onClick={() => onNavigate('/scripts', { prefillTopic: result.title, prefillContent: result.content })}
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
