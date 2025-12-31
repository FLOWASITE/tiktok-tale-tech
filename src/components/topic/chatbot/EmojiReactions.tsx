// ============================================
// EmojiReactions Component
// Add emoji reactions to messages
// ============================================

import { useState } from 'react';
import { REACTION_EMOJIS } from './constants';
import { triggerHaptic } from './utils';

interface EmojiReactionsProps {
  messageId: string;
  reactions?: string[];
  onReact: (messageId: string, emoji: string) => void;
}

export function EmojiReactions({ 
  messageId, 
  reactions = [], 
  onReact 
}: EmojiReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleReact = (emoji: string) => {
    triggerHaptic('medium');
    onReact(messageId, emoji);
    setShowPicker(false);
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      {/* Existing reactions */}
      {reactions.length > 0 && (
        <div className="flex gap-0.5">
          {reactions.map((emoji, idx) => (
            <span 
              key={idx} 
              className="text-sm cursor-pointer hover:scale-125 transition-transform"
              onClick={() => handleReact(emoji)}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}
      
      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
        >
          {reactions.length === 0 ? '+ React' : '+'}
        </button>
        
        {showPicker && (
          <div className="absolute bottom-full left-0 mb-1 flex gap-0.5 p-1 bg-popover border rounded-lg shadow-lg z-10 animate-in fade-in-0 zoom-in-95 duration-150">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="text-base hover:scale-125 transition-transform p-1 hover:bg-muted rounded"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
