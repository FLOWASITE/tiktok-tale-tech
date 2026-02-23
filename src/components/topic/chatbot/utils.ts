// ============================================
// TopicAIChatbot Utility Functions
// ============================================

import type { ExtractedTopic, ChatMessage } from './types';
import i18n from '@/i18n';

// Format timestamp with i18n-aware relative time
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const lang = i18n.language || 'vi';

  if (diffMins < 1) return i18n.t('chatbot.time.justNow');
  if (diffMins < 60) return i18n.t('chatbot.time.minutesAgo', { count: diffMins });
  if (diffHours < 24 && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays < 7) {
    return date.toLocaleDateString(lang, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString(lang, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Trigger haptic feedback on mobile devices
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light'): void {
  if ('vibrate' in navigator) {
    const durations = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(durations[type]);
  }
}

// Parse topics from AI response with multiple patterns
export function extractTopicsFromMessage(content: string): ExtractedTopic[] {
  const topics: ExtractedTopic[] = [];
  
  // Pattern 1: Structured format with [TOPIC_START]/[TOPIC_END]
  const structuredRegex = /\*\*\[TOPIC_START\]\*\*[\s\S]*?📌\s*\*\*Topic:\*\*\s*(.+?)[\n\r][\s\S]*?💡\s*\*\*Lý do:\*\*\s*(.+?)[\n\r][\s\S]*?🎯\s*\*\*Format đề xuất:\*\*\s*(.+?)[\n\r][\s\S]*?\*\*\[TOPIC_END\]\*\*/gi;
  
  let match;
  while ((match = structuredRegex.exec(content)) !== null) {
    topics.push({
      topic: match[1].trim(),
      reason: match[2].trim(),
      format: match[3].trim(),
    });
  }
  
  // Pattern 2: Numbered list with emoji bullets (📌 1. Topic: ...)
  if (topics.length === 0) {
    const numberedRegex = /(?:📌|\d+\.)\s*\*\*(?:Topic)?:?\*\*\s*([^\n]+)(?:[\n\r]+(?:💡|[-•])\s*(?:\*\*)?(?:Lý do)?:?\*?\*?\s*([^\n]+))?(?:[\n\r]+(?:🎯|[-•])\s*(?:\*\*)?(?:Format)?:?\*?\*?\s*([^\n]+))?/gi;
    while ((match = numberedRegex.exec(content)) !== null) {
      const topic = match[1]?.replace(/\*\*/g, '').trim();
      if (topic && topic.length > 5) {
        topics.push({
          topic,
          reason: match[2]?.replace(/\*\*/g, '').trim(),
          format: match[3]?.replace(/\*\*/g, '').trim(),
        });
      }
    }
  }
  
  // Pattern 3: Simple bold topics with ** marks
  if (topics.length === 0) {
    const boldRegex = /(?:^|\n)\s*(?:\d+\.|[-•📌])\s*\*\*([^*\n]{10,80})\*\*/gm;
    while ((match = boldRegex.exec(content)) !== null) {
      const topic = match[1].trim();
      if (topic && !topic.toLowerCase().includes('topic:') && !topic.toLowerCase().includes('lý do')) {
        topics.push({ topic });
      }
    }
  }
  
  return topics.slice(0, 5); // Max 5 topics
}

// Highlight search term in text
export function highlightSearchTerm(text: string, searchQuery: string): string {
  if (!searchQuery.trim()) return text;
  
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>');
}

// Filter messages by search query
export function filterMessagesBySearch(messages: ChatMessage[], searchQuery: string): string[] {
  if (!searchQuery.trim()) return [];
  
  const query = searchQuery.toLowerCase();
  return messages
    .filter(m => m.content.toLowerCase().includes(query))
    .map(m => m.id);
}

// Determine dynamic width based on content
export function calculateDynamicWidth(messages: ChatMessage[]): 'compact' | 'normal' | 'wide' | 'full' {
  const hasCode = messages.some(m => 
    m.content.includes('```') || m.content.includes('<code>')
  );
  const hasLongContent = messages.some(m => m.content.length > 1000);
  const hasTables = messages.some(m => 
    m.content.includes('|---') || m.content.includes('| ---')
  );
  
  if (hasTables || hasCode) return 'wide';
  if (hasLongContent) return 'normal';
  return 'normal';
}

// Create a unique message ID
export function createMessageId(role: 'user' | 'assistant' | 'error'): string {
  return `${role}-${Date.now()}`;
}

// Check if device is mobile
export function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// Check if platform is Mac
export function isMacPlatform(): boolean {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

// Serialize messages for API
export function serializeMessagesForAPI(messages: ChatMessage[]): Array<{ role: string; content: string }> {
  return messages
    .filter(m => m.id !== 'welcome' && !m.isError)
    .map(m => ({ role: m.role, content: m.content }));
}

// Parse tool results from SSE data
export function parseToolResults(data: any): any[] | null {
  if (data.type === 'tool_results' && data.tool_results) {
    return data.tool_results;
  }
  return null;
}

// Parse context metadata from SSE data
export function parseContextMetadata(data: any): { badges: any[]; richness?: number } | null {
  if (data.type === 'context_metadata' && data.badges) {
    return {
      badges: data.badges,
      richness: data.context_richness_score,
    };
  }
  return null;
}

// Get streaming content from SSE chunk
export function getStreamingContent(data: any): string | null {
  return data.choices?.[0]?.delta?.content || null;
}
