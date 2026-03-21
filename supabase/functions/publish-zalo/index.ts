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
  mediaUrls?: string[];
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
    const { connectionId, content, mediaUrls, mediaUrl, mediaType, messageType, articleData } = body;

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

    // Determine cover image URL from various sources
    const coverImageUrl = articleData?.coverUrl || mediaUrls?.[0] || mediaUrl || null;

    // Zalo OA Article API requires a cover image
    if (!coverImageUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          errorCode: 'MISSING_COVER_IMAGE',
          error: 'Zalo OA yêu cầu ảnh bìa để đăng bài viết. Vui lòng thêm ảnh cho bài viết.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Publishing article to Zalo OA: ${connection.platform_username}, cover: ${coverImageUrl?.substring(0, 80)}...`);

    // Step 1: Upload cover image to Zalo
    const uploadFormData = new FormData();
    const imageResponse = await fetch(coverImageUrl);
    const imageBlob = await imageResponse.blob();
    uploadFormData.append('file', imageBlob, 'cover.png');

    const uploadRes = await fetch('https://openapi.zalo.me/v2.0/article/upload_video_or_image?type=image', {
      method: 'POST',
      headers: {
        'access_token': accessToken,
      },
      body: uploadFormData,
    });
    const uploadResult = await uploadRes.json();
    console.log('Zalo image upload result:', JSON.stringify(uploadResult));

    if (uploadResult.error && uploadResult.error !== 0) {
      // Check for tier limitation on upload
      if (uploadResult.error === -224) {
        return new Response(
          JSON.stringify({
            success: false,
            errorCode: 'OA_TIER_LIMITED',
            error: 'Zalo OA đang dùng gói Cơ bản, không hỗ trợ đăng bài qua API. Vui lòng nâng cấp gói tại https://oa.zalo.me/home/pricing',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(uploadResult.message || 'Failed to upload cover image to Zalo');
    }

    const zaloPhotoId = uploadResult.data?.photo_id;
    if (!zaloPhotoId) {
      throw new Error('Zalo did not return a photo_id after upload');
    }

    // Step 2: Extract title from content (first line or first 100 chars)
    const lines = content.split('\n').filter(l => l.trim());
    const rawTitle = articleData?.title || lines[0] || 'Bài viết mới';
    const articleTitle = rawTitle.replace(/[*#_~`]/g, '').trim().substring(0, 100);
    const articleDescription = articleData?.description || lines.slice(0, 2).join(' ').replace(/[*#_~`]/g, '').trim().substring(0, 200);

    // Step 3: Create article with uploaded photo as cover
    const articleBody = content.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return { type: 'text', content: ' ' };
      return { type: 'text', content: trimmed };
    });

    const createArticlePayload = {
      type: 'normal',
      title: articleTitle,
      author: connection.platform_username || 'OA',
      cover: {
        cover_type: 'photo',
        photo_id: zaloPhotoId,
        status: 'show',
      },
      description: articleDescription,
      body: articleBody,
      status: 'show',
    };

    console.log('Creating Zalo article with payload:', JSON.stringify({ ...createArticlePayload, body: `[${articleBody.length} paragraphs]` }));

    const createRes = await fetch('https://openapi.zalo.me/v2.0/article/create', {
      method: 'POST',
      headers: {
        'access_token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createArticlePayload),
    });
    const createResult = await createRes.json();
    console.log('Zalo article create result:', JSON.stringify(createResult));

    if (createResult.error && createResult.error !== 0) {
      // Only -224 is a true tier limitation
      if (createResult.error === -224) {
        return new Response(
          JSON.stringify({
            success: false,
            errorCode: 'OA_TIER_LIMITED',
            error: 'Zalo OA đang dùng gói Cơ bản, không hỗ trợ đăng bài qua API. Vui lòng nâng cấp gói tại https://oa.zalo.me/home/pricing',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(createResult.message || `Zalo API error ${createResult.error}`);
    }

    const articleToken = createResult.data?.token;

    // Step 4: Verify article (publish it)
    if (articleToken) {
      const verifyRes = await fetch('https://openapi.zalo.me/v2.0/article/verify', {
        method: 'POST',
        headers: {
          'access_token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: articleToken }),
      });
      const verifyResult = await verifyRes.json();
      console.log('Zalo article verify result:', JSON.stringify(verifyResult));

      if (verifyResult.error && verifyResult.error !== 0) {
        if (verifyResult.error === -224) {
          return new Response(
            JSON.stringify({
              success: false,
              errorCode: 'OA_TIER_LIMITED',
              error: 'Zalo OA đang dùng gói Cơ bản, không hỗ trợ đăng bài qua API. Vui lòng nâng cấp gói tại https://oa.zalo.me/home/pricing',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.warn('Article verify warning:', verifyResult.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        platform: 'zalo_oa',
        postId: articleToken || createResult.data?.article_id,
        message: 'Đã đăng bài viết thành công lên Zalo OA',
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
