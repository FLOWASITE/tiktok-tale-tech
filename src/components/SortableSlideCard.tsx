import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { CarouselSlide } from '@/types/carousel';
import { SlidePromptCard } from './SlidePromptCard';
import { GeneratedImage } from '@/hooks/useImageGeneration';

interface SortableSlideCardProps {
  slide: CarouselSlide;
  totalSlides: number;
  generatedImage?: GeneratedImage;
  isGenerating: boolean;
  onGenerateImage: () => void;
  canGenerateImage: boolean;
  onSlideUpdate?: (updatedSlide: CarouselSlide) => void;
}

export function SortableSlideCard({
  slide,
  totalSlides,
  generatedImage,
  isGenerating,
  onGenerateImage,
  canGenerateImage,
  onSlideUpdate,
}: SortableSlideCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `slide-${slide.slideNumber}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/drag">
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-1 top-4 z-10 opacity-100 sm:opacity-0 sm:group-hover/drag:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 rounded bg-muted/80 hover:bg-muted touch-manipulation"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      <SlidePromptCard
        slide={slide}
        totalSlides={totalSlides}
        generatedImage={generatedImage}
        isGenerating={isGenerating}
        onGenerateImage={onGenerateImage}
        canGenerateImage={canGenerateImage}
        onSlideUpdate={onSlideUpdate}
      />
    </div>
  );
}
