import { Project, IconSlot } from '../types';

export interface AdobeStockCategory {
  id: number;
  name: string;
  description: string;
}

/**
 * Official Adobe Stock Contributor Category List (IDs 1 - 21)
 */
export const ADOBE_STOCK_CATEGORIES: AdobeStockCategory[] = [
  { id: 1, name: 'Animals', description: 'Wildlife, pets, insects, marine life' },
  { id: 2, name: 'Buildings and Architecture', description: 'Houses, skyscrapers, urban architecture' },
  { id: 3, name: 'Business', description: 'Finance, office, corporate, commerce' },
  { id: 4, name: 'Drinks', description: 'Beverages, coffee, cocktails, water' },
  { id: 5, name: 'The Environment', description: 'Renewable energy, ecology, climate, nature' },
  { id: 6, name: 'States of Mind', description: 'Emotions, feelings, mental concepts' },
  { id: 7, name: 'Food', description: 'Culinary, cooking, fruits, ingredients' },
  { id: 8, name: 'Graphic Resources', description: 'Icons, UI vectors, infographics, patterns, backgrounds' },
  { id: 9, name: 'Hobbies and Leisure', description: 'Recreation, games, crafts, relaxation' },
  { id: 10, name: 'Industry', description: 'Manufacturing, construction, factory, engineering' },
  { id: 11, name: 'Landscapes', description: 'Mountains, oceans, scenic vistas' },
  { id: 12, name: 'Lifestyle', description: 'Daily life, home living, culture, routines' },
  { id: 13, name: 'People', description: 'Portraits, diversity, families, groups' },
  { id: 14, name: 'Plants and Flowers', description: 'Botanical, leaves, trees, gardening' },
  { id: 15, name: 'Culture and Religion', description: 'Heritage, festivals, spiritual concepts' },
  { id: 16, name: 'Science', description: 'Laboratory, physics, medical research, space' },
  { id: 17, name: 'Social Issues', description: 'Community, society, world events' },
  { id: 18, name: 'Sports', description: 'Fitness, athletics, games, competition' },
  { id: 19, name: 'Technology', description: 'Computers, AI, smart devices, networks, electronics' },
  { id: 20, name: 'Transport', description: 'Vehicles, logistics, aviation, automotive' },
  { id: 21, name: 'Travel', description: 'Tourism, vacation, landmarks, luggage' }
];

/**
 * Maps custom or freeform category strings to an official Adobe Stock category ID.
 * Defaults to 8 (Graphic Resources) for vector icons/illustrations.
 */
export function resolveAdobeStockCategoryId(categoryOrTopic: string): number {
  const lower = (categoryOrTopic || '').toLowerCase();

  if (lower.includes('icon') || lower.includes('graphic') || lower.includes('pattern') || lower.includes('resource') || lower.includes('ui')) {
    return 8; // Graphic Resources
  }
  if (lower.includes('solar') || lower.includes('energy') || lower.includes('environment') || lower.includes('green') || lower.includes('eco')) {
    return 5; // The Environment
  }
  if (lower.includes('tech') || lower.includes('smart') || lower.includes('device') || lower.includes('computer') || lower.includes('ai') || lower.includes('data')) {
    return 19; // Technology
  }
  if (lower.includes('business') || lower.includes('finance') || lower.includes('market') || lower.includes('money')) {
    return 3; // Business
  }
  if (lower.includes('industry') || lower.includes('manufactur') || lower.includes('factory')) {
    return 10; // Industry
  }
  if (lower.includes('transport') || lower.includes('car') || lower.includes('ev') || lower.includes('vehicle')) {
    return 20; // Transport
  }
  if (lower.includes('building') || lower.includes('home') || lower.includes('house') || lower.includes('architect')) {
    return 2; // Buildings and Architecture
  }
  if (lower.includes('science') || lower.includes('medical') || lower.includes('health') || lower.includes('bio')) {
    return 16; // Science
  }
  if (lower.includes('lifestyle') || lower.includes('life')) {
    return 12; // Lifestyle
  }

  // Default fallback for vector stock packs is Graphic Resources (ID 8)
  return 8;
}

/**
 * Escapes a single CSV cell value according to RFC 4180
 */
export function escapeCsvValue(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).trim();
  // Always wrap in quotes if contains comma, quote, or newline
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export interface CsvExportOptions {
  includeIndividualSlots?: boolean;
  categoryId?: number;
  filenameOverride?: string;
}

/**
 * Generates an official, standard Adobe Stock bulk upload CSV file.
 * Format:
 * Filename,Title,Keywords,Category
 */
export function generateAdobeStockCsv(project: Project, options: CsvExportOptions = {}): string {
  const headers = ['Filename', 'Title', 'Keywords', 'Category'];
  const rows: string[][] = [];

  const baseSlug = (project.metadata.title || project.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const mainFilename = options.filenameOverride || `${baseSlug}.svg`;
  const mainTitle = project.metadata.title || `${project.name} Vector Set`;
  
  // Format keywords: comma separated
  const keywordsList = (project.metadata.keywords && project.metadata.keywords.length > 0)
    ? project.metadata.keywords
    : [project.topic.toLowerCase(), project.niche.toLowerCase(), 'vector', 'icon', 'graphic'];
  const keywordsStr = keywordsList.join(', ');

  const chosenCatId = options.categoryId || resolveAdobeStockCategoryId(project.metadata.category || project.topic);

  // Row 1: The main stock asset (the full 4000x4000 sheet / artboard)
  rows.push([
    mainFilename,
    mainTitle,
    keywordsStr,
    String(chosenCatId)
  ]);

  // Optional: Rows for individual icons (if user exports separated icon SVGs too)
  if (options.includeIndividualSlots) {
    const activeSlots = project.slots.filter(s => s.svgContent && s.svgContent.length > 20);
    activeSlots.forEach((slot, i) => {
      const slotNum = String(slot.index + 1).padStart(2, '0');
      const slotSlug = slot.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const slotFilename = `${slotNum}-${slotSlug}.svg`;
      const slotTitle = `${slot.label} Vector Icon`;

      // Contextual keywords for this specific icon
      const slotSpecificWords = slot.label.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const combinedKeywords = Array.from(new Set([...slotSpecificWords, ...keywordsList])).slice(0, 45);

      rows.push([
        slotFilename,
        slotTitle,
        combinedKeywords.join(', '),
        String(chosenCatId)
      ]);
    });
  }

  // Build CSV content
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCsvValue).join(','))
  ];

  return csvLines.join('\r\n');
}

/**
 * Client-side download trigger for CSV file
 */
export function downloadCsvString(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
