import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CleanupResult {
  deletedCount: number;
  storageFreedMB: number;
  errors: string[];
}

Deno.serve(withPerf({ functionName: 'cleanup-old-images', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Parse optional parameters
    const { dryRun = true, maxAgeDays = 30, maxVersionsToKeep = 3 } = await req.json().catch(() => ({}));

    console.log(`[cleanup-old-images] Starting cleanup with: dryRun=${dryRun}, maxAgeDays=${maxAgeDays}, maxVersionsToKeep=${maxVersionsToKeep}`);

    const result: CleanupResult = {
      deletedCount: 0,
      storageFreedMB: 0,
      errors: [],
    };

    // Step 1: Find old images that are not selected and haven't been accessed in maxAgeDays
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    const { data: oldImages, error: fetchError } = await supabase
      .from("channel_image_history")
      .select("id, image_url, content_id, channel, version, is_selected, last_accessed_at")
      .eq("is_selected", false)
      .lt("last_accessed_at", cutoffDate.toISOString())
      .order("created_at", { ascending: true })
      .limit(100); // Process in batches

    if (fetchError) {
      console.error("[cleanup-old-images] Error fetching old images:", fetchError);
      throw new Error(`Failed to fetch old images: ${fetchError.message}`);
    }

    console.log(`[cleanup-old-images] Found ${oldImages?.length || 0} old images to evaluate`);

    if (!oldImages || oldImages.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No old images found to clean up",
          result,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Group by content_id + channel and keep top N versions
    const groupedImages: Record<string, typeof oldImages> = {};
    
    for (const img of oldImages) {
      const key = `${img.content_id}:${img.channel}`;
      if (!groupedImages[key]) {
        groupedImages[key] = [];
      }
      groupedImages[key].push(img);
    }

    const imagesToDelete: typeof oldImages = [];

    for (const key of Object.keys(groupedImages)) {
      const images = groupedImages[key];
      // Sort by version descending
      images.sort((a, b) => (b.version || 0) - (a.version || 0));
      
      // Keep top N versions, mark rest for deletion
      const toDelete = images.slice(maxVersionsToKeep);
      imagesToDelete.push(...toDelete);
    }

    console.log(`[cleanup-old-images] Identified ${imagesToDelete.length} images for deletion`);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          message: `Dry run: Would delete ${imagesToDelete.length} images`,
          imagesToDelete: imagesToDelete.map(img => ({
            id: img.id,
            channel: img.channel,
            version: img.version,
            lastAccessed: img.last_accessed_at,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Delete from storage and database
    for (const img of imagesToDelete) {
      try {
        // Extract storage path from URL
        const imageUrl = img.image_url;
        if (imageUrl && imageUrl.includes("/storage/v1/object/public/")) {
          const pathMatch = imageUrl.match(/\/storage\/v1\/object\/public\/([^?]+)/);
          if (pathMatch) {
            const fullPath = pathMatch[1];
            const [bucket, ...pathParts] = fullPath.split("/");
            const objectPath = pathParts.join("/");
            
            // Delete from storage
            const { error: storageError } = await supabase.storage
              .from(bucket)
              .remove([objectPath]);
            
            if (storageError) {
              console.warn(`[cleanup-old-images] Storage delete failed for ${objectPath}:`, storageError.message);
              result.errors.push(`Storage: ${objectPath} - ${storageError.message}`);
            } else {
              result.storageFreedMB += 0.1; // Estimate ~100KB per image
            }
          }
        }

        // Delete from database
        const { error: dbError } = await supabase
          .from("channel_image_history")
          .delete()
          .eq("id", img.id);

        if (dbError) {
          console.error(`[cleanup-old-images] DB delete failed for ${img.id}:`, dbError.message);
          result.errors.push(`DB: ${img.id} - ${dbError.message}`);
        } else {
          result.deletedCount++;
        }
      } catch (err) {
        console.error(`[cleanup-old-images] Error processing image ${img.id}:`, err);
        result.errors.push(`Error: ${img.id} - ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }

    console.log(`[cleanup-old-images] Cleanup complete: deleted ${result.deletedCount} images`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup complete: deleted ${result.deletedCount} images`,
        result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[cleanup-old-images] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
