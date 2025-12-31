// ============================================
// CopyButton Component
// Copy content to clipboard with feedback
// ============================================

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { triggerHaptic } from './utils';

interface CopyButtonProps {
  content: string;
}

export function CopyButton({ content }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      triggerHaptic('light');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 opacity-0 group-hover/message:opacity-100 transition-opacity hover:bg-background"
      title="Sao chép"
    >
      {copied ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Copy className="w-3 h-3 text-muted-foreground" />
      )}
    </button>
  );
}
