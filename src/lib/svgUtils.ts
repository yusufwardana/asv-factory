import { IconSlot, Project, PreflightItem, VectorStats } from '../types';

export interface SanitizationResult {
  cleanSvg: string;
  innerSvg: string;
  viewBox: { x: number; y: number; width: number; height: number };
  stats: VectorStats;
  logs: string[];
}

/**
 * Parses an SVG string, sanitizes dangerous content, extracts vector geometry and statistics
 */
export function sanitizeAndInspectSvg(rawSvg: string, slotLabel?: string): SanitizationResult {
  const logs: string[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawSvg, 'image/svg+xml');

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    logs.push(`XML Parsing error: ${parserError.textContent?.slice(0, 100) || 'Malformed XML'}`);
  }

  const svgEl = doc.querySelector('svg');
  if (!svgEl) {
    return {
      cleanSvg: '<svg viewBox="0 0 100 100"></svg>',
      innerSvg: '',
      viewBox: { x: 0, y: 0, width: 100, height: 100 },
      stats: createEmptyStats(),
      logs: ['Error: No root <svg> element found.']
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
  const metadataTags = doc.querySelectorAll('metadata, rdf\\:RDF, defs > style');
  metadataTags.forEach(m => {
    // Only remove metadata / rdf
    if (m.tagName.toLowerCase() === 'metadata' || m.tagName.toLowerCase().includes('rdf')) {
      m.remove();
      logs.push('Cleaned: Stripped editor metadata block.');
    }
  });

  // 3. Scan & clean attributes on all elements
  const allElements = doc.querySelectorAll('*');
  let removedHandlersCount = 0;
  let hasRaster = false;
  let hasExternalRefs = false;
  let hasText = false;
  let hasGradients = false;
  let hasMasks = false;
  let hasClipPaths = false;

  const colorSet = new Set<string>();
  const strokeWidthsList: number[] = [];

  allElements.forEach(el => {
    const tagName = el.tagName.toLowerCase();

    // Check raster
    if (tagName === 'image') {
      hasRaster = true;
      logs.push('Vector Violation: Found embedded <image> raster element (Disallowed for Stock Vectors).');
    }

    // Check text
    if (tagName === 'text' || tagName === 'tspan') {
      hasText = true;
    }

    // Check gradients / masks
    if (tagName.includes('gradient')) hasGradients = true;
    if (tagName === 'mask') hasMasks = true;
    if (tagName === 'clippath') hasClipPaths = true;

    // Attributes cleanup
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
      if ((name === 'href' || name === 'xlink:href' || name === 'src') && (val.startsWith('http://') || val.startsWith('https://'))) {
        hasExternalRefs = true;
        attrsToRemove.push(attr.name);
        logs.push(`Security: Removed external reference URL: ${val}`);
      }

      // Base64 embedded raster in fills/images
      if (val.includes('data:image/')) {
        hasRaster = true;
        logs.push('Vector Violation: Found base64 embedded raster image.');
      }

      // Editor namespaces (inkscape, sodipodi, etc.)
      if (name.startsWith('inkscape:') || name.startsWith('sodipodi:') || name.startsWith('adobe:') || name.startsWith('sketch:')) {
        attrsToRemove.push(attr.name);
      }

      // Extract colors
      if (name === 'fill' || name === 'stroke' || name === 'stop-color') {
        const hex = normalizeHexColor(val);
        if (hex && hex !== 'none' && hex !== 'transparent') {
          colorSet.add(hex);
        }
      }

      // Extract stroke width
      if (name === 'stroke-width') {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
          strokeWidthsList.push(Math.round(num * 10) / 10);
        }
      }

      // Check inline style
      if (name === 'style') {
        // Extract fill and stroke from inline style if present
        const styleFillMatch = val.match(/fill:\s*([^;]+)/i);
        if (styleFillMatch) {
          const hex = normalizeHexColor(styleFillMatch[1].trim());
          if (hex && hex !== 'none' && hex !== 'transparent') colorSet.add(hex);
        }
        const styleStrokeMatch = val.match(/stroke:\s*([^;]+)/i);
        if (styleStrokeMatch) {
          const hex = normalizeHexColor(styleStrokeMatch[1].trim());
          if (hex && hex !== 'none' && hex !== 'transparent') colorSet.add(hex);
        }
        const styleStrokeWidthMatch = val.match(/stroke-width:\s*([\d.]+)/i);
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
    if (parts.length === 4 && !parts.some(isNaN)) {
      viewBox = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    }
  } else {
    const w = parseFloat(svgEl.getAttribute('width') || '100');
    const h = parseFloat(svgEl.getAttribute('height') || '100');
    viewBox = { x: 0, y: 0, width: isNaN(w) ? 100 : w, height: isNaN(h) ? 100 : h };
    svgEl.setAttribute('viewBox', `0 0 ${viewBox.width} ${viewBox.height}`);
    logs.push(`Format: Synthesized missing viewBox attribute (0 0 ${viewBox.width} ${viewBox.height}).`);
  }

  // 5. Gather Vector Stats
  const paths = doc.querySelectorAll('path');
  const groups = doc.querySelectorAll('g');
  const polylines = doc.querySelectorAll('polygon, polyline');
  const rects = doc.querySelectorAll('rect');
  const circles = doc.querySelectorAll('circle, ellipse');
  const lines = doc.querySelectorAll('line');

  let nodeEstimate = 0;
  paths.forEach(p => {
    const d = p.getAttribute('d') || '';
    // Estimate nodes by counting path command letters
    const commands = d.match(/[MLHVCSQTAZmlhvcsqtaz]/g);
    nodeEstimate += commands ? commands.length : 4;
  });
  nodeEstimate += polylines.length * 5;
  nodeEstimate += (rects.length + circles.length) * 4;
  nodeEstimate += lines.length * 2;

  const stats: VectorStats = {
    elementCount: paths.length + polylines.length + rects.length + circles.length + lines.length,
    pathCount: paths.length + polylines.length,
    nodeEstimate: Math.max(nodeEstimate, 4),
    groupCount: groups.length,
    colors: Array.from(colorSet),
    strokeWidths: Array.from(new Set(strokeWidthsList)),
    hasRaster,
    hasText,
    hasScripts: scripts.length > 0 || removedHandlersCount > 0,
    hasGradients,
    hasMasks,
    hasClipPaths,
    hasExternalRefs,
    artifactsCount: detectTraceArtifactsCount(doc)
  };

  const cleanSvg = new XMLSerializer().serializeToString(svgEl);
  const innerSvg = svgEl.innerHTML;

  return {
    cleanSvg,
    innerSvg,
    viewBox,
    stats,
    logs
  };
}

function createEmptyStats(): VectorStats {
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
    artifactsCount: 0
  };
}

/**
 * Counts trace artifacts (e.g. microscopic paths or duplicate overlaps)
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
 * Normalize CSS colors to uppercase Hex string
 */
export function normalizeHexColor(colorStr: string): string | null {
  if (!colorStr) return null;
  const c = colorStr.trim().toLowerCase();
  if (c === 'none' || c === 'transparent' || c === 'inherit' || c === 'currentcolor') return null;

  if (c.startsWith('#')) {
    if (c.length === 4) {
      return ('#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]).toUpperCase();
    }
    return c.toUpperCase();
  }

  // Handle rgb / rgba
  const rgbMatch = c.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
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

/**
 * Extracts palette from all project slots and finds close colors needing merge
 */
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

  // Detect very close colors (< 22 distance in RGB)
  for (let i = 0; i < palette.length; i++) {
    for (let j = i + 1; j < palette.length; j++) {
      const dist = colorDistance(palette[i].hex, palette[j].hex);
      if (dist > 0 && dist < 22) {
        // Recommend merging into the more frequently used one
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
 * Optical normalization: balances visual weight across the 16 slots
 * Adjusts scale & centering so dense and light icons visually pair naturally
 */
export function autoNormalizeSlots(slots: IconSlot[], targetSlotSize: number = 200): IconSlot[] {
  if (slots.length === 0) return [];

  // Calculate average node density / area
  const validSlots = slots.filter(s => s.svgContent.length > 50);
  if (validSlots.length === 0) return slots;

  const weights = validSlots.map(s => {
    const nodeMass = Math.sqrt(s.stats.nodeEstimate);
    const elementMass = Math.sqrt(s.stats.elementCount);
    return Math.max(1, nodeMass + elementMass);
  });

  const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;

  return slots.map(slot => {
    if (!slot.svgContent || slot.svgContent.length < 50) return slot;

    const currentMass = Math.max(1, Math.sqrt(slot.stats.nodeEstimate) + Math.sqrt(slot.stats.elementCount));
    const ratio = currentMass / avgWeight;

    // Dampen scaling: very dense icons scale down slightly (0.92), light icons scale up slightly (1.08)
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
 * Generates the clean standalone stock SVG file conforming to Adobe Stock standards:
 * - Proper viewBox, width, height (e.g. 4000x4000)
 * - Clean organized <g id="icon-01-label"> groups
 * - Sanitized vector paths, no editor metadata, no raster
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

    const safeId = `icon-${String(idx + 1).padStart(2, '0')}-${slot.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

    const x = slotCenterX + (slot.offsetX || 0);
    const y = slotCenterY + (slot.offsetY || 0);

    // Extract inner content without wrapper <svg>
    const inner = extractInnerSvgContent(slot.svgContent);

    groupsXml += `\n  <!-- ${slot.label} -->\n  <g id="${safeId}" transform="translate(${x}, ${y}) scale(${baseScale}) translate(-50, -50)">\n    ${inner}\n  </g>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     viewBox="0 0 ${width} ${height}" 
     width="${width}" 
     height="${height}" 
     version="1.1">
  <title>${escapeXml(project.metadata.title || project.name)}</title>
  <desc>Adobe Stock Vector Asset - ${escapeXml(project.metadata.category)}</desc>
  ${groupsXml}
</svg>`;
}

/**
 * Helper to extract children of an SVG string
 */
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
 * Generates official QC Report in JSON and plain text format
 */
export function generateQCReport(project: Project, preflightItems: PreflightItem[]) {
  const totalPaths = project.slots.reduce((sum, s) => sum + s.stats.pathCount, 0);
  const totalNodes = project.slots.reduce((sum, s) => sum + s.stats.nodeEstimate, 0);
  const totalRaster = project.slots.reduce((sum, s) => sum + (s.stats.hasRaster ? 1 : 0), 0);
  const totalText = project.slots.reduce((sum, s) => sum + (s.stats.hasText ? 1 : 0), 0);
  const totalGradients = project.slots.reduce((sum, s) => sum + (s.stats.hasGradients ? 1 : 0), 0);

  const failItems = preflightItems.filter(p => p.status === 'fail');
  const warningItems = preflightItems.filter(p => p.status === 'warning');

  const report = {
    header: "ADOBE STOCK VECTOR FACTORY QUALITY CONTROL REPORT",
    version: "MVP 1.0",
    generatedAt: new Date().toISOString(),
    project: {
      name: project.name,
      niche: project.niche,
      assetType: project.assetType,
      canvas: `${project.canvasConfig.width} × ${project.canvasConfig.height}`,
      iconCount: project.slots.filter(s => s.svgContent).length,
    },
    metrics: {
      paths: totalPaths,
      estimatedNodes: totalNodes,
      groups: project.slots.length,
      rasterCount: totalRaster,
      textCount: totalText,
      gradientsCount: totalGradients,
      externalResources: 0,
      uniqueColors: extractProjectPalette(project.slots).length,
    },
    compliance: {
      aiAssisted: project.aiStatus.toUpperCase(),
      commercialTermsReviewed: project.aiChecklist.commercialTermsReviewed,
      humanReviewed: project.humanReviewed,
      approvedForExport: project.approvedForExport,
    },
    technicalPreflight: {
      status: failItems.length === 0 ? (warningItems.length === 0 ? "PASS" : "PASS_WITH_WARNINGS") : "FAIL",
      fails: failItems.map(f => ({ category: f.category, title: f.title, message: f.message })),
      warnings: warningItems.map(w => ({ category: w.category, title: w.title, message: w.message })),
    },
    overallVerdict: failItems.length === 0 && project.humanReviewed ? "READY FOR STOCK UPLOAD" : "ACTION REQUIRED BEFORE SUBMISSION",
    disclaimer: "This report validates technical vector and metadata compliance. Final editorial approval is governed exclusively by Adobe Stock moderation."
  };

  return report;
}

/**
 * Generate formatted Adobe Stock metadata text
 */
export function generateMetadataText(project: Project): string {
  const meta = project.metadata;
  const highPriority = meta.keywords.slice(0, 10);
  const secondary = meta.keywords.slice(10, 50);

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
${project.style}

Generative AI Disclosure:
${project.aiStatus === 'yes' ? 'YES - Created or assisted with Generative AI (Disclose on submission)' : 'NO - 100% Original Vector Artwork'}

-----------------------------------------------------
TOP 10 KEYWORDS (HIGH PRIORITY - RANKING SIGNALS):
-----------------------------------------------------
${highPriority.join(', ')}

-----------------------------------------------------
SECONDARY KEYWORDS (11-50):
-----------------------------------------------------
${secondary.join(', ')}

-----------------------------------------------------
ALL KEYWORDS (COMMA-SEPARATED FOR DIRECT PASTE):
-----------------------------------------------------
${meta.keywords.join(', ')}

Total Keywords: ${meta.keywords.length} / 50
=====================================================`;
}
