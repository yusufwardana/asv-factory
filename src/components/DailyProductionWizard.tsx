import React, { useState } from 'react';
import { 
  Flame, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  Download, 
  RotateCcw,
  Check
} from 'lucide-react';
import { Project, PreflightResult } from '../types';

interface DailyProductionWizardProps {
  project: Project;
  preflight: PreflightResult;
  onOpenWorkspace: () => void;
  onOpenPreflight: () => void;
  onOpenMetadata: () => void;
  onOpenExport: () => void;
  onAutoNormalize: () => void;
  onNextProject: () => void;
}

export const DailyProductionWizard: React.FC<DailyProductionWizardProps> = ({
  project,
  preflight,
  onOpenWorkspace,
  onOpenPreflight,
  onOpenMetadata,
  onOpenExport,
  onAutoNormalize,
  onNextProject,
}) => {
  const steps = [
    {
      id: 1,
      title: 'Vector Artboard Assembly',
      desc: `${project.slots.filter(s => s.svgContent).length} of ${project.slots.length} icon slots loaded in canvas.`,
      status: project.slots.some(s => s.svgContent) ? 'done' : 'pending',
      actionLabel: 'Open Canvas Workspace',
      action: onOpenWorkspace
    },
    {
      id: 2,
      title: 'Optical Weight Normalization',
      desc: 'Ensure consistent visual gravity and balance across all 16 slots without distorting geometric shapes.',
      status: 'done',
      actionLabel: 'Re-run Auto Normalize',
      action: onAutoNormalize
    },
    {
      id: 3,
      title: '10-Point Vector Preflight Gate',
      desc: `Status: ${preflight.overall} (${preflight.passCount} passed, ${preflight.failCount} fails).`,
      status: preflight.overall === 'PASS' ? 'done' : (preflight.failCount > 0 ? 'fail' : 'warning'),
      actionLabel: 'Run Full Preflight Audit',
      action: onOpenPreflight
    },
    {
      id: 4,
      title: 'Stock Metadata & Keywords',
      desc: `${project.metadata.keywords.length} of 50 keywords created, Title: "${project.metadata.title.slice(0, 30)}..."`,
      status: project.metadata.keywords.length >= 25 ? 'done' : 'warning',
      actionLabel: 'Open Metadata Studio',
      action: onOpenMetadata
    },
    {
      id: 5,
      title: 'Clean Stock SVG Package Export',
      desc: project.status === 'EXPORTED' ? 'Complete package exported (.svg, .json, .txt).' : 'Pending download.',
      status: project.status === 'EXPORTED' ? 'done' : 'pending',
      actionLabel: 'Export Stock SVG & ZIP',
      action: onOpenExport
    }
  ];

  const allCompleted = steps.every(s => s.status === 'done');

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-950 text-neutral-200 select-none">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-neutral-900 p-6 rounded-xl border border-amber-500/30 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500 text-neutral-950">
              <Flame className="w-5 h-5 fill-neutral-950" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
              FOCUS PRODUCTION MODE • TARGET 3 ASSETS/DAY
            </span>
          </div>
          <span className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-xs font-mono text-neutral-300">
            CURRENT ASSET: {project.name}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-neutral-100">
          Daily Production Flow: Concept to Stock Export
        </h1>
        <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
          Follow the sequential assembly checklist to prepare high-converting, compliant stock assets with zero moderation friction.
        </p>
      </div>

      {/* Checklist Steps */}
      <div className="bg-neutral-900/80 rounded-xl border border-neutral-800 p-5 space-y-4">
        <h2 className="text-sm font-bold text-neutral-100 uppercase tracking-wide">
          Asset Production Sequence ({steps.filter(s => s.status === 'done').length} / {steps.length} Complete)
        </h2>

        <div className="space-y-3">
          {steps.map((s, idx) => (
            <div
              key={s.id}
              className={`p-4 rounded-lg border flex items-center justify-between gap-4 transition-all ${
                s.status === 'done'
                  ? 'bg-neutral-950/90 border-neutral-800 text-neutral-200'
                  : s.status === 'fail'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                  s.status === 'done' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                }`}>
                  {s.status === 'done' ? <Check className="w-4 h-4" /> : idx + 1}
                </div>

                <div>
                  <div className="font-bold text-sm text-neutral-100">{s.title}</div>
                  <div className="text-xs text-neutral-400 mt-0.5">{s.desc}</div>
                </div>
              </div>

              <button
                onClick={s.action}
                className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold shrink-0 transition-colors"
              >
                {s.actionLabel}
              </button>
            </div>
          ))}
        </div>

        {/* Completion Footer */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-neutral-400">
            {allCompleted ? 'This asset is fully prepared and exported.' : 'Complete all steps to advance to next asset.'}
          </div>

          <button
            onClick={onNextProject}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-xs shadow-md transition-colors"
          >
            <span>Proceed to Next Daily Asset</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
