import { Project } from '../types';

export interface SimilarityMatch {
  matchedProjectId: string;
  matchedProjectName: string;
  score: number; // 0 to 100%
  reasons: string[];
  severity: 'low' | 'moderate' | 'high';
}

/**
 * Computes similarity fingerprint and compares against other saved projects
 */
export function checkProjectSimilarity(current: Project, existingProjects: Project[]): SimilarityMatch | null {
  const otherProjects = existingProjects.filter(p => p.id !== current.id && p.slots.length > 0);
  if (otherProjects.length === 0) return null;

  let highestScore = 0;
  let bestMatch: SimilarityMatch | null = null;

  for (const prev of otherProjects) {
    let score = 0;
    const reasons: string[] = [];

    // 1. Same niche and topic
    if (current.niche.toLowerCase().trim() === prev.niche.toLowerCase().trim()) {
      score += 25;
      reasons.push('Identical Niche classification');
      if (current.topic.toLowerCase().trim() === prev.topic.toLowerCase().trim()) {
        score += 20;
        reasons.push('Identical core Topic');
      }
    }

    // 2. Keyword overlap
    const currentKws = new Set(current.metadata.keywords.map(k => k.toLowerCase().trim()));
    const prevKws = new Set(prev.metadata.keywords.map(k => k.toLowerCase().trim()));
    if (currentKws.size > 0 && prevKws.size > 0) {
      let intersection = 0;
      currentKws.forEach(k => {
        if (prevKws.has(k)) intersection++;
      });
      const overlapPercent = (intersection / Math.max(currentKws.size, prevKws.size)) * 100;
      if (overlapPercent > 70) {
        score += 30;
        reasons.push(`High keyword overlap (${Math.round(overlapPercent)}% shared terms)`);
      } else if (overlapPercent > 45) {
        score += 15;
        reasons.push(`Moderate keyword overlap (${Math.round(overlapPercent)}%)`);
      }
    }

    // 3. Asset type and slot structure
    if (current.assetType === prev.assetType && current.slots.length === prev.slots.length) {
      score += 15;
      reasons.push('Identical canvas structure and slot count');
    }

    // 4. Same title slug
    if (current.metadata.title && prev.metadata.title) {
      const t1 = current.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const t2 = prev.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (t1 === t2) {
        score += 20;
        reasons.push('Virtually identical commercial title');
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = {
        matchedProjectId: prev.id,
        matchedProjectName: prev.name,
        score: Math.min(100, score),
        reasons,
        severity: score >= 65 ? 'high' : (score >= 40 ? 'moderate' : 'low')
      };
    }
  }

  // Only return if score is notable (> 40%)
  if (bestMatch && bestMatch.score >= 40) {
    return bestMatch;
  }

  return null;
}
