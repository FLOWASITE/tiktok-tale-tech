import { decryptCredential } from "../_shared/crypto.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequest {
  connectionId: string;
  content: string;
  mediaUrls?: string[];
  mediaType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
}

// Wait for media container to be ready
async function waitForMediaContainer(containerId: string, accessToken: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const statusResponse = await fetch(
      `https://graph.threads.net/v1.0/${containerId}?` + new URLSearchParams({
        access_token: accessToken,
        fields: 'status,error_message',
      })
    );

    if (!statusResponse.ok) {
      console.error('Failed to check container status');
      return false;
    }

    const statusData = await statusResponse.json();
    console.log(`Container status (attempt ${i + 1}):`, statusData.status);

    if (statusData.status === 'FINISHED') {
      return true;
    } else if (statusData.status === 'ERROR') {
      console.error('Container error:', statusData.error_message);
      return false;
    }

    // Wait 1 second before next check
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return false;
}

Deno.serve(withPerf({ functionName: 'publish-threads' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const isInternalCall = !!serviceRoleKey && token === serviceRoleKey;

    if (!isInternalCall) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        throw new Error('Unauthorized');
      }
    }

    const body: PublishRequest = await req.json();
    const { connectionId, content, mediaUrls, mediaType } = body;

    if (!connectionId || !content) {
      throw new Error('connectionId and content are required');
    }

    console.log('Publishing to Threads:', { connectionId, hasMedia: !!mediaUrls?.length, mediaType });

    // Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'threads')
      .single();

    if (connectionError || !connection) {
      throw new Error('Threads connection not found');
    }

    if (!connection.is_active) {
      throw new Error('Threads connection is not active');
    }

    // Decrypt access token
    const accessToken = await decryptCredential(connection.access_token);

    const threadsUserId = connection.platform_user_id || connection.metadata?.threads_user_id;
    if (!threadsUserId) {
      throw new Error('Threads user ID not found in connection');
    }

    let postId: string;
    let postUrl: string;

    // Step 1: Create media container
    console.log('Creating Threads media container...');
    
    const containerParams: Record<string, string> = {
      access_token: accessToken,
      text: content,
    };

    // Determine media type
    if (mediaUrls && mediaUrls.length > 0) {
      if (mediaUrls.length === 1) {
        // Single image or video
        const mediaUrl = mediaUrls[0];
        const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaType === 'VIDEO';
        
        if (isVideo) {
          containerParams.media_type = 'VIDEO';
          containerParams.video_url = mediaUrl;
        } else {
          containerParams.media_type = 'IMAGE';
          containerParams.image_url = mediaUrl;
        }
      } else {
        // Carousel (max 10 items)
        // First, create individual media containers for each item
        const carouselItems: string[] = [];
        
        for (const mediaUrl of mediaUrls.slice(0, 10)) {
          const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.mov');
          const itemParams: Record<string, string> = {
            access_token: accessToken,
            is_carousel_item: 'true',
          };

          if (isVideo) {
            itemParams.media_type = 'VIDEO';
            itemParams.video_url = mediaUrl;
          } else {
            itemParams.media_type = 'IMAGE';
            itemParams.image_url = mediaUrl;
          }

          const itemResponse = await fetch(
            `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams(itemParams),
            }
          );

          if (!itemResponse.ok) {
            const itemError = await itemResponse.json();
            console.error('Failed to create carousel item:', itemError);
            throw new Error(itemError.error?.message || 'Failed to create carousel item');
          }

          const itemData = await itemResponse.json();
          carouselItems.push(itemData.id);
          console.log('Created carousel item:', itemData.id);
        }

        containerParams.media_type = 'CAROUSEL';
        containerParams.children = carouselItems.join(',');
      }
    } else {
      // Text-only post
      containerParams.media_type = 'TEXT';
    }

    const containerResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(containerParams),
      }
    );

    if (!containerResponse.ok) {
      const containerError = await containerResponse.json();
      console.error('Failed to create container:', containerError);
      throw new Error(containerError.error?.message || 'Failed to create media container');
    }

    const containerData = await containerResponse.json();
    const containerId = containerData.id;
    console.log('Media container created:', containerId);

    // Wait for container to be ready (for media posts)
    if (mediaUrls && mediaUrls.length > 0) {
      console.log('Waiting for media container to be ready...');
      const isReady = await waitForMediaContainer(containerId, accessToken);
      if (!isReady) {
        throw new Error('Media container failed to process');
      }
    }

    // Step 2: Publish the thread
    console.log('Publishing thread...');
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          access_token: accessToken,
          creation_id: containerId,
        }),
      }
    );

    if (!publishResponse.ok) {
      const publishError = await publishResponse.json();
      console.error('Failed to publish:', publishError);
      throw new Error(publishError.error?.message || 'Failed to publish thread');
    }

    const publishData = await publishResponse.json();
    postId = publishData.id;
    
    // Get the permalink
    const permalinkResponse = await fetch(
      `https://graph.threads.net/v1.0/${postId}?` + new URLSearchParams({
        access_token: accessToken,
        fields: 'permalink',
      })
    );

    if (permalinkResponse.ok) {
      const permalinkData = await permalinkResponse.json();
      postUrl = permalinkData.permalink || `https://www.threads.net/@${connection.platform_username}/post/${postId}`;
    } else {
      postUrl = `https://www.threads.net/@${connection.platform_username}/post/${postId}`;
    }

    console.log('Thread published:', postId);

    // Update connection last_used timestamp
    await supabase
      .from('social_connections')
      .update({ 
        metadata: {
          ...connection.metadata,
          last_post_at: new Date().toISOString(),
          last_post_id: postId,
        }
      })
      .eq('id', connectionId);

    return new Response(
      JSON.stringify({
        success: true,
        platform: 'threads',
        postId: postId,
        postUrl: postUrl,
        message: 'Đã đăng bài thành công lên Threads',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Threads publish error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to publish to Threads';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}));
