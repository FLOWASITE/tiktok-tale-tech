/**
 * Debug helper: log nguyên nhân khi trang bị unload / full reload.
 * Chỉ active trong dev (import.meta.env.DEV). Import 1 lần ở src/main.tsx.
 *
 * Sau khi xác định và sửa thủ phạm, có thể xoá file này hoặc giữ lại
 * sau cờ VITE_DEBUG_RELOAD.
 */

let installed = false;

export function installReloadDebugger() {
  if (installed) return;
  if (typeof window === 'undefined') return;
  if (!import.meta.env.DEV) return;
  installed = true;

  // 1) Log khi page bắt đầu unload (full reload / navigate ra ngoài SPA)
  window.addEventListener('beforeunload', (e) => {
    const active = document.activeElement as HTMLElement | null;
    // eslint-disable-next-line no-console
    console.warn(
      '[debugReload] beforeunload triggered',
      {
        from: window.location.href,
        activeEl: active?.outerHTML?.slice(0, 300),
      },
      new Error('beforeunload stack').stack,
    );
  });

  // 2) Bắt click vào <a> cùng origin nhưng KHÔNG được React Router xử lý
  window.addEventListener(
    'click',
    (e) => {
      const path = e.composedPath();
      const anchor = path.find(
        (n): n is HTMLAnchorElement =>
          n instanceof HTMLAnchorElement && !!n.getAttribute('href'),
      );
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      const isSameOrigin =
        href.startsWith('/') ||
        href.startsWith(window.location.origin) ||
        href.startsWith('./') ||
        href.startsWith('../');
      if (!isSameOrigin) return;

      // Đợi 1 microtask để React Router kịp preventDefault
      queueMicrotask(() => {
        if (!e.defaultPrevented) {
          // eslint-disable-next-line no-console
          console.warn(
            '[debugReload] same-origin <a> click KHÔNG được SPA chặn → sẽ full reload',
            {
              href,
              outerHTML: anchor.outerHTML.slice(0, 300),
            },
          );
        }
      });
    },
    true, // capture
  );

  // 3) Trace mọi nỗ lực set window.location.href / assign / replace
  try {
    const proto = Object.getPrototypeOf(window.location);
    const origAssign = window.location.assign.bind(window.location);
    const origReplace = window.location.replace.bind(window.location);
    window.location.assign = ((url: string | URL) => {
      // eslint-disable-next-line no-console
      console.warn('[debugReload] location.assign()', url, new Error().stack);
      return origAssign(url);
    }) as typeof window.location.assign;
    window.location.replace = ((url: string | URL) => {
      // eslint-disable-next-line no-console
      console.warn('[debugReload] location.replace()', url, new Error().stack);
      return origReplace(url);
    }) as typeof window.location.replace;
    void proto;
  } catch {
    // Một số trình duyệt không cho override location methods — bỏ qua.
  }

  // eslint-disable-next-line no-console
  console.info('[debugReload] installed (DEV only)');
}
