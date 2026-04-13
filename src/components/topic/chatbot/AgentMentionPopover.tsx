// ============================================
// AgentMentionPopover Component
// Popover for @mentioning agents in chat input
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { Search, ClipboardList, PenTool, Image, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const AGENTS = [
  { key: 'Research', icon: Search, desc: 'Nghiên cứu xu hướng & dữ liệu' },
  { key: 'Strategy', icon: ClipboardList, desc: 'Lập kế hoạch nội dung' },
  { key: 'Content', icon: PenTool, desc: 'Tạo nội dung sáng tạo' },
  { key: 'Visual', icon: Image, desc: 'Gợi ý hình ảnh & thiết kế' },
  { key: 'Reviewer', icon: ShieldCheck, desc: 'Kiểm duyệt chất lượng' },
] as const;

interface AgentMentionPopoverProps {
  input: string;
  cursorPosition: number;
  onSelect: (agentName: string, replaceFrom: number) => void;
  visible: boolean;
}

export function AgentMentionPopover({ input, cursorPosition, onSelect, visible }: AgentMentionPopoverProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Extract filter text after @
  const atIndex = input.lastIndexOf('@', cursorPosition - 1);
  const filterText = atIndex >= 0 ? input.slice(atIndex + 1, cursorPosition).toLowerCase() : '';

  const filtered = AGENTS.filter(a =>
    a.key.toLowerCase().startsWith(filterText)
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filterText]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!visible || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      onSelect(filtered[selectedIndex].key, atIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onSelect('', -1); // Signal close
    }
  }, [visible, filtered, selectedIndex, onSelect, atIndex]);

  useEffect(() => {
    if (visible) {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [visible, handleKeyDown]);

  if (!visible || filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 z-50 animate-in fade-in-0 slide-in-from-bottom-2 duration-150">
      <div className="bg-popover border rounded-xl shadow-lg p-1 max-w-[280px]">
        <div className="text-[10px] text-muted-foreground px-2 py-1 font-medium">Chọn Agent</div>
        {filtered.map((agent, idx) => {
          const Icon = agent.icon;
          return (
            <button
              key={agent.key}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors text-xs",
                idx === selectedIndex ? "bg-muted text-foreground" : "hover:bg-muted/50"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(agent.key, atIndex);
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                <Icon className="w-3 h-3 text-foreground" />
              </div>
              <div>
                <p className="font-medium">@{agent.key}</p>
                <p className="text-[10px] text-muted-foreground">{agent.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
