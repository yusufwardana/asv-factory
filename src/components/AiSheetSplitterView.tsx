import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Upload, 
  Crop, 
  Sparkles, 
  Download, 
  FileArchive, 
  RefreshCw, 
  Sliders, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Info, 
  ArrowRight, 
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  Minus,
  Check,
  Wand2, 
  RotateCcw, 
  Move, 
  Eye, 
  X, 
  Save, 
  Trash2, 
  FileImage,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { 
  SplitterGridConfig, 
  CellCropOverride, 
  SplitCellResult, 
  SplitManifest, 
  SplitterPreset 
} from '../types';
import { 
  validateRasterImageFile, 
  computeCellBounds, 
  autoDetectGrid, 
  detectCellWarnings, 
  smartTrimCell, 
  sanitizeIconFilename, 
  extractCellCanvas, 
  canvasToBlob, 
  generateSplitManifest, 
  generateSplitZip, 
  loadSplitterPresets, 
  saveSplitterPresets, 
  DEFAULT_GRID_PRESETS,
  RESIDENTIAL_SOLAR_ICON_NAMES,
  LOCAL_STORAGE_LAST_CONFIG_KEY
} from '../lib/sheetSplitter';

export const AiSheetSplitterView: React.FC = () => {
  // Mode state: 'fast' | 'advanced'
  const [mode, setMode] = useState<'fast' | 'advanced'>('advanced');

  // Source Image state
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceMeta, setSourceMeta] = useState<{
    name: string;
    width: number;
    height: number;
    format: string;
    sizeFormatted: string;
  } | null>(null);

  // Grid Configuration state
  const [gridPreset, setGridPreset] = useState<string>('gemini-4x4-clean');
  const [gridConfig, setGridConfig] = useState<SplitterGridConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_LAST_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      rows: 4,
      cols: 4,
      marginX: 32,
      marginY: 32,
      gapX: 16,
      gapY: 16,
      offsetX: 0,
      offsetY: 0
    };
  });

  // Presets
  const [presets, setPresets] = useState<SplitterPreset[]>(loadSplitterPresets);
  const [newPresetName, setNewPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  // Detection & Tuning
  const [detectionStatus, setDetectionStatus] = useState<{
    status: 'idle' | 'good' | 'uncertain';
    message: string;
  }>({ status: 'idle', message: '' });

  // Smart Trim & Padding
  const [enableSmartTrim, setEnableSmartTrim] = useState<boolean>(true);
  const [paddingPercent, setPaddingPercent] = useState<number>(8);

  // Cell Overrides & Custom Names
  const [cellOverrides, setCellOverrides] = useState<Record<number, CellCropOverride>>({});
  const [iconNames, setIconNames] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    RESIDENTIAL_SOLAR_ICON_NAMES.forEach((name, i) => {
      initial[i] = name;
    });
    return initial;
  });

  // Splitting Results
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitResults, setSplitResults] = useState<SplitCellResult[]>([]);
  const [isZipping, setIsZipping] = useState(false);

  // Individual Cell Modal / Inspector
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(null);
  const [modalNudgeStep, setModalNudgeStep] = useState<number>(8);
  const [modalSmartTrim, setModalSmartTrim] = useState<boolean>(true);
  const [modalLivePreview, setModalLivePreview] = useState<{
    dataUrl: string;
    width: number;
    height: number;
    bounds: { x: number; y: number; width: number; height: number };
    warnings: string[];
    isTrimmed: boolean;
  } | null>(null);

  // Visual Editor Zoom
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasPreviewRef = useRef<HTMLCanvasElement>(null);

  // Persist last config
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_LAST_CONFIG_KEY, JSON.stringify(gridConfig));
    } catch {}
  }, [gridConfig]);

  // Clean up object URLs on unmount or replace
  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      splitResults.forEach(r => {
        if (r.dataUrl.startsWith('blob:')) URL.revokeObjectURL(r.dataUrl);
      });
    };
  }, [sourceUrl, splitResults]);

  // Handle File selection
  const handleProcessFile = async (file: File) => {
    const validation = await validateRasterImageFile(file);
    if (!validation.valid) {
      alert(`Invalid image: ${validation.error || 'Please provide a valid PNG, JPEG, or WEBP file.'}`);
      return;
    }

    if (sourceUrl) URL.revokeObjectURL(sourceUrl);

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setSourceImage(img);
      setSourceUrl(url);
      setSourceFile(file);
      setSourceMeta({
        name: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: validation.format,
        sizeFormatted: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      });

      // Automatically compute scaled initial margins if standard 4x4
      const defaultMargX = Math.round(img.naturalWidth * 0.015);
      const defaultMargY = Math.round(img.naturalHeight * 0.015);
      const defaultGapX = Math.round(img.naturalWidth * 0.01);
      const defaultGapY = Math.round(img.naturalHeight * 0.01);

      setGridConfig(prev => ({
        ...prev,
        marginX: prev.marginX || defaultMargX,
        marginY: prev.marginY || defaultMargY,
        gapX: prev.gapX || defaultGapX,
        gapY: prev.gapY || defaultGapY
      }));

      // Reset split state
      setSplitResults([]);
      setSelectedCellIndex(null);
      setDetectionStatus({ status: 'idle', message: '' });
    };
    img.onerror = () => {
      alert('Could not decode uploaded raster image. The file may be damaged.');
    };
    img.src = url;
  };

  // Drag & drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Demo 4x4 Sheet Generator for instant testing
  const handleLoadDemoSheet = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 2048, 2048);

    // Draw 4x4 grid of sample solar icons
    const rows = 4, cols = 4;
    const mX = 64, mY = 64, gX = 32, gY = 32;
    const cellW = (2048 - mX * 2 - (cols - 1) * gX) / cols;
    const cellH = (2048 - mY * 2 - (rows - 1) * gY) / rows;

    const colors = ['#0284c7', '#059669', '#d97706', '#4f46e5'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const x = mX + c * (cellW + gX);
        const y = mY + r * (cellH + gY);
        const col = colors[idx % colors.length];

        // Draw icon background card outline
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 4;
        ctx.strokeRect(x + 16, y + 16, cellW - 32, cellH - 32);

        // Center artwork
        const cx = x + cellW / 2;
        const cy = y + cellH / 2;

        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy - 20, 64, 0, Math.PI * 2);
        ctx.fill();

        // Icon details
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(RESIDENTIAL_SOLAR_ICON_NAMES[idx] || `Icon ${idx + 1}`, cx, cy + 90);

        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`[CELL ${(idx + 1).toString().padStart(2, '0')}]`, cx, cy + 120);
      }
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'Gemini-Residential-Solar-4x4-Sheet.png', { type: 'image/png' });
        handleProcessFile(file);
      }
    }, 'image/png');
  };

  // Calculate live cell boundaries
  const calculatedCells = useMemo(() => {
    if (!sourceMeta) return [];
    return computeCellBounds(
      sourceMeta.width,
      sourceMeta.height,
      gridConfig,
      cellOverrides
    );
  }, [sourceMeta, gridConfig, cellOverrides]);

  // Run Auto Detection
  const handleAutoDetect = () => {
    if (!sourceImage || !sourceMeta) return;

    // Create downscaled canvas for fast projection profiling
    const downCanvas = document.createElement('canvas');
    downCanvas.width = 512;
    downCanvas.height = 512;
    const ctx = downCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(sourceImage, 0, 0, 512, 512);

    const result = autoDetectGrid(
      downCanvas,
      sourceMeta.width,
      sourceMeta.height,
      gridConfig.rows,
      gridConfig.cols
    );

    setGridConfig(result.config);
    if (result.confidence === 'uncertain') {
      setDetectionStatus({
        status: 'uncertain',
        message: 'GRID NEEDS REVIEW — Spacing detected with low confidence. Manual 4×4 adjustments are recommended.'
      });
    } else {
      setDetectionStatus({
        status: 'good',
        message: `GRID DETECTED — Margins (${result.config.marginX}px, ${result.config.marginY}px) and gaps aligned.`
      });
    }
  };

  // Apply Preset
  const handleSelectPreset = (presetId: string) => {
    setGridPreset(presetId);
    const p = presets.find(item => item.id === presetId);
    if (p) {
      setGridConfig({
        rows: p.rows,
        cols: p.cols,
        marginX: p.marginX,
        marginY: p.marginY,
        gapX: p.gapX,
        gapY: p.gapY,
        offsetX: p.offsetX,
        offsetY: p.offsetY
      });
      setPaddingPercent(p.paddingPercent);
      setCellOverrides({});
    }
  };

  // Save new Custom Preset
  const handleSaveCurrentPreset = () => {
    if (!newPresetName.trim()) return;
    const newP: SplitterPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      rows: gridConfig.rows,
      cols: gridConfig.cols,
      marginX: gridConfig.marginX,
      marginY: gridConfig.marginY,
      gapX: gridConfig.gapX,
      gapY: gridConfig.gapY,
      offsetX: gridConfig.offsetX,
      offsetY: gridConfig.offsetY,
      paddingPercent
    };
    const updated = [...presets, newP];
    setPresets(updated);
    saveSplitterPresets(updated);
    setGridPreset(newP.id);
    setNewPresetName('');
    setShowSavePreset(false);
  };

  // Perform Real Pixel Splitting
  const handleExecuteSplit = async () => {
    if (!sourceImage || !sourceMeta || calculatedCells.length === 0) return;

    setIsSplitting(true);
    // Yield to browser UI
    await new Promise(r => setTimeout(r, 60));

    try {
      const results: SplitCellResult[] = [];

      for (const cell of calculatedCells) {
        // Step A: Extract original pixels
        let cellCanvas = extractCellCanvas(sourceImage, cell.bounds);
        let isTrimmed = false;

        // Step B: Smart Trim if enabled
        if (enableSmartTrim) {
          const trimResult = smartTrimCell(cellCanvas, paddingPercent);
          cellCanvas = trimResult.canvas;
          isTrimmed = trimResult.isTrimmed;
        }

        // Step C: Detect warnings
        const ctx = cellCanvas.getContext('2d');
        const imgData = ctx?.getImageData(0, 0, cellCanvas.width, cellCanvas.height);
        const warnings = imgData ? detectCellWarnings(imgData) : [];

        // Step D: Name & filename
        const customName = iconNames[cell.index] || RESIDENTIAL_SOLAR_ICON_NAMES[cell.index] || `icon-${cell.index + 1}`;
        const filename = sanitizeIconFilename(cell.index, customName, 'png');

        // Step E: Lossless PNG Blob & Data URL
        const blob = await canvasToBlob(cellCanvas);
        const dataUrl = cellCanvas.toDataURL('image/png');

        results.push({
          index: cell.index,
          row: cell.row,
          col: cell.col,
          label: customName,
          filename,
          bounds: cell.bounds,
          dataUrl,
          blob,
          width: cellCanvas.width,
          height: cellCanvas.height,
          warnings,
          isTrimmed
        });
      }

      setSplitResults(results);
    } catch (err: any) {
      alert(`Split operation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSplitting(false);
    }
  };

  // Download Single Cell PNG
  const handleDownloadSingleCell = (cell: SplitCellResult) => {
    const a = document.createElement('a');
    a.href = cell.dataUrl;
    a.download = cell.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download ALL 16 Icons as ZIP
  const handleDownloadAllZip = async () => {
    if (splitResults.length === 0 || !sourceMeta) return;

    setIsZipping(true);
    try {
      const manifest = generateSplitManifest(
        sourceMeta.name,
        sourceMeta.width,
        sourceMeta.height,
        gridConfig,
        paddingPercent,
        splitResults
      );

      const zipBasename = sourceMeta.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '-') + '-split';
      const zipBlob = await generateSplitZip(splitResults, manifest, zipBasename);

      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `${zipBasename}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);
    } catch (err: any) {
      alert(`Failed to package ZIP: ${err.message || 'Unknown error'}`);
    } finally {
      setIsZipping(false);
    }
  };

  // Extract single cell crop with live preview and warnings
  const cropSingleCell = useCallback((
    cellIdx: number,
    overridesMap: Record<number, CellCropOverride>,
    applyTrim: boolean
  ) => {
    if (!sourceImage || !sourceMeta) return null;
    const computed = computeCellBounds(
      sourceMeta.width,
      sourceMeta.height,
      gridConfig,
      overridesMap
    );
    const targetCell = computed.find(c => c.index === cellIdx);
    if (!targetCell) return null;

    let cellCanvas = extractCellCanvas(sourceImage, targetCell.bounds);
    let isTrimmed = false;
    if (applyTrim) {
      const trimRes = smartTrimCell(cellCanvas, paddingPercent);
      cellCanvas = trimRes.canvas;
      isTrimmed = trimRes.isTrimmed;
    }

    const ctx = cellCanvas.getContext('2d');
    const imgData = ctx?.getImageData(0, 0, cellCanvas.width, cellCanvas.height);
    const warnings = imgData ? detectCellWarnings(imgData) : [];
    const dataUrl = cellCanvas.toDataURL('image/png');

    return {
      dataUrl,
      width: cellCanvas.width,
      height: cellCanvas.height,
      bounds: targetCell.bounds,
      warnings,
      isTrimmed,
      canvas: cellCanvas
    };
  }, [sourceImage, sourceMeta, gridConfig, paddingPercent]);

  // Sync modal live preview and background splitResults whenever selectedCellIndex or overrides change
  useEffect(() => {
    if (selectedCellIndex === null) {
      setModalLivePreview(null);
      return;
    }
    const result = cropSingleCell(selectedCellIndex, cellOverrides, modalSmartTrim);
    if (result) {
      setModalLivePreview({
        dataUrl: result.dataUrl,
        width: result.width,
        height: result.height,
        bounds: result.bounds,
        warnings: result.warnings,
        isTrimmed: result.isTrimmed
      });

      // Synchronize in splitResults so gallery card is updated in real-time
      setSplitResults(prev => {
        if (prev.length === 0) return prev;
        const exists = prev.some(p => p.index === selectedCellIndex);
        if (!exists) return prev;

        result.canvas.toBlob((blob) => {
          if (!blob) return;
          setSplitResults(latest => latest.map(item => {
            if (item.index !== selectedCellIndex) return item;
            return {
              ...item,
              bounds: result.bounds,
              dataUrl: result.dataUrl,
              blob,
              width: result.width,
              height: result.height,
              warnings: result.warnings,
              isTrimmed: result.isTrimmed
            };
          }));
        }, 'image/png');

        return prev.map(item => {
          if (item.index !== selectedCellIndex) return item;
          return {
            ...item,
            bounds: result.bounds,
            dataUrl: result.dataUrl,
            width: result.width,
            height: result.height,
            warnings: result.warnings,
            isTrimmed: result.isTrimmed
          };
        });
      });
    }
  }, [selectedCellIndex, cellOverrides, modalSmartTrim, cropSingleCell]);

  // Keyboard navigation for arrow keys inside modal
  useEffect(() => {
    if (selectedCellIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNudgeCrop(selectedCellIndex, -modalNudgeStep, 0, 0, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNudgeCrop(selectedCellIndex, modalNudgeStep, 0, 0, 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleNudgeCrop(selectedCellIndex, 0, -modalNudgeStep, 0, 0);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNudgeCrop(selectedCellIndex, 0, modalNudgeStep, 0, 0);
      } else if (e.key === 'Escape') {
        setSelectedCellIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCellIndex, modalNudgeStep]);

  // Direct numeric editing of specific crop fields
  const handleSetCropField = (
    index: number,
    field: 'offsetX' | 'offsetY' | 'expandWidth' | 'expandHeight',
    val: number
  ) => {
    setCellOverrides(prev => {
      const current = prev[index] || {
        cellIndex: index,
        offsetX: 0,
        offsetY: 0,
        expandWidth: 0,
        expandHeight: 0
      };
      return {
        ...prev,
        [index]: {
          ...current,
          [field]: val
        }
      };
    });
  };

  // Individual cell crop nudging
  const handleNudgeCrop = (index: number, dx: number, dy: number, dw: number, dh: number) => {
    setCellOverrides(prev => {
      const current = prev[index] || {
        cellIndex: index,
        offsetX: 0,
        offsetY: 0,
        expandWidth: 0,
        expandHeight: 0
      };
      return {
        ...prev,
        [index]: {
          cellIndex: index,
          offsetX: current.offsetX + dx,
          offsetY: current.offsetY + dy,
          expandWidth: current.expandWidth + dw,
          expandHeight: current.expandHeight + dh
        }
      };
    });
  };

  const handleResetSingleCrop = (index: number) => {
    setCellOverrides(prev => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  // Fast Mode Execution: 3 Clicks (Upload -> Split -> Download)
  const handleFastSplitAndDownload = async () => {
    if (!sourceImage) return;
    await handleExecuteSplit();
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100 overflow-y-auto">
      {/* Top Banner & Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 p-4 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Crop className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-neutral-100 tracking-tight">
                AI Icon Sheet Splitter
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                Raster Crop Utility
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Extract individual raster icon files from Gemini multi-icon sheets before vectorizing in Inkscape.
            </p>
          </div>

          {/* Mode Switcher & Quick Actions */}
          <div className="flex items-center gap-2">
            <div className="bg-neutral-800 p-0.5 rounded-lg border border-neutral-700 flex">
              <button
                type="button"
                onClick={() => setMode('fast')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  mode === 'fast' 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Fast Mode (3-Action)
              </button>
              <button
                type="button"
                onClick={() => setMode('advanced')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  mode === 'advanced' 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Advanced Grid Editor
              </button>
            </div>

            {sourceImage && (
              <button
                type="button"
                onClick={handleExecuteSplit}
                disabled={isSplitting}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow flex items-center gap-1.5 transition-colors"
              >
                {isSplitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Splitting...
                  </>
                ) : (
                  <>
                    <ScissorsIcon className="w-3.5 h-3.5" />
                    Split into {calculatedCells.length} Icons
                  </>
                )}
              </button>
            )}

            {splitResults.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadAllZip}
                disabled={isZipping}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow flex items-center gap-1.5 transition-colors"
              >
                {isZipping ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Packing ZIP...
                  </>
                ) : (
                  <>
                    <FileArchive className="w-3.5 h-3.5" />
                    Download All (ZIP)
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Workflow isolation callout */}
        <div className="max-w-7xl mx-auto mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>SOURCE IMAGE NOTICE:</strong> This raster image is <em>NOT</em> the final Adobe Stock vector asset.
              Split your icons here → edit &amp; vectorize in Inkscape → then return to the Vector Factory workspace to upload your SVGs.
            </span>
          </div>
          <span className="hidden lg:inline-flex text-[11px] text-amber-400/80 font-mono">
            Lossless PNG Pixel Crops
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-4 space-y-6 flex-1">
        {/* SECTION 1: UPLOAD AREA */}
        {!sourceImage ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                dragOver 
                  ? 'border-amber-500 bg-amber-500/5' 
                  : 'border-neutral-700 hover:border-neutral-600 bg-neutral-950/40'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleProcessFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center text-amber-400 mb-4 border border-neutral-700">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-neutral-200">
                Upload Gemini-Generated Icon Sheet
              </h3>
              <p className="text-xs text-neutral-400 max-w-md mt-1 mb-4">
                Drag &amp; drop your multi-icon image here, or browse files.
                Accepted formats: <strong>PNG, JPEG, WEBP</strong>.
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg border border-neutral-700 shadow"
                >
                  Select Image File
                </button>
                <span className="text-xs text-neutral-500">or</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadDemoSheet();
                  }}
                  className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/30"
                >
                  Load 4×4 Demo Sheet (Solar Energy)
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* SECTION 2: SOURCE METADATA BAR */
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden shrink-0 flex items-center justify-center">
                {sourceUrl && (
                  <img src={sourceUrl} alt="Source thumbnail" className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-200">
                    {sourceMeta?.name}
                  </span>
                  <span className="px-1.5 py-0.2 text-[10px] uppercase font-bold rounded bg-neutral-800 text-amber-400 border border-neutral-700">
                    {sourceMeta?.format}
                  </span>
                </div>
                <div className="text-xs text-neutral-400 flex items-center gap-3">
                  <span>Dimensions: <strong>{sourceMeta?.width} × {sourceMeta?.height} px</strong></span>
                  <span>Size: <strong>{sourceMeta?.sizeFormatted}</strong></span>
                  <span>Target: <strong>{calculatedCells.length} Cells ({gridConfig.rows}×{gridConfig.cols})</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg border border-neutral-700"
              >
                Change Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleProcessFile(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* MAIN WORKSPACE WHEN IMAGE IS LOADED */}
        {sourceImage && sourceMeta && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: VISUAL GRID OVERLAY EDITOR (8 COLS) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-neutral-200">Visual Grid Overlay Preview</span>
                    <span className="text-xs text-neutral-500 font-mono">
                      ({gridConfig.rows}×{gridConfig.cols} Grid)
                    </span>
                  </div>

                  {/* Zoom controls */}
                  <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setZoomLevel(z => Math.max(0.4, z - 0.2))}
                      className="p-1 text-neutral-400 hover:text-neutral-100"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-1 text-[11px] font-mono text-neutral-300">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.2))}
                      className="p-1 text-neutral-400 hover:text-neutral-100"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="p-1 text-neutral-400 hover:text-neutral-100 ml-1"
                      title="Reset Zoom"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Canvas Container with Overlaid Grid */}
                <div className="mt-3 overflow-auto bg-neutral-950/80 rounded-lg p-4 flex items-center justify-center min-h-[480px] max-h-[600px] border border-neutral-800/80">
                  <div 
                    className="relative transition-transform duration-100 select-none shadow-2xl"
                    style={{
                      width: `${sourceMeta.width * zoomLevel * 0.25}px`,
                      height: `${sourceMeta.height * zoomLevel * 0.25}px`
                    }}
                  >
                    {/* Underlying Source Image */}
                    <img
                      src={sourceUrl!}
                      alt="Grid Source"
                      className="w-full h-full object-contain pointer-events-none rounded"
                    />

                    {/* SVG Grid Overlay */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox={`0 0 ${sourceMeta.width} ${sourceMeta.height}`}
                    >
                      {calculatedCells.map((cell) => {
                        const isSelected = selectedCellIndex === cell.index;
                        return (
                          <g key={cell.index}>
                            {/* Outer cell rect */}
                            <rect
                              x={cell.bounds.x}
                              y={cell.bounds.y}
                              width={cell.bounds.width}
                              height={cell.bounds.height}
                              fill={isSelected ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.05)'}
                              stroke={isSelected ? '#f59e0b' : '#38bdf8'}
                              strokeWidth={isSelected ? 6 : 3}
                              strokeDasharray={isSelected ? undefined : '6 4'}
                              className="pointer-events-auto cursor-pointer hover:stroke-amber-400"
                              onClick={() => setSelectedCellIndex(cell.index)}
                            />

                            {/* Badge label inside cell */}
                            <rect
                              x={cell.bounds.x + 8}
                              y={cell.bounds.y + 8}
                              width={48}
                              height={28}
                              rx={6}
                              fill="rgba(15, 23, 42, 0.85)"
                              stroke="#f59e0b"
                              strokeWidth={2}
                            />
                            <text
                              x={cell.bounds.x + 32}
                              y={cell.bounds.y + 27}
                              textAnchor="middle"
                              fill="#f8fafc"
                              fontSize="16"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {(cell.index + 1).toString().padStart(2, '0')}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Subtext under preview */}
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                  <span>Click any cell to inspect or fine-tune its individual crop.</span>
                  <span>Blue dashed lines = detected cut boundaries.</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: CONTROLS, TUNING & PRESETS (4 COLS) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Presets & Auto Detect */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    Grid Presets &amp; Auto-Detect
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowSavePreset(!showSavePreset)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    Save Preset
                  </button>
                </div>

                {/* Save Preset Input Bar */}
                {showSavePreset && (
                  <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
                    <label className="text-[11px] text-neutral-400">Preset Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        placeholder="e.g. Gemini 4x4 Solar"
                        className="flex-1 px-2.5 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-neutral-200"
                      />
                      <button
                        type="button"
                        onClick={handleSaveCurrentPreset}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {/* Preset Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-medium">Layout Preset</label>
                  <select
                    value={gridPreset}
                    onChange={(e) => handleSelectPreset(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-neutral-200"
                  >
                    {presets.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.rows}×{p.cols})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto Detect Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleAutoDetect}
                    className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-amber-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Wand2 className="w-4 h-4 text-amber-400" />
                    Auto Detect Grid Spacing
                  </button>

                  {detectionStatus.status !== 'idle' && (
                    <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${
                      detectionStatus.status === 'good'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    }`}>
                      {detectionStatus.status === 'good' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      )}
                      <span>{detectionStatus.message}</span>
                    </div>
                  )}
                </div>

                {/* Grid Sizing Controls */}
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-neutral-400">Rows ({gridConfig.rows})</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={gridConfig.rows}
                        onChange={(e) => setGridConfig(c => ({ ...c, rows: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400">Columns ({gridConfig.cols})</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={gridConfig.cols}
                        onChange={(e) => setGridConfig(c => ({ ...c, cols: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 mt-1"
                      />
                    </div>
                  </div>

                  {/* Outer Margins */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-neutral-400">Outer Margin X: {gridConfig.marginX}px</label>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        value={gridConfig.marginX}
                        onChange={(e) => setGridConfig(c => ({ ...c, marginX: parseInt(e.target.value) || 0 }))}
                        className="w-full accent-amber-500 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400">Outer Margin Y: {gridConfig.marginY}px</label>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        value={gridConfig.marginY}
                        onChange={(e) => setGridConfig(c => ({ ...c, marginY: parseInt(e.target.value) || 0 }))}
                        className="w-full accent-amber-500 mt-1"
                      />
                    </div>
                  </div>

                  {/* Gaps */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-neutral-400">Gap X: {gridConfig.gapX}px</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={gridConfig.gapX}
                        onChange={(e) => setGridConfig(c => ({ ...c, gapX: parseInt(e.target.value) || 0 }))}
                        className="w-full accent-amber-500 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400">Gap Y: {gridConfig.gapY}px</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={gridConfig.gapY}
                        onChange={(e) => setGridConfig(c => ({ ...c, gapY: parseInt(e.target.value) || 0 }))}
                        className="w-full accent-amber-500 mt-1"
                      />
                    </div>
                  </div>

                  {/* Global Offsets */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-neutral-400">Offset X: {gridConfig.offsetX}px</label>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={gridConfig.offsetX}
                        onChange={(e) => setGridConfig(c => ({ ...c, offsetX: parseInt(e.target.value) || 0 }))}
                        className="w-full accent-amber-500 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400">Offset Y: {gridConfig.offsetY}px</label>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={gridConfig.offsetY}
                        onChange={(e) => setGridConfig(c => ({ ...c, offsetY: parseInt(e.target.value) || 0 }))}
                        className="w-full accent-amber-500 mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Smart Trim Toggle & Padding */}
                <div className="pt-3 border-t border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-neutral-200">Smart Trim</span>
                      <p className="text-[10px] text-neutral-400">Remove empty margins without cutting artwork</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableSmartTrim}
                      onChange={(e) => setEnableSmartTrim(e.target.checked)}
                      className="accent-amber-500 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {enableSmartTrim && (
                    <div>
                      <div className="flex justify-between text-[11px] text-neutral-400">
                        <span>Safe Icon Padding</span>
                        <span>{paddingPercent}% (recommended: 8–10%)</span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={20}
                        value={paddingPercent}
                        onChange={(e) => setPaddingPercent(parseInt(e.target.value) || 8)}
                        className="w-full accent-amber-500 mt-1"
                      />
                    </div>
                  )}
                </div>

                {/* Primary Split Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleExecuteSplit}
                    disabled={isSplitting}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    {isSplitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Extracting Pixels...
                      </>
                    ) : (
                      <>
                        <Crop className="w-4 h-4" />
                        Split into {calculatedCells.length} Icons
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: SPLIT GALLERY & REVIEW (16 CELLS) */}
        {splitResults.length > 0 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                  <span>Split Cell Review</span>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {splitResults.length} / {splitResults.length} Ready
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Review extracted crops before downloading. Click any card to fine-tune its boundary or rename.
                </p>
              </div>

              {/* Quick Batch Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newNames: Record<number, string> = {};
                    RESIDENTIAL_SOLAR_ICON_NAMES.forEach((name, i) => {
                      newNames[i] = name;
                    });
                    setIconNames(newNames);
                    // Update current split results filenames
                    setSplitResults(prev => prev.map((item, idx) => ({
                      ...item,
                      label: newNames[idx] || item.label,
                      filename: sanitizeIconFilename(idx, newNames[idx] || item.label, 'png')
                    })));
                  }}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg border border-neutral-700"
                >
                  Apply Solar Preset Names
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  disabled={isZipping}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition-colors"
                >
                  <FileArchive className="w-4 h-4" />
                  Download All ({splitResults.length} Icons .ZIP)
                </button>
              </div>
            </div>

            {/* Visual Grid Gallery */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
              {splitResults.map((cell) => {
                const hasWarnings = cell.warnings.length > 0;
                return (
                  <div
                    key={cell.index}
                    className={`bg-neutral-950 rounded-xl border p-3 flex flex-col justify-between transition-all hover:border-neutral-700 ${
                      hasWarnings ? 'border-amber-500/40' : 'border-neutral-800'
                    }`}
                  >
                    {/* Header: Number & Warning status */}
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-800/60">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[11px] font-mono font-bold text-neutral-300">
                          {(cell.index + 1).toString().padStart(2, '0')}
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {cell.width} × {cell.height} px
                      </span>
                    </div>

                    {/* Image Preview */}
                    <div 
                      className="my-3 aspect-square bg-neutral-900/60 rounded-lg flex items-center justify-center p-2 border border-neutral-850 overflow-hidden cursor-pointer group relative"
                      onClick={() => setSelectedCellIndex(cell.index)}
                    >
                      <img
                        src={cell.dataUrl}
                        alt={cell.label}
                        className="max-w-full max-h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="px-2.5 py-1 bg-amber-600 text-white text-[11px] font-semibold rounded-md flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Inspect
                        </span>
                      </div>
                    </div>

                    {/* Cell Name & Filename preview */}
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={cell.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIconNames(prev => ({ ...prev, [cell.index]: val }));
                          setSplitResults(prev => prev.map(c => 
                            c.index === cell.index 
                              ? { ...c, label: val, filename: sanitizeIconFilename(cell.index, val, 'png') } 
                              : c
                          ));
                        }}
                        className="w-full px-2 py-1 text-xs bg-neutral-900 border border-neutral-700/80 rounded text-neutral-200 font-medium truncate focus:border-amber-500 focus:outline-none"
                      />
                      <div className="text-[10px] text-neutral-500 font-mono truncate">
                        {cell.filename}
                      </div>
                    </div>

                    {/* Warnings (if heuristic triggers) */}
                    {hasWarnings && (
                      <div className="mt-2 p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300">
                        {cell.warnings[0]}
                      </div>
                    )}

                    {/* Actions: Download Single or Nudge */}
                    <div className="mt-3 pt-2 border-t border-neutral-850 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCellIndex(cell.index)}
                        className="text-[11px] text-neutral-400 hover:text-neutral-200 flex items-center gap-1"
                      >
                        <Move className="w-3 h-3" /> Nudge
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadSingleCell(cell)}
                        className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded border border-neutral-700 flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3 text-amber-400" />
                        PNG
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Next Steps: Bridge to Inkscape */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                  Next Step: Manual Vectorization in Inkscape
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  1. Download the ZIP with your 16 clean raster icons.
                  2. Open and edit/vectorize each icon in Inkscape.
                  3. Export your finished icons as SVG.
                  4. Return to Vector Factory workspace and upload your 16 SVGs for final Preflight &amp; Adobe Stock packaging!
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadAllZip}
                disabled={isZipping}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shrink-0 flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download {splitResults.length} Icons ZIP
              </button>
            </div>
          </div>
        )}
      </div>

      {/* INDIVIDUAL CROP ADJUSTMENT MODAL */}
      {selectedCellIndex !== null && (() => {
        const currentOverride = cellOverrides[selectedCellIndex] || {
          cellIndex: selectedCellIndex,
          offsetX: 0,
          offsetY: 0,
          expandWidth: 0,
          expandHeight: 0
        };

        const activeBounds = modalLivePreview?.bounds || { x: 0, y: 0, width: 0, height: 0 };
        const displayDataUrl = modalLivePreview?.dataUrl || splitResults[selectedCellIndex]?.dataUrl;

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4 overflow-y-auto">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-5 md:p-6 space-y-4 shadow-2xl my-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 text-xs font-mono font-bold border border-amber-500/30">
                    Cell {(selectedCellIndex + 1).toString().padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                      <span>Fine-Tune Crop Boundary</span>
                      <span className="text-[11px] font-normal text-amber-400/90 font-mono">
                        (Live Real-Time)
                      </span>
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      Batas potong asli: X={activeBounds.x}px, Y={activeBounds.y}px • Ukuran: {modalLivePreview?.width || activeBounds.width} × {modalLivePreview?.height || activeBounds.height} px
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCellIndex(null)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preview image & HUD */}
              <div className="relative aspect-square max-h-64 sm:max-h-72 w-full bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-center p-3 overflow-hidden bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:12px_12px]">
                {displayDataUrl ? (
                  <img
                    src={displayDataUrl}
                    alt="Crop preview"
                    className="max-h-full max-w-full object-contain select-none drop-shadow-md"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <span className="text-xs text-neutral-500">Memuat preview crop...</span>
                )}

                {/* Top Badges */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                  <span className="px-2 py-0.5 rounded bg-neutral-900/90 text-neutral-300 text-[10px] font-mono border border-neutral-700">
                    {modalLivePreview ? `${modalLivePreview.width} × ${modalLivePreview.height} px` : '---'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    modalLivePreview?.isTrimmed 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {modalLivePreview?.isTrimmed ? 'Smart Trimmed' : 'Raw Crop Box'}
                  </span>
                </div>

                {/* Warning alert if heuristic triggers */}
                {modalLivePreview && modalLivePreview.warnings.length > 0 && (
                  <div className="absolute bottom-2 inset-x-2 p-1.5 rounded bg-rose-500/20 border border-rose-500/30 text-[10px] text-rose-300 text-center font-medium backdrop-blur-sm">
                    ⚠️ {modalLivePreview.warnings[0]}
                  </div>
                )}
              </div>

              {/* Step Size Selector */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
                <span className="text-xs text-neutral-400 font-medium">
                  Ukuran Langkah Nudge:
                </span>
                <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800">
                  {[1, 4, 8, 16, 32].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setModalNudgeStep(step)}
                      className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                        modalNudgeStep === step
                          ? 'bg-amber-600 text-white font-bold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {step}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Directional Pad (Nudge Position) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
                  <span>Geser Posisi Potong (D-Pad)</span>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    Offset: X={currentOverride.offsetX > 0 ? `+${currentOverride.offsetX}` : currentOverride.offsetX}px, Y={currentOverride.offsetY > 0 ? `+${currentOverride.offsetY}` : currentOverride.offsetY}px
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                  <div />
                  <button
                    type="button"
                    onClick={() => handleNudgeCrop(selectedCellIndex, 0, -modalNudgeStep, 0, 0)}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 active:scale-95 rounded-lg text-xs font-medium text-neutral-200 flex items-center justify-center gap-1 border border-neutral-700 transition-all shadow-sm"
                    title={`Geser ke Atas ${modalNudgeStep}px`}
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                    <span>Up</span>
                  </button>
                  <div />

                  <button
                    type="button"
                    onClick={() => handleNudgeCrop(selectedCellIndex, -modalNudgeStep, 0, 0, 0)}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 active:scale-95 rounded-lg text-xs font-medium text-neutral-200 flex items-center justify-center gap-1 border border-neutral-700 transition-all shadow-sm"
                    title={`Geser ke Kiri ${modalNudgeStep}px`}
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                    <span>Left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSetCropField(selectedCellIndex, 'offsetX', 0);
                      handleSetCropField(selectedCellIndex, 'offsetY', 0);
                    }}
                    className="px-2 py-2 bg-neutral-850 hover:bg-neutral-800 active:scale-95 rounded-lg text-[11px] text-neutral-400 hover:text-neutral-200 flex items-center justify-center border border-neutral-750 transition-all"
                    title="Reset Posisi X & Y ke 0"
                  >
                    Center
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNudgeCrop(selectedCellIndex, modalNudgeStep, 0, 0, 0)}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 active:scale-95 rounded-lg text-xs font-medium text-neutral-200 flex items-center justify-center gap-1 border border-neutral-700 transition-all shadow-sm"
                    title={`Geser ke Kanan ${modalNudgeStep}px`}
                  >
                    <span>Right</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>

                  <div />
                  <button
                    type="button"
                    onClick={() => handleNudgeCrop(selectedCellIndex, 0, modalNudgeStep, 0, 0)}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 active:scale-95 rounded-lg text-xs font-medium text-neutral-200 flex items-center justify-center gap-1 border border-neutral-700 transition-all shadow-sm"
                    title={`Geser ke Bawah ${modalNudgeStep}px`}
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Down</span>
                  </button>
                  <div />
                </div>
              </div>

              {/* Direct Editable Numeric Inputs */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <div className="text-xs text-neutral-300 font-bold flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Nilai Parameter Presisi (Ketik Langsung / Stepper)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Offset X */}
                  <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                    <label className="text-[11px] text-neutral-400 block mb-1">Offset X (px)</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleNudgeCrop(selectedCellIndex, -modalNudgeStep, 0, 0, 0)}
                        className="p-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={currentOverride.offsetX}
                        onChange={(e) => handleSetCropField(selectedCellIndex, 'offsetX', parseInt(e.target.value) || 0)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-xs text-center font-mono text-neutral-100 focus:border-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleNudgeCrop(selectedCellIndex, modalNudgeStep, 0, 0, 0)}
                        className="p-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Offset Y */}
                  <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                    <label className="text-[11px] text-neutral-400 block mb-1">Offset Y (px)</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleNudgeCrop(selectedCellIndex, 0, -modalNudgeStep, 0, 0)}
                        className="p-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={currentOverride.offsetY}
                        onChange={(e) => handleSetCropField(selectedCellIndex, 'offsetY', parseInt(e.target.value) || 0)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-xs text-center font-mono text-neutral-100 focus:border-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleNudgeCrop(selectedCellIndex, 0, modalNudgeStep, 0, 0)}
                        className="p-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Expand Width */}
                  <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                    <label className="text-[11px] text-neutral-400 block mb-1">Lebar W (px)</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleNudgeCrop(selectedCellIndex, 0, 0, -modalNudgeStep, 0)}
                        className="p-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={currentOverride.expandWidth}
                        onChange={(e) => handleSetCropField(selectedCellIndex, 'expandWidth', parseInt(e.target.value) || 0)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-xs text-center font-mono text-neutral-100 focus:border-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleNudgeCrop(selectedCellIndex, 0, 0, modalNudgeStep, 0)}
                        className="p-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Expand Height */}
                  <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                    <label className="text-[11px] text-neutral-400 block mb-1">Tinggi H (px)</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleNudgeCrop(selectedCellIndex, 0, 0, 0, -modalNudgeStep)}
                        className="p-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={currentOverride.expandHeight}
                        onChange={(e) => handleSetCropField(selectedCellIndex, 'expandHeight', parseInt(e.target.value) || 0)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-xs text-center font-mono text-neutral-100 focus:border-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleNudgeCrop(selectedCellIndex, 0, 0, 0, modalNudgeStep)}
                        className="p-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Expand / Contract All */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleNudgeCrop(selectedCellIndex, -Math.round(modalNudgeStep / 2), -Math.round(modalNudgeStep / 2), modalNudgeStep, modalNudgeStep)}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 active:scale-98 rounded-lg text-xs font-medium text-neutral-200 flex items-center justify-center gap-1.5 border border-neutral-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Perlebar Batas (+{modalNudgeStep}px)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNudgeCrop(selectedCellIndex, Math.round(modalNudgeStep / 2), Math.round(modalNudgeStep / 2), -modalNudgeStep, -modalNudgeStep)}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 active:scale-98 rounded-lg text-xs font-medium text-neutral-200 flex items-center justify-center gap-1.5 border border-neutral-700 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Perkecil Batas (-{modalNudgeStep}px)</span>
                </button>
              </div>

              {/* Options & Keyboard shortcut tip */}
              <div className="pt-2 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-neutral-400">
                <label className="flex items-center gap-2 cursor-pointer hover:text-neutral-200 select-none">
                  <input
                    type="checkbox"
                    checked={modalSmartTrim}
                    onChange={(e) => setModalSmartTrim(e.target.checked)}
                    className="rounded border-neutral-700 bg-neutral-800 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Terapkan Smart Trim pada preview ini</span>
                </label>

                <span className="text-[11px] text-neutral-500 font-mono">
                  Tips: Gunakan panah keyboard (← ↑ → ↓) untuk menggeser.
                </span>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleResetSingleCrop(selectedCellIndex)}
                  className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Crop ke Default
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCellIndex(null)}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-4 h-4" />
                  Selesai &amp; Terapkan
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// Simple Scissors Icon helper
function ScissorsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      {...props} 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      viewBox="0 0 24 24"
    >
      <circle cx="6" cy="6" r="3" />
      <path d="M8.12 8.12 12 12" />
      <path d="M20 4 8.12 15.88" />
      <circle cx="6" cy="18" r="3" />
      <path d="M14.8 14.8 20 20" />
    </svg>
  );
}
