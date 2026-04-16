import { getServiceClient, withPerf } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

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

/**
 * TikTok Photo Post (Carousel) via Content Posting API v2
 * Uses FILE_UPLOAD source — uploads image bytes directly to TikTok
 * No domain verification or SSL proxy needed
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
 * Fetch image bytes from a URL (Supabase Storage or any public URL)
 */
async function fetchImageBytes(imageUrl: string): Promise<{ bytes: Uint8Array; contentType: string; size: number }> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${imageUrl}: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const contentType = response.headers.get("Content-Type") || "image/jpeg";
  console.log(`[tiktok] Fetched image: ${bytes.length} bytes, type: ${contentType}`);
  return { bytes, contentType, size: bytes.length };
}

/**
 * Upload a single image to TikTok's upload endpoint
 */
async function uploadImageToTikTok(
  uploadUrl: string,
  imageBytes: Uint8Array,
  contentType: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Range": `bytes 0-${imageBytes.length - 1}/${imageBytes.length}`,
    },
    body: imageBytes,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[tiktok] Upload failed: ${response.status}`, errorText);
    throw new Error(`TikTok image upload failed: ${response.status} - ${errorText}`);
  }
  // Consume response body to prevent resource leak
  await response.text();
  console.log(`[tiktok] Image uploaded successfully to TikTok`);
}

async function publishPhotoPost(
  accessToken: string,
  title: string,
  description: string,
  imageUrls: string[],
): Promise<{ publishId: string }> {
  if (imageUrls.length < 1) {
    throw new Error("TikTok photo post requires at least 1 image");
  }
  if (imageUrls.length > 35) {
    imageUrls = imageUrls.slice(0, 35);
    console.warn("[tiktok] Trimmed to 35 images (TikTok max)");
  }

  // Pre-fetch all images from Supabase Storage
  console.log(`[tiktok] Pre-fetching ${imageUrls.length} images from storage...`);
  const imageDataArray = await Promise.all(imageUrls.map(fetchImageBytes));

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
      },
      source_info: {
        source: "FILE_UPLOAD",
        photo_cover_index: 0,
        photo_count: imageUrls.length,
      },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    };

    console.log(
      "[tiktok] Publishing photo post with",
      imageUrls.length,
      "images using privacy",
      privacyLevel,
      "(FILE_UPLOAD)",
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
  // For FILE_UPLOAD, TikTok returns upload_url for each image
  const uploadUrl = result.data?.upload_url;

  if (!publishId) {
    throw new Error("TikTok did not return a publish ID");
  }

  // Upload images if TikTok provided upload URLs
  if (uploadUrl) {
    // Single upload URL for all images — upload sequentially
    if (typeof uploadUrl === "string") {
      console.log("[tiktok] Uploading images to single upload URL...");
      for (let i = 0; i < imageDataArray.length; i++) {
        const { bytes, contentType } = imageDataArray[i];
        console.log(`[tiktok] Uploading image ${i + 1}/${imageDataArray.length} (${bytes.length} bytes)`);
        await uploadImageToTikTok(uploadUrl, bytes, contentType);
      }
    }
  } else if (Array.isArray(result.data?.upload_urls)) {
    // Multiple upload URLs — one per image
    const uploadUrls = result.data.upload_urls as string[];
    console.log(`[tiktok] Uploading ${uploadUrls.length} images to individual URLs...`);
    for (let i = 0; i < Math.min(uploadUrls.length, imageDataArray.length); i++) {
      const { bytes, contentType } = imageDataArray[i];
      console.log(`[tiktok] Uploading image ${i + 1}/${uploadUrls.length} (${bytes.length} bytes)`);
      await uploadImageToTikTok(uploadUrls[i], bytes, contentType);
    }
  }

  console.log("[tiktok] Publish initiated, publish_id:", publishId);
  return { publishId };
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

    // Fetch connection
    const { data: connection, error: connError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      throw new Error("TikTok connection not found or inactive");
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
      const { publishId } = await publishPhotoPost(
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
          response_data: { publishId },
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
            postUrl: null, // TikTok doesn't provide URL immediately
            mediaCount: mediaUrls.length,
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
    console.error("[publish-tiktok] error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        ...(errorCode ? { errorCode } : {}),
        ...(errorCode === TIKTOK_UNAUDITED_PRIVATE_ONLY_ERROR_CODE
          ? { fallback: true, requiresPrivateAccount: true }
          : {}),
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}));
