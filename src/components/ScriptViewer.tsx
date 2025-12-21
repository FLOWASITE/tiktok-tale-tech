import { Script, VIDEO_TYPE_LABELS, CHARACTER_TYPE_LABELS, DURATION_LABELS } from '@/types/script';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download, FileText, Clock, User, Film, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ScriptViewerProps {
  script: Script | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScriptViewer({ script, open, onOpenChange }: ScriptViewerProps) {
  const [copied, setCopied] = useState(false);

  if (!script) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script.content);
    setCopied(true);
    toast.success('Đã sao chép kịch bản!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportTxt = () => {
    const content = `${script.title}\n${'='.repeat(50)}\n\nChủ đề: ${script.topic}\nThời lượng: ${DURATION_LABELS[script.duration as keyof typeof DURATION_LABELS]}\nThể loại: ${VIDEO_TYPE_LABELS[script.video_type as keyof typeof VIDEO_TYPE_LABELS]}\nNhân vật: ${CHARACTER_TYPE_LABELS[script.character_type as keyof typeof CHARACTER_TYPE_LABELS]}\n\n${'='.repeat(50)}\n\n${script.content}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${script.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Đã tải file TXT!');
  };

  const handleExportWord = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${script.title}</title></head>
        <body>
          <h1>${script.title}</h1>
          <hr/>
          <p><strong>Chủ đề:</strong> ${script.topic}</p>
          <p><strong>Thời lượng:</strong> ${DURATION_LABELS[script.duration as keyof typeof DURATION_LABELS]}</p>
          <p><strong>Thể loại:</strong> ${VIDEO_TYPE_LABELS[script.video_type as keyof typeof VIDEO_TYPE_LABELS]}</p>
          <p><strong>Nhân vật:</strong> ${CHARACTER_TYPE_LABELS[script.character_type as keyof typeof CHARACTER_TYPE_LABELS]}</p>
          <hr/>
          <pre style="font-family: Arial; white-space: pre-wrap;">${script.content}</pre>
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${script.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Đã tải file Word!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] gradient-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gradient pr-8">
            {script.title}
          </DialogTitle>
        </DialogHeader>
        
        {/* Metadata badges */}
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
            <Clock className="w-4 h-4" />
            {DURATION_LABELS[script.duration as keyof typeof DURATION_LABELS]}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary">
            <Film className="w-4 h-4" />
            {VIDEO_TYPE_LABELS[script.video_type as keyof typeof VIDEO_TYPE_LABELS]}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
            <User className="w-4 h-4" />
            {CHARACTER_TYPE_LABELS[script.character_type as keyof typeof CHARACTER_TYPE_LABELS]}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="border-border hover:border-primary hover:bg-primary/10"
          >
            {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? 'Đã sao chép' : 'Sao chép'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTxt}
            className="border-border hover:border-secondary hover:bg-secondary/10"
          >
            <FileText className="w-4 h-4 mr-1" />
            Xuất TXT
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportWord}
            className="border-border hover:border-secondary hover:bg-secondary/10"
          >
            <Download className="w-4 h-4 mr-1" />
            Xuất Word
          </Button>
        </div>

        {/* Script content */}
        <ScrollArea className="h-[50vh] rounded-lg bg-muted/30 p-4 border border-border">
          <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
            {script.content}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}