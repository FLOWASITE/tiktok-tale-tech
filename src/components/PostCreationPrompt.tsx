import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Users, ArrowRight, X } from 'lucide-react';

interface PostCreationPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentTitle: string;
  contentId: string;
  onAssign: () => void;
  onSkip: () => void;
}

export const PostCreationPrompt = ({
  open,
  onOpenChange,
  contentTitle,
  onAssign,
  onSkip,
}: PostCreationPromptProps) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleAssign = () => {
    setIsClosing(true);
    onOpenChange(false);
    // Small delay to let dialog close before opening assignment dialog
    setTimeout(() => {
      onAssign();
      setIsClosing(false);
    }, 150);
  };

  const handleSkip = () => {
    onOpenChange(false);
    onSkip();
  };

  return (
    <Dialog open={open && !isClosing} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Tạo nội dung thành công!
          </DialogTitle>
          <DialogDescription className="text-center">
            Nội dung "<span className="font-medium text-foreground">{contentTitle}</span>" đã được tạo.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Bạn có muốn phân công cho nhân viên để thực hiện các bước tiếp theo không?
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={handleSkip}
              className="h-auto py-4 flex flex-col items-center gap-2"
            >
              <X className="w-5 h-5" />
              <span className="text-sm">Bỏ qua</span>
              <span className="text-xs text-muted-foreground">Tôi sẽ tự xử lý</span>
            </Button>
            
            <Button 
              onClick={handleAssign}
              className="h-auto py-4 flex flex-col items-center gap-2"
            >
              <Users className="w-5 h-5" />
              <span className="text-sm">Phân công ngay</span>
              <span className="text-xs opacity-80">Giao cho nhân viên</span>
            </Button>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button variant="link" size="sm" onClick={handleSkip} className="text-muted-foreground">
            Đi đến nội dung
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
