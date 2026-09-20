import { AssetType, PreflightStatus } from '../types';

export type RuleOriginType = 'ADOBE_REQUIREMENT' | 'INTERNAL_HEURISTIC';

export interface AdobeStockRuleDefinition {
  id: string;
  name: string;
  type: RuleOriginType;
  description: string;
  defaultSeverity: PreflightStatus;
  applicableAssetTypes: AssetType[];
  sourceReference: string;
  lastVerifiedDate: string;
  rationale: string;
}

export const ALL_ASSET_TYPES: AssetType[] = [
  'single-icon',
  'icon-sheet',
  'design-elements',
  'vector-illustration',
  'diagram',
  'pattern',
  'digital-design',
  'custom-vector'
];

export const ADOBE_STOCK_RULES: Record<string, AdobeStockRuleDefinition> = {
  // 1. FILE & FORMAT REQUIREMENTS
  'rule-svg-xml-validity': {
    id: 'rule-svg-xml-validity',
    name: 'SVG XML Structure Validity',
    type: 'ADOBE_REQUIREMENT',
    description: 'The file must be well-formed XML with valid SVG 1.1 / SVG 2 namespace declarations.',
    defaultSeverity: 'fail',
    applicableAssetTypes: ALL_ASSET_TYPES,
    sourceReference: 'Adobe Stock Contributor Guide: Vector Requirements & Supported File Types',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Malformed XML causes parsing exceptions during Adobe Stock automated upload ingestion.'
  },
  'rule-file-size-limit': {
    id: 'rule-file-size-limit',
    name: 'Maximum Vector File Size (45MB)',
    type: 'ADOBE_REQUIREMENT',
    description: 'SVG / vector file size must not exceed 45 Megabytes.',
    defaultSeverity: 'fail',
    applicableAssetTypes: ALL_ASSET_TYPES,
    sourceReference: 'Adobe Stock Contributor Portal: 45MB Maximum File Size Specification',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Files larger than 45MB are rejected at portal upload level.'
  },

  // 2. CANVAS & ARTBOARD DIMENSIONS
  'rule-canvas-dimensions': {
    id: 'rule-canvas-dimensions',
    name: 'Artboard Dimensions Standard',
    type: 'ADOBE_REQUIREMENT',
    description: 'Canvas must have positive, finite dimensions and valid viewBox. Recommended bounds 2000px–4000px (4MP–16MP equivalent) for high-resolution rendering.',
    defaultSeverity: 'fail',
    applicableAssetTypes: ALL_ASSET_TYPES,
    sourceReference: 'Adobe Stock Contributor Guide: Recommended Artboard Dimensions (at least 4MP)',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Stock customers require vector artboards sized large enough for direct raster preview rendering without pixelation.'
  },
  'rule-artwork-outside-artboard': {
    id: 'rule-artwork-outside-artboard',
    name: 'Artwork Confined to Artboard Bounds',
    type: 'INTERNAL_HEURISTIC',
    description: 'Geometry should remain within the defined artboard/canvas bounds to prevent unexpected clipping in customer applications.',
    defaultSeverity: 'warning',
    applicableAssetTypes: ALL_ASSET_TYPES,
    sourceReference: 'Studio Best Practices: Artboard Clipping Prevention',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Stray shapes or geometry extending far past the artboard edges create rendering glitches in vector software.'
  },

  // 3. PURE VECTOR INTEGRITY (ZERO RASTER)
  'rule-no-embedded-raster': {
    id: 'rule-no-embedded-raster',
    name: 'Zero Embedded or External Raster Bitmaps',
    type: 'ADOBE_REQUIREMENT',
    description: 'Vector submissions must NOT contain embedded or linked raster images (<image>, base64 data URIs, PNG, JPEG, WEBP, or external URLs).',
    defaultSeverity: 'fail',
    applicableAssetTypes: ALL_ASSET_TYPES,
    sourceReference: 'Adobe Stock Contributor Guidelines: Vectors must not contain rasterized elements',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Adobe Stock strictly rejects vector submissions containing raster imagery under technical defect rules.'
  },

  // 4. LIVE TEXT / TYPOGRAPHY OUTLINES
  'rule-live-text-outlined': {
    id: 'rule-live-text-outlined',
    name: 'Live Typography Converted to Outlines',
    type: 'ADOBE_REQUIREMENT',
    description: 'All text elements (<text>, <tspan>, <textPath>) must be outlined into vector paths before submission.',
    defaultSeverity: 'fail',
    applicableAssetTypes: ['single-icon', 'icon-sheet', 'pattern', 'design-elements', 'custom-vector'],
    sourceReference: 'Adobe Stock Contributor Guide: Convert all text to outlines / shapes',
    lastVerifiedDate: '2026-03-15',
    rationale: 'If fonts are not outlined into native paths, missing font errors will corrupt customer rendering.'
  },

  // 5. SECURITY & EXECUTABLE CODE
  'rule-no-executable-scripts': {
    id: 'rule-no-executable-scripts',
    name: 'No Executable Scripts, Event Handlers, or Foreign Objects',
    type: 'ADOBE_REQUIREMENT',
    description: 'SVG must not contain <script>, <foreignObject>, on* event handlers, javascript: URIs, or external CSS @import directives.',
    defaultSeverity: 'fail',
    applicableAssetTypes: ALL_ASSET_TYPES,
    sourceReference: 'Adobe Stock Security Screening & SVG 1.1 Conformance Standards',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Executable or dynamic scripts pose security hazards and are prohibited in commercial stock vectors.'
  },

  // 6. METADATA REQUIREMENTS
  'rule-metadata-title': {
    id: 'rule-metadata-title',
    name: 'Commercial Asset Title',
    type: 'ADOBE_REQUIREMENT',
    description: 'Title must be descriptive, commercially relevant, at least 5 characters, and under 200 characters.',
    defaultSeverity: 'fail',
    applicableAssetTypes: ALL_ASSET_TYPES,
    sourceReference: 'Adobe Stock Contributor Guide: Titles & Descriptions',
    lastVerifiedDate: '2026-03-15',
    rationale: 'A descriptive commercial title is required for indexing and search relevance on Adobe Stock.'
  },
  'rule-metadata-keyword-count': {
    id: 'rule-metadata-keyword-count',
    name: 'Keyword Count Limits (5 to 50)',
    type: 'ADOBE_REQUIREMENT',
    description: 'Metadata must contain a minimum of 5 and maximum of 50 keywords.',
    defaultSeverity: 'fail',
    applicableAssetTypes: ALL_ASSET_TYPES,
    sourceReference: 'Adobe Stock Contributor Guidelines: Maximum 50 keywords allowed per asset',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Adobe Stock portal rejects uploads with fewer than 5 or more than 50 keywords.'
  },
  'rule-metadata-no-trademarks': {
    id: 'rule-metadata-no-trademarks',
    name: 'No Registered Trademarks or Brand Names',
    type: 'ADOBE_REQUIREMENT',
    description: 'Keywords and title must NOT contain trademarked brand names (e.g. Apple, Nike, Tesla, Adobe, Google).',
    defaultSeverity: 'fail',
    applicableAssetTypes: ALL_ASSET_TYPES,
    sourceReference: 'Adobe Stock IP Guidelines: Third-Party Trademark Infringement Policy',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Using trademarked company or product names results in IP rejection and contributor account strikes.'
  },
  'rule-metadata-deduplication': {
    id: 'rule-metadata-deduplication',
    name: 'Keyword Deduplication & Hygiene',
    type: 'INTERNAL_HEURISTIC',
    description: 'Keywords should not contain duplicate entries or empty tokens.',
    defaultSeverity: 'warning',
    applicableAssetTypes: ALL_ASSET_TYPES,
    sourceReference: 'Studio Best Practices: Keyword Ranking Optimization',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Duplicate keywords waste valuable slots within the 50-keyword limit.'
  },

  // 7. GENERATIVE AI PROVENANCE & DISCLOSURE
  'rule-ai-disclosure-compliance': {
    id: 'rule-ai-disclosure-compliance',
    name: 'Generative AI Provenance & Mandatory Disclosure',
    type: 'ADOBE_REQUIREMENT',
    description: 'Content created or assisted by Generative AI must be declared as AI Assisted with all compliance terms acknowledged.',
    defaultSeverity: 'warning',
    applicableAssetTypes: ALL_ASSET_TYPES,
    sourceReference: 'Adobe Stock Generative AI Submission Guidelines & Mandatory Disclosure Policy',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Failing to disclose Generative AI provenance violates Adobe Stock terms of service and risks permanent account suspension.'
  },

  // 8. SIMILARITY & DUPLICATE CONTENT
  'rule-similarity-content-duplication': {
    id: 'rule-similarity-content-duplication',
    name: 'Similar Content & Spam Proximity Guard',
    type: 'ADOBE_REQUIREMENT',
    description: 'Assets must introduce substantive structural, thematic, or conceptual differentiation; color-only variants or near-duplicate geometry are rejected.',
    defaultSeverity: 'warning',
    applicableAssetTypes: ALL_ASSET_TYPES,
    sourceReference: 'Adobe Stock Contributor Guidelines: Similar or Duplicate Content Policy',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Adobe Stock rejects batches of repetitive assets or identical geometry with minor color swaps.'
  },

  // 9. INTERNAL QUALITY HEURISTICS (EDITABILITY, PALETTES, COMPLEXITY)
  'rule-transparency-audit': {
    id: 'rule-transparency-audit',
    name: 'Transparency Audit & Layer Blending',
    type: 'INTERNAL_HEURISTIC',
    description: 'Inspects opacity, fill-opacity, stroke-opacity, and inherited group transparency. Transparency is valid SVG but should be reviewed for stock editability.',
    defaultSeverity: 'warning',
    applicableAssetTypes: ALL_ASSET_TYPES,
    sourceReference: 'Studio Best Practices: Vector Transparency & Compatibility Heuristic',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Some vector legacy EPS/AI workflows flatten transparent layers into raster clipping masks upon export.'
  },
  'rule-color-palette-consistency': {
    id: 'rule-color-palette-consistency',
    name: 'Color Palette Consistency & Near-Duplicate Colors',
    type: 'INTERNAL_HEURISTIC',
    description: 'Detects near-duplicate colors that may represent unintended palette divergence.',
    defaultSeverity: 'warning',
    applicableAssetTypes: ALL_ASSET_TYPES,
    sourceReference: 'Studio Best Practices: Color Palette Harmony',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Unifying nearly identical colors strengthens cohesive commercial visual identity.'
  },
  'rule-stroke-system-consistency': {
    id: 'rule-stroke-system-consistency',
    name: 'Stroke System Consistency',
    type: 'INTERNAL_HEURISTIC',
    description: 'Monitors stroke width distribution across icon sheets to encourage a unified 1-3 stroke hierarchy.',
    defaultSeverity: 'warning',
    applicableAssetTypes: ['icon-sheet', 'single-icon', 'design-elements'],
    sourceReference: 'Studio Best Practices: Icon Set Stroke Architecture',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Consistent line weights are a primary hallmark of premium commercial icon sets.'
  },
  'rule-icon-sheet-structure': {
    id: 'rule-icon-sheet-structure',
    name: 'Icon Sheet Group Organization (16/16 Verification)',
    type: 'INTERNAL_HEURISTIC',
    description: 'Verifies intended icon slot groups exist, have unique IDs, contain drawable geometry, and have no ungrouped root elements.',
    defaultSeverity: 'fail',
    applicableAssetTypes: ['icon-sheet'],
    sourceReference: 'Studio Best Practices: Commercial Icon Sheet Layering',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Organized semantic groups allow stock customers to easily isolate and export individual icons in Illustrator or Inkscape.'
  },
  'rule-trace-artifact-complexity': {
    id: 'rule-trace-artifact-complexity',
    name: 'Trace Artifacts & Complexity Outlier Heuristic',
    type: 'INTERNAL_HEURISTIC',
    description: 'Detects microscopic paths, empty geometry, duplicate path definitions, and complexity outliers across sibling icons.',
    defaultSeverity: 'warning',
    applicableAssetTypes: ALL_ASSET_TYPES,
    sourceReference: 'Studio Best Practices: Clean Vector Curve & Node Optimization',
    lastVerifiedDate: '2026-03-15',
    rationale: 'Excessive nodes or stray microscopic specks are common symptoms of poor autotracing and trigger Quality rejections.'
  }
};

/**
 * Returns preset-specific canvas dimension rules
 */
export function getPresetCanvasRule(assetType: AssetType): {
  minWidth: number;
  minHeight: number;
  recommendedWidth: number;
  recommendedHeight: number;
  aspectRatioRequired?: number; // e.g. 1 for square
  description: string;
} {
  switch (assetType) {
    case 'icon-sheet':
      return {
        minWidth: 2000,
        minHeight: 2000,
        recommendedWidth: 4000,
        recommendedHeight: 4000,
        aspectRatioRequired: 1,
        description: 'Icon sheets require high-res square or 4:3 artboard (4000x4000 recommended) for crisp grid presentation.'
      };
    case 'single-icon':
      return {
        minWidth: 1000,
        minHeight: 1000,
        recommendedWidth: 2000,
        recommendedHeight: 2000,
        aspectRatioRequired: 1,
        description: 'Single icons recommend 2000x2000 square canvas.'
      };
    case 'pattern':
      return {
        minWidth: 1000,
        minHeight: 1000,
        recommendedWidth: 2000,
        recommendedHeight: 2000,
        aspectRatioRequired: 1,
        description: 'Seamless pattern tiles require square dimensions (2000x2000 recommended).'
      };
    case 'vector-illustration':
    case 'digital-design':
    case 'diagram':
    case 'design-elements':
    case 'custom-vector':
    default:
      return {
        minWidth: 1200,
        minHeight: 800,
        recommendedWidth: 3000,
        recommendedHeight: 2000,
        description: 'Illustrations recommend at least 4MP area (e.g. 3000x2000 or 4000x3000) for sharp stock previews.'
      };
  }
}
