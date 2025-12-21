import { useRef, useCallback } from 'react';
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Link, Quote, Code, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

interface ToolbarAction {
  icon: React.ElementType;
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const toolbarActions: ToolbarAction[] = [
  { icon: Bold, label: 'Bold (Ctrl+B)', prefix: '**', suffix: '**' },
  { icon: Italic, label: 'Italic (Ctrl+I)', prefix: '*', suffix: '*' },
  { icon: Code, label: 'Code', prefix: '`', suffix: '`' },
];

const headingActions: ToolbarAction[] = [
  { icon: Heading1, label: 'Heading 1', prefix: '# ', suffix: '', block: true },
  { icon: Heading2, label: 'Heading 2', prefix: '## ', suffix: '', block: true },
  { icon: Heading3, label: 'Heading 3', prefix: '### ', suffix: '', block: true },
];

const blockActions: ToolbarAction[] = [
  { icon: List, label: 'Bullet List', prefix: '- ', suffix: '', block: true },
  { icon: ListOrdered, label: 'Numbered List', prefix: '1. ', suffix: '', block: true },
  { icon: Quote, label: 'Quote', prefix: '> ', suffix: '', block: true },
  { icon: Minus, label: 'Horizontal Rule', prefix: '\n---\n', suffix: '', block: true },
];

export function MarkdownToolbar({ textareaRef, value, onChange, disabled }: MarkdownToolbarProps) {
  const insertFormat = useCallback((prefix: string, suffix: string, block?: boolean) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newText: string;
    let newCursorPos: number;

    if (block) {
      // For block elements, insert at the beginning of the line
      const beforeSelection = value.substring(0, start);
      const lineStart = beforeSelection.lastIndexOf('\n') + 1;
      const beforeLine = value.substring(0, lineStart);
      const afterLine = value.substring(lineStart);
      
      if (selectedText) {
        // Apply to selected text
        newText = beforeLine + prefix + afterLine.substring(0, start - lineStart) + selectedText + suffix + value.substring(end);
        newCursorPos = start + prefix.length + selectedText.length + suffix.length;
      } else {
        // Insert at cursor
        newText = value.substring(0, start) + prefix + suffix + value.substring(end);
        newCursorPos = start + prefix.length;
      }
    } else {
      // For inline elements, wrap selection
      if (selectedText) {
        newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
        newCursorPos = start + prefix.length + selectedText.length + suffix.length;
      } else {
        newText = value.substring(0, start) + prefix + suffix + value.substring(end);
        newCursorPos = start + prefix.length;
      }
    }

    onChange(newText);
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [textareaRef, value, onChange]);

  const insertLink = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const linkText = selectedText || 'link text';
    const newText = value.substring(0, start) + `[${linkText}](url)` + value.substring(end);
    
    onChange(newText);
    
    // Position cursor at "url"
    const urlStart = start + linkText.length + 3;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(urlStart, urlStart + 3);
    }, 0);
  }, [textareaRef, value, onChange]);

  const ToolbarButton = ({ action }: { action: ToolbarAction }) => {
    const IconComponent = action.icon;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => insertFormat(action.prefix, action.suffix, action.block)}
            disabled={disabled}
          >
            <IconComponent className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{action.label}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5 p-1 rounded-lg border border-border/50 bg-muted/30 flex-wrap">
        {/* Text formatting */}
        {toolbarActions.map((action) => (
          <ToolbarButton key={action.label} action={action} />
        ))}
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        {/* Headings */}
        {headingActions.map((action) => (
          <ToolbarButton key={action.label} action={action} />
        ))}
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        {/* Block elements */}
        {blockActions.map((action) => (
          <ToolbarButton key={action.label} action={action} />
        ))}
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        {/* Link */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={insertLink}
              disabled={disabled}
            >
              <Link className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Insert Link</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
