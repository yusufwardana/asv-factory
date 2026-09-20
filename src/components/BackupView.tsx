import React, { useRef, useState } from 'react';
import { 
  DatabaseBackup, 
  Download, 
  Upload, 
  ShieldCheck, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  FileText
} from 'lucide-react';
import { Project, RejectionLog, DailyMetrics } from '../types';

interface BackupViewProps {
  currentProject: Project;
  allProjects: Project[];
  rejections: RejectionLog[];
  metrics: DailyMetrics;
  onRestoreBackup: (data: { projects: Project[]; rejections?: RejectionLog[]; metrics?: DailyMetrics }) => void;
  onResetToDefault: () => void;
}

export const BackupView: React.FC<BackupViewProps> = ({
  currentProject,
  allProjects,
  rejections,
  metrics,
  onRestoreBackup,
  onResetToDefault,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Export current project only
  const handleExportCurrent = () => {
    const jsonStr = JSON.stringify(currentProject, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.asvf-project.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMsg('Current project exported as .asvf-project.json');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Export all projects & database
  const handleExportFullBackup = () => {
    const fullBackup = {
      app: 'Adobe Stock Vector Factory',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      projects: allProjects,
      rejections,
      metrics
    };
    const jsonStr = JSON.stringify(fullBackup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asvf-full-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMsg(`Complete backup of ${allProjects.length} projects exported successfully.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Import / restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.projects && Array.isArray(parsed.projects)) {
          onRestoreBackup(parsed);
          setSuccessMsg(`Restored ${parsed.projects.length} projects successfully.`);
        } else if (parsed.id && parsed.slots) {
          // Single project file
          onRestoreBackup({ projects: [parsed] });
          setSuccessMsg(`Restored project "${parsed.name}" successfully.`);
        }
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err) {
        alert('Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-950 text-neutral-200 select-none">
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-neutral-900 to-neutral-900/60 p-5 rounded-xl border border-neutral-800 shadow-md">
        <div className="flex items-center gap-2 mb-1">
          <DatabaseBackup className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            LOCAL-FIRST DATA ENGINE
          </span>
        </div>
        <h1 className="text-xl font-bold text-neutral-100">
          Local Storage &amp; Full Backup Studio
        </h1>
        <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
          100% Client-Side. Your vector artwork, metadata, and production logs are stored privately in browser IndexedDB with zero cloud telemetry.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Storage Status & Backup Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Card */}
        <div className="bg-neutral-900/80 rounded-xl border border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-amber-400" />
              <h2 className="font-bold text-xs uppercase tracking-wider text-neutral-200">
                Backup Data Exports
              </h2>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              {allProjects.length} Projects Saved
            </span>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            Download your work as human-readable JSON files to transfer between computers or preserve offline archives.
          </p>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleExportCurrent}
              className="w-full py-2.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 flex items-center justify-between transition-colors"
            >
              <span>Export Active Project (.asvf-project.json)</span>
              <FileText className="w-4 h-4 text-amber-400" />
            </button>

            <button
              onClick={handleExportFullBackup}
              className="w-full py-2.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center justify-between transition-colors"
            >
              <span>Export All Projects &amp; Analytics (.JSON)</span>
              <Download className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="bg-neutral-900/80 rounded-xl border border-neutral-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-400" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-neutral-200">
              Restore from Backup
            </h2>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            Upload previously exported <code>.asvf-project.json</code> or full backup archives to restore your stock factory workspace.
          </p>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 flex items-center justify-between transition-colors"
            >
              <span>Choose Backup File to Restore...</span>
              <Upload className="w-4 h-4 text-blue-400" />
            </button>

            <button
              onClick={() => {
                if (confirm('Reset to standard Residential Solar Energy demo preset?')) {
                  onResetToDefault();
                  setSuccessMsg('Reset to factory default preset successfully.');
                  setTimeout(() => setSuccessMsg(null), 3000);
                }
              }}
              className="w-full py-2.5 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs border border-neutral-800 flex items-center justify-between transition-colors"
            >
              <span>Reset to Factory Demo Preset</span>
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Security & Privacy Guarantee */}
      <div className="bg-neutral-900/60 rounded-xl border border-neutral-800/80 p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-400 space-y-1">
          <div className="font-semibold text-neutral-200">100% Local Vector Security</div>
          <p>
            In compliance with Section 43 of the Adobe Stock Vector Factory specifications, your vector intellectual property is parsed, sanitized, normalized, and preflight-audited strictly within your local browser runtime. Zero external API calls transmit your vector paths.
          </p>
        </div>
      </div>
    </div>
  );
};
