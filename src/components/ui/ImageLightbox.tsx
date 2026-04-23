import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ChevronLeft, ChevronRight, Download, Palette, RefreshCw, ZoomIn, ZoomOut, Type, Bug } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RenderDebugInfo } from "@/hooks/useAutoImageGeneration";
import { RenderDebugTimeline } from "@/components/ui/RenderDebugTimeline";

export interface LightboxImage {
  imageUrl: string;
  channel: string;
  channelLabel: string;
  aspectRatio?: string;
  modelUsed?: string;
  renderDebug?: RenderDebugInfo;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  currentIndex: number;
  open: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDownload?: (index: number) => void;
  onEditBackground?: (index: number) => void;
  onRefineText?: (index: number) => void;
  onRetry?: (index: number) => void;
}

export function ImageLightbox({
  images,
  currentIndex,
  open,
  onClose,
  onNavigate,
  onDownload,
  onEditBackground,
  onRefineText,
  onRetry,
}: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [showDebug, setShowDebug] = useState(false);
  const current = images[currentIndex];
  const hasMultiple = images.length > 1;

  const goNext = useCallback(() => {
    if (currentIndex < images.length - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, images.length, onNavigate]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  }, [currentIndex, onNavigate]);

  // Reset zoom on image change
  useEffect(() => { setZoom(1); }, [currentIndex]);

  useEffect(() => {
    setShowDebug(Boolean(current?.renderDebug));
  }, [currentIndex, current?.renderDebug, open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape": onClose(); break;
        case "ArrowLeft": goPrev(); break;
        case "ArrowRight": goNext(); break;
        case "+": setZoom(z => Math.min(z + 0.25, 3)); break;
        case "-": setZoom(z => Math.max(z - 0.25, 0.5)); break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, goNext, goPrev]);

  if (!open || !current) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/90" onClick={onClose} />

          {/* Top bar */}
          <div className="relative z-10 flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-white/90 font-medium text-sm">
                {current.channelLabel}
              </span>
              {current.aspectRatio && (
                <Badge variant="outline" className="border-white/20 text-white/70 text-xs">
                  {current.aspectRatio}
                </Badge>
              )}
              {current.modelUsed && (
                <Badge variant="outline" className="border-white/20 text-white/70 text-xs">
                  {current.modelUsed}
                </Badge>
              )}
              {hasMultiple && (
                <span className="text-white/50 text-xs tabular-nums">
                  {currentIndex + 1} / {images.length}
                </span>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10 h-9 w-9"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Image area */}
          <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 pb-4 touch-manipulation">
            <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col items-center justify-center gap-4">
            {/* Prev button */}
            {hasMultiple && currentIndex > 0 && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute left-2 sm:left-4 text-white/60 hover:text-white hover:bg-white/10 h-10 w-10 z-20"
                onClick={goPrev}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            )}

              <motion.img
                key={current.imageUrl}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                src={current.imageUrl}
                alt={current.channelLabel}
                className="max-w-[90vw] max-h-[70vh] object-contain rounded-lg select-none"
                style={{ transform: `scale(${zoom})`, transition: "transform 0.2s ease" }}
                draggable={false}
              />

              {showDebug && current.renderDebug && (
                <RenderDebugTimeline
                  debug={current.renderDebug}
                  className="w-full max-w-3xl border-white/10 bg-black/65 text-white"
                />
              )}
            </div>

            {/* Next button */}
            {hasMultiple && currentIndex < images.length - 1 && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 sm:right-4 text-white/60 hover:text-white hover:bg-white/10 h-10 w-10 z-20"
                onClick={goNext}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            )}
          </div>

          {/* Bottom toolbar */}
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 px-4 py-3">
            {/* Zoom controls */}
            <Button
              size="sm"
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-white/50 text-xs tabular-nums min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
              disabled={zoom >= 3}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            <div className="w-px h-5 bg-white/20 mx-1" />

            {current.renderDebug && (
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  "text-white/70 hover:text-white hover:bg-white/10",
                  showDebug && "bg-white/10 text-white"
                )}
                onClick={() => setShowDebug((value) => !value)}
              >
                <Bug className="w-4 h-4 mr-1.5" />
                Render debug
              </Button>
            )}

            {onDownload && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => onDownload(currentIndex)}
              >
                <Download className="w-4 h-4 mr-1.5" />
                Tải xuống
              </Button>
            )}
            {onEditBackground && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => onEditBackground(currentIndex)}
              >
                <Palette className="w-4 h-4 mr-1.5" />
                Sửa nền
              </Button>
            )}
            {onRefineText && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => onRefineText(currentIndex)}
              >
                <Type className="w-4 h-4 mr-1.5" />
                Sửa chữ
              </Button>
            )}
            {onRetry && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => onRetry(currentIndex)}
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Tạo lại
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
