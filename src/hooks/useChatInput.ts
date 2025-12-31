// ============================================
// useChatInput Hook
// Manages input state, voice recognition, keyboard shortcuts
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import type { SpeechRecognition } from '@/components/topic/chatbot/types';
import { MAX_CHARS } from '@/components/topic/chatbot/constants';
import { toast } from '@/hooks/use-toast';

interface UseChatInputOptions {
  onSend: (message: string) => void;
  isLoading: boolean;
  maxChars?: number;
}

interface UseChatInputReturn {
  input: string;
  setInput: (value: string) => void;
  isRecording: boolean;
  interimText: string;
  voiceSupported: boolean;
  showMarkdownPreview: boolean;
  setShowMarkdownPreview: (show: boolean) => void;
  showShortcutsHint: boolean;
  setShowShortcutsHint: (show: boolean) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  handleSubmit: (e: React.FormEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  toggleVoiceInput: () => void;
  focusInput: () => void;
  charCount: number;
  isOverLimit: boolean;
}

export function useChatInput(options: UseChatInputOptions): UseChatInputReturn {
  const { onSend, isLoading, maxChars = MAX_CHARS } = options;
  
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [showShortcutsHint, setShowShortcutsHint] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastFinalIndexRef = useRef(0);
  
  // Check voice input support
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognitionAPI);
    
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = lastFinalIndexRef.current; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            lastFinalIndexRef.current = i + 1;
          } else {
            interimTranscript = transcript;
          }
        }
        
        setInterimText(interimTranscript);
        
        if (finalTranscript) {
          setInput(prev => {
            const separator = prev && !prev.endsWith(' ') ? ' ' : '';
            return (prev + separator + finalTranscript.trim()).slice(0, maxChars);
          });
          setInterimText('');
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setInterimText('');
        lastFinalIndexRef.current = 0;
        
        if (event.error === 'not-allowed') {
          toast({
            title: 'Không có quyền truy cập microphone',
            description: 'Vui lòng cho phép truy cập microphone trong cài đặt trình duyệt.',
            variant: 'destructive',
          });
        }
      };
      
      recognition.onend = () => {
        setIsRecording(false);
        setInterimText('');
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      recognitionRef.current?.stop();
    };
  }, [maxChars]);
  
  // Toggle voice recording
  const toggleVoiceInput = useCallback(() => {
    if (!recognitionRef.current) return;
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      lastFinalIndexRef.current = 0;
      setInterimText('');
      recognitionRef.current.start();
      setIsRecording(true);
      
      toast({
        title: '🎤 Đang ghi âm',
        description: 'Nói vào microphone. Nhấn lại để dừng.',
      });
    }
  }, [isRecording]);
  
  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading || input.length > maxChars) return;
    
    onSend(input.trim());
    setInput('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '36px';
    }
  }, [input, isLoading, maxChars, onSend]);
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;
    
    // Cmd/Ctrl + Enter to send
    if (modKey && e.key === 'Enter') {
      e.preventDefault();
      if (!input.trim() || isLoading || input.length > maxChars) return;
      
      onSend(input.trim());
      setInput('');
      
      if (textareaRef.current) {
        textareaRef.current.style.height = '36px';
      }
      return;
    }
    
    // Enter without shift to send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || isLoading || input.length > maxChars) return;
      
      onSend(input.trim());
      setInput('');
      
      if (textareaRef.current) {
        textareaRef.current.style.height = '36px';
      }
    }
  }, [input, isLoading, maxChars, onSend]);
  
  // Focus input
  const focusInput = useCallback(() => {
    textareaRef.current?.focus();
  }, []);
  
  return {
    input,
    setInput,
    isRecording,
    interimText,
    voiceSupported,
    showMarkdownPreview,
    setShowMarkdownPreview,
    showShortcutsHint,
    setShowShortcutsHint,
    textareaRef,
    handleSubmit,
    handleKeyDown,
    toggleVoiceInput,
    focusInput,
    charCount: input.length,
    isOverLimit: input.length > maxChars,
  };
}
