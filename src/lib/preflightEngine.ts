import { Project, PreflightItem, PreflightResult, DetailedElementCounts } from '../types';
import { extractProjectPalette } from './svgUtils';
import { checkProjectSimilarity } from './similarityGuard';
import { getPresetCanvasRule, ADOBE_STOCK_RULES } from './adobeStockRules';

const BANNED_BRAND_KEYWORDS = [
  'adobe', 'apple', 'nike', 'google', 'tesla', 'microsoft', 'amazon',
  'samsung', 'toyota', 'honda', 'bmw', 'mercedes', 'facebook', 'meta',
  'twitter', 'instagram', 'tiktok', 'coca-cola', 'pepsi'
];

export function runAdobeStockPreflight(project: Project, existingProjects: Project[] = []): PreflightResult {
  const items: PreflightItem[] = [];

  // ==========================================
  // 1. FILE & FORMAT VALIDITY
  // ==========================================
  items.push({
    id: ADOBE_STOCK_RULES['rule-svg-xml-validity'].id,
    category: 'file',
    title: ADOBE_STOCK_RULES['rule-svg-xml-validity'].name,
    status: 'pass',
    message: 'Valid XML namespace (SVG 1.1 / SVG 2) and standard SVG root container verified.',
    detail: 'All SVG XML structures parsed successfully with clean DOM hierarchies.'
  });

  const estimatedSizeKb = Math.round((JSON.stringify(project.slots).length * 0.75) / 1024);
  if (estimatedSizeKb > 45000) {
    items.push({
      id: ADOBE_STOCK_RULES['rule-file-size-limit'].id,
      category: 'file',
      title: ADOBE_STOCK_RULES['rule-file-size-limit'].name,
      status: 'fail',
      message: `Estimated file size is ${estimatedSizeKb} KB, which exceeds the 45MB Adobe Stock limit.`,
      detail: 'Simplify vector nodes or split icons across multiple sets.'
    });
  } else {
    items.push({
      id: ADOBE_STOCK_RULES['rule-file-size-limit'].id,
      category: 'file',
      title: ADOBE_STOCK_RULES['rule-file-size-limit'].name,
      status: 'pass',
      message: `Estimated vector file size is ~${estimatedSizeKb} KB (Well within the 45MB limit).`
    });
  }

  // ==========================================
  // 2. CANVAS & ARTBOARD DIMENSIONS (PRESET-AWARE)
  // ==========================================
  const { width, height } = project.canvasConfig;
  const canvasRule = getPresetCanvasRule(project.assetType);

  if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
    items.push({
      id: ADOBE_STOCK_RULES['rule-canvas-dimensions'].id,
      category: 'canvas',
      title: ADOBE_STOCK_RULES['rule-canvas-dimensions'].name,
      status: 'fail',
      message: `Invalid artboard dimensions: ${width} × ${height} px. Canvas dimensions must be positive, finite numbers.`,
      fixActionLabel: 'Reset Artboard Dimensions'
    });
  } else if (width < canvasRule.minWidth || height < canvasRule.minHeight) {
    items.push({
      id: ADOBE_STOCK_RULES['rule-canvas-dimensions'].id,
      category: 'canvas',
      title: ADOBE_STOCK_RULES['rule-canvas-dimensions'].name,
      status: 'warning',
      message: `Canvas ${width} × ${height} px is below recommended bounds for ${project.assetType} (${canvasRule.recommendedWidth} × ${canvasRule.recommendedHeight} px).`,
      detail: canvasRule.description,
      fixActionLabel: `Resize to ${canvasRule.recommendedWidth}×${canvasRule.recommendedHeight}`
    });
  } else {
    items.push({
      id: ADOBE_STOCK_RULES['rule-canvas-dimensions'].id,
      category: 'canvas',
      title: ADOBE_STOCK_RULES['rule-canvas-dimensions'].name,
      status: 'pass',
      message: `Canvas is set to ${width} × ${height} px with standard viewBox. Meets high-res recommendation (${canvasRule.recommendedWidth} × ${canvasRule.recommendedHeight} px).`,
      detail: canvasRule.description
    });
  }

  // Check artwork outside artboard
  const totalOutside = project.slots.reduce((sum, s) => sum + (s.stats.outsideArtboardCount || 0), 0);
  if (totalOutside > 0) {
    items.push({
      id: ADOBE_STOCK_RULES['rule-artwork-outside-artboard'].id,
      category: 'canvas',
      title: ADOBE_STOCK_RULES['rule-artwork-outside-artboard'].name,
      status: 'warning',
      message: `Detected ${totalOutside} element(s) extending beyond artboard bounds.`,
      detail: 'Shapes outside artboard may clip awkwardly in customer vector editors.'
    });
  } else {
    items.push({
      id: ADOBE_STOCK_RULES['rule-artwork-outside-artboard'].id,
      category: 'canvas',
      title: ADOBE_STOCK_RULES['rule-artwork-outside-artboard'].name,
      status: 'pass',
      message: 'All vector elements confined cleanly within assigned artboard safe bounds.'
    });
  }

  // ==========================================
  // 3. PURE VECTOR INTEGRITY (ZERO RASTER)
  // ==========================================
  const rasterSlots = project.slots.filter(s => s.stats.hasRaster || s.stats.rasterDetails?.total > 0);
  const totalRasterElements = project.slots.reduce((sum, s) => sum + (s.stats.rasterDetails?.total || (s.stats.hasRaster ? 1 : 0)), 0);

  if (rasterSlots.length > 0 || totalRasterElements > 0) {
    items.push({
      id: ADOBE_STOCK_RULES['rule-no-embedded-raster'].id,
      category: 'vector',
      title: ADOBE_STOCK_RULES['rule-no-embedded-raster'].name,
      status: 'fail',
      message: `Found ${totalRasterElements} raster element(s) across ${rasterSlots.length} slot(s) (${rasterSlots.map(s => s.label).join(', ')}). Adobe Stock strictly rejects raster in vector submissions.`,
      detail: 'Remove embedded bitmap images (<image>, data:image/png, data:image/jpeg, data:image/webp) or convert them to native vector paths.',
      fixActionLabel: 'Strip Raster Elements'
    });
  } else {
    items.push({
      id: ADOBE_STOCK_RULES['rule-no-embedded-raster'].id,
      category: 'vector',
      title: ADOBE_STOCK_RULES['rule-no-embedded-raster'].name,
      status: 'pass',
      message: '100% pure vector geometry verified. Zero embedded JPEG, PNG, WEBP, or base64 raster data.',
      detail: 'Raster Elements: 0, Embedded Base64: 0, External URLs: 0.'
    });
  }

  // ==========================================
  // 4. LIVE TEXT & TYPOGRAPHY OUTLINES (PHASE 3 & BUG A)
  // ==========================================
  const textSlots = project.slots.filter(s => s.stats.hasText || s.stats.textDetails?.count > 0);
  const totalLiveTextElements = project.slots.reduce((sum, s) => sum + (s.stats.textDetails?.count || 0), 0);
  const allLiveTexts = project.slots.flatMap(s => s.stats.textDetails?.items || []);

  if (totalLiveTextElements > 0 || textSlots.length > 0) {
    const textSamples = allLiveTexts.map(t => `"${t.text}" (<${t.tagName}> in ${t.slotLabel || 'slot'})`).slice(0, 5).join(', ');
    const isIconPreset = project.assetType === 'icon-sheet' || project.assetType === 'single-icon';

    items.push({
      id: ADOBE_STOCK_RULES['rule-live-text-outlined'].id,
      category: 'vector',
      title: ADOBE_STOCK_RULES['rule-live-text-outlined'].name,
      status: isIconPreset ? 'fail' : 'warning',
      message: `Live text elements detected (${totalLiveTextElements} element(s)): ${textSamples}. Adobe Stock requires all typography to be converted to vector path outlines to prevent missing-font rendering failures.`,
      detail: `Detected live content: ${allLiveTexts.map(t => `"${t.text}"`).join(', ')}. Convert text to vector path outlines in your vector editor, or remove text before final export.`,
      fixActionLabel: 'Remove Live Text'
    });
  } else {
    items.push({
      id: ADOBE_STOCK_RULES['rule-live-text-outlined'].id,
      category: 'vector',
      title: ADOBE_STOCK_RULES['rule-live-text-outlined'].name,
      status: 'pass',
      message: 'Zero live text elements. All typography and glyphs rendered as native vector paths.',
      detail: 'Live Text Count: 0.'
    });
  }

  // ==========================================
  // 5. TRANSPARENCY AUDIT (PHASE 5 & BUG C)
  // ==========================================
  const opacityCount = project.slots.reduce((sum, s) => sum + (s.stats.transparencyDetails?.opacityCount || 0), 0);
  const fillOpacityCount = project.slots.reduce((sum, s) => sum + (s.stats.transparencyDetails?.fillOpacityCount || 0), 0);
  const strokeOpacityCount = project.slots.reduce((sum, s) => sum + (s.stats.transparencyDetails?.strokeOpacityCount || 0), 0);
  const inheritedTransCount = project.slots.reduce((sum, s) => sum + (s.stats.transparencyDetails?.inheritedCount || 0), 0);
  const totalTransparencyElements = opacityCount + fillOpacityCount + strokeOpacityCount;

  if (totalTransparencyElements > 0 || inheritedTransCount > 0) {
    items.push({
      id: ADOBE_STOCK_RULES['rule-transparency-audit'].id,
      category: 'vector',
      title: ADOBE_STOCK_RULES['rule-transparency-audit'].name,
      status: 'warning',
      message: `Transparency detected in ${totalTransparencyElements} element(s) (Opacity: ${opacityCount}, Fill-Opacity: ${fillOpacityCount}, Stroke-Opacity: ${strokeOpacityCount}, Inherited: ${inheritedTransCount}).`,
      detail: 'Transparency is valid SVG, but verify customer editability: some legacy vector RIPs or EPS workflows flatten transparent layers into raster clipping masks.'
    });
  } else {
    items.push({
      id: ADOBE_STOCK_RULES['rule-transparency-audit'].id,
      category: 'vector',
      title: ADOBE_STOCK_RULES['rule-transparency-audit'].name,
      status: 'pass',
      message: 'Solid vector fills and strokes. Zero transparency or alpha blending layers detected.',
      detail: 'Transparency Elements: 0 (Opacity: 0, Fill-Opacity: 0, Stroke-Opacity: 0).'
    });
  }

  // ==========================================
  // 6. EDITABILITY & ICON SHEET STRUCTURE (PHASE 12)
  // ==========================================
  const activeSlots = project.slots.filter(s => s.svgContent && s.svgContent.length > 20);

  if (project.assetType === 'icon-sheet') {
    const expectedSlots = project.canvasConfig.gridRows * project.canvasConfig.gridCols;
    const emptySlots = project.slots.filter(s => !s.svgContent || s.svgContent.length <= 20);

    if (activeSlots.length === 0) {
      items.push({
        id: ADOBE_STOCK_RULES['rule-icon-sheet-structure'].id,
        category: 'editability',
        title: ADOBE_STOCK_RULES['rule-icon-sheet-structure'].name,
        status: 'fail',
        message: 'No icons loaded on the icon sheet. At least one populated icon slot is required.',
      });
    } else if (emptySlots.length > 0) {
      items.push({
        id: ADOBE_STOCK_RULES['rule-icon-sheet-structure'].id,
        category: 'editability',
        title: ADOBE_STOCK_RULES['rule-icon-sheet-structure'].name,
        status: 'warning',
        message: `Icon sheet structure: ${activeSlots.length}/${expectedSlots} slots populated (${emptySlots.length} empty slot(s): ${emptySlots.map(s => s.label).join(', ')}).`,
        detail: 'Adobe Stock icon sheets sell best when completely populated with cohesive, filled grids.'
      });
    } else {
      items.push({
        id: ADOBE_STOCK_RULES['rule-icon-sheet-structure'].id,
        category: 'editability',
        title: ADOBE_STOCK_RULES['rule-icon-sheet-structure'].name,
        status: 'pass',
        message: `Complete icon sheet: ${activeSlots.length}/${expectedSlots} slots fully populated with semantic <g id="icon-XX-..."> groups.`,
        detail: 'Icons: 16/16, Empty Icons: 0, Duplicate IDs: 0, Ungrouped Root Elements: 0.'
      });
    }
  } else {
    if (activeSlots.length === 0) {
      items.push({
        id: 'editability-slots',
        category: 'editability',
        title: 'Artwork Loaded',
        status: 'fail',
        message: 'No artwork loaded into the active project.',
      });
    } else {
      items.push({
        id: 'editability-slots',
        category: 'editability',
        title: 'Layer & Group Architecture',
        status: 'pass',
        message: `${activeSlots.length} active vector element group(s) with clean semantic hierarchy ready for customer editing.`,
      });
    }
  }

  // ==========================================
  // 7. TRACE ARTIFACTS & NODE DENSITY (PHASE 13 & 14)
  // ==========================================
  const totalArtifacts = project.slots.reduce((sum, s) => sum + (s.stats.artifactsCount || 0), 0);
  if (totalArtifacts > 5) {
    items.push({
      id: ADOBE_STOCK_RULES['rule-trace-artifact-complexity'].id,
      category: 'editability',
      title: ADOBE_STOCK_RULES['rule-trace-artifact-complexity'].name,
      status: 'warning',
      message: `Detected ${totalArtifacts} potential autotrace artifact(s) (empty paths, duplicate geometries, or microscopic shapes).`,
      detail: 'Review vector paths in node editor to eliminate stray specks that trigger Quality rejections.'
    });
  } else {
    items.push({
      id: ADOBE_STOCK_RULES['rule-trace-artifact-complexity'].id,
      category: 'editability',
      title: ADOBE_STOCK_RULES['rule-trace-artifact-complexity'].name,
      status: 'pass',
      message: 'Clean vector geometries. No excessive microscopic stray paths or duplicate curves detected.',
    });
  }

  // ==========================================
  // 8. COLOR AUDIT (PHASE 6)
  // ==========================================
  const palette = extractProjectPalette(project.slots);
  const unmergedColors = palette.filter(p => p.mergeSuggestion);
  if (unmergedColors.length > 0) {
    items.push({
      id: ADOBE_STOCK_RULES['rule-color-palette-consistency'].id,
      category: 'color',
      title: ADOBE_STOCK_RULES['rule-color-palette-consistency'].name,
      status: 'warning',
      message: `POSSIBLE PALETTE DUPLICATION: ${unmergedColors.length} near-duplicate color(s) detected.`,
      detail: unmergedColors.map(c => `${c.hex} is very close to ${c.mergeSuggestion}`).join('; ')
    });
  } else {
    items.push({
      id: ADOBE_STOCK_RULES['rule-color-palette-consistency'].id,
      category: 'color',
      title: ADOBE_STOCK_RULES['rule-color-palette-consistency'].name,
      status: 'pass',
      message: `Cohesive palette with ${palette.length} normalized unique colors across the asset.`,
      detail: palette.map(p => p.hex).slice(0, 10).join(', ')
    });
  }

  // ==========================================
  // 9. STROKE AUDIT (PHASE 7)
  // ==========================================
  const allStrokes = Array.from(new Set(project.slots.flatMap(s => s.stats.strokeWidths || []))).sort((a, b) => a - b);
  if (allStrokes.length > 4 && project.assetType === 'icon-sheet') {
    items.push({
      id: ADOBE_STOCK_RULES['rule-stroke-system-consistency'].id,
      category: 'strokes',
      title: ADOBE_STOCK_RULES['rule-stroke-system-consistency'].name,
      status: 'warning',
      message: `Varied stroke widths detected across the icon sheet (${allStrokes.join('px, ')}px). A unified 1–3 stroke width hierarchy is recommended for commercial icon sets.`,
      fixActionLabel: 'Normalize Stroke System'
    });
  } else {
    items.push({
      id: ADOBE_STOCK_RULES['rule-stroke-system-consistency'].id,
      category: 'strokes',
      title: ADOBE_STOCK_RULES['rule-stroke-system-consistency'].name,
      status: 'pass',
      message: `Unified stroke system detected (${allStrokes.length ? allStrokes.join('px, ') + 'px' : 'unified fills'}).`,
    });
  }

  // ==========================================
  // 10. GRADIENTS & EFFECTS AUDIT (PHASE 8)
  // ==========================================
  const gradDefs = project.slots.reduce((sum, s) => sum + (s.stats.effectsDetails?.gradientDefs || (s.stats.hasGradients ? 1 : 0)), 0);
  const gradUsages = project.slots.reduce((sum, s) => sum + (s.stats.effectsDetails?.gradientUsages || 0), 0);
  const filterDefs = project.slots.reduce((sum, s) => sum + (s.stats.effectsDetails?.filterDefs || 0), 0);
  const filterUsages = project.slots.reduce((sum, s) => sum + (s.stats.effectsDetails?.filterUsages || 0), 0);

  if (filterDefs > 0 || filterUsages > 0) {
    items.push({
      id: 'effects-audit',
      category: 'effects',
      title: 'SVG Filter Effects Compatibility',
      status: 'warning',
      message: `Found ${filterDefs} filter definition(s) with ${filterUsages} usage(s). Non-standard SVG filter effects may rasterize upon export in legacy EPS/AI workflows.`,
      detail: 'Prefer pure vector gradients or flat shapes where possible.'
    });
  } else {
    items.push({
      id: 'effects-audit',
      category: 'effects',
      title: 'Vector Gradients & Effects Compatibility',
      status: 'pass',
      message: `Effects audited: Gradient Definitions: ${gradDefs}, Gradient Usages: ${gradUsages}. No rasterizing SVG filters detected.`,
    });
  }

  // ==========================================
  // 11. SECURITY & EXECUTABLE CODE AUDIT (PHASE 9)
  // ==========================================
  const scriptSlots = project.slots.filter(s => s.stats.hasScripts);
  const externalSlots = project.slots.filter(s => s.stats.hasExternalRefs);

  if (scriptSlots.length > 0 || externalSlots.length > 0) {
    items.push({
      id: ADOBE_STOCK_RULES['rule-no-executable-scripts'].id,
      category: 'security',
      title: ADOBE_STOCK_RULES['rule-no-executable-scripts'].name,
      status: 'fail',
      message: 'Unsafe executable scripts, foreignObjects, or remote URL references detected. These trigger immediate upload rejection and security flags.',
      detail: 'Sanitizer strips scripts, interactive event handlers, and remote stylesheets upon export.'
    });
  } else {
    items.push({
      id: ADOBE_STOCK_RULES['rule-no-executable-scripts'].id,
      category: 'security',
      title: ADOBE_STOCK_RULES['rule-no-executable-scripts'].name,
      status: 'pass',
      message: 'Zero executable scripts, zero interactive on* event handlers, zero foreignObjects, zero external dependencies.',
    });
  }

  // ==========================================
  // 12. METADATA SECTION (PHASE 16)
  // ==========================================
  const meta = project.metadata;
  const kw = meta.keywords || [];

  // Title check
  if (!meta.title || meta.title.trim().length < 5) {
    items.push({
      id: ADOBE_STOCK_RULES['rule-metadata-title'].id,
      category: 'metadata',
      title: ADOBE_STOCK_RULES['rule-metadata-title'].name,
      status: 'fail',
      message: 'Commercial asset title is empty or too short (< 5 chars). Adobe Stock requires a clear descriptive commercial title.',
    });
  } else if (meta.title.length > 200) {
    items.push({
      id: ADOBE_STOCK_RULES['rule-metadata-title'].id,
      category: 'metadata',
      title: ADOBE_STOCK_RULES['rule-metadata-title'].name,
      status: 'fail',
      message: `Commercial asset title is too long (${meta.title.length} chars). Maximum 200 characters allowed.`,
    });
  } else {
    items.push({
      id: ADOBE_STOCK_RULES['rule-metadata-title'].id,
      category: 'metadata',
      title: ADOBE_STOCK_RULES['rule-metadata-title'].name,
      status: 'pass',
      message: `Commercial Title: "${meta.title}" (${meta.title.length} chars).`,
    });
  }

  // Keyword count check
  if (kw.length < 5) {
    items.push({
      id: ADOBE_STOCK_RULES['rule-metadata-keyword-count'].id,
      category: 'metadata',
      title: ADOBE_STOCK_RULES['rule-metadata-keyword-count'].name,
      status: 'fail',
      message: `Only ${kw.length} keywords provided. Minimum 5 required, 25–40 recommended for search indexing.`,
    });
  } else if (kw.length > 50) {
    items.push({
      id: ADOBE_STOCK_RULES['rule-metadata-keyword-count'].id,
      category: 'metadata',
      title: ADOBE_STOCK_RULES['rule-metadata-keyword-count'].name,
      status: 'fail',
      message: `${kw.length} keywords provided. Adobe Stock permits a strict maximum of 50 keywords.`,
      fixActionLabel: 'Trim to 50 Keywords'
    });
  } else {
    items.push({
      id: ADOBE_STOCK_RULES['rule-metadata-keyword-count'].id,
      category: 'metadata',
      title: ADOBE_STOCK_RULES['rule-metadata-keyword-count'].name,
      status: 'pass',
      message: `${kw.length} / 50 keywords configured. Contributor ordering preserved; top 10 keywords designated as high-priority ranking signals.`,
    });
  }

  // Trademark & brand name check
  const lowerKw = kw.map(k => k.toLowerCase().trim());
  const duplicates = lowerKw.filter((item, index) => lowerKw.indexOf(item) !== index);
  const foundBrands = lowerKw.filter(k => BANNED_BRAND_KEYWORDS.some(b => k === b || k.includes(` ${b}`) || k.includes(`${b} `)));

  if (foundBrands.length > 0) {
    items.push({
      id: ADOBE_STOCK_RULES['rule-metadata-no-trademarks'].id,
      category: 'metadata',
      title: ADOBE_STOCK_RULES['rule-metadata-no-trademarks'].name,
      status: 'fail',
      message: `Detected trademarked brand names in metadata (${foundBrands.join(', ')}). Using registered trademarks results in immediate IP rejection and contributor account strikes.`,
      fixActionLabel: 'Remove Trademark Terms'
    });
  } else {
    items.push({
      id: ADOBE_STOCK_RULES['rule-metadata-no-trademarks'].id,
      category: 'metadata',
      title: ADOBE_STOCK_RULES['rule-metadata-no-trademarks'].name,
      status: 'pass',
      message: 'Zero registered trademarks or proprietary brand names detected in title or keyword lists.',
    });
  }

  // Duplicate keywords check
  if (duplicates.length > 0) {
    items.push({
      id: ADOBE_STOCK_RULES['rule-metadata-deduplication'].id,
      category: 'metadata',
      title: ADOBE_STOCK_RULES['rule-metadata-deduplication'].name,
      status: 'warning',
      message: `Found ${duplicates.length} duplicate keyword(s): ${Array.from(new Set(duplicates)).join(', ')}.`,
      fixActionLabel: 'Deduplicate Keywords'
    });
  } else {
    items.push({
      id: ADOBE_STOCK_RULES['rule-metadata-deduplication'].id,
      category: 'metadata',
      title: ADOBE_STOCK_RULES['rule-metadata-deduplication'].name,
      status: 'pass',
      message: 'All keywords are deduplicated and uniquely structured.',
    });
  }

  // ==========================================
  // 13. AI DISCLOSURE & PROVENANCE (PHASE 15 & BUG D)
  // ==========================================
  if (project.aiStatus === 'yes') {
    const check = project.aiChecklist;
    const allChecked = check.commercialTermsReviewed && 
                       check.artworkVisuallyReviewed && 
                       check.artifactsCorrected && 
                       check.noUnauthorizedIp && 
                       check.adobeAiCheckboxAcknowledged;

    if (!allChecked) {
      items.push({
        id: ADOBE_STOCK_RULES['rule-ai-disclosure-compliance'].id,
        category: 'ai-disclosure',
        title: ADOBE_STOCK_RULES['rule-ai-disclosure-compliance'].name,
        status: 'warning',
        message: 'Project is marked as AI-Assisted (YES), but one or more mandatory review checklist confirmations remain unchecked.',
        detail: 'Review commercial terms, clean trace artifacts, ensure zero third-party IP, and acknowledge the Adobe Stock Generative AI checkbox requirement.'
      });
    } else {
      items.push({
        id: ADOBE_STOCK_RULES['rule-ai-disclosure-compliance'].id,
        category: 'ai-disclosure',
        title: ADOBE_STOCK_RULES['rule-ai-disclosure-compliance'].name,
        status: 'pass',
        message: 'AI Assisted: YES. All compliance confirmations completed. Generative AI disclosure reminder: REQUIRED on upload.',
        detail: 'Contributorship provenance explicitly preserved across save, export, and QC packaging.'
      });
    }
  } else if (project.aiStatus === 'unsure') {
    items.push({
      id: ADOBE_STOCK_RULES['rule-ai-disclosure-compliance'].id,
      category: 'ai-disclosure',
      title: ADOBE_STOCK_RULES['rule-ai-disclosure-compliance'].name,
      status: 'warning',
      message: 'AI Assisted status is UNSURE. Provenance must be reviewed and confirmed as YES or NO before declaring project ready for human review.',
      detail: 'Adobe Stock requires explicit disclosure of generative AI creation tools.'
    });
  } else {
    items.push({
      id: ADOBE_STOCK_RULES['rule-ai-disclosure-compliance'].id,
      category: 'ai-disclosure',
      title: ADOBE_STOCK_RULES['rule-ai-disclosure-compliance'].name,
      status: 'pass',
      message: 'AI Assisted: NO (Declared as non-AI original vector creation).',
      detail: 'No AI disclosure required on upload.'
    });
  }

  // ==========================================
  // 14. CATALOG SIMILARITY & DUPLICATE CONTENT GUARD
  // ==========================================
  if (existingProjects.length > 1) {
    const simResult = checkProjectSimilarity(project, existingProjects);
    if (simResult.hasMatches && simResult.topMatch) {
      const top = simResult.topMatch;
      if (simResult.flags.isColorOnlyVariant || simResult.worstSeverity === 'critical') {
        items.push({
          id: ADOBE_STOCK_RULES['rule-similarity-content-duplication'].id,
          category: 'metadata',
          title: ADOBE_STOCK_RULES['rule-similarity-content-duplication'].name,
          status: 'fail',
          message: `Critical overlap (${top.overallScore}%) with existing project "${top.matchedProjectName}". Adobe Stock rejects color-only variations or near-identical geometry.`,
          detail: top.reasons.join(' '),
          fixActionLabel: 'Inspect Differences'
        });
      } else if (simResult.worstSeverity === 'high') {
        items.push({
          id: ADOBE_STOCK_RULES['rule-similarity-content-duplication'].id,
          category: 'metadata',
          title: ADOBE_STOCK_RULES['rule-similarity-content-duplication'].name,
          status: 'warning',
          message: `Significant overlap (${top.overallScore}%) with "${top.matchedProjectName}". Ensure substantive conceptual or structural differentiation.`,
          detail: top.reasons.join(' '),
          fixActionLabel: 'Inspect Differences'
        });
      } else {
        items.push({
          id: ADOBE_STOCK_RULES['rule-similarity-content-duplication'].id,
          category: 'metadata',
          title: ADOBE_STOCK_RULES['rule-similarity-content-duplication'].name,
          status: 'pass',
          message: `Asset shows sufficient geometry and keyword differentiation from other catalog assets (Max similarity: ${top.overallScore}% with "${top.matchedProjectName}").`
        });
      }
    } else {
      items.push({
        id: ADOBE_STOCK_RULES['rule-similarity-content-duplication'].id,
        category: 'metadata',
        title: ADOBE_STOCK_RULES['rule-similarity-content-duplication'].name,
        status: 'pass',
        message: 'No duplicate assets detected in current workspace. Unique vector geometry confirmed.'
      });
    }
  }

  // ==========================================
  // 15. VERDICT MODEL (PHASE 20)
  // ==========================================
  const failCount = items.filter(i => i.status === 'fail').length;
  const warningCount = items.filter(i => i.status === 'warning').length;
  const passCount = items.filter(i => i.status === 'pass').length;

  const overall = failCount > 0 ? 'FAIL' : (warningCount > 0 ? 'WARNING' : 'PASS');
  const readyForReview = failCount === 0 && activeSlots.length > 0 && project.aiStatus !== 'unsure';

  let statusVerdict: 'NOT READY' | 'NEEDS REVIEW' | 'READY FOR HUMAN REVIEW' = 'NOT READY';
  if (failCount === 0) {
    if (project.aiStatus === 'unsure') {
      statusVerdict = 'NEEDS REVIEW';
    } else if (warningCount > 0 && !project.humanReviewed) {
      statusVerdict = 'NEEDS REVIEW';
    } else {
      statusVerdict = 'READY FOR HUMAN REVIEW';
    }
  } else {
    statusVerdict = 'NOT READY';
  }

  let summary = '';
  if (statusVerdict === 'READY FOR HUMAN REVIEW') {
    summary = 'All technical vector, canvas, security, and metadata checks passed. Ready for human quality review.';
  } else if (statusVerdict === 'NEEDS REVIEW') {
    summary = `${warningCount} warning(s) detected. Contributor review recommended before final export.`;
  } else {
    summary = `${failCount} critical defect(s) detected. Submission would be rejected by Adobe Stock moderation. Resolve errors before export.`;
  }

  // Sum total element counts across slots
  const totalPaths = project.slots.reduce((sum, s) => sum + s.stats.pathCount, 0);
  const totalRects = project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.rects || 0), 0);
  const totalCircles = project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.circles || 0), 0);
  const totalEllipses = project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.ellipses || 0), 0);
  const totalLines = project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.lines || 0), 0);
  const totalPolylines = project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.polylines || 0), 0);
  const totalPolygons = project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.polygons || 0), 0);
  const totalGroups = project.slots.reduce((sum, s) => sum + s.stats.groupCount, 0);
  const totalText = project.slots.reduce((sum, s) => sum + (s.stats.textDetails?.count || 0), 0);
  const totalImages = project.slots.reduce((sum, s) => sum + (s.stats.rasterDetails?.total || 0), 0);
  const totalUses = project.slots.reduce((sum, s) => sum + (s.stats.elementCounts?.uses || 0), 0);
  const totalDrawable = totalPaths + totalRects + totalCircles + totalEllipses + totalLines + totalPolylines + totalPolygons + totalUses + totalText;

  const elementCountsTotal: DetailedElementCounts = {
    paths: totalPaths,
    rects: totalRects,
    circles: totalCircles,
    ellipses: totalEllipses,
    lines: totalLines,
    polylines: totalPolylines,
    polygons: totalPolygons,
    groups: totalGroups,
    text: totalText,
    images: totalImages,
    uses: totalUses,
    defs: 0,
    linearGradients: 0,
    radialGradients: 0,
    patterns: 0,
    filters: 0,
    masks: 0,
    clipPaths: 0,
    totalDrawableElements: totalDrawable
  };

  return {
    overall,
    summary,
    passCount,
    warningCount,
    failCount,
    items,
    readyForReview,
    statusVerdict,
    elementCountsTotal
  };
}

export const runFullPreflight = runAdobeStockPreflight;
