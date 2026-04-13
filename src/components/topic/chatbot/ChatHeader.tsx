// ============================================
// ChatHeader Component
// Header with tabs, search, and controls
// ============================================

import {
  Bot, Search as SearchIcon, Volume2, VolumeX,
  RefreshCw, HelpCircle, X, History, PanelRightOpen, PanelRightClose, Brain, MoreHorizontal, SquarePen
} from 'lucide-react';
import { CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
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
}: ChatHeaderProps) {
  const { t } = useTranslation();
  
  return (
    <CardHeader className="flex-shrink-0 py-1.5 sm:py-2.5 px-2 sm:px-4 border-b bg-gradient-to-r from-primary/5 via-violet-500/5 to-primary/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 sm:p-1.5 rounded-lg bg-gradient-to-br from-primary via-violet-600 to-primary shadow-lg shadow-primary/25">
            <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
              Flowa Mind
              <Badge variant="secondary" className="text-[9px] sm:text-[10px] h-3.5 sm:h-4 px-1 sm:px-1.5">AI</Badge>
            </h3>
          </div>
        </div>
        
        <div className="flex items-center gap-0.5">
          {/* AI Pro Mode toggle - always visible */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSupervisorToggle}
                className={cn(
                  "h-6 w-6 sm:h-7 sm:w-7 relative",
                  supervisorEnabled && "text-primary"
                )}
              >
                <Brain className={cn(
                  "w-3 h-3 sm:w-3.5 sm:h-3.5 transition-all",
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

          {/* New conversation button - always visible */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNewConversation}
                className="h-6 w-6 sm:h-7 sm:w-7"
              >
                <SquarePen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Cuộc hội thoại mới</TooltipContent>
          </Tooltip>

          {/* History sidebar toggle - always visible */}
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
          
          {/* Desktop-only buttons */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSearchToggle}
                className={cn("h-6 w-6 sm:h-7 sm:w-7 hidden sm:inline-flex", isSearchOpen && "bg-primary/10")}
              >
                <SearchIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{t('chatbot.header.searchInChat')}</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSoundToggle}
                className="h-6 w-6 sm:h-7 sm:w-7 hidden sm:inline-flex"
              >
                {soundEnabled ? (
                  <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                ) : (
                  <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {soundEnabled ? t('chatbot.header.soundOn') : t('chatbot.header.soundOff')}
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onShowOnboarding}
                className="h-6 w-6 sm:h-7 sm:w-7 hidden sm:inline-flex"
              >
                <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{t('chatbot.header.guide')}</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onArtifactsPanelToggle}
                className={cn("h-6 w-6 sm:h-7 sm:w-7 hidden sm:inline-flex", showArtifactsPanel && "bg-primary/10")}
              >
                {showArtifactsPanel ? (
                  <PanelRightClose className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                ) : (
                  <PanelRightOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onReset}
                className="h-6 w-6 sm:h-7 sm:w-7 hidden sm:inline-flex"
              >
                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{t('chatbot.header.refreshChat')}</TooltipContent>
          </Tooltip>

          {/* Mobile overflow menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:hidden"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onSearchToggle}>
                <SearchIcon className="w-3.5 h-3.5 mr-2" />
                Tìm kiếm
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSoundToggle}>
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 mr-2" /> : <VolumeX className="w-3.5 h-3.5 mr-2" />}
                {soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShowOnboarding}>
                <HelpCircle className="w-3.5 h-3.5 mr-2" />
                Hướng dẫn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArtifactsPanelToggle}>
                <PanelRightOpen className="w-3.5 h-3.5 mr-2" />
                Topics {artifactsCount > 0 && `(${artifactsCount})`}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onReset}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                Làm mới chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Search bar */}
      {isSearchOpen && (
        <div className="flex items-center gap-2 mt-2 animate-in slide-in-from-top-2 duration-200">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('chatbot.header.searchPlaceholder')}
              className="h-7 pl-7 pr-7 text-xs"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
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
      
      {/* View tabs */}
      <div className="flex items-center gap-1 mt-2 border-t pt-2">
        <Button
          variant={activeView === 'chat' ? 'secondary' : 'ghost'}
          size="sm"
          className={cn(
            "h-6 text-[10px] gap-1 px-2",
            activeView === 'chat' && "bg-primary/10 text-primary"
          )}
          onClick={() => onActiveViewChange('chat')}
        >
          <Bot className="w-3 h-3" />
          Chat
        </Button>
        <Button
          variant={activeView === 'discovery' ? 'secondary' : 'ghost'}
          size="sm"
          className={cn(
            "h-6 text-[10px] gap-1 px-2",
            activeView === 'discovery' && "bg-primary/10 text-primary"
          )}
          onClick={() => onActiveViewChange('discovery')}
        >
          <Brain className="w-3 h-3" />
          Insights
        </Button>
      </div>
    </CardHeader>
  );
}
