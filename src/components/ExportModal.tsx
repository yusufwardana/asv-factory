import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  FileCheck, 
  ShieldAlert, 
  ShieldCheck,
  FileCode, 
  CheckCircle2, 
  Archive, 
  FileText,
  AlertTriangle,
  FolderDown,
  Info,
  Layers,
  Cpu,
  ArrowRight
} from 'lucide-react';
import JSZip from 'jszip';
import confetti from 'canvas-confetti';
import { Project, PreflightResult } from '../types';
import { generateStandaloneStockSvg, generateQCReport, generateMetadataText } from '../lib/svgUtils';
import { 
  checkProjectSimilarity, 
  checkProjectSimilarityFromDB, 
  SimilarityAuditResult 
} from '../lib/similarityGuard';
import { SimilarityAuditModal } from './SimilarityAuditModal';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  allProjects: Project[];
  preflight: PreflightResult;
  onUpdateProject: (updater: (prev: Project) => Project) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  allProjects,
  preflight,
  onUpdateProject,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);
  const [showDetailedAudit, setShowDetailedAudit] = useState(false);
  const [overrideAcknowledged, setOverrideAcknowledged] = useState(false);

  // Similarity state initialized with in-memory check, updated via IndexedDB
  const [auditResult, setAuditResult] = useState<SimilarityAuditResult>(() => 
    checkProjectSimilarity(project, allProjects)
  );

  useEffect(() => {
    if (isOpen) {
      // Re-run against live IndexedDB database
      checkProjectSimilarityFromDB(project).then(res => {
        setAuditResult(res);
      });
      setOverrideAcknowledged(false);
      setExportedSuccess(false);
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  // Generate standardized filename
  const baseSlug = (project.metadata.title || project.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const svgFilename = `${baseSlug}.svg`;
  const qcFilename = `${baseSlug}-qc-report.json`;
  const metaFilename = `${baseSlug}-metadata.txt`;
  const zipFilename = `${baseSlug}-stock-package.zip`;

  const topMatch = auditResult.topMatch;
  const isHighRisk = auditResult.worstSeverity === 'critical' || auditResult.worstSeverity === 'high' || auditResult.flags.isColorOnlyVariant;
  const canExport = !isHighRisk || overrideAcknowledged;

  // Clean standalone SVG
  const standaloneSvg = generateStandaloneStockSvg(project);
  const qcReport = generateQCReport(project, preflight.items);
  const metadataText = generateMetadataText(project);

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 1. Download Standalone SVG
  const handleDownloadSvgOnly = () => {
    if (!canExport) return;
    downloadFile(standaloneSvg, svgFilename, 'image/svg+xml');
    triggerSuccess();
  };

  // 2. Download QC Report JSON
  const handleDownloadQcReport = () => {
    downloadFile(JSON.stringify(qcReport, null, 2), qcFilename, 'application/json');
  };

  // 3. Download Metadata TXT
  const handleDownloadMetadataTxt = () => {
    downloadFile(metadataText, metaFilename, 'text/plain');
  };

  // 4. Download Complete Package (ZIP)
  const handleDownloadPackageZip = async () => {
    if (!canExport) return;
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(baseSlug) || zip;

      // Add Stock SVG
      folder.file(svgFilename, standaloneSvg);

      // Add QC Report JSON
      folder.file(qcFilename, JSON.stringify(qcReport, null, 2));

      // Add Metadata TXT
      folder.file(metaFilename, metadataText);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipFilename;
      a.click();
      URL.revokeObjectURL(url);

      triggerSuccess();
    } catch (err) {
      console.error('Failed to generate ZIP package', err);
    } finally {
      setIsExporting(false);
    }
  };

  const triggerSuccess = () => {
    setExportedSuccess(true);
    onUpdateProject(prev => ({
      ...prev,
      status: 'EXPORTED',
      updatedAt: new Date().toISOString()
    }));
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {}
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-neutral-200 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-neutral-950">
                <Download className="w-5 h-5 font-bold" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-neutral-100 uppercase tracking-wide">
                  Export Stock Vector Package
                </h2>
                <p className="text-xs text-neutral-400">
                  Pre-export technical validation &amp; catalog similarity gate.
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

          {/* Content Body */}
          <div className="p-5 space-y-4 text-xs overflow-y-auto">
            {/* SIMILARITY GUARD PRE-EXPORT AUDIT BANNER */}
            {auditResult.hasMatches && topMatch ? (
              <div className={`p-4 rounded-lg border space-y-2.5 ${
                isHighRisk 
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-200' 
                  : (auditResult.worstSeverity === 'moderate' ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-neutral-950 border-neutral-800 text-neutral-300')
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    {isHighRisk ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span>
                      Similarity Guard: {topMatch.overallScore}% Match with &quot;{topMatch.matchedProjectName}&quot;
                    </span>
                  </div>

                  <button
                    onClick={() => setShowDetailedAudit(true)}
                    className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold border border-neutral-700 transition-colors shrink-0"
                  >
                    Inspect Fingerprint Match
                  </button>
                </div>

                {/* Score Breakdown Chips */}
                <div className="flex flex-wrap gap-2 text-[10.5px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-amber-400" />
                    Subject: {topMatch.subjectScore}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-cyan-400" />
                    Geometry: {topMatch.geometryScore}%
                  </span>
                  {topMatch.isColorOnlyVariant && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold">
                      COLOR-ONLY VARIATION DETECTED
                    </span>
                  )}
                  {topMatch.metricsBreakdown.keywordOverlapPct >= 65 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300">
                      {topMatch.metricsBreakdown.keywordOverlapPct}% Keyword Overlap
                    </span>
                  )}
                </div>

                {/* Reasons List */}
                <ul className="text-[11px] list-disc list-inside space-y-0.5 opacity-90">
                  {topMatch.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>

                {/* Actionable Rejection Prevention Warning */}
                {isHighRisk && (
                  <div className="pt-2 border-t border-rose-500/20 space-y-2">
                    <p className="text-[11px] text-rose-300 font-medium">
                      Adobe Stock moderation rejects duplicate submissions and color-shifted copies under the <em>&quot;Similar Content&quot;</em> policy rule.
                    </p>

                    <label className="flex items-start gap-2 p-2.5 rounded bg-neutral-950/80 border border-rose-500/30 text-neutral-200 cursor-pointer hover:bg-neutral-950 transition-colors">
                      <input
                        type="checkbox"
                        checked={overrideAcknowledged}
                        onChange={(e) => setOverrideAcknowledged(e.target.checked)}
                        className="mt-0.5 rounded bg-neutral-800 border-neutral-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[11px] leading-tight">
                        <strong>Contributor Verification:</strong> I confirm this vector asset features substantive structural, thematic, or use-case differentiation from &quot;{topMatch.matchedProjectName}&quot; and does not violate Adobe Stock duplicate content guidelines.
                      </span>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-xs">
                    Similarity Guard: Unique Asset Confirmed ({auditResult.scannedProjectsCount} catalog projects scanned)
                  </span>
                </div>
                <button
                  onClick={() => setShowDetailedAudit(true)}
                  className="text-[10px] text-emerald-400 underline hover:text-emerald-300"
                >
                  View Fingerprint
                </button>
              </div>
            )}

            {/* Preflight Summary Card */}
            <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-200 text-xs">Preflight Quality Gate</span>
                <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                  preflight.overall === 'PASS' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : (preflight.overall === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40')
                }`}>
                  {preflight.overall}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono pt-1">
                <div className="bg-neutral-900/80 p-1.5 rounded">
                  <div className="text-neutral-400 text-[10px]">Canvas</div>
                  <div className="text-neutral-100 font-bold">{project.canvasConfig.width}×{project.canvasConfig.height}</div>
                </div>
                <div className="bg-neutral-900/80 p-1.5 rounded">
                  <div className="text-neutral-400 text-[10px]">Icons</div>
                  <div className="text-neutral-100 font-bold">{project.slots.filter(s => s.svgContent).length} slots</div>
                </div>
                <div className="bg-neutral-900/80 p-1.5 rounded">
                  <div className="text-neutral-400 text-[10px]">Keywords</div>
                  <div className="text-neutral-100 font-bold">{project.metadata.keywords.length}/50</div>
                </div>
              </div>
            </div>

            {/* Generated Package Files Preview */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-neutral-300">Package Files ({baseSlug}/)</div>

              <div className="space-y-1.5">
                <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="font-mono font-bold text-xs text-neutral-200">{svgFilename}</div>
                      <div className="text-[10px] text-neutral-400">Clean stock SVG with semantic groups &amp; exact 4000px viewBox</div>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadSvgOnly}
                    disabled={!canExport}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs border border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Download SVG
                  </button>
                </div>

                <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-mono font-bold text-xs text-neutral-200">{qcFilename}</div>
                      <div className="text-[10px] text-neutral-400">Technical preflight audit log &amp; node density proof</div>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadQcReport}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs border border-neutral-700 transition-colors"
                  >
                    Download JSON
                  </button>
                </div>

                <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="font-mono font-bold text-xs text-neutral-200">{metaFilename}</div>
                      <div className="text-[10px] text-neutral-400">Commercial title &amp; 50-keyword CSV for contributor portal</div>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadMetadataTxt}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs border border-neutral-700 transition-colors"
                  >
                    Download TXT
                  </button>
                </div>
              </div>
            </div>

            {/* Export Success Message */}
            {exportedSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Export complete! Asset status updated to <strong>EXPORTED</strong> in production queue.
                </span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              Close
            </button>

            <button
              onClick={handleDownloadPackageZip}
              disabled={isExporting || !canExport}
              className="px-4 py-2 rounded bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold transition-all shadow-lg flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              title={!canExport ? 'Confirm similarity verification above to unlock export' : undefined}
            >
              <FolderDown className="w-4 h-4" />
              <span>
                {isExporting 
                  ? 'Generating ZIP...' 
                  : (isHighRisk && !overrideAcknowledged ? 'Confirmation Required to Export' : 'Download Complete Package (.ZIP)')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Side-by-Side Fingerprint Modal */}
      <SimilarityAuditModal
        isOpen={showDetailedAudit}
        onClose={() => setShowDetailedAudit(false)}
        currentProject={project}
        allProjects={allProjects}
        auditResult={auditResult}
      />
    </>
  );
};
