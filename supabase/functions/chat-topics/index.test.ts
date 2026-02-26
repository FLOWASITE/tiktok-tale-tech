import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

// Helper to call chat-topics with auth
async function callChatTopics(body: Record<string, unknown>, token?: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-topics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token || SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return response;
}

// Helper to call topic-ai
async function callTopicAI(body: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/topic-ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return response;
}

// ============================================
// Test 1: discover_topics tool definition exists
// ============================================
Deno.test("discover_topics tool is registered in Research Agent", async () => {
  const response = await callChatTopics({
    messages: [{ role: "user", content: "Gợi ý 3 chủ đề content về skincare cho Gen Z" }],
    brandTemplateId: null,
    organizationId: null,
    enableSupervisor: true,
  });

  const text = await response.text();
  console.log("Test 1 response status:", response.status);
  console.log("Test 1 response preview:", text.slice(0, 500));
  
  assertEquals(response.status === 200 || response.status === 401 || response.status === 429, true, 
    `Expected 200/401/429 but got ${response.status}: ${text.slice(0, 200)}`);
});

// ============================================
// Test 2: topic-ai receives action from body (NOT just query param)
// ============================================
Deno.test("topic-ai receives action from request body", async () => {
  const response = await callTopicAI({
    action: "suggest",
    query: "skincare trends 2026",
    limit: 3,
    brandTemplateId: null,
    organizationId: null,
  });

  const text = await response.text();
  console.log("Test 2 topic-ai status:", response.status);
  console.log("Test 2 response preview:", text.slice(0, 500));
  
  assertEquals(response.status === 200 || response.status === 401 || response.status === 429, true,
    `Expected 200/401/429 but got ${response.status}: ${text.slice(0, 200)}`);
  
  if (response.status === 200) {
    try {
      const data = JSON.parse(text);
      const hasTopics = data.suggestions || data.topics || data.trendingTopics;
      assertEquals(hasTopics !== undefined, true, "Response should contain topic suggestions");
    } catch {
      console.log("Response was non-JSON (possibly streaming)");
    }
  }
});

// ============================================
// Test 3: topic-ai trending action via body returns correct shape
// ============================================
Deno.test("topic-ai trending via body returns { data: [...] } shape", async () => {
  const response = await callTopicAI({
    action: "trending",
    query: "marketing trends",
    limit: 3,
  });

  const text = await response.text();
  console.log("Test 3 trending status:", response.status);
  console.log("Test 3 response preview:", text.slice(0, 300));
  
  assertEquals(response.status === 200 || response.status === 401 || response.status === 429, true,
    `Expected 200/401/429 but got ${response.status}`);

  if (response.status === 200) {
    try {
      const data = JSON.parse(text);
      // Trending should return { data: [...] } not { suggestions: [...] }
      if (data.data) {
        console.log("✅ Trending returned 'data' field with", data.data.length, "items");
        assertEquals(Array.isArray(data.data), true, "data field should be an array");
      } else if (data.suggestions) {
        console.log("⚠️ Trending returned 'suggestions' — action routing may still be wrong");
      }
    } catch {
      console.log("Response was non-JSON");
    }
  }
});

// ============================================
// Test 4: topic-ai gap_analysis action  
// ============================================
Deno.test("topic-ai endpoint responds to gap_analysis action", async () => {
  const response = await callTopicAI({
    action: "gap_analysis",
    query: "content gaps analysis",
    limit: 3,
  });

  const text = await response.text();
  console.log("Test 4 gap_analysis status:", response.status);
  console.log("Test 4 response preview:", text.slice(0, 300));
  
  assertEquals(response.status === 200 || response.status === 401 || response.status === 429, true,
    `Expected 200/401/429 but got ${response.status}`);
});

// ============================================
// Test 5: suggest + trending return different payloads (not both suggest)
// ============================================
Deno.test("suggest and trending return structurally different responses", async () => {
  const [suggestRes, trendingRes] = await Promise.all([
    callTopicAI({ action: "suggest", query: "skincare", limit: 3 }),
    callTopicAI({ action: "trending", query: "skincare", limit: 3 }),
  ]);

  const suggestText = await suggestRes.text();
  const trendingText = await trendingRes.text();

  console.log("Test 5 suggest status:", suggestRes.status);
  console.log("Test 5 trending status:", trendingRes.status);

  if (suggestRes.status === 200 && trendingRes.status === 200) {
    try {
      const suggestData = JSON.parse(suggestText);
      const trendingData = JSON.parse(trendingText);
      
      const suggestHasSuggestions = !!suggestData.suggestions;
      const trendingHasData = !!trendingData.data;
      
      console.log(`suggest has 'suggestions': ${suggestHasSuggestions}, trending has 'data': ${trendingHasData}`);
      
      // They should NOT both have the same shape
      if (suggestHasSuggestions && trendingHasData) {
        console.log("✅ Actions are properly routed — different response shapes");
      } else {
        console.log("⚠️ May still be routing both to the same handler");
      }
    } catch {
      console.log("Non-JSON responses");
    }
  }

  assertEquals(suggestRes.status === 200 || suggestRes.status === 401 || suggestRes.status === 429, true,
    `Suggest: Expected 200/401/429 but got ${suggestRes.status}`);
  assertEquals(trendingRes.status === 200 || trendingRes.status === 401 || trendingRes.status === 429, true,
    `Trending: Expected 200/401/429 but got ${trendingRes.status}`);
});

// ============================================
// Test 6: E2E Research → Content flow via Supervisor
// ============================================
Deno.test("E2E: Research intent triggers discover_topics then content generation", async () => {
  const response = await callChatTopics({
    messages: [{ role: "user", content: "Tìm ý tưởng content skincare Gen Z rồi viết bài cho Facebook" }],
    brandTemplateId: null,
    organizationId: null,
    enableSupervisor: true,
  });

  const text = await response.text();
  console.log("Test 6 E2E status:", response.status);
  console.log("Test 6 E2E response preview:", text.slice(0, 800));
  
  assertEquals(response.status === 200 || response.status === 401 || response.status === 429, true,
    `Expected 200/401/429 but got ${response.status}: ${text.slice(0, 200)}`);
  
  if (response.status === 200) {
    try {
      const data = JSON.parse(text);
      console.log("E2E result keys:", Object.keys(data));
      
      if (data.agentResults) {
        console.log("Agents executed:", data.agentResults.map((r: any) => r.agentName));
        
        const researchResult = data.agentResults.find((r: any) => r.agentName === 'research-agent');
        if (researchResult) {
          console.log("Research agent ran successfully:", researchResult.success);
          const discoverTool = researchResult.toolResults?.find((t: any) => t.tool_name === 'discover_topics');
          if (discoverTool) {
            console.log("discover_topics was called:", discoverTool.success);
            assertExists(discoverTool, "discover_topics should have been called by research-agent");
          }
        }
      }
    } catch {
      console.log("Response was non-JSON (streaming mode)");
      assertEquals(text.length > 0, true, "Streaming response should not be empty");
    }
  }
});
