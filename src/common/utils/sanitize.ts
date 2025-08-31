import xss from 'xss';

/**
 * Sanitizes user-provided string input to mitigate XSS and command injection.
 * Strips all HTML tags and removes common shell metacharacters.
 */
export function sanitizeInput(input: string): string {
  const sanitized = xss(input, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script'],
  });
  return sanitized.replace(/[\n\r;&|`$><]/g, '').trim();
}
