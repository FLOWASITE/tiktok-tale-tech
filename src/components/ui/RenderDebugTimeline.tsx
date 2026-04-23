import { Badge } from "@/components/ui/badge";
import type { RenderDebugInfo } from "@/hooks/useAutoImageGeneration";
import { cn } from "@/lib/utils";

interface RenderDebugTimelineProps {
  debug?: RenderDebugInfo;
  className?: string;
}

const STEP_STATUS_STYLES = {
  success: "border-primary/30 bg-primary/10 text-foreground",
  failed: "border-destructive/30 bg-destructive/10 text-foreground",
  skipped: "border-border bg-muted/40 text-muted-foreground",
} as const;

const PATH_LABELS: Record<RenderDebugInfo['finalPath'], string> = {
  ai_only: 'AI only',
  logo_only: 'AI + logo',
  text_fallback: 'AI + text fallback',
  structured_fallback: 'AI + structured fallback',
  text_and_structured_fallback: 'AI + full fallback',
  satori_forced: 'Satori forced',
};

export function RenderDebugTimeline({ debug, className }: RenderDebugTimelineProps) {
  if (!debug) {
    return (
      <div className={cn("rounded-md border border-border bg-card/95 p-4 text-sm text-muted-foreground", className)}>
        Chưa có dữ liệu render debug cho ảnh này.
      </div>
    );
  }

  return (
    <div className={cn("rounded-md border border-border bg-card/95 p-4 text-foreground shadow-lg backdrop-blur-sm", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{debug.overlayMode}</Badge>
        <Badge variant="outline">{PATH_LABELS[debug.finalPath]}</Badge>
        <Badge variant="outline">fallback: {debug.backendRequestedFallback ? 'yes' : 'no'}</Badge>
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Fallback reason</p>
        <p className="text-sm leading-6 text-foreground">{debug.fallbackReason || 'AI render accepted, không cần fallback.'}</p>
      </div>

      <div className="mt-3 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p className="uppercase tracking-wide">Overlay text</p>
        <div className="mt-2 space-y-1">
          <p>Source: {debug.overlayText.source}</p>
          <p>Length: {debug.overlayText.length}</p>
          <p>Mode: {debug.overlayText.mode}</p>
          <p>Brand language: {debug.overlayText.brandLanguage || 'unknown'}</p>
          <p>Detected language: {debug.overlayText.detectedLanguage || 'unknown'}</p>
          <p>Language match: {debug.overlayText.languageMatch ? 'yes' : 'no'}</p>
          <p>Suppressed: {debug.overlayText.suppressedBecauseTooLong ? 'yes' : 'no'}</p>
          {debug.overlayText.reason && <p>Reason: {debug.overlayText.reason}</p>}
        </div>
      </div>

      {debug.providerInfo && (
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="uppercase tracking-wide">Provider</p>
            <p className="mt-1 text-sm text-foreground">{debug.providerInfo.provider || 'unknown'}</p>
            {debug.providerInfo.fallbackProvider && (
              <p className="mt-1">fallback → {debug.providerInfo.fallbackProvider}</p>
            )}
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="uppercase tracking-wide">Status</p>
            <p className="mt-1 text-sm text-foreground">
              {debug.providerInfo.providerTimeout ? 'Timeout provider' : debug.providerInfo.errorCode || 'ok'}
            </p>
            {debug.providerInfo.fallbackTried !== undefined && (
              <p className="mt-1">fallback tried: {debug.providerInfo.fallbackTried ? 'yes' : 'no'}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="uppercase tracking-wide">Required branding</p>
          <div className="mt-2 space-y-1">
            <p>Logo: {debug.requiredBranding.logo ? 'yes' : 'no'}</p>
            <p>Footer: {debug.requiredBranding.footer ? 'yes' : 'no'}</p>
            <p>Text: {debug.requiredBranding.text ? 'yes' : 'no'}</p>
            <p>Structured: {debug.requiredBranding.structured ? 'yes' : 'no'}</p>
          </div>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="uppercase tracking-wide">Input overlay payload</p>
          <div className="mt-2 space-y-1">
            <p>structuredOverlay: {debug.payloadPresence.structuredOverlay ? 'yes' : 'no'}</p>
            <p>fullStructuredOverlay: {debug.payloadPresence.fullStructuredOverlay ? 'yes' : 'no'}</p>
            <p>footerOverlay: {debug.payloadPresence.footerOverlay ? 'yes' : 'no'}</p>
            <p>textsPerChannel: {debug.payloadPresence.textsPerChannel ? 'yes' : 'no'}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {debug.steps.map((step, index) => (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn("mt-1 h-2.5 w-2.5 rounded-full border", STEP_STATUS_STYLES[step.status])} />
              {index < debug.steps.length - 1 && <div className="mt-1 h-full w-px bg-border" />}
            </div>
            <div className="min-w-0 flex-1 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">{step.label}</p>
                <Badge variant="outline" className="capitalize">{step.status}</Badge>
                {typeof step.durationMs === 'number' && (
                  <span className="text-xs tabular-nums text-muted-foreground">{step.durationMs}ms</span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{step.summary}</p>
              {step.details && step.details.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {step.details.map((detail) => (
                    <li key={detail} className="truncate">• {detail}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}