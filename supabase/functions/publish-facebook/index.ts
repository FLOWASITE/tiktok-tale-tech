import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decrypt as decryptGCM } from "../_shared/crypto.ts";
import { createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequest {
  connectionId: string;
  content: string;
  mediaUrls?: string[];
  linkUrl?: string;
  scheduleTime?: string;
}

// Legacy CBC decrypt
function decryptLegacyCBC(encryptedText: string, key: string): string {
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedData = Buffer.from(textParts.join(':'), 'hex');
  const keyBuffer = Buffer.alloc(32);
  Buffer.from(key).copy(keyBuffer);
  const decipher = createDecipheriv('aes-256-cbc', keyBuffer, iv);
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Try GCM first, fallback to legacy CBC
async function decryptCredential(ciphertext: string): Promise<string> {
  try {
    const result = await decryptGCM(ciphertext);
    if (result) return result;
  } catch { /* fallback */ }

  const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
  const keyCandidates = [encryptionKey, 'default-encryption-key-change-me', 'default-key'];
  for (const candidate of keyCandidates) {
    try {
      const result = decryptLegacyCBC(ciphertext, candidate);
      if (result) return result;
    } catch { /* try next */ }
  }
  throw new Error('Failed to decrypt credential with any method');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: PublishRequest = await req.json();
    const { connectionId, content, mediaUrls, linkUrl, scheduleTime } = body;

    if (!connectionId || !content) {
      throw new Error('connectionId and content are required');
    }

    console.log('Publishing to Facebook:', { connectionId, hasMedia: !!mediaUrls?.length, hasLink: !!linkUrl });

    // Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'facebook')
      .single();

    if (connectionError || !connection) {
      throw new Error('Facebook connection not found');
    }

    if (!connection.is_active) {
      throw new Error('Facebook connection is not active');
    }

    // Decrypt access token
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
    const accessToken = decrypt(connection.access_token, encryptionKey);

    if (!accessToken) {
      throw new Error('Failed to decrypt access token');
    }

    const pageId = connection.platform_user_id || connection.metadata?.page_id;
    if (!pageId) {
      throw new Error('Page ID not found in connection');
    }

    let postId: string;
    let postUrl: string;

    // Determine post type and publish accordingly
    if (mediaUrls && mediaUrls.length > 0) {
      // Photo post (single image for now)
      console.log('Publishing photo post...');
      
      const photoUrl = mediaUrls[0];
      const photoParams: Record<string, string> = {
        access_token: accessToken,
        url: photoUrl,
        caption: content,
      };

      if (scheduleTime) {
        const scheduledTimestamp = Math.floor(new Date(scheduleTime).getTime() / 1000);
        photoParams.published = 'false';
        photoParams.scheduled_publish_time = scheduledTimestamp.toString();
      }

      const photoResponse = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/photos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(photoParams),
        }
      );

      if (!photoResponse.ok) {
        const errorData = await photoResponse.json();
        console.error('Facebook photo post failed:', errorData);
        throw new Error(errorData.error?.message || 'Failed to publish photo');
      }

      const photoData = await photoResponse.json();
      postId = photoData.post_id || photoData.id;
      postUrl = `https://www.facebook.com/${postId}`;
      console.log('Photo post published:', postId);

    } else if (linkUrl) {
      // Link post
      console.log('Publishing link post...');
      
      const linkParams: Record<string, string> = {
        access_token: accessToken,
        message: content,
        link: linkUrl,
      };

      if (scheduleTime) {
        const scheduledTimestamp = Math.floor(new Date(scheduleTime).getTime() / 1000);
        linkParams.published = 'false';
        linkParams.scheduled_publish_time = scheduledTimestamp.toString();
      }

      const linkResponse = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/feed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(linkParams),
        }
      );

      if (!linkResponse.ok) {
        const errorData = await linkResponse.json();
        console.error('Facebook link post failed:', errorData);
        throw new Error(errorData.error?.message || 'Failed to publish link');
      }

      const linkData = await linkResponse.json();
      postId = linkData.id;
      postUrl = `https://www.facebook.com/${postId}`;
      console.log('Link post published:', postId);

    } else {
      // Text-only post
      console.log('Publishing text post...');
      
      const textParams: Record<string, string> = {
        access_token: accessToken,
        message: content,
      };

      if (scheduleTime) {
        const scheduledTimestamp = Math.floor(new Date(scheduleTime).getTime() / 1000);
        textParams.published = 'false';
        textParams.scheduled_publish_time = scheduledTimestamp.toString();
      }

      const textResponse = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/feed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(textParams),
        }
      );

      if (!textResponse.ok) {
        const errorData = await textResponse.json();
        console.error('Facebook text post failed:', errorData);
        throw new Error(errorData.error?.message || 'Failed to publish text');
      }

      const textData = await textResponse.json();
      postId = textData.id;
      postUrl = `https://www.facebook.com/${postId}`;
      console.log('Text post published:', postId);
    }

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
        platform: 'facebook',
        postId: postId,
        postUrl: postUrl,
        scheduled: !!scheduleTime,
        message: scheduleTime ? 'Bài viết đã được lên lịch' : 'Đã đăng bài thành công lên Facebook Page',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Facebook publish error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to publish to Facebook';
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
});
