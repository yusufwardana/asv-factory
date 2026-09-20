import React from 'react';
import { 
  FileBox, 
  Grid3X3, 
  Sparkles, 
  ArrowRight, 
  Layers, 
  Check, 
  Box, 
  Repeat,
  CheckCircle2
} from 'lucide-react';
import { Project, AssetType } from '../types';

interface TemplatesViewProps {
  onApplyTemplate: (template: {
    name: string;
    assetType: AssetType;
    width: number;
    height: number;
    gridRows: number;
    gridCols: number;
    safePadding: number;
    style: string;
  }) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  onApplyTemplate,
}) => {
  const templates = [
    {
      id: 'icon-sheet-16-outline',
      name: '16 Icon Clean Outline Sheet',
      assetType: 'icon-sheet' as AssetType,
      width: 4000,
      height: 4000,
      gridRows: 4,
      gridCols: 4,
      safePadding: 80,
      style: 'Monoline outline stroke (2.5px standard)',
      desc: 'The most popular, high-commercial-demand layout for Adobe Stock icon categories.',
      recommended: true,
      features: ['4x4 Grid', '4000×4000 Artboard', '80px Safe Margin', 'Optical Weight Normalized']
    },
    {
      id: 'icon-sheet-16-flat',
      name: '16 Icon Flat Color & Fill Sheet',
      assetType: 'icon-sheet' as AssetType,
      width: 4000,
      height: 4000,
      gridRows: 4,
      gridCols: 4,
      safePadding: 80,
      style: 'Flat 2-color / 3-color palette harmony',
      desc: 'Ideal for UI/UX elements, web dashboards, and mobile application graphics.',
      recommended: false,
      features: ['4x4 Grid', 'Harmonized Hex Palette', 'Clean Vector Fills', 'No Stroke Misalignment']
    },
    {
      id: 'icon-sheet-9-minimal',
      name: '9 Icon Minimal Grid',
      assetType: 'icon-sheet' as AssetType,
      width: 3000,
      height: 3000,
      gridRows: 3,
      gridCols: 3,
      safePadding: 90,
      style: 'High-contrast bold glyphs',
      desc: 'Focused 3x3 layout with extra spacious negative margins for editorial presentation.',
      recommended: false,
      features: ['3x3 Grid', '3000×3000 Artboard', 'High Negative Space', 'Large Scale Previews']
    },
    {
      id: 'single-hero-icon',
      name: 'Single Standalone Vector Asset',
      assetType: 'single-icon' as AssetType,
      width: 2000,
      height: 2000,
      gridRows: 1,
      gridCols: 1,
      safePadding: 100,
      style: 'Detailed standalone vector illustration or badge',
      desc: 'Standalone hero vector artboard with centered alignment and generous outer margins.',
      recommended: false,
      features: ['1×1 Artboard', '2000×2000 px', 'Precision Bounding Box', 'Direct Standalone Export']
    },
    {
      id: 'seamless-pattern',
      name: 'Seamless Vector Pattern Tile',
      assetType: 'pattern' as AssetType,
      width: 2000,
      height: 2000,
      gridRows: 1,
      gridCols: 1,
      safePadding: 0,
      style: 'Seamless geometric or organic pattern repeat',
      desc: 'Designed with continuous boundary repeats for packaging, textiles, and background wallpapers.',
      recommended: false,
      features: ['2000×2000 px Tile', '1x/2x/4x Repeat Inspector', 'Zero Boundary Seams', 'Clean Path Exports']
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-950 text-neutral-200 select-none">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-neutral-900 to-neutral-900/60 p-5 rounded-xl border border-neutral-800 shadow-md">
        <div className="flex items-center gap-2 mb-1">
          <FileBox className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            PRESET ENGINE
          </span>
        </div>
        <h1 className="text-xl font-bold text-neutral-100">
          Stock-Optimized Artboard &amp; Grid Templates
        </h1>
        <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
          Pre-configured to Adobe Stock standards (4000×4000px, safe margins, clean coordinate systems) for instant assembly and zero layout rejection risk.
        </p>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(tmpl => (
          <div
            key={tmpl.id}
            className={`bg-neutral-900/90 rounded-xl border p-5 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-all ${
              tmpl.recommended ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-neutral-800'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300">
                  {tmpl.width} × {tmpl.height} px
                </span>
                {tmpl.recommended && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    MOST POPULAR
                  </span>
                )}
              </div>

              <div>
                <h2 className="font-bold text-sm text-neutral-100">{tmpl.name}</h2>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  {tmpl.desc}
                </p>
              </div>

              <div className="space-y-1 pt-1">
                {tmpl.features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-[11px] text-neutral-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onApplyTemplate({
                name: tmpl.name,
                assetType: tmpl.assetType,
                width: tmpl.width,
                height: tmpl.height,
                gridRows: tmpl.gridRows,
                gridCols: tmpl.gridCols,
                safePadding: tmpl.safePadding,
                style: tmpl.style
              })}
              className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs border border-neutral-700 flex items-center justify-center gap-2 transition-colors hover:border-amber-500/40"
            >
              <span>Use This Template</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
