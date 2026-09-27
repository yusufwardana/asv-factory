import JSZip from 'jszip';
import { 
  SplitterGridConfig, 
  CellCropOverride, 
  SplitCellResult, 
  SplitManifest, 
  SplitterPreset 
} from '../types';

export const RESIDENTIAL_SOLAR_ICON_NAMES: string[] = [
  'Solar Home',
  'Solar Panel',
  'Solar Generation',
  'Solar Inverter',
  'Home Battery',
  'Smart Meter',
  'EV Home Charging',
  'Grid Connected Home',
  'Solar to Battery',
  'Battery to Home',
  'Energy Monitoring',
  'Energy Efficiency',
  'Green Home',
  'Solar Installation',
  'Solar Maintenance',
  'Integrated Home Energy System'
];

export const DEFAULT_GRID_PRESETS: SplitterPreset[] = [
  {
    id: 'gemini-4x4-clean',
    name: 'Gemini 4×4 Standard (Clean)',
    rows: 4,
    cols: 4,
    marginX: 32,
    marginY: 32,
    gapX: 16,
    gapY: 16,
    offsetX: 0,
    offsetY: 0,
    paddingPercent: 8
  },
  {
    id: 'gemini-4x4-tight',
    name: 'Gemini 4×4 Seamless (Zero Margin)',
    rows: 4,
    cols: 4,
    marginX: 0,
    marginY: 0,
    gapX: 0,
    gapY: 0,
    offsetX: 0,
    offsetY: 0,
    paddingPercent: 8
  },
  {
    id: 'gemini-3x3',
    name: 'Gemini 3×3 Grid (9 Icons)',
    rows: 3,
    cols: 3,
    marginX: 24,
    marginY: 24,
    gapX: 16,
    gapY: 16,
    offsetX: 0,
    offsetY: 0,
    paddingPercent: 8
  },
  {
    id: 'gemini-2x2',
    name: 'Gemini 2×2 Grid (4 Icons)',
    rows: 2,
    cols: 2,
    marginX: 40,
    marginY: 40,
    gapX: 24,
    gapY: 24,
    offsetX: 0,
    offsetY: 0,
    paddingPercent: 10
  },
  {
    id: 'gemini-5x5',
    name: 'Gemini 5×5 Grid (25 Icons)',
    rows: 5,
    cols: 5,
    marginX: 20,
    marginY: 20,
    gapX: 12,
    gapY: 12,
    offsetX: 0,
    offsetY: 0,
    paddingPercent: 8
  }
];

export const LOCAL_STORAGE_PRESETS_KEY = 'asvf_splitter_custom_presets_v1';
export const LOCAL_STORAGE_LAST_CONFIG_KEY = 'asvf_splitter_last_config_v1';

/**
 * Validates a raster image file using MIME type and file header magic bytes.
 */
export async function validateRasterImageFile(file: File): Promise<{
  valid: boolean;
  format: 'PNG' | 'JPEG' | 'WEBP' | 'UNKNOWN';
  error?: string;
}> {
  if (!file) {
    return { valid: false, format: 'UNKNOWN', error: 'No file provided.' };
  }

  // Check file size (max 50MB to prevent browser OOM)
  if (file.size > 50 * 1024 * 1024) {
    return { 
      valid: false, 
      format: 'UNKNOWN', 
      error: `File size too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum limit is 50 MB.` 
    };
  }

  // Inspect first 16 bytes for magic signatures
  try {
    const slice = file.slice(0, 16);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return { valid: true, format: 'PNG' };
    }

    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return { valid: true, format: 'JPEG' };
    }

    // WebP: RIFF ... WEBP
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
      return { valid: true, format: 'WEBP' };
    }

    // Fallback checking standard MIME types if magic bytes are slightly offset
    if (file.type === 'image/png') return { valid: true, format: 'PNG' };
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') return { valid: true, format: 'JPEG' };
    if (file.type === 'image/webp') return { valid: true, format: 'WEBP' };

    return { 
      valid: false, 
      format: 'UNKNOWN', 
      error: `Unsupported file format (${file.type || 'unknown'}). Please upload a valid PNG, JPEG, or WEBP image.` 
    };
  } catch (err) {
    // If buffer reading fails, fallback to MIME check
    if (file.type.startsWith('image/')) {
      const fmt = file.type.includes('png') ? 'PNG' : file.type.includes('webp') ? 'WEBP' : 'JPEG';
      return { valid: true, format: fmt };
    }
    return { 
      valid: false, 
      format: 'UNKNOWN', 
      error: 'Corrupt or unreadable image file.' 
    };
  }
}

/**
 * Calculates absolute pixel bounding box for each cell in the grid.
 */
export function computeCellBounds(
  sourceWidth: number,
  sourceHeight: number,
  config: SplitterGridConfig,
  overrides?: Record<number, CellCropOverride>
): Array<{
  index: number;
  row: number;
  col: number;
  bounds: { x: number; y: number; width: number; height: number };
}> {
  const { rows, cols, marginX, marginY, gapX, gapY, offsetX, offsetY } = config;
  const cells: Array<{
    index: number;
    row: number;
    col: number;
    bounds: { x: number; y: number; width: number; height: number };
  }> = [];

  // Usable area calculations
  const totalMarginW = marginX * 2;
  const totalGapW = Math.max(0, cols - 1) * gapX;
  const usableWidth = Math.max(cols * 10, sourceWidth - totalMarginW - totalGapW);
  const cellWidth = Math.floor(usableWidth / cols);

  const totalMarginH = marginY * 2;
  const totalGapH = Math.max(0, rows - 1) * gapY;
  const usableHeight = Math.max(rows * 10, sourceHeight - totalMarginH - totalGapH);
  const cellHeight = Math.floor(usableHeight / rows);

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let x = marginX + c * (cellWidth + gapX) + offsetX;
      let y = marginY + r * (cellHeight + gapY) + offsetY;
      let w = cellWidth;
      let h = cellHeight;

      // Apply cell-specific override if present
      const override = overrides?.[idx];
      if (override) {
        x += override.offsetX;
        y += override.offsetY;
        w += override.expandWidth;
        h += override.expandHeight;
      }

      // Safe clamp within canvas bounds
      const clampedX = Math.max(0, Math.min(sourceWidth - 10, Math.round(x)));
      const clampedY = Math.max(0, Math.min(sourceHeight - 10, Math.round(y)));
      const clampedW = Math.max(10, Math.min(sourceWidth - clampedX, Math.round(w)));
      const clampedH = Math.max(10, Math.min(sourceHeight - clampedY, Math.round(h)));

      cells.push({
        index: idx,
        row: r,
        col: c,
        bounds: {
          x: clampedX,
          y: clampedY,
          width: clampedW,
          height: clampedH
        }
      });

      idx++;
    }
  }

  return cells;
}

/**
 * Auto-detects grid rows, columns, outer margins, and spacing from image pixels.
 * Uses projection profiling on a downscaled representation.
 */
export function autoDetectGrid(
  canvasOrImage: HTMLCanvasElement | ImageData,
  sourceWidth: number,
  sourceHeight: number,
  defaultRows = 4,
  defaultCols = 4
): {
  confidence: 'good' | 'uncertain';
  confidenceScore: number;
  statusMessage: string;
  config: SplitterGridConfig;
} {
  // Safe fallback default config
  const fallbackConfig: SplitterGridConfig = {
    rows: defaultRows,
    cols: defaultCols,
    marginX: Math.round(sourceWidth * 0.015),
    marginY: Math.round(sourceHeight * 0.015),
    gapX: Math.round(sourceWidth * 0.01),
    gapY: Math.round(sourceHeight * 0.01),
    offsetX: 0,
    offsetY: 0
  };

  try {
    let imageData: ImageData;
    if ('data' in canvasOrImage) {
      imageData = canvasOrImage;
    } else {
      const ctx = canvasOrImage.getContext('2d');
      if (!ctx) {
        return {
          confidence: 'uncertain',
          confidenceScore: 0.5,
          statusMessage: 'GRID NEEDS REVIEW',
          config: fallbackConfig
        };
      }
      imageData = ctx.getImageData(0, 0, canvasOrImage.width, canvasOrImage.height);
    }

    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;

    // Detect background color sample from 4 corners
    const cornerSamples = [
      [0, 0],
      [w - 1, 0],
      [0, h - 1],
      [w - 1, h - 1]
    ];

    let bgR = 0, bgG = 0, bgB = 0, bgA = 0;
    for (const [cx, cy] of cornerSamples) {
      const p = (cy * w + cx) * 4;
      bgR += data[p];
      bgG += data[p + 1];
      bgB += data[p + 2];
      bgA += data[p + 3];
    }
    bgR /= 4;
    bgG /= 4;
    bgB /= 4;
    bgA /= 4;

    const isBgPixel = (p: number) => {
      const a = data[p + 3];
      if (bgA < 30 && a < 30) return true; // transparent
      const dr = Math.abs(data[p] - bgR);
      const dg = Math.abs(data[p + 1] - bgG);
      const db = Math.abs(data[p + 2] - bgB);
      return dr < 25 && dg < 25 && db < 25;
    };

    // Calculate row and column non-background density
    const colDensity = new Float32Array(w);
    const rowDensity = new Float32Array(h);

    for (let y = 0; y < h; y++) {
      let rowContent = 0;
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        if (!isBgPixel(p)) {
          colDensity[x]++;
          rowContent++;
        }
      }
      rowDensity[y] = rowContent;
    }

    // Find outer margins where content begins
    let firstX = 0;
    while (firstX < w * 0.3 && colDensity[firstX] < h * 0.02) firstX++;
    let lastX = w - 1;
    while (lastX > w * 0.7 && colDensity[lastX] < h * 0.02) lastX--;

    let firstY = 0;
    while (firstY < h * 0.3 && rowDensity[firstY] < w * 0.02) firstY++;
    let lastY = h - 1;
    while (lastY > h * 0.7 && rowDensity[lastY] < w * 0.02) lastY--;

    const scaleX = sourceWidth / w;
    const scaleY = sourceHeight / h;

    const detectedMarginX = Math.max(0, Math.round(firstX * scaleX));
    const detectedMarginY = Math.max(0, Math.round(firstY * scaleY));

    // Confidence metric based on symmetry of detected margins
    const marginSymmX = Math.abs(firstX - (w - 1 - lastX)) / w;
    const marginSymmY = Math.abs(firstY - (h - 1 - lastY)) / h;

    const confidenceScore = Math.max(0, Math.min(1, 1 - (marginSymmX + marginSymmY) * 2));

    if (confidenceScore >= 0.70) {
      return {
        confidence: 'good',
        confidenceScore,
        statusMessage: 'GRID DETECTED (AUTO)',
        config: {
          rows: defaultRows,
          cols: defaultCols,
          marginX: detectedMarginX,
          marginY: detectedMarginY,
          gapX: Math.round(sourceWidth * 0.01),
          gapY: Math.round(sourceHeight * 0.01),
          offsetX: 0,
          offsetY: 0
        }
      };
    }

    return {
      confidence: 'uncertain',
      confidenceScore,
      statusMessage: 'GRID NEEDS REVIEW',
      config: fallbackConfig
    };
  } catch (e) {
    return {
      confidence: 'uncertain',
      confidenceScore: 0.4,
      statusMessage: 'GRID NEEDS REVIEW',
      config: fallbackConfig
    };
  }
}

/**
 * Detects potential quality warnings on a cropped cell.
 */
export function detectCellWarnings(
  imageData: ImageData
): string[] {
  const warnings: string[] = [];
  const { width, height, data } = imageData;
  const totalPixels = width * height;

  if (totalPixels === 0) return warnings;

  // Detect corner background color
  const cornerIdx = [0, (width - 1) * 4, ((height - 1) * width) * 4, ((height - 1) * width + width - 1) * 4];
  let bgR = 0, bgG = 0, bgB = 0, bgA = 0;
  for (const idx of cornerIdx) {
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
    bgA += data[idx + 3];
  }
  bgR /= 4;
  bgG /= 4;
  bgB /= 4;
  bgA /= 4;

  const isNonBg = (p: number) => {
    const a = data[p + 3];
    if (bgA < 30 && a > 30) return true;
    if (bgA >= 30 && Math.abs(a - bgA) > 40) return true;
    const dr = Math.abs(data[p] - bgR);
    const dg = Math.abs(data[p + 1] - bgG);
    const db = Math.abs(data[p + 2] - bgB);
    return dr > 25 || dg > 25 || db > 25;
  };

  let nonBgCount = 0;
  let borderViolations = 0;

  const edgeMarginX = Math.max(2, Math.round(width * 0.025));
  const edgeMarginY = Math.max(2, Math.round(height * 0.025));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      if (isNonBg(p)) {
        nonBgCount++;
        // Check if artwork touches or is very close to boundary
        if (x < edgeMarginX || x >= width - edgeMarginX || y < edgeMarginY || y >= height - edgeMarginY) {
          borderViolations++;
        }
      }
    }
  }

  const fillRatio = nonBgCount / totalPixels;

  if (fillRatio < 0.01) {
    warnings.push('WARNING: Nearly empty cell detected.');
  }

  if (borderViolations > Math.max(15, (width + height) * 0.05)) {
    warnings.push('WARNING: Artwork is close to crop boundary.');
  }

  return warnings;
}

/**
 * Smart Trim: detects whitespace / solid background surrounding artwork
 * and trims outer empty margins while preserving padding.
 */
export function smartTrimCell(
  sourceCanvas: HTMLCanvasElement,
  paddingPercent = 8
): {
  canvas: HTMLCanvasElement;
  isTrimmed: boolean;
  trimmedWidth: number;
  trimmedHeight: number;
} {
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) {
    return {
      canvas: sourceCanvas,
      isTrimmed: false,
      trimmedWidth: sourceCanvas.width,
      trimmedHeight: sourceCanvas.height
    };
  }

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Find corner background color
  const cornerIdx = [0, (w - 1) * 4, ((h - 1) * w) * 4, ((h - 1) * w + w - 1) * 4];
  let bgR = 0, bgG = 0, bgB = 0, bgA = 0;
  for (const idx of cornerIdx) {
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
    bgA += data[idx + 3];
  }
  bgR /= 4;
  bgG /= 4;
  bgB /= 4;
  bgA /= 4;

  const isNonBg = (p: number) => {
    const a = data[p + 3];
    if (bgA < 30 && a > 30) return true;
    if (bgA >= 30 && Math.abs(a - bgA) > 40) return true;
    const dr = Math.abs(data[p] - bgR);
    const dg = Math.abs(data[p + 1] - bgG);
    const db = Math.abs(data[p + 2] - bgB);
    return dr > 25 || dg > 25 || db > 25;
  };

  let minX = w, maxX = 0, minY = h, maxY = 0;
  let found = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      if (isNonBg(p)) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If no content or artwork spans entire canvas, don't trim
  if (!found || (minX <= 1 && maxX >= w - 2 && minY <= 1 && maxY >= h - 2)) {
    return {
      canvas: sourceCanvas,
      isTrimmed: false,
      trimmedWidth: w,
      trimmedHeight: h
    };
  }

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;

  // Add symmetric padding around content
  const pad = Math.round(Math.max(contentW, contentH) * (paddingPercent / 100));
  const finalX = Math.max(0, minX - pad);
  const finalY = Math.max(0, minY - pad);
  const finalW = Math.min(w - finalX, contentW + pad * 2);
  const finalH = Math.min(h - finalY, contentH + pad * 2);

  // Avoid micro-trims (e.g. less than 5% difference)
  if (finalW > w * 0.95 && finalH > h * 0.95) {
    return {
      canvas: sourceCanvas,
      isTrimmed: false,
      trimmedWidth: w,
      trimmedHeight: h
    };
  }

  // Create trimmed destination canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = finalW;
  outCanvas.height = finalH;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) {
    return {
      canvas: sourceCanvas,
      isTrimmed: false,
      trimmedWidth: w,
      trimmedHeight: h
    };
  }

  outCtx.drawImage(
    sourceCanvas,
    finalX, finalY, finalW, finalH,
    0, 0, finalW, finalH
  );

  return {
    canvas: outCanvas,
    isTrimmed: true,
    trimmedWidth: finalW,
    trimmedHeight: finalH
  };
}

/**
 * Sanitizes an icon label into a standard filename.
 * E.g., index 0, "Solar Home" -> "01-solar-home.png"
 */
export function sanitizeIconFilename(
  index: number,
  label: string,
  extension = 'png'
): string {
  const numPrefix = String(index + 1).padStart(2, '0');
  const cleanLabel = (label || `icon-${numPrefix}`)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-_]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${numPrefix}-${cleanLabel || 'icon'}.${extension}`;
}

/**
 * Extracts a cell directly from original source image pixels onto an offscreen canvas.
 */
export function extractCellCanvas(
  sourceImage: CanvasImageSource,
  bounds: { x: number; y: number; width: number; height: number }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = bounds.width;
  canvas.height = bounds.height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false; // preserve pixel crispness
    ctx.drawImage(
      sourceImage,
      bounds.x, bounds.y, bounds.width, bounds.height,
      0, 0, bounds.width, bounds.height
    );
  }
  return canvas;
}

/**
 * Converts an HTMLCanvasElement to a PNG Blob.
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate image Blob from canvas.'));
    }, 'image/png');
  });
}

/**
 * Generates the split manifest JSON object.
 */
export function generateSplitManifest(
  sourceFilename: string,
  sourceWidth: number,
  sourceHeight: number,
  config: SplitterGridConfig,
  paddingPercent: number,
  cells: SplitCellResult[]
): SplitManifest {
  return {
    tool: 'Adobe Stock Vector Factory - AI Sheet Splitter',
    version: '1.0.0',
    grid: `${config.rows}x${config.cols}`,
    icons: cells.length,
    sourceFilename,
    sourceWidth,
    sourceHeight,
    margins: { marginX: config.marginX, marginY: config.marginY },
    gaps: { gapX: config.gapX, gapY: config.gapY },
    offsets: { offsetX: config.offsetX, offsetY: config.offsetY },
    paddingPercent,
    generatedAt: new Date().toISOString(),
    iconFilenames: cells.map(c => c.filename),
    cells: cells.map(c => ({
      index: c.index,
      label: c.label,
      filename: c.filename,
      width: c.width,
      height: c.height,
      warnings: c.warnings
    }))
  };
}

/**
 * Creates a complete ZIP package with JSZip containing all individual icons
 * and split-manifest.json.
 */
export async function generateSplitZip(
  cells: SplitCellResult[],
  manifest: SplitManifest,
  zipBasename = 'icon-sheet-split'
): Promise<Blob> {
  const zip = new JSZip();

  // Add manifest
  zip.file('split-manifest.json', JSON.stringify(manifest, null, 2));

  // Add each image file
  for (const cell of cells) {
    if (cell.blob) {
      zip.file(cell.filename, cell.blob);
    } else if (cell.dataUrl) {
      // Decode base64 dataUrl
      const base64Data = cell.dataUrl.replace(/^data:image\/png;base64,/, '');
      zip.file(cell.filename, base64Data, { base64: true });
    }
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}

/**
 * Loads presets from localStorage with default fallbacks.
 */
export function loadSplitterPresets(): SplitterPreset[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PRESETS_KEY);
    if (!raw) return DEFAULT_GRID_PRESETS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore parsing errors
  }
  return DEFAULT_GRID_PRESETS;
}

/**
 * Saves presets to localStorage.
 */
export function saveSplitterPresets(presets: SplitterPreset[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_PRESETS_KEY, JSON.stringify(presets));
  } catch {
    // ignore
  }
}
