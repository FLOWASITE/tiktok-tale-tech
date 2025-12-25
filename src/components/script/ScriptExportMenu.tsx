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
} from '@/utils/scriptExportFormats';

interface ScriptExportMenuProps {
  script: Script;
  className?: string;
}

export function ScriptExportMenu({ script, className }: ScriptExportMenuProps) {
  const [copied, setCopied] = useState<string | null>(null);
  
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

  // VEO 3 Exports
  const handleExportVEO3Full = () => {
    const content = exportVEO3Text(veo3Prompts);
    downloadFile(content, `${filename}_VEO3.txt`, 'text/plain');
    toast.success('Đã tải VEO 3 Full Prompt!');
  };

  const handleExportVEO3Visual = () => {
    const content = exportVEO3VisualOnly(veo3Prompts);
    downloadFile(content, `${filename}_VEO3_Visual.txt`, 'text/plain');
    toast.success('Đã tải VEO 3 Visual Only!');
  };

  const handleExportVEO3JSON = () => {
    const content = exportVEO3JSON(veo3Prompts, script);
    downloadFile(content, `${filename}_VEO3.json`, 'application/json');
    toast.success('Đã tải VEO 3 JSON!');
  };

  const handleCopyVEO3Visual = async () => {
    const content = exportVEO3VisualOnly(veo3Prompts);
    await handleCopy(content, 'VEO 3 Visual');
  };

  // Minimax Exports
  const handleExportMinimax = () => {
    const content = exportMinimaxText(minimaxPrompts);
    downloadFile(content, `${filename}_Minimax.txt`, 'text/plain');
    toast.success('Đã tải Minimax Prompt!');
  };

  const handleExportMinimaxVisual = () => {
    const content = exportMinimaxVisualOnly(minimaxPrompts);
    downloadFile(content, `${filename}_Minimax_Visual.txt`, 'text/plain');
    toast.success('Đã tải Minimax Visual!');
  };

  const handleCopyMinimaxVisual = async () => {
    const content = exportMinimaxVisualOnly(minimaxPrompts);
    await handleCopy(content, 'Minimax Visual');
  };

  // Dialogue Exports
  const handleExportDialogue = () => {
    const content = exportCleanDialogue(parsedPrompts, { separator: 'numbered' });
    downloadFile(content, `${filename}_Dialogue.txt`, 'text/plain');
    toast.success('Đã tải Clean Dialogue!');
  };

  const handleExportDialogueTimed = () => {
    const content = exportDialogueWithTiming(parsedPrompts, script.duration);
    downloadFile(content, `${filename}_Dialogue_Timed.txt`, 'text/plain');
    toast.success('Đã tải Dialogue với Timing!');
  };

  const handleCopyDialogue = async () => {
    const content = exportCleanDialogue(parsedPrompts, { separator: 'newline', includePromptNumber: false });
    await handleCopy(content, 'Lời thoại');
  };

  const handleCopyDialogueJoined = async () => {
    const content = exportCleanDialogue(parsedPrompts, { joinAll: true });
    await handleCopy(content, 'Toàn bộ lời thoại');
  };

  // Standard Exports
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
      <DropdownMenuContent align="end" className="w-64">
        {/* VEO 3 Section */}
        <DropdownMenuLabel className="flex items-center gap-2 text-primary">
          <Video className="w-4 h-4" />
          VEO 3 (AI Video)
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleExportVEO3Full}>
            <FileText className="w-4 h-4 mr-2" />
            Full Prompt (.txt)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportVEO3Visual}>
            <Film className="w-4 h-4 mr-2" />
            Visual Only (.txt)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportVEO3JSON}>
            <FileText className="w-4 h-4 mr-2" />
            JSON Data
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyVEO3Visual}>
            {copied === 'VEO 3 Visual' ? (
              <Check className="w-4 h-4 mr-2 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            Copy Visual Prompt
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Minimax Section */}
        <DropdownMenuLabel className="flex items-center gap-2 text-secondary">
          <Film className="w-4 h-4" />
          Minimax / Hailuo
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleExportMinimax}>
            <FileText className="w-4 h-4 mr-2" />
            Full Prompt (.txt)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportMinimaxVisual}>
            <Film className="w-4 h-4 mr-2" />
            Visual Only (.txt)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyMinimaxVisual}>
            {copied === 'Minimax Visual' ? (
              <Check className="w-4 h-4 mr-2 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            Copy Visual Prompt
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Dialogue Section */}
        <DropdownMenuLabel className="flex items-center gap-2 text-accent-foreground">
          <Mic className="w-4 h-4" />
          Lời thoại (TTS)
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleExportDialogue}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Dialogue đánh số (.txt)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportDialogueTimed}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Dialogue + Timing (.txt)
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
  );
}
