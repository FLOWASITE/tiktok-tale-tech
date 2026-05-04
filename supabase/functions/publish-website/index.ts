import { createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequest {
  connectionId: string;
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  featuredImageUrl?: string;
  categories?: string[];
  tags?: string[];
  status?: 'publish' | 'draft' | 'pending';
  seoData?: {
    metaTitle?: string;
    metaDescription?: string;
    focusKeyword?: string;
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

Deno.serve(withPerf({ functionName: 'publish-website' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
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
    const { 
      connectionId, 
      title, 
      content, 
      excerpt, 
      slug, 
      featuredImageUrl, 
      categories, 
      tags,
      status = 'publish',
      seoData 
    } = body;

    if (!connectionId || !title || !content) {
      throw new Error('connectionId, title, and content are required');
    }

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'website')
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    if (!connection.is_active) {
      throw new Error('Connection is not active');
    }

    const integrationType = connection.metadata?.integration_type;
    const websiteUrl = connection.metadata?.website_url;

    console.log(`Publishing to website: ${websiteUrl}, type: ${integrationType}`);

    let result;

    if (integrationType === 'wordpress') {
      // WordPress REST API publishing
      const wpUsername = connection.metadata?.wordpress_username;
      const wpPassword = decrypt(connection.refresh_token, encryptionKey);
      
      if (!wpUsername || !wpPassword) {
        throw new Error('WordPress credentials not found');
      }

      const wpApiUrl = `${websiteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
      const authString = btoa(`${wpUsername}:${wpPassword}`);

      const wpPostData: any = {
        title: title,
        content: content,
        excerpt: excerpt || '',
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        status: status,
      };

      // Add categories and tags if provided
      if (categories && categories.length > 0) {
        wpPostData.categories = categories;
      }
      if (tags && tags.length > 0) {
        wpPostData.tags = tags;
      }

      // Add Yoast SEO meta if available
      if (seoData) {
        wpPostData.meta = {
          _yoast_wpseo_title: seoData.metaTitle || '',
          _yoast_wpseo_metadesc: seoData.metaDescription || '',
          _yoast_wpseo_focuskw: seoData.focusKeyword || '',
        };
      }

      const response = await fetch(wpApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wpPostData),
      });

      result = await response.json();

      if (result.code && result.message) {
        throw new Error(`WordPress error: ${result.message}`);
      }

      // Handle featured image if provided
      if (featuredImageUrl && result.id) {
        try {
          // Upload image to WordPress media library
          const imageResponse = await fetch(featuredImageUrl);
          const imageBlob = await imageResponse.blob();
          const imageName = featuredImageUrl.split('/').pop() || 'featured-image.jpg';

          const mediaResponse = await fetch(
            `${websiteUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Disposition': `attachment; filename="${imageName}"`,
                'Content-Type': imageBlob.type,
              },
              body: imageBlob,
            }
          );

          const mediaResult = await mediaResponse.json();
          
          if (mediaResult.id) {
            // Update post with featured image
            await fetch(`${wpApiUrl}/${result.id}`, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ featured_media: mediaResult.id }),
            });
          }
        } catch (imgError) {
          console.log('Could not upload featured image:', imgError);
        }
      }

    } else if (integrationType === 'blogger') {
      // Blogger API v3
      const bloggerApiKey = decrypt(connection.access_token, encryptionKey);
      const blogUrl = connection.metadata?.website_url;

      // Get blog ID first
      const blogInfoUrl = `https://www.googleapis.com/blogger/v3/blogs/byurl?url=${encodeURIComponent(blogUrl)}&key=${bloggerApiKey}`;
      const blogInfoResp = await fetch(blogInfoUrl);
      const blogInfo = await blogInfoResp.json();
      if (!blogInfo.id) throw new Error('Could not find Blogger blog ID');

      const postUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogInfo.id}/posts?key=${bloggerApiKey}`;
      const response = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'blogger#post',
          title,
          content,
          labels: tags || [],
        }),
      });
      result = await response.json();
      if (result.error) throw new Error(`Blogger error: ${result.error.message}`);

    } else if (integrationType === 'wix_oauth') {
      // Wix Blog API via OAuth (App install). Auto-refresh if access token expired.
      let accessToken = decrypt(connection.access_token, encryptionKey);
      const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
      const now = Date.now();
      // Refresh if expired or expiring within 60s
      if (!accessToken || expiresAt < now + 60_000) {
        try {
          const { refreshWixConnection } = await import('../refresh-wix-token/index.ts');
          const refreshed = await refreshWixConnection(connection.id);
          accessToken = refreshed.accessToken;
        } catch (refreshErr: any) {
          throw new Error(`Wix token refresh failed: ${refreshErr.message}. Reconnect lại Wix.`);
        }
      }

      const wixSiteId = connection.metadata?.wix_site_id;
      const wixInstanceId = connection.metadata?.wix_instance_id;
      const wixHeaders: Record<string, string> = {
        'Authorization': accessToken,
        'Content-Type': 'application/json',
      };
      if (wixSiteId) wixHeaders['wix-site-id'] = wixSiteId;
      if (wixInstanceId) wixHeaders['wix-instance-id'] = wixInstanceId;

      // Convert HTML → Ricos paragraphs
      const paragraphs = String(content)
        .split(/<\/?p[^>]*>|\n{2,}/)
        .map(p => p.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean);
      const richContent = {
        nodes: paragraphs.length > 0
          ? paragraphs.map(text => ({
              type: 'PARAGRAPH',
              nodes: [{ type: 'TEXT', textData: { text, decorations: [] } }],
            }))
          : [{ type: 'PARAGRAPH', nodes: [{ type: 'TEXT', textData: { text: String(content).replace(/<[^>]+>/g, ''), decorations: [] } }] }],
      };

      // Upload featured image to Wix Site Media (best-effort)
      let coverMedia: any = undefined;
      if (featuredImageUrl) {
        try {
          const uploadUrlResp = await fetch('https://www.wixapis.com/site-media/v1/files/generate-upload-url', {
            method: 'POST',
            headers: wixHeaders,
            body: JSON.stringify({
              mimeType: 'image/jpeg',
              fileName: featuredImageUrl.split('/').pop() || 'cover.jpg',
              parentFolderId: 'media-root',
            }),
          });
          const uploadUrlData = await uploadUrlResp.json();
          if (uploadUrlData.uploadUrl) {
            const imgResp = await fetch(featuredImageUrl);
            const imgBlob = await imgResp.blob();
            const putResp = await fetch(uploadUrlData.uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': imgBlob.type || 'image/jpeg' },
              body: imgBlob,
            });
            const putData = await putResp.json().catch(() => ({}));
            const fileId = putData?.file?.id || putData?.fileDescriptor?.id;
            if (fileId) coverMedia = { image: { id: fileId } };
          }
        } catch (imgErr) {
          console.warn('Wix OAuth cover upload failed:', imgErr);
        }
      }

      const draftBody: any = {
        draftPost: {
          title,
          richContent,
          excerpt: excerpt || '',
          tags: tags?.map(t => ({ label: t })) || [],
          slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60),
          seoData: seoData ? {
            tags: [
              ...(seoData.metaTitle ? [{ type: 'title', children: seoData.metaTitle }] : []),
              ...(seoData.metaDescription ? [{ type: 'meta', props: { name: 'description', content: seoData.metaDescription } }] : []),
              ...(seoData.focusKeyword ? [{ type: 'meta', props: { name: 'keywords', content: seoData.focusKeyword } }] : []),
            ],
          } : undefined,
          ...(coverMedia ? { media: { wixMedia: coverMedia, displayed: true } } : {}),
        },
      };

      const draftResp = await fetch('https://www.wixapis.com/blog/v3/draft-posts', {
        method: 'POST',
        headers: wixHeaders,
        body: JSON.stringify(draftBody),
      });
      const draftResult = await draftResp.json();
      if (!draftResp.ok || !draftResult.draftPost?.id) {
        throw new Error(`Wix OAuth draft create failed [${draftResp.status}]: ${JSON.stringify(draftResult).slice(0, 300)}`);
      }
      if (status === 'publish') {
        const publishResp = await fetch(
          `https://www.wixapis.com/blog/v3/draft-posts/${draftResult.draftPost.id}/publish`,
          { method: 'POST', headers: wixHeaders }
        );
        result = await publishResp.json();
        if (!publishResp.ok) {
          throw new Error(`Wix OAuth publish failed [${publishResp.status}]: ${JSON.stringify(result).slice(0, 300)}`);
        }
      } else {
        result = draftResult;
      }

    } else if (integrationType === 'wix') {
      // Wix Blog API - require API Key + siteId + accountId
      const wixApiKey = decrypt(connection.access_token, encryptionKey);
      const wixSiteId = connection.metadata?.wix_site_id;
      const wixAccountId = connection.metadata?.wix_account_id;

      if (!wixApiKey) throw new Error('Wix API Key chưa được cấu hình');
      if (!wixSiteId || !wixAccountId) {
        throw new Error('Wix Site ID hoặc Account ID chưa cấu hình. Hãy reconnect Wix với đầy đủ Site ID + Account ID.');
      }

      const wixHeaders: Record<string, string> = {
        'Authorization': wixApiKey,
        'wix-account-id': wixAccountId,
        'wix-site-id': wixSiteId,
        'Content-Type': 'application/json',
      };

      // Convert HTML content → Ricos rich content (basic: split paragraphs)
      const paragraphs = String(content)
        .split(/<\/?p[^>]*>|\n{2,}/)
        .map(p => p.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean);

      const richContent = {
        nodes: paragraphs.length > 0
          ? paragraphs.map(text => ({
              type: 'PARAGRAPH',
              nodes: [{ type: 'TEXT', textData: { text, decorations: [] } }],
            }))
          : [{ type: 'PARAGRAPH', nodes: [{ type: 'TEXT', textData: { text: String(content).replace(/<[^>]+>/g, ''), decorations: [] } }] }],
      };

      // Upload featured image to Wix Site Media (if provided)
      let coverMedia: any = undefined;
      if (featuredImageUrl) {
        try {
          // Step 1: generate upload URL
          const uploadUrlResp = await fetch('https://www.wixapis.com/site-media/v1/files/generate-upload-url', {
            method: 'POST',
            headers: wixHeaders,
            body: JSON.stringify({
              mimeType: 'image/jpeg',
              fileName: featuredImageUrl.split('/').pop() || 'cover.jpg',
              parentFolderId: 'media-root',
            }),
          });
          const uploadUrlData = await uploadUrlResp.json();
          if (uploadUrlData.uploadUrl) {
            // Step 2: download source image then PUT to Wix
            const imgResp = await fetch(featuredImageUrl);
            const imgBlob = await imgResp.blob();
            const putResp = await fetch(uploadUrlData.uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': imgBlob.type || 'image/jpeg' },
              body: imgBlob,
            });
            const putData = await putResp.json().catch(() => ({}));
            const fileId = putData?.file?.id || putData?.fileDescriptor?.id;
            if (fileId) {
              coverMedia = { image: { id: fileId } };
            }
          }
        } catch (imgErr) {
          console.warn('Wix cover image upload failed, continuing without cover:', imgErr);
        }
      }

      const draftPostBody: any = {
        draftPost: {
          title,
          richContent,
          excerpt: excerpt || '',
          tags: tags?.map(t => ({ label: t })) || [],
          slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60),
          seoData: seoData ? {
            tags: [
              ...(seoData.metaTitle ? [{ type: 'title', children: seoData.metaTitle }] : []),
              ...(seoData.metaDescription ? [{ type: 'meta', props: { name: 'description', content: seoData.metaDescription } }] : []),
              ...(seoData.focusKeyword ? [{ type: 'meta', props: { name: 'keywords', content: seoData.focusKeyword } }] : []),
            ],
          } : undefined,
          ...(coverMedia ? { media: { wixMedia: coverMedia, displayed: true } } : {}),
        },
      };

      const draftResp = await fetch('https://www.wixapis.com/blog/v3/draft-posts', {
        method: 'POST',
        headers: wixHeaders,
        body: JSON.stringify(draftPostBody),
      });
      const draftResult = await draftResp.json();
      if (!draftResp.ok || !draftResult.draftPost?.id) {
        throw new Error(`Wix draft create failed [${draftResp.status}]: ${JSON.stringify(draftResult).slice(0, 300)}`);
      }

      if (status === 'publish') {
        const publishResp = await fetch(
          `https://www.wixapis.com/blog/v3/draft-posts/${draftResult.draftPost.id}/publish`,
          { method: 'POST', headers: wixHeaders }
        );
        result = await publishResp.json();
        if (!publishResp.ok) {
          throw new Error(`Wix publish failed [${publishResp.status}]: ${JSON.stringify(result).slice(0, 300)}`);
        }
      } else {
        result = draftResult;
      }

    } else if (integrationType === 'shopify_blog') {
      // Shopify Blog API
      const shopifyToken = decrypt(connection.access_token, encryptionKey);
      const storeUrl = connection.metadata?.website_url?.replace(/\/$/, '').replace(/^https?:\/\//, '');

      // Get first blog ID
      const blogsResp = await fetch(`https://${storeUrl}/admin/api/2024-01/blogs.json`, {
        headers: { 'X-Shopify-Access-Token': shopifyToken },
      });
      const blogsData = await blogsResp.json();
      const blogId = blogsData.blogs?.[0]?.id;
      if (!blogId) throw new Error('No blog found on Shopify store');

      const articleResp = await fetch(`https://${storeUrl}/admin/api/2024-01/blogs/${blogId}/articles.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': shopifyToken },
        body: JSON.stringify({
          article: {
            title,
            body_html: content,
            summary_html: excerpt || '',
            tags: tags?.join(', ') || '',
            published: status === 'publish',
            image: featuredImageUrl ? { src: featuredImageUrl } : undefined,
            metafields: seoData ? [
              { namespace: 'global', key: 'title_tag', value: seoData.metaTitle || title, type: 'single_line_text_field' },
              { namespace: 'global', key: 'description_tag', value: seoData.metaDescription || excerpt || '', type: 'single_line_text_field' },
            ] : undefined,
          },
        }),
      });
      result = await articleResp.json();
      if (result.errors) throw new Error(`Shopify error: ${JSON.stringify(result.errors)}`);

    } else if (integrationType === 'nukeviet') {
      // NukeViet CMS via PHP bridge
      const apiEndpoint = connection.metadata?.api_endpoint || `${websiteUrl.replace(/\/$/, '')}/api_flowa.php`;
      const apiKey = decrypt(connection.access_token, encryptionKey);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          title,
          content,
          catid: categories?.[0] ? parseInt(categories[0]) : 1,
        }),
      });
      result = await response.json();
      if (result.status === 'error') {
        throw new Error(`NukeViet error: ${result.message}`);
      }

    } else if (integrationType === 'custom_api') {
      const apiEndpoint = connection.metadata?.api_endpoint;
      const apiKey = decrypt(connection.access_token, encryptionKey);
      if (!apiEndpoint) throw new Error('API endpoint not configured');

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': apiKey ? `Bearer ${apiKey}` : '', 'X-API-Key': apiKey || '' },
        body: JSON.stringify({ title, content, excerpt, slug, featured_image: featuredImageUrl, categories, tags, status, seo: seoData }),
      });
      result = await response.json();

    } else if (integrationType === 'webhook') {
      const webhookUrl = connection.metadata?.webhook_url;
      if (!webhookUrl) throw new Error('Webhook URL not configured');

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'content_ready', title, content, excerpt, slug, featured_image: featuredImageUrl, categories, tags, seo: seoData, timestamp: new Date().toISOString() }),
      });
      result = { success: response.ok, status: response.status };

    } else {
      result = { success: true, message: 'Content ready for manual publishing', data: { title, content, excerpt, slug } };
    }

    console.log('Website publish result:', result);

    return new Response(
      JSON.stringify({
        success: true,
        platform: 'website',
        postId: result.id || null,
        postUrl: result.link || result.url || null,
        message: integrationType === 'manual' 
          ? 'Nội dung đã sẵn sàng để copy lên website'
          : 'Đã đăng bài thành công lên website',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Publish Website error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
