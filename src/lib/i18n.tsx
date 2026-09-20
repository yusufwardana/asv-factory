import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'id' | 'en';

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const STORAGE_KEY = 'asvf_locale_v1';

export const translations: Record<Language, Record<string, string>> = {
  id: {
    // App & Branding
    'app.name': 'Adobe Stock Vector Factory',
    'app.subtitle': 'Ruang Kerja Produksi Vektor Saham Adobe Stock',
    'app.mvp': 'MVP 1.0',

    // Header Actions & Statuses
    'header.title': 'Stock Vector Factory',
    'header.localProcessing': 'PEMROSESAN LOKAL',
    'header.localProcessingTooltip': '100% Pemrosesan lokal: karya seni vektor tidak pernah dikirim ke server luar/cloud.',
    'header.preflightPass': 'PREFLIGHT: LULUS',
    'header.preflightFail': 'PREFLIGHT: {count} GAGAL',
    'header.preflightWarn': 'PREFLIGHT: {count} PERINGATAN',
    'header.preflightTooltip': 'Klik untuk melihat hasil pemeriksaan preflight',
    'header.aiDisclosureRequired': 'PENGUNGKAPAN AI DIBUTUHKAN',
    'header.originalVector': 'VEKTOR ASLI (MANUSIA)',
    'header.help': 'Panduan',
    'header.helpTooltip': 'Buka Panduan Manual & Bantuan Pengguna (?)',
    'header.metadata': 'Metadata',
    'header.exportStockSvg': 'EKSPOR SVG STOCK',
    'header.exportTooltip': 'Ekspor Standalone SVG, Laporan QC, & Paket (Ctrl+E)',
    'header.undo': 'Urungkan (Ctrl+Z)',
    'header.redo': 'Ulangi (Ctrl+Shift+Z)',
    'header.modeNormal': 'Normal',
    'header.modeOutline': 'Garis Luar',
    'header.modeGrid': 'Kisi',
    'header.modeDark': 'Gelap',
    'header.modeWhite': 'Putih',
    'header.toggleGrid': 'Alihkan Garis Kisi (G)',
    'header.toggleSafeAreas': 'Alihkan Panduan Area Aman',
    'header.language': 'Bahasa',
    'header.switchLanguage': 'Pilih Bahasa / Language',
    'header.projectSelector': 'Pilih atau Buat Proyek',
    'header.normalTooltip': 'Mode pratinjau standar',
    'header.outlineTooltip': 'Pratinjau wireframe rangka garis luar (deteksi jalur terbuka/rusak - O)',
    'header.gridTooltip': 'Pratinjau kisi transparan catur',
    'header.darkTooltip': 'Pratinjau kontras gelap',
    'header.whiteTooltip': 'Pratinjau kanvas putih',

    // Sidebar Navigation
    'nav.workspace': 'Ruang Kerja',
    'nav.workspaceDesc': 'Kanvas & Inspektur',
    'nav.dashboard': 'Dasbor Produksi',
    'nav.dashboardDesc': 'Pelacak Harian & Target',
    'nav.projects': 'Katalog Proyek',
    'nav.projectsDesc': 'Semua Koleksi Lembar Aset',
    'nav.kanban': 'Antrean Produksi',
    'nav.kanbanDesc': 'Pipa Alur Kerja 11 Tahap',
    'nav.templates': 'Templat Preset',
    'nav.templatesDesc': 'Artboard & Tata Letak Kisi',
    'nav.rejections': 'Pelacak Penolakan',
    'nav.rejectionsDesc': 'Analisis Umpan Balik Moderasi',
    'nav.focusMode': 'Hari Produksi',
    'nav.focusModeDesc': 'Mode Fokus Produksi Cepat',
    'nav.guide': 'Panduan & Bantuan',
    'nav.guideDesc': 'Manual Penggunaan & Standar',
    'nav.backup': 'Cadangan & Penyimpanan',
    'nav.backupDesc': 'IndexedDB & Ekspor JSON',
    'sidebar.title': 'Ruang Kerja Produksi',
    'sidebar.corePrincipleTitle': 'Prinsip Utama',
    'sidebar.corePrincipleQuote': '"Produksi lebih cepat, bukan lebih ceroboh. Tinjauan manusia tetap menjadi gerbang kualitas utama."',

    // Canvas Workspace
    'canvas.sheetTitle': 'Lembar Ikon Adobe Stock (4000 × 4000 px)',
    'canvas.sheetSubtitle': 'Kisi Vektor Standar Komersial 4×4',
    'canvas.slot': 'Slot',
    'canvas.emptySlot': 'Slot Kosong',
    'canvas.clickToSelect': 'Klik untuk memilih slot ini',
    'canvas.dropFiles': 'Tarik & lepas file SVG ke sini atau ke slot tertentu',
    'canvas.uploadSvg': 'Unggah SVG',
    'canvas.clearSlot': 'Kosongkan Slot',
    'canvas.autoNormalize': 'Normalisasi Otomatis Semua Slot',
    'canvas.batchImport': 'Impor Banyak SVG',
    'canvas.resetPositions': 'Atur Ulang Posisi',
    'canvas.zoomIn': 'Perbesar',
    'canvas.zoomOut': 'Perkecil',
    'canvas.resetZoom': 'Atur Ulang Zoom',
    'canvas.fitCanvas': 'Sesuaikan Kanvas',
    'canvas.safeAreaActive': 'Area Aman: 32px Margin dalam',

    // Inspector Tabs
    'tab.vector': 'Vektor',
    'tab.palette': 'Palet',
    'tab.strokes': 'Goresan',
    'tab.complexity': 'Kompleksitas',
    'tab.similarity': 'Kemiripan',
    'tab.thumbnails': 'Pratinjau',

    // Inspector Panel
    'inspector.title': 'Inspektur Vektor',
    'inspector.noSlotSelected': 'Tidak ada slot yang dipilih',
    'inspector.selectPrompt': 'Pilih salah satu ikon pada lembar kanvas untuk memeriksa metrik, geometri, dan sanitasi.',
    'inspector.metricsBreakdown': 'Rincian Elemen Vektor',
    'inspector.paths': 'Jalur <path>',
    'inspector.shapes': 'Bentuk (Rect/Poli)',
    'inspector.circlesLines': 'Lingkaran / Garis',
    'inspector.totalDrawables': 'Total Elemen Gambar',
    'inspector.purityAudit': 'Audit Kemurnian Vektor',
    'inspector.embeddedRaster': 'Raster Tertanam:',
    'inspector.detectedFail': 'TERDETEKSI (GAGAL)',
    'inspector.cleanPass': '0 (BERSIH)',
    'inspector.liveText': 'Teks Aktif (<text>):',
    'inspector.liveDetected': '{count} AKTIF (<text>)',
    'inspector.allOutlined': '0 (SEMUA DIJADIKAN GARIS LUAR)',
    'inspector.transparency': 'Transparansi:',
    'inspector.transparencySummary': 'Fill-Op: {fill}, Op: {op}',
    'inspector.opaque': '0 (100% BURAM)',
    'inspector.executableScripts': 'Skrip Eksekusi:',
    'inspector.scriptsCleaned': '0 (DITOLAK/DIBERSIHKAN)',
    'inspector.traceArtifacts': 'Artefak Jejak Otomatis:',
    'inspector.artifactsNone': '0 (BERSIH)',
    'inspector.slotControls': 'Kontrol Transformasi Slot',
    'inspector.scale': 'Skala',
    'inspector.offsetX': 'Geser Sumbu X',
    'inspector.offsetY': 'Geser Sumbu Y',
    'inspector.visualWeight': 'Bobot Visual',
    'inspector.resetTransforms': 'Atur Ulang Transformasi',
    'inspector.removeLiveText': 'Hapus Teks Aktif',
    'inspector.sanitizationLog': 'Catatan Sanitasi & Inspeksi',
    'inspector.slotLabel': 'Label Slot',
    'inspector.dimensions': 'Dimensi Asli',

    // Preflight Modal
    'preflight.modalTitle': 'Audit Kualitas Preflight Adobe Stock',
    'preflight.ruleStatus': 'Status Aturan',
    'preflight.officialRequirements': 'Persyaratan Resmi Adobe Stock',
    'preflight.internalHeuristics': 'Heuristik Kualitas Internal',
    'preflight.passCount': 'Lulus',
    'preflight.warnCount': 'Peringatan',
    'preflight.failCount': 'Gagal',
    'preflight.verdict': 'Putusan Preflight',
    'preflight.readyForReview': 'SIAP UNTUK TINJAUAN MANUSIA',
    'preflight.needsReview': 'PERLU TINJAUAN',
    'preflight.notReady': 'BELUM SIAP',
    'preflight.markHumanReviewed': 'Tandai Telah Ditinjau Manusia',
    'preflight.humanReviewedBadge': 'Telah Ditinjau Manusia',
    'preflight.allFilter': 'Semua',
    'preflight.failFilter': 'Gagal',
    'preflight.warnFilter': 'Peringatan',
    'preflight.passFilter': 'Lulus',
    'preflight.categoryVector': 'Integritas Vektor',
    'preflight.categoryCanvas': 'Kanvas & Dimensi',
    'preflight.categorySecurity': 'Keamanan & Kode',
    'preflight.categoryMetadata': 'Metadata & Judul',
    'preflight.categoryProvenance': 'Asal-Usul & AI',
    'preflight.categorySimilarity': 'Anti-Duplikasi',
    'preflight.openMetadata': 'Buka Studio Metadata',
    'preflight.similarityAudit': 'Audit Kesamaan Portofolio',
    'preflight.close': 'Tutup',

    // Export Modal
    'export.modalTitle': 'Ekspor SVG & Laporan Kontrol Kualitas (QC)',
    'export.readyHeadline': 'Karya Seni Siap Diekspor',
    'export.readyDesc': 'Standalone SVG 4000×4000 px dengan 16 grup terisolasi semantik dan laporan QC yang sesuai dengan spesifikasi Adobe Stock.',
    'export.downloadSvg': 'Unduh SVG Standalone (4000×4000)',
    'export.downloadQc': 'Unduh Laporan QC (JSON)',
    'export.downloadZip': 'Unduh Paket Lengkap (.ZIP)',
    'export.sha256': 'Hash Kriptografi SHA-256',
    'export.verifiedStatus': 'TERVERIFIKASI: 100% VEKTOR MURNI',
    'export.verifiedDesc': 'File SVG telah dipindai ulang dan dipastikan bebas dari elemen raster, skrip eksekusi, serta teks belum terkonversi.',
    'export.aiNoticeTitle': 'Pemberitahuan Wajib: Unggah AI Generatif',
    'export.aiNoticeDesc': 'Proyek ini ditandai menggunakan bantuan AI. Harap centang kotak "Karya Dihasilkan dengan AI Generatif" pada portal Adobe Stock saat mengunggah.',
    'export.close': 'Tutup',

    // Metadata Studio Modal
    'metadata.modalTitle': 'Studio Metadata & SEO Adobe Stock',
    'metadata.assetTitle': 'Judul Aset (Komersial & Deskriptif)',
    'metadata.titleHint': 'Minimal 5 kata, jangan gunakan kata spam atau tanda baca berlebih.',
    'metadata.keywords': 'Kata Kunci (5 - 50 Kata Kunci)',
    'metadata.keywordCount': '{count}/50 Kata Kunci',
    'metadata.keywordInputPlaceholder': 'Ketik kata kunci dan tekan Enter atau Koma...',
    'metadata.addKeyword': 'Tambah',
    'metadata.aiProvenance': 'Status Asal-Usul AI Generatif',
    'metadata.aiYes': 'Bantuan AI (Wajib deklarasi di portal)',
    'metadata.aiNo': 'Vektor Murni Buatan Tangan Manusia',
    'metadata.aiUnsure': 'Belum Yakin (Harus Diperiksa)',
    'metadata.category': 'Kategori Utama Adobe Stock',
    'metadata.save': 'Simpan Perubahan',
    'metadata.close': 'Tutup',

    // Generic Common UI
    'common.save': 'Simpan',
    'common.cancel': 'Batal',
    'common.delete': 'Hapus',
    'common.edit': 'Ubah',
    'common.copy': 'Salin',
    'common.copied': 'Tersalin!',
    'common.close': 'Tutup',
    'common.refresh': 'Segarkan',
    'common.search': 'Cari...',
    'common.loading': 'Memuat data...',
    'common.status': 'Status',
    'common.actions': 'Tindakan',
    'common.warning': 'Peringatan',
    'common.error': 'Kesalahan',
    'common.success': 'Berhasil',
    'common.yes': 'Ya',
    'common.no': 'Tidak'
  },
  en: {
    // App & Branding
    'app.name': 'Adobe Stock Vector Factory',
    'app.subtitle': 'Professional Vector Production Workspace for Adobe Stock',
    'app.mvp': 'MVP 1.0',

    // Header Actions & Statuses
    'header.title': 'Stock Vector Factory',
    'header.localProcessing': 'LOCAL PROCESSING',
    'header.localProcessingTooltip': '100% Local processing: zero vector artwork sent to cloud or external servers.',
    'header.preflightPass': 'PREFLIGHT: PASS',
    'header.preflightFail': 'PREFLIGHT: {count} FAIL',
    'header.preflightWarn': 'PREFLIGHT: {count} WARN',
    'header.preflightTooltip': 'Click to view Preflight details',
    'header.aiDisclosureRequired': 'AI DISCLOSURE REQUIRED',
    'header.originalVector': 'ORIGINAL VECTOR',
    'header.help': 'Guide',
    'header.helpTooltip': 'Open User Manual & Help Guide (?)',
    'header.metadata': 'Metadata',
    'header.exportStockSvg': 'EXPORT STOCK SVG',
    'header.exportTooltip': 'Export Standalone Stock SVG, QC Report, & Package (Ctrl+E)',
    'header.undo': 'Undo (Ctrl+Z)',
    'header.redo': 'Redo (Ctrl+Shift+Z)',
    'header.modeNormal': 'Normal',
    'header.modeOutline': 'Outline',
    'header.modeGrid': 'Grid',
    'header.modeDark': 'Dark',
    'header.modeWhite': 'White',
    'header.toggleGrid': 'Toggle Grid Lines (G)',
    'header.toggleSafeAreas': 'Toggle Safe Area Boundary Guides',
    'header.language': 'Language',
    'header.switchLanguage': 'Select Language / Pilihan Bahasa',
    'header.projectSelector': 'Create or Switch Project',
    'header.normalTooltip': 'Normal preview mode',
    'header.outlineTooltip': 'Outline wireframe preview (detect stray paths and bad joins - Shortcut: O)',
    'header.gridTooltip': 'Transparent grid checkerboard preview',
    'header.darkTooltip': 'Dark contrast preview',
    'header.whiteTooltip': 'White artboard preview',

    // Sidebar Navigation
    'nav.workspace': 'Workspace',
    'nav.workspaceDesc': 'Canvas & Inspector',
    'nav.dashboard': 'Dashboard',
    'nav.dashboardDesc': 'Daily Tracker & Goals',
    'nav.projects': 'Projects',
    'nav.projectsDesc': 'All Stock Assets',
    'nav.kanban': 'Production Queue',
    'nav.kanbanDesc': '11-Stage Pipeline',
    'nav.templates': 'Preset Templates',
    'nav.templatesDesc': 'Artboards & Grids',
    'nav.rejections': 'Rejection Tracker',
    'nav.rejectionsDesc': 'Moderation Feedback',
    'nav.focusMode': 'Production Day',
    'nav.focusModeDesc': 'Targeted Focus Mode',
    'nav.guide': 'Help & Manual',
    'nav.guideDesc': 'User Guide & Standards',
    'nav.backup': 'Backup & Storage',
    'nav.backupDesc': 'IndexedDB & JSON',
    'sidebar.title': 'Production Workspace',
    'sidebar.corePrincipleTitle': 'Core Principle',
    'sidebar.corePrincipleQuote': '"Produce faster, not sloppier. Human review remains the ultimate quality gate."',

    // Canvas Workspace
    'canvas.sheetTitle': 'Adobe Stock Icon Sheet (4000 × 4000 px)',
    'canvas.sheetSubtitle': 'Commercial Standard 4×4 Vector Grid',
    'canvas.slot': 'Slot',
    'canvas.emptySlot': 'Empty Slot',
    'canvas.clickToSelect': 'Click to select slot',
    'canvas.dropFiles': 'Drag and drop SVG files here or onto a specific slot',
    'canvas.uploadSvg': 'Upload SVG',
    'canvas.clearSlot': 'Clear Slot',
    'canvas.autoNormalize': 'Auto-Normalize All Slots',
    'canvas.batchImport': 'Batch Import SVGs',
    'canvas.resetPositions': 'Reset Positions',
    'canvas.zoomIn': 'Zoom In',
    'canvas.zoomOut': 'Zoom Out',
    'canvas.resetZoom': 'Reset Zoom',
    'canvas.fitCanvas': 'Fit Canvas',
    'canvas.safeAreaActive': 'Safe Area: 32px Inner Margin',

    // Inspector Tabs
    'tab.vector': 'Vector',
    'tab.palette': 'Palette',
    'tab.strokes': 'Strokes',
    'tab.complexity': 'Complexity',
    'tab.similarity': 'Similarity',
    'tab.thumbnails': 'Thumbnails',

    // Inspector Panel
    'inspector.title': 'Vector Inspector',
    'inspector.noSlotSelected': 'No slot selected',
    'inspector.selectPrompt': 'Select an icon on the canvas sheet to inspect metrics, geometry, and sanitization.',
    'inspector.metricsBreakdown': 'Metrics Breakdown',
    'inspector.paths': 'Paths <path>',
    'inspector.shapes': 'Shapes (Rect/Poly)',
    'inspector.circlesLines': 'Circles / Lines',
    'inspector.totalDrawables': 'Total Drawables',
    'inspector.purityAudit': 'Vector Purity Audit',
    'inspector.embeddedRaster': 'Embedded Raster:',
    'inspector.detectedFail': 'DETECTED (FAIL)',
    'inspector.cleanPass': '0 (CLEAN)',
    'inspector.liveText': 'Live Text (<text>):',
    'inspector.liveDetected': '{count} LIVE (<text>)',
    'inspector.allOutlined': '0 (ALL OUTLINED)',
    'inspector.transparency': 'Transparency:',
    'inspector.transparencySummary': 'Fill-Op: {fill}, Op: {op}',
    'inspector.opaque': '0 (100% OPAQUE)',
    'inspector.executableScripts': 'Executable Scripts:',
    'inspector.scriptsCleaned': '0 (REJECTED/CLEANED)',
    'inspector.traceArtifacts': 'Trace Artifacts:',
    'inspector.artifactsNone': '0 (CLEAN)',
    'inspector.slotControls': 'Slot Transform Controls',
    'inspector.scale': 'Scale',
    'inspector.offsetX': 'Offset X',
    'inspector.offsetY': 'Offset Y',
    'inspector.visualWeight': 'Visual Weight',
    'inspector.resetTransforms': 'Reset Transforms',
    'inspector.removeLiveText': 'Remove Live Text',
    'inspector.sanitizationLog': 'Sanitization & Inspection Log',
    'inspector.slotLabel': 'Slot Label',
    'inspector.dimensions': 'Original Bounds',

    // Preflight Modal
    'preflight.modalTitle': 'Adobe Stock Preflight Quality Audit',
    'preflight.ruleStatus': 'Rule Status',
    'preflight.officialRequirements': 'Official Adobe Stock Requirements',
    'preflight.internalHeuristics': 'Internal Quality Heuristics',
    'preflight.passCount': 'Pass',
    'preflight.warnCount': 'Warning',
    'preflight.failCount': 'Fail',
    'preflight.verdict': 'Preflight Verdict',
    'preflight.readyForReview': 'READY FOR HUMAN REVIEW',
    'preflight.needsReview': 'NEEDS REVIEW',
    'preflight.notReady': 'NOT READY',
    'preflight.markHumanReviewed': 'Mark as Human Reviewed',
    'preflight.humanReviewedBadge': 'Human Reviewed',
    'preflight.allFilter': 'All',
    'preflight.failFilter': 'Fail',
    'preflight.warnFilter': 'Warning',
    'preflight.passFilter': 'Pass',
    'preflight.categoryVector': 'Vector Integrity',
    'preflight.categoryCanvas': 'Canvas & Dimensions',
    'preflight.categorySecurity': 'Security & Code',
    'preflight.categoryMetadata': 'Metadata & Title',
    'preflight.categoryProvenance': 'Provenance & AI',
    'preflight.categorySimilarity': 'Anti-Similarity',
    'preflight.openMetadata': 'Open Metadata Studio',
    'preflight.similarityAudit': 'Portfolio Similarity Audit',
    'preflight.close': 'Close',

    // Export Modal
    'export.modalTitle': 'Adobe Stock Export & Quality Control (QC)',
    'export.readyHeadline': 'Artwork Ready for Export',
    'export.readyDesc': 'Standalone 4000×4000 px SVG with 16 semantic isolated groups and verified QC report matching Adobe Stock contributor specifications.',
    'export.downloadSvg': 'Download Standalone SVG (4000×4000)',
    'export.downloadQc': 'Download QC Report (JSON)',
    'export.downloadZip': 'Download Complete Package (.ZIP)',
    'export.sha256': 'SHA-256 Cryptographic Hash',
    'export.verifiedStatus': 'VERIFIED: 100% PURE VECTOR',
    'export.verifiedDesc': 'Exported SVG verified clean with zero embedded rasters, zero executable scripts, and zero live text.',
    'export.aiNoticeTitle': 'Required Notice: Generative AI Submission',
    'export.aiNoticeDesc': 'This project contains generative AI assisted artwork. Remember to check the "Created using Generative AI" checkbox in the Adobe Stock Contributor portal.',
    'export.close': 'Close',

    // Metadata Studio Modal
    'metadata.modalTitle': 'Adobe Stock Metadata & SEO Studio',
    'metadata.assetTitle': 'Asset Title (Commercial & Descriptive)',
    'metadata.titleHint': 'Minimum 5 words, avoid keyword stuffing or unnecessary punctuation.',
    'metadata.keywords': 'Keywords (5 - 50 Keywords)',
    'metadata.keywordCount': '{count}/50 Keywords',
    'metadata.keywordInputPlaceholder': 'Type keyword and press Enter or Comma...',
    'metadata.addKeyword': 'Add',
    'metadata.aiProvenance': 'Generative AI Provenance Status',
    'metadata.aiYes': 'AI Assisted (Must disclose upon upload)',
    'metadata.aiNo': 'Human Original Vector (No AI)',
    'metadata.aiUnsure': 'Unsure (Must Be Reviewed)',
    'metadata.category': 'Primary Adobe Stock Category',
    'metadata.save': 'Save Metadata',
    'metadata.close': 'Close',

    // Generic Common UI
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.copy': 'Copy',
    'common.copied': 'Copied!',
    'common.close': 'Close',
    'common.refresh': 'Refresh',
    'common.search': 'Search...',
    'common.loading': 'Loading data...',
    'common.status': 'Status',
    'common.actions': 'Actions',
    'common.warning': 'Warning',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.yes': 'Yes',
    'common.no': 'No'
  }
};

const I18nContext = createContext<I18nContextType>({
  language: 'id',
  setLanguage: () => {},
  t: (key) => key
});

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'en' || stored === 'id') {
          return stored;
        }
      }
    } catch {}
    // Default to Indonesian ('id') when user requests Indonesian option
    return 'id';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, lang);
      }
    } catch {}
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.id;
    let text = dict[key] || translations.en[key] || key;
    if (params) {
      Object.entries(params).forEach(([pKey, pVal]) => {
        text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      });
    }
    return text;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
