import * as React from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface MobileFABProps {
  onClick: () => void;
  icon?: React.ReactNode;
  visible?: boolean;
  className?: string;
}

export function MobileFAB({
  onClick,
  icon = <Plus className="w-6 h-6" />,
  visible = true,
  className,
}: MobileFABProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={onClick}
          className={cn(
            "fixed bottom-6 right-6 z-50 md:hidden",
            "w-14 h-14 rounded-full",
            "bg-gradient-to-r from-primary to-primary/80",
            "text-primary-foreground",
            "shadow-lg shadow-primary/30",
            "flex items-center justify-center",
            "active:scale-95 transition-transform",
            "border border-primary/20",
            className
          )}
          aria-label="Thêm mới"
        >
          {icon}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
