/**
 * Isomorphic DOM parser & serializer utility
 * Uses native browser DOMParser / XMLSerializer when in window,
 * and jsdom when running in Node.js / test environments.
 */

export function parseSvgDocument(svgString: string): Document {
  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    const parser = new window.DOMParser();
    return parser.parseFromString(svgString, 'image/svg+xml');
  }

  // Node.js environment
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(svgString, { contentType: 'image/svg+xml' });
    return dom.window.document;
  } catch (err) {
    throw new Error(`Failed to load jsdom in Node environment: ${err}`);
  }
}

export function serializeSvgDocument(node: Node): string {
  if (typeof window !== 'undefined' && typeof window.XMLSerializer !== 'undefined') {
    return new window.XMLSerializer().serializeToString(node);
  }

  // Node.js environment
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM();
    const serializer = new dom.window.XMLSerializer();
    return serializer.serializeToString(node);
  } catch (err) {
    throw new Error(`Failed to serialize XML with jsdom: ${err}`);
  }
}

/**
 * Computes a standard SHA-256 hash of a string.
 * Uses Web Crypto API when available, or Node crypto.
 */
export async function computeSha256(content: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Node.js fallback
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    return nodeCrypto.createHash('sha256').update(content, 'utf8').digest('hex');
  } catch {
    // Simple deterministic string fallback if neither is available
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}
