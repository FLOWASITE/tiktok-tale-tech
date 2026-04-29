import { useState } from 'react';
import { 
  Download, 
  FileText, 
  FileJson, 
  Copy, 
  Check,
  FileArchive,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { MultiChannelContent, Channel, CONTENT_GOALS } from '@/types/multichannel';

interface EnhancedExportMenuProps {
  content: MultiChannelContent;
  channelConfig: Record<Channel, { label: string }>;
  currentChannel?: Channel;
}

function getContentForChannel(content: MultiChannelContent, channel: Channel): string | null {
  switch (channel) {
    case 'website': return content.website_content;
    case 'facebook': return content.facebook_content;
    case 'instagram': return content.instagram_content;
    case 'twitter': return content.twitter_content;
    case 'google_maps': return content.google_maps_content;
    case 'linkedin': return content.linkedin_content;
    case 'email': return content.email_content;
    case 'youtube': return content.youtube_content;
    case 'zalo_oa': return content.zalo_oa_content;
    case 'telegram': return content.telegram_content;
    case 'tiktok': return content.tiktok_content;
    case 'threads': return content.threads_content;
    case 'pinterest': return content.pinterest_content;
    default: return null;
  }
}

export function EnhancedExportMenu({
  content,
  channelConfig,
  currentChannel,
}: EnhancedExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const goalLabel = CONTENT_GOALS.find(g => g.value === content.content_goal)?.label || content.content_goal;

  // Export current channel as Markdown
  const exportCurrentChannelMD = () => {
    if (!currentChannel) return;
    
    const channelContent = getContentForChannel(content, currentChannel);
    if (!channelContent) {
      toast({ title: 'Không có nội dung', variant: 'destructive' });
      return;
    }

    let exportContent = `# ${content.title}\n`;
    exportContent += `## ${channelConfig[currentChannel].label}\n\n`;
    exportContent += channelContent;

    downloadFile(exportContent, `${content.title}_${currentChannel}.md`, 'text/markdown');
    toast({ title: 'Đã xuất file', description: `File ${currentChannel}.md đã được tải xuống` });
  };

  // Export all channels as Markdown
  const exportAllMD = () => {
    let exportContent = `# ${content.title}\n`;
    exportContent += `Chủ đề: ${content.topic}\n`;
    exportContent += `Mục tiêu: ${goalLabel}\n`;
    exportContent += `Brand: ${content.brand_name}\n`;
    exportContent += `\n---\n\n`;

    (content?.selected_channels ?? []).forEach((channel) => {
      const channelContent = getContentForChannel(content, channel);
      if (channelContent) {
        exportContent += `## ${channelConfig[channel].label}\n\n`;
        exportContent += channelContent;
        exportContent += `\n\n---\n\n`;
      }
    });

    downloadFile(exportContent, `${sanitizeFilename(content.title)}_all.md`, 'text/markdown');
    toast({ title: 'Đã xuất file', description: 'File markdown đã được tải xuống' });
  };

  // Export as JSON
  const exportJSON = () => {
    const exportData = {
      id: content.id,
      title: content.title,
      topic: content.topic,
      content_goal: content.content_goal,
      brand_name: content.brand_name,
      brand_guideline: content.brand_guideline,
      selected_channels: content?.selected_channels ?? [],
      channels: {} as Record<string, string | null>,
      channel_images: content.channel_images,
      created_at: content.created_at,
      updated_at: content.updated_at,
    };

    (content?.selected_channels ?? []).forEach((channel) => {
      exportData.channels[channel] = getContentForChannel(content, channel);
    });

    downloadFile(
      JSON.stringify(exportData, null, 2), 
      `${sanitizeFilename(content.title)}.json`, 
      'application/json'
    );
    toast({ title: 'Đã xuất file', description: 'File JSON đã được tải xuống' });
  };

  // Copy all channels formatted
  const copyAllFormatted = async () => {
    let copyContent = `📝 ${content.title}\n`;
    copyContent += `📌 Chủ đề: ${content.topic}\n`;
    copyContent += `🎯 Mục tiêu: ${goalLabel}\n`;
    copyContent += `🏷️ Brand: ${content.brand_name}\n`;
    copyContent += `\n${'─'.repeat(40)}\n\n`;

    (content?.selected_channels ?? []).forEach((channel) => {
      const channelContent = getContentForChannel(content, channel);
      if (channelContent) {
        copyContent += `【${channelConfig[channel].label}】\n\n`;
        copyContent += channelContent;
        copyContent += `\n\n${'─'.repeat(40)}\n\n`;
      }
    });

    try {
      await navigator.clipboard.writeText(copyContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Đã copy', description: 'Nội dung tất cả kênh đã được copy' });
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Không thể copy nội dung', variant: 'destructive' });
    }
  };

  // Export with images as ZIP (simplified - just content for now)
  const exportWithImages = async () => {
    setIsExporting(true);
    try {
      // For now, export as JSON with image URLs
      // Full ZIP implementation would require additional libraries
      const exportData = {
        content: {
          id: content.id,
          title: content.title,
          topic: content.topic,
          brand_name: content.brand_name,
          channels: {} as Record<string, { content: string | null; image?: string }>,
        },
      };

      (content?.selected_channels ?? []).forEach((channel) => {
        exportData.content.channels[channel] = {
          content: getContentForChannel(content, channel),
          image: content.channel_images?.[channel]?.url,
        };
      });

      downloadFile(
        JSON.stringify(exportData, null, 2),
        `${sanitizeFilename(content.title)}_with_images.json`,
        'application/json'
      );
      
      toast({ 
        title: 'Đã xuất file', 
        description: 'File JSON với thông tin ảnh đã được tải xuống' 
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {currentChannel && (
          <>
            <DropdownMenuItem onClick={exportCurrentChannelMD}>
              <FileText className="w-4 h-4 mr-2" />
              Export kênh hiện tại (.md)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem onClick={exportAllMD}>
          <FileText className="w-4 h-4 mr-2" />
          Export tất cả (.md)
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={exportJSON}>
          <FileJson className="w-4 h-4 mr-2" />
          Export JSON
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={exportWithImages} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileArchive className="w-4 h-4 mr-2" />
          )}
          Export với ảnh
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={copyAllFormatted}>
          {copied ? (
            <Check className="w-4 h-4 mr-2 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          Copy tất cả (formatted)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_');
}
