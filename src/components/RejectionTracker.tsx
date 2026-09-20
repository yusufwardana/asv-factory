import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Plus, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  HelpCircle,
  Lightbulb,
  Trash2
} from 'lucide-react';
import { RejectionLog, RejectionReason } from '../types';

interface RejectionTrackerProps {
  rejections: RejectionLog[];
  onAddRejection: (log: Omit<RejectionLog, 'id'>) => void;
  onDeleteRejection: (id: string) => void;
}

const REJECTION_REASONS: RejectionReason[] = [
  'Technical Issue',
  'Quality Issue',
  'Similar Content',
  'Intellectual Property',
  'Inaccurate Metadata',
  'Generative AI Quality Issue',
  'Other'
];

export const RejectionTracker: React.FC<RejectionTrackerProps> = ({
  rejections,
  onAddRejection,
  onDeleteRejection,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<RejectionReason>('Similar Content');
  const [notes, setNotes] = useState('');
  const [actionPlan, setActionPlan] = useState('');

  // Calculate percentage breakdown
  const reasonCounts = rejections.reduce((acc, r) => {
    acc[r.reason] = (acc[r.reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleCreate = () => {
    if (!assetName.trim()) return;
    onAddRejection({
      assetName: assetName.trim(),
      date,
      reason,
      notes,
      actionPlan
    });
    setAssetName('');
    setNotes('');
    setActionPlan('');
    setShowAddModal(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-950 text-neutral-200 select-none">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-rose-950/40 to-neutral-900 p-5 rounded-xl border border-rose-900/40 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              MODERATION AUDIT
            </span>
            <span className="text-xs text-neutral-400">Continuous Learning Loop</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-100">
            Adobe Stock Rejection Tracker &amp; Feedback Analytics
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
            Record actual Adobe Stock moderation feedback to refine factory preflight rules, protect contributor trust ranking, and eliminate repeat rejections.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-neutral-950 font-bold text-xs shadow-lg transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Log Moderation Rejection</span>
        </button>
      </div>

      {/* Analytics Breakdown Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-900/80 p-5 rounded-xl border border-neutral-800 col-span-2 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
            Rejection Reason Distribution ({rejections.length} Logged)
          </h2>

          <div className="space-y-2">
            {REJECTION_REASONS.map(r => {
              const count = reasonCounts[r] || 0;
              const pct = rejections.length > 0 ? Math.round((count / rejections.length) * 100) : 0;
              return (
                <div key={r} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-300">{r}</span>
                    <span className="font-mono text-neutral-400">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                    <div 
                      className="h-full bg-rose-500 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stock Contributor Insights Card */}
        <div className="bg-neutral-900/80 p-5 rounded-xl border border-neutral-800 space-y-3">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wide">
            <Lightbulb className="w-4 h-4" />
            <span>Moderation Trench Rules</span>
          </div>

          <ul className="text-xs text-neutral-300 space-y-2.5">
            <li className="flex items-start gap-2">
              <span className="text-rose-400 font-bold">•</span>
              <span><strong>Similar Content:</strong> Never submit &gt;2 color variations of the same icon sheet in the same batch.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-400 font-bold">•</span>
              <span><strong>Technical Issue:</strong> Check for open endpoints, clipping masks with raster fills, and tiny stray points.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-400 font-bold">•</span>
              <span><strong>Inaccurate Metadata:</strong> Never include competitor software names (&quot;Illustrator file&quot;) or keyword spam.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Logged Rejections Table */}
      <div className="bg-neutral-900/80 rounded-xl border border-neutral-800 overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-100 uppercase tracking-wide">
            Logged Rejections History
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/60 border-b border-neutral-800 text-neutral-400 text-[11px] font-mono uppercase">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Asset Name</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Moderator Notes</th>
                <th className="p-3">Action Plan / Fix</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {rejections.map(item => (
                <tr key={item.id} className="hover:bg-neutral-800/30">
                  <td className="p-3 font-mono text-neutral-400 whitespace-nowrap">{item.date}</td>
                  <td className="p-3 font-medium text-neutral-200">{item.assetName}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                      {item.reason}
                    </span>
                  </td>
                  <td className="p-3 text-neutral-400 max-w-xs truncate">{item.notes || '—'}</td>
                  <td className="p-3 text-emerald-400 max-w-xs truncate font-medium">{item.actionPlan || '—'}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onDeleteRejection(item.id)}
                      className="text-neutral-500 hover:text-rose-400 p-1"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {rejections.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-neutral-500 italic">
                    Zero rejections logged. Keep maintaining 100% technical preflight passes!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Rejection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-neutral-100 uppercase tracking-wide">
              Log Stock Rejection Feedback
            </h3>

            <div>
              <label className="text-neutral-400 text-[10px] block mb-1">Asset Name</label>
              <input
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="e.g. Smart Energy Icons Vol 1"
                className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-neutral-400 text-[10px] block mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="text-neutral-400 text-[10px] block mb-1">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as RejectionReason)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white"
                >
                  {REJECTION_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-neutral-400 text-[10px] block mb-1">Moderator Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Copy paste exact rejection message from Adobe Stock..."
                rows={2}
                className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white"
              />
            </div>

            <div>
              <label className="text-neutral-400 text-[10px] block mb-1">Action Plan / Factory Fix</label>
              <input
                type="text"
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                placeholder="e.g. Unify stroke weights to 2.5px and remove 1 duplicate keyword"
                className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-1.5 rounded bg-rose-500 hover:bg-rose-400 text-neutral-950 font-bold"
              >
                Save Rejection Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
