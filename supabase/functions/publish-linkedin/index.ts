import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

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

// LinkedIn API version (YYYYMM format)
const LINKEDIN_VERSION = '202501';

// Decrypt function for stored credentials
async function decryptToken(encryptedText: string, encryptionKey: string): Promise<string> {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      // Not encrypted, return as is
      return encryptedText;
    }

    const keyData = new TextEncoder().encode(encryptionKey.slice(0, 32).padEnd(32, '0'));
    const key = await crypto.subtle.importKey(
      'raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']
    );

    const iv = Uint8Array.from(atob(parts[0]), c => c.charCodeAt(0));
    const encrypted = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, key, encrypted
    );
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt access token');
  }
}

// Initialize image upload with LinkedIn
async function initializeImageUpload(
  accessToken: string,
  ownerUrn: string
): Promise<{ uploadUrl: string; imageUrn: string }> {
  const response = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': LINKEDIN_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: ownerUrn,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LinkedIn image init failed:', response.status, errorText);
    throw new Error(`Failed to initialize image upload: ${response.status}`);
  }

  const data = await response.json();
  console.log('Image upload initialized:', data.value?.image);

  return {
    uploadUrl: data.value?.uploadUrl,
    imageUrn: data.value?.image,
  };
}

// Upload image binary to LinkedIn
async function uploadImageBinary(
  uploadUrl: string,
  imageData: ArrayBuffer,
  contentType: string
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: imageData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LinkedIn image upload failed:', response.status, errorText);
    throw new Error(`Failed to upload image: ${response.status}`);
  }

  console.log('Image uploaded successfully');
}

// Check image processing status
async function waitForImageProcessing(
  accessToken: string,
  imageUrn: string,
  maxAttempts: number = 10
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`https://api.linkedin.com/rest/images/${encodeURIComponent(imageUrn)}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': LINKEDIN_VERSION,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.status === 'AVAILABLE') {
        console.log('Image processing complete');
        return;
      }
      console.log(`Image status: ${data.status}, waiting...`);
    }

    // Wait 1 second between checks
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Image processing timeout');
}

// Upload image from URL to LinkedIn
async function uploadLinkedInImage(
  accessToken: string,
  personUrn: string,
  imageUrl: string
): Promise<string> {
  console.log('Uploading image to LinkedIn:', imageUrl);

  // Step 1: Initialize upload
  const { uploadUrl, imageUrn } = await initializeImageUpload(accessToken, personUrn);

  // Step 2: Download image from URL
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }
  const imageData = await imageResponse.arrayBuffer();
  const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

  // Step 3: Upload to LinkedIn
  await uploadImageBinary(uploadUrl, imageData, contentType);

  // Step 4: Wait for processing
  await waitForImageProcessing(accessToken, imageUrn);

  return imageUrn;
}

// Create a LinkedIn post
async function createLinkedInPost(
  accessToken: string,
  personUrn: string,
  content: string,
  imageUrn?: string
): Promise<{ postId: string; postUrn: string }> {
  const postData: Record<string, unknown> = {
    author: personUrn,
    commentary: content,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  // Add media if provided
  if (imageUrn) {
    postData.content = {
      media: {
        id: imageUrn,
      },
    };
  }

  console.log('Creating LinkedIn post with data:', JSON.stringify(postData, null, 2));

  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': LINKEDIN_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LinkedIn post creation failed:', response.status, errorText);

    // Check for token expiry
    if (response.status === 401) {
      throw new Error('LinkedIn token expired. Please reconnect your account.');
    }

    throw new Error(`Failed to create post: ${response.status} - ${errorText}`);
  }

  // Post ID is in the x-restli-id header
  const postId = response.headers.get('x-restli-id') || '';
  const postUrn = `urn:li:share:${postId}`;

  console.log('LinkedIn post created successfully:', postId);

  return { postId, postUrn };
}

Deno.serve(withPerf({ functionName: 'publish-linkedin' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
    const supabase = getServiceClient();

    const body: PublishRequest = await req.json();
    const { connectionId, content, mediaUrls, scheduleId, contentId } = body;

    console.log('LinkedIn publish request:', {
      connectionId,
      contentLength: content?.length,
      mediaCount: mediaUrls?.length,
    });

    if (!connectionId) {
      throw new Error('Connection ID is required');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Content is required for LinkedIn posts');
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

    if (connection.platform !== 'linkedin') {
      throw new Error('This endpoint only supports LinkedIn connections');
    }

    // Check if connection is active
    if (!connection.is_active) {
      throw new Error('LinkedIn connection is not active. Please reconnect.');
    }

    // Check token expiry
    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at);
      if (expiresAt < new Date()) {
        throw new Error('LinkedIn token has expired. Please reconnect your account.');
      }
    }

    // Get and decrypt access token
    let accessToken = connection.access_token;
    if (!accessToken) {
      throw new Error('LinkedIn access token not found');
    }

    accessToken = await decryptToken(accessToken, encryptionKey);

    // Get person URN from metadata
    const metadata = connection.metadata as Record<string, unknown> | null;
    const personUrn = metadata?.person_urn as string;

    if (!personUrn) {
      throw new Error('LinkedIn person URN not found');
    }

    // Create publish attempt record
    const { data: attempt, error: attemptError } = await supabase
      .from('publish_attempts')
      .insert({
        connection_id: connectionId,
        content_id: contentId,
        schedule_id: scheduleId,
        platform: 'linkedin',
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
      let imageUrn: string | undefined;

      // Upload first image if provided (LinkedIn only supports one image per post via this API)
      if (mediaUrls && mediaUrls.length > 0) {
        const firstImageUrl = mediaUrls[0];
        
        // Only upload image files
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(firstImageUrl)) {
          imageUrn = await uploadLinkedInImage(accessToken, personUrn, firstImageUrl);
        } else {
          console.log('Skipping non-image media:', firstImageUrl);
        }
      }

      // Create the post
      const { postId, postUrn } = await createLinkedInPost(
        accessToken,
        personUrn,
        content,
        imageUrn
      );

      // Update publish attempt to success
      if (attemptId) {
        await supabase
          .from('publish_attempts')
          .update({
            status: 'success',
            external_id: postId,
            published_at: new Date().toISOString(),
            response_data: { postId, postUrn },
          })
          .eq('id', attemptId);
      }

      // Update schedule if provided
      if (scheduleId) {
        await supabase
          .from('content_schedules')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            external_post_id: postId,
          })
          .eq('id', scheduleId);
      }

      // Log to content publishing logs
      if (contentId) {
        await supabase.from('content_publishing_logs').insert({
          content_id: contentId,
          platform: 'linkedin',
          status: 'published',
          external_post_id: postId,
          published_at: new Date().toISOString(),
          metadata: { postUrn },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          postId,
          postUrn,
          message: 'Successfully published to LinkedIn',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (publishError: unknown) {
      const errorMessage = publishError instanceof Error ? publishError.message : 'Unknown error';
      console.error('LinkedIn publish error:', errorMessage);

      // Update publish attempt to failed
      if (attemptId) {
        await supabase
          .from('publish_attempts')
          .update({
            status: 'failed',
            error_message: errorMessage,
          })
          .eq('id', attemptId);
      }

      // Mark connection as inactive if token expired
      if (errorMessage.includes('expired') || errorMessage.includes('401')) {
        await supabase
          .from('social_connections')
          .update({
            is_active: false,
            metadata: {
              ...metadata,
              error: 'token_expired',
              error_at: new Date().toISOString(),
            },
          })
          .eq('id', connectionId);
      }

      throw publishError;
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('LinkedIn publish error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
