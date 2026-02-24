// ============================================
// useChatUI Hook
// Manages UI state: search, scroll, pull-to-refresh, onboarding
// ============================================

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ChatMessage, DynamicWidth } from '@/components/topic/chatbot/types';
import { PULL_THRESHOLD, getOnboardingKey } from '@/components/topic/chatbot/constants';
import { filterMessagesBySearch, calculateDynamicWidth } from '@/components/topic/chatbot/utils';

interface UseChatUIOptions {
  messages: ChatMessage[];
  onReset?: () => void;
}

interface UseChatUIReturn {
  // Search
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: string[];
  highlightSearchTerm: (text: string) => string;
  
  // Scroll
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  scrollRef: React.RefObject<HTMLDivElement>;
  showScrollButton: boolean;
  unreadCount: number;
  scrollToBottom: () => void;
  handleScroll: () => void;
  isNearBottom: boolean;
  
  // Pull-to-refresh
  pullDistance: number;
  isPulling: boolean;
  isRefreshing: boolean;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  
  // Onboarding
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  dismissOnboarding: () => void;
  
  // Active view
  activeView: 'chat' | 'discovery';
  setActiveView: (view: 'chat' | 'discovery') => void;
  
  // Sound
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  
  // Supervisor mode
  supervisorEnabled: boolean;
  setSupervisorEnabled: (enabled: boolean) => void;
  
  // Dynamic width
  dynamicWidth: DynamicWidth;
  
  // History sidebar
  showHistorySidebar: boolean;
  setShowHistorySidebar: (show: boolean) => void;
}

export function useChatUI(options: UseChatUIOptions): UseChatUIReturn {
  const { messages, onReset } = options;
  
  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isNearBottomRef = useRef(true);
  
  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef(0);
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  
  // Active view state
  const [activeView, setActiveView] = useState<'chat' | 'discovery'>('chat');
  
  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Supervisor mode state (persisted)
  const [supervisorEnabled, setSupervisorEnabled] = useState(() => {
    const saved = localStorage.getItem('flowa-supervisor-enabled');
    return saved !== null ? saved === 'true' : true;
  });
  
  // History sidebar state
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  
  // Search results
  const searchResults = useMemo(() => 
    filterMessagesBySearch(messages, searchQuery),
    [messages, searchQuery]
  );
  
  // Highlight search term
  const highlightSearchTerm = useCallback((text: string): string => {
    if (!searchQuery.trim()) return text;
    
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>');
  }, [searchQuery]);
  
  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    setUnreadCount(0);
  }, []);
  
  // Handle scroll event
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    isNearBottomRef.current = distanceFromBottom < 100;
    setShowScrollButton(distanceFromBottom > 200);
  }, []);
  
  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return;
    if (scrollContainerRef.current.scrollTop > 0) return;
    
    pullStartY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || !scrollContainerRef.current) return;
    if (scrollContainerRef.current.scrollTop > 0) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - pullStartY.current;
    
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, PULL_THRESHOLD * 1.5));
    }
  }, [isPulling]);
  
  const handleTouchEnd = useCallback(() => {
    if (!isPulling) return;
    
    if (pullDistance >= PULL_THRESHOLD && onReset) {
      setIsRefreshing(true);
      
      setTimeout(() => {
        onReset();
        setIsRefreshing(false);
        setPullDistance(0);
        setIsPulling(false);
      }, 500);
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [isPulling, pullDistance, onReset]);
  
  // Check onboarding status on mount
  useEffect(() => {
    const seen = localStorage.getItem(getOnboardingKey());
    if (!seen && messages.length <= 1) {
      setShowOnboarding(true);
    }
  }, [messages.length]);
  
  // Dismiss onboarding
  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem(getOnboardingKey(), 'true');
  }, []);
  
  // Dynamic width based on content
  const dynamicWidth = useMemo(() => 
    calculateDynamicWidth(messages),
    [messages]
  );
  
  return {
    // Search
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    searchResults,
    highlightSearchTerm,
    
    // Scroll
    scrollContainerRef,
    scrollRef,
    showScrollButton,
    unreadCount,
    scrollToBottom,
    handleScroll,
    isNearBottom: isNearBottomRef.current,
    
    // Pull-to-refresh
    pullDistance,
    isPulling,
    isRefreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    
    // Onboarding
    showOnboarding,
    setShowOnboarding,
    onboardingStep,
    setOnboardingStep,
    dismissOnboarding,
    
    // Active view
    activeView,
    setActiveView,
    
    // Sound
    soundEnabled,
    setSoundEnabled,
    
    // Supervisor
    supervisorEnabled,
    setSupervisorEnabled: (enabled: boolean) => {
      setSupervisorEnabled(enabled);
      localStorage.setItem('flowa-supervisor-enabled', String(enabled));
    },
    
    // Dynamic width
    dynamicWidth,
    
    // History sidebar
    showHistorySidebar,
    setShowHistorySidebar,
  };
}
