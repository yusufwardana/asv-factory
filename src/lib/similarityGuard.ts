import { Project } from '../types';
import { getStoredProjects } from './storage';

export interface SubjectFingerprint {
  niche: string;
  topic: string;
  normalizedTitle: string;
  titleTokens: string[];
  keywords: string[];
  conceptTokens: string[];
}

export interface GeometryFingerprint {
  activeSlotCount: number;
  totalElements: number;
  totalPaths: number;
  totalNodes: number;
  palette: string[];
  strokeWidths: number[];
  commandHistogram: Record<string, number>;
  averageNodesPerPath: number;
  canvasRatio: number;
}

export interface SimilarityReportItem {
  matchedProjectId: string;
  matchedProjectName: string;
  overallScore: number; // 0 - 100%
  subjectScore: number; // 0 - 100%
  geometryScore: number; // 0 - 100%
  severity: 'clean' | 'low' | 'moderate' | 'high' | 'critical';
  isColorOnlyVariant: boolean;
  reasons: string[];
  differentiationAdvice: string[];
  metricsBreakdown: {
    titleSimilarity: number;
    keywordOverlapPct: number;
    sharedKeywords: string[];
    topologySimilarity: number;
    pathSignatureSimilarity: number;
    paletteOverlapPct: number;
    nodeDeltaPct: number;
  };
}

export interface SimilarityAuditResult {
  hasMatches: boolean;
  highestScore: number;
  worstSeverity: 'clean' | 'low' | 'moderate' | 'high' | 'critical';
  topMatch: SimilarityReportItem | null;
  allMatches: SimilarityReportItem[];
  scannedProjectsCount: number;
  flags: {
    isExactDuplicate: boolean;
    isColorOnlyVariant: boolean;
    hasKeywordCannibalization: boolean;
  };
}

// ---------------- FINGERPRINT EXTRACTION ----------------

const STOP_WORDS = new Set([
  'and', 'or', 'the', 'a', 'an', 'in', 'on', 'with', 'for', 'of', 'at', 'by', 'from',
  'vector', 'icon', 'icons', 'set', 'collection', 'illustration', 'symbol', 'glyph',
  'stock', 'design', 'graphic', 'isolated', 'white', 'background', 'art', 'sign'
]);

function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

export function extractSubjectFingerprint(project: Project): SubjectFingerprint {
  const meta = project.metadata || { title: '', keywords: [], concept: '', industry: '' };
  const rawKeywords = Array.isArray(meta.keywords) ? meta.keywords : [];
  const cleanKeywords = rawKeywords.map(k => k.toLowerCase().trim()).filter(Boolean);

  return {
    niche: (project.niche || '').toLowerCase().trim(),
    topic: (project.topic || '').toLowerCase().trim(),
    normalizedTitle: (meta.title || project.name || '').toLowerCase().trim(),
    titleTokens: tokenize(meta.title || project.name || ''),
    keywords: cleanKeywords,
    conceptTokens: tokenize(`${meta.concept || ''} ${meta.industry || ''} ${meta.useCase || ''}`)
  };
}

export function extractGeometryFingerprint(project: Project): GeometryFingerprint {
  const activeSlots = (project.slots || []).filter(s => s.svgContent && s.svgContent.trim().length > 0);
  
  let totalElements = 0;
  let totalPaths = 0;
  let totalNodes = 0;
  const colorSet = new Set<string>();
  const strokeSet = new Set<number>();
  const commandCounts: Record<string, number> = {
    M: 0, L: 0, H: 0, V: 0, C: 0, S: 0, Q: 0, T: 0, A: 0, Z: 0
  };

  for (const slot of activeSlots) {
    if (slot.stats) {
      totalElements += slot.stats.elementCount || 0;
      totalPaths += slot.stats.pathCount || 0;
      totalNodes += slot.stats.nodeEstimate || 0;
      (slot.stats.colors || []).forEach(c => colorSet.add(c.toUpperCase()));
      (slot.stats.strokeWidths || []).forEach(w => strokeSet.add(Number(w.toFixed(2))));
    }

    // Parse path commands from SVG content to create command distribution
    const pathMatches = slot.svgContent.match(/d="([^"]+)"/gi);
    if (pathMatches) {
      for (const p of pathMatches) {
        const d = p.replace(/d="|"/g, '');
        for (let i = 0; i < d.length; i++) {
          const char = d[i].toUpperCase();
          if (char in commandCounts) {
            commandCounts[char]++;
          }
        }
      }
    }
  }

  // Normalize command histogram
  const totalCommands = Object.values(commandCounts).reduce((a, b) => a + b, 0) || 1;
  const commandHistogram: Record<string, number> = {};
  for (const [k, v] of Object.entries(commandCounts)) {
    commandHistogram[k] = Number((v / totalCommands).toFixed(4));
  }

  const canvas = project.canvasConfig || { width: 4000, height: 4000 };
  const canvasRatio = Number((canvas.width / Math.max(1, canvas.height)).toFixed(2));

  return {
    activeSlotCount: activeSlots.length,
    totalElements,
    totalPaths,
    totalNodes,
    palette: Array.from(colorSet).sort(),
    strokeWidths: Array.from(strokeSet).sort((a, b) => a - b),
    commandHistogram,
    averageNodesPerPath: totalPaths > 0 ? Math.round(totalNodes / totalPaths) : 0,
    canvasRatio
  };
}

// ---------------- COMPARISON CALCULATIONS ----------------

function computeJaccard(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach(item => {
    if (setB.has(item)) intersection++;
  });
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function computeCosineSimilarity(vecA: Record<string, number>, vecB: Record<string, number>): number {
  const keys = Array.from(new Set([...Object.keys(vecA), ...Object.keys(vecB)]));
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const k of keys) {
    const valA = vecA[k] || 0;
    const valB = vecB[k] || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : Math.min(1, dotProduct / denominator);
}

export function compareProjects(current: Project, other: Project): SimilarityReportItem {
  const subA = extractSubjectFingerprint(current);
  const subB = extractSubjectFingerprint(other);

  const geoA = extractGeometryFingerprint(current);
  const geoB = extractGeometryFingerprint(other);

  // 1. Subject Similarity Calculation
  const currentTitleTokens = new Set(subA.titleTokens);
  const otherTitleTokens = new Set(subB.titleTokens);
  const titleJaccard = computeJaccard(currentTitleTokens, otherTitleTokens);

  const currentKwSet = new Set(subA.keywords);
  const otherKwSet = new Set(subB.keywords);
  const sharedKeywords: string[] = [];
  currentKwSet.forEach(kw => {
    if (otherKwSet.has(kw)) sharedKeywords.push(kw);
  });
  const keywordOverlap = computeJaccard(currentKwSet, otherKwSet);

  const isSameNiche = subA.niche && subA.niche === subB.niche;
  const isSameTopic = subA.topic && subA.topic === subB.topic;

  let subjectScore = 0;
  if (isSameNiche) subjectScore += 20;
  if (isSameTopic) subjectScore += 25;
  subjectScore += titleJaccard * 25;
  subjectScore += keywordOverlap * 30;
  subjectScore = Math.min(100, Math.round(subjectScore));

  // 2. Geometry Similarity Calculation
  let topologySimilarity = 0;
  const maxNodes = Math.max(geoA.totalNodes, geoB.totalNodes);
  const minNodes = Math.min(geoA.totalNodes, geoB.totalNodes);
  const nodeDeltaPct = maxNodes > 0 ? Math.round(((maxNodes - minNodes) / maxNodes) * 100) : 0;

  if (maxNodes > 0) {
    topologySimilarity = minNodes / maxNodes; // 1.0 if identical node count
  }

  const maxPaths = Math.max(geoA.totalPaths, geoB.totalPaths);
  const minPaths = Math.min(geoA.totalPaths, geoB.totalPaths);
  const pathSimilarity = maxPaths > 0 ? minPaths / maxPaths : 0;

  const pathSignatureSimilarity = computeCosineSimilarity(geoA.commandHistogram, geoB.commandHistogram);

  const isSlotCountSame = geoA.activeSlotCount > 0 && geoA.activeSlotCount === geoB.activeSlotCount;
  const isAspectSame = Math.abs(geoA.canvasRatio - geoB.canvasRatio) < 0.05;

  const currentPalette = new Set(geoA.palette);
  const otherPalette = new Set(geoB.palette);
  const paletteOverlap = computeJaccard(currentPalette, otherPalette);

  let geometryScore = 0;
  if (isSlotCountSame) geometryScore += 15;
  if (isAspectSame) geometryScore += 5;
  geometryScore += topologySimilarity * 25;
  geometryScore += pathSimilarity * 25;
  geometryScore += pathSignatureSimilarity * 30;
  geometryScore = Math.min(100, Math.round(geometryScore));

  // Check for Color-Only Variant (High geometry match with different palette)
  const isColorOnlyVariant = geometryScore >= 80 && paletteOverlap < 0.5;

  // 3. Overall Weighted Score
  let overallScore = Math.round(subjectScore * 0.45 + geometryScore * 0.55);
  if (isColorOnlyVariant) {
    overallScore = Math.max(overallScore, 75); // Ensure color swap variant gets flagged high
  }

  // 4. Severity Assessment
  let severity: 'clean' | 'low' | 'moderate' | 'high' | 'critical' = 'clean';
  if (overallScore >= 85) severity = 'critical';
  else if (overallScore >= 70) severity = 'high';
  else if (overallScore >= 52) severity = 'moderate';
  else if (overallScore >= 35) severity = 'low';

  // 5. Actionable Diagnostic Reasons
  const reasons: string[] = [];
  const differentiationAdvice: string[] = [];

  if (isColorOnlyVariant) {
    reasons.push('Prohibited Color-Only Variation: Vector bezier structure is >80% identical, but palette has been shifted.');
    differentiationAdvice.push('Adobe Stock policy strictly forbids simple color-swapped iterations of identical artwork.');
    differentiationAdvice.push('Introduce new object variations, alter visual perspectives, or compose new scene arrangements.');
  }

  if (topologySimilarity > 0.9 && pathSignatureSimilarity > 0.95 && isSlotCountSame) {
    reasons.push(`Near-identical bezier geometry footprint: ${geoA.activeSlotCount} slots with ~${geoA.totalNodes} nodes vs ~${geoB.totalNodes} nodes.`);
  }

  if (keywordOverlap > 0.6) {
    reasons.push(`High metadata cannibalization: ${Math.round(keywordOverlap * 100)}% shared keywords (${sharedKeywords.slice(0, 6).join(', ')}...).`);
    differentiationAdvice.push('Diversify keywords to focus on the unique utility and specific subject of this asset.');
  }

  if (titleJaccard > 0.6) {
    reasons.push('Commercial titles share significant phrase structure.');
  }

  if (isSameTopic && isSameNiche) {
    reasons.push(`Both projects target identical niche ("${subA.niche}") and topic ("${subA.topic}").`);
  }

  if (reasons.length === 0) {
    reasons.push('Distinct geometric composition and thematic focus.');
  }

  return {
    matchedProjectId: other.id,
    matchedProjectName: other.name,
    overallScore,
    subjectScore,
    geometryScore,
    severity,
    isColorOnlyVariant,
    reasons,
    differentiationAdvice,
    metricsBreakdown: {
      titleSimilarity: Math.round(titleJaccard * 100),
      keywordOverlapPct: Math.round(keywordOverlap * 100),
      sharedKeywords,
      topologySimilarity: Math.round(topologySimilarity * 100),
      pathSignatureSimilarity: Math.round(pathSignatureSimilarity * 100),
      paletteOverlapPct: Math.round(paletteOverlap * 100),
      nodeDeltaPct
    }
  };
}

// ---------------- SYNC & ASYNC ENTRYPOINTS ----------------

/**
 * Checks similarity of a project against an in-memory list of projects
 */
export function checkProjectSimilarity(current: Project, existingProjects: Project[]): SimilarityAuditResult {
  const otherProjects = existingProjects.filter(p => p.id !== current.id && (p.slots || []).length > 0);
  
  if (otherProjects.length === 0) {
    return {
      hasMatches: false,
      highestScore: 0,
      worstSeverity: 'clean',
      topMatch: null,
      allMatches: [],
      scannedProjectsCount: 0,
      flags: {
        isExactDuplicate: false,
        isColorOnlyVariant: false,
        hasKeywordCannibalization: false
      }
    };
  }

  const reports: SimilarityReportItem[] = [];
  for (const other of otherProjects) {
    const report = compareProjects(current, other);
    reports.push(report);
  }

  reports.sort((a, b) => b.overallScore - a.overallScore);
  const topMatch = reports[0] || null;
  const highestScore = topMatch ? topMatch.overallScore : 0;
  const worstSeverity = topMatch ? topMatch.severity : 'clean';

  const isExactDuplicate = reports.some(r => r.overallScore >= 92);
  const isColorOnlyVariant = reports.some(r => r.isColorOnlyVariant);
  const hasKeywordCannibalization = reports.some(r => r.metricsBreakdown.keywordOverlapPct >= 70);

  return {
    hasMatches: highestScore >= 35,
    highestScore,
    worstSeverity,
    topMatch,
    allMatches: reports,
    scannedProjectsCount: otherProjects.length,
    flags: {
      isExactDuplicate,
      isColorOnlyVariant,
      hasKeywordCannibalization
    }
  };
}

/**
 * Asynchronously loads all projects from IndexedDB and checks against current project
 */
export async function checkProjectSimilarityFromDB(current: Project): Promise<SimilarityAuditResult> {
  try {
    const allStored = await getStoredProjects();
    return checkProjectSimilarity(current, allStored);
  } catch (err) {
    console.warn('Could not query IndexedDB for similarity check, returning clean status', err);
    return {
      hasMatches: false,
      highestScore: 0,
      worstSeverity: 'clean',
      topMatch: null,
      allMatches: [],
      scannedProjectsCount: 0,
      flags: {
        isExactDuplicate: false,
        isColorOnlyVariant: false,
        hasKeywordCannibalization: false
      }
    };
  }
}

// Backwards compatibility alias
export type SimilarityMatch = SimilarityReportItem;
