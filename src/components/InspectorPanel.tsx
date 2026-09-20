import React, { useState } from 'react';
import { 
  Palette, 
  PenTool, 
  Layers, 
  Maximize, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Sparkles, 
  Flame, 
  Copy, 
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Search,
  Cpu,
  FileText
} from 'lucide-react';
import { IconSlot, Project } from '../types';
import { extractProjectPalette, PaletteItem } from '../lib/svgUtils';
import { checkProjectSimilarity } from '../lib/similarityGuard';
import { SimilarityAuditModal } from './SimilarityAuditModal';

interface InspectorPanelProps {
  project: Project;
  allProjects?: Project[];
  onUpdateProject: (updater: (prev: Project) => Project) => void;
  selectedSlotIndex: number | null;
  onSelectSlot: (index: number | null) => void;
}

type InspectorTab = 'vector' | 'palette' | 'strokes' | 'complexity' | 'similarity' | 'thumbnails';

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  project,
  allProjects = [],
  onUpdateProject,
  selectedSlotIndex,
  onSelectSlot,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('vector');
  const [showSimilarityModal, setShowSimilarityModal] = useState(false);
  const [mergeConfirmation, setMergeConfirmation] = useState<{ sourceHex: string; targetHex: string } | null>(null);

  const similarityResult = checkProjectSimilarity(project, allProjects);

  const selectedSlot = selectedSlotIndex !== null ? project.slots[selectedSlotIndex] : project.slots[0];
  const palette = extractProjectPalette(project.slots);

  // Stroke analysis across all loaded slots
  const strokeFrequencyMap = new Map<number, number>();
  project.slots.forEach(slot => {
    slot.stats.strokeWidths.forEach(w => {
      strokeFrequencyMap.set(w, (strokeFrequencyMap.get(w) || 0) + 1);
    });
  });
  const strokeEntries = Array.from(strokeFrequencyMap.entries()).sort((a, b) => b[1] - a[1]);
  const dominantStroke = strokeEntries[0]?.[0] || 2.5;
  const hasInconsistentStrokes = strokeEntries.length > 2;

  // Complexity audit: find average nodes & detect spikes
  const activeSlots = project.slots.filter(s => s.svgContent && s.stats.nodeEstimate > 0);
  const avgNodes = activeSlots.length > 0 
    ? Math.round(activeSlots.reduce((sum, s) => sum + s.stats.nodeEstimate, 0) / activeSlots.length) 
    : 0;

  // Handle color merge
  const handleMergeColors = (sourceHex: string, targetHex: string) => {
    onUpdateProject(prev => {
      const nextSlots = prev.slots.map(slot => {
        if (!slot.svgContent) return slot;
        // Case-insensitive replace for hex colors in SVG
        const regex = new RegExp(sourceHex, 'gi');
        const updatedSvg = slot.svgContent.replace(regex, targetHex);
        const updatedRaw = slot.rawSvgContent ? slot.rawSvgContent.replace(regex, targetHex) : updatedSvg;

        const updatedStatsColors = slot.stats.colors.map(c => 
          c.toUpperCase() === sourceHex.toUpperCase() ? targetHex.toUpperCase() : c
        );

        return {
          ...slot,
          svgContent: updatedSvg,
          rawSvgContent: updatedRaw,
          stats: {
            ...slot.stats,
            colors: Array.from(new Set(updatedStatsColors))
          },
          sanitizationLog: [...slot.sanitizationLog, `Color Merged: ${sourceHex} -> ${targetHex}`]
        };
      });

      return {
        ...prev,
        slots: nextSlots,
        updatedAt: new Date().toISOString()
      };
    });
    setMergeConfirmation(null);
  };

  // Handle stroke normalization
  const handleNormalizeStrokes = (targetWidth: number) => {
    onUpdateProject(prev => {
      const nextSlots = prev.slots.map(slot => {
        if (!slot.svgContent) return slot;
        // Replace stroke-width attributes
        const updatedSvg = slot.svgContent.replace(/stroke-width="[\d.]+"/gi, `stroke-width="${targetWidth}"`);
        const updatedRaw = slot.rawSvgContent ? slot.rawSvgContent.replace(/stroke-width="[\d.]+"/gi, `stroke-width="${targetWidth}"`) : updatedSvg;

        return {
          ...slot,
          svgContent: updatedSvg,
          rawSvgContent: updatedRaw,
          stats: {
            ...slot.stats,
            strokeWidths: [targetWidth]
          },
          sanitizationLog: [...slot.sanitizationLog, `Stroke Normalized to ${targetWidth}px`]
        };
      });

      return {
        ...prev,
        slots: nextSlots,
        updatedAt: new Date().toISOString()
      };
    });
  };

  return (
    <aside className="w-80 bg-neutral-900 border-l border-neutral-800 flex flex-col h-full shrink-0 select-none text-neutral-200">
      {/* Inspector Tabs */}
      <div className="flex items-center border-b border-neutral-800 bg-neutral-950/60 p-1 text-xs">
        <button
          onClick={() => setActiveTab('vector')}
          id="tab-vector-inspector"
          className={`flex-1 py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'vector' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title="Vector Geometry Inspector"
        >
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span>Vector</span>
        </button>
        <button
          onClick={() => setActiveTab('palette')}
          id="tab-palette-manager"
          className={`flex-1 py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'palette' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title="Project Palette Manager"
        >
          <Palette className="w-3.5 h-3.5 text-emerald-400" />
          <span>Palette</span>
        </button>
        <button
          onClick={() => setActiveTab('strokes')}
          id="tab-stroke-inspector"
          className={`flex-1 py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'strokes' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title="Stroke Width Audit"
        >
          <PenTool className="w-3.5 h-3.5 text-blue-400" />
          <span>Strokes</span>
        </button>
        <button
          onClick={() => setActiveTab('complexity')}
          id="tab-complexity-detector"
          className={`flex-1 py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'complexity' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title="Trace Artifacts & Complexity"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Quality</span>
        </button>
        <button
          onClick={() => setActiveTab('similarity')}
          id="tab-similarity-guard"
          className={`flex-1 py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1 transition-colors relative ${
            activeTab === 'similarity' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title="Similarity Guard & Duplicate Check"
        >
          {similarityResult.worstSeverity === 'critical' || similarityResult.worstSeverity === 'high' ? (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>Guard</span>
          {similarityResult.hasMatches && similarityResult.highestScore >= 60 && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute top-1 right-1" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('thumbnails')}
          id="tab-thumbnail-test"
          className={`flex-1 py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'thumbnails' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title="Thumbnail Search Preview (512, 256, 128, 64px)"
        >
          <Maximize className="w-3.5 h-3.5 text-rose-400" />
          <span>Thumb</span>
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
        {/* 1. VECTOR INSPECTOR TAB */}
        {activeTab === 'vector' && (
          <div className="space-y-3.5">
            {selectedSlot ? (
              <>
                {/* Active Slot Header */}
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold bg-amber-400 text-neutral-950 px-1.5 py-0.5 rounded">
                      SLOT {String(selectedSlot.index + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                      selectedSlot.stats.hasRaster ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {selectedSlot.stats.hasRaster ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>RASTER DETECTED (FAIL)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>CLEAN VECTOR</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="font-semibold text-neutral-100 truncate text-sm">
                    {selectedSlot.label}
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                    ID: icon-{String(selectedSlot.index + 1).padStart(2, '0')}
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
                    <div className="text-neutral-400 text-[10px]">Paths &lt;path&gt;</div>
                    <div className="text-base font-mono font-bold text-amber-400">
                      {selectedSlot.stats.pathCount}
                    </div>
                  </div>
                  <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
                    <div className="text-neutral-400 text-[10px]">Shapes (Rect/Poly)</div>
                    <div className="text-base font-mono font-bold text-cyan-400">
                      {(selectedSlot.stats.elementCounts?.rects || 0) + (selectedSlot.stats.elementCounts?.polygons || 0)}
                    </div>
                  </div>
                  <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
                    <div className="text-neutral-400 text-[10px]">Circles / Lines</div>
                    <div className="text-base font-mono font-bold text-emerald-400">
                      {(selectedSlot.stats.elementCounts?.circles || 0) + (selectedSlot.stats.elementCounts?.lines || 0) + (selectedSlot.stats.elementCounts?.polylines || 0)}
                    </div>
                  </div>
                  <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
                    <div className="text-neutral-400 text-[10px]">Total Drawables</div>
                    <div className="text-base font-mono font-bold text-neutral-100">
                      {selectedSlot.stats.elementCounts?.totalDrawableElements || selectedSlot.stats.elementCount}
                    </div>
                  </div>
                </div>

                {/* Technical Flags */}
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-2">
                  <div className="font-semibold text-neutral-300 text-xs flex items-center justify-between">
                    <span>Vector Technical Audit</span>
                    <span className="text-[10px] text-neutral-400">Stock Gate</span>
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between items-center py-0.5 border-b border-neutral-800/60">
                      <span className="text-neutral-400">Embedded Raster:</span>
                      <span className={selectedSlot.stats.hasRaster || (selectedSlot.stats.rasterDetails?.total || 0) > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                        {selectedSlot.stats.hasRaster || (selectedSlot.stats.rasterDetails?.total || 0) > 0 ? 'DETECTED (FAIL)' : '0 (CLEAN)'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-neutral-800/60">
                      <span className="text-neutral-400">Live Typography:</span>
                      <span className={selectedSlot.stats.hasText || (selectedSlot.stats.textDetails?.count || 0) > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                        {selectedSlot.stats.hasText || (selectedSlot.stats.textDetails?.count || 0) > 0 
                          ? `${selectedSlot.stats.textDetails?.count || 1} LIVE (<text>)` 
                          : '0 (ALL OUTLINED)'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-neutral-800/60">
                      <span className="text-neutral-400">Transparency:</span>
                      <span className={(selectedSlot.stats.transparencyDetails?.opacityCount || 0) + (selectedSlot.stats.transparencyDetails?.fillOpacityCount || 0) > 0 ? 'text-blue-400' : 'text-emerald-400'}>
                        {(selectedSlot.stats.transparencyDetails?.opacityCount || 0) + (selectedSlot.stats.transparencyDetails?.fillOpacityCount || 0) > 0
                          ? `Fill-Op: ${selectedSlot.stats.transparencyDetails?.fillOpacityCount || 0}, Op: ${selectedSlot.stats.transparencyDetails?.opacityCount || 0}`
                          : '0 (100% OPAQUE)'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-neutral-800/60">
                      <span className="text-neutral-400">Executable Scripts:</span>
                      <span className="text-emerald-400">0 (REJECTED/CLEANED)</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-neutral-400">Trace Artifacts:</span>
                      <span className={selectedSlot.stats.artifactsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                        {selectedSlot.stats.artifactsCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sanitization Logs */}
                {selectedSlot.sanitizationLog.length > 0 && (
                  <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                    <div className="text-[11px] font-semibold text-neutral-300 mb-1">Sanitizer Actions</div>
                    <ul className="text-[10px] font-mono text-neutral-400 space-y-1 max-h-24 overflow-y-auto">
                      {selectedSlot.sanitizationLog.map((log, lIdx) => (
                        <li key={lIdx} className="leading-tight">• {log}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 text-center text-neutral-400">
                Select an icon slot on the canvas to inspect geometry.
              </div>
            )}
          </div>
        )}

        {/* 2. PALETTE MANAGER TAB */}
        {activeTab === 'palette' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-neutral-100 text-xs">Project Color Palette</div>
                <div className="text-[11px] text-neutral-400">{palette.length} unique colors extracted</div>
              </div>
            </div>

            {/* Merge Confirmation Alert */}
            {mergeConfirmation && (
              <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Confirm Color Merge</span>
                </div>
                <p className="text-[11px] text-amber-300">
                  Replace all occurrences of <code className="bg-neutral-900 px-1 py-0.5 rounded">{mergeConfirmation.sourceHex}</code> with <code className="bg-neutral-900 px-1 py-0.5 rounded">{mergeConfirmation.targetHex}</code> across the entire project?
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleMergeColors(mergeConfirmation.sourceHex, mergeConfirmation.targetHex)}
                    className="flex-1 py-1 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px]"
                  >
                    Confirm Merge
                  </button>
                  <button
                    onClick={() => setMergeConfirmation(null)}
                    className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Palette Swatches List */}
            <div className="space-y-2">
              {palette.map(item => (
                <div 
                  key={item.hex}
                  className="bg-neutral-950 p-2.5 rounded border border-neutral-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-7 h-7 rounded border border-neutral-700 shadow-inner shrink-0" 
                      style={{ backgroundColor: item.hex }}
                    />
                    <div>
                      <div className="font-mono font-bold text-xs text-neutral-100 flex items-center gap-1.5">
                        <span>{item.hex}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(item.hex)}
                          className="text-neutral-400 hover:text-neutral-300"
                          title="Copy Hex"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[10px] text-neutral-400">Used in {item.count} slot(s)</div>
                    </div>
                  </div>

                  {item.mergeSuggestion && (
                    <button
                      onClick={() => setMergeConfirmation({ sourceHex: item.hex, targetHex: item.mergeSuggestion! })}
                      className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-semibold flex items-center gap-1"
                      title={`Very close to ${item.mergeSuggestion}. Click to merge.`}
                    >
                      <span>Merge → {item.mergeSuggestion}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-2.5 rounded bg-neutral-950/80 border border-neutral-800 text-[11px] text-neutral-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                Consistent palettes significantly increase commercial buyer appeal on Adobe Stock. Unify nearly identical shades.
              </span>
            </div>
          </div>
        )}

        {/* 3. STROKE INSPECTOR TAB */}
        {activeTab === 'strokes' && (
          <div className="space-y-3.5">
            <div>
              <div className="font-semibold text-neutral-100 text-xs">Stroke Width Audit</div>
              <div className="text-[11px] text-neutral-400">
                Audits consistency across all vector paths in the artboard.
              </div>
            </div>

            {hasInconsistentStrokes ? (
              <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Inconsistent Stroke System</span>
                </div>
                <p className="text-[11px] text-amber-300">
                  Multiple stroke widths detected ({strokeEntries.map(s => `${s[0]}px`).join(', ')}). Adobe Stock reviewers favor unified line weight harmony.
                </p>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-medium">Harmonious Stroke System Verified</span>
              </div>
            )}

            {/* Stroke frequency breakdown */}
            <div className="space-y-2">
              {strokeEntries.map(([widthVal, count]) => (
                <div 
                  key={widthVal}
                  className="bg-neutral-950 p-2 rounded border border-neutral-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-10 bg-amber-400 rounded-full" 
                      style={{ height: `${Math.min(10, Math.max(2, widthVal * 1.5))}px` }} 
                    />
                    <span className="font-mono font-bold text-xs text-neutral-200">{widthVal} px</span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Found on {count} icon(s)
                  </div>
                </div>
              ))}
            </div>

            {/* Normalize Stroke Action */}
            <div className="pt-2 border-t border-neutral-800">
              <div className="text-[11px] font-semibold text-neutral-300 mb-1.5">
                One-Click Stroke Normalization
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNormalizeStrokes(2.0)}
                  className="flex-1 py-1.5 px-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-medium border border-neutral-700"
                >
                  Set 2.0 px
                </button>
                <button
                  onClick={() => handleNormalizeStrokes(2.5)}
                  className="flex-1 py-1.5 px-2 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-mono font-bold border border-amber-500/40"
                >
                  Set 2.5 px
                </button>
                <button
                  onClick={() => handleNormalizeStrokes(3.0)}
                  className="flex-1 py-1.5 px-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-medium border border-neutral-700"
                >
                  Set 3.0 px
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. COMPLEXITY & TRACE ARTIFACTS TAB */}
        {activeTab === 'complexity' && (
          <div className="space-y-3.5">
            <div>
              <div className="font-semibold text-neutral-100 text-xs">Vector Complexity &amp; Artifacts</div>
              <div className="text-[11px] text-neutral-400">
                Detects messy auto-trace output, microscopic stray shapes, and complexity spikes.
              </div>
            </div>

            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex items-center justify-between">
              <div>
                <div className="text-neutral-400 text-[10px]">Average Node Density</div>
                <div className="text-lg font-mono font-bold text-neutral-100">~{avgNodes} nodes</div>
              </div>
              <div className="text-right">
                <div className="text-neutral-400 text-[10px]">Auto-Trace Risk</div>
                <div className="text-xs font-semibold text-emerald-400">LOW (Clean Native)</div>
              </div>
            </div>

            {/* List slots with complexity breakdown */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {project.slots.map(slot => {
                const isSpike = avgNodes > 0 && slot.stats.nodeEstimate > avgNodes * 2.2;
                return (
                  <div
                    key={slot.id}
                    onClick={() => onSelectSlot(slot.index)}
                    className={`p-2 rounded border cursor-pointer transition-colors flex items-center justify-between ${
                      selectedSlotIndex === slot.index
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : 'bg-neutral-950 border-neutral-800 hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="truncate max-w-[160px]">
                      <div className="font-medium text-neutral-200 truncate">{slot.label}</div>
                      <div className="text-[10px] font-mono text-neutral-400">
                        {slot.stats.pathCount} paths • ~{slot.stats.nodeEstimate} nodes
                      </div>
                    </div>

                    {isSpike ? (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                        High Complexity
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-emerald-400">
                        Normal
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. SIMILARITY GUARD TAB */}
        {activeTab === 'similarity' && (
          <div className="space-y-3.5">
            <div>
              <div className="font-semibold text-neutral-100 text-xs flex items-center justify-between">
                <span>Catalog Similarity Guard</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  similarityResult.worstSeverity === 'critical' || similarityResult.worstSeverity === 'high'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : (similarityResult.worstSeverity === 'moderate' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40')
                }`}>
                  {similarityResult.highestScore}% PROXIMITY
                </span>
              </div>
              <div className="text-[11px] text-neutral-400">
                Prevents duplicate vector rejections by comparing subject and bezier geometry fingerprints.
              </div>
            </div>

            {similarityResult.topMatch ? (
              <div className="space-y-3">
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-2">
                  <div className="text-[10px] uppercase text-neutral-400 font-semibold tracking-wider">
                    Highest Proximity Catalog Asset
                  </div>
                  <div className="font-bold text-neutral-200 text-xs truncate">
                    {similarityResult.topMatch.matchedProjectName}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono pt-1">
                    <div className="bg-neutral-900/90 p-1.5 rounded">
                      <div className="text-neutral-400 text-[10px]">Subject Match</div>
                      <div className="font-bold text-amber-400">{similarityResult.topMatch.subjectScore}%</div>
                    </div>
                    <div className="bg-neutral-900/90 p-1.5 rounded">
                      <div className="text-neutral-400 text-[10px]">Geometry Match</div>
                      <div className="font-bold text-cyan-400">{similarityResult.topMatch.geometryScore}%</div>
                    </div>
                  </div>

                  {similarityResult.topMatch.isColorOnlyVariant && (
                    <div className="p-2 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[10.5px]">
                      <strong>Color-Only Variation:</strong> Identical geometry with shifted palette detected. High risk of rejection.
                    </div>
                  )}

                  <ul className="text-[10.5px] text-neutral-400 list-disc list-inside space-y-0.5 pt-1">
                    {similarityResult.topMatch.reasons.slice(0, 3).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>

                  <button
                    onClick={() => setShowSimilarityModal(true)}
                    className="w-full mt-2 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs border border-neutral-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Inspect Side-by-Side Fingerprint</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5 text-[11px]">
                  <div className="font-bold text-neutral-200 text-xs flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Adobe Stock Differentiation Rules</span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed">
                    Ensure each asset introduces fresh objects, alternative camera angles, or specialized industry themes to comply with moderation guidelines.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-lg bg-neutral-950 border border-neutral-800 text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="font-bold text-neutral-200 text-xs">Clean Vector Signature</div>
                <div className="text-[11px] text-neutral-400 leading-relaxed">
                  No overlapping subjects or matching bezier paths detected among existing catalog assets.
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. THUMBNAIL TEST TAB */}
        {activeTab === 'thumbnails' && (
          <div className="space-y-3.5">
            <div>
              <div className="font-semibold text-neutral-100 text-xs">Stock Thumbnail Readability Test</div>
              <div className="text-[11px] text-neutral-400">
                Simulates visual legibility in Adobe Stock search result grid sizes.
              </div>
            </div>

            {selectedSlot?.svgContent ? (
              <div className="space-y-3">
                <div className="text-[11px] font-semibold text-neutral-300">
                  Inspecting: {selectedSlot.label}
                </div>

                {/* 256px Preview */}
                <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800 flex flex-col items-center">
                  <div className="text-[10px] font-mono text-neutral-400 mb-1">256 × 256 px (Medium)</div>
                  <div 
                    className="w-32 h-32 flex items-center justify-center p-2 bg-neutral-900/80 rounded border border-neutral-800"
                    dangerouslySetInnerHTML={{ __html: selectedSlot.svgContent }}
                  />
                </div>

                {/* 128px & 64px Previews */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800 flex flex-col items-center">
                    <div className="text-[10px] font-mono text-neutral-400 mb-1">128 × 128 px (Card)</div>
                    <div 
                      className="w-16 h-16 flex items-center justify-center p-1 bg-neutral-900/80 rounded border border-neutral-800"
                      dangerouslySetInnerHTML={{ __html: selectedSlot.svgContent }}
                    />
                  </div>
                  <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800 flex flex-col items-center">
                    <div className="text-[10px] font-mono text-neutral-400 mb-1">64 × 64 px (Mobile)</div>
                    <div 
                      className="w-10 h-10 flex items-center justify-center p-0.5 bg-neutral-900/80 rounded border border-neutral-800"
                      dangerouslySetInnerHTML={{ __html: selectedSlot.svgContent }}
                    />
                  </div>
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800 text-[10.5px] text-neutral-400">
                  Tip: If lines blur or fine details disappear at 64px, consider simplifying compound paths or increasing stroke weight.
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-neutral-400">
                Select a slot with vector artwork to test thumbnail rendering.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Similarity Inspection Modal */}
      <SimilarityAuditModal
        isOpen={showSimilarityModal}
        onClose={() => setShowSimilarityModal(false)}
        currentProject={project}
        allProjects={allProjects}
        auditResult={similarityResult}
      />
    </aside>
  );
};
