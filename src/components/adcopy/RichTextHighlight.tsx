import React from 'react';

// Regex patterns for rich text elements
const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
const HASHTAG_REGEX = /(#\w+)/g;
const MENTION_REGEX = /(@\w+)/g;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

interface RichTextHighlightProps {
  text: string;
  className?: string;
}

interface TextSegment {
  type: 'text' | 'emoji' | 'hashtag' | 'mention' | 'url';
  content: string;
  index: number;
}

export function RichTextHighlight({ text, className }: RichTextHighlightProps) {
  const segments = React.useMemo(() => {
    if (!text) return [];

    const allMatches: TextSegment[] = [];
    let lastIndex = 0;

    // Find all special patterns
    const patterns = [
      { regex: EMOJI_REGEX, type: 'emoji' as const },
      { regex: HASHTAG_REGEX, type: 'hashtag' as const },
      { regex: MENTION_REGEX, type: 'mention' as const },
      { regex: URL_REGEX, type: 'url' as const },
    ];

    const matches: Array<{ type: TextSegment['type']; match: RegExpExecArray }> = [];

    patterns.forEach(({ regex, type }) => {
      // Reset regex lastIndex for global patterns
      const clonedRegex = new RegExp(regex.source, regex.flags);
      let match;
      while ((match = clonedRegex.exec(text)) !== null) {
        matches.push({ type, match });
      }
    });

    // Sort by index
    matches.sort((a, b) => a.match.index - b.match.index);

    // Build segments avoiding overlaps
    const usedRanges: Array<[number, number]> = [];
    
    matches.forEach(({ type, match }) => {
      const start = match.index;
      const end = start + match[0].length;
      
      // Check for overlap with already processed ranges
      const overlaps = usedRanges.some(([s, e]) => 
        (start >= s && start < e) || (end > s && end <= e) || (start <= s && end >= e)
      );
      
      if (!overlaps) {
        usedRanges.push([start, end]);
        allMatches.push({ type, content: match[0], index: start });
      }
    });

    // Sort by index again
    allMatches.sort((a, b) => a.index - b.index);

    // Build final segments with plain text between matches
    const result: TextSegment[] = [];
    let currentIndex = 0;

    allMatches.forEach(segment => {
      if (segment.index > currentIndex) {
        result.push({
          type: 'text',
          content: text.slice(currentIndex, segment.index),
          index: currentIndex,
        });
      }
      result.push(segment);
      currentIndex = segment.index + segment.content.length;
    });

    if (currentIndex < text.length) {
      result.push({
        type: 'text',
        content: text.slice(currentIndex),
        index: currentIndex,
      });
    }

    return result;
  }, [text]);

  const renderSegment = (segment: TextSegment, idx: number) => {
    switch (segment.type) {
      case 'emoji':
        return (
          <span 
            key={idx} 
            className="inline-block text-lg mx-0.5 hover:scale-125 transition-transform cursor-default"
            title="Emoji"
          >
            {segment.content}
          </span>
        );
      case 'hashtag':
        return (
          <span 
            key={idx} 
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer"
            title="Hashtag"
          >
            {segment.content}
          </span>
        );
      case 'mention':
        return (
          <span 
            key={idx} 
            className="text-primary font-medium hover:underline cursor-pointer"
            title="Mention"
          >
            {segment.content}
          </span>
        );
      case 'url':
        return (
          <span 
            key={idx} 
            className="text-blue-500 dark:text-blue-400 underline break-all cursor-pointer hover:text-blue-600"
            title="URL"
            onClick={(e) => {
              e.stopPropagation();
              window.open(segment.content, '_blank', 'noopener,noreferrer');
            }}
          >
            {segment.content}
          </span>
        );
      default:
        return <span key={idx}>{segment.content}</span>;
    }
  };

  if (!text) return <span className={className}>-</span>;

  return (
    <span className={className}>
      {segments.map((segment, idx) => renderSegment(segment, idx))}
    </span>
  );
}

// Hook for keyboard navigation
export function useKeyboardNavigation({
  variations,
  activeTab,
  setActiveTab,
  mainTab,
  setMainTab,
  onClose,
  isOpen,
}: {
  variations: Array<{ variation_label: string }>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mainTab: string;
  setMainTab: (tab: string) => void;
  onClose: () => void;
  isOpen: boolean;
}) {
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const variationLabels = variations.map(v => v.variation_label);
      const currentIndex = variationLabels.indexOf(activeTab);

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) {
            setActiveTab(variationLabels[currentIndex - 1]);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < variationLabels.length - 1) {
            setActiveTab(variationLabels[currentIndex + 1]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case '1':
          e.preventDefault();
          setMainTab('variations');
          break;
        case '2':
          e.preventDefault();
          setMainTab('ab-tests');
          break;
        case '3':
          e.preventDefault();
          setMainTab('performance');
          break;
        case '4':
          e.preventDefault();
          setMainTab('prediction');
          break;
        case '5':
          e.preventDefault();
          setMainTab('policy');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, variations, activeTab, setActiveTab, mainTab, setMainTab, onClose]);
}
