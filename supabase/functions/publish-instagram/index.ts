import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

interface PublishRequest {
  connectionId: string;
  content: string;
  mediaUrls?: string[];
  scheduleId?: string;
  contentId?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get global platform credentials from admin settings
async function getGlobalPlatformCredentials(
  supabase: any,
  platform: string,
): Promise<{ appId: string | null; appSecret: string | null }> {
  try {
    const { data: settings, error } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', platform)
      .eq('is_enabled', true)
      .maybeSingle();

    if (error || !settings) {
      console.log(`No global credentials found for ${platform}`);
      return { appId: null, appSecret: null };
    }

    const [appId, appSecret] = await Promise.all([
      settings.consumer_key ? decryptCredential(settings.consumer_key) : null,
      settings.consumer_secret ? decryptCredential(settings.consumer_secret) : null,
    ]);
    return { appId, appSecret };
  } catch (error) {
    console.error('Error fetching global credentials:', error);
    return { appId: null, appSecret: null };
  }
}

// Publish a single image/video to Instagram
async function publishMedia(
  igUserId: string,
  accessToken: string,
  mediaUrl: string,
  caption: string,
  isVideo: boolean = false
): Promise<{ id: string }> {
  const baseUrl = 'https://graph.facebook.com/v24.0';
  
  // Step 1: Create media container
  const containerParams: Record<string, string> = {
    access_token: accessToken,
    caption: caption,
  };

  if (isVideo) {
    containerParams.video_url = mediaUrl;
    containerParams.media_type = 'REELS'; // or 'VIDEO' for feed videos
  } else {
    containerParams.image_url = mediaUrl;
  }

  console.log('Creating media container for:', mediaUrl);
  
  const containerResponse = await fetch(`${baseUrl}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(containerParams).toString(),
  });

  const containerData = await containerResponse.json();
  
  if (containerData.error) {
    console.error('Container creation error:', containerData.error);
    throw new Error(containerData.error.message || 'Failed to create media container');
  }

  const containerId = containerData.id;
  console.log('Created container:', containerId);

  // Step 2: Wait for media to be ready (for videos)
  if (isVideo) {
    let status = 'IN_PROGRESS';
    let attempts = 0;
    const maxAttempts = 30; // Wait up to 5 minutes

    while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const statusResponse = await fetch(
        `${baseUrl}/${containerId}?fields=status_code&access_token=${accessToken}`
      );
      const statusData = await statusResponse.json();
      status = statusData.status_code;
      attempts++;
      
      console.log(`Video processing status: ${status} (attempt ${attempts})`);
      
      if (status === 'ERROR') {
        throw new Error('Video processing failed');
      }
    }

    if (status !== 'FINISHED') {
      throw new Error('Video processing timeout');
    }
  }

  // Step 3: Publish the container
  console.log('Publishing container:', containerId);
  
  const publishResponse = await fetch(`${baseUrl}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    }).toString(),
  });

  const publishData = await publishResponse.json();
  
  if (publishData.error) {
    console.error('Publish error:', publishData.error);
    throw new Error(publishData.error.message || 'Failed to publish media');
  }

  console.log('Published successfully:', publishData.id);
  
  return { id: publishData.id };
}

// Publish a carousel (multiple images/videos)
async function publishCarousel(
  igUserId: string,
  accessToken: string,
  mediaUrls: string[],
  caption: string
): Promise<{ id: string }> {
  const baseUrl = 'https://graph.facebook.com/v24.0';
  const containerIds: string[] = [];

  // Step 1: Create containers for each media item (without caption)
  for (const mediaUrl of mediaUrls) {
    const isVideo = /\.(mp4|mov|avi|webm)$/i.test(mediaUrl);
    
    const params: Record<string, string> = {
      access_token: accessToken,
      is_carousel_item: 'true',
    };

    if (isVideo) {
      params.video_url = mediaUrl;
      params.media_type = 'VIDEO';
    } else {
      params.image_url = mediaUrl;
    }

    console.log('Creating carousel item for:', mediaUrl);
    
    const response = await fetch(`${baseUrl}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Carousel item error:', data.error);
      throw new Error(data.error.message || 'Failed to create carousel item');
    }

    containerIds.push(data.id);
  }

  console.log('Created carousel items:', containerIds);

  // Step 2: Create carousel container
  const carouselResponse = await fetch(`${baseUrl}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      access_token: accessToken,
      media_type: 'CAROUSEL',
      caption: caption,
      children: containerIds.join(','),
    }).toString(),
  });

  const carouselData = await carouselResponse.json();
  
  if (carouselData.error) {
    console.error('Carousel container error:', carouselData.error);
    throw new Error(carouselData.error.message || 'Failed to create carousel container');
  }

  const carouselId = carouselData.id;
  console.log('Created carousel container:', carouselId);

  // Step 3: Publish the carousel
  const publishResponse = await fetch(`${baseUrl}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      creation_id: carouselId,
      access_token: accessToken,
    }).toString(),
  });

  const publishData = await publishResponse.json();
  
  if (publishData.error) {
    console.error('Carousel publish error:', publishData.error);
    throw new Error(publishData.error.message || 'Failed to publish carousel');
  }

  console.log('Published carousel successfully:', publishData.id);
  
  return { id: publishData.id };
}

Deno.serve(withPerf({ functionName: 'publish-instagram' }, async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
    const supabase = getServiceClient();

    const body: PublishRequest = await req.json();
    const { connectionId, content, mediaUrls, scheduleId, contentId } = body;

    console.log('Instagram publish request:', { connectionId, contentLength: content?.length, mediaCount: mediaUrls?.length });

    if (!connectionId) {
      throw new Error('Connection ID is required');
    }

    // Instagram requires at least one media item
    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('Instagram requires at least one image or video to publish');
    }

    // Fetch connection details
    const { data: connection, error: connectionError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connectionError || !connection) {
      console.error('Connection error:', connectionError);
      throw new Error('Social connection not found');
    }

    console.log('Found connection for platform:', connection.platform);

    if (connection.platform !== 'instagram') {
      throw new Error('This endpoint only supports Instagram connections');
    }

    // Get access token from connection
    let accessToken = connection.access_token;
    const igUserId = connection.platform_user_id;

    if (!accessToken) {
      // Try to get from credentials
      const credentials = connection.credentials as Record<string, string> | null;
      accessToken = credentials?.access_token;
    }

    if (!accessToken || !igUserId) {
      throw new Error('Instagram access token or user ID not found');
    }

    // Decrypt access token (fallback to raw if already plaintext)
    const rawToken = accessToken;
    try {
      accessToken = await decryptCredential(accessToken);
    } catch (e) {
      console.warn('[publish-instagram] decryptCredential failed, assuming plaintext token:', (e as Error).message);
      accessToken = rawToken;
    }
    // Meta tokens are ASCII (letters/digits/underscore/dash). If decrypted value
    // contains anything else, the stored value was likely plaintext that happened
    // to base64-decode — fall back to the raw stored value.
    if (!/^[A-Za-z0-9_\-|.]+$/.test(accessToken)) {
      console.warn('[publish-instagram] decrypted token has invalid charset, falling back to raw stored token');
      accessToken = rawToken;
    }

    // Create publish attempt record
    const { data: attempt, error: attemptError } = await supabase
      .from('publish_attempts')
      .insert({
        connection_id: connectionId,
        content_id: contentId,
        schedule_id: scheduleId,
        platform: 'instagram',
        status: 'pending',
        content_snapshot: { content, mediaUrls },
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Failed to create publish attempt:', attemptError);
    }

    const attemptId = attempt?.id;

    try {
      let result: { id: string };

      // Publish based on media count
      if (mediaUrls.length === 1) {
        // Single media post
        const mediaUrl = mediaUrls[0];
        const isVideo = /\.(mp4|mov|avi|webm)$/i.test(mediaUrl);
        result = await publishMedia(igUserId, accessToken, mediaUrl, content || '', isVideo);
      } else {
        // Carousel post (max 10 items)
        const limitedMediaUrls = mediaUrls.slice(0, 10);
        result = await publishCarousel(igUserId, accessToken, limitedMediaUrls, content || '');
      }

      console.log('Instagram publish result:', result);

      // Update publish attempt as successful
      if (attemptId) {
        await supabase
          .from('publish_attempts')
          .update({
            status: 'success',
            external_post_id: result.id,
            published_at: new Date().toISOString(),
          })
          .eq('id', attemptId);
      }

      // Update connection's last_used_at
      await supabase
        .from('social_connections')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', connectionId);

      // Update schedule if provided
      if (scheduleId) {
        await supabase
          .from('content_schedules')
          .update({
            publish_status: 'published',
            published_at: new Date().toISOString(),
            external_post_id: result.id,
          })
          .eq('id', scheduleId);
      }

      // Log the publishing action
      if (contentId) {
        await supabase.from('content_publishing_logs').insert({
          content_id: contentId,
          schedule_id: scheduleId,
          channel: 'instagram',
          action: 'published',
          details: {
            post_id: result.id,
            media_count: mediaUrls.length,
          },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          platform: 'instagram',
          postId: result.id,
          message: 'Successfully published to Instagram',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (publishError: any) {
      console.error('Instagram publish error:', publishError);

      // Update publish attempt as failed
      if (attemptId) {
        await supabase
          .from('publish_attempts')
          .update({
            status: 'failed',
            error_message: publishError.message,
          })
          .eq('id', attemptId);
      }

      // Update schedule if provided
      if (scheduleId) {
        await supabase
          .from('content_schedules')
          .update({
            publish_status: 'failed',
            publish_error: publishError.message,
          })
          .eq('id', scheduleId);
      }

      // Log the failure
      if (contentId) {
        await supabase.from('content_publishing_logs').insert({
          content_id: contentId,
          schedule_id: scheduleId,
          channel: 'instagram',
          action: 'failed',
          error_message: publishError.message,
          details: { error: publishError.message },
        });
      }

      throw publishError;
    }
  } catch (error: any) {
    console.error('Error in publish-instagram:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        platform: 'instagram',
        error: error.message || 'Failed to publish to Instagram',
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}));
