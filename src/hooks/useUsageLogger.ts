import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useCallback } from "react";
import type { Json } from "@/integrations/supabase/types";

type UsageType = "script" | "carousel" | "multichannel" | "image_generation";

export function useUsageLogger() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

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
          organization_id: currentOrganization?.id || null,
        }]);

        if (error) {
          console.error("Failed to log usage:", error);
        }
      } catch (err) {
        console.error("Error logging usage:", err);
      }
    },
    [user?.id, currentOrganization?.id]
  );

  return { logUsage };
}
