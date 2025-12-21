import { User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function UserAvatar() {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-8 w-8 cursor-pointer border border-border/50 hover:border-primary/50 transition-colors">
              <AvatarFallback className="bg-muted text-muted-foreground">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tài khoản</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48 bg-popover">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">Guest User</p>
          <p className="text-xs text-muted-foreground">Chưa đăng nhập</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          Đăng nhập
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          Đăng ký
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
