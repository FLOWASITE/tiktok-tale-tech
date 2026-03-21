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
