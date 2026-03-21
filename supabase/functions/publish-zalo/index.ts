import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptCredential } from "../_shared/crypto.ts";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    // Decrypt access token using shared helper
    const accessToken = await decryptCredential(connection.access_token);
    if (!accessToken) {
      throw new Error('Failed to decrypt access token');
    }

    // Check if token is expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
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

    if (messageType === 'article' && articleData) {
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
          body: [{ type: 'text', content }],
          status: 'show',
        }),
      });
      result = await response.json();
    } else if (mediaUrl && mediaType === 'image') {
      const uploadResponse = await fetch('https://openapi.zalo.me/v2.0/article/upload_video_or_image?type=image', {
        method: 'POST',
        headers: {
          'access_token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: mediaUrl }),
      });
      const uploadResult = await uploadResponse.json();
      if (uploadResult.error) {
        throw new Error(uploadResult.message || 'Failed to upload image');
      }
      result = { success: true, message: 'Image uploaded', data: uploadResult };
    } else {
      // Use broadcast API for text-only posts (no cover image required)
      const response = await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
        method: 'POST',
        headers: {
          'access_token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { user_id: 'all' },
          message: { text: content },
        }),
      });
      result = await response.json();
    }

    console.log('Zalo publish result:', result);

    if (result.error && result.error !== 0) {
      if (result.error === -224) {
        return new Response(
          JSON.stringify({
            success: false,
            errorCode: 'OA_TIER_LIMITED',
            error: 'Zalo OA đang dùng gói Cơ bản, không hỗ trợ đăng bài qua API. Vui lòng nâng cấp gói tại https://oa.zalo.me/home/pricing',
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
