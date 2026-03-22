import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.Deno.serve(withPerf({ functionName: 'delete-carousel-image', slowThresholdMs: 30000 }, async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, carouselId, slideNumber } = await req.json();

    console.log('Delete request received:', { imageUrl, carouselId, slideNumber });

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract file path from URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/carousel-images/filename.png
    const urlParts = imageUrl.split('/carousel-images/');
    if (urlParts.length !== 2) {
      console.error('Invalid image URL format:', imageUrl);
      return new Response(
        JSON.stringify({ error: 'Invalid image URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const filePath = urlParts[1];
    console.log('Deleting file:', filePath);

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('carousel-images')
      .remove([filePath]);

    if (deleteError) {
      console.error('Storage delete error:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete image: ' + deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Image deleted successfully:', filePath);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Image deleted successfully',
        deletedFile: filePath
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Unexpected error: ' + errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
