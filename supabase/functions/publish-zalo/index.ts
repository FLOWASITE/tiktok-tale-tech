import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
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

async function ensureZaloCompatibleCoverUrl(coverUrl: string, supabase: any): Promise<string> {
  try {
    const imageRes = await fetch(coverUrl);
    if (!imageRes.ok) {
      console.warn(`Cover fetch failed (${imageRes.status}), using original URL`);
      return coverUrl;
    }

    const originalBytes = new Uint8Array(await imageRes.arrayBuffer());
    const isPng = /\.png(\?|$)/i.test(coverUrl);
    const shouldOptimize = isPng || originalBytes.length > 900_000;

    const image = await Image.decode(originalBytes);
    
    // Zalo OA: ensure max 1280px width, 16:9 ratio, max 1MB
    const needsResize = image.width > 1280;

    if (!shouldOptimize && !needsResize) {
      return coverUrl;
    }

    // Resize to max 1280px width keeping aspect ratio
    if (needsResize) {
      const newHeight = Math.floor(image.height * (1280 / image.width));
      image.resize(1280, newHeight);
    }

    const optimizedBytes = await image.encodeJPEG(80);
    const filePath = `social/zalo-optimized/${Date.now()}-${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('carousel-images')
      .upload(filePath, optimizedBytes, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.warn(`Optimized cover upload failed: ${uploadError.message}, using original URL`);
      return coverUrl;
    }

    const { data: urlData } = supabase.storage.from('carousel-images').getPublicUrl(filePath);
    console.log(`Using optimized Zalo cover: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.warn('Cover optimization failed, using original URL:', error);
    return coverUrl;
  }
}

Deno.serve(withPerf({ functionName: 'publish-zalo' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    // Verify auth
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

    // Extract title from content — skip channel-name headers like "# ZALO_OA"
    const CHANNEL_HEADER_RE = /^(📱\s*)?ZALO[_\s]?OA$/i;
    const lines = content.split('\n').filter((l: string) => l.trim());
    const meaningfulLines = lines
      .map((l: string) => l.replace(/^#+\s*/, '').replace(/[*_~`]/g, '').trim())
      .filter((l: string) => l && !CHANNEL_HEADER_RE.test(l));
    const rawTitle = articleData?.title || meaningfulLines[0] || 'Bài viết mới';
    const articleTitle = rawTitle.substring(0, 100);
    const articleDescription = articleData?.description || meaningfulLines.slice(0, 2).join(' ').substring(0, 200);

    // Build article body — skip channel-name header lines
    const articleBody = lines
      .filter((line: string) => !CHANNEL_HEADER_RE.test(line.replace(/^#+\s*/, '').replace(/[*_~`📱]/g, '').trim()))
      .map((line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return { type: 'text', content: ' ' };
        return { type: 'text', content: trimmed };
      });

    // Ensure cover URL is Zalo-compatible (optimize legacy PNG or >1MB images)
    const finalCoverUrl = await ensureZaloCompatibleCoverUrl(coverImageUrl, supabase);

    const createArticlePayload = {
      type: 'normal',
      title: articleTitle,
      author: connection.platform_username || 'OA',
      cover: {
        cover_type: 'photo',
        photo_url: finalCoverUrl,
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

    // Step 4: Verify article (publish it) with retry for media processing
    if (articleToken) {
      let verifyResult: any = null;
      const MAX_VERIFY_RETRIES = 3;
      const RETRY_DELAY_MS = 4000;

      for (let attempt = 1; attempt <= MAX_VERIFY_RETRIES; attempt++) {
        const verifyRes = await fetch('https://openapi.zalo.me/v2.0/article/verify', {
          method: 'POST',
          headers: {
            'access_token': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: articleToken }),
        });
        verifyResult = await verifyRes.json();
        console.log(`Zalo article verify attempt ${attempt}/${MAX_VERIFY_RETRIES}:`, JSON.stringify(verifyResult));

        // -214 = media still processing, retry after delay
        if (verifyResult.error === -214 && attempt < MAX_VERIFY_RETRIES) {
          console.log(`Media processing, waiting ${RETRY_DELAY_MS}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        break;
      }

      if (verifyResult?.error && verifyResult.error !== 0) {
        if (verifyResult.error === -214) {
          return new Response(
            JSON.stringify({
              success: false,
              errorCode: 'MEDIA_PROCESSING',
              error: 'Zalo đang xử lý ảnh bìa, vui lòng thử lại sau 1-2 phút.',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
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
        throw new Error(verifyResult.message || `Zalo verify error ${verifyResult.error}`);
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
}));
