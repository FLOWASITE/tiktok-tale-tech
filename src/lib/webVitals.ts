// Send Core Web Vitals to GA4 as custom events
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function sendToGA(metric: Metric) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', metric.name, {
    event_category: 'Web Vitals',
    event_label: metric.id,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    metric_id: metric.id,
    metric_value: metric.value,
    metric_delta: metric.delta,
    metric_rating: metric.rating,
    non_interaction: true,
  });
}

export function initWebVitals() {
  onCLS(sendToGA);
  onINP(sendToGA);
  onLCP(sendToGA);
  onFCP(sendToGA);
  onTTFB(sendToGA);
}
