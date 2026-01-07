/**
 * Domain Routing Hook
 * Detects whether the current domain is for Landing (flowa.one) or App (app.flowa.one)
 */

const APP_DOMAINS = ['app.flowa.one', 'app.flowa.vn'];
const LANDING_DOMAINS = ['flowa.one', 'flowa.vn', 'www.flowa.one', 'www.flowa.vn'];

export function useDomainRouting() {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  
  // Check if we're on localhost or preview domain (treat as app domain for development)
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isPreviewDomain = hostname.includes('lovable.app') || hostname.includes('lovableproject.com');
  
  // Check if on app subdomain
  const isAppDomain = APP_DOMAINS.some(domain => hostname === domain) || 
                      hostname.startsWith('app.') ||
                      isLocalhost ||
                      isPreviewDomain;
  
  // Check if on landing domain (root domain without app. prefix)
  const isLandingDomain = LANDING_DOMAINS.some(domain => hostname === domain) ||
                          (!isAppDomain && !isLocalhost && !isPreviewDomain);

  // Get the app domain URL for redirects
  const getAppUrl = (path: string = '/') => {
    if (isLocalhost || isPreviewDomain) {
      return path; // Same origin for development
    }
    // Production: redirect to app.flowa.one
    return `https://app.flowa.one${path}`;
  };

  // Get the landing domain URL for redirects  
  const getLandingUrl = (path: string = '/') => {
    if (isLocalhost || isPreviewDomain) {
      return `/landing${path === '/' ? '' : path}`;
    }
    // Production: redirect to flowa.one
    return `https://flowa.one${path}`;
  };

  return {
    hostname,
    isAppDomain,
    isLandingDomain,
    isLocalhost,
    isPreviewDomain,
    getAppUrl,
    getLandingUrl,
  };
}

// Helper to get auth URL (always on app domain)
export function getAuthUrl(mode: 'login' | 'register' = 'login') {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isPreviewDomain = hostname.includes('lovable.app') || hostname.includes('lovableproject.com');
  
  const tab = mode === 'register' ? '?tab=register' : '';
  
  if (isLocalhost || isPreviewDomain) {
    return `/auth${tab}`;
  }
  
  return `https://app.flowa.one/auth${tab}`;
}
