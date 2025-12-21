import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Star, Check } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BrandCardProps {
  template: BrandTemplate;
  onEdit: (template: BrandTemplate) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export function BrandCard({ template, onEdit, onDelete, onSetDefault }: BrandCardProps) {
  return (
    <Card className={`gradient-card border-border/50 transition-all hover:border-primary/30 ${template.is_default ? 'ring-2 ring-primary/50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          {/* Logo */}
          {template.logo_url ? (
            <div className="w-12 h-12 rounded-lg border border-border overflow-hidden bg-muted shrink-0">
              <img
                src={template.logo_url}
                alt={`${template.brand_name} logo`}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/50 shrink-0">
              <span className="text-lg font-bold text-muted-foreground">
                {template.brand_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate flex items-center gap-2">
              {template.is_default && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />}
              {template.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{template.brand_name}</p>
          </div>
          {template.is_default && (
            <Badge variant="secondary" className="shrink-0">
              Mặc định
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {template.brand_guideline}
        </p>
        
        <div className="flex items-center gap-2 text-xs">
          <Badge variant={template.include_logo ? 'default' : 'outline'} className="text-xs">
            Logo trong carousel: {template.include_logo ? 'Có' : 'Không'}
          </Badge>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          {!template.is_default && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => onSetDefault(template.id)}
            >
              <Check className="w-3 h-3 mr-1" />
              Đặt mặc định
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(template)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xóa Brand Template?</AlertDialogTitle>
                <AlertDialogDescription>
                  Bạn có chắc muốn xóa template "{template.name}"? Hành động này không thể hoàn tác.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(template.id)}>
                  Xóa
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
