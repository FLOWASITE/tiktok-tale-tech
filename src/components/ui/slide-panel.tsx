import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SlidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SlidePanel({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: SlidePanelProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);

  // Handle open/close with animation
  React.useEffect(() => {
    if (open) {
      setIsVisible(true);
      // Small delay to trigger animation after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before hiding
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay - starts below header */}
      <div
        className={cn(
          "fixed inset-0 top-14 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-250",
          isAnimating ? "opacity-100" : "opacity-0"
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Panel - slides in from right, below header */}
      <div
        className={cn(
          "fixed top-14 right-0 bottom-0 z-50 w-full bg-background border-l shadow-2xl",
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "sm:max-w-full md:max-w-2xl lg:max-w-3xl",
          isAnimating 
            ? "translate-x-0 opacity-100" 
            : "translate-x-full opacity-0",
          className
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div 
              className={cn(
                "flex-1 transition-all duration-300 delay-100",
                isAnimating 
                  ? "translate-y-0 opacity-100" 
                  : "translate-y-2 opacity-0"
              )}
            >
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {title}
              </h2>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className={cn(
                "h-9 w-9 shrink-0 transition-all duration-200 hover:rotate-90",
                isAnimating 
                  ? "scale-100 opacity-100" 
                  : "scale-75 opacity-0"
              )}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div 
          className={cn(
            "overflow-y-auto h-[calc(100%-73px)] p-6 transition-all duration-300 delay-150",
            isAnimating 
              ? "translate-y-0 opacity-100" 
              : "translate-y-4 opacity-0"
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
}
