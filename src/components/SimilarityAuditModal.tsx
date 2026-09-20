import React from 'react';
import { 
  X, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  FileText, 
  Palette, 
  Cpu, 
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Project } from '../types';
import { SimilarityAuditResult, SimilarityReportItem } from '../lib/similarityGuard';

interface SimilarityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project;
  allProjects: Project[];
  auditResult: SimilarityAuditResult;
  onOpenProject?: (projectId: string) => void;
}

export const SimilarityAuditModal: React.FC<SimilarityAuditModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  allProjects,
  auditResult,
  onOpenProject
}) => {
  if (!isOpen) return null;

  const topMatch = auditResult.topMatch;
  const matchedProject = topMatch ? allProjects.find(p => p.id === topMatch.matchedProjectId) : null;

  const getSeverityBadge = (severity: SimilarityReportItem['severity']) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" />
            CRITICAL DUPLICATE RISK (REJECTION LIKELY)
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            HIGH SIMILARITY (SUBSTANTIVE CHANGE REQUIRED)
          </span>
        );
      case 'moderate':
        return (
          <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5">
            <Info className="w-4 h-4" />
            MODERATE SIMILARITY (REVIEW RECOMMENDED)
          </span>
        );
      case 'low':
      case 'clean':
      default:
        return (
          <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            CLEAN &amp; DIFFERENTIATED (SAFE TO SUBMIT)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-neutral-950">
              <ShieldAlert className="w-5 h-5 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-neutral-100 uppercase tracking-wide">
                  Similarity Guard Inspection
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                  IndexedDB Catalog Scan
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Vector geometry &amp; subject fingerprint comparison across {auditResult.scannedProjectsCount} saved catalog asset(s).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Top Level Summary Banner */}
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
                Highest Catalog Proximity
              </div>
              <div className="text-2xl font-black font-mono mt-0.5 flex items-baseline gap-2">
                <span className={topMatch && topMatch.overallScore >= 70 ? 'text-rose-400' : (topMatch && topMatch.overallScore >= 50 ? 'text-amber-400' : 'text-emerald-400')}>
                  {auditResult.highestScore}%
                </span>
                <span className="text-xs text-neutral-400 font-normal">
                  match with {topMatch ? topMatch.matchedProjectName : 'None'}
                </span>
              </div>
            </div>

            {getSeverityBadge(auditResult.worstSeverity)}
          </div>

          {/* Special Flags Alert */}
          {auditResult.flags.isColorOnlyVariant && (
            <div className="p-3.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Adobe Stock Policy Alert: Prohibited Color-Only Variation</span>
              </div>
              <p className="text-[11px] text-rose-300">
                The vector bezier geometry is nearly identical to an existing project, but with an altered color palette. 
                Adobe Stock moderation strictly rejects simple recolored versions under the <em>"Similar Content"</em> policy.
              </p>
            </div>
          )}

          {auditResult.flags.hasKeywordCannibalization && (
            <div className="p-3.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
                <Info className="w-4 h-4" />
                <span>Keyword Overlap / Cannibalization Risk (&gt;70% Shared Terms)</span>
              </div>
              <p className="text-[11px] text-amber-300">
                Assets targeting the exact same search terms compete against each other in the Adobe Stock search algorithm and may be flagged as spam tags.
              </p>
            </div>
          )}

          {/* Side-by-Side Asset Comparison */}
          {topMatch && matchedProject && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Asset Fingerprint Comparison
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Current Project Card */}
                <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-100 truncate text-xs">{currentProject.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      CURRENT
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono text-neutral-400">
                    <div className="bg-neutral-900/80 p-2 rounded">
                      <div>Active Slots</div>
                      <div className="font-bold text-neutral-200 text-xs">
                        {currentProject.slots.filter(s => s.svgContent).length}
                      </div>
                    </div>
                    <div className="bg-neutral-900/80 p-2 rounded">
                      <div>Estimated Nodes</div>
                      <div className="font-bold text-neutral-200 text-xs">
                        {currentProject.slots.reduce((acc, s) => acc + (s.stats?.nodeEstimate || 0), 0)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="text-neutral-400">Topic: <span className="text-neutral-200 font-medium">{currentProject.topic || 'N/A'}</span></div>
                    <div className="text-neutral-400">Keywords ({currentProject.metadata.keywords.length}):</div>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                      {currentProject.metadata.keywords.slice(0, 10).map((k, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px]">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Matched Project Card */}
                <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-100 truncate text-xs">{matchedProject.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                      MATCHED
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono text-neutral-400">
                    <div className="bg-neutral-900/80 p-2 rounded">
                      <div>Active Slots</div>
                      <div className="font-bold text-neutral-200 text-xs">
                        {matchedProject.slots.filter(s => s.svgContent).length}
                      </div>
                    </div>
                    <div className="bg-neutral-900/80 p-2 rounded">
                      <div>Estimated Nodes</div>
                      <div className="font-bold text-neutral-200 text-xs">
                        {matchedProject.slots.reduce((acc, s) => acc + (s.stats?.nodeEstimate || 0), 0)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="text-neutral-400">Topic: <span className="text-neutral-200 font-medium">{matchedProject.topic || 'N/A'}</span></div>
                    <div className="text-neutral-400">Keywords ({matchedProject.metadata.keywords.length}):</div>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                      {matchedProject.metadata.keywords.slice(0, 10).map((k, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px]">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metric Breakdown Progress Gauges */}
          {topMatch && (
            <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-3">
              <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Detailed Fingerprint Breakdown
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subject Metrics */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-200 text-xs">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Subject &amp; Metadata Proximity ({topMatch.subjectScore}%)</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div>
                      <div className="flex justify-between text-neutral-400 mb-1">
                        <span>Keyword Jaccard Overlap</span>
                        <span className="font-mono text-neutral-200">{topMatch.metricsBreakdown.keywordOverlapPct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-400 rounded-full" 
                          style={{ width: `${topMatch.metricsBreakdown.keywordOverlapPct}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-neutral-400 mb-1">
                        <span>Commercial Title Overlap</span>
                        <span className="font-mono text-neutral-200">{topMatch.metricsBreakdown.titleSimilarity}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-400 rounded-full" 
                          style={{ width: `${topMatch.metricsBreakdown.titleSimilarity}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Geometry Metrics */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-200 text-xs">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Vector Geometry Proximity ({topMatch.geometryScore}%)</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div>
                      <div className="flex justify-between text-neutral-400 mb-1">
                        <span>Path Command Signature</span>
                        <span className="font-mono text-neutral-200">{topMatch.metricsBreakdown.pathSignatureSimilarity}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-400 rounded-full" 
                          style={{ width: `${topMatch.metricsBreakdown.pathSignatureSimilarity}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-neutral-400 mb-1">
                        <span>Node Count Topology</span>
                        <span className="font-mono text-neutral-200">{topMatch.metricsBreakdown.topologySimilarity}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-400 rounded-full" 
                          style={{ width: `${topMatch.metricsBreakdown.topologySimilarity}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actionable Differentiation Recommendations */}
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-2">
            <div className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Adobe Stock Contributor Guidelines: Substantive Differentiation</span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Adobe Stock guidelines state that each vector file in your portfolio must provide unique value to the customer. 
              Submitting variations that only differ in color, minor line weight, or background fill can lead to mass rejections and portfolio review suspension.
            </p>

            <ul className="text-[11px] text-neutral-300 space-y-1.5 list-disc list-inside pt-1">
              <li><strong>Structural Composition:</strong> Modify the objects inside the icons (e.g. from residential solar panels to commercial utility-scale solar farms).</li>
              <li><strong>Visual Perspective:</strong> Change angles from front-facing 2D flat to isometric 3D or dual-tone outline.</li>
              <li><strong>Metadata Specificity:</strong> Differentiate keywords by focusing on specific customer use cases (e.g., &quot;solar installer invoice&quot; vs &quot;home energy audit&quot;).</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="text-xs text-neutral-400 font-mono">
            {auditResult.scannedProjectsCount} projects scanned in local IndexedDB
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors"
          >
            Acknowledge &amp; Return
          </button>
        </div>
      </div>
    </div>
  );
};
