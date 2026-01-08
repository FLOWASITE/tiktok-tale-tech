import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, ExternalLink, Sparkles } from 'lucide-react';

export function SettingsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Cài đặt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Lovable AI Info Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Image Generation
            </h3>
            
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  Hệ thống sử dụng <strong>Lovable AI</strong> tích hợp sẵn để tạo ảnh. 
                  Không cần cấu hình API key riêng.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Info Section */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <h4 className="font-medium text-sm mb-2">Thông tin</h4>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• Lovable AI hỗ trợ tạo ảnh với Gemini Image và các model khác</li>
                <li>• Chi phí được tính theo usage của project</li>
                <li>• Admin có thể cấu hình model AI tại Admin Panel</li>
              </ul>
              <a
                href="https://docs.lovable.dev/features/ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-3"
              >
                <ExternalLink className="w-3 h-3" />
                Xem chi tiết Lovable AI
              </a>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
