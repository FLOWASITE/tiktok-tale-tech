import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  Video,
  Mic,
  FileText,
  Copy,
  Check,
  ChevronDown,
  Film,
  MessageSquare,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Script } from '@/types/script';
import { parseScriptContent } from '@/utils/parsePrompts';
import {
  formatForVEO3,
  formatForMinimax,
  exportVEO3Text,
  exportVEO3VisualOnly,
  exportVEO3JSON,
  exportMinimaxText,
  exportMinimaxVisualOnly,
  exportCleanDialogue,
  exportDialogueWithTiming,
  exportTXT,
  exportWordHTML,
  downloadFile,
  sanitizeFilename,
  calculateTimestamp,
  VEO3Prompt,
  MinimaxPrompt,
} from '@/utils/scriptExportFormats';
import { ExportPreviewDialog, ExportType } from './ExportPreviewDialog';

interface ScriptExportMenuProps {
  script: Script;
  className?: string;
}

export function ScriptExportMenu({ script, className }: ScriptExportMenuProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<ExportType>('veo3-full');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewPrompts, setPreviewPrompts] = useState<
    { promptNumber: number; timestamp?: string; content: string }[]
  >([]);
  const [previewFullContent, setPreviewFullContent] = useState('');

  const parsedPrompts = parseScriptContent(script.content);
  const veo3Prompts = formatForVEO3(parsedPrompts, script);
  const minimaxPrompts = formatForMinimax(parsedPrompts, script);
  const filename = sanitizeFilename(script.title);

  const handleCopy = async (content: string, label: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(label);
    toast.success(`Đã sao chép ${label}!`);
    setTimeout(() => setCopied(null), 2000);
  };

  // Format individual VEO3 prompt for preview
  const formatVEO3PromptContent = (prompt: VEO3Prompt): string => {
    let content = '[VISUAL DIRECTION]\n';
    content += `• Shot: ${prompt.visualDirection.shot}\n`;
    content += `• Camera: ${prompt.visualDirection.camera}\n`;
    content += `• Lighting: ${prompt.visualDirection.lighting}\n`;
    content += `• Background: ${prompt.visualDirection.background}\n\n`;
    content += '[CHARACTER ACTION]\n';
    content += `${prompt.characterAction}\n\n`;
    content += '[DIALOGUE]\n';
    content += `"${prompt.dialogue}"\n\n`;
    content += '[TONE & DELIVERY]\n';
    content += `${prompt.toneDelivery}\n\n`;
    content += '[AUDIO NOTES]\n';
    content += `• Ambience: ${prompt.audioNotes.ambience}\n`;
    content += `• SFX: ${prompt.audioNotes.sfx}\n`;
    content += `• Music Mood: ${prompt.audioNotes.musicMood}`;
    if (prompt.textOverlay) {
      content += `\n\n[TEXT OVERLAY]\n${prompt.textOverlay}`;
    }
    return content;
  };

  // Format individual VEO3 visual-only prompt
  const formatVEO3VisualContent = (prompt: VEO3Prompt): string => {
    return `Shot: ${prompt.visualDirection.shot}\nCamera: ${prompt.visualDirection.camera}\nLighting: ${prompt.visualDirection.lighting}\nBackground: ${prompt.visualDirection.background}\nAction: ${prompt.characterAction}`;
  };

  // Format individual Minimax prompt
  const formatMinimaxPromptContent = (prompt: MinimaxPrompt): string => {
    return `${prompt.visualPrompt} ${prompt.cameraMotion}\n\nDialogue: "${prompt.dialogue}"`;
  };

  // Format individual Minimax visual-only
  const formatMinimaxVisualContent = (prompt: MinimaxPrompt): string => {
    return `${prompt.visualPrompt} ${prompt.cameraMotion}`;
  };

  // Open preview for VEO3 Full
  const handlePreviewVEO3Full = () => {
    const prompts = veo3Prompts.map((p, i) => ({
      promptNumber: i + 1,
      timestamp: p.timestamp,
      content: formatVEO3PromptContent(p),
    }));
    setPreviewType('veo3-full');
    setPreviewTitle('VEO 3 Full Prompt');
    setPreviewPrompts(prompts);
    setPreviewFullContent(exportVEO3Text(veo3Prompts));
    setPreviewOpen(true);
  };

  // Open preview for VEO3 Visual
  const handlePreviewVEO3Visual = () => {
    const prompts = veo3Prompts.map((p, i) => ({
      promptNumber: i + 1,
      timestamp: p.timestamp,
      content: formatVEO3VisualContent(p),
    }));
    setPreviewType('veo3-visual');
    setPreviewTitle('VEO 3 Visual Only');
    setPreviewPrompts(prompts);
    setPreviewFullContent(exportVEO3VisualOnly(veo3Prompts));
    setPreviewOpen(true);
  };

  // Open preview for Minimax Full
  const handlePreviewMinimaxFull = () => {
    const prompts = minimaxPrompts.map((p, i) => ({
      promptNumber: i + 1,
      content: formatMinimaxPromptContent(p),
    }));
    setPreviewType('minimax-full');
    setPreviewTitle('Minimax / Hailuo Full Prompt');
    setPreviewPrompts(prompts);
    setPreviewFullContent(exportMinimaxText(minimaxPrompts));
    setPreviewOpen(true);
  };

  // Open preview for Minimax Visual
  const handlePreviewMinimaxVisual = () => {
    const prompts = minimaxPrompts.map((p, i) => ({
      promptNumber: i + 1,
      content: formatMinimaxVisualContent(p),
    }));
    setPreviewType('minimax-visual');
    setPreviewTitle('Minimax / Hailuo Visual Only');
    setPreviewPrompts(prompts);
    setPreviewFullContent(exportMinimaxVisualOnly(minimaxPrompts));
    setPreviewOpen(true);
  };

  // Open preview for Dialogue Numbered
  const handlePreviewDialogueNumbered = () => {
    const prompts = parsedPrompts.map((p, i) => ({
      promptNumber: i + 1,
      content: p.dialogue,
    }));
    setPreviewType('dialogue-numbered');
    setPreviewTitle('Lời thoại đánh số');
    setPreviewPrompts(prompts);
    setPreviewFullContent(
      exportCleanDialogue(parsedPrompts, { separator: 'numbered' })
    );
    setPreviewOpen(true);
  };

  // Open preview for Dialogue with Timing
  const handlePreviewDialogueTimed = () => {
    const prompts = parsedPrompts.map((p, i) => ({
      promptNumber: i + 1,
      timestamp: calculateTimestamp(
        i + 1,
        parsedPrompts.length,
        script.duration
      ),
      content: p.dialogue,
    }));
    setPreviewType('dialogue-timed');
    setPreviewTitle('Lời thoại + Timing');
    setPreviewPrompts(prompts);
    setPreviewFullContent(
      exportDialogueWithTiming(parsedPrompts, script.duration)
    );
    setPreviewOpen(true);
  };

  // Quick copy handlers (keep for convenience)
  const handleCopyDialogue = async () => {
    const content = exportCleanDialogue(parsedPrompts, {
      separator: 'newline',
      includePromptNumber: false,
    });
    await handleCopy(content, 'Lời thoại');
  };

  const handleCopyDialogueJoined = async () => {
    const content = exportCleanDialogue(parsedPrompts, { joinAll: true });
    await handleCopy(content, 'Toàn bộ lời thoại');
  };

  // Standard Exports (direct download)
  const handleExportVEO3JSON = () => {
    const content = exportVEO3JSON(veo3Prompts, script);
    downloadFile(content, `${filename}_VEO3.json`, 'application/json');
    toast.success('Đã tải VEO 3 JSON!');
  };

  const handleExportTxt = () => {
    const content = exportTXT(script);
    downloadFile(content, `${filename}.txt`, 'text/plain');
    toast.success('Đã tải file TXT!');
  };

  const handleExportWord = () => {
    const content = exportWordHTML(script);
    downloadFile(content, `${filename}.doc`, 'application/msword');
    toast.success('Đã tải file Word!');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`border-border hover:border-primary hover:bg-primary/10 h-7 xs:h-8 text-xs xs:text-sm ${className}`}
          >
            <Download className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1" />
            <span className="hidden xs:inline">Export</span>
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-popover">
          {/* VEO 3 Section */}
          <DropdownMenuLabel className="flex items-center gap-2 text-primary">
            <Video className="w-4 h-4" />
            VEO 3 (AI Video)
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={handlePreviewVEO3Full}>
              <Eye className="w-4 h-4 mr-2" />
              Full Prompt
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePreviewVEO3Visual}>
              <Film className="w-4 h-4 mr-2" />
              Visual Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportVEO3JSON}>
              <FileText className="w-4 h-4 mr-2" />
              JSON Data
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Minimax Section */}
          <DropdownMenuLabel className="flex items-center gap-2 text-secondary">
            <Film className="w-4 h-4" />
            Minimax / Hailuo
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={handlePreviewMinimaxFull}>
              <Eye className="w-4 h-4 mr-2" />
              Full Prompt
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePreviewMinimaxVisual}>
              <Film className="w-4 h-4 mr-2" />
              Visual Only
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Dialogue Section */}
          <DropdownMenuLabel className="flex items-center gap-2 text-accent-foreground">
            <Mic className="w-4 h-4" />
            Lời thoại (TTS)
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={handlePreviewDialogueNumbered}>
              <Eye className="w-4 h-4 mr-2" />
              Dialogue đánh số
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePreviewDialogueTimed}>
              <Eye className="w-4 h-4 mr-2" />
              Dialogue + Timing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyDialogue}>
              {copied === 'Lời thoại' ? (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Copy từng đoạn
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyDialogueJoined}>
              {copied === 'Toàn bộ lời thoại' ? (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Copy gộp tất cả
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Standard Exports */}
          <DropdownMenuLabel className="flex items-center gap-2 text-muted-foreground">
            <FileText className="w-4 h-4" />
            Standard
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={handleExportTxt}>
              <FileText className="w-4 h-4 mr-2" />
              TXT File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportWord}>
              <Download className="w-4 h-4 mr-2" />
              Word Document
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExportPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        exportType={previewType}
        title={previewTitle}
        prompts={previewPrompts}
        fullContent={previewFullContent}
        filename={filename}
      />
    </>
  );
}
