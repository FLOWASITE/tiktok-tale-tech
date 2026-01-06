import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Copy, Check, FileJson, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import type { AdCopy } from '@/types/adCopy';
import { type ExportFormat, getAvailableFormats } from '@/types/adCopyExport';
import { exportAdCopy, downloadExport, copyExportToClipboard } from '@/utils/adCopyExport';

interface AdCopyExportMenuProps {
  adCopy: AdCopy;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
}

export function AdCopyExportMenu({ adCopy, size = 'sm', variant = 'outline' }: AdCopyExportMenuProps) {
  const [copiedFormat, setCopiedFormat] = useState<ExportFormat | null>(null);
  
  const availableFormats = getAvailableFormats(adCopy.platform);

  const handleDownload = (format: ExportFormat) => {
    const result = exportAdCopy(adCopy, { 
      format, 
      includeVariations: true, 
      includePerformance: false 
    });
    
    if (result.success) {
      downloadExport(result);
      toast.success(`Đã tải xuống ${result.filename}`, {
        description: `${result.rowCount} variations`
      });
    } else {
      toast.error('Không thể xuất file', { description: result.error });
    }
  };

  const handleCopy = async (format: ExportFormat) => {
    const result = exportAdCopy(adCopy, { 
      format, 
      includeVariations: true, 
      includePerformance: false 
    });
    
    if (result.success) {
      const copied = await copyExportToClipboard(result);
      if (copied) {
        setCopiedFormat(format);
        setTimeout(() => setCopiedFormat(null), 2000);
        toast.success('Đã copy vào clipboard');
      } else {
        toast.error('Không thể copy');
      }
    } else {
      toast.error('Không thể xuất', { description: result.error });
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    if (format === 'json') return <FileJson className="h-4 w-4" />;
    return <FileSpreadsheet className="h-4 w-4" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Tải xuống</DropdownMenuLabel>
        {availableFormats.map((format) => (
          <DropdownMenuItem 
            key={format.value}
            onClick={() => handleDownload(format.value)}
            className="cursor-pointer"
          >
            <span className="mr-2">{format.icon}</span>
            <div className="flex-1">
              <p className="text-sm">{format.label}</p>
              <p className="text-xs text-muted-foreground">{format.description}</p>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Copy to Clipboard</DropdownMenuLabel>
        
        <DropdownMenuItem 
          onClick={() => handleCopy('csv_generic')}
          className="cursor-pointer"
        >
          {copiedFormat === 'csv_generic' ? (
            <Check className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          Copy CSV
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => handleCopy('json')}
          className="cursor-pointer"
        >
          {copiedFormat === 'json' ? (
            <Check className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          Copy JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
