import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequest {
  connectionId: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'file';
  messageType?: 'text' | 'image' | 'file' | 'article';
  articleData?: {
    title: string;
    description: string;
    coverUrl: string;
    url: string;
  };
}

function decrypt(encryptedText: string, key: string): string {
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedData = Buffer.from(textParts.join(':'), 'hex');
    const keyBuffer = Buffer.alloc(32);
    Buffer.from(key).copy(keyBuffer);
    const decipher = createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
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
    const { connectionId, content, mediaUrl, mediaType, messageType = 'text', articleData } = body;

    if (!connectionId || !content) {
      throw new Error('connectionId and content are required');
    }

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'zalo_oa')
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    if (!connection.is_active) {
      throw new Error('Connection is not active');
    }

    // Decrypt access token
    const accessToken = decrypt(connection.access_token, encryptionKey);
    if (!accessToken) {
      throw new Error('Failed to decrypt access token');
    }

    // Check if token is expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      // Mark as needs_reauth
      await supabase
        .from('social_connections')
        .update({ 
          is_active: false, 
          metadata: { ...connection.metadata, needs_reauth: true } 
        })
        .eq('id', connectionId);
      
      throw new Error('Token expired. Please reconnect Zalo OA.');
    }

    console.log(`Publishing to Zalo OA: ${connection.platform_username}, type: ${messageType}`);

    let result;

    // Zalo OA uses broadcast messages for posting content
    // For OA broadcast, we use the article/post API
    if (messageType === 'article' && articleData) {
      // Create article/post on OA
      const response = await fetch('https://openapi.zalo.me/v2.0/article/create', {
        method: 'POST',
        headers: {
          'access_token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'normal',
          title: articleData.title,
          author: connection.platform_username || 'OA',
          cover: {
            cover_type: 'photo',
            photo_url: articleData.coverUrl,
            status: 'show',
          },
          description: articleData.description,
          body: [
            {
              type: 'text',
              content: content,
            },
          ],
          status: 'show',
        }),
      });

      result = await response.json();
    } else if (mediaUrl && mediaType === 'image') {
      // Upload image first, then broadcast
      // Step 1: Upload image
      const uploadResponse = await fetch('https://openapi.zalo.me/v2.0/article/upload_video_or_image?type=image', {
        method: 'POST',
        headers: {
          'access_token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: mediaUrl,
        }),
      });

      const uploadResult = await uploadResponse.json();
      
      if (uploadResult.error) {
        throw new Error(uploadResult.message || 'Failed to upload image');
      }

      // For OA, image posts are typically articles with images
      result = { 
        success: true, 
        message: 'Image uploaded',
        data: uploadResult 
      };
    } else {
      // Text-only broadcast message
      // Note: Zalo OA broadcast requires recipients or is for followers
      // For now, we'll create a text article/update
      const response = await fetch('https://openapi.zalo.me/v2.0/article/create', {
        method: 'POST',
        headers: {
          'access_token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'normal',
          title: content.substring(0, 100),
          author: connection.platform_username || 'OA',
          description: content.substring(0, 200),
          body: [
            {
              type: 'text',
              content: content,
            },
          ],
          status: 'show',
        }),
      });

      result = await response.json();
    }

    console.log('Zalo publish result:', result);

    if (result.error && result.error !== 0) {
      throw new Error(result.message || 'Failed to publish to Zalo OA');
    }

    return new Response(
      JSON.stringify({
        success: true,
        platform: 'zalo_oa',
        postId: result.data?.token || result.data?.article_id,
        message: 'Đã đăng bài thành công lên Zalo OA',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Publish Zalo error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
