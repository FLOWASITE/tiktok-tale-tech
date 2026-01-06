import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ZoomIn, ZoomOut, RotateCcw, Smartphone, Monitor, Tablet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdCopyVariation, AdPlatform } from '@/types/adCopy';
import { 
  FacebookFeedMockup, 
  FacebookStoryMockup, 
  InstagramFeedMockup, 
  InstagramStoryMockup, 
  InstagramReelsMockup 
} from './AdCopyMockups';
import { GoogleRSAMockup, GoogleDisplayMockup } from './GoogleAdsMockups';
import { TikTokAdMockup } from './TikTokMockup';
import { LinkedInSponsoredMockup } from './LinkedInMockup';

interface FullscreenMockupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variation: AdCopyVariation;
  platform: AdPlatform | string;
  brandName: string;
  logoUrl?: string;
}

type DeviceFrame = 'mobile' | 'tablet' | 'desktop';

export function FullscreenMockup({ 
  open, 
  onOpenChange, 
  variation, 
  platform, 
  brandName, 
  logoUrl 
}: FullscreenMockupProps) {
  const [zoom, setZoom] = React.useState(1);
  const [deviceFrame, setDeviceFrame] = React.useState<DeviceFrame>('mobile');

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const deviceFrameStyles: Record<DeviceFrame, string> = {
    mobile: 'max-w-[375px]',
    tablet: 'max-w-[768px]',
    desktop: 'max-w-[1024px]',
  };

  const renderMockup = () => {
    const mockupProps = { variation, brandName, logoUrl };
    
    switch (platform) {
      case 'facebook_feed':
      case 'meta_feed':
        return <FacebookFeedMockup {...mockupProps} />;
      case 'facebook_story':
      case 'meta_story':
        return <FacebookStoryMockup {...mockupProps} />;
      case 'instagram_feed':
        return <InstagramFeedMockup {...mockupProps} />;
      case 'instagram_story':
        return <InstagramStoryMockup {...mockupProps} />;
      case 'instagram_reels':
      case 'meta_reels':
        return <InstagramReelsMockup {...mockupProps} />;
      case 'google_rsa':
        return <GoogleRSAMockup {...mockupProps} />;
      case 'google_display':
        return <GoogleDisplayMockup {...mockupProps} />;
      case 'tiktok':
        return <TikTokAdMockup {...mockupProps} />;
      case 'linkedin':
        return <LinkedInSponsoredMockup {...mockupProps} />;
      default:
        return <div className="text-muted-foreground text-center py-8">No preview available</div>;
    }
  };

  // Handle keyboard shortcuts
  React.useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 overflow-hidden bg-gray-900">
        {/* Top Toolbar */}
        <div className="absolute top-0 left-0 right-0 h-14 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-white border-gray-600">
              Variation {variation.variation_label}
            </Badge>
            <span className="text-gray-400 text-sm">Fullscreen Preview</span>
          </div>

          {/* Device Frame Selector */}
          <div className="flex items-center gap-1 bg-gray-700/50 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3",
                deviceFrame === 'mobile' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
              )}
              onClick={() => setDeviceFrame('mobile')}
            >
              <Smartphone className="h-4 w-4 mr-1" />
              Mobile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3",
                deviceFrame === 'tablet' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
              )}
              onClick={() => setDeviceFrame('tablet')}
            >
              <Tablet className="h-4 w-4 mr-1" />
              Tablet
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3",
                deviceFrame === 'desktop' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
              )}
              onClick={() => setDeviceFrame('desktop')}
            >
              <Monitor className="h-4 w-4 mr-1" />
              Desktop
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-700/50 rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-white"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-white text-sm font-mono w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-white"
                onClick={handleZoomIn}
                disabled={zoom >= 2}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-white"
                onClick={handleResetZoom}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mockup Preview Area */}
        <div className="w-full h-full pt-14 flex items-center justify-center overflow-auto bg-[radial-gradient(circle_at_center,_#374151_1px,_transparent_1px)] bg-[size:20px_20px]">
          <div 
            className={cn(
              "transition-all duration-200 ease-out w-full mx-auto",
              deviceFrameStyles[deviceFrame]
            )}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          >
            {/* Device Frame */}
            <div className={cn(
              "bg-gray-800 rounded-[2.5rem] p-3 shadow-2xl",
              deviceFrame === 'desktop' && 'rounded-xl'
            )}>
              <div className={cn(
                "bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden",
                deviceFrame === 'desktop' && 'rounded-lg'
              )}>
                {renderMockup()}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Hints */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 text-xs text-gray-500">
          <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded">+</kbd> / <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">-</kbd> Zoom</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded">0</kbd> Reset</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Esc</kbd> Close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
