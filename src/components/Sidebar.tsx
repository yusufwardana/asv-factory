import React from 'react';
import { 
  LayoutGrid, 
  BarChart3, 
  Folders, 
  Kanban, 
  FileBox, 
  ShieldAlert, 
  Flame, 
  DatabaseBackup,
  Sparkles
} from 'lucide-react';

export type ActiveTab = 
  | 'workspace'
  | 'dashboard'
  | 'projects'
  | 'kanban'
  | 'templates'
  | 'rejections'
  | 'focus-mode'
  | 'backup';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  pendingRejectionsCount?: number;
  readyProjectsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingRejectionsCount = 3,
  readyProjectsCount = 1
}) => {
  const navItems = [
    {
      id: 'workspace' as ActiveTab,
      label: 'Workspace',
      icon: LayoutGrid,
      desc: 'Canvas & Inspector'
    },
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: BarChart3,
      desc: 'Daily Tracker & Goals'
    },
    {
      id: 'projects' as ActiveTab,
      label: 'Projects',
      icon: Folders,
      desc: 'All Stock Assets'
    },
    {
      id: 'kanban' as ActiveTab,
      label: 'Production Queue',
      icon: Kanban,
      badge: readyProjectsCount > 0 ? readyProjectsCount : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      desc: '11-Stage Pipeline'
    },
    {
      id: 'templates' as ActiveTab,
      label: 'Preset Templates',
      icon: FileBox,
      desc: 'Artboards & Grids'
    },
    {
      id: 'rejections' as ActiveTab,
      label: 'Rejection Tracker',
      icon: ShieldAlert,
      badge: pendingRejectionsCount > 0 ? pendingRejectionsCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      desc: 'Moderation Feedback'
    },
    {
      id: 'focus-mode' as ActiveTab,
      label: 'Production Day',
      icon: Flame,
      highlight: true,
      desc: 'Targeted Focus Mode'
    },
    {
      id: 'backup' as ActiveTab,
      label: 'Backup & Storage',
      icon: DatabaseBackup,
      desc: 'IndexedDB & JSON'
    }
  ];

  return (
    <aside className="w-56 bg-neutral-900 border-r border-neutral-800 flex flex-col justify-between shrink-0 select-none">
      {/* Navigation Links */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          Production Workspace
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              id={`nav-${item.id}`}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-all ${
                isActive
                  ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-neutral-400'}`} />
                <div className="text-left">
                  <div className="leading-tight">{item.label}</div>
                  <div className="text-[10px] text-neutral-400 font-normal leading-none mt-0.5">{item.desc}</div>
                </div>
              </div>

              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-mono ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}

              {item.highlight && !item.badge && (
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer / Core Principle reminder */}
      <div className="p-3 border-t border-neutral-800/80 bg-neutral-950/40">
        <div className="p-2 rounded bg-neutral-900/90 border border-neutral-800 text-[11px] text-neutral-400">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-200 text-xs mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Core Principle</span>
          </div>
          <p className="italic text-neutral-400 text-[10.5px]">
            &quot;Produce faster, not sloppier. Human review remains the ultimate quality gate.&quot;
          </p>
        </div>
      </div>
    </aside>
  );
};
