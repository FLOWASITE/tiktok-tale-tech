import { MessageCircleQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function HelpHeaderButton() {
  const handleClick = () => {
    // Dispatch custom event to open help chat
    window.dispatchEvent(new CustomEvent('open-help-chat'));
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          className="h-8 w-8 relative"
        >
          <MessageCircleQuestion className="h-4 w-4" />
          <span className="sr-only">Trợ lý hướng dẫn</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Trợ lý hướng dẫn</p>
      </TooltipContent>
    </Tooltip>
  );
}
