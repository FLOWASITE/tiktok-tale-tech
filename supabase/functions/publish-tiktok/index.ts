import { getServiceClient, withPerf } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PublishRequest {
  connectionId: string;
  content: string;
  mediaUrls?: string[];
  scheduleId?: string;
  contentId?: string;
}

class TikTokPublishError extends Error {
  errorCode?: string;
  statusCode?: number;

  constructor(message: string, options?: { errorCode?: string; statusCode?: number }) {
    super(message);
    this.name = "TikTokPublishError";
    this.errorCode = options?.errorCode;
    this.statusCode = options?.statusCode;
  }
}

const TIKTOK_UNAUDITED_PRIVATE_ONLY_API_CODE = "unaudited_client_can_only_post_to_private_accounts";
const TIKTOK_UNAUDITED_PRIVATE_ONLY_ERROR_CODE = "TIKTOK_UNAUDITED_PRIVATE_ONLY";

function shouldReturnSoftFailure(errorCode?: string): boolean {
  return [
    TIKTOK_UNAUDITED_PRIVATE_ONLY_ERROR_CODE,
    "TIKTOK_MEDIA_PROXY_UNREACHABLE",
    "TIKTOK_URL_OWNERSHIP_UNVERIFIED",
    "TIKTOK_POST_PROCESSING_FAILED",
  ].includes(errorCode ?? "");
}

const SUPABASE_STORAGE_HOST = "rllyipiyuptkibqinotz.supabase.co";
const MEDIA_PROXY_HOST = "media.flowa.one";
const MEDIA_PREFLIGHT_TIMEOUT_MS = 8000;

/**
 * Rewrite Supabase Storage URLs to use the Cloudflare-proxied custom domain
 * that has been verified on TikTok Developer Portal.
 * This ensures TikTok can fetch images via HTTPS from a verified domain.
 */
function rewriteImageUrlForTikTok(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === SUPABASE_STORAGE_HOST || parsed.hostname === MEDIA_PROXY_HOST) {
      // Only change hostname — images are already .jpg, no transformation needed
      parsed.hostname = MEDIA_PROXY_HOST;
      parsed.protocol = "https:";
      console.log(`[tiktok] Rewrote image URL for TikTok: ${parsed.toString()}`);
      return parsed.toString();
    }
  } catch { /* keep original */ }
  return url;
}

/** Rewrite media.flowa.one URLs back to direct Supabase storage */
function fallbackToDirectUrls(urls: string[]): string[] {
  return urls.map((url) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === MEDIA_PROXY_HOST) {
        parsed.hostname = SUPABASE_STORAGE_HOST;
        parsed.protocol = "https:";
        return parsed.toString();
      }
    } catch { /* keep original */ }
    return url;
  });
}

async function verifyTikTokMediaReachability(imageUrls: string[]): Promise<string[]> {
  const sampleUrl = imageUrls[0];
  if (!sampleUrl) {
    throw new TikTokPublishError("TikTok photo post requires at least 1 image", {
      errorCode: "TIKTOK_MEDIA_MISSING",
      statusCode: 400,
    });
  }

  // Try media.flowa.one first (HEAD)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MEDIA_PREFLIGHT_TIMEOUT_MS);
  try {
    const response = await fetch(sampleUrl, {
      method: "HEAD",
      headers: { "User-Agent": "Lovable-TikTok-Preflight/1.0" },
      signal: controller.signal,
    });
    if (response.ok) {
      console.log("[tiktok] Media preflight OK:", sampleUrl);
      return imageUrls;
    }
    console.error("[tiktok] Media preflight failed:", response.status);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[tiktok] Media preflight exception:", message);
  } finally {
    clearTimeout(timeout);
  }

  // Fallback: try direct Supabase URL
  console.warn("[tiktok] media.flowa.one unreachable, falling back to direct Supabase URLs");
  const directUrls = fallbackToDirectUrls(imageUrls);

  const controller2 = new AbortController();
  const timeout2 = setTimeout(() => controller2.abort(), MEDIA_PREFLIGHT_TIMEOUT_MS);
  try {
    const response2 = await fetch(directUrls[0], {
      method: "HEAD",
      headers: { "User-Agent": "Lovable-TikTok-Preflight/1.0" },
      signal: controller2.signal,
    });
    if (response2.ok) {
      console.log("[tiktok] Direct Supabase preflight OK:", directUrls[0]);
      return directUrls;
    }
    console.error("[tiktok] Direct Supabase preflight also failed:", response2.status);
  } catch (err2) {
    console.error("[tiktok] Direct Supabase preflight exception:", err2);
  } finally {
    clearTimeout(timeout2);
  }

  throw new TikTokPublishError(
    `Không thể truy cập ảnh qua cả ${MEDIA_PROXY_HOST} và ${SUPABASE_STORAGE_HOST}.`,
    { errorCode: "TIKTOK_MEDIA_PROXY_UNREACHABLE", statusCode: 400 },
  );
}

/**
 * TikTok Photo Post (Carousel) via Content Posting API v2
 * Uses PULL_FROM_URL source — TikTok only supports this for photos
 * Image URLs are rewritten to media.flowa.one (Cloudflare proxy with SSL)
 */
function truncateUtf16(input: string, maxUnits: number): string {
  let result = "";
  let usedUnits = 0;

  for (const char of input) {
    const units = (char.codePointAt(0) ?? 0) > 0xffff ? 2 : 1;
    if (usedUnits + units > maxUnits) break;
    result += char;
    usedUnits += units;
  }

  return result;
}

async function getCreatorPostSettings(accessToken: string): Promise<{
  privacyLevel: string;
  privacyLevelOptions: string[];
  disableComment: boolean;
}> {
  const response = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: "{}",
    },
  );

  const responseText = await response.text();
  console.log("[tiktok] Creator info response:", response.status, responseText);

  if (!response.ok) {
    throw new Error(
      `TikTok creator info error: ${response.status} - ${responseText}`,
    );
  }

  const result = JSON.parse(responseText);
  if (result.error?.code !== "ok" && result.error?.code) {
    throw new Error(
      `TikTok creator info error: ${result.error.code} - ${
        result.error.message || "Unknown error"
      }`,
    );
  }

  const privacyLevelOptions = Array.isArray(result.data?.privacy_level_options)
    ? result.data.privacy_level_options.filter((
      value: unknown,
    ): value is string => typeof value === "string" && value.length > 0)
    : [];

  if (privacyLevelOptions.length === 0) {
    throw new Error("TikTok creator info did not return privacy level options");
  }

  // Ưu tiên: PUBLIC > FOLLOWER > MUTUAL_FOLLOW > SELF_ONLY
  const PRIVACY_PRIORITY = [
    "PUBLIC_TO_EVERYONE",
    "FOLLOWER_OF_CREATOR",
    "MUTUAL_FOLLOW_FRIENDS",
    "SELF_ONLY",
  ];

  const privacyLevel = PRIVACY_PRIORITY.find(p => privacyLevelOptions.includes(p))
    || privacyLevelOptions[0];

  console.log("[tiktok] Selected privacy level:", privacyLevel, "from", privacyLevelOptions);

  return {
    privacyLevel,
    privacyLevelOptions,
    disableComment: Boolean(result.data?.comment_disabled),
  };
}

/**
 * Poll TikTok publish status API to check if post was actually processed
 */
async function pollPublishStatus(
  accessToken: string,
  publishId: string,
  maxAttempts = 3,
  delayMs = 3000,
): Promise<{ status: string; failReason?: string }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    try {
      const response = await fetch(
        "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
          },
          body: JSON.stringify({ publish_id: publishId }),
        },
      );

      const data = await response.json();
      console.log(`[tiktok] Status check attempt ${attempt}/${maxAttempts}:`, JSON.stringify(data));

      const status = data?.data?.status;

      if (status === "PUBLISH_COMPLETE") {
        return { status: "PUBLISH_COMPLETE" };
      }

      if (status === "FAILED") {
        const failReason = data?.data?.fail_reason || "Unknown failure";
        console.error(`[tiktok] Post FAILED: ${failReason}`);
        throw new TikTokPublishError(
          `TikTok đã từ chối bài đăng sau khi xử lý: ${failReason}`,
          { errorCode: "TIKTOK_POST_PROCESSING_FAILED", statusCode: 400 },
        );
      }

      // PROCESSING_DOWNLOAD, PROCESSING_UPLOAD, SENDING_TO_USER_INBOX — keep polling
    } catch (err) {
      if (err instanceof TikTokPublishError) throw err;
      console.warn(`[tiktok] Status check attempt ${attempt} error:`, err);
    }
  }

  // If still processing after all attempts, treat as tentative success
  console.log("[tiktok] Post still processing after polling — returning tentative success");
  return { status: "PROCESSING" };
}

async function publishPhotoPost(
  accessToken: string,
  title: string,
  description: string,
  imageUrls: string[],
): Promise<{ publishId: string; statusResult: { status: string; failReason?: string } }> {
  if (imageUrls.length < 1) {
    throw new Error("TikTok photo post requires at least 1 image");
  }
  if (imageUrls.length > 35) {
    imageUrls = imageUrls.slice(0, 35);
    console.warn("[tiktok] Trimmed to 35 images (TikTok max)");
  }

  // Convert PNG images to JPEG (TikTok only accepts JPEG/WebP)
  const jpegUrls = await convertImagesToJpeg(imageUrls);
  // Rewrite all image URLs to use the verified Cloudflare proxy domain
  const rewrittenUrls = jpegUrls.map(rewriteImageUrlForTikTok);
  console.log("[tiktok] Rewritten image URLs:", rewrittenUrls);
  // verifyTikTokMediaReachability returns final URLs (may fallback to direct Supabase)
  const finalUrls = await verifyTikTokMediaReachability(rewrittenUrls);

  const { privacyLevel: preferredPrivacyLevel, privacyLevelOptions, disableComment } = await getCreatorPostSettings(
    accessToken,
  );

  const sendPublishRequest = async (privacyLevel: string) => {
    const body = {
      post_info: {
        title: truncateUtf16(title, 90),
        description: truncateUtf16(description, 4000),
        privacy_level: privacyLevel,
        disable_comment: disableComment,
        auto_add_music: true,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: finalUrls,
      },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    };

    console.log(
      "[tiktok] Publishing photo post with",
      imageUrls.length,
      "images using privacy",
      privacyLevel,
      "(PULL_FROM_URL)",
    );

    const response = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/content/init/",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify(body),
      },
    );

    const responseText = await response.text();
    console.log("[tiktok] API response:", response.status, responseText);

    let parsedBody: Record<string, unknown> | null = null;
    try {
      parsedBody = JSON.parse(responseText);
    } catch {
      parsedBody = null;
    }

    const apiError = (parsedBody?.error && typeof parsedBody.error === "object")
      ? parsedBody.error as Record<string, unknown>
      : null;

    return {
      privacyLevel,
      response,
      responseText,
      parsedBody,
      apiErrorCode: typeof apiError?.code === "string" ? apiError.code : undefined,
    };
  };

  let requestResult = await sendPublishRequest(preferredPrivacyLevel);
  const attemptedPrivacyLevels = [preferredPrivacyLevel];

  if (
    requestResult.response.status === 403
    && requestResult.apiErrorCode === TIKTOK_UNAUDITED_PRIVATE_ONLY_API_CODE
    && preferredPrivacyLevel !== "SELF_ONLY"
    && privacyLevelOptions.includes("SELF_ONLY")
  ) {
    console.warn(
      `[tiktok] Retrying publish with SELF_ONLY after TikTok rejected ${preferredPrivacyLevel} for unaudited app`,
    );
    attemptedPrivacyLevels.push("SELF_ONLY");
    requestResult = await sendPublishRequest("SELF_ONLY");
  }

  const { response, responseText, parsedBody, apiErrorCode } = requestResult;

  if (!response.ok) {
    if (response.status === 401) {
      throw new TikTokPublishError("TikTok token expired. Please reconnect your account.", {
        errorCode: "TIKTOK_TOKEN_EXPIRED",
        statusCode: 401,
      });
    }

    if (response.status === 403 && apiErrorCode === TIKTOK_UNAUDITED_PRIVATE_ONLY_API_CODE) {
      const fallbackMessage = attemptedPrivacyLevels.includes("SELF_ONLY")
        ? " Flowa đã tự thử lại với chế độ SELF_ONLY nhưng TikTok vẫn từ chối, nên tài khoản TikTok cần được chuyển sang Private trước khi đăng qua API."
        : "";
      throw new TikTokPublishError(
        `Ứng dụng TikTok hiện chưa được audit để đăng công khai.${fallbackMessage} Hãy chuyển tài khoản TikTok sang chế độ riêng tư hoặc hoàn tất TikTok app review theo hướng dẫn của TikTok.`,
        {
          errorCode: TIKTOK_UNAUDITED_PRIVATE_ONLY_ERROR_CODE,
          statusCode: 200,
        },
      );
    }

    // Handle URL ownership unverified error with helpful message
    if (apiErrorCode === "url_ownership_unverified") {
      throw new TikTokPublishError(
        "TikTok yêu cầu verify domain media.flowa.one. Vào TikTok Developer Portal → App → URL Properties, đảm bảo domain media.flowa.one đã được xác minh (Status: Verified).",
        {
          errorCode: "TIKTOK_URL_OWNERSHIP_UNVERIFIED",
          statusCode: response.status,
        },
      );
    }

    throw new TikTokPublishError(
      `TikTok API error: ${response.status} - ${responseText}`,
      {
        errorCode: apiErrorCode || "TIKTOK_API_ERROR",
        statusCode: response.status,
      },
    );
  }

  const result = parsedBody ?? JSON.parse(responseText);

  if (result.error?.code !== "ok" && result.error?.code) {
    throw new TikTokPublishError(
      `TikTok error: ${result.error.code} - ${
        result.error.message || "Unknown error"
      }`,
      {
        errorCode: typeof result.error.code === "string" ? result.error.code : "TIKTOK_API_ERROR",
        statusCode: 400,
      },
    );
  }

  const publishId = result.data?.publish_id;

  if (!publishId) {
    throw new Error("TikTok did not return a publish ID");
  }

  console.log("[tiktok] Publish initiated, publish_id:", publishId);

  // Poll TikTok publish status to detect async failures (image fetch errors etc.)
  const statusResult = await pollPublishStatus(accessToken, publishId);
  console.log("[tiktok] Final publish status:", JSON.stringify(statusResult));

  return { publishId, statusResult };
}

Deno.serve(withPerf({ functionName: "publish-tiktok" }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    const body: PublishRequest = await req.json();
    const { connectionId, content, mediaUrls, scheduleId, contentId } = body;

    if (!connectionId) throw new Error("Connection ID is required");
    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error("TikTok photo post requires at least 1 image");
    }

    // Fetch connection — allow inactive connections if token is still valid
    const { data: connection, error: connError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connError || !connection) {
      throw new Error("TikTok connection not found");
    }

    // Re-activate connection if it was deactivated due to transient errors
    if (!connection.is_active) {
      const tokenStillValid = connection.token_expires_at
        ? new Date(connection.token_expires_at) > new Date()
        : false;
      const needsReauth = connection.metadata?.needs_reauth === true;

      if (!tokenStillValid || needsReauth) {
        throw new Error("TikTok connection is inactive. Please reconnect your account.");
      }

      // Token is still valid — reactivate silently
      console.log("[tiktok] Reactivating connection with valid token:", connectionId);
      await supabase
        .from("social_connections")
        .update({ is_active: true, metadata: { ...connection.metadata, needs_reauth: false } })
        .eq("id", connectionId);
    }
    if (connection.platform !== "tiktok") {
      throw new Error("Invalid platform for this endpoint");
    }

    // Check token expiry
    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at);
      if (expiresAt < new Date()) {
        throw new Error(
          "TikTok token has expired. Please reconnect your account.",
        );
      }
    }

    let accessToken = connection.access_token;
    if (!accessToken) throw new Error("TikTok access token not found");
    accessToken = await decryptCredential(accessToken);

    // Create publish attempt
    const { data: attempt } = await supabase
      .from("publish_attempts")
      .insert({
        connection_id: connectionId,
        content_id: contentId || null,
        schedule_id: scheduleId || null,
        platform: "tiktok",
        status: "pending",
        content_snapshot: { content, mediaUrls },
      })
      .select()
      .single();

    try {
      // Extract title from content (first line or first 150 chars)
      const title =
        content.split("\n")[0].replace(/^#+\s*/, "").substring(0, 150) ||
        "Photo post";

      const description = content.substring(0, 2200) || title;
      const { publishId, statusResult } = await publishPhotoPost(
        accessToken,
        title,
        description,
        mediaUrls,
      );

      // Update attempt
      if (attempt) {
        await supabase.from("publish_attempts").update({
          status: "success",
          external_id: publishId,
          published_at: new Date().toISOString(),
          response_data: { publishId, statusResult },
        }).eq("id", attempt.id);
      }

      // Update schedule
      if (scheduleId) {
        await supabase.from("content_schedules").update({
          status: "published",
          published_at: new Date().toISOString(),
          external_post_id: publishId,
        }).eq("id", scheduleId);
      }

      // Log
      if (contentId) {
        await supabase.from("content_publishing_logs").insert({
          content_id: contentId,
          channel: "tiktok",
          organization_id: connection.organization_id,
          action: "published",
          performed_at: new Date().toISOString(),
          details: { publishId, mediaCount: mediaUrls.length },
        });
      }

      await supabase.from("social_connections").update({
        last_used_at: new Date().toISOString(),
      }).eq("id", connectionId);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            postId: publishId,
            postUrl: null,
            mediaCount: mediaUrls.length,
            publishStatus: statusResult.status,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (publishError: unknown) {
      const errorMessage = publishError instanceof Error
        ? publishError.message
        : "Unknown error";
      const errorCode = publishError instanceof TikTokPublishError
        ? publishError.errorCode
        : undefined;

      if (attempt) {
        await supabase.from("publish_attempts").update({
          status: "failed",
          error_message: errorMessage,
        }).eq("id", attempt.id);
      }

      if (errorMessage.includes("expired") || errorMessage.includes("401")) {
        await supabase.from("social_connections").update({
          is_active: false,
          last_error: "token_expired",
        }).eq("id", connectionId);
      }

      throw publishError;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Internal server error";
    const errorCode = error instanceof TikTokPublishError
      ? error.errorCode
      : undefined;
    const statusCode = error instanceof TikTokPublishError && error.statusCode
      ? error.statusCode
      : 500;
    const softFailure = shouldReturnSoftFailure(errorCode);
    console.error("[publish-tiktok] error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        ...(errorCode ? { errorCode } : {}),
        ...(softFailure ? { fallback: true } : {}),
        ...(errorCode === TIKTOK_UNAUDITED_PRIVATE_ONLY_ERROR_CODE
          ? { requiresPrivateAccount: true }
          : {}),
      }),
      {
        status: softFailure ? 200 : statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}));
