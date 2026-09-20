import { Project, RejectionRecord, ProductionTemplate, DailyMetrics } from '../types';
import { RESIDENTIAL_SOLAR_PRESET } from '../data/residentialSolarPreset';
import { sanitizeAndInspectSvg } from './svgUtils';

const DB_NAME = 'asvf_vector_factory_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_REJECTIONS = 'rejections';
const STORE_TEMPLATES = 'templates';
const STORE_METRICS = 'metrics';

// Fallback keys for localStorage
const LS_PROJECTS_KEY = 'asvf_projects_v1';
const LS_REJECTIONS_KEY = 'asvf_rejections_v1';
const LS_TEMPLATES_KEY = 'asvf_templates_v1';
const LS_METRICS_KEY = 'asvf_metrics_v1';

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_REJECTIONS)) {
        db.createObjectStore(STORE_REJECTIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
        db.createObjectStore(STORE_TEMPLATES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_METRICS)) {
        db.createObjectStore(STORE_METRICS, { keyPath: 'date' });
      }
    };

    request.onsuccess = (e: any) => {
      dbInstance = e.target.result;
      resolve(dbInstance as IDBDatabase);
    };

    request.onerror = (e) => {
      console.warn('IndexedDB failed, falling back to localStorage', e);
      reject(e);
    };
  });
}

// ---------------- PROJECTS ----------------

export async function getStoredProjects(): Promise<Project[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result as Project[];
        if (results && results.length > 0) {
          resolve(results);
        } else {
          // Check localStorage or create default starter project
          const lsData = localStorage.getItem(LS_PROJECTS_KEY);
          if (lsData) {
            try {
              const parsed = JSON.parse(lsData);
              resolve(parsed);
              return;
            } catch {}
          }
          const defaultProj = createDefaultProject();
          saveProject(defaultProj);
          resolve([defaultProj]);
        }
      };
      req.onerror = () => {
        fallbackGetProjects(resolve);
      };
    });
  } catch (err) {
    return new Promise(resolve => fallbackGetProjects(resolve));
  }
}

function fallbackGetProjects(resolve: (val: Project[]) => void) {
  const lsData = localStorage.getItem(LS_PROJECTS_KEY);
  if (lsData) {
    try {
      resolve(JSON.parse(lsData));
      return;
    } catch {}
  }
  const defaultProj = createDefaultProject();
  localStorage.setItem(LS_PROJECTS_KEY, JSON.stringify([defaultProj]));
  resolve([defaultProj]);
}

export async function saveProject(project: Project): Promise<void> {
  // Sync to localStorage
  try {
    const current = await getStoredProjects();
    const index = current.findIndex(p => p.id === project.id);
    if (index >= 0) {
      current[index] = project;
    } else {
      current.push(project);
    }
    localStorage.setItem(LS_PROJECTS_KEY, JSON.stringify(current));
  } catch {}

  try {
    const db = await getDB();
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    store.put(project);
  } catch (e) {
    console.warn('Could not save to IndexedDB', e);
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    const current = await getStoredProjects();
    const filtered = current.filter(p => p.id !== id);
    localStorage.setItem(LS_PROJECTS_KEY, JSON.stringify(filtered));
  } catch {}

  try {
    const db = await getDB();
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    store.delete(id);
  } catch {}
}

// ---------------- REJECTIONS ----------------

export async function getStoredRejections(): Promise<RejectionRecord[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_REJECTIONS, 'readonly');
      const store = tx.objectStore(STORE_REJECTIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        if (req.result && req.result.length > 0) {
          resolve(req.result);
        } else {
          resolve(getFallbackRejections());
        }
      };
      req.onerror = () => resolve(getFallbackRejections());
    });
  } catch {
    return getFallbackRejections();
  }
}

function getFallbackRejections(): RejectionRecord[] {
  const ls = localStorage.getItem(LS_REJECTIONS_KEY);
  if (ls) {
    try { return JSON.parse(ls); } catch {}
  }
  // Seed sample moderation feedback history to help user learn from the start
  const sampleRejections: RejectionRecord[] = [
    {
      id: 'rej-01',
      assetName: 'Solar Energy Line Icons (Draft 1)',
      date: '2026-09-15',
      reason: 'Similar Content',
      notes: 'Adobe flagged as too similar to existing set; needed more diverse object representations rather than simple color shifts.'
    },
    {
      id: 'rej-02',
      assetName: 'Smart Inverter Flow Diagram',
      date: '2026-09-10',
      reason: 'Technical',
      notes: 'Included un-expanded live text layer; all typography must be converted to vector outlines.'
    },
    {
      id: 'rej-03',
      assetName: 'Eco Home Elements',
      date: '2026-09-02',
      reason: 'Quality',
      notes: 'Trace artifacts from auto-tracing bitmap sketches; clean native bezier curves required.'
    }
  ];
  localStorage.setItem(LS_REJECTIONS_KEY, JSON.stringify(sampleRejections));
  return sampleRejections;
}

export async function saveRejections(rejections: RejectionRecord[]): Promise<void> {
  localStorage.setItem(LS_REJECTIONS_KEY, JSON.stringify(rejections));
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_REJECTIONS, 'readwrite');
    const store = tx.objectStore(STORE_REJECTIONS);
    store.clear();
    for (const r of rejections) {
      store.put(r);
    }
  } catch {}
}

export function saveDailyMetrics(metrics: DailyMetrics): void {
  localStorage.setItem(LS_METRICS_KEY, JSON.stringify(metrics));
}

// Convenient aliases for App.tsx
export const loadAllProjects = getStoredProjects;
export const deleteProjectFromStorage = deleteProject;
export const loadRejections = getStoredRejections;
export const loadDailyMetrics = async (): Promise<DailyMetrics> => getDailyMetrics();


// ---------------- TEMPLATES ----------------

export async function getStoredTemplates(): Promise<ProductionTemplate[]> {
  const defaultTemplates: ProductionTemplate[] = [
    {
      id: 'tpl-16-outline',
      name: '16 Icon Clean Outline (4x4)',
      description: 'Standard 4000x4000 px artboard with 16 balanced outline slots and 40px safe margins.',
      assetType: 'icon-sheet',
      canvas: { width: 4000, height: 4000 },
      grid: { rows: 4, cols: 4 },
      padding: 60,
      palette: ['#062649', '#2E7CC1', '#4CA741', '#FEC912'],
      strokeSystem: 2.5,
      exportSettings: { format: 'svg', includeQc: true, includeMetadata: true }
    },
    {
      id: 'tpl-single-icon',
      name: 'Single Master Icon (2000x2000)',
      description: 'High-res square canvas for standalone stock icons, hero glyphs, and app logos.',
      assetType: 'single-icon',
      canvas: { width: 2000, height: 2000 },
      grid: { rows: 1, cols: 1 },
      padding: 120,
      palette: ['#062649', '#2E7CC1', '#4CA741'],
      strokeSystem: 3.0,
      exportSettings: { format: 'svg', includeQc: true, includeMetadata: true }
    },
    {
      id: 'tpl-9-minimal',
      name: '9 Icon Minimal Grid (3x3)',
      description: 'Spacious 3x3 layout ideal for complex element sets and detailed UI illustrations.',
      assetType: 'icon-sheet',
      canvas: { width: 4000, height: 4000 },
      grid: { rows: 3, cols: 3 },
      padding: 80,
      palette: ['#1E293B', '#3B82F6', '#10B981'],
      strokeSystem: 2.0,
      exportSettings: { format: 'svg', includeQc: true, includeMetadata: true }
    },
    {
      id: 'tpl-seamless-pattern',
      name: 'Seamless Pattern Canvas (2000x2000)',
      description: 'Square tile canvas with live 1x, 2x2, and 4x4 tiling verification to guarantee zero edge seams.',
      assetType: 'pattern',
      canvas: { width: 2000, height: 2000 },
      grid: { rows: 1, cols: 1 },
      padding: 0,
      palette: ['#062649', '#4CA741', '#FEC912'],
      strokeSystem: 2.0,
      exportSettings: { format: 'svg', includeQc: true, includeMetadata: true }
    }
  ];

  const ls = localStorage.getItem(LS_TEMPLATES_KEY);
  if (ls) {
    try {
      const parsed = JSON.parse(ls);
      if (parsed.length > 0) return parsed;
    } catch {}
  }
  localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(defaultTemplates));
  return defaultTemplates;
}

export async function saveTemplate(tpl: ProductionTemplate): Promise<void> {
  const current = await getStoredTemplates();
  const idx = current.findIndex(t => t.id === tpl.id);
  if (idx >= 0) current[idx] = tpl;
  else current.push(tpl);
  localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(current));
}

// ---------------- DAILY METRICS ----------------

export function getDailyMetrics(): DailyMetrics {
  const today = new Date().toISOString().split('T')[0];
  const ls = localStorage.getItem(LS_METRICS_KEY);
  if (ls) {
    try {
      const data = JSON.parse(ls);
      if (data.date === today) return data;
    } catch {}
  }
  const initial: DailyMetrics = {
    date: today,
    target: 3,
    started: 3,
    qcPassed: 2,
    ready: 2,
    exported: 1,
    submitted: 1,
    accepted: 8,
    rejected: 2,
  };
  localStorage.setItem(LS_METRICS_KEY, JSON.stringify(initial));
  return initial;
}

export function updateDailyMetrics(updater: (prev: DailyMetrics) => DailyMetrics): DailyMetrics {
  const prev = getDailyMetrics();
  const next = updater(prev);
  localStorage.setItem(LS_METRICS_KEY, JSON.stringify(next));
  return next;
}

// ---------------- FACTORY DEFAULT STARTER PROJECT ----------------

export function createDefaultProject(): Project {
  // Populate the 16 Residential Solar Energy icons
  const slots = RESIDENTIAL_SOLAR_PRESET.map((p, idx) => {
    const inspected = sanitizeAndInspectSvg(p.svg, p.label);
    return {
      id: `slot-${idx + 1}`,
      index: idx,
      label: p.label,
      svgContent: inspected.cleanSvg,
      rawSvgContent: p.svg,
      bounds: inspected.viewBox,
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      visualWeight: 1.0,
      stats: inspected.stats,
      sanitizationLog: inspected.logs
    };
  });

  return {
    id: 'proj-solar-001',
    name: 'Residential Solar Energy Icon Sheet',
    niche: 'Renewable Energy',
    topic: 'Residential Solar & Battery Systems',
    style: 'Modern Line Vector with Dual-tone Fill Accents',
    palette: ['#062649', '#2E7CC1', '#4CA741', '#FEC912'],
    aiStatus: 'no',
    aiChecklist: {
      commercialTermsReviewed: true,
      artworkVisuallyReviewed: true,
      artifactsCorrected: true,
      noUnauthorizedIp: true,
      adobeAiCheckboxAcknowledged: true
    },
    creationDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'READY',
    assetType: 'icon-sheet',
    canvasConfig: {
      width: 4000,
      height: 4000,
      gridRows: 4,
      gridCols: 4,
      safePadding: 50,
      showGrid: true,
      showSafeAreas: true
    },
    slots,
    metadata: {
      title: 'Residential Solar Energy and Green Power Vector Icon Set',
      category: 'Icons / Renewable Energy',
      keywords: [
        'solar energy',
        'solar panels',
        'renewable energy',
        'green power',
        'solar home',
        'clean energy',
        'photovoltaic',
        'battery storage',
        'solar inverter',
        'eco friendly',
        'smart meter',
        'ev charging',
        'electric vehicle',
        'power grid',
        'energy efficiency',
        'sustainable living',
        'carbon neutral',
        'alternative energy',
        'power generation',
        'electricity',
        'solar installer',
        'home battery',
        'rooftop solar',
        'solar technology',
        'sunlight power',
        'environment',
        'eco house',
        'energy saving',
        'energy storage',
        'smart grid'
      ],
      concept: 'Household clean energy adoption, self-consumption solar plus storage',
      industry: 'Solar Technology / Architecture / Green Tech',
      useCase: 'Website illustration, app interface, infographics, marketing collateral',
      style: 'Monoline stroke with vibrant ecological color accents'
    },
    variations: [
      {
        id: 'var-01',
        name: 'Dark Navy Background Variant',
        differenceType: 'composition',
        differenceNotes: 'Inverted stroke contrast for dark UI and high-tech dashboard applications.',
        createdAt: new Date().toISOString()
      }
    ],
    humanReviewed: true,
    approvedForExport: true,
    notes: 'Meets 4000x4000 Adobe Stock spec. All icons vector stroked with 2.5px width and 50px safe margins.'
  };
}

export function exportProjectBackupFile(project: Project): void {
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  a.href = url;
  a.download = `${safeName}.asvf-project.json`;
  a.click();
  URL.revokeObjectURL(url);
}
