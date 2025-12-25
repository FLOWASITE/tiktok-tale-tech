import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check, Download, List, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { ExportPromptCard } from './ExportPromptCard';
import { downloadFile, sanitizeFilename } from '@/utils/scriptExportFormats';

export type ExportType =
  | 'veo3-full'
  | 'veo3-visual'
  | 'minimax-full'
  | 'minimax-visual'
  | 'dialogue-numbered'
  | 'dialogue-timed'
  | 'dialogue-joined';

interface ExportPromptData {
  promptNumber: number;
  timestamp?: string;
  content: string;
}

interface ExportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportType: ExportType;
  title: string;
  prompts: ExportPromptData[];
  fullContent: string;
  filename: string;
}

const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  'veo3-full': 'VEO 3 Full Prompt',
  'veo3-visual': 'VEO 3 Visual Only',
  'minimax-full': 'Minimax Full Prompt',
  'minimax-visual': 'Minimax Visual Only',
  'dialogue-numbered': 'Dialogue đánh số',
  'dialogue-timed': 'Dialogue + Timing',
  'dialogue-joined': 'Toàn bộ lời thoại',
};

const EXPORT_FILE_SUFFIX: Record<ExportType, string> = {
  'veo3-full': '_VEO3',
  'veo3-visual': '_VEO3_Visual',
  'minimax-full': '_Minimax',
  'minimax-visual': '_Minimax_Visual',
  'dialogue-numbered': '_Dialogue',
  'dialogue-timed': '_Dialogue_Timed',
  'dialogue-joined': '_Dialogue_Full',
};

export function ExportPreviewDialog({
  open,
  onOpenChange,
  exportType,
  title,
  prompts,
  fullContent,
  filename,
}: ExportPreviewDialogProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompts' | 'full'>('prompts');

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(fullContent);
    setCopied(true);
    toast.success('Đã sao chép toàn bộ nội dung!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const suffix = EXPORT_FILE_SUFFIX[exportType];
    downloadFile(fullContent, `${filename}${suffix}.txt`, 'text/plain');
    toast.success('Đã tải xuống file!');
  };

  // Syntax highlighting for full content view
  const highlightFullContent = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      // PROMPT headers
      if (line.match(/^={3,}$/)) {
        return (
          <span key={index} className="text-border block">
            {line}
          </span>
        );
      }
      
      if (line.match(/^PROMPT \d+/)) {
        return (
          <span key={index} className="text-primary font-bold block mt-2">
            {line}
          </span>
        );
      }
      
      // Section headers like [VISUAL DIRECTION], [DIALOGUE], etc.
      if (line.match(/^\[.+\]$/)) {
        return (
          <span key={index} className="text-primary font-semibold block">
            {line}
          </span>
        );
      }
      
      // Bullet points with labels
      if (line.match(/^[•\-]\s*\w+:/)) {
        const colonIndex = line.indexOf(':');
        const label = line.substring(0, colonIndex + 1);
        const rest = line.substring(colonIndex + 1);
        return (
          <span key={index} className="block">
            <span className="text-secondary">{label}</span>
            <span className="text-foreground">{rest}</span>
          </span>
        );
      }
      
      // Dialogue in quotes
      if (line.match(/^[""].+[""]$/)) {
        return (
          <span key={index} className="text-accent-foreground italic block">
            {line}
          </span>
        );
      }
      
      // Parenthetical stage directions
      if (line.match(/^\(.+\)$/)) {
        return (
          <span key={index} className="text-muted-foreground block">
            {line}
          </span>
        );
      }
      
      // Timestamps [00:00-00:08]
      if (line.match(/\[\d{2}:\d{2}[–-]\d{2}:\d{2}\]/)) {
        const parts = line.split(/(\[\d{2}:\d{2}[–-]\d{2}:\d{2}\])/g);
        return (
          <span key={index} className="block">
            {parts.map((part, i) =>
              part.match(/^\[\d{2}:\d{2}[–-]\d{2}:\d{2}\]$/) ? (
                <span key={i} className="text-muted-foreground font-mono text-xs">
                  {part}
                </span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </span>
        );
      }
      
      // Camera motion brackets [Pan left], etc.
      if (line.includes('[') && line.includes(']')) {
        const parts = line.split(/(\[[^\]]+\])/g);
        return (
          <span key={index} className="block">
            {parts.map((part, i) =>
              part.match(/^\[.+\]$/) ? (
                <span key={i} className="text-primary font-medium">{part}</span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </span>
        );
      }
      
      return (
        <span key={index} className="block">
          {line || ' '}
        </span>
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {title || EXPORT_TYPE_LABELS[exportType]}
          </DialogTitle>
          <DialogDescription>
            Xem và sao chép nội dung export • {prompts.length} prompt
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'prompts' | 'full')}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2 max-w-xs">
            <TabsTrigger value="prompts" className="flex items-center gap-1.5">
              <List className="w-3.5 h-3.5" />
              Theo Prompt
            </TabsTrigger>
            <TabsTrigger value="full" className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Toàn bộ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prompts" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {prompts.map((prompt) => (
                  <ExportPromptCard
                    key={prompt.promptNumber}
                    promptNumber={prompt.promptNumber}
                    timestamp={prompt.timestamp}
                    content={prompt.content}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="full" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[400px]">
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {highlightFullContent(fullContent)}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleCopyAll}
            className="flex-1 sm:flex-none"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-500" />
                Đã copy
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy tất cả
              </>
            )}
          </Button>
          <Button onClick={handleDownload} className="flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-2" />
            Tải xuống .txt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
