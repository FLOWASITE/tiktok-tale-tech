/**
 * Normalizes any value to a string suitable for ReactMarkdown children.
 * Prevents "Unexpected value [object Object] for children prop" errors.
 */
export function normalizeMarkdownText(value: unknown): string {
  // Already a string - return as-is
  if (typeof value === 'string') {
    return value;
  }
  
  // Null or undefined - return empty string
  if (value == null) {
    return '';
  }
  
  // Number or boolean - convert to string
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  // Object or array - try to unwrap common patterns
  if (typeof value === 'object') {
    // Log warning for debugging
    console.warn('[normalizeMarkdownText] Non-string content received:', value);
    
    // Try common wrapper patterns
    const obj = value as Record<string, unknown>;
    if (typeof obj.content === 'string') return obj.content;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.markdown === 'string') return obj.markdown;
    if (typeof obj.value === 'string') return obj.value;
    
    // Fallback: stringify the object
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Invalid content]';
    }
  }
  
  // Any other type - convert to string
  return String(value);
}
