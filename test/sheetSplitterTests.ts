import { 
  computeCellBounds, 
  autoDetectGrid, 
  detectCellWarnings, 
  smartTrimCell, 
  sanitizeIconFilename, 
  generateSplitManifest,
  generateSplitZip,
  validateRasterImageFile,
  RESIDENTIAL_SOLAR_ICON_NAMES
} from '../src/lib/sheetSplitter';
import { SplitterGridConfig, SplitCellResult } from '../src/types';

export async function runSheetSplitterTests(assert: (condition: boolean, name: string, detail?: string) => void) {
  console.log('\n--- TEST GROUP 8: AI Sheet Splitter Unit Tests ---');

  // TEST 1: 2048×2048 PNG 4×4 = exactly 16 outputs
  {
    const config: SplitterGridConfig = {
      rows: 4,
      cols: 4,
      marginX: 32,
      marginY: 32,
      gapX: 16,
      gapY: 16,
      offsetX: 0,
      offsetY: 0
    };
    const cells = computeCellBounds(2048, 2048, config);
    assert(cells.length === 16, '2048×2048 4×4 produces exactly 16 cells');
    assert(cells[0].bounds.x === 32, 'Cell 0 starts at marginX (32)');
    assert(cells[0].bounds.y === 32, 'Cell 0 starts at marginY (32)');
    assert(cells[0].bounds.width > 400, `Cell width is reasonable (${cells[0].bounds.width}px)`);
    assert(cells[15].row === 3 && cells[15].col === 3, 'Cell 15 is at row 3, col 3');
  }

  // TEST 2: 4096×4096 PNG 4×4
  {
    const config: SplitterGridConfig = {
      rows: 4,
      cols: 4,
      marginX: 64,
      marginY: 64,
      gapX: 32,
      gapY: 32,
      offsetX: 0,
      offsetY: 0
    };
    const cells = computeCellBounds(4096, 4096, config);
    assert(cells.length === 16, '4096×4096 4×4 produces exactly 16 cells');
    assert(cells[0].bounds.width > 900, `High-res cell width: ${cells[0].bounds.width}px`);
  }

  // TEST 3: Non-square image (3200 × 1800)
  {
    const config: SplitterGridConfig = {
      rows: 3,
      cols: 4,
      marginX: 40,
      marginY: 20,
      gapX: 20,
      gapY: 15,
      offsetX: 0,
      offsetY: 0
    };
    const cells = computeCellBounds(3200, 1800, config);
    assert(cells.length === 12, 'Non-square 3×4 image produces 12 cells');
    assert(cells[0].bounds.width !== cells[0].bounds.height, 'Cell aspect ratio reflects rectangular proportions');
  }

  // TEST 4: 3×3 Grid
  {
    const config: SplitterGridConfig = {
      rows: 3,
      cols: 3,
      marginX: 24,
      marginY: 24,
      gapX: 16,
      gapY: 16,
      offsetX: 0,
      offsetY: 0
    };
    const cells = computeCellBounds(1500, 1500, config);
    assert(cells.length === 9, '3×3 grid produces exactly 9 cells');
  }

  // TEST 5: 5×5 Grid
  {
    const config: SplitterGridConfig = {
      rows: 5,
      cols: 5,
      marginX: 20,
      marginY: 20,
      gapX: 10,
      gapY: 10,
      offsetX: 0,
      offsetY: 0
    };
    const cells = computeCellBounds(2500, 2500, config);
    assert(cells.length === 25, '5×5 grid produces exactly 25 cells');
  }

  // TEST 6: Custom Grid (2×6)
  {
    const config: SplitterGridConfig = {
      rows: 2,
      cols: 6,
      marginX: 10,
      marginY: 10,
      gapX: 5,
      gapY: 5,
      offsetX: 0,
      offsetY: 0
    };
    const cells = computeCellBounds(1800, 600, config);
    assert(cells.length === 12, 'Custom 2×6 grid produces 12 cells');
  }

  // TEST 7: Uneven margins, gaps & global offsets
  {
    const config: SplitterGridConfig = {
      rows: 2,
      cols: 2,
      marginX: 80,
      marginY: 20,
      gapX: 50,
      gapY: 10,
      offsetX: 15,
      offsetY: -5
    };
    const cells = computeCellBounds(1000, 1000, config);
    assert(cells[0].bounds.x === 80 + 15, `Cell 0 offset X correct (${cells[0].bounds.x} === 95)`);
    assert(cells[0].bounds.y === 20 - 5, `Cell 0 offset Y correct (${cells[0].bounds.y} === 15)`);
  }

  // TEST 8: Warning Heuristics - Empty Cell
  {
    // Create mock empty ImageData (all white)
    const w = 100, h = 100;
    const data = new Uint8ClampedArray(w * h * 4);
    data.fill(255); // Solid white background
    const mockEmptyImgData = { width: w, height: h, data } as ImageData;

    const warnings = detectCellWarnings(mockEmptyImgData);
    assert(warnings.some(w => w.includes('empty')), 'Detects nearly empty cell warning');
  }

  // TEST 9: Warning Heuristics - Artwork touching boundary
  {
    const w = 100, h = 100;
    const data = new Uint8ClampedArray(w * h * 4);
    data.fill(255); // White bg

    // Add black pixels right at the edge (x=0, y=0 to 50)
    for (let y = 0; y < 50; y++) {
      const p = y * w * 4;
      data[p] = 0; data[p + 1] = 0; data[p + 2] = 0; data[p + 3] = 255;
    }
    const mockEdgeImgData = { width: w, height: h, data } as ImageData;

    const warnings = detectCellWarnings(mockEdgeImgData);
    assert(warnings.some(w => w.includes('close to crop boundary')), 'Detects artwork close to crop boundary');
  }

  // TEST 10: Filename Sanitizer
  {
    const f1 = sanitizeIconFilename(0, 'Solar Home', 'png');
    assert(f1 === '01-solar-home.png', `Sanitized "01-solar-home.png" (got ${f1})`);

    const f2 = sanitizeIconFilename(6, 'EV Home Charging!! #2', 'png');
    assert(f2 === '07-ev-home-charging-2.png', `Sanitized "07-ev-home-charging-2.png" (got ${f2})`);

    const f3 = sanitizeIconFilename(15, 'Integrated Home Energy System', 'png');
    assert(f3 === '16-integrated-home-energy-system.png', `Sanitized 16th icon name (got ${f3})`);
  }

  // TEST 11: File Validation & Corrupt/Wrong Extension
  {
    // Mock valid PNG file with magic header [0x89, 0x50, 0x4E, 0x47]
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 0, 0, 0, 0]);
    const mockPngBlob = new Blob([pngBytes], { type: 'image/png' });
    const mockPngFile = new File([mockPngBlob], 'solar-icons.png', { type: 'image/png' });

    const valResult = await validateRasterImageFile(mockPngFile);
    assert(valResult.valid === true && valResult.format === 'PNG', 'Validates authentic PNG magic header');

    // Mock corrupt file / wrong format
    const badBytes = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    const badBlob = new Blob([badBytes], { type: 'text/plain' });
    const badFile = new File([badBlob], 'virus.exe', { type: 'application/octet-stream' });
    const badResult = await validateRasterImageFile(badFile);
    assert(badResult.valid === false, 'Gracefully rejects unsupported / corrupt file format');
  }

  // TEST 12: Manifest Generation
  {
    const config: SplitterGridConfig = {
      rows: 4,
      cols: 4,
      marginX: 32,
      marginY: 32,
      gapX: 16,
      gapY: 16,
      offsetX: 0,
      offsetY: 0
    };
    const mockCells: SplitCellResult[] = RESIDENTIAL_SOLAR_ICON_NAMES.map((name, i) => ({
      index: i,
      row: Math.floor(i / 4),
      col: i % 4,
      label: name,
      filename: sanitizeIconFilename(i, name, 'png'),
      bounds: { x: 32, y: 32, width: 450, height: 450 },
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      width: 450,
      height: 450,
      warnings: []
    }));

    const manifest = generateSplitManifest(
      'Gemini Solar Icons.png',
      2048,
      2048,
      config,
      8,
      mockCells
    );

    assert(manifest.grid === '4x4', 'Manifest contains grid "4x4"');
    assert(manifest.icons === 16, 'Manifest contains icons: 16');
    assert(manifest.sourceWidth === 2048, 'Manifest records sourceWidth 2048');
    assert(manifest.iconFilenames.length === 16, 'Manifest lists all 16 output filenames');
    assert(manifest.iconFilenames[0] === '01-solar-home.png', 'First filename in manifest is 01-solar-home.png');
  }

  // TEST 13: ZIP Generation with JSZip
  {
    const config: SplitterGridConfig = {
      rows: 4,
      cols: 4,
      marginX: 32,
      marginY: 32,
      gapX: 16,
      gapY: 16,
      offsetX: 0,
      offsetY: 0
    };
    const mockCells: SplitCellResult[] = RESIDENTIAL_SOLAR_ICON_NAMES.map((name, i) => ({
      index: i,
      row: Math.floor(i / 4),
      col: i % 4,
      label: name,
      filename: sanitizeIconFilename(i, name, 'png'),
      bounds: { x: 32, y: 32, width: 450, height: 450 },
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      width: 450,
      height: 450,
      warnings: []
    }));

    const manifest = generateSplitManifest(
      'residential-solar-energy.png',
      2048,
      2048,
      config,
      8,
      mockCells
    );

    const zipBlob = await generateSplitZip(mockCells, manifest, 'residential-solar-energy-split');
    assert(zipBlob.size > 0, `Generated valid ZIP blob (${zipBlob.size} bytes)`);
    assert(zipBlob.type === 'application/zip' || zipBlob.size > 100, 'ZIP blob packaged successfully with JSZip');
  }
}
