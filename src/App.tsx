import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Project, PipelineStatus, RejectionLog, DailyMetrics, AssetType } from './types';
import { 
  loadAllProjects, 
  saveProject, 
  deleteProjectFromStorage,
  loadRejections, 
  saveRejections, 
  loadDailyMetrics, 
  saveDailyMetrics, 
  createDefaultProject 
} from './lib/storage';
import { runFullPreflight } from './lib/preflightEngine';
import { autoNormalizeSlots, createEmptyStats } from './lib/svgUtils';

// Components
import { Header, ViewMode } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { InspectorPanel } from './components/InspectorPanel';
import { ProductionDashboard } from './components/ProductionDashboard';
import { ProductionKanban } from './components/ProductionKanban';
import { RejectionTracker } from './components/RejectionTracker';
import { DailyProductionWizard } from './components/DailyProductionWizard';
import { TemplatesView } from './components/TemplatesView';
import { BackupView } from './components/BackupView';
import { ProjectsView } from './components/ProjectsView';

// Modals
import { PreflightModal } from './components/PreflightModal';
import { MetadataStudioModal } from './components/MetadataStudioModal';
import { ExportModal } from './components/ExportModal';
import { I18nProvider } from './lib/i18n';

function AppContent() {
  // Application Data States
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [rejections, setRejections] = useState<RejectionLog[]>([]);
  const [metrics, setMetrics] = useState<DailyMetrics>({
    date: new Date().toISOString().split('T')[0],
    started: 1,
    ready: 1,
    exported: 0,
    submitted: 0,
    qcPassed: 1,
    accepted: 8,
    rejected: 2,
    target: 3
  });

  const [isLoading, setIsLoading] = useState(true);

  // UI View States
  const [activeTab, setActiveTab] = useState<ActiveTab>('workspace');
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showSafeAreas, setShowSafeAreas] = useState<boolean>(true);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(0);

  // Modals
  const [isPreflightOpen, setIsPreflightOpen] = useState(false);
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Initialize data from Local-First Storage (IndexedDB / LocalStorage)
  useEffect(() => {
    async function init() {
      try {
        const loadedProjects = await loadAllProjects();
        const loadedRejections = await loadRejections();
        const loadedMetrics = await loadDailyMetrics();

        setProjects(loadedProjects);
        if (loadedProjects.length > 0) {
          setActiveProjectId(loadedProjects[0].id);
        }
        setRejections(loadedRejections);
        setMetrics(loadedMetrics);
      } catch (err) {
        console.error('Initialization error, creating default project', err);
        const def = createDefaultProject();
        setProjects([def]);
        setActiveProjectId(def.id);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Active Project Reference
  const currentProject = useMemo(() => {
    const found = projects.find(p => p.id === activeProjectId);
    return found || projects[0] || null;
  }, [projects, activeProjectId]);

  // Preflight validation for active project
  const currentPreflight = useMemo(() => {
    if (!currentProject) {
      return {
        overall: 'WARNING' as const,
        statusVerdict: 'NOT READY' as const,
        passCount: 0,
        warningCount: 0,
        failCount: 0,
        items: [],
        readyForReview: false,
        summary: 'No active project loaded.'
      };
    }
    return runFullPreflight(currentProject, projects);
  }, [currentProject, projects]);

  // Update active project
  const handleUpdateCurrentProject = useCallback((updater: (prev: Project) => Project) => {
    setProjects(prevProjects => {
      const updatedList = prevProjects.map(proj => {
        if (proj.id === activeProjectId) {
          const next = updater(proj);
          saveProject(next); // persist to IndexedDB
          return next;
        }
        return proj;
      });
      return updatedList;
    });
  }, [activeProjectId]);

  // Update pipeline status of any project
  const handleUpdateProjectStatus = useCallback((projectId: string, nextStatus: PipelineStatus) => {
    setProjects(prevProjects => {
      return prevProjects.map(proj => {
        if (proj.id === projectId) {
          const next = { ...proj, status: nextStatus, updatedAt: new Date().toISOString() };
          saveProject(next);
          return next;
        }
        return proj;
      });
    });
  }, []);

  // Create new project
  const handleCreateProject = useCallback((data: {
    name: string;
    niche: string;
    topic: string;
    assetType: AssetType;
    width: number;
    height: number;
    gridRows: number;
    gridCols: number;
    safePadding: number;
  }) => {
    const id = `proj-${Date.now()}`;
    const totalSlots = data.gridRows * data.gridCols;
    const newSlots = Array.from({ length: totalSlots }).map((_, idx) => ({
      id: `slot-${idx + 1}`,
      index: idx,
      label: `Icon ${String(idx + 1).padStart(2, '0')}`,
      svgContent: '',
      rawSvgContent: '',
      bounds: { x: 0, y: 0, width: 24, height: 24 },
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      visualWeight: 1.0,
      stats: createEmptyStats(),
      sanitizationLog: []
    }));

    const newProject: Project = {
      id,
      name: data.name,
      niche: data.niche,
      topic: data.topic,
      assetType: data.assetType,
      status: 'ASSEMBLY',
      canvasConfig: {
        width: data.width,
        height: data.height,
        gridRows: data.gridRows,
        gridCols: data.gridCols,
        safePadding: data.safePadding,
        backgroundColor: '#0a0a0a'
      },
      slots: newSlots,
      metadata: {
        title: `${data.name} Vector Icon Set`,
        description: `Clean commercial vector icon set representing ${data.topic}. Suitable for web, mobile apps, and infographics.`,
        category: 'Icons / Graphics',
        keywords: [
          data.niche.toLowerCase(),
          data.topic.toLowerCase(),
          'vector',
          'icon set',
          'illustration',
          'symbol',
          'graphic design'
        ],
        concept: data.topic,
        industry: data.niche,
        style: 'Monoline outline'
      },
      aiStatus: 'no',
      aiChecklist: {
        commercialTermsReviewed: true,
        artworkVisuallyReviewed: true,
        artifactsCorrected: true,
        noUnauthorizedIp: true,
        adobeAiCheckboxAcknowledged: true
      },
      humanReviewed: false,
      approvedForExport: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    saveProject(newProject);
    setActiveTab('workspace');
  }, []);

  // Duplicate project
  const handleDuplicateProject = useCallback((projectId: string) => {
    const target = projects.find(p => p.id === projectId);
    if (!target) return;

    const dupId = `proj-${Date.now()}`;
    const duplicated: Project = {
      ...target,
      id: dupId,
      name: `${target.name} (Copy)`,
      status: 'ASSEMBLY',
      humanReviewed: false,
      approvedForExport: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setProjects(prev => [duplicated, ...prev]);
    setActiveProjectId(dupId);
    saveProject(duplicated);
  }, [projects]);

  // Delete project
  const handleDeleteProject = useCallback((projectId: string) => {
    setProjects(prev => {
      const next = prev.filter(p => p.id !== projectId);
      deleteProjectFromStorage(projectId);
      if (activeProjectId === projectId && next.length > 0) {
        setActiveProjectId(next[0].id);
      }
      return next;
    });
  }, [activeProjectId]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setIsPreflightOpen(true);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMetadataOpen(true);
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setIsExportOpen(true);
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        // Trigger auto normalize
        if (currentProject) {
          handleUpdateCurrentProject(prev => ({
            ...prev,
            slots: autoNormalizeSlots(prev.slots),
            updatedAt: new Date().toISOString()
          }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProject, handleUpdateCurrentProject]);

  if (isLoading || !currentProject) {
    return (
      <div className="h-screen w-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-400 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
        <span className="font-mono text-xs">Initializing Adobe Stock Vector Factory...</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      {/* Top Application Header */}
      <Header
        project={currentProject}
        allProjects={projects}
        onSelectProject={(id: string) => setActiveProjectId(id)}
        preflight={currentPreflight}
        onOpenPreflight={() => setIsPreflightOpen(true)}
        onOpenMetadata={() => setIsMetadataOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenNewProject={() => setActiveTab('projects')}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        showSafeAreas={showSafeAreas}
        onToggleSafeAreas={() => setShowSafeAreas(!showSafeAreas)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingRejectionsCount={rejections.length}
          readyProjectsCount={projects.filter(p => p.status === 'READY').length}
        />

        {/* Dynamic Center Stage */}
        {activeTab === 'workspace' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Center Canvas */}
            <CanvasWorkspace
              project={currentProject}
              onUpdateProject={handleUpdateCurrentProject}
              selectedSlotIndex={selectedSlotIndex}
              onSelectSlot={setSelectedSlotIndex}
              viewMode={viewMode}
              showGrid={showGrid}
              showSafeAreas={showSafeAreas}
            />

            {/* Right Inspector & Quality Gate Panel */}
            <InspectorPanel
              project={currentProject}
              allProjects={projects}
              onUpdateProject={handleUpdateCurrentProject}
              selectedSlotIndex={selectedSlotIndex}
              onSelectSlot={setSelectedSlotIndex}
            />
          </div>
        )}

        {activeTab === 'dashboard' && (
          <ProductionDashboard
            projects={projects}
            metrics={metrics}
            onStartProductionDay={() => setActiveTab('focus-mode')}
            onOpenProject={(id) => {
              setActiveProjectId(id);
              setActiveTab('workspace');
            }}
            onNewProject={() => setActiveTab('projects')}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsView
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={(id) => {
              setActiveProjectId(id);
              setActiveTab('workspace');
            }}
            onCreateProject={handleCreateProject}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {activeTab === 'kanban' && (
          <ProductionKanban
            projects={projects}
            onOpenProject={(id) => {
              setActiveProjectId(id);
              setActiveTab('workspace');
            }}
            onUpdateProjectStatus={handleUpdateProjectStatus}
            onNewProject={() => setActiveTab('projects')}
          />
        )}

        {activeTab === 'templates' && (
          <TemplatesView
            onApplyTemplate={(tmpl) => {
              handleCreateProject({
                name: tmpl.name,
                niche: 'Creative Graphics',
                topic: 'Stock Collection',
                assetType: tmpl.assetType,
                width: tmpl.width,
                height: tmpl.height,
                gridRows: tmpl.gridRows,
                gridCols: tmpl.gridCols,
                safePadding: tmpl.safePadding
              });
            }}
          />
        )}

        {activeTab === 'rejections' && (
          <RejectionTracker
            rejections={rejections}
            onAddRejection={(newLog) => {
              const updated = [{ ...newLog, id: `rej-${Date.now()}` }, ...rejections];
              setRejections(updated);
              saveRejections(updated);
            }}
            onDeleteRejection={(id) => {
              const updated = rejections.filter(r => r.id !== id);
              setRejections(updated);
              saveRejections(updated);
            }}
          />
        )}

        {activeTab === 'focus-mode' && (
          <DailyProductionWizard
            project={currentProject}
            preflight={currentPreflight}
            onOpenWorkspace={() => setActiveTab('workspace')}
            onOpenPreflight={() => setIsPreflightOpen(true)}
            onOpenMetadata={() => setIsMetadataOpen(true)}
            onOpenExport={() => setIsExportOpen(true)}
            onAutoNormalize={() => {
              handleUpdateCurrentProject(prev => ({
                ...prev,
                slots: autoNormalizeSlots(prev.slots),
                updatedAt: new Date().toISOString()
              }));
            }}
            onNextProject={() => {
              // Cycle to next project or create one
              const nextIdx = (projects.findIndex(p => p.id === activeProjectId) + 1) % projects.length;
              setActiveProjectId(projects[nextIdx].id);
            }}
          />
        )}

        {activeTab === 'backup' && (
          <BackupView
            currentProject={currentProject}
            allProjects={projects}
            rejections={rejections}
            metrics={metrics}
            onRestoreBackup={(data) => {
              if (data.projects && data.projects.length > 0) {
                setProjects(data.projects);
                setActiveProjectId(data.projects[0].id);
                data.projects.forEach(p => saveProject(p));
              }
              if (data.rejections) {
                setRejections(data.rejections);
                saveRejections(data.rejections);
              }
              if (data.metrics) {
                setMetrics(data.metrics);
                saveDailyMetrics(data.metrics);
              }
            }}
            onResetToDefault={() => {
              const def = createDefaultProject();
              setProjects([def]);
              setActiveProjectId(def.id);
              saveProject(def);
            }}
          />
        )}
      </div>

      {/* Preflight Validation Modal */}
      <PreflightModal
        isOpen={isPreflightOpen}
        onClose={() => setIsPreflightOpen(false)}
        project={currentProject}
        allProjects={projects}
        preflight={currentPreflight}
        onUpdateProject={handleUpdateCurrentProject}
        onOpenMetadata={() => {
          setIsPreflightOpen(false);
          setIsMetadataOpen(true);
        }}
      />

      {/* Metadata Studio Modal */}
      <MetadataStudioModal
        isOpen={isMetadataOpen}
        onClose={() => setIsMetadataOpen(false)}
        project={currentProject}
        onUpdateProject={handleUpdateCurrentProject}
      />

      {/* Export Stock Package Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={currentProject}
        allProjects={projects}
        preflight={currentPreflight}
        onUpdateProject={handleUpdateCurrentProject}
      />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
