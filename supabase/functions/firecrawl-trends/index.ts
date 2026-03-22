// Firecrawl Social Trends Edge Function
// Scrapes trend aggregator sites for TikTok/Facebook/YouTube data

import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { 
  getSocialTrends, 
  scrapeTrendSource, 
  TREND_SOURCES,
  AVAILABLE_PLATFORMS,
  getAvailableSources
} from '../_shared/data-fetchers/social-trend-scraper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.Deno.serve(withPerf({ functionName: 'firecrawl-trends' }, async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const method = req.method;

    // GET /firecrawl-trends - List available sources and platforms
    if (method === 'GET') {
      return new Response(
        JSON.stringify({
          success: true,
          available_platforms: AVAILABLE_PLATFORMS,
          available_sources: getAvailableSources(),
          sources_detail: Object.entries(TREND_SOURCES).map(([key, source]) => ({
            key,
            name: source.name,
            platform: source.platform,
            type: source.type,
            url: source.url
          }))
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // POST /firecrawl-trends - Scrape trends
    if (method === 'POST') {
      const body = await req.json();
      const { 
        platform, 
        source, 
        forceRefresh = false,
        industry 
      } = body;

      console.log(`[firecrawl-trends] Request: platform=${platform}, source=${source}, forceRefresh=${forceRefresh}`);

      // If specific source requested, scrape just that source
      if (source) {
        if (!TREND_SOURCES[source]) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Unknown source: ${source}`,
              available_sources: getAvailableSources()
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const result = await scrapeTrendSource(source);
        
        return new Response(
          JSON.stringify(result),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // If platform requested, scrape all sources for that platform
      if (platform) {
        if (!AVAILABLE_PLATFORMS.includes(platform)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Unsupported platform: ${platform}`,
              available_platforms: AVAILABLE_PLATFORMS
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const result = await getSocialTrends(platform, { forceRefresh, industry });
        
        return new Response(
          JSON.stringify({
            success: true,
            ...result
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // No platform or source specified - return error with usage info
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please specify either platform or source',
          usage: {
            platform: 'One of: ' + AVAILABLE_PLATFORMS.join(', '),
            source: 'One of: ' + getAvailableSources().join(', '),
            forceRefresh: 'boolean (optional)',
            industry: 'string (optional) - filter trends by industry'
          }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[firecrawl-trends] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}));
