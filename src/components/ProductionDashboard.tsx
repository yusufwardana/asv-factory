import React from 'react';
import { 
  BarChart3, 
  Target, 
  CheckCircle2, 
  TrendingUp, 
  Flame, 
  Sparkles, 
  Clock, 
  Layers, 
  CheckCheck,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { Project, DailyMetrics } from '../types';

interface ProductionDashboardProps {
  projects: Project[];
  metrics: DailyMetrics;
  onStartProductionDay: () => void;
  onOpenProject: (projectId: string) => void;
  onNewProject: () => void;
}

export const ProductionDashboard: React.FC<ProductionDashboardProps> = ({
  projects,
  metrics,
  onStartProductionDay,
  onOpenProject,
  onNewProject,
}) => {
  // Compute pipeline distribution
  const statusCounts = {
    idea: projects.filter(p => p.status === 'IDEA').length,
    production: projects.filter(p => ['GENERATING', 'VECTOR CLEANUP', 'ASSEMBLY'].includes(p.status)).length,
    qc: projects.filter(p => p.status === 'QC').length,
    ready: projects.filter(p => p.status === 'READY').length,
    exported: projects.filter(p => p.status === 'EXPORTED').length,
    submitted: projects.filter(p => p.status === 'SUBMITTED').length,
    accepted: projects.filter(p => p.status === 'ACCEPTED').length,
    rejected: projects.filter(p => p.status === 'REJECTED').length,
  };

  const totalDecided = metrics.accepted + metrics.rejected;
  const acceptanceRate = totalDecided > 0 ? Math.round((metrics.accepted / totalDecided) * 100) : 80;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-950 text-neutral-200 select-none">
      {/* Top Banner & Daily Goal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-neutral-900 to-neutral-900/60 p-5 rounded-xl border border-neutral-800 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              DAILY PRODUCTION TARGET
            </span>
            <span className="text-xs text-neutral-400">
              Quality-First Consistency
            </span>
          </div>
          <h1 className="text-xl font-bold text-neutral-100">
            {metrics.ready} of {metrics.target} Quality Assets Ready Today
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
            Avoid spamming hundreds of minor variations. Consistent, well-structured vector assets with 100% technical preflight compliance produce sustainable royalty income.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onStartProductionDay}
            id="btn-start-production-day"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-xs shadow-lg transition-all active:scale-95 shrink-0"
          >
            <Flame className="w-4 h-4 fill-neutral-950" />
            <span>START PRODUCTION DAY</span>
          </button>
          <button
            onClick={onNewProject}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs border border-neutral-700 transition-colors shrink-0"
          >
            <span>+ New Project</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Assets Started</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-neutral-100">{metrics.started}</div>
          <div className="text-[11px] text-neutral-400">Active projects in progress</div>
        </div>

        <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Preflight Passed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400">{metrics.qcPassed}</div>
          <div className="text-[11px] text-neutral-400">100% technical vector clean</div>
        </div>

        <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Stock Ready</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-amber-300">{metrics.ready}</div>
          <div className="text-[11px] text-neutral-400">Human approved for export</div>
        </div>

        <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Acceptance Rate</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-purple-400">{acceptanceRate}%</div>
          <div className="text-[11px] text-neutral-400">{metrics.accepted} accepted / {metrics.rejected} rejected</div>
        </div>
      </div>

      {/* Production Pipeline Overview (Section 4) */}
      <div className="bg-neutral-900/80 p-5 rounded-xl border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-100 uppercase tracking-wide">
              Production Pipeline Tracker
            </h2>
            <p className="text-xs text-neutral-400">
              Real-time progress of stock assets across assembly and moderation gates.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">
            {projects.length} Total Assets Tracked
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center text-xs">
          {[
            { label: 'Idea', count: statusCounts.idea, color: 'text-neutral-400 bg-neutral-950 border-neutral-800' },
            { label: 'Assembly', count: statusCounts.production, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
            { label: 'QC', count: statusCounts.qc, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
            { label: 'Ready', count: statusCounts.ready, color: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
            { label: 'Exported', count: statusCounts.exported, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
            { label: 'Submitted', count: statusCounts.submitted, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
            { label: 'Accepted', count: statusCounts.accepted, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
            { label: 'Rejected', count: statusCounts.rejected, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
          ].map(stage => (
            <div key={stage.label} className={`p-2.5 rounded-lg border ${stage.color}`}>
              <div className="text-[10px] font-mono uppercase opacity-75">{stage.label}</div>
              <div className="text-lg font-mono font-bold mt-0.5">{stage.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Projects List */}
      <div className="bg-neutral-900/80 p-5 rounded-xl border border-neutral-800 space-y-3">
        <h2 className="text-sm font-bold text-neutral-100 uppercase tracking-wide">
          Active Stock Projects
        </h2>

        <div className="space-y-2">
          {projects.map(proj => (
            <div
              key={proj.id}
              onClick={() => onOpenProject(proj.id)}
              className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 hover:border-neutral-700 cursor-pointer flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center font-bold text-neutral-300 font-mono text-xs">
                  {proj.slots.filter(s => s.svgContent).length}v
                </div>
                <div>
                  <div className="font-semibold text-neutral-100 text-xs">{proj.name}</div>
                  <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                    <span>{proj.niche}</span>
                    <span>•</span>
                    <span className="font-mono">{proj.canvasConfig.width}×{proj.canvasConfig.height}</span>
                    <span>•</span>
                    <span>{proj.metadata.keywords.length} keywords</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono ${
                  proj.status === 'READY'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : proj.status === 'EXPORTED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-neutral-800 text-neutral-300'
                }`}>
                  {proj.status}
                </span>
                <ArrowRight className="w-4 h-4 text-neutral-500" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
