import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  Layers,
  FileCode,
  Tag
} from 'lucide-react';
import { Project, PreflightResult, PreflightItem } from '../types';
import { checkProjectSimilarity } from '../lib/similarityGuard';
import { SimilarityAuditModal } from './SimilarityAuditModal';
import { removeLiveTextFromSvg } from '../lib/svgUtils';
import { ADOBE_STOCK_RULES } from '../lib/adobeStockRules';
import { useI18n } from '../lib/i18n';

interface PreflightModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  allProjects?: Project[];
  preflight: PreflightResult;
  onUpdateProject: (updater: (prev: Project) => Project) => void;
  onOpenMetadata: () => void;
}

export const PreflightModal: React.FC<PreflightModalProps> = ({
  isOpen,
  onClose,
  project,
  allProjects = [],
  preflight,
  onUpdateProject,
  onOpenMetadata,
}) => {
  const { t } = useI18n();
  const [filter, setFilter] = useState<'all' | 'fail' | 'warning' | 'pass'>('all');
  const [showSimilarityModal, setShowSimilarityModal] = useState(false);

  if (!isOpen) return null;

  const filteredItems = preflight.items.filter(item => {
    if (filter === 'fail') return item.status === 'fail';
    if (filter === 'warning') return item.status === 'warning';
    if (filter === 'pass') return item.status === 'pass';
    return true;
  });

  const handleToggleAiChecklist = (key: keyof Project['aiChecklist']) => {
    onUpdateProject(prev => ({
      ...prev,
      aiChecklist: {
        ...prev.aiChecklist,
        [key]: !prev.aiChecklist[key]
      },
      updatedAt: new Date().toISOString()
    }));
  };

  const handleApproveForExport = () => {
    onUpdateProject(prev => ({
      ...prev,
      humanReviewed: true,
      approvedForExport: true,
      status: 'READY',
      updatedAt: new Date().toISOString()
    }));
    onClose();
  };

  const handleFixAction = (item: PreflightItem) => {
    if (item.id === 'canvas-dimensions' || item.id === 'rule-canvas-dimensions') {
      onUpdateProject(prev => ({
        ...prev,
        canvasConfig: { ...prev.canvasConfig, width: 4000, height: 4000 },
        updatedAt: new Date().toISOString()
      }));
    } else if (item.fixActionLabel === 'Remove Live Text' || item.id === 'rule-live-text-outlined' || item.id === 'vector-text') {
      onUpdateProject(prev => ({
        ...prev,
        slots: prev.slots.map(slot => {
          if (!slot.stats.hasText && (!slot.stats.textDetails || slot.stats.textDetails.count === 0)) return slot;
          const cleaned = removeLiveTextFromSvg(slot.svgContent);
          return {
            ...slot,
            svgContent: cleaned,
            stats: {
              ...slot.stats,
              hasText: false,
              textDetails: { count: 0, items: [] },
              elementCount: Math.max(0, slot.stats.elementCount - (slot.stats.textDetails?.count || 1)),
              elementCounts: {
                ...slot.stats.elementCounts,
                text: 0,
                totalDrawableElements: Math.max(0, slot.stats.elementCounts.totalDrawableElements - (slot.stats.textDetails?.count || 1))
              }
            }
          };
        }),
        updatedAt: new Date().toISOString()
      }));
    } else if (item.fixActionLabel === 'Trim to 50 Keywords') {
      onUpdateProject(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          keywords: prev.metadata.keywords.slice(0, 50)
        },
        updatedAt: new Date().toISOString()
      }));
    } else if (item.fixActionLabel === 'Deduplicate Keywords' || item.id === 'metadata-duplicates' || item.id === 'rule-metadata-deduplication') {
      onUpdateProject(prev => {
        const uniqueKws = Array.from(new Set(prev.metadata.keywords.map(k => k.trim().toLowerCase())));
        return {
          ...prev,
          metadata: { ...prev.metadata, keywords: uniqueKws },
          updatedAt: new Date().toISOString()
        };
      });
    } else if (item.id === 'stroke-audit' || item.id === 'rule-stroke-system-consistency') {
      onUpdateProject(prev => {
        const nextSlots = prev.slots.map(s => {
          if (!s.svgContent) return s;
          const updatedSvg = s.svgContent.replace(/stroke-width="[\d.]+"/gi, 'stroke-width="2.5"');
          return {
            ...s,
            svgContent: updatedSvg,
            stats: { ...s.stats, strokeWidths: [2.5] }
          };
        });
        return { ...prev, slots: nextSlots, updatedAt: new Date().toISOString() };
      });
    } else if (item.id === 'similarity-guard' || item.id === 'rule-similarity-content-duplication') {
      setShowSimilarityModal(true);
    } else if (item.category === 'metadata') {
      onOpenMetadata();
    }
  };

  const totalPaths = project.slots.reduce((sum, s) => sum + s.stats.pathCount, 0);
  const totalRects = project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.rects || 0), 0);
  const totalCircles = project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.circles || 0), 0);
  const totalPolygons = project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.polygons || 0), 0);
  const totalLines = project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.lines || 0), 0);
  const totalPolylines = project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.polylines || 0), 0);
  const totalDrawable = project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.totalDrawableElements || s.stats.elementCount), 0);

  const opacityCount = project.slots.reduce((sum, s) => sum + (s.stats.transparencyDetails?.opacityCount || 0), 0);
  const fillOpacityCount = project.slots.reduce((sum, s) => sum + (s.stats.transparencyDetails?.fillOpacityCount || 0), 0);
  const totalTransparency = opacityCount + fillOpacityCount;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden text-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${
              preflight.failCount > 0 ? 'bg-rose-500/20 text-rose-400' : (preflight.warningCount > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400')
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-neutral-100 uppercase tracking-wide">
                  {t('preflight.modalTitle')}
                </h2>
                <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold tracking-wide uppercase ${
                  preflight.statusVerdict === 'READY FOR HUMAN REVIEW' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : (preflight.statusVerdict === 'NEEDS REVIEW' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40')
                }`}>
                  {preflight.statusVerdict}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {preflight.summary}
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

        {/* DOM Vector Element Counters Bar */}
        <div className="px-4 py-2 bg-neutral-950 border-b border-neutral-800/80 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-3 text-neutral-300">
            <span className="flex items-center gap-1">
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              {t('inspector.paths')}: <strong className="text-amber-400">{totalPaths}</strong>
            </span>
            <span>
              {t('inspector.shapes')}: <strong className="text-cyan-400">{totalRects}</strong>
            </span>
            <span>
              {t('inspector.circlesLines')}: <strong className="text-emerald-400">{totalCircles}</strong>
            </span>
            <span>
              Polygons/Lines: <strong className="text-purple-400">{totalPolygons + totalLines + totalPolylines}</strong>
            </span>
            <span className="text-neutral-400 border-l border-neutral-800 pl-3">
              {t('inspector.totalDrawables')}: <strong className="text-neutral-100">{totalDrawable}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-blue-400">
              <Layers className="w-3.5 h-3.5" />
              {t('inspector.transparency')} {totalTransparency}
            </span>
            <span className="text-neutral-400">
              {project.slots.filter(s => s.svgContent).length} slots
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 bg-neutral-950/40 border-b border-neutral-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-neutral-500" />
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filter === 'all' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {t('preflight.allFilter')} ({preflight.items.length})
            </button>
            <button
              onClick={() => setFilter('fail')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                filter === 'fail' ? 'bg-rose-500/20 text-rose-300 font-medium' : 'text-neutral-400 hover:text-rose-300'
              }`}
            >
              <XCircle className="w-3 h-3 text-rose-400" />
              <span>{t('preflight.failFilter')} ({preflight.failCount})</span>
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                filter === 'warning' ? 'bg-amber-500/20 text-amber-300 font-medium' : 'text-neutral-400 hover:text-amber-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>{t('preflight.warnFilter')} ({preflight.warningCount})</span>
            </button>
            <button
              onClick={() => setFilter('pass')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                filter === 'pass' ? 'bg-emerald-500/20 text-emerald-300 font-medium' : 'text-neutral-400 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{t('preflight.passFilter')} ({preflight.passCount})</span>
            </button>
          </div>

          <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-amber-400" />
            <span>AI Status: <strong>{project.aiStatus.toUpperCase()}</strong></span>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* AI Disclosure Checklist if Generative AI */}
          {project.aiStatus === 'yes' && (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Generative AI Stock Contributor Verification Checklist</span>
              </div>
              <p className="text-[11px] text-amber-400/90 leading-relaxed">
                Adobe Stock accepts AI-generated vectors under strict guidelines: commercial rights verified, zero third-party trademarks/IP, artifacts manually cleaned, and the Generative AI checkbox checked upon submission.
              </p>
              <div className="space-y-1.5 pt-1">
                {[
                  { key: 'commercialTermsReviewed' as const, label: 'AI tool commercial terms & license verified' },
                  { key: 'artworkVisuallyReviewed' as const, label: 'Vector artwork thoroughly reviewed visually' },
                  { key: 'artifactsCorrected' as const, label: 'Generated artifacts and microscopic stray nodes corrected' },
                  { key: 'noUnauthorizedIp' as const, label: 'Zero unauthorized brands, logos, or copyrighted characters' },
                  { key: 'adobeAiCheckboxAcknowledged' as const, label: 'Acknowledge to mark "Created using generative AI tools" on Adobe Stock portal' }
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => handleToggleAiChecklist(item.key)}
                    className="flex items-center gap-2 text-left text-xs text-neutral-200 hover:text-white"
                  >
                    {project.aiChecklist[item.key] ? (
                      <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-neutral-600 shrink-0" />
                    )}
                    <span className={project.aiChecklist[item.key] ? 'line-through opacity-80' : ''}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preflight Items */}
          {filteredItems.map(item => {
            const ruleDef = ADOBE_STOCK_RULES[item.id];
            const isRequirement = ruleDef?.type === 'ADOBE_REQUIREMENT';

            return (
              <div
                key={item.id}
                className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                  item.status === 'fail'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : item.status === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-neutral-950 border-neutral-800/80 text-neutral-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {item.status === 'fail' && <XCircle className="w-4 h-4 text-rose-400" />}
                    {item.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    {item.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-neutral-100">{item.title}</span>
                      <span className="text-[9.5px] font-mono uppercase px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-400">
                        {item.category}
                      </span>
                      {ruleDef && (
                        <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded border ${
                          isRequirement 
                            ? 'bg-red-500/15 border-red-500/30 text-red-300' 
                            : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                        }`}>
                          {isRequirement ? 'ADOBE REQUIREMENT' : 'INTERNAL HEURISTIC'}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-neutral-300 leading-relaxed">
                      {item.message}
                    </div>
                    {item.detail && (
                      <div className="mt-1 text-[11px] opacity-75 font-mono">
                        {item.detail}
                      </div>
                    )}
                  </div>
                </div>

                {item.fixActionLabel && (
                  <button
                    onClick={() => handleFixAction(item)}
                    className="shrink-0 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>{item.fixActionLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs">
          <div className="text-neutral-400">
            Strongest approval tier: <strong className="text-emerald-400">READY FOR HUMAN REVIEW</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleApproveForExport}
              disabled={!preflight.readyForReview}
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Ready for Human Review</span>
            </button>
          </div>
        </div>
      </div>

      {/* Similarity Audit Modal */}
      <SimilarityAuditModal
        isOpen={showSimilarityModal}
        onClose={() => setShowSimilarityModal(false)}
        currentProject={project}
        allProjects={allProjects}
        auditResult={checkProjectSimilarity(project, allProjects)}
      />
    </div>
  );
};
