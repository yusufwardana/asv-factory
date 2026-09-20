import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Download, 
  Sliders, 
  Eye, 
  Grid, 
  Undo2, 
  Redo2, 
  Sparkles, 
  ShieldCheck, 
  FolderPlus,
  Layers,
  FileCheck,
  Languages,
  HelpCircle
} from 'lucide-react';
import { Project, PreflightResult } from '../types';
import { useI18n } from '../lib/i18n';

export type ViewMode = 'normal' | 'outline' | 'dark' | 'white' | 'checkerboard';

interface HeaderProps {
  project: Project;
  allProjects?: Project[];
  onSelectProject?: (id: string) => void;
  preflight: PreflightResult;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showSafeAreas: boolean;
  onToggleSafeAreas: () => void;
  onOpenPreflight: () => void;
  onOpenMetadata: () => void;
  onOpenExport: () => void;
  onOpenHelp?: () => void;
  onOpenNewProject?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  allProjects = [],
  onSelectProject,
  preflight,
  viewMode,
  onViewModeChange,
  showGrid,
  onToggleGrid,
  showSafeAreas,
  onToggleSafeAreas,
  onOpenPreflight,
  onOpenMetadata,
  onOpenExport,
  onOpenHelp,
  onOpenNewProject,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo
}) => {
  const { language, setLanguage, t } = useI18n();

  const getPreflightBadge = () => {
    if (preflight.failCount > 0) {
      return (
        <button
          onClick={onOpenPreflight}
          id="btn-preflight-status"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/15 border border-rose-500/40 text-rose-400 hover:bg-rose-500/25 transition-colors text-xs font-semibold"
          title={t('header.preflightTooltip')}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>{t('header.preflightFail', { count: preflight.failCount })}</span>
        </button>
      );
    }
    if (preflight.warningCount > 0) {
      return (
        <button
          onClick={onOpenPreflight}
          id="btn-preflight-status"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 transition-colors text-xs font-semibold"
          title={t('header.preflightTooltip')}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('header.preflightWarn', { count: preflight.warningCount })}</span>
        </button>
      );
    }
    return (
      <button
        onClick={onOpenPreflight}
        id="btn-preflight-status"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 transition-colors text-xs font-semibold"
        title={t('header.preflightTooltip')}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>{t('header.preflightPass')}</span>
      </button>
    );
  };

  return (
    <header className="h-14 bg-neutral-900 border-b border-neutral-800 px-4 flex items-center justify-between text-neutral-200 select-none z-30 shrink-0">
      {/* Left: Branding & Project Title */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-neutral-950 text-sm shadow-md tracking-tighter">
            AS
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wide text-neutral-100 uppercase">
                {t('header.title')}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                {t('app.mvp')}
              </span>
            </div>
          </div>
        </div>

        <div className="h-4 w-px bg-neutral-800 hidden md:block" />

        {/* Project Info */}
        <div className="flex items-center gap-2 truncate">
          {allProjects.length > 1 && onSelectProject ? (
            <div className="flex items-center gap-1.5 bg-neutral-800/80 px-2 py-1 rounded border border-neutral-700">
              <FolderPlus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <select
                value={project.id}
                onChange={(e) => onSelectProject(e.target.value)}
                className="bg-transparent text-xs text-neutral-200 font-medium focus:outline-none max-w-[200px] truncate cursor-pointer"
              >
                {allProjects.map(p => (
                  <option key={p.id} value={p.id} className="bg-neutral-900 text-neutral-100">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <button
              onClick={onOpenNewProject}
              className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white transition-colors bg-neutral-800/80 hover:bg-neutral-800 px-2 py-1 rounded border border-neutral-700"
              title={t('header.projectSelector')}
              id="btn-project-selector"
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium truncate max-w-[200px]">{project.name}</span>
            </button>
          )}

          {/* AI Disclosure Badge */}
          {project.aiStatus === 'yes' ? (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
              <Sparkles className="w-3 h-3" />
              {t('header.aiDisclosureRequired')}
            </span>
          ) : (
            <span className="hidden lg:flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-3 h-3" />
              {t('header.originalVector')}
            </span>
          )}
        </div>
      </div>

      {/* Middle: Canvas View Tools */}
      <div className="hidden md:flex items-center gap-1 bg-neutral-950/80 p-1 rounded-lg border border-neutral-800">
        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent"
          title={t('header.undo')}
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent"
          title={t('header.redo')}
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-3.5 w-px bg-neutral-800 mx-1" />

        {/* View Mode Switcher */}
        <button
          onClick={() => onViewModeChange('normal')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            viewMode === 'normal' ? 'bg-neutral-700 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title={t('header.normalTooltip')}
        >
          {t('header.modeNormal')}
        </button>
        <button
          onClick={() => onViewModeChange('outline')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            viewMode === 'outline' ? 'bg-cyan-900/80 text-cyan-200 font-semibold border border-cyan-700' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title={t('header.outlineTooltip')}
        >
          {t('header.modeOutline')}
        </button>
        <button
          onClick={() => onViewModeChange('checkerboard')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            viewMode === 'checkerboard' ? 'bg-neutral-700 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title={t('header.gridTooltip')}
        >
          {t('header.modeGrid')}
        </button>
        <button
          onClick={() => onViewModeChange('dark')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            viewMode === 'dark' ? 'bg-neutral-800 text-neutral-200 font-medium' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title={t('header.darkTooltip')}
        >
          {t('header.modeDark')}
        </button>
        <button
          onClick={() => onViewModeChange('white')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            viewMode === 'white' ? 'bg-neutral-200 text-neutral-900 font-medium' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title={t('header.whiteTooltip')}
        >
          {t('header.modeWhite')}
        </button>

        <div className="h-3.5 w-px bg-neutral-800 mx-1" />

        {/* Guides toggle */}
        <button
          onClick={onToggleGrid}
          className={`p-1.5 rounded transition-colors ${
            showGrid ? 'bg-amber-500/20 text-amber-300' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title={t('header.toggleGrid')}
        >
          <Grid className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onToggleSafeAreas}
          className={`p-1.5 rounded transition-colors ${
            showSafeAreas ? 'bg-indigo-500/20 text-indigo-300' : 'text-neutral-400 hover:text-neutral-200'
          }`}
          title={t('header.toggleSafeAreas')}
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Language Selector, Preflight, Metadata, Export */}
      <div className="flex items-center gap-2.5">
        {/* Language Selector: Indonesian / English */}
        <div 
          className="flex items-center bg-neutral-950/90 p-0.5 rounded-lg border border-neutral-800 text-xs shadow-inner"
          id="language-selector-group"
          title={t('header.switchLanguage')}
        >
          <button
            type="button"
            onClick={() => setLanguage('id')}
            id="btn-lang-id"
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 text-[11px] font-semibold ${
              language === 'id'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
            title="Pilihan Bahasa Indonesia"
          >
            <span className="text-xs leading-none">🇮🇩</span>
            <span>ID</span>
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            id="btn-lang-en"
            className={`px-2 py-1 rounded transition-all flex items-center gap-1 text-[11px] font-semibold ${
              language === 'en'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
            title="English Language Option"
          >
            <span className="text-xs leading-none">🇬🇧</span>
            <span>EN</span>
          </button>
        </div>

        {/* Local Processing Badge */}
        <span 
          className="hidden xl:inline-flex items-center gap-1 text-[11px] font-mono text-neutral-400 px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800"
          title={t('header.localProcessingTooltip')}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {t('header.localProcessing')}
        </span>

        {/* Preflight status */}
        {getPreflightBadge()}

        {/* Metadata Studio Trigger */}
        <button
          onClick={onOpenMetadata}
          id="btn-open-metadata"
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors"
          title="Open Metadata Studio (50 Keywords & SEO)"
        >
          <FileCheck className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">{t('header.metadata')}</span>
          <span className="text-[10px] bg-neutral-900 px-1 py-0.2 rounded text-neutral-400 font-mono">
            {project.metadata.keywords.length}/50
          </span>
        </button>

        {/* User Manual & Help Guide Trigger */}
        {onOpenHelp && (
          <button
            onClick={onOpenHelp}
            id="btn-open-help-header"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors"
            title={t('header.helpTooltip')}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">{t('header.help')}</span>
          </button>
        )}

        {/* Clean Stock SVG Export */}
        <button
          onClick={onOpenExport}
          id="btn-open-export"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-xs shadow-md transition-all active:scale-95"
          title={t('header.exportTooltip')}
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t('header.exportStockSvg')}</span>
        </button>
      </div>
    </header>
  );
};
