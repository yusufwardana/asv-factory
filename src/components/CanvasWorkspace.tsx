import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Upload, 
  Trash2, 
  Move, 
  Scaling, 
  Wand2, 
  Grid3X3, 
  Layers, 
  Info,
  Check,
  AlertCircle,
  Repeat
} from 'lucide-react';
import { IconSlot, Project } from '../types';
import { ViewMode } from './Header';
import { sanitizeAndInspectSvg, autoNormalizeSlots, extractInnerSvgContent } from '../lib/svgUtils';

interface CanvasWorkspaceProps {
  project: Project;
  onUpdateProject: (updater: (prev: Project) => Project) => void;
  selectedSlotIndex: number | null;
  onSelectSlot: (index: number | null) => void;
  viewMode: ViewMode;
  showGrid: boolean;
  showSafeAreas: boolean;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  project,
  onUpdateProject,
  selectedSlotIndex,
  onSelectSlot,
  viewMode,
  showGrid,
  showSafeAreas,
}) => {
  const [zoom, setZoom] = useState<number>(0.18); // default view scale for 4000x4000
  const [patternRepeat, setPatternRepeat] = useState<1 | 2 | 4>(2);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  const { width, height, gridRows, gridCols, safePadding } = project.canvasConfig;
  const colWidth = width / gridCols;
  const rowHeight = height / gridRows;

  // Auto-fit on initial render or container resize
  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const fitScale = Math.min((clientWidth - 60) / width, (clientHeight - 80) / height);
      setZoom(Math.max(0.1, Math.min(1.5, fitScale)));
    }
  }, [width, height]);

  // Handle single slot file upload
  const handleSlotFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slotIdx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        applySvgToSlot(content, slotIdx, file.name.replace(/\.svg$/i, ''));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Batch import multiple SVGs
  const handleBatchImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (!content) return;

        // Try to match slot index by number in filename e.g. "01-solar-home.svg" -> slot 0
        const match = file.name.match(/(?:icon[_-]?)?(\d+)/i);
        let targetSlot = -1;
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (parsed >= 1 && parsed <= project.slots.length) {
            targetSlot = parsed - 1;
          }
        }

        // If no number, find the first empty slot or fallback to matching index
        if (targetSlot === -1) {
          targetSlot = project.slots.findIndex(s => !s.svgContent);
          if (targetSlot === -1) targetSlot = 0;
        }

        applySvgToSlot(content, targetSlot, file.name.replace(/\.svg$/i, ''));
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  const applySvgToSlot = (rawSvg: string, slotIdx: number, newLabel?: string) => {
    const inspected = sanitizeAndInspectSvg(rawSvg, newLabel);
    onUpdateProject(prev => {
      const nextSlots = [...prev.slots];
      if (slotIdx >= 0 && slotIdx < nextSlots.length) {
        nextSlots[slotIdx] = {
          ...nextSlots[slotIdx],
          label: newLabel || nextSlots[slotIdx].label,
          svgContent: inspected.cleanSvg,
          rawSvgContent: rawSvg,
          bounds: inspected.viewBox,
          scale: 1.0,
          offsetX: 0,
          offsetY: 0,
          stats: inspected.stats,
          sanitizationLog: inspected.logs
        };
      }
      return {
        ...prev,
        slots: nextSlots,
        updatedAt: new Date().toISOString()
      };
    });
  };

  // Slot transform adjustments
  const adjustSelectedSlot = (updater: (slot: IconSlot) => Partial<IconSlot>) => {
    if (selectedSlotIndex === null) return;
    onUpdateProject(prev => {
      const nextSlots = [...prev.slots];
      const target = nextSlots[selectedSlotIndex];
      if (!target) return prev;

      nextSlots[selectedSlotIndex] = {
        ...target,
        ...updater(target)
      };
      return { ...prev, slots: nextSlots, updatedAt: new Date().toISOString() };
    });
  };

  const clearSelectedSlot = () => {
    if (selectedSlotIndex === null) return;
    onUpdateProject(prev => {
      const nextSlots = [...prev.slots];
      const target = nextSlots[selectedSlotIndex];
      if (!target) return prev;
      nextSlots[selectedSlotIndex] = {
        ...target,
        svgContent: '',
        rawSvgContent: '',
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
        stats: {
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
        },
        sanitizationLog: ['Slot emptied.']
      };
      return { ...prev, slots: nextSlots, updatedAt: new Date().toISOString() };
    });
  };

  // Optical normalization trigger
  const handleAutoNormalize = () => {
    onUpdateProject(prev => {
      const normalizedSlots = autoNormalizeSlots(prev.slots);
      return {
        ...prev,
        slots: normalizedSlots,
        updatedAt: new Date().toISOString()
      };
    });
  };

  // Center all slots
  const handleCenterAll = () => {
    onUpdateProject(prev => ({
      ...prev,
      slots: prev.slots.map(s => ({ ...s, offsetX: 0, offsetY: 0, scale: 1.0 })),
      updatedAt: new Date().toISOString()
    }));
  };

  // Drag and drop onto slots
  const handleDropOnSlot = (e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        if (content) {
          applySvgToSlot(content, slotIdx, file.name.replace(/\.svg$/i, ''));
        }
      };
      reader.readAsText(file);
    }
  };

  // Compute background class based on viewMode
  const getCanvasBackgroundClass = () => {
    switch (viewMode) {
      case 'white':
        return 'bg-white text-neutral-900 shadow-2xl';
      case 'dark':
        return 'bg-neutral-950 text-neutral-100 shadow-2xl border border-neutral-800';
      case 'outline':
        return 'bg-neutral-950 text-cyan-400 shadow-2xl border border-cyan-800/40';
      case 'checkerboard':
        return 'bg-[linear-gradient(45deg,#1c1c1c_25%,transparent_25%),linear-gradient(-45deg,#1c1c1c_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1c1c1c_75%),linear-gradient(-45deg,transparent_75%,#1c1c1c_75%)] bg-[size:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] bg-neutral-900 shadow-2xl';
      case 'normal':
      default:
        return 'bg-neutral-950 shadow-2xl border border-neutral-800';
    }
  };

  const selectedSlot = selectedSlotIndex !== null ? project.slots[selectedSlotIndex] : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 overflow-hidden relative select-none">
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".svg" 
        className="hidden" 
        onChange={(e) => selectedSlotIndex !== null && handleSlotFileUpload(e, selectedSlotIndex)} 
      />
      <input 
        type="file" 
        ref={batchFileInputRef} 
        accept=".svg" 
        multiple 
        className="hidden" 
        onChange={handleBatchImport} 
      />

      {/* Top Workspace Toolbar */}
      <div className="h-10 bg-neutral-900 border-b border-neutral-800 px-4 flex items-center justify-between text-xs text-neutral-300 shrink-0">
        <div className="flex items-center gap-2">
          {/* Preset / Canvas Spec */}
          <span className="font-semibold text-neutral-200">
            {project.assetType === 'icon-sheet' ? `${gridCols}×${gridRows} Icon Sheet` : project.assetType.replace('-', ' ').toUpperCase()}
          </span>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
            {width} × {height} px
          </span>

          <div className="h-4 w-px bg-neutral-800 mx-1" />

          {/* Auto Normalize Button */}
          <button
            onClick={handleAutoNormalize}
            id="btn-auto-normalize"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 font-semibold transition-colors"
            title="Analyze all 16 slots and balance optical visual mass consistently without shape distortion (PRD Section 10)"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            <span>AUTO NORMALIZE</span>
          </button>

          {/* Batch Import Button */}
          <button
            onClick={() => batchFileInputRef.current?.click()}
            id="btn-batch-import"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
            title="Batch Import up to 16 SVGs (Auto maps by 01, 02.. in filename)"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Batch Import SVGs</span>
          </button>

          {/* Center All */}
          <button
            onClick={handleCenterAll}
            className="flex items-center gap-1 px-2 py-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            title="Reset position and scale for all slots"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Positions</span>
          </button>

          {project.assetType === 'pattern' && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-neutral-800">
              <span className="text-neutral-400 font-mono text-[11px]">Repeat:</span>
              {([1, 2, 4] as const).map(rep => (
                <button
                  key={rep}
                  onClick={() => setPatternRepeat(rep)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                    patternRepeat === rep ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {rep}×{rep}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
            <button
              onClick={() => setZoom(z => Math.max(0.05, Math.round((z - 0.05) * 100) / 100))}
              className="p-1 text-neutral-400 hover:text-neutral-200"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] text-neutral-300 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(2.0, Math.round((z + 0.05) * 100) / 100))}
              className="p-1 text-neutral-400 hover:text-neutral-200"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (containerRef.current) {
                  const { clientWidth, clientHeight } = containerRef.current;
                  setZoom(Math.min((clientWidth - 60) / width, (clientHeight - 80) / height));
                }
              }}
              className="p-1 text-neutral-400 hover:text-neutral-200 border-l border-neutral-800 ml-1 pl-1"
              title="Fit to screen (Shortcut: F)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(0.25)}
              className="px-1 py-0.5 text-[10px] text-neutral-400 hover:text-neutral-200 font-mono"
              title="100% vector view (Shortcut: 1)"
            >
              1:1
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-8 flex items-center justify-center relative bg-neutral-950"
        onClick={(e) => {
          if (e.target === containerRef.current) {
            onSelectSlot(null);
          }
        }}
      >
        {/* The Artboard Container */}
        <div
          style={{
            width: width * zoom,
            height: height * zoom,
            transition: 'width 0.1s ease-out, height 0.1s ease-out',
          }}
          className={`relative shrink-0 rounded-sm transition-colors ${getCanvasBackgroundClass()}`}
        >
          {/* Pattern repeat mode preview */}
          {project.assetType === 'pattern' ? (
            <div 
              className="w-full h-full grid"
              style={{
                gridTemplateColumns: `repeat(${patternRepeat}, 1fr)`,
                gridTemplateRows: `repeat(${patternRepeat}, 1fr)`
              }}
            >
              {Array.from({ length: patternRepeat * patternRepeat }).map((_, pIdx) => (
                <div key={pIdx} className="w-full h-full border border-dashed border-neutral-800/40 relative overflow-hidden">
                  <div
                    className="w-full h-full flex items-center justify-center"
                    dangerouslySetInnerHTML={{
                      __html: project.slots[0]?.svgContent || '<div class="text-neutral-700 text-xs">No pattern art</div>'
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            /* Icon Sheet Grid Artboard */
            <div 
              className="w-full h-full grid relative"
              style={{
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                gridTemplateRows: `repeat(${gridRows}, 1fr)`,
              }}
            >
              {project.slots.map((slot, idx) => {
                const isSelected = selectedSlotIndex === idx;
                const col = idx % gridCols;
                const row = Math.floor(idx / gridCols);

                // Calculate slot size
                const slotW = colWidth * zoom;
                const slotH = rowHeight * zoom;
                const safePadPx = safePadding * zoom;

                return (
                  <div
                    key={slot.id}
                    id={`slot-cell-${idx + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSlot(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => handleDropOnSlot(e, idx)}
                    className={`relative flex items-center justify-center cursor-pointer transition-all duration-150 ${
                      showGrid ? 'border border-neutral-800/60' : ''
                    } ${
                      isSelected 
                        ? 'ring-2 ring-amber-400 bg-amber-500/10 z-20' 
                        : 'hover:bg-neutral-800/30'
                    }`}
                  >
                    {/* Safe Area Guide Box */}
                    {showSafeAreas && (
                      <div
                        style={{
                          margin: `${safePadPx}px`,
                        }}
                        className="absolute inset-0 border border-indigo-500/25 pointer-events-none rounded-sm"
                      />
                    )}

                    {/* Slot Header Index */}
                    <div className="absolute top-1 left-1.5 flex items-center gap-1 pointer-events-none z-10">
                      <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                        isSelected 
                          ? 'bg-amber-400 text-neutral-950 font-bold' 
                          : 'bg-neutral-900/80 text-neutral-400'
                      }`}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Artwork Render */}
                    {slot.svgContent ? (
                      <div 
                        style={{
                          transform: `translate(${(slot.offsetX || 0) * zoom}px, ${(slot.offsetY || 0) * zoom}px) scale(${slot.scale || 1.0})`,
                          width: `${(colWidth - safePadding * 2) * zoom}px`,
                          height: `${(rowHeight - safePadding * 2) * zoom}px`,
                        }}
                        className={`flex items-center justify-center transition-transform ${
                          viewMode === 'outline' ? 'outline-wireframe' : ''
                        }`}
                        dangerouslySetInnerHTML={{ __html: slot.svgContent }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-neutral-600 gap-1 p-2 text-center">
                        <Upload className="w-4 h-4 opacity-40" />
                        <span className="text-[10px]">Drop SVG</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Floating Inspector/Transform Bar for Selected Slot */}
      {selectedSlot && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-4 text-xs text-neutral-200 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2 border-r border-neutral-700 pr-3">
            <span className="font-mono font-bold bg-amber-400 text-neutral-950 px-1.5 py-0.5 rounded text-[11px]">
              SLOT {String(selectedSlot.index + 1).padStart(2, '0')}
            </span>
            <input
              type="text"
              value={selectedSlot.label}
              onChange={(e) => adjustSelectedSlot(() => ({ label: e.target.value }))}
              className="bg-neutral-950 border border-neutral-700 rounded px-2 py-0.5 text-xs text-neutral-100 font-medium focus:outline-none focus:border-amber-400 w-44"
              placeholder="Icon Label"
            />
          </div>

          {/* Scale Controls */}
          <div className="flex items-center gap-1.5 border-r border-neutral-700 pr-3">
            <span className="text-neutral-400 text-[11px] font-mono">Scale:</span>
            <button
              onClick={() => adjustSelectedSlot(s => ({ scale: Math.max(0.3, Math.round((s.scale - 0.05) * 100) / 100) }))}
              className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 font-bold"
              title="Scale Down"
            >
              -
            </button>
            <span className="font-mono text-[11px] w-10 text-center font-semibold">
              {Math.round(selectedSlot.scale * 100)}%
            </span>
            <button
              onClick={() => adjustSelectedSlot(s => ({ scale: Math.min(2.5, Math.round((s.scale + 0.05) * 100) / 100) }))}
              className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 font-bold"
              title="Scale Up"
            >
              +
            </button>
          </div>

          {/* Position Nudge Controls */}
          <div className="flex items-center gap-1 border-r border-neutral-700 pr-3">
            <span className="text-neutral-400 text-[11px] font-mono">Nudge:</span>
            <button
              onClick={() => adjustSelectedSlot(s => ({ offsetX: s.offsetX - 5 }))}
              className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 font-mono text-[11px]"
              title="Move Left 5px"
            >
              ←
            </button>
            <button
              onClick={() => adjustSelectedSlot(s => ({ offsetY: s.offsetY - 5 }))}
              className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 font-mono text-[11px]"
              title="Move Up 5px"
            >
              ↑
            </button>
            <button
              onClick={() => adjustSelectedSlot(s => ({ offsetY: s.offsetY + 5 }))}
              className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 font-mono text-[11px]"
              title="Move Down 5px"
            >
              ↓
            </button>
            <button
              onClick={() => adjustSelectedSlot(s => ({ offsetX: s.offsetX + 5 }))}
              className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 font-mono text-[11px]"
              title="Move Right 5px"
            >
              →
            </button>
          </div>

          {/* Reset & Replace & Delete Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustSelectedSlot(() => ({ offsetX: 0, offsetY: 0, scale: 1.0 }))}
              className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              title="Center & Reset transforms"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Center</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-blue-400"
              title="Replace SVG"
            >
              <Upload className="w-3 h-3" />
              <span>Replace</span>
            </button>

            <button
              onClick={clearSelectedSlot}
              className="flex items-center gap-1 px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300"
              title="Delete icon from slot"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
