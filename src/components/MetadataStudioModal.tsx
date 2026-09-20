import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Copy, 
  AlertTriangle, 
  Check, 
  Wand2,
  FileCheck
} from 'lucide-react';
import { Project, AssetMetadata } from '../types';

interface MetadataStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject: (updater: (prev: Project) => Project) => void;
}

const STOCK_CATEGORIES = [
  'Icons / Graphics',
  'Renewable Energy / Environment',
  'Technology & Smart Home',
  'Business & Industry',
  'Science & Education',
  'Transport & Automotive',
  'Real Estate & Architecture',
  'Health & Medical',
  'Abstract / Design Elements'
];

export const MetadataStudioModal: React.FC<MetadataStudioModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
}) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [batchKeywords, setBatchKeywords] = useState('');
  const [showBatchInput, setShowBatchInput] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generator form fields
  const [genSubject, setGenSubject] = useState(project.niche || 'Solar Energy');
  const [genConcept, setGenConcept] = useState(project.topic || 'Residential Clean Power');
  const [genObjects, setGenObjects] = useState('solar panel, home battery, inverter, smart meter, EV charger');
  const [genIndustry, setGenIndustry] = useState('Green Technology');
  const [genStyle, setGenStyle] = useState('Modern vector icon set');

  if (!isOpen) return null;

  const meta = project.metadata;
  const keywords = meta.keywords || [];
  const highPriority = keywords.slice(0, 10);
  const secondary = keywords.slice(10, 50);

  // Redundancy analysis: detect singular/plural pairs e.g. "solar panel" and "solar panels"
  const redundantPairs: string[] = [];
  keywords.forEach(k => {
    const lower = k.toLowerCase().trim();
    if (lower.endsWith('s')) {
      const singular = lower.slice(0, -1);
      if (keywords.map(kw => kw.toLowerCase().trim()).includes(singular)) {
        redundantPairs.push(`"${singular}" & "${lower}"`);
      }
    }
  });

  const updateMetadata = (partial: Partial<AssetMetadata>) => {
    onUpdateProject(prev => ({
      ...prev,
      metadata: { ...prev.metadata, ...partial },
      updatedAt: new Date().toISOString()
    }));
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    const clean = newKeyword.trim().toLowerCase();
    if (keywords.map(k => k.toLowerCase()).includes(clean)) return;
    if (keywords.length >= 50) return;

    updateMetadata({ keywords: [...keywords, clean] });
    setNewKeyword('');
  };

  const handleBatchAdd = () => {
    if (!batchKeywords.trim()) return;
    const parts = batchKeywords.split(/[,;\n]+/).map(p => p.trim().toLowerCase()).filter(Boolean);
    const existing = new Set(keywords.map(k => k.toLowerCase()));
    const toAdd: string[] = [];

    parts.forEach(p => {
      if (!existing.has(p) && toAdd.length + keywords.length < 50) {
        existing.add(p);
        toAdd.push(p);
      }
    });

    updateMetadata({ keywords: [...keywords, ...toAdd] });
    setBatchKeywords('');
    setShowBatchInput(false);
  };

  const handleRemoveKeyword = (index: number) => {
    const next = [...keywords];
    next.splice(index, 1);
    updateMetadata({ keywords: next });
  };

  const handleMoveKeyword = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= keywords.length) return;
    const next = [...keywords];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    updateMetadata({ keywords: next });
  };

  // Structured Metadata Generator
  const handleRunGenerator = () => {
    const objectsList = genObjects.split(',').map(o => o.trim().toLowerCase()).filter(Boolean);
    const subjectClean = genSubject.toLowerCase().trim();
    const conceptClean = genConcept.toLowerCase().trim();
    const industryClean = genIndustry.toLowerCase().trim();

    // Generate commercial title
    const generatedTitle = `${genSubject} and ${genConcept} Vector Icon Set`;

    // Generate curated keywords
    const kwSet = new Set<string>([
      subjectClean,
      conceptClean,
      industryClean,
      'vector',
      'icon set',
      'graphic design',
      'illustration',
      'symbol',
      'sign',
      'infographic element',
      'modern outline'
    ]);

    objectsList.forEach(obj => {
      kwSet.add(obj);
      kwSet.add(`${obj} icon`);
    });

    if (subjectClean.includes('solar') || conceptClean.includes('energy')) {
      ['renewable energy', 'clean energy', 'green power', 'photovoltaic', 'sustainable technology', 'eco friendly', 'power generation', 'home automation', 'carbon neutral', 'electric system', 'energy storage'].forEach(k => kwSet.add(k));
    }

    const kwArray = Array.from(kwSet).slice(0, 45);

    updateMetadata({
      title: generatedTitle,
      keywords: kwArray,
      concept: genConcept,
      industry: genIndustry,
      style: genStyle
    });

    setShowGenerator(false);
  };

  const handleCopyKeywords = () => {
    navigator.clipboard.writeText(keywords.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden text-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-neutral-100 uppercase tracking-wide">
                Adobe Stock Metadata Studio
              </h2>
              <p className="text-xs text-neutral-400">
                Craft commercial titles &amp; order 50 keywords with prioritized ranking signals.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGenerator(!showGenerator)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Structured Generator</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Generator Drawer */}
        {showGenerator && (
          <div className="p-4 bg-neutral-950 border-b border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Structured Metadata Builder (Stock Optimized)
              </span>
              <button
                onClick={() => setShowGenerator(false)}
                className="text-xs text-neutral-400 hover:text-neutral-200"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="text-neutral-400 text-[10px] block mb-1">Subject</label>
                <input
                  type="text"
                  value={genSubject}
                  onChange={(e) => setGenSubject(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-neutral-400 text-[10px] block mb-1">Concept</label>
                <input
                  type="text"
                  value={genConcept}
                  onChange={(e) => setGenConcept(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-neutral-400 text-[10px] block mb-1">Industry</label>
                <input
                  type="text"
                  value={genIndustry}
                  onChange={(e) => setGenIndustry(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className="text-neutral-400 text-[10px] block mb-1">Included Objects (Comma separated)</label>
                <input
                  type="text"
                  value={genObjects}
                  onChange={(e) => setGenObjects(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-xs text-white"
                />
              </div>
            </div>

            <button
              onClick={handleRunGenerator}
              className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md transition-colors"
            >
              Generate Stock Title &amp; Keywords
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Title & Category */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-neutral-300 font-semibold">Commercial Asset Title</label>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {(meta.title || '').length} chars (30–80 optimal)
                </span>
              </div>
              <input
                type="text"
                value={meta.title}
                onChange={(e) => updateMetadata({ title: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 font-medium focus:outline-none focus:border-amber-400"
                placeholder="e.g. Residential Solar Energy and Battery Storage Vector Icon Set"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-neutral-300 font-semibold block mb-1">Stock Category</label>
                <select
                  value={meta.category}
                  onChange={(e) => updateMetadata({ category: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-400"
                >
                  {STOCK_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-neutral-300 font-semibold block mb-1">Visual Style</label>
                <input
                  type="text"
                  value={meta.style}
                  onChange={(e) => updateMetadata({ style: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-400"
                  placeholder="e.g. Clean monoline stroke with color fill"
                />
              </div>
            </div>
          </div>

          {/* Redundancy & Redundant Singular/Plural Warnings */}
          {redundantPairs.length > 0 && (
            <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Potential Redundant Singular/Plural Keywords:</span>
                <p className="text-[11px] text-amber-300 mt-0.5">
                  Adobe search automatically handles stemming. Detected redundant pairs: {redundantPairs.join(', ')}. Keep one to save keyword slots for more diverse search terms.
                </p>
              </div>
            </div>
          )}

          {/* Keywords Section */}
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-100 text-sm">Keywords Workspace</span>
                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                    keywords.length >= 25 && keywords.length <= 50 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                      : (keywords.length > 50 ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400')
                  }`}>
                    {keywords.length} / 50
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Keywords 1–10 dictate top ranking weight in Adobe Stock search.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyKeywords}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy All'}</span>
                </button>
                <button
                  onClick={() => setShowBatchInput(!showBatchInput)}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
                >
                  Paste Batch
                </button>
              </div>
            </div>

            {/* Quick add keyword */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                placeholder="Add keyword (press Enter)..."
                disabled={keywords.length >= 50}
                className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-400 disabled:opacity-50"
              />
              <button
                onClick={handleAddKeyword}
                disabled={keywords.length >= 50 || !newKeyword.trim()}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Batch paste input */}
            {showBatchInput && (
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
                <textarea
                  value={batchKeywords}
                  onChange={(e) => setBatchKeywords(e.target.value)}
                  placeholder="Paste comma or newline separated keywords..."
                  rows={3}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-xs text-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowBatchInput(false)}
                    className="px-2.5 py-1 rounded text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBatchAdd}
                    className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold"
                  >
                    Add Keywords
                  </button>
                </div>
              </div>
            )}

            {/* Visualizer: Top 10 High Priority vs Secondary 11-50 */}
            <div className="space-y-3">
              {/* TOP 10 */}
              <div className="bg-neutral-950 p-3 rounded-lg border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Keywords 1–10 (High Priority • Primary Search Signals)
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {highPriority.length} / 10
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {highPriority.map((kw, idx) => (
                    <div
                      key={kw}
                      className="bg-neutral-900 border border-amber-500/40 px-2 py-1 rounded-md text-neutral-200 flex items-center gap-1.5 text-xs group"
                    >
                      <span className="text-[10px] font-mono text-amber-400">{idx + 1}</span>
                      <span>{kw}</span>
                      <div className="flex items-center opacity-40 group-hover:opacity-100 transition-opacity">
                        {idx > 0 && (
                          <button onClick={() => handleMoveKeyword(idx, 'up')} title="Move up">
                            <ArrowUp className="w-3 h-3 text-neutral-400 hover:text-white" />
                          </button>
                        )}
                        {idx < keywords.length - 1 && (
                          <button onClick={() => handleMoveKeyword(idx, 'down')} title="Move down">
                            <ArrowDown className="w-3 h-3 text-neutral-400 hover:text-white" />
                          </button>
                        )}
                        <button onClick={() => handleRemoveKeyword(idx)} title="Remove">
                          <X className="w-3 h-3 text-rose-400 hover:text-rose-300 ml-1" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {highPriority.length === 0 && (
                    <span className="text-neutral-500 text-[11px] italic">No high priority keywords added yet.</span>
                  )}
                </div>
              </div>

              {/* SECONDARY 11–50 */}
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-neutral-600" />
                    Secondary Keywords 11–50
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {secondary.length} / 40
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  {secondary.map((kw, sIdx) => {
                    const realIdx = sIdx + 10;
                    return (
                      <div
                        key={kw}
                        className="bg-neutral-900 border border-neutral-800 px-2 py-1 rounded-md text-neutral-300 flex items-center gap-1.5 text-xs group hover:border-neutral-700"
                      >
                        <span className="text-[10px] font-mono text-neutral-500">{realIdx + 1}</span>
                        <span>{kw}</span>
                        <div className="flex items-center opacity-40 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleMoveKeyword(realIdx, 'up')} title="Move up">
                            <ArrowUp className="w-3 h-3 text-neutral-400 hover:text-white" />
                          </button>
                          {realIdx < keywords.length - 1 && (
                            <button onClick={() => handleMoveKeyword(realIdx, 'down')} title="Move down">
                              <ArrowDown className="w-3 h-3 text-neutral-400 hover:text-white" />
                            </button>
                          )}
                          <button onClick={() => handleRemoveKeyword(realIdx)} title="Remove">
                            <X className="w-3 h-3 text-rose-400 hover:text-rose-300 ml-1" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {secondary.length === 0 && (
                    <span className="text-neutral-500 text-[11px] italic">Add up to 40 secondary keywords for broad discoverability.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs">
          <div className="text-[11px] text-neutral-400">
            Keywords: <span className="font-mono text-neutral-200">{keywords.length}</span> / 50 • Redundancies: <span className="font-mono text-neutral-200">{redundantPairs.length}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-colors shadow-md"
          >
            Save &amp; Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};
