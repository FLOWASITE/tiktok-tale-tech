# Edge Functions - Backend Services

> Tài liệu về các Edge Functions (Deno serverless) của Flowa

---

## 📋 Mục lục

1. [Tổng quan](#tổng-quan)
2. [Shared Modules](#shared-modules)
3. [Content Generation](#content-generation)
4. [AI Infrastructure](#ai-infrastructure)
5. [Knowledge Graph](#knowledge-graph)
6. [Social Publishing](#social-publishing)
7. [Chatbots](#chatbots)
8. [Development Guide](#development-guide)

---

## Tổng quan

### Cấu trúc thư mục

```
supabase/functions/
├── _shared/                    # Shared modules (not deployed)
│   ├── ai-provider.ts          # Multi-provider AI routing
│   ├── agentic-loop.ts         # Multi-turn agent execution
│   ├── streaming-handler.ts    # SSE streaming utilities
│   ├── compliance-precheck.ts  # Content validation
│   ├── tool-executor.ts        # Tool calling framework
│   ├── logger.ts               # Metrics & logging
│   ├── cors.ts                 # CORS headers
│   └── context-builders/       # Context building utilities
│       ├── industry-context-v2.ts
│       ├── brand-context.ts
│       └── rag-fetcher.ts
│
├── generate-script/            # Script generation
├── generate-carousel/          # Carousel generation
├── generate-multichannel/      # Multi-channel content
├── generate-ad-copy/           # Ad copy generation
├── generate-hooks/             # Hook generation
│
├── topic-ai/                   # Topic chatbot (main)
├── help-chatbot/               # Help center chatbot
├── sales-chatbot/              # Sales assistant
│
├── batch-generate-embeddings/  # Embedding pipeline
├── auto-crawl-regulations/     # External crawl
├── parse-regulation-document/  # Document parsing
├── semantic-search/            # Vector search
│
├── publish-facebook/           # FB publishing
├── publish-instagram/          # IG publishing
├── publish-linkedin/           # LinkedIn publishing
├── oauth-facebook-callback/    # OAuth handlers
└── ... (100+ more)
```

### Deployment

Edge Functions được deploy **tự động** khi có thay đổi trong `supabase/functions/`. Không cần deploy thủ công.

### Authentication Pattern

```typescript
// Standard auth extraction
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

// Extract user from request
async function getUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseClient.auth.getUser(token);
  
  return user;
}
```

---

## Shared Modules

### `ai-provider.ts` - Multi-Provider AI Routing

```typescript
// Supports multiple AI providers with fallback

interface AIProviderConfig {
  provider: 'lovable' | 'openrouter' | 'openai';
  model: string;
  temperature?: number;
  maxTokens?: number;
}

// Primary: Lovable Gateway (no API key needed)
const lovableModels = [
  'openai/gpt-5',
  'openai/gpt-5-mini',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
];

// Usage
async function callAI(
  systemPrompt: string,
  userPrompt: string,
  config: AIProviderConfig
): Promise<string> {
  if (config.provider === 'lovable') {
    return callLovableGateway(systemPrompt, userPrompt, config);
  }
  // ... other providers
}
```

### `streaming-handler.ts` - SSE Streaming

```typescript
// Server-Sent Events for streaming responses

interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onTool?: (tool: ToolCall) => void;
  onDone?: () => void;
}

function createStreamingResponse(
  generator: AsyncGenerator<string>,
  headers?: Record<string, string>
): Response {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of generator) {
        const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
        controller.enqueue(encoder.encode(data));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...headers,
    },
  });
}
```

### `agentic-loop.ts` - Multi-Turn Agent

```typescript
// Execute multi-turn agent conversations with tool calling

interface AgentConfig {
  maxTurns: number;
  tools: Tool[];
  exitConditions: ExitCondition[];
}

async function runAgenticLoop(
  messages: Message[],
  config: AgentConfig
): Promise<AgentResult> {
  let turns = 0;
  let currentMessages = [...messages];
  
  while (turns < config.maxTurns) {
    // 1. Call AI
    const response = await callAI(currentMessages);
    
    // 2. Check for tool calls
    if (response.toolCalls?.length) {
      const toolResults = await executeTools(response.toolCalls, config.tools);
      currentMessages.push({ role: 'tool', content: toolResults });
      turns++;
      continue;
    }
    
    // 3. Check exit conditions
    if (shouldExit(response, config.exitConditions)) {
      return { success: true, response, turns };
    }
    
    turns++;
  }
  
  return { success: false, reason: 'max_turns_reached', turns };
}
```

### `compliance-precheck.ts` - Content Validation

```typescript
// Pre-generation compliance check

interface ComplianceResult {
  isAllowed: boolean;
  riskScore: number;
  violations: Violation[];
  suggestions: string[];
}

async function precheckContent(
  content: string,
  globalPackId: string,
  jurisdiction: string
): Promise<ComplianceResult> {
  // 1. Fetch resolved rules
  const rules = await fetchResolvedRules(globalPackId, jurisdiction);
  
  // 2. Check forbidden terms
  const forbiddenMatches = findForbiddenTerms(content, rules.forbidden_terms);
  
  // 3. Check claim patterns
  const claimViolations = checkClaimPatterns(content, rules.claim_restrictions);
  
  // 4. Calculate risk score
  const riskScore = calculateRiskScore(forbiddenMatches, claimViolations, rules);
  
  return {
    isAllowed: riskScore < rules.risk_thresholds.high,
    riskScore,
    violations: [...forbiddenMatches, ...claimViolations],
    suggestions: generateSuggestions(violations, rules),
  };
}
```

---

## Content Generation

### `generate-script/` - Video Script Generation

```typescript
// POST /generate-script

interface ScriptRequest {
  topic: string;
  duration: '60s' | '90s' | '120s' | '180s';
  style: 'educational' | 'storytelling' | 'promotional';
  brandTemplateId: string;
  targetPersonaId?: string;
}

interface ScriptResponse {
  id: string;
  sections: {
    hook: string;
    problem: string;
    solution: string;
    proof: string;
    cta: string;
  };
  visualCues: string[];
  audioNotes: string[];
  totalDuration: string;
}

// Implementation
Deno.serve(async (req) => {
  const body: ScriptRequest = await req.json();
  
  // 1. Fetch brand + industry context
  const brandContext = await buildBrandContext(body.brandTemplateId);
  const industryContext = await buildIndustryContextV2(brandContext.globalPackId);
  
  // 2. Build system prompt
  const systemPrompt = `
    You are a video script writer.
    
    ${industryContext}
    ${brandContext.voiceGuidelines}
    
    Create a ${body.duration} ${body.style} script.
  `;
  
  // 3. Generate
  const script = await callAI(systemPrompt, body.topic, {
    provider: 'lovable',
    model: 'openai/gpt-5',
    temperature: 0.7,
  });
  
  // 4. Parse and validate
  const parsed = parseScriptOutput(script);
  const compliance = await precheckContent(JSON.stringify(parsed), ...);
  
  return new Response(JSON.stringify({
    ...parsed,
    compliance,
  }));
});
```

### `generate-carousel/` - Carousel Generation

```typescript
// POST /generate-carousel

interface CarouselRequest {
  topic: string;
  slideCount: 5 | 7 | 10;
  style: 'minimal' | 'bold' | 'professional';
  brandTemplateId: string;
}

interface CarouselResponse {
  slides: Array<{
    order: number;
    headline: string;
    bodyText: string;
    imagePrompt: string;
    designNotes: string;
  }>;
  coverSlide: {
    hook: string;
    visualStyle: string;
  };
}
```

### `generate-multichannel/` - Multi-Channel Content

```typescript
// POST /generate-multichannel

interface MultiChannelRequest {
  coreMessage: string;
  channels: string[];  // ['facebook', 'instagram', 'linkedin']
  brandTemplateId: string;
  intent: 'seed' | 'sprout' | 'harvest';
}

interface MultiChannelResponse {
  variants: {
    [channel: string]: {
      content: string;
      hashtags: string[];
      characterCount: number;
      hookType: string;
      cta: string;
    };
  };
}
```

---

## AI Infrastructure

### `generate-hooks/` - Hook Generation

```typescript
// Generate attention-grabbing hooks

const HOOK_TYPES = [
  'question',      // "Bạn có biết...?"
  'statistic',     // "90% người dùng..."
  'controversy',   // "Điều mà không ai nói..."
  'story',         // "Hôm qua tôi gặp..."
  'benefit',       // "Cách để X trong Y phút"
  'curiosity',     // "Bí mật của..."
];

interface HookRequest {
  topic: string;
  hookTypes: string[];
  count: number;
  brandTemplateId: string;
}
```

### `self-critique/` - Quality Improvement

```typescript
// AI self-critique for content improvement

async function selfCritique(
  content: string,
  criteria: string[],
  maxIterations: number = 2
): Promise<string> {
  let currentContent = content;
  
  for (let i = 0; i < maxIterations; i++) {
    const critique = await callAI(`
      Critique this content based on:
      ${criteria.join('\n')}
      
      Content: ${currentContent}
      
      Identify issues and suggest improvements.
    `);
    
    if (critique.includes('NO_ISSUES_FOUND')) {
      break;
    }
    
    currentContent = await callAI(`
      Improve this content based on the critique:
      ${critique}
      
      Original: ${currentContent}
    `);
  }
  
  return currentContent;
}
```

---

## Knowledge Graph

### `batch-generate-embeddings/`

```typescript
// Batch embedding generation for knowledge nodes

interface BatchRequest {
  nodeIds?: string[];    // Specific nodes, or
  nodeTypes?: string[];  // All nodes of types
  limit?: number;        // Max nodes to process
}

Deno.serve(async (req) => {
  const { nodeIds, nodeTypes, limit = 50 } = await req.json();
  
  // 1. Fetch nodes without embeddings
  let query = supabase
    .from('industry_knowledge_nodes')
    .select('id, display_name, description')
    .is('embedding', null)
    .eq('is_active', true)
    .limit(limit);
  
  if (nodeIds?.length) {
    query = query.in('id', nodeIds);
  }
  if (nodeTypes?.length) {
    query = query.in('node_type', nodeTypes);
  }
  
  const { data: nodes } = await query;
  
  // 2. Process in batches of 5
  const BATCH_SIZE = 5;
  let processed = 0;
  
  for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
    const batch = nodes.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (node) => {
      const text = `${node.display_name.vi || ''} ${node.description || ''}`;
      const embedding = await generateEmbedding(text);
      
      await supabase
        .from('industry_knowledge_nodes')
        .update({ embedding })
        .eq('id', node.id);
      
      processed++;
    }));
  }
  
  return new Response(JSON.stringify({ processed }));
});
```

### `auto-crawl-regulations/`

```typescript
// External regulation crawling

interface CrawlRequest {
  source_id?: string;    // Specific source
  crawl_all?: boolean;   // All sources (requires no source_id)
}

// Governance rules:
// 1. source_id provided → only crawl that source
// 2. crawl_all: true (no source_id) → crawl all active sources
// 3. Neither → return 400 error

Deno.serve(async (req) => {
  const { source_id, crawl_all } = await req.json();
  
  // Validate request
  if (source_id && crawl_all) {
    return new Response('Cannot specify both source_id and crawl_all', { status: 400 });
  }
  if (!source_id && !crawl_all) {
    return new Response('Must specify source_id or crawl_all', { status: 400 });
  }
  
  // Fetch sources to crawl
  let sources;
  if (source_id) {
    sources = await fetchSource(source_id);
  } else {
    sources = await fetchAllActiveSources();
  }
  
  // Crawl each source
  for (const source of sources) {
    await crawlSource(source);
  }
  
  return new Response(JSON.stringify({ success: true }));
});
```

### `parse-regulation-document/`

```typescript
// Multi-strategy document parsing

async function parseDocument(nodeId: string): Promise<ParseResult> {
  const node = await getNode(nodeId);
  const url = node.source_url;
  
  // Strategy 1: Direct PDF download
  const pdfUrl = convertToPdfUrl(url);
  if (pdfUrl) {
    const content = await downloadAndParsePdf(pdfUrl);
    if (content) return { success: true, content, strategy: 'pdf' };
  }
  
  // Strategy 2: TVPL fallback
  const tvplContent = await searchAndExtractTVPL(node.display_name.vi);
  if (tvplContent) return { success: true, content: tvplContent, strategy: 'tvpl' };
  
  // Strategy 3: AI extraction
  const html = await fetchHtml(url);
  const aiContent = await extractWithAI(html);
  if (aiContent) return { success: true, content: aiContent, strategy: 'ai' };
  
  return { success: false, error: 'All strategies failed' };
}
```

### `semantic-search/`

```typescript
// Vector similarity search

interface SearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  node_types?: string[];
  global_pack_id?: string;
}

Deno.serve(async (req) => {
  const { query, limit = 10, threshold = 0.5, node_types, global_pack_id } = await req.json();
  
  // 1. Generate query embedding
  const embedding = await generateEmbedding(query);
  
  // 2. Call RPC
  const { data } = await supabase.rpc('search_knowledge_nodes', {
    p_query_embedding: embedding,
    p_limit: limit,
    p_threshold: threshold,
    p_node_types: node_types,
    p_global_pack_id: global_pack_id,
  });
  
  return new Response(JSON.stringify(data));
});
```

---

## Social Publishing

### `publish-facebook/`

```typescript
// POST /publish-facebook

interface PublishRequest {
  content: string;
  mediaUrls?: string[];
  connectionId: string;     // User's FB connection
  pageId: string;           // Target page
  scheduledTime?: string;   // ISO timestamp for scheduling
}

Deno.serve(async (req) => {
  const body: PublishRequest = await req.json();
  
  // 1. Get connection with decrypted token
  const connection = await getConnection(body.connectionId);
  const accessToken = await decryptToken(connection.encrypted_access_token);
  
  // 2. Prepare Facebook API call
  const fbEndpoint = `https://graph.facebook.com/v18.0/${body.pageId}/feed`;
  
  const postData: any = {
    message: body.content,
    access_token: accessToken,
  };
  
  if (body.scheduledTime) {
    postData.scheduled_publish_time = Math.floor(new Date(body.scheduledTime).getTime() / 1000);
    postData.published = false;
  }
  
  // 3. Post to Facebook
  const response = await fetch(fbEndpoint, {
    method: 'POST',
    body: new URLSearchParams(postData),
  });
  
  const result = await response.json();
  
  // 4. Log result
  await logPublishing({
    connectionId: body.connectionId,
    platform: 'facebook',
    status: result.id ? 'success' : 'failed',
    externalPostId: result.id,
    error: result.error?.message,
  });
  
  return new Response(JSON.stringify(result));
});
```

### OAuth Callback Pattern

```typescript
// oauth-facebook-callback/

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');  // Contains userId, redirectUrl
  
  if (!code) {
    return new Response('Missing code', { status: 400 });
  }
  
  // 1. Exchange code for token
  const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: Deno.env.get('FACEBOOK_APP_ID')!,
      client_secret: Deno.env.get('FACEBOOK_APP_SECRET')!,
      redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/oauth-facebook-callback`,
      code,
    }),
  });
  
  const { access_token, expires_in } = await tokenResponse.json();
  
  // 2. Get long-lived token
  const longLivedToken = await exchangeForLongLivedToken(access_token);
  
  // 3. Encrypt and save
  const encryptedToken = await encryptToken(longLivedToken);
  
  await supabase.from('social_connections').upsert({
    user_id: state.userId,
    platform: 'facebook',
    encrypted_access_token: encryptedToken,
    expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
  });
  
  // 4. Redirect back to app
  return Response.redirect(state.redirectUrl);
});
```

---

## Chatbots

### `topic-ai/` - Main Topic Chatbot

```typescript
// Streaming chatbot with tool calling

interface ChatRequest {
  messages: Message[];
  brandTemplateId: string;
  organizationId: string;
  mode: 'discovery' | 'refinement' | 'analysis';
}

const TOOLS = [
  {
    name: 'search_trends',
    description: 'Search for trending topics',
    parameters: { query: 'string', timeRange: 'string' },
  },
  {
    name: 'analyze_competitors',
    description: 'Analyze competitor content',
    parameters: { competitors: 'string[]' },
  },
  {
    name: 'find_gaps',
    description: 'Find content gaps in topic cluster',
    parameters: { topicCluster: 'string' },
  },
];

Deno.serve(async (req) => {
  const body: ChatRequest = await req.json();
  
  // 1. Build context
  const brandContext = await buildBrandContext(body.brandTemplateId);
  const industryContext = await buildIndustryContextV2(brandContext.globalPackId);
  const ragContext = await buildRAGContext(body.messages.slice(-1)[0].content, brandContext.globalPackId);
  
  // 2. System prompt
  const systemPrompt = `
    You are Flowa AI, a content strategy assistant.
    
    ${industryContext}
    ${brandContext.voiceGuidelines}
    
    Relevant knowledge:
    ${ragContext}
    
    Available tools: ${JSON.stringify(TOOLS)}
  `;
  
  // 3. Stream response
  return createStreamingResponse(
    streamAgenticLoop(systemPrompt, body.messages, TOOLS)
  );
});
```

### `help-chatbot/` - Help Center

```typescript
// RAG-powered help assistant

Deno.serve(async (req) => {
  const { question, locale = 'vi' } = await req.json();
  
  // 1. Search help articles
  const articles = await searchHelpArticles(question, locale);
  
  // 2. Build context from articles
  const context = articles.map(a => `
    [${a.title}]
    ${a.content}
  `).join('\n\n');
  
  // 3. Generate answer
  const answer = await callAI(`
    Answer the user's question based on these help articles:
    
    ${context}
    
    If the answer is not in the articles, say so politely.
    Always provide links to relevant articles.
  `, question);
  
  return new Response(JSON.stringify({
    answer,
    sources: articles.map(a => ({ title: a.title, url: a.url })),
  }));
});
```

---

## Development Guide

### Creating a New Edge Function

```bash
# 1. Create function directory
mkdir supabase/functions/my-function

# 2. Create index.ts
touch supabase/functions/my-function/index.ts
```

```typescript
// supabase/functions/my-function/index.ts

import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const body = await req.json();
    
    // Your logic here
    const result = await processRequest(body);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Calling from Frontend

```typescript
// Using supabase.functions.invoke
const { data, error } = await supabase.functions.invoke('my-function', {
  body: { param1: 'value1' },
});

// Streaming response
const response = await supabase.functions.invoke('topic-ai', {
  body: { messages, brandTemplateId },
});

const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = new TextDecoder().decode(value);
  // Parse SSE data
}
```

### Environment Variables

```typescript
// Access secrets in Edge Functions
const apiKey = Deno.env.get('MY_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
```

### Logging & Metrics

```typescript
import { logMetrics } from '../_shared/logger.ts';

// Log AI metrics
await logMetrics({
  function_name: 'generate-script',
  trace_id: crypto.randomUUID(),
  total_duration_ms: Date.now() - startTime,
  input_tokens_estimated: inputTokens,
  output_tokens_estimated: outputTokens,
  organization_id: orgId,
  brand_template_id: brandId,
});
```

---

## Related Documentation

- [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) - Database tables used by functions
- [KNOWLEDGE-GRAPH.md](./KNOWLEDGE-GRAPH.md) - Knowledge Graph functions detail
- [INDUSTRY-PARK.md](./INDUSTRY-PARK.md) - Industry Memory integration
