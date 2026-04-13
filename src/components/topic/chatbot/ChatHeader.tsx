// ============================================
// ChatHeader Component
// Header with tabs, search, and controls
// ============================================

import {
  Bot, Search as SearchIcon, Volume2, VolumeX,
  RefreshCw, HelpCircle, X, History, PanelRightOpen, PanelRightClose, Brain, MoreHorizontal, SquarePen, Keyboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ActiveView } from './types';
import { ConversationHistorySidebar } from './ConversationHistorySidebar';

interface ChatHeaderProps {
  activeView: ActiveView;
  onActiveViewChange: (view: ActiveView) => void;
  isSearchOpen: boolean;
  onSearchToggle: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResultsCount: number;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  onReset: () => void;
  onShowOnboarding: () => void;
  artifactsCount: number;
  showArtifactsPanel: boolean;
  onArtifactsPanelToggle: () => void;
  supervisorEnabled: boolean;
  onSupervisorToggle: () => void;
  showHistorySidebar: boolean;
  onHistorySidebarChange: (show: boolean) => void;
  conversations: any[];
  currentConversationId?: string;
  isLoadingConversations: boolean;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onArchiveConversation: (id: string) => void;
  desktopLayout?: boolean;
  onToggleShortcutsHint?: () => void;
}

export function ChatHeader({
  activeView,
  onActiveViewChange,
  isSearchOpen,
  onSearchToggle,
  searchQuery,
  onSearchChange,
  searchResultsCount,
  soundEnabled,
  onSoundToggle,
  onReset,
  onShowOnboarding,
  artifactsCount,
  showArtifactsPanel,
  onArtifactsPanelToggle,
  supervisorEnabled,
  onSupervisorToggle,
  showHistorySidebar,
  onHistorySidebarChange,
  conversations,
  currentConversationId,
  isLoadingConversations,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onArchiveConversation,
  desktopLayout = false,
  onToggleShortcutsHint,
}: ChatHeaderProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  
  return (
    <div className={cn(
      "flex-shrink-0 border-b bg-background/80 backdrop-blur-sm",
      desktopLayout ? "py-3 px-6" : "py-1.5 sm:py-2.5 px-2 sm:px-4"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "rounded-xl bg-gradient-to-br from-primary via-violet-600 to-primary shadow-lg shadow-primary/25",
            desktopLayout ? "p-2" : "p-1 sm:p-1.5"
          )}>
            <Bot className={cn(desktopLayout ? "w-5 h-5" : "w-3.5 h-3.5 sm:w-4 sm:h-4", "text-primary-foreground")} />
          </div>
          <div>
            <h3 className={cn(
              "font-semibold flex items-center gap-2",
              desktopLayout ? "text-base" : "text-xs sm:text-sm"
            )}>
              Flowa Mind
              <Badge variant="secondary" className={cn(
                desktopLayout ? "text-[10px] h-4.5 px-1.5" : "text-[9px] sm:text-[10px] h-3.5 sm:h-4 px-1 sm:px-1.5"
              )}>AI</Badge>
            </h3>
          </div>
        </div>
        
        <div className={cn("flex items-center", desktopLayout ? "gap-1" : "gap-0.5")}>
          {/* AI Pro Mode toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSupervisorToggle}
                className={cn(
                  "relative",
                  desktopLayout ? "h-9 w-9" : "h-6 w-6 sm:h-7 sm:w-7",
                  supervisorEnabled && "text-primary"
                )}
              >
                <Brain className={cn(
                  "transition-all",
                  desktopLayout ? "w-[18px] h-[18px]" : "w-3 h-3 sm:w-3.5 sm:h-3.5",
                  supervisorEnabled && "drop-shadow-[0_0_4px_hsl(var(--primary)/0.5)]"
                )} />
                {supervisorEnabled && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[180px]">
              {supervisorEnabled ? 'AI Pro Mode: Bật — nhiều chuyên gia phân tích' : 'AI Pro Mode: Tắt — phản hồi nhanh'}
            </TooltipContent>
          </Tooltip>

          {/* History - only on mobile (desktop has persistent sidebar) */}
          {!desktopLayout && (
            <Sheet open={showHistorySidebar} onOpenChange={onHistorySidebarChange}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-6 w-6 sm:h-7 sm:w-7", showHistorySidebar && "bg-primary/10")}
                    >
                      <History className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </Button>
                  </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{t('chatbot.header.chatHistory')}</TooltipContent>
              </Tooltip>
              <SheetContent side="left" className="p-0 w-72">
                <ConversationHistorySidebar
                  conversations={conversations}
                  currentConversationId={currentConversationId}
                  isLoading={isLoadingConversations}
                  onSelectConversation={(id) => {
                    onSelectConversation(id);
                    onHistorySidebarChange(false);
                  }}
                  onNewConversation={() => {
                    onNewConversation();
                    onHistorySidebarChange(false);
                  }}
                  onDeleteConversation={onDeleteConversation}
                  onArchiveConversation={onArchiveConversation}
                  onClose={() => onHistorySidebarChange(false)}
                />
              </SheetContent>
            </Sheet>
          )}
          
          {/* Artifacts panel toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onArtifactsPanelToggle}
                className={cn(
                  "relative",
                  desktopLayout ? "h-9 w-9" : "h-6 w-6 sm:h-7 sm:w-7",
                  showArtifactsPanel && "bg-primary/10"
                )}
              >
                {showArtifactsPanel ? (
                  <PanelRightClose className={cn(desktopLayout ? "w-[18px] h-[18px]" : "w-3 h-3 sm:w-3.5 sm:h-3.5")} />
                ) : (
                  <PanelRightOpen className={cn(desktopLayout ? "w-[18px] h-[18px]" : "w-3 h-3 sm:w-3.5 sm:h-3.5")} />
                )}
                {artifactsCount > 0 && !showArtifactsPanel && (
                  <Badge className="absolute -top-1 -right-1 h-3.5 w-3.5 p-0 text-[8px] flex items-center justify-center">
                    {artifactsCount > 9 ? '9+' : artifactsCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {showArtifactsPanel ? t('chatbot.header.closePanel') : t('chatbot.header.viewTopics', { count: artifactsCount })}
            </TooltipContent>
          </Tooltip>

          {/* More menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(desktopLayout ? "h-9 w-9" : "h-6 w-6 sm:h-7 sm:w-7")}
              >
                <MoreHorizontal className={cn(desktopLayout ? "w-[18px] h-[18px]" : "w-3 h-3 sm:w-3.5 sm:h-3.5")} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onNewConversation}>
                <SquarePen className="w-4 h-4 mr-2" />
                Đoạn chat mới
              </DropdownMenuItem>
              {onToggleShortcutsHint && (
                <DropdownMenuItem onClick={onToggleShortcutsHint}>
                  <Keyboard className="w-4 h-4 mr-2" />
                  Phím tắt
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {/* View toggle */}
              <DropdownMenuItem onClick={() => onActiveViewChange(activeView === 'chat' ? 'discovery' : 'chat')}>
                {activeView === 'chat' ? (
                  <><Brain className="w-4 h-4 mr-2" />Xem Insights</>
                ) : (
                  <><Bot className="w-4 h-4 mr-2" />Quay lại Chat</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSearchToggle}>
                <SearchIcon className="w-4 h-4 mr-2" />
                Tìm kiếm
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSoundToggle}>
                {soundEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
                {soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShowOnboarding}>
                <HelpCircle className="w-4 h-4 mr-2" />
                Hướng dẫn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Làm mới chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Search bar */}
      {isSearchOpen && (
        <div className={cn(
          "flex items-center gap-2 mt-2 animate-in slide-in-from-top-2 duration-200",
          desktopLayout && "max-w-3xl mx-auto"
        )}>
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('chatbot.header.searchPlaceholder')}
              className={cn(desktopLayout ? "h-9 pl-8 pr-8 text-sm" : "h-7 pl-7 pr-7 text-xs")}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          {searchQuery && (
            <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
              {t('chatbot.header.results', { count: searchResultsCount })}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
