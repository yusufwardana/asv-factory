export type AssetType = 
  | 'single-icon'
  | 'icon-sheet'
  | 'design-elements'
  | 'vector-illustration'
  | 'diagram'
  | 'pattern'
  | 'digital-design'
  | 'custom-vector';

export type PipelineStatus = 
  | 'IDEA'
  | 'GENERATING'
  | 'VECTOR CLEANUP'
  | 'ASSEMBLY'
  | 'QC'
  | 'METADATA'
  | 'READY'
  | 'EXPORTED'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED';

export type AiStatus = 'no' | 'yes' | 'unsure';

export interface AiChecklist {
  commercialTermsReviewed: boolean;
  artworkVisuallyReviewed: boolean;
  artifactsCorrected: boolean;
  noUnauthorizedIp: boolean;
  adobeAiCheckboxAcknowledged: boolean;
}

export interface CanvasConfig {
  width: number;
  height: number;
  gridRows: number;
  gridCols: number;
  safePadding: number; // padding inside each slot in px
  showGrid?: boolean;
  showSafeAreas?: boolean;
  backgroundColor?: string;
}

export interface VectorStats {
  elementCount: number;
  pathCount: number;
  nodeEstimate: number;
  groupCount: number;
  colors: string[];
  strokeWidths: number[];
  hasRaster: boolean;
  hasText: boolean;
  hasScripts: boolean;
  hasGradients: boolean;
  hasMasks: boolean;
  hasClipPaths: boolean;
  hasExternalRefs: boolean;
  artifactsCount: number;
}

export interface IconSlot {
  id: string;
  index: number;
  label: string;
  svgContent: string; // Sanitized inner/root SVG
  rawSvgContent?: string;
  originalViewBox?: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation?: number;
  visualWeight?: number; // normalized area/density
  stats: VectorStats;
  sanitizationLog: string[];
}

export interface AssetMetadata {
  title: string;
  description?: string;
  category: string;
  keywords: string[];
  concept: string;
  industry: string;
  useCase?: string;
  style: string;
  targetBuyer?: string;
}

export interface AssetVariation {
  id: string;
  name: string;
  differenceType: 'subject' | 'composition' | 'use-case' | 'style';
  differenceNotes: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  niche: string;
  topic: string;
  style?: string;
  palette?: string[];
  aiStatus: AiStatus;
  aiChecklist: AiChecklist;
  creationDate?: string;
  createdAt?: string;
  updatedAt: string;
  status: PipelineStatus;
  assetType: AssetType;
  canvasConfig: CanvasConfig;
  slots: IconSlot[];
  metadata: AssetMetadata;
  variations?: AssetVariation[];
  humanReviewed: boolean;
  approvedForExport: boolean;
  notes?: string;
}

export type PreflightStatus = 'pass' | 'warning' | 'fail';

export interface PreflightItem {
  id: string;
  category: 'file' | 'canvas' | 'vector' | 'editability' | 'color' | 'strokes' | 'effects' | 'security' | 'metadata' | 'ai-disclosure';
  title: string;
  status: PreflightStatus;
  message: string;
  detail?: string;
  fixActionLabel?: string;
}

export interface PreflightResult {
  overall: 'PASS' | 'WARNING' | 'FAIL';
  summary: string;
  passCount: number;
  warningCount: number;
  failCount: number;
  items: PreflightItem[];
  readyForReview: boolean;
}

export type RejectionReason = 
  | 'Technical' 
  | 'Quality' 
  | 'Similar Content' 
  | 'IP' 
  | 'Metadata' 
  | 'AI Quality' 
  | 'Other'
  | 'Technical Issue'
  | 'Quality Issue'
  | 'Intellectual Property'
  | 'Inaccurate Metadata'
  | 'Generative AI Quality Issue';

export interface RejectionRecord {
  id: string;
  projectId?: string;
  assetName: string;
  date: string;
  reason: RejectionReason;
  notes: string;
  actionPlan?: string;
}

export type RejectionLog = RejectionRecord;


export interface ProductionTemplate {
  id: string;
  name: string;
  description: string;
  assetType: AssetType;
  canvas: { width: number; height: number };
  grid: { rows: number; cols: number };
  padding: number;
  palette: string[];
  strokeSystem: number;
  exportSettings: {
    format: 'svg';
    includeQc: boolean;
    includeMetadata: boolean;
  };
}

export interface DailyMetrics {
  date: string;
  target: number;
  started: number;
  qcPassed: number;
  ready: number;
  exported: number;
  submitted: number;
  accepted: number;
  rejected: number;
}
