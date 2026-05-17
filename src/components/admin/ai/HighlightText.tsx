import { buildHighlightSegments } from '@/lib/functionConfigSearch';

interface HighlightTextProps {
  text: string;
  terms: string[];
  className?: string;
}

export function HighlightText({ text, terms, className }: HighlightTextProps) {
  if (!terms?.length) return <span className={className}>{text}</span>;
  const segments = buildHighlightSegments(text, terms);
  return (
    <span className={className}>
      {segments.map((s, i) =>
        s.match ? (
          <mark
            key={i}
            className="bg-primary/15 text-primary rounded-sm px-0.5"
          >
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </span>
  );
}
