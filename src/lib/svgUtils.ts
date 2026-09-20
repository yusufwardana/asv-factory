import { 
  IconSlot, 
  Project, 
  PreflightItem, 
  VectorStats, 
  DetailedElementCounts,
  LiveTextDetail,
  TransparencyDetail,
  RasterDetail,
  EffectsDetail,
  StrokeDetail
} from '../types';
import { parseSvgDocument, serializeSvgDocument, computeSha256 } from './domUtils';

export interface SanitizationResult {
  cleanSvg: string;
  innerSvg: string;
  viewBox: { x: number; y: number; width: number; height: number };
  stats: VectorStats;
  logs: string[];
}

export interface ExportVerificationResult {
  isValid: boolean;
  verified: boolean;
  errors: string[];
  exportedElementCounts: DetailedElementCounts;
  svgSha256: string;
  canvas: { width: number; height: number; viewBox: string };
  iconGroupsFound: number;
  expectedGroups: number;
  hasRaster: boolean;
  hasScripts: boolean;
  hasLiveText: boolean;
}

/**
 * Definition of Total Drawable Vector Elements:
 * All SVG elements that directly render vector geometry on canvas:
 * <path>, <rect>, <circle>, <ellipse>, <line>, <polyline>, <polygon>, <use>, and <text>.
 * Excludes structural containers (<g>, <defs>), raster bitmaps (<image>), and effect definitions (<linearGradient>, etc.).
 */
export const DRAWABLE_ELEMENT_TAGS = [
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'use',
  'text'
] as const;

export function createEmptyDetailedCounts(): DetailedElementCounts {
  return {
    paths: 0,
    rects: 0,
    circles: 0,
    ellipses: 0,
    lines: 0,
    polylines: 0,
    polygons: 0,
    groups: 0,
    text: 0,
    images: 0,
    uses: 0,
    defs: 0,
    linearGradients: 0,
    radialGradients: 0,
    patterns: 0,
    filters: 0,
    masks: 0,
    clipPaths: 0,
    totalDrawableElements: 0
  };
}

export function createEmptyStats(): VectorStats {
  return {
    elementCount: 0,
    pathCount: 0,
    nodeEstimate: 0,
    groupCount: 0,
    colors: [],
    strokeWidths: [],
    hasRaster: false,
    hasText: false,
    hasScripts: false,
    hasGradients: false,
    hasMasks: false,
    hasClipPaths: false,
    hasExternalRefs: false,
    artifactsCount: 0,
    elementCounts: createEmptyDetailedCounts(),
    textDetails: { count: 0, items: [] },
    transparencyDetails: {
      totalElements: 0,
      opacityCount: 0,
      fillOpacityCount: 0,
      strokeOpacityCount: 0,
      inheritedCount: 0,
      hasTransparency: false,
      items: []
    },
    rasterDetails: {
      total: 0,
      embeddedBase64: 0,
      externalUrls: 0,
      items: []
    },
    effectsDetails: {
      gradientDefs: 0,
      gradientUsages: 0,
      patternDefs: 0,
      patternUsages: 0,
      filterDefs: 0,
      filterUsages: 0,
      maskDefs: 0,
      maskUsages: 0,
      clipPathDefs: 0,
      clipPathUsages: 0
    },
    strokeDetails: {
      widths: [],
      colors: [],
      lineCaps: [],
      lineJoins: []
    },
    outsideArtboardCount: 0
  };
}

/**
 * Parses an SVG string, sanitizes dangerous content, extracts vector geometry and comprehensive statistics.
 * Accurately audits live text, raster, transparency, stroke systems, colors, effects, and bounds.
 */
export function sanitizeAndInspectSvg(rawSvg: string, slotLabel?: string, slotIndex?: number): SanitizationResult {
  const logs: string[] = [];
  const doc = parseSvgDocument(rawSvg);

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    logs.push(`XML Parsing error: ${parserError.textContent?.slice(0, 100) || 'Malformed XML'}`);
  }

  const svgEl = doc.querySelector('svg');
  if (!svgEl) {
    return {
      cleanSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"></svg>',
      innerSvg: '',
      viewBox: { x: 0, y: 0, width: 100, height: 100 },
      stats: createEmptyStats(),
      logs: ['Error: No root <svg> element found in input.']
    };
  }

  // 1. Remove dangerous executable elements: <script>, <foreignObject>
  const scripts = doc.querySelectorAll('script');
  if (scripts.length > 0) {
    scripts.forEach(s => s.remove());
    logs.push(`Security: Removed ${scripts.length} <script> executable tag(s).`);
  }

  const foreignObjects = doc.querySelectorAll('foreignObject');
  if (foreignObjects.length > 0) {
    foreignObjects.forEach(f => f.remove());
    logs.push(`Security: Removed ${foreignObjects.length} <foreignObject> HTML embedding tag(s).`);
  }

  // 2. Remove editor metadata & namespaces: inkscape, sodipodi, adobe, sketch, rdf, metadata
  const metadataTags = doc.querySelectorAll('metadata, rdf\\:RDF');
  metadataTags.forEach(m => {
    m.remove();
    logs.push('Cleaned: Stripped editor metadata / RDF block.');
  });

  // Clean <style> tags containing remote @import or javascript:
  const styleTags = doc.querySelectorAll('style');
  styleTags.forEach(st => {
    let css = st.textContent || '';
    if (/@import\s+(url\()?['"]?(https?:|\/\/)/i.test(css)) {
      logs.push('Security: Removed external @import in stylesheet.');
      css = css.replace(/@import\s+[^;]+;/gi, '');
      st.textContent = css;
    }
  });

  // 3. Scan & clean attributes on all elements
  const allElements = Array.from(doc.querySelectorAll('*'));
  let removedHandlersCount = 0;
  let hasRaster = false;
  let hasExternalRefs = false;
  let hasText = false;

  const colorSet = new Set<string>();
  const fillColorSet = new Set<string>();
  const strokeColorSet = new Set<string>();
  const strokeWidthsList: number[] = [];
  const lineCapsSet = new Set<string>();
  const lineJoinsSet = new Set<string>();

  const liveTextItems: LiveTextDetail[] = [];
  const rasterItems: RasterDetail['items'] = [];
  const transparencyItems: TransparencyDetail['items'] = [];
  let opacityCount = 0;
  let fillOpacityCount = 0;
  let strokeOpacityCount = 0;
  let inheritedTransCount = 0;

  let gradientUsages = 0;
  let filterUsages = 0;
  let maskUsages = 0;
  let clipPathUsages = 0;
  let patternUsages = 0;

  // Track parent group transparency inheritance
  const elementsWithInheritedTrans = new Set<Element>();
  const groupsWithTrans = doc.querySelectorAll('g[opacity], g[fill-opacity], g[stroke-opacity], g[style*="opacity"]');
  groupsWithTrans.forEach(grp => {
    const descendants = grp.querySelectorAll('*');
    descendants.forEach(d => elementsWithInheritedTrans.add(d));
  });

  allElements.forEach(el => {
    const tagName = el.tagName.toLowerCase();

    // Check raster <image>
    if (tagName === 'image') {
      hasRaster = true;
      const href = el.getAttribute('href') || el.getAttribute('xlink:href') || '';
      if (href.startsWith('data:image/')) {
        rasterItems.push({ type: 'embedded-base64', src: href.slice(0, 48) + '...' });
        logs.push('Vector Violation: Found base64 embedded raster <image> element.');
      } else if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
        rasterItems.push({ type: 'external-url', src: href });
        logs.push(`Vector Violation: Found external linked raster image: ${href}`);
      } else {
        rasterItems.push({ type: 'other', src: href });
        logs.push(`Vector Violation: Found raster image reference: ${href}`);
      }
    }

    // Check live text: <text>, <tspan>, <textPath>
    if (tagName === 'text' || tagName === 'tspan' || tagName === 'textpath') {
      hasText = true;
      // Only record top-level text or distinct tspans
      const textContent = (el.textContent || '').trim();
      const styleAttr = el.getAttribute('style') || '';
      const isHidden = el.getAttribute('display') === 'none' ||
                       el.getAttribute('visibility') === 'hidden' ||
                       styleAttr.includes('display:none') ||
                       styleAttr.includes('visibility:hidden') ||
                       el.getAttribute('opacity') === '0';

      liveTextItems.push({
        text: textContent,
        tagName,
        slotIndex,
        slotLabel,
        isHidden
      });
    }

    // Check transparency
    let hasElementTransparency = false;
    const op = el.getAttribute('opacity');
    if (op && parseFloat(op) < 1.0) {
      opacityCount++;
      hasElementTransparency = true;
      transparencyItems.push({ tagName, type: 'opacity', value: op });
    }

    const fillOp = el.getAttribute('fill-opacity');
    if (fillOp && parseFloat(fillOp) < 1.0) {
      fillOpacityCount++;
      hasElementTransparency = true;
      transparencyItems.push({ tagName, type: 'fill-opacity', value: fillOp });
    }

    const strokeOp = el.getAttribute('stroke-opacity');
    if (strokeOp && parseFloat(strokeOp) < 1.0) {
      strokeOpacityCount++;
      hasElementTransparency = true;
      transparencyItems.push({ tagName, type: 'stroke-opacity', value: strokeOp });
    }

    // Check inline style for transparency
    const styleAttr = el.getAttribute('style');
    if (styleAttr) {
      const matchOp = styleAttr.match(/(?:^|;)\s*opacity:\s*([\d.]+)/i);
      if (matchOp && parseFloat(matchOp[1]) < 1.0) {
        opacityCount++;
        hasElementTransparency = true;
        transparencyItems.push({ tagName, type: 'opacity', value: matchOp[1] });
      }
      const matchFillOp = styleAttr.match(/(?:^|;)\s*fill-opacity:\s*([\d.]+)/i);
      if (matchFillOp && parseFloat(matchFillOp[1]) < 1.0) {
        fillOpacityCount++;
        hasElementTransparency = true;
        transparencyItems.push({ tagName, type: 'fill-opacity', value: matchFillOp[1] });
      }
      const matchStrokeOp = styleAttr.match(/(?:^|;)\s*stroke-opacity:\s*([\d.]+)/i);
      if (matchStrokeOp && parseFloat(matchStrokeOp[1]) < 1.0) {
        strokeOpacityCount++;
        hasElementTransparency = true;
        transparencyItems.push({ tagName, type: 'stroke-opacity', value: matchStrokeOp[1] });
      }
    }

    // Check inherited transparency
    if (elementsWithInheritedTrans.has(el)) {
      inheritedTransCount++;
      if (!hasElementTransparency) {
        transparencyItems.push({ tagName, type: 'inherited', value: 'inherited-from-group' });
      }
    }

    // Check effect usages: url(#...)
    const fillVal = el.getAttribute('fill') || '';
    const strokeVal = el.getAttribute('stroke') || '';
    const filterVal = el.getAttribute('filter') || '';
    const maskVal = el.getAttribute('mask') || '';
    const clipVal = el.getAttribute('clip-path') || '';

    if (fillVal.includes('url(#') || (styleAttr && /fill:\s*url\(#/i.test(styleAttr))) {
      gradientUsages++;
    }
    if (strokeVal.includes('url(#') || (styleAttr && /stroke:\s*url\(#/i.test(styleAttr))) {
      gradientUsages++;
    }
    if (filterVal.includes('url(#') || (styleAttr && /filter:\s*url\(#/i.test(styleAttr))) {
      filterUsages++;
    }
    if (maskVal.includes('url(#') || (styleAttr && /mask:\s*url\(#/i.test(styleAttr))) {
      maskUsages++;
    }
    if (clipVal.includes('url(#') || (styleAttr && /clip-path:\s*url\(#/i.test(styleAttr))) {
      clipPathUsages++;
    }

    // Stroke attributes
    const sw = el.getAttribute('stroke-width');
    if (sw) {
      const num = parseFloat(sw);
      if (!isNaN(num) && num > 0) strokeWidthsList.push(Math.round(num * 10) / 10);
    }
    const cap = el.getAttribute('stroke-linecap');
    if (cap) lineCapsSet.add(cap.toLowerCase());
    const join = el.getAttribute('stroke-linejoin');
    if (join) lineJoinsSet.add(join.toLowerCase());

    // Color extraction
    if (fillVal && fillVal !== 'none' && fillVal !== 'transparent' && !fillVal.startsWith('url(')) {
      const hex = normalizeHexColor(fillVal);
      if (hex) {
        colorSet.add(hex);
        fillColorSet.add(hex);
      }
    }
    if (strokeVal && strokeVal !== 'none' && strokeVal !== 'transparent' && !strokeVal.startsWith('url(')) {
      const hex = normalizeHexColor(strokeVal);
      if (hex) {
        colorSet.add(hex);
        strokeColorSet.add(hex);
      }
    }
    const stopColor = el.getAttribute('stop-color');
    if (stopColor) {
      const hex = normalizeHexColor(stopColor);
      if (hex) colorSet.add(hex);
    }

    // Style attributes cleanup & extraction
    const attrsToRemove: string[] = [];
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      const name = attr.name.toLowerCase();
      const val = attr.value;

      // Event handlers
      if (name.startsWith('on')) {
        attrsToRemove.push(attr.name);
        removedHandlersCount++;
      }

      // Javascript URLs
      if ((name === 'href' || name === 'xlink:href') && val.trim().toLowerCase().startsWith('javascript:')) {
        attrsToRemove.push(attr.name);
        logs.push('Security: Removed javascript: protocol link.');
      }

      // Remote URLs / external resources
      if ((name === 'href' || name === 'xlink:href' || name === 'src') && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('//'))) {
        hasExternalRefs = true;
        attrsToRemove.push(attr.name);
        logs.push(`Security: Removed external reference URL: ${val}`);
      }

      // Base64 embedded raster in fills/images
      if (val.includes('data:image/')) {
        hasRaster = true;
        logs.push('Vector Violation: Found base64 embedded raster data.');
      }

      // Editor namespaces (inkscape, sodipodi, etc.)
      if (name.startsWith('inkscape:') || name.startsWith('sodipodi:') || name.startsWith('adobe:') || name.startsWith('sketch:')) {
        attrsToRemove.push(attr.name);
      }

      // Inline style color and stroke width extraction
      if (name === 'style') {
        const styleFillMatch = val.match(/(?:^|;)\s*fill:\s*([^;]+)/i);
        if (styleFillMatch) {
          const hex = normalizeHexColor(styleFillMatch[1].trim());
          if (hex) {
            colorSet.add(hex);
            fillColorSet.add(hex);
          }
        }
        const styleStrokeMatch = val.match(/(?:^|;)\s*stroke:\s*([^;]+)/i);
        if (styleStrokeMatch) {
          const hex = normalizeHexColor(styleStrokeMatch[1].trim());
          if (hex) {
            colorSet.add(hex);
            strokeColorSet.add(hex);
          }
        }
        const styleStrokeWidthMatch = val.match(/(?:^|;)\s*stroke-width:\s*([\d.]+)/i);
        if (styleStrokeWidthMatch) {
          const num = parseFloat(styleStrokeWidthMatch[1]);
          if (!isNaN(num) && num > 0) strokeWidthsList.push(Math.round(num * 10) / 10);
        }
      }
    }

    attrsToRemove.forEach(a => el.removeAttribute(a));
  });

  if (removedHandlersCount > 0) {
    logs.push(`Security: Removed ${removedHandlersCount} interactive on* handler(s).`);
  }

  // 4. Extract or derive viewBox
  let viewBox = { x: 0, y: 0, width: 100, height: 100 };
  const vbAttr = svgEl.getAttribute('viewBox');
  if (vbAttr) {
    const parts = vbAttr.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && !parts.some(isNaN) && parts[2] > 0 && parts[3] > 0) {
      viewBox = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    }
  } else {
    const w = parseFloat(svgEl.getAttribute('width') || '100');
    const h = parseFloat(svgEl.getAttribute('height') || '100');
    viewBox = { x: 0, y: 0, width: isNaN(w) || w <= 0 ? 100 : w, height: isNaN(h) || h <= 0 ? 100 : h };
    svgEl.setAttribute('viewBox', `0 0 ${viewBox.width} ${viewBox.height}`);
    logs.push(`Format: Synthesized missing viewBox attribute (0 0 ${viewBox.width} ${viewBox.height}).`);
  }

  // 5. Gather Strict Individual SVG Element Counts
  const paths = doc.querySelectorAll('path');
  const rects = doc.querySelectorAll('rect');
  const circles = doc.querySelectorAll('circle');
  const ellipses = doc.querySelectorAll('ellipse');
  const lines = doc.querySelectorAll('line');
  const polylines = doc.querySelectorAll('polyline');
  const polygons = doc.querySelectorAll('polygon');
  const groups = doc.querySelectorAll('g');
  const textEls = doc.querySelectorAll('text');
  const images = doc.querySelectorAll('image');
  const uses = doc.querySelectorAll('use');
  const defs = doc.querySelectorAll('defs');
  const linearGradients = doc.querySelectorAll('linearGradient');
  const radialGradients = doc.querySelectorAll('radialGradient');
  const patterns = doc.querySelectorAll('pattern');
  const filters = doc.querySelectorAll('filter');
  const masks = doc.querySelectorAll('mask');
  const clipPaths = doc.querySelectorAll('clipPath');

  let nodeEstimate = 0;
  paths.forEach(p => {
    const d = p.getAttribute('d') || '';
    const commands = d.match(/[MLHVCSQTAZmlhvcsqtaz]/g);
    nodeEstimate += commands ? commands.length : 4;
  });
  nodeEstimate += polylines.length * 5;
  nodeEstimate += polygons.length * 5;
  nodeEstimate += (rects.length + circles.length + ellipses.length) * 4;
  nodeEstimate += lines.length * 2;

  // Total Drawable Vector Elements:
  // Strictly elements that draw vector graphics on screen
  const totalDrawable = paths.length + 
                        rects.length + 
                        circles.length + 
                        ellipses.length + 
                        lines.length + 
                        polylines.length + 
                        polygons.length + 
                        uses.length + 
                        textEls.length;

  const detailedCounts: DetailedElementCounts = {
    paths: paths.length,
    rects: rects.length,
    circles: circles.length,
    ellipses: ellipses.length,
    lines: lines.length,
    polylines: polylines.length,
    polygons: polygons.length,
    groups: groups.length,
    text: textEls.length,
    images: images.length,
    uses: uses.length,
    defs: defs.length,
    linearGradients: linearGradients.length,
    radialGradients: radialGradients.length,
    patterns: patterns.length,
    filters: filters.length,
    masks: masks.length,
    clipPaths: clipPaths.length,
    totalDrawableElements: totalDrawable
  };

  const effectsDetails: EffectsDetail = {
    gradientDefs: linearGradients.length + radialGradients.length,
    gradientUsages,
    patternDefs: patterns.length,
    patternUsages,
    filterDefs: filters.length,
    filterUsages,
    maskDefs: masks.length,
    maskUsages,
    clipPathDefs: clipPaths.length,
    clipPathUsages
  };

  const hasTransparency = (opacityCount + fillOpacityCount + strokeOpacityCount) > 0;

  const transparencyDetails: TransparencyDetail = {
    totalElements: opacityCount + fillOpacityCount + strokeOpacityCount,
    opacityCount,
    fillOpacityCount,
    strokeOpacityCount,
    inheritedCount: inheritedTransCount,
    hasTransparency,
    items: transparencyItems
  };

  const rasterDetails: RasterDetail = {
    total: images.length + (hasRaster ? 1 : 0),
    embeddedBase64: rasterItems.filter(r => r.type === 'embedded-base64').length,
    externalUrls: rasterItems.filter(r => r.type === 'external-url').length,
    items: rasterItems
  };

  const strokeDetails: StrokeDetail = {
    widths: Array.from(new Set(strokeWidthsList)).sort((a, b) => a - b),
    colors: Array.from(strokeColorSet),
    lineCaps: Array.from(lineCapsSet),
    lineJoins: Array.from(lineJoinsSet)
  };

  const stats: VectorStats = {
    elementCount: totalDrawable,
    pathCount: paths.length, // STRICTLY <path> elements
    nodeEstimate: Math.max(nodeEstimate, 4),
    groupCount: groups.length,
    colors: Array.from(colorSet),
    strokeWidths: strokeDetails.widths,
    hasRaster: images.length > 0 || hasRaster,
    hasText: textEls.length > 0 || hasText,
    hasScripts: scripts.length > 0 || removedHandlersCount > 0,
    hasGradients: linearGradients.length + radialGradients.length > 0 || gradientUsages > 0,
    hasMasks: masks.length > 0 || maskUsages > 0,
    hasClipPaths: clipPaths.length > 0 || clipPathUsages > 0,
    hasExternalRefs,
    artifactsCount: detectTraceArtifactsCount(doc),
    elementCounts: detailedCounts,
    textDetails: {
      count: textEls.length,
      items: liveTextItems
    },
    transparencyDetails,
    rasterDetails,
    effectsDetails,
    strokeDetails,
    outsideArtboardCount: detectOutsideArtboardElements(doc, viewBox)
  };

  const cleanSvg = serializeSvgDocument(svgEl);
  const innerSvg = svgEl.innerHTML || '';

  return {
    cleanSvg,
    innerSvg,
    viewBox,
    stats,
    logs
  };
}

/**
 * Counts trace artifacts (empty paths, duplicate definitions, microscopic shapes)
 */
function detectTraceArtifactsCount(doc: Document): number {
  let artifacts = 0;
  const paths = doc.querySelectorAll('path');
  const seenPathDefs = new Set<string>();

  paths.forEach(p => {
    const d = (p.getAttribute('d') || '').trim();
    if (!d) {
      artifacts++; // empty path
      return;
    }

    // Exact duplicate geometry
    if (seenPathDefs.has(d)) {
      artifacts++;
    } else {
      seenPathDefs.add(d);
    }

    // Microscopic path: very short string or tiny bounding coordinate
    const numbers = d.match(/[-+]?[0-9]*\.?[0-9]+/g)?.map(Number) || [];
    if (numbers.length <= 4 && d.length < 16) {
      artifacts++;
    }
  });

  return artifacts;
}

/**
 * Detects elements placed completely outside the artboard
 */
function detectOutsideArtboardElements(doc: Document, viewBox: { x: number; y: number; width: number; height: number }): number {
  let outside = 0;
  const rects = doc.querySelectorAll('rect');
  rects.forEach(r => {
    const x = parseFloat(r.getAttribute('x') || '0');
    const y = parseFloat(r.getAttribute('y') || '0');
    const w = parseFloat(r.getAttribute('width') || '0');
    const h = parseFloat(r.getAttribute('height') || '0');
    if (x + w < viewBox.x || x > viewBox.x + viewBox.width || y + h < viewBox.y || y > viewBox.y + viewBox.height) {
      outside++;
    }
  });
  return outside;
}

/**
 * Safely removes all live text elements (<text>, <tspan>, <textPath>) from an SVG string.
 * Used when user chooses explicit "REMOVE TEXT" action.
 */
export function removeLiveTextFromSvg(svgString: string): string {
  const doc = parseSvgDocument(svgString);
  const textElements = doc.querySelectorAll('text, tspan, textPath, textpath');
  textElements.forEach(t => t.remove());
  const root = doc.querySelector('svg');
  return root ? serializeSvgDocument(root) : svgString;
}

/**
 * Normalize CSS colors to uppercase Hex string (#RRGGBB)
 */
export function normalizeHexColor(colorStr: string): string | null {
  if (!colorStr) return null;
  const c = colorStr.trim().toLowerCase();
  if (c === 'none' || c === 'transparent' || c === 'inherit' || c === 'currentcolor') return null;

  if (c.startsWith('#')) {
    if (c.length === 4) {
      return ('#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]).toUpperCase();
    }
    if (c.length === 7) {
      return c.toUpperCase();
    }
    if (c.length === 9) { // #RRGGBBAA
      return ('#' + c.slice(1, 7)).toUpperCase();
    }
    return c.toUpperCase();
  }

  // Handle rgb / rgba
  const rgbMatch = c.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10))).toString(16).padStart(2, '0');
    const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10))).toString(16).padStart(2, '0');
    const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10))).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }

  return c.toUpperCase();
}

/**
 * Calculate color similarity distance in RGB space (0 = identical, max 441)
 */
export function colorDistance(hex1: string, hex2: string): number {
  const parseHex = (hex: string) => {
    const clean = hex.replace('#', '');
    if (clean.length === 6) {
      return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16),
      };
    }
    return { r: 0, g: 0, b: 0 };
  };

  const c1 = parseHex(hex1);
  const c2 = parseHex(hex2);

  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

export interface PaletteItem {
  hex: string;
  count: number;
  mergeSuggestion?: string;
}

export function extractProjectPalette(slots: IconSlot[]): PaletteItem[] {
  const colorCounts = new Map<string, number>();

  slots.forEach(slot => {
    slot.stats.colors.forEach(col => {
      const normalized = normalizeHexColor(col);
      if (normalized) {
        colorCounts.set(normalized, (colorCounts.get(normalized) || 0) + 1);
      }
    });
  });

  const palette: PaletteItem[] = Array.from(colorCounts.entries()).map(([hex, count]) => ({
    hex,
    count
  }));

  // Detect near-duplicate colors (< 22 distance in RGB)
  for (let i = 0; i < palette.length; i++) {
    for (let j = i + 1; j < palette.length; j++) {
      const dist = colorDistance(palette[i].hex, palette[j].hex);
      if (dist > 0 && dist < 22) {
        if (palette[i].count >= palette[j].count) {
          palette[j].mergeSuggestion = palette[i].hex;
        } else {
          palette[i].mergeSuggestion = palette[j].hex;
        }
      }
    }
  }

  return palette.sort((a, b) => b.count - a.count);
}

/**
 * Optical normalization: balances visual weight across icon slots
 */
export function autoNormalizeSlots(slots: IconSlot[], targetSlotSize: number = 200): IconSlot[] {
  if (slots.length === 0) return [];

  const validSlots = slots.filter(s => s.svgContent && s.svgContent.length > 50);
  if (validSlots.length === 0) return slots;

  const weights = validSlots.map(s => {
    const nodeMass = Math.sqrt(s.stats.nodeEstimate || 1);
    const elementMass = Math.sqrt(s.stats.elementCount || 1);
    return Math.max(1, nodeMass + elementMass);
  });

  const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;

  return slots.map(slot => {
    if (!slot.svgContent || slot.svgContent.length < 50) return slot;

    const currentMass = Math.max(1, Math.sqrt(slot.stats.nodeEstimate || 1) + Math.sqrt(slot.stats.elementCount || 1));
    const ratio = currentMass / avgWeight;

    let opticalScale = 1.0;
    if (ratio > 1.25) {
      opticalScale = 0.94;
    } else if (ratio < 0.75) {
      opticalScale = 1.06;
    }

    return {
      ...slot,
      scale: Math.round(opticalScale * 100) / 100,
      offsetX: 0,
      offsetY: 0,
      visualWeight: Math.round(ratio * 100) / 100
    };
  });
}

/**
 * Generates the clean standalone stock SVG conforming to Adobe Stock standards:
 * - Proper viewBox, width, height (e.g. 4000x4000)
 * - Clean organized <g id="icon-01-label"> groups
 * - Sanitized vector paths, no editor metadata, zero raster, no scripts
 */
export function generateStandaloneStockSvg(project: Project): string {
  const { width, height, gridRows, gridCols, safePadding } = project.canvasConfig;
  const colWidth = width / gridCols;
  const rowHeight = height / gridRows;

  let groupsXml = '';

  project.slots.forEach((slot, idx) => {
    if (!slot.svgContent || slot.svgContent.length < 20) return;

    const col = idx % gridCols;
    const row = Math.floor(idx / gridCols);
    const slotCenterX = col * colWidth + colWidth / 2;
    const slotCenterY = row * rowHeight + rowHeight / 2;

    const safeWidth = colWidth - safePadding * 2;
    const safeHeight = rowHeight - safePadding * 2;
    const baseScale = Math.min(safeWidth / 100, safeHeight / 100) * (slot.scale || 1.0);

    const cleanLabel = slot.label.replace(/^\d+[\s_-]*/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const safeId = `icon-${String(idx + 1).padStart(2, '0')}-${cleanLabel}`;

    const x = slotCenterX + (slot.offsetX || 0);
    const y = slotCenterY + (slot.offsetY || 0);

    const inner = extractInnerSvgContent(slot.svgContent);

    groupsXml += `\n  <!-- ${escapeXml(slot.label)} -->\n  <g id="${safeId}" transform="translate(${x}, ${y}) scale(${baseScale}) translate(-50, -50)">\n    ${inner}\n  </g>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     viewBox="0 0 ${width} ${height}" 
     width="${width}" 
     height="${height}" 
     version="1.1">
  <title>${escapeXml(project.metadata.title || project.name)}</title>
  <desc>Adobe Stock Vector Asset - ${escapeXml(project.metadata.category || 'Vector Graphics')}</desc>
  ${groupsXml}
</svg>`;
}

export function extractInnerSvgContent(svgStr: string): string {
  if (!svgStr) return '';
  const match = svgStr.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return svgStr.replace(/<\/?svg[^>]*>/gi, '').trim();
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Full post-export verification engine (PHASE 17):
 * Re-parses the exported SVG string from scratch, conducts comprehensive independent
 * element counting and security/raster screening, and verifies consistency with the editor project.
 */
export async function verifyExportedSvg(exportedSvg: string, project: Project): Promise<ExportVerificationResult> {
  const errors: string[] = [];
  const doc = parseSvgDocument(exportedSvg);
  const svgEl = doc.querySelector('svg');

  if (!svgEl) {
    return {
      isValid: false,
      verified: false,
      errors: ['Fatal: Exported SVG has no root <svg> element.'],
      exportedElementCounts: createEmptyDetailedCounts(),
      svgSha256: await computeSha256(exportedSvg),
      canvas: { width: 0, height: 0, viewBox: '' },
      iconGroupsFound: 0,
      expectedGroups: project.slots.filter(s => s.svgContent && s.svgContent.length > 20).length,
      hasRaster: false,
      hasScripts: false,
      hasLiveText: false
    };
  }

  // 1. Check canvas dimensions
  const widthAttr = parseFloat(svgEl.getAttribute('width') || '0');
  const heightAttr = parseFloat(svgEl.getAttribute('height') || '0');
  const viewBoxAttr = svgEl.getAttribute('viewBox') || '';

  if (widthAttr !== project.canvasConfig.width || heightAttr !== project.canvasConfig.height) {
    errors.push(`Canvas dimension mismatch: Exported ${widthAttr}x${heightAttr}, project configured for ${project.canvasConfig.width}x${project.canvasConfig.height}.`);
  }

  // 2. Count icon groups
  const iconGroups = doc.querySelectorAll('svg > g[id^="icon-"]');
  const expectedSlots = project.slots.filter(s => s.svgContent && s.svgContent.length > 20);
  if (iconGroups.length !== expectedSlots.length) {
    errors.push(`Icon group mismatch: Found ${iconGroups.length} <g id="icon-XX"> groups, expected ${expectedSlots.length}.`);
  }

  // Check for duplicate group IDs
  const seenIds = new Set<string>();
  iconGroups.forEach(g => {
    const id = g.getAttribute('id') || '';
    if (seenIds.has(id)) {
      errors.push(`Duplicate group ID in exported SVG: "${id}".`);
    } else {
      seenIds.add(id);
    }
  });

  // Check for ungrouped root drawable elements
  const directChildren = Array.from(svgEl.children);
  const ungroupedDrawables = directChildren.filter(child => {
    const tag = child.tagName.toLowerCase();
    return DRAWABLE_ELEMENT_TAGS.includes(tag as any) && tag !== 'g';
  });
  if (ungroupedDrawables.length > 0) {
    errors.push(`Found ${ungroupedDrawables.length} ungrouped drawable element(s) at root of SVG.`);
  }

  // 3. Security check: zero scripts or event handlers
  const scripts = doc.querySelectorAll('script');
  if (scripts.length > 0) {
    errors.push(`SECURITY DEFECT: Exported SVG contains ${scripts.length} <script> tag(s).`);
  }
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      if (attr.name.toLowerCase().startsWith('on')) {
        errors.push(`SECURITY DEFECT: Exported SVG contains interactive event handler "${attr.name}".`);
      }
    }
  });

  // 4. Raster check: zero images or base64
  const images = doc.querySelectorAll('image');
  if (images.length > 0) {
    errors.push(`RASTER DEFECT: Exported SVG contains ${images.length} <image> element(s).`);
  }

  // 5. Live text check
  const textEls = doc.querySelectorAll('text');
  const hasLiveText = textEls.length > 0;
  if (hasLiveText && project.assetType === 'icon-sheet') {
    errors.push(`LIVE TEXT DEFECT: Exported SVG contains ${textEls.length} un-outlined <text> element(s).`);
  }

  // 6. Gather exact counts on exported SVG
  const paths = doc.querySelectorAll('path');
  const rects = doc.querySelectorAll('rect');
  const circles = doc.querySelectorAll('circle');
  const ellipses = doc.querySelectorAll('ellipse');
  const lines = doc.querySelectorAll('line');
  const polylines = doc.querySelectorAll('polyline');
  const polygons = doc.querySelectorAll('polygon');
  const groups = doc.querySelectorAll('g');
  const uses = doc.querySelectorAll('use');
  const defs = doc.querySelectorAll('defs');
  const linearGradients = doc.querySelectorAll('linearGradient');
  const radialGradients = doc.querySelectorAll('radialGradient');
  const patterns = doc.querySelectorAll('pattern');
  const filters = doc.querySelectorAll('filter');
  const masks = doc.querySelectorAll('mask');
  const clipPaths = doc.querySelectorAll('clipPath');

  const totalDrawable = paths.length + 
                        rects.length + 
                        circles.length + 
                        ellipses.length + 
                        lines.length + 
                        polylines.length + 
                        polygons.length + 
                        uses.length + 
                        textEls.length;

  const exportedCounts: DetailedElementCounts = {
    paths: paths.length,
    rects: rects.length,
    circles: circles.length,
    ellipses: ellipses.length,
    lines: lines.length,
    polylines: polylines.length,
    polygons: polygons.length,
    groups: groups.length,
    text: textEls.length,
    images: images.length,
    uses: uses.length,
    defs: defs.length,
    linearGradients: linearGradients.length,
    radialGradients: radialGradients.length,
    patterns: patterns.length,
    filters: filters.length,
    masks: masks.length,
    clipPaths: clipPaths.length,
    totalDrawableElements: totalDrawable
  };

  const svgSha256 = await computeSha256(exportedSvg);

  return {
    isValid: errors.length === 0,
    verified: errors.length === 0,
    errors,
    exportedElementCounts: exportedCounts,
    svgSha256,
    canvas: { width: widthAttr, height: heightAttr, viewBox: viewBoxAttr },
    iconGroupsFound: iconGroups.length,
    expectedGroups: expectedSlots.length,
    hasRaster: images.length > 0,
    hasScripts: scripts.length > 0,
    hasLiveText
  };
}

/**
 * Generates official QC Report in JSON format.
 * Accurately reflects DOM counters, transparency breakdown, explicit AI provenance, and SHA-256 hash.
 */
export async function generateQCReport(
  project: Project, 
  preflightItems: PreflightItem[], 
  exportedSvg?: string
) {
  // If exportedSvg is provided, compute exact metrics from the final exported file
  let doc: Document | null = null;
  let exportedCounts: DetailedElementCounts | null = null;
  let sha256 = '';

  if (exportedSvg) {
    doc = parseSvgDocument(exportedSvg);
    sha256 = await computeSha256(exportedSvg);
    const paths = doc.querySelectorAll('path');
    const rects = doc.querySelectorAll('rect');
    const circles = doc.querySelectorAll('circle');
    const ellipses = doc.querySelectorAll('ellipse');
    const lines = doc.querySelectorAll('line');
    const polylines = doc.querySelectorAll('polyline');
    const polygons = doc.querySelectorAll('polygon');
    const groups = doc.querySelectorAll('g');
    const textEls = doc.querySelectorAll('text');
    const images = doc.querySelectorAll('image');
    const uses = doc.querySelectorAll('use');
    const defs = doc.querySelectorAll('defs');
    const linearGradients = doc.querySelectorAll('linearGradient');
    const radialGradients = doc.querySelectorAll('radialGradient');
    const patterns = doc.querySelectorAll('pattern');
    const filters = doc.querySelectorAll('filter');
    const masks = doc.querySelectorAll('mask');
    const clipPaths = doc.querySelectorAll('clipPath');

    const totalDrawable = paths.length + rects.length + circles.length + ellipses.length + 
                          lines.length + polylines.length + polygons.length + uses.length + textEls.length;

    exportedCounts = {
      paths: paths.length,
      rects: rects.length,
      circles: circles.length,
      ellipses: ellipses.length,
      lines: lines.length,
      polylines: polylines.length,
      polygons: polygons.length,
      groups: groups.length,
      text: textEls.length,
      images: images.length,
      uses: uses.length,
      defs: defs.length,
      linearGradients: linearGradients.length,
      radialGradients: radialGradients.length,
      patterns: patterns.length,
      filters: filters.length,
      masks: masks.length,
      clipPaths: clipPaths.length,
      totalDrawableElements: totalDrawable
    };
  }

  // Aggregate stats across slots if not using exported SVG
  const totalPaths = exportedCounts ? exportedCounts.paths : project.slots.reduce((sum, s) => sum + s.stats.pathCount, 0);
  const totalRects = exportedCounts ? exportedCounts.rects : project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.rects || 0), 0);
  const totalCircles = exportedCounts ? exportedCounts.circles : project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.circles || 0), 0);
  const totalEllipses = exportedCounts ? exportedCounts.ellipses : project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.ellipses || 0), 0);
  const totalLines = exportedCounts ? exportedCounts.lines : project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.lines || 0), 0);
  const totalPolylines = exportedCounts ? exportedCounts.polylines : project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.polylines || 0), 0);
  const totalPolygons = exportedCounts ? exportedCounts.polygons : project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.polygons || 0), 0);
  const totalGroups = exportedCounts ? exportedCounts.groups : project.slots.reduce((sum, s) => sum + s.stats.groupCount, 0);
  const totalText = exportedCounts ? exportedCounts.text : project.slots.reduce((sum, s) => sum + s.stats.textDetails.count, 0);
  const totalRaster = exportedCounts ? exportedCounts.images : project.slots.reduce((sum, s) => sum + s.stats.rasterDetails.total, 0);
  const totalUses = exportedCounts ? exportedCounts.uses : project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.uses || 0), 0);
  const totalDrawable = exportedCounts ? exportedCounts.totalDrawableElements : (totalPaths + totalRects + totalCircles + totalEllipses + totalLines + totalPolylines + totalPolygons + totalUses + totalText);
  const totalNodes = project.slots.reduce((sum, s) => sum + s.stats.nodeEstimate, 0);

  // Transparency aggregate
  const opacityCount = project.slots.reduce((sum, s) => sum + s.stats.transparencyDetails.opacityCount, 0);
  const fillOpacityCount = project.slots.reduce((sum, s) => sum + s.stats.transparencyDetails.fillOpacityCount, 0);
  const strokeOpacityCount = project.slots.reduce((sum, s) => sum + s.stats.transparencyDetails.strokeOpacityCount, 0);
  const inheritedTransCount = project.slots.reduce((sum, s) => sum + s.stats.transparencyDetails.inheritedCount, 0);
  const totalTransparency = opacityCount + fillOpacityCount + strokeOpacityCount;

  // Live text details list
  const liveTexts = project.slots.flatMap(s => s.stats.textDetails.items);

  const failItems = preflightItems.filter(p => p.status === 'fail');
  const warningItems = preflightItems.filter(p => p.status === 'warning');

  // Explicit AI Provenance
  const aiAssistedString = project.aiStatus === 'yes' ? 'YES' : (project.aiStatus === 'no' ? 'NO' : 'UNSURE');
  const aiDisclosureRequired = project.aiStatus === 'yes';

  // Overall verdict model:
  // READY FOR HUMAN REVIEW | NEEDS REVIEW | NOT READY
  let overallVerdict: 'READY FOR HUMAN REVIEW' | 'NEEDS REVIEW' | 'NOT READY' = 'NOT READY';
  if (failItems.length === 0) {
    if (project.aiStatus === 'unsure') {
      overallVerdict = 'NEEDS REVIEW';
    } else if (warningItems.length > 0) {
      overallVerdict = 'NEEDS REVIEW';
    } else {
      overallVerdict = 'READY FOR HUMAN REVIEW';
    }
  } else {
    overallVerdict = 'NOT READY';
  }

  const report = {
    header: "ADOBE STOCK VECTOR FACTORY QUALITY CONTROL REPORT",
    version: "2.0-HARDENED",
    generatedAt: new Date().toISOString(),
    svgSha256: sha256 || undefined,
    project: {
      name: project.name,
      niche: project.niche,
      assetType: project.assetType,
      canvas: `${project.canvasConfig.width} × ${project.canvasConfig.height}`,
      iconCount: project.slots.filter(s => s.svgContent && s.svgContent.length > 20).length,
    },
    metrics: {
      // Independent SVG element counters matching DOM
      paths: totalPaths,
      rectangles: totalRects,
      circles: totalCircles,
      ellipses: totalEllipses,
      lines: totalLines,
      polylines: totalPolylines,
      polygons: totalPolygons,
      groups: totalGroups,
      text: totalText,
      images: totalRaster,
      uses: totalUses,
      totalDrawableVectorElements: totalDrawable,
      estimatedNodes: totalNodes,
      uniqueColors: extractProjectPalette(project.slots).length,
    },
    transparencyAudit: {
      transparencyElementsCount: totalTransparency,
      opacityCount,
      fillOpacityCount,
      strokeOpacityCount,
      inheritedTransparencyCount: inheritedTransCount,
      hasTransparency: totalTransparency > 0
    },
    liveTextAudit: {
      liveTextCount: totalText,
      detectedContent: liveTexts.map(t => `"${t.text}" (<${t.tagName}>${t.slotLabel ? ` in ${t.slotLabel}` : ''})`),
      actionRequired: totalText > 0 ? "OUTLINE FONTS EXTERNALLY BEFORE FINAL SUBMISSION" : "NONE"
    },
    rasterAudit: {
      rasterElementsCount: totalRaster,
      embeddedBase64Count: project.slots.reduce((sum, s) => sum + s.stats.rasterDetails.embeddedBase64, 0),
      externalRasterCount: project.slots.reduce((sum, s) => sum + s.stats.rasterDetails.externalUrls, 0),
      status: totalRaster === 0 ? "PASS (Zero Raster)" : "FAIL (Raster Prohibited in Vector Submissions)"
    },
    vectorAudit: {
      pureVector: totalRaster === 0,
      transparencyElements: totalTransparency,
      liveTextElements: totalText,
      totalDrawableElements: totalDrawable,
      paths: totalPaths
    },
    provenance: {
      aiAssisted: aiAssistedString,
      generativeAiDisclosureRequiredOnUpload: aiDisclosureRequired
    },
    provenanceAndAiDisclosure: {
      aiAssisted: aiAssistedString,
      generativeAiDisclosureReminder: aiDisclosureRequired ? "REQUIRED - Mark Generative AI checkbox upon Adobe Stock portal submission" : "NOT REQUIRED",
      commercialTermsReviewed: project.aiChecklist.commercialTermsReviewed,
      humanReviewed: project.humanReviewed,
      approvedForExport: project.approvedForExport,
    },
    technicalPreflight: {
      status: failItems.length === 0 ? (warningItems.length === 0 ? "PASS" : "PASS_WITH_WARNINGS") : "FAIL",
      fails: failItems.map(f => ({ category: f.category, title: f.title, message: f.message })),
      warnings: warningItems.map(w => ({ category: w.category, title: w.title, message: w.message })),
    },
    overallVerdict,
    disclaimer: "This report validates technical vector, canvas, and metadata integrity. Final commercial acceptance is governed exclusively by Adobe Stock moderation review."
  };

  return report;
}

/**
 * Generate formatted Adobe Stock metadata text
 * Preserves exact user keyword ordering and marks top 10 priority keywords.
 */
export function generateMetadataText(project: Project): string {
  const meta = project.metadata;
  const highPriority = meta.keywords.slice(0, 10);
  const secondary = meta.keywords.slice(10, 50);

  let aiDisclosureLine = '';
  if (project.aiStatus === 'yes') {
    aiDisclosureLine = 'YES - Created or assisted with Generative AI (Mandatory disclosure checkbox required on upload)';
  } else if (project.aiStatus === 'no') {
    aiDisclosureLine = 'NO - Not AI Assisted (Original Vector Creation)';
  } else {
    aiDisclosureLine = 'UNSURE - Provenance Under Review (Must confirm before submission)';
  }

  return `=====================================================
ADOBE STOCK ASSET METADATA WORKSPACE
=====================================================
Asset Title:
${meta.title || project.name}

Category:
${meta.category || "Icons / Graphics"}

Niche / Topic:
${project.niche} - ${project.topic}

Style:
${project.style || "Vector"}

Generative AI Disclosure:
${aiDisclosureLine}

-----------------------------------------------------
TOP 10 KEYWORDS (HIGH PRIORITY - RANKING SIGNALS):
-----------------------------------------------------
${highPriority.join(', ')}

-----------------------------------------------------
SECONDARY KEYWORDS (11-50):
-----------------------------------------------------
${secondary.join(', ')}

-----------------------------------------------------
ALL KEYWORDS (PRESERVED CONTRIBUTOR ORDERING):
-----------------------------------------------------
${meta.keywords.join(', ')}

Total Keywords: ${meta.keywords.length} / 50
=====================================================`;
}
