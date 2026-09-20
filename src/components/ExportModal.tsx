import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileCheck, 
  ShieldAlert, 
  FileCode, 
  CheckCircle2, 
  Archive, 
  FileText,
  AlertTriangle,
  FolderDown
} from 'lucide-react';
import JSZip from 'jszip';
import confetti from 'canvas-confetti';
import { Project, PreflightResult } from '../types';
import { generateStandaloneStockSvg, generateQCReport, generateMetadataText } from '../lib/svgUtils';
import { checkProjectSimilarity, SimilarityMatch } from '../lib/similarityGuard';

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

  // Run Similarity Guard
  const similarityWarning: SimilarityMatch | null = checkProjectSimilarity(project, allProjects);

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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden text-neutral-200 animate-in fade-in zoom-in-95 duration-150">
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
                Generate production-ready standalone SVG, QC verification report, &amp; metadata file.
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
        <div className="p-5 space-y-4 text-xs">
          {/* Similarity Guard Warning if Triggered */}
          {similarityWarning && (
            <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Similarity Guard Warning: Potential Duplicate Variation ({similarityWarning.score}% Match)</span>
              </div>
              <p className="text-[11px] text-amber-300">
                Compared with existing asset: <strong>{similarityWarning.matchedProjectName}</strong>.
              </p>
              <ul className="text-[10.5px] text-amber-400 list-disc list-inside space-y-0.5">
                {similarityWarning.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              <div className="text-[10.5px] italic text-amber-300/80 pt-1">
                Adobe Stock moderation penalizes minor color-only variations. Ensure substantive conceptual or use-case differentiation.
              </div>
            </div>
          )}

          {/* Preflight Summary Card */}
          <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-200 text-xs">Stock Readiness Inspection</span>
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
            <div className="text-xs font-semibold text-neutral-300">Package Contents ({baseSlug}/)</div>

            <div className="space-y-1.5">
              <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-mono font-bold text-xs text-neutral-200">{svgFilename}</div>
                    <div className="text-[10px] text-neutral-400">Standalone clean stock SVG with organized &lt;g id=&quot;...&quot;&gt; groups</div>
                  </div>
                </div>
                <button
                  onClick={handleDownloadSvgOnly}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs border border-neutral-700"
                >
                  Download SVG
                </button>
              </div>

              <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-mono font-bold text-xs text-neutral-200">{qcFilename}</div>
                    <div className="text-[10px] text-neutral-400">Technical preflight validation proof &amp; vector node audit</div>
                  </div>
                </div>
                <button
                  onClick={handleDownloadQcReport}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs border border-neutral-700"
                >
                  Download JSON
                </button>
              </div>

              <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="font-mono font-bold text-xs text-neutral-200">{metaFilename}</div>
                    <div className="text-[10px] text-neutral-400">Formatted metadata for copy-paste into Adobe Stock contributor portal</div>
                  </div>
                </div>
                <button
                  onClick={handleDownloadMetadataTxt}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs border border-neutral-700"
                >
                  Download TXT
                </button>
              </div>
            </div>
          </div>

          {/* Export Success Message */}
          {exportedSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-2">
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
            disabled={isExporting}
            className="px-4 py-2 rounded bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            <FolderDown className="w-4 h-4" />
            <span>{isExporting ? 'Generating ZIP...' : 'Download Complete Package (.ZIP)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
