import { Sparkles } from "lucide-react";

interface TLDRBoxProps {
  bullets: string[];
  title?: string;
}

/**
 * Answer-engine friendly summary block.
 * Renders TL;DR bullets that AI engines (ChatGPT, Perplexity, Gemini)
 * are likely to extract as direct answers.
 */
export function TLDRBox({ bullets, title = "Tóm tắt nhanh" }: TLDRBoxProps) {
  if (!bullets?.length) return null;

  return (
    <aside
      role="complementary"
      aria-label={title}
      data-geo-block="tldr"
      className="my-8 rounded-2xl border border-border bg-muted/30 p-6"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {title}
      </div>
      <ul className="space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-foreground leading-relaxed">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
