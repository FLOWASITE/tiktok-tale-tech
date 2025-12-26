import { useEffect, useCallback, RefObject } from 'react';

interface UseKeyboardNavigationOptions {
  /** Callback when Escape key is pressed */
  onEscape?: () => void;
  /** Callback when Enter key is pressed */
  onEnter?: () => void;
  /** Enable focus trap within a container */
  focusTrapRef?: RefObject<HTMLElement>;
  /** Whether keyboard navigation is enabled */
  enabled?: boolean;
  /** Custom key handlers */
  customHandlers?: Record<string, (event: KeyboardEvent) => void>;
}

export function useKeyboardNavigation({
  onEscape,
  onEnter,
  focusTrapRef,
  enabled = true,
  customHandlers = {},
}: UseKeyboardNavigationOptions) {
  // Handle focus trap
  const handleFocusTrap = useCallback((event: KeyboardEvent) => {
    if (!focusTrapRef?.current || event.key !== 'Tab') return;

    const focusableElements = focusTrapRef.current.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab: go backwards
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: go forwards
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, [focusTrapRef]);

  // Main keyboard handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't handle if user is typing in an input
    const target = event.target as HTMLElement;
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && 
                     !target.closest('[data-keyboard-navigation]');
    
    if (isTyping && event.key !== 'Escape') return;

    switch (event.key) {
      case 'Escape':
        if (onEscape) {
          event.preventDefault();
          onEscape();
        }
        break;
      case 'Enter':
        if (onEnter && !isTyping) {
          event.preventDefault();
          onEnter();
        }
        break;
      case 'Tab':
        handleFocusTrap(event);
        break;
      default:
        // Check custom handlers
        if (customHandlers[event.key]) {
          customHandlers[event.key](event);
        }
        break;
    }
  }, [enabled, onEscape, onEnter, handleFocusTrap, customHandlers]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  // Helper to focus first focusable element in container
  const focusFirst = useCallback(() => {
    if (!focusTrapRef?.current) return;

    const firstFocusable = focusTrapRef.current.querySelector(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;

    firstFocusable?.focus();
  }, [focusTrapRef]);

  return { focusFirst };
}

// Hook for dialog keyboard handling
export function useDialogKeyboard(
  open: boolean,
  onClose: () => void,
  dialogRef?: RefObject<HTMLElement>
) {
  useKeyboardNavigation({
    onEscape: onClose,
    focusTrapRef: dialogRef,
    enabled: open,
  });
}
