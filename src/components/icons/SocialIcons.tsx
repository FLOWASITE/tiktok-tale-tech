import { type SVGProps } from 'react';

/** Zalo "Z" logo icon */
export function ZaloIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.8 14.4H8.4c-.66 0-1.2-.54-1.2-1.2 0-.27.09-.53.26-.74L13.2 7.6H8.4a.6.6 0 010-1.2h7.2c.66 0 1.2.54 1.2 1.2 0 .27-.09.53-.26.74L10.8 15.2h6a.6.6 0 010 1.2z" />
    </svg>
  );
}

/** X (formerly Twitter) logo icon */
export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** WordPress logo icon — bold "W" filled circle, clear at small sizes */
export function WordPressIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path
        d="M5.8 9.2l2.3 6.6 1.55-4.4-.85-2.2H7.4v-.7h4.6v.7h-1.35l2.05 5.4 1.55-4.6-.7-1.5h-1.05v-.7h4.4v.7h-1.1l-2.55 6.95h-.6l-1.95-5.2-1.95 5.2h-.6L4.6 9.2h1.2z"
        fill="white"
      />
    </svg>
  );
}

/** Blogger logo icon — official "B" on orange square shape */
export function BloggerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="4.5" />
      <path
        d="M9.4 8.5h3.6a1.1 1.1 0 0 1 0 2.2H9.4a1.1 1.1 0 0 1 0-2.2zm0 4.8h5.2a1.1 1.1 0 0 1 0 2.2H9.4a1.1 1.1 0 0 1 0-2.2zM7 7.2C7 6.54 7.54 6 8.2 6h4.6c2.65 0 4.8 2.15 4.8 4.8v2.4c0 2.65-2.15 4.8-4.8 4.8H8.2A1.2 1.2 0 0 1 7 16.8V7.2z"
        fill="white"
      />
    </svg>
  );
}

/** Pinterest official "P" logo icon */
export function PinterestIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.017.027C5.396.027.001 5.42.001 12.043c0 5.087 3.163 9.43 7.625 11.176-.107-.95-.2-2.405.042-3.439.219-.937 1.407-5.965 1.407-5.965s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345c-.091.378-.293 1.193-.332 1.358-.053.22-.173.267-.4.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.991C24.007 5.39 18.641.027 12.017.027z"/>
    </svg>
  );
}
