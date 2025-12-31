import { useToast } from "@/hooks/use-toast";
import { 
  Toast, 
  ToastClose, 
  ToastDescription, 
  ToastProvider, 
  ToastTitle, 
  ToastViewport 
} from "@/components/ui/toast";
import { CheckCircle, AlertCircle, Info, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const variantIcons = {
  default: Info,
  success: CheckCircle,
  destructive: AlertCircle,
  warning: AlertTriangle,
  celebration: Sparkles,
};

const variantStyles = {
  default: "text-foreground",
  success: "text-emerald-500",
  destructive: "text-destructive",
  warning: "text-amber-500",
  celebration: "text-primary animate-pulse",
};

export function AnimatedToaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const Icon = variantIcons[variant as keyof typeof variantIcons] || variantIcons.default;
        const iconStyle = variantStyles[variant as keyof typeof variantStyles] || variantStyles.default;
        
        return (
          <Toast key={id} variant={variant} {...props} className="animate-toast-in">
            <div className="flex items-start gap-3">
              {/* Animated Icon */}
              <div className={cn(
                "shrink-0 mt-0.5 p-1 rounded-full",
                variant === 'destructive' && "bg-destructive/10 animate-shake",
                !variant && "bg-muted",
                // Custom styling applied via className prop
              )}>
                <Icon className={cn("w-4 h-4", iconStyle)} />
              </div>
              
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

// Helper function to show success toast with animation
export function showSuccessToast(
  toast: ReturnType<typeof useToast>['toast'],
  title: string,
  description?: string
) {
  toast({
    title,
    description,
    variant: "default",
    className: "border-emerald-500/50 bg-emerald-500/5",
  });
}

// Helper function to show celebration toast
export function showCelebrationToast(
  toast: ReturnType<typeof useToast>['toast'],
  title: string,
  description?: string
) {
  toast({
    title,
    description,
    variant: "default",
    className: "border-primary/50 bg-primary/5",
  });
}
