import React, { useState } from 'react';
import { 
  Folders, 
  Plus, 
  Copy, 
  Trash2, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  Sparkles,
  Calendar,
  Tag
} from 'lucide-react';
import { Project, PipelineStatus, AssetType } from '../types';

interface ProjectsViewProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (data: {
    name: string;
    niche: string;
    topic: string;
    assetType: AssetType;
    width: number;
    height: number;
    gridRows: number;
    gridCols: number;
    safePadding: number;
  }) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDuplicateProject,
  onDeleteProject,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [niche, setNiche] = useState('Green Technology');
  const [topic, setTopic] = useState('EV Charging & Clean Mobility');
  const [assetType, setAssetType] = useState<AssetType>('icon-sheet');
  const [gridSize, setGridSize] = useState<4 | 3 | 1>(4);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleCreate = () => {
    if (!name.trim()) return;
    const isSingle = gridSize === 1;
    onCreateProject({
      name: name.trim(),
      niche: niche.trim(),
      topic: topic.trim(),
      assetType: isSingle ? 'single-icon' : 'icon-sheet',
      width: isSingle ? 2000 : 4000,
      height: isSingle ? 2000 : 4000,
      gridRows: gridSize,
      gridCols: gridSize,
      safePadding: isSingle ? 100 : 80
    });
    setName('');
    setShowCreateModal(false);
  };

  const filteredProjects = projects.filter(p => {
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-950 text-neutral-200 select-none">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-neutral-900 to-neutral-900/60 p-5 rounded-xl border border-neutral-800 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Folders className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              STOCK ASSET REPOSITORY
            </span>
          </div>
          <h1 className="text-xl font-bold text-neutral-100">
            Stock Vector Projects ({projects.length})
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
            Manage your commercial asset catalog, track moderation lifecycles, and switch artboards instantly.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Stock Project</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs border-b border-neutral-800 pb-3">
        {['all', 'ASSEMBLY', 'QC', 'READY', 'EXPORTED', 'SUBMITTED', 'ACCEPTED'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterStatus === status 
                ? 'bg-neutral-800 text-white shadow-sm' 
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {status === 'all' ? `All (${projects.length})` : status}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map(p => {
          const isActive = p.id === activeProjectId;
          const activeIcons = p.slots.filter(s => s.svgContent).length;
          return (
            <div
              key={p.id}
              className={`bg-neutral-900/90 rounded-xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                isActive ? 'border-amber-500/50 ring-1 ring-amber-500/30' : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded text-[10.5px] font-mono font-bold ${
                    p.status === 'READY'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : p.status === 'EXPORTED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                  }`}>
                    {p.status}
                  </span>

                  {isActive && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      ACTIVE WORKSPACE
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="font-bold text-sm text-neutral-100 line-clamp-1">{p.name}</h2>
                  <div className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-neutral-500" />
                    <span>{p.niche}</span>
                    <span>•</span>
                    <span>{p.topic}</span>
                  </div>
                </div>

                <div className="bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800/80 grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                  <div>
                    <div className="text-[10px] text-neutral-400 font-sans">Artboard</div>
                    <div className="text-neutral-200">{p.canvasConfig.width}px</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-400 font-sans">Icons</div>
                    <div className="text-neutral-200">{activeIcons}/{p.slots.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-400 font-sans">Keywords</div>
                    <div className="text-neutral-200">{p.metadata.keywords.length}</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onDuplicateProject(p.id)}
                    className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
                    title="Duplicate project"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {projects.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete project "${p.name}"?`)) {
                          onDeleteProject(p.id);
                        }
                      }}
                      className="p-1.5 rounded text-neutral-400 hover:text-rose-400 hover:bg-neutral-800"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => onSelectProject(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                  }`}
                >
                  <span>{isActive ? 'In Canvas' : 'Open Project'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-neutral-100 uppercase tracking-wide">
              Create New Stock Vector Project
            </h3>

            <div>
              <label className="text-neutral-400 text-[10px] block mb-1">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Clean EV Charging Station Icons"
                className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-neutral-400 text-[10px] block mb-1">Stock Niche</label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="text-neutral-400 text-[10px] block mb-1">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-neutral-400 text-[10px] block mb-1">Layout Configuration</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { size: 4 as const, label: '16 Icons (4×4)', art: '4000×4000' },
                  { size: 3 as const, label: '9 Icons (3×3)', art: '3000×3000' },
                  { size: 1 as const, label: 'Single Hero (1×1)', art: '2000×2000' },
                ].map(opt => (
                  <button
                    key={opt.size}
                    type="button"
                    onClick={() => setGridSize(opt.size)}
                    className={`p-2 rounded border text-left transition-colors ${
                      gridSize === opt.size
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <div className="font-bold text-[11px]">{opt.label}</div>
                    <div className="text-[10px] opacity-75 font-mono">{opt.art}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold disabled:opacity-50"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
