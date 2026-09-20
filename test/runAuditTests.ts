import { sanitizeAndInspectSvg, generateStandaloneStockSvg, generateQCReport, verifyExportedSvg, removeLiveTextFromSvg } from '../src/lib/svgUtils';
import { runAdobeStockPreflight } from '../src/lib/preflightEngine';
import { createDefaultProject, getStoredProjects, saveProject } from '../src/lib/storage';
import { FIXTURES } from './fixtures/svgFixtures';
import { JSDOM } from 'jsdom';

// Setup browser globals for headless Node environment if needed
if (typeof window === 'undefined') {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  (global as any).window = dom.window;
  (global as any).document = dom.window.document;
  (global as any).localStorage = {
    store: {} as Record<string, string>,
    getItem(key: string) { return this.store[key] || null; },
    setItem(key: string, value: string) { this.store[key] = value; },
    removeItem(key: string) { delete this.store[key]; }
  };
}

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
    failedTests++;
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('ADOBE STOCK VECTOR FACTORY - VALIDATION AUDIT TEST SUITE');
  console.log('======================================================\n');

  // ----------------------------------------------------
  // TEST GROUP 1: BUG A & LIVE TEXT AUDIT (PHASE 3)
  // ----------------------------------------------------
  console.log('--- TEST GROUP 1: Live Text Audit & Bug A ---');
  {
    const inspectedSimple = sanitizeAndInspectSvg(FIXTURES.liveTextSimple, 'Live Text Simple');
    assert(inspectedSimple.stats.hasText === true, 'Bug A: Detects live text presence');
    assert(inspectedSimple.stats.textDetails.count === 1, 'Bug A: textDetails.count === 1');
    assert(inspectedSimple.stats.textDetails.items[0]?.text === '82.4', 'Bug A: Extracted exact live text "82.4"');

    const inspectedNested = sanitizeAndInspectSvg(FIXTURES.liveTextNested, 'Live Text Nested');
    assert(inspectedNested.stats.hasText === true, 'Detects nested live text (<tspan>)');
    assert(inspectedNested.stats.textDetails.items.some(t => t.text.includes('82.4')), 'Extracts nested "82.4" from <tspan>');

    // Test text removal action
    const cleaned = removeLiveTextFromSvg(FIXTURES.liveTextSimple);
    const inspectedCleaned = sanitizeAndInspectSvg(cleaned, 'Cleaned Text');
    assert(inspectedCleaned.stats.hasText === false, 'removeLiveTextFromSvg successfully strips <text> tags');
    assert(inspectedCleaned.stats.textDetails.count === 0, 'Cleaned text count is 0');
  }

  // ----------------------------------------------------
  // TEST GROUP 2: BUG B & GRANULAR ELEMENT COUNTS (PHASE 2)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 2: Element Audit & Bug B ---');
  {
    const inspected = sanitizeAndInspectSvg(FIXTURES.mixedElements, 'Mixed Shapes');
    const counts = inspected.stats.elementCounts;
    assert(counts.paths === 2, `Exact path count: 2 (got ${counts.paths})`);
    assert(counts.rects === 1, `Exact rect count: 1 (got ${counts.rects})`);
    assert(counts.circles === 1, `Exact circle count: 1 (got ${counts.circles})`);
    assert(counts.polygons === 1, `Exact polygon count: 1 (got ${counts.polygons})`);
    assert(counts.lines === 1, `Exact line count: 1 (got ${counts.lines})`);
    assert(counts.totalDrawableElements === 6, `Total drawable elements: 6 (got ${counts.totalDrawableElements})`);
  }

  // ----------------------------------------------------
  // TEST GROUP 3: BUG C & TRANSPARENCY AUDIT (PHASE 5)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 3: Transparency Audit & Bug C ---');
  {
    const inspectedFillOp = sanitizeAndInspectSvg(FIXTURES.transparencyFillOpacity, 'Fill Opacity');
    assert(inspectedFillOp.stats.transparencyDetails.hasTransparency === true, 'Bug C: Detects fill-opacity transparency');
    assert(inspectedFillOp.stats.transparencyDetails.fillOpacityCount === 2, `Bug C: Detected 2 fill-opacity elements (got ${inspectedFillOp.stats.transparencyDetails.fillOpacityCount})`);

    const inspectedOpacity = sanitizeAndInspectSvg(FIXTURES.transparencyOpacity, 'Group Opacity');
    assert(inspectedOpacity.stats.transparencyDetails.opacityCount >= 1, 'Detects opacity attribute');

    const inspectedStrokeOp = sanitizeAndInspectSvg(FIXTURES.transparencyStrokeOpacity, 'Stroke Opacity');
    assert(inspectedStrokeOp.stats.transparencyDetails.strokeOpacityCount === 1, 'Detects stroke-opacity attribute');

    const inspectedCss = sanitizeAndInspectSvg(FIXTURES.transparencyCss, 'CSS Transparency');
    assert(inspectedCss.stats.transparencyDetails.hasTransparency === true, 'Detects transparency inside style attribute');
  }

  // ----------------------------------------------------
  // TEST GROUP 4: EMBEDDED RASTER AUDIT (PHASE 4)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 4: Pure Vector Integrity (Zero Raster) ---');
  {
    const inspectedBase64 = sanitizeAndInspectSvg(FIXTURES.rasterBase64, 'Base64 Raster');
    assert(inspectedBase64.stats.hasRaster === true, 'Detects embedded base64 raster image');
    assert(inspectedBase64.stats.rasterDetails.embeddedBase64 === 1, 'Flags 1 embedded base64 image');

    const inspectedExt = sanitizeAndInspectSvg(FIXTURES.rasterExternal, 'External Raster');
    assert(inspectedExt.stats.hasRaster === true, 'Detects external image URL');
    assert(inspectedExt.stats.rasterDetails.externalUrls === 1, 'Flags 1 external image URL');

    const clean = sanitizeAndInspectSvg(FIXTURES.cleanIcon, 'Clean Vector');
    assert(clean.stats.hasRaster === false, 'Clean vector has zero raster');
  }

  // ----------------------------------------------------
  // TEST GROUP 5: SECURITY AUDIT (PHASE 9)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 5: Security & Executable Code Audit ---');
  {
    const inspectedScript = sanitizeAndInspectSvg(FIXTURES.unsafeScript, 'Script Injection');
    assert(inspectedScript.cleanSvg.includes('<script') === false, 'Strips <script> tags from SVG');
    assert(inspectedScript.stats.hasScripts === true, 'Flags hasScripts === true during inspection');

    const inspectedForeign = sanitizeAndInspectSvg(FIXTURES.unsafeForeignObject, 'ForeignObject');
    assert(inspectedForeign.cleanSvg.includes('foreignObject') === false, 'Strips <foreignObject> tags');

    const inspectedHandler = sanitizeAndInspectSvg(FIXTURES.unsafeEventHandler, 'Event Handler');
    assert(inspectedHandler.cleanSvg.includes('onclick') === false, 'Strips onclick event handler');
    assert(inspectedHandler.cleanSvg.includes('onmouseover') === false, 'Strips onmouseover event handler');
  }

  // ----------------------------------------------------
  // TEST GROUP 6: BUG D & AI DISCLOSURE INTEGRITY (PHASE 15)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 6: AI Status & Bug D ---');
  {
    const defaultProject = createDefaultProject();
    assert(defaultProject.aiStatus === 'yes', 'Bug D: Default Residential Solar preset has aiStatus === "yes"');

    // Save and load round-trip
    await saveProject(defaultProject);
    const loadedProjects = await getStoredProjects();
    const solarProj = loadedProjects.find(p => p.id === 'proj-solar-001');
    assert(solarProj !== undefined, 'Loaded project from storage');
    assert(solarProj?.aiStatus === 'yes', 'Bug D: aiStatus === "yes" survives storage reload');
  }

  // ----------------------------------------------------
  // TEST GROUP 7: RESIDENTIAL SOLAR ENERGY PRODUCTION REGRESSION (PHASE 24)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 7: Residential Solar Energy Production Regression ---');
  {
    const solar = createDefaultProject();
    assert(solar.slots.length === 16, 'Has all 16 slots populated');

    // Verify slots pure vector
    const rasterSlots = solar.slots.filter(s => s.stats.hasRaster || s.stats.rasterDetails.total > 0);
    assert(rasterSlots.length === 0, 'Zero raster elements across all 16 icons');

    // Verify live text is 0
    const textSlots = solar.slots.filter(s => s.stats.hasText || s.stats.textDetails.count > 0);
    assert(textSlots.length === 0, 'Zero live text elements across all 16 icons');

    // Preflight run
    const preflight = runAdobeStockPreflight(solar, [solar]);
    assert(preflight.failCount === 0, `Zero preflight failures (got ${preflight.failCount})`);
    assert(preflight.statusVerdict === 'READY FOR HUMAN REVIEW', `Verdict is READY FOR HUMAN REVIEW (got ${preflight.statusVerdict})`);

    // Verify Export Output (Phase 17 & 18)
    const standaloneSvg = generateStandaloneStockSvg(solar);
    assert(standaloneSvg.includes('viewBox="0 0 4000 4000"'), 'Generated standalone SVG has 4000x4000 viewBox');
    assert(standaloneSvg.includes('id="icon-01-solar-home"'), 'Contains semantic icon group IDs');

    const verification = await verifyExportedSvg(standaloneSvg, solar);
    assert(verification.isValid === true, 'Exported SVG verification passed');
    assert(verification.iconGroupsFound === 16, `Verified 16 semantic groups (found ${verification.iconGroupsFound})`);
    assert(verification.hasScripts === false, 'Exported SVG has zero scripts');
    assert(verification.hasRaster === false, 'Exported SVG has zero raster');
    assert(verification.svgSha256.length === 64, 'Computed valid SHA-256 hash');

    // QC Report verification
    const qcReport = await generateQCReport(solar, preflight.items, standaloneSvg);
    assert(qcReport.svgSha256 === verification.svgSha256, 'QC report SHA-256 matches verified standalone SVG');
    assert(qcReport.provenance.aiAssisted === 'YES', 'Bug D: QC report correctly discloses AI Assisted: YES');
    assert(qcReport.provenance.generativeAiDisclosureRequiredOnUpload === true, 'QC report specifies AI disclosure required on upload');
    assert(qcReport.vectorAudit.pureVector === true, 'QC report states pureVector === true');
    assert(qcReport.vectorAudit.transparencyElements > 0, 'Bug C: QC report audits and records transparency elements');
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n======================================================');
  console.log(`TEST RUN COMPLETE: ${passedTests} passed, ${failedTests} failed.`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Test run crashed:', err);
  process.exit(1);
});
