import React, { useState } from 'react';
import { 
  Kanban as KanbanIcon, 
  Plus, 
  ArrowRight, 
  MoveRight, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { Project, PipelineStatus } from '../types';

interface ProductionKanbanProps {
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  onUpdateProjectStatus: (projectId: string, nextStatus: PipelineStatus) => void;
  onNewProject: () => void;
}

const PIPELINE_COLUMNS: { status: PipelineStatus; label: string; color: string }[] = [
  { status: 'IDEA', label: 'Idea', color: 'border-neutral-700 bg-neutral-900/50' },
  { status: 'GENERATING', label: 'Generating', color: 'border-blue-900/50 bg-blue-950/20' },
  { status: 'VECTOR CLEANUP', label: 'Vector Cleanup', color: 'border-purple-900/50 bg-purple-950/20' },
  { status: 'ASSEMBLY', label: 'Assembly', color: 'border-cyan-900/50 bg-cyan-950/20' },
  { status: 'QC', label: 'QC Preflight', color: 'border-amber-900/50 bg-amber-950/20' },
  { status: 'METADATA', label: 'Metadata', color: 'border-yellow-900/50 bg-yellow-950/20' },
  { status: 'READY', label: 'Ready for Review', color: 'border-emerald-900/50 bg-emerald-950/20' },
  { status: 'EXPORTED', label: 'Exported', color: 'border-indigo-900/50 bg-indigo-950/20' },
  { status: 'SUBMITTED', label: 'Submitted', color: 'border-sky-900/50 bg-sky-950/20' },
  { status: 'ACCEPTED', label: 'Accepted', color: 'border-emerald-700/60 bg-emerald-900/30' },
  { status: 'REJECTED', label: 'Rejected', color: 'border-rose-900/50 bg-rose-950/30' },
];

export const ProductionKanban: React.FC<ProductionKanbanProps> = ({
  projects,
  onOpenProject,
  onUpdateProjectStatus,
  onNewProject,
}) => {
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedProjectId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: PipelineStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedProjectId;
    if (id) {
      onUpdateProjectStatus(id, targetStatus);
    }
    setDraggedProjectId(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 overflow-hidden text-neutral-200 select-none">
      {/* Kanban Topbar */}
      <div className="h-12 bg-neutral-900 border-b border-neutral-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <KanbanIcon className="w-4 h-4 text-amber-400" />
          <h1 className="font-bold text-sm text-neutral-100 uppercase tracking-wide">
            11-Stage Production Pipeline Queue
          </h1>
          <span className="text-xs text-neutral-400 font-mono ml-2">
            ({projects.length} Total Projects)
          </span>
        </div>

        <button
          onClick={onNewProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Stock Project</span>
        </button>
      </div>

      {/* Horizontal Scroll Columns Area */}
      <div className="flex-1 overflow-x-auto p-4 flex gap-3.5 items-start">
        {PIPELINE_COLUMNS.map(col => {
          const colProjects = projects.filter(p => p.status === col.status);
          return (
            <div
              key={col.status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`w-64 shrink-0 rounded-xl border flex flex-col max-h-[calc(100vh-130px)] ${col.color}`}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-neutral-800/80 flex items-center justify-between">
                <span className="font-semibold text-xs text-neutral-200 uppercase tracking-wider">
                  {col.label}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                  {colProjects.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="p-2.5 overflow-y-auto space-y-2 flex-1 min-h-[140px]">
                {colProjects.map(proj => (
                  <div
                    key={proj.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, proj.id)}
                    className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 hover:border-neutral-700 shadow-sm cursor-grab active:cursor-grabbing transition-all space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-semibold text-xs text-neutral-100 leading-snug line-clamp-2">
                        {proj.name}
                      </div>
                      <button
                        onClick={() => onOpenProject(proj.id)}
                        className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
                        title="Open in Workspace"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between">
                      <span>{proj.niche}</span>
                      <span>{proj.slots.filter(s => s.svgContent).length} icons</span>
                    </div>

                    {/* Quick Move Next Status */}
                    <div className="pt-1.5 border-t border-neutral-800/60 flex items-center justify-between text-[10px]">
                      <span className="text-neutral-500">
                        {proj.metadata.keywords.length} kw
                      </span>

                      {/* Dropdown status selector */}
                      <select
                        value={proj.status}
                        onChange={(e) => onUpdateProjectStatus(proj.id, e.target.value as PipelineStatus)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-neutral-950 border border-neutral-800 rounded px-1.5 py-0.5 text-[10px] text-neutral-300 focus:outline-none"
                      >
                        {PIPELINE_COLUMNS.map(c => (
                          <option key={c.status} value={c.status}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                {colProjects.length === 0 && (
                  <div className="h-20 flex items-center justify-center text-[11px] text-neutral-600 italic">
                    Drop asset here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
