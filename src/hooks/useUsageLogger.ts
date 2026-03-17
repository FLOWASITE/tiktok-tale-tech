import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";
import type { Json } from "@/integrations/supabase/types";

type UsageType = "script" | "carousel" | "multichannel" | "image_generation";

export function useUsageLogger() {
  const { user } = useAuth();

  const logUsage = useCallback(
    async (
      usageType: UsageType,
      referenceId?: string,
      metadata?: Json
    ) => {
      if (!user?.id) {
        console.warn("Cannot log usage: user not authenticated");
        return;
      }

      try {
        const { error } = await supabase.from("usage_logs").insert([{
          user_id: user.id,
          usage_type: usageType,
          reference_id: referenceId || null,
          metadata: metadata || null,
        }]);

        if (error) {
          console.error("Failed to log usage:", error);
        }
      } catch (err) {
        console.error("Error logging usage:", err);
      }
    },
    [user?.id]
  );

  return { logUsage };
}
