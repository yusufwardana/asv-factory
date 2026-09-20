import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  X, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Wand2, 
  Upload, 
  Download, 
  Layers, 
  Keyboard, 
  HelpCircle, 
  Sparkles,
  FileCode,
  Palette,
  ExternalLink,
  ChevronRight,
  Maximize,
  PenTool
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEmbeddedView?: boolean;
}

type GuideSection = 
  | 'workflow'
  | 'adobe-rules'
  | 'features'
  | 'metadata'
  | 'shortcuts'
  | 'faq';

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  isOpen,
  onClose,
  isEmbeddedView = false
}) => {
  const { language, t } = useI18n();
  const [activeSection, setActiveSection] = useState<GuideSection>('workflow');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle ESC key to close modal
  useEffect(() => {
    if (isEmbeddedView) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEmbeddedView]);

  const isId = language === 'id';

  // Sections navigation list
  const navSections = [
    {
      id: 'workflow' as GuideSection,
      icon: Wand2,
      label: isId ? 'Alur Kerja Produksi' : 'Production Workflow',
      badge: isId ? '5 Langkah' : '5 Steps'
    },
    {
      id: 'adobe-rules' as GuideSection,
      icon: ShieldCheck,
      label: isId ? 'Aturan Adobe Stock' : 'Adobe Stock Rules',
      badge: isId ? 'Kritis' : 'Critical'
    },
    {
      id: 'features' as GuideSection,
      icon: Layers,
      label: isId ? 'Fitur Inspektur & Alat' : 'Inspector & Tools',
      badge: isId ? 'Alat Pintar' : 'Smart Tools'
    },
    {
      id: 'metadata' as GuideSection,
      icon: FileCode,
      label: isId ? 'Metadata & SEO Kata Kunci' : 'Metadata & SEO',
      badge: isId ? '50 Tag' : '50 Tags'
    },
    {
      id: 'shortcuts' as GuideSection,
      icon: Keyboard,
      label: isId ? 'Pintasan Keyboard' : 'Keyboard Shortcuts',
      badge: isId ? 'Cepat' : 'Speed'
    },
    {
      id: 'faq' as GuideSection,
      icon: HelpCircle,
      label: isId ? 'FAQ & Masalah Umum' : 'FAQ & Troubleshooting',
      badge: isId ? 'Solusi' : 'Solutions'
    }
  ];

  // Search filter helper
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  if (!isOpen && !isEmbeddedView) return null;

  const content = (
    <div className={`flex flex-col h-full bg-neutral-900 text-neutral-200 ${isEmbeddedView ? 'rounded-xl border border-neutral-800 overflow-hidden' : ''}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-100 tracking-wide uppercase">
                {isId ? 'Panduan Manual Adobe Stock Vector Factory' : 'Adobe Stock Vector Factory Manual'}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-amber-400 border border-neutral-700">
                v1.0 {isId ? 'Standar Komersial' : 'Commercial Grade'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isId 
                ? 'Pedoman lengkap teknik vektor, audit otomatis preflight, dan optimasi ekspor Adobe Stock.' 
                : 'Complete manual for vector techniques, automated preflight, and Adobe Stock export optimization.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative w-52 sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isId ? 'Cari topik panduan...' : 'Search manual topics...'}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {!isEmbeddedView && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title={isId ? 'Tutup (Esc)' : 'Close (Esc)'}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Body: Sidebar nav + Content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation */}
        <div className="w-60 border-r border-neutral-800 bg-neutral-950/40 p-3 space-y-1 flex-shrink-0 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {isId ? 'Daftar Topik' : 'Table of Contents'}
          </div>

          {navSections.map(sec => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => {
                  setActiveSection(sec.id);
                  setSearchQuery('');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-neutral-400'}`} />
                  <span>{sec.label}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-neutral-800/80 text-neutral-400'
                }`}>
                  {sec.badge}
                </span>
              </button>
            );
          })}

          <div className="pt-4 px-2">
            <div className="p-3 rounded-lg bg-neutral-900/80 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-neutral-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{isId ? 'Privasi 100% Aman' : '100% Private'}</span>
              </div>
              <p className="text-[10px] leading-relaxed text-neutral-400">
                {isId
                  ? 'Semua manipulasi vektor dan hashing SHA-256 dilakukan langsung di browser Anda tanpa koneksi server.'
                  : 'All vector operations and SHA-256 hash proofs run locally in your browser with zero cloud storage.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Content View */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* SECTION 1: WORKFLOW */}
          {activeSection === 'workflow' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-amber-400" />
                  <span>{isId ? 'Alur Kerja Produksi 5 Tahap Standar Adobe Stock' : '5-Stage Adobe Stock Production Workflow'}</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  {isId 
                    ? 'Ikuti alur kerja ini untuk menjamin lembar ikon Anda lolos kurasi moderasi pada percobaan pertama.' 
                    : 'Follow this proven pipeline to guarantee your vector sheets pass contributor moderation on the first review.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Step 1 */}
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {isId ? 'TAHAP 1' : 'STAGE 1'}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">4000 × 4000 px</span>
                  </div>
                  <h4 className="font-semibold text-neutral-100 text-sm mb-1.5">
                    {isId ? 'Persiapan Lembar & Template' : 'Artboard & Template Setup'}
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId 
                      ? 'Pilih template standar kisi 4×4 (16 ikon) atau buat proyek kosong. Kanvas berukuran 4000 × 4000 px dengan area aman 32px untuk mencegah pemotongan batas.'
                      : 'Choose a 4×4 grid preset (16 icons) or initialize a custom canvas. Canvas is standardized at 4000 × 4000 px with a 32px safe-margin.'}
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {isId ? 'TAHAP 2' : 'STAGE 2'}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">Batch / Drag & Drop</span>
                  </div>
                  <h4 className="font-semibold text-neutral-100 text-sm mb-1.5">
                    {isId ? 'Impor Ikon Vektor (.SVG)' : 'Import Vector Icons (.SVG)'}
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Tarik file SVG satuan langsung ke slot yang dituju, atau gunakan tombol "Impor Banyak SVG" untuk mengunggah hingga 16 file berurutan secara otomatis.'
                      : 'Drag single SVG files onto individual slots, or use "Batch Import SVGs" to automatically load up to 16 files mapped by filename sequence.'}
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {isId ? 'TAHAP 3' : 'STAGE 3'}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">Visual Mass & Palette</span>
                  </div>
                  <h4 className="font-semibold text-neutral-100 text-sm mb-1.5">
                    {isId ? 'Normalisasi & Audit Geometri' : 'Normalization & Geometry Audit'}
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Tekan tombol "Normalisasi Otomatis" untuk meratakan bobot visual seluruh ikon. Periksa keseragaman warna di tab Palet dan ketebalan garis di tab Goresan.'
                      : 'Click "Auto-Normalize" to align visual weights across all 16 slots. Audit hex colors in the Palette tab and line weights in the Strokes tab.'}
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {isId ? 'TAHAP 4' : 'STAGE 4'}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">Adobe Stock Preflight</span>
                  </div>
                  <h4 className="font-semibold text-neutral-100 text-sm mb-1.5">
                    {isId ? 'Pemeriksaan Preflight & Metadata' : 'Preflight & Metadata Studio'}
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Klik lencana PREFLIGHT. Pastikan tidak ada kegagalan teknis (misal teks aktif). Kemudian buka Metadata Studio untuk mengisi judul dan 50 kata kunci SEO.'
                      : 'Click the PREFLIGHT badge. Resolve any fatal issues like un-outlined live text. Then open Metadata Studio to arrange 50 search-ranked keywords.'}
                  </p>
                </div>

                {/* Step 5 */}
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-amber-500/30 md:col-span-2 bg-gradient-to-r from-amber-500/5 to-transparent">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {isId ? 'TAHAP 5' : 'STAGE 5'}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">Standalone SVG + QC Hash</span>
                  </div>
                  <h4 className="font-semibold text-neutral-100 text-sm mb-1.5">
                    {isId ? 'Ekspor Standalone SVG & Paket QC (.ZIP)' : 'Export Standalone Stock SVG & QC Package (.ZIP)'}
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Tekan tombol oranye "EKSPOR SVG STOCK" (Ctrl+E). Anda mendapatkan file SVG bersih dengan 16 grup terisolasi, sertifikat integritas SHA-256, dan laporan kepatuhan teknis.'
                      : 'Click "EXPORT STOCK SVG" (Ctrl+E). Download a standalone SVG with 16 semantic groups, SHA-256 integrity hash verification, and QC audit report.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: ADOBE STOCK RULES */}
          {activeSection === 'adobe-rules' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>{isId ? 'Aturan Teknis & Kriteria Penolakan Adobe Stock' : 'Adobe Stock Technical Acceptance Criteria'}</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  {isId 
                    ? 'Alasan paling umum penolakan vektor oleh moderator dan bagaimana sistem kami memfilternya secara otomatis.' 
                    : 'Top rejection reasons by Adobe Stock curators and how our built-in preflight system eliminates them.'}
                </p>
              </div>

              <div className="space-y-3">
                {/* Rule 1: No Live Text */}
                <div className="p-4 rounded-xl bg-neutral-950/70 border border-rose-500/30 flex items-start gap-3.5">
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-rose-200 text-sm">
                        {isId ? '1. Dilarang Teks Aktif (No Live Text)' : '1. No Live Font Text Elements'}
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                        FATAL REJECTION
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {isId
                        ? 'Adobe Stock menolak file jika terdapat tag <text> atau <tspan> karena font pengguna lain mungkin tidak terpasang. Semua huruf harus diubah menjadi garis luar (outlined paths).'
                        : 'Vectors with raw <text> or <tspan> elements are rejected because end-users do not have your local fonts installed. All typography must be outlined.'}
                    </p>
                    <div className="text-[11px] text-amber-300/90 font-mono mt-1">
                      💡 {isId ? 'Solusi ASVF: Preflight Modal memiliki tombol "Konversi/Hapus Teks Aktif" 1-klik.' : 'ASVF Solution: Preflight modal includes a 1-click automatic text stripper & outline cleaner.'}
                    </div>
                  </div>
                </div>

                {/* Rule 2: 100% Vector Purity */}
                <div className="p-4 rounded-xl bg-neutral-950/70 border border-rose-500/30 flex items-start gap-3.5">
                  <FileCode className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-rose-200 text-sm">
                        {isId ? '2. Kemurnian Vektor 100% (Tanpa Raster/Bitmap)' : '2. 100% Pure Vector (No Embedded Raster/Bitmaps)'}
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                        FATAL REJECTION
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {isId
                        ? 'Tidak boleh ada tag <image> atau gambar PNG/JPEG berkode Base64 yang tertanam di dalam SVG. Semuanya harus berupa jalur matematis asli (path, rect, circle, polygon).'
                        : 'No embedded <image> or base64 raster PNG/JPG streams are allowed. Stock vectors must be infinitely scalable mathematical paths.'}
                    </p>
                  </div>
                </div>

                {/* Rule 3: Canvas Sizing */}
                <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-start gap-3.5">
                  <Maximize className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-neutral-100 text-sm">
                        {isId ? '3. Standar Dimensi Artboard 4000 × 4000 px' : '3. Standard 4000 × 4000 px Artboard Size'}
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        COMMERCIAL STANDARD
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {isId
                        ? 'Adobe Stock mengharuskan resolusi tinggi minimal 4 megapiksel (ASVF menggunakan 16 MP: 4000×4000 px) agar saat pratinjau thumbnail diperbesar oleh pembeli, hasilnya tetap sangat tajam.'
                        : 'Adobe Stock requires generous artboard dimensions for high-fidelity raster preview generation (ASVF outputs at 4000×4000 px / 16 Megapixels).'}
                    </p>
                  </div>
                </div>

                {/* Rule 4: Generative AI Disclosure */}
                <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-start gap-3.5">
                  <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-neutral-100 text-sm">
                        {isId ? '4. Keterbukaan Konten AI Generatif (AI Disclosure)' : '4. Generative AI Disclosure Compliance'}
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        POLICY REQUIREMENT
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {isId
                        ? 'Jika vektor dibuat atau dibantu model Generative AI, Adobe mewajibkan centang pengungkapan AI saat mengunggah. ASVF menyematkan deklarasi ini pada status proyek dan file laporan QC.'
                        : 'If vector assets are created with Generative AI tools, contributors must declare it upon submission. ASVF tags AI status in project metadata and QC reports.'}
                    </p>
                  </div>
                </div>

                {/* Rule 5: No Malicious Scripts */}
                <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-start gap-3.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-neutral-100 text-sm">
                        {isId ? '5. Keamanan Vektor (Tanpa Skrip Asing)' : '5. Security Sanitization (No Scripting or Foreign Objects)'}
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        AUTO-SANITIZED
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {isId
                        ? 'Tag seperti <script>, <foreignObject>, atau atribut on* akan langsung memicu penolakan keamanan. Sistem sanitasi ASVF secara otomatis menghapus tag ini saat pengunggahan.'
                        : 'Tags such as <script>, <foreignObject>, or on* event listeners trigger security blocks. ASVF parser strips them out instantly upon SVG upload.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: FEATURES & TOOLS */}
          {activeSection === 'features' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <span>{isId ? 'Fitur Inspektur & Alat Cerdas ASVF' : 'Inspector Features & Smart Production Tools'}</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  {isId 
                    ? 'Manfaatkan alat otomasi cerdas untuk menghemat waktu penataan vektor manual.' 
                    : 'Leverage automated toolsets to streamline vector inspection and eliminate repetitive manual edits.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Auto Normalize */}
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Wand2 className="w-4 h-4" />
                    <h4 className="font-bold text-sm text-neutral-100">{isId ? 'Normalisasi Otomatis (Auto-Normalize)' : 'Auto-Normalize Engine'}</h4>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Menghitung batas luar (bounding box) dan massa optik dari 16 slot sekaligus. Ikon yang terlalu kecil atau besar akan diskalakan secara harmonis tanpa mendistorsi aspek rasio.'
                      : 'Analyzes geometric bounding boxes across all 16 slots. Automatically balances visual optical mass without warping aspect ratios.'}
                  </p>
                </div>

                {/* Batch Import */}
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Upload className="w-4 h-4" />
                    <h4 className="font-bold text-sm text-neutral-100">{isId ? 'Impor Banyak SVG (Batch Import)' : 'Smart Batch Import'}</h4>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Pilih hingga 16 file SVG sekaligus dari komputer. Sistem membaca angka di nama file (misal icon_01.svg, icon_02.svg) dan menempatkannya di slot yang sesuai secara instan.'
                      : 'Select up to 16 SVG files at once. The engine parses sequential numbers in filenames (e.g. 01, 02) and maps them directly into matching slots.'}
                  </p>
                </div>

                {/* Palette Manager */}
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Palette className="w-4 h-4" />
                    <h4 className="font-bold text-sm text-neutral-100">{isId ? 'Audit Palet & Penggabungan Warna' : 'Palette Manager & Color Merge'}</h4>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Tab Palet di panel kanan menampilkan semua warna hex yang digunakan. Anda dapat menggabungkan warna yang hampir identik (color merge) untuk menjaga konsistensi warna set.'
                      : 'The Palette tab lists all unique hex values across the sheet. You can merge near-duplicate colors to enforce strict design system consistency.'}
                  </p>
                </div>

                {/* Stroke Audit */}
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-purple-400">
                    <PenTool className="w-4 h-4" />
                    <h4 className="font-bold text-sm text-neutral-100">{isId ? 'Audit Ketebalan Goresan (Strokes)' : 'Stroke Width Consistency Audit'}</h4>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Mendeteksi variasi ketebalan garis (stroke-width) di seluruh ikon agar lembar set ikon memiliki bobot garis yang seragam dan profesional.'
                      : 'Audits stroke-width values across paths to ensure uniform line weight throughout the entire 16-icon collection.'}
                  </p>
                </div>

                {/* Similarity Guard */}
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400">
                    <ShieldCheck className="w-4 h-4" />
                    <h4 className="font-bold text-sm text-neutral-100">{isId ? 'Pelindung Kemiripan (Similarity Guard)' : 'Catalog Similarity Guard'}</h4>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Mencegah penolakan dengan alasan "Similar/Duplicate Content" dengan membandingkan struktur vektor Anda terhadap proyek lain dalam antrean sebelum diekspor.'
                      : 'Protects your contributor account from "Similar or Spamming Content" rejections by evaluating geometric similarity against other sheets.'}
                  </p>
                </div>

                {/* Multi-Resolution Thumbnails */}
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Maximize className="w-4 h-4" />
                    <h4 className="font-bold text-sm text-neutral-100">{isId ? 'Pratinjau Multi-Resolusi' : 'Multi-Resolution Thumbnails'}</h4>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Simulasi tampilan ikon pada ukuran 512px, 256px, 128px, hingga 64px untuk memastikan ikon tetap mudah dikenali saat calon pembeli mencarinya di Adobe Stock.'
                      : 'Simulates how your icons render at 512px, 256px, 128px, and 64px to guarantee high legibility on Adobe Stock search result pages.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: METADATA & SEO */}
          {activeSection === 'metadata' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-blue-400" />
                  <span>{isId ? 'Panduan Metadata Studio & Strategi SEO' : 'Metadata Studio & Adobe Stock SEO Strategy'}</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  {isId 
                    ? 'Karya seni yang bagus memerlukan metadata yang tepat agar muncul di halaman pertama pencarian pembeli.' 
                    : 'Exceptional vectors require high-precision indexing signals to rank on the first page of customer search results.'}
                </p>
              </div>

              <div className="space-y-4">
                {/* Title Strategy */}
                <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
                  <h4 className="font-bold text-neutral-100 text-sm">
                    {isId ? '1. Formula Judul Komersial yang Menjual' : '1. Commercial Title Best Practices'}
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Gunakan 5 hingga 15 kata yang menjelaskan tema, subjek, gaya visual, dan format teknis aset. Hindari judul abstrak atau spam kata kunci berulang.'
                      : 'Construct titles with 5 to 15 descriptive words outlining subject, theme, visual style, and file format. Avoid keyword spamming.'}
                  </p>
                  <div className="p-3 rounded bg-neutral-900 border border-neutral-800 text-xs font-mono">
                    <span className="text-emerald-400 font-bold">{isId ? 'Contoh Efektif: ' : 'Effective Example: '}</span>
                    <span className="text-neutral-300">"Business and Financial Management Line Icons Set for Modern Mobile UI Design"</span>
                  </div>
                </div>

                {/* Keyword Ranking Strategy */}
                <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
                  <h4 className="font-bold text-neutral-100 text-sm">
                    {isId ? '2. Kekuatan 10 Kata Kunci Pertama' : '2. The Priority of the Top 10 Keywords'}
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Algoritma mesin pencari Adobe Stock memberi bobot peringkat tertinggi pada 10 kata kunci pertama. Letakkan kata kunci paling spesifik dan penting di urutan 1 sampai 10!'
                      : 'Adobe Stock indexing algorithms grant the strongest search relevancy weight to your first 10 keywords. Always put your most specific terms at the top!'}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['business icons', 'financial', 'management', 'vector set', 'line icons', 'web symbols', 'minimalist', 'accounting', 'analytics', 'commerce'].map((kw, i) => (
                      <span key={kw} className="text-[11px] px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 font-mono">
                        #{i+1} {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 50 Keywords Cap */}
                <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
                  <h4 className="font-bold text-neutral-100 text-sm">
                    {isId ? '3. Memaksimalkan Batas 50 Kata Kunci' : '3. Maximizing the 50-Keyword Ceiling'}
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Adobe Stock mengizinkan maksimal 50 kata kunci. Jangan gunakan kata-kata yang tidak relevan (seperti nama merek terdaftar) karena dapat memicu penolakan penipuan metadata (irrelevant keywords).'
                      : 'Adobe Stock supports up to 50 keywords. Never inject trademarked brand names or unrelated filler words to prevent rejection.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: SHORTCUTS */}
          {activeSection === 'shortcuts' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-amber-400" />
                  <span>{isId ? 'Tabel Pintasan Keyboard (Pintasan Cepat)' : 'Interactive Keyboard Shortcuts'}</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  {isId 
                    ? 'Percepat alur kerja produksi Anda dengan menggunakan pintasan papan tombol.' 
                    : 'Boost your daily production velocity with global keyboard shortcuts.'}
                </p>
              </div>

              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 border-b border-neutral-800 text-[11px] uppercase font-bold text-neutral-400">
                    <tr>
                      <th className="py-3 px-4">{isId ? 'Kombinasi Tombol' : 'Key Combination'}</th>
                      <th className="py-3 px-4">{isId ? 'Aksi / Fungsi' : 'Action / Function'}</th>
                      <th className="py-3 px-4">{isId ? 'Konteks Kerja' : 'Context'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                    <tr>
                      <td className="py-2.5 px-4 font-mono font-bold text-amber-400">Ctrl + E / Cmd + E</td>
                      <td className="py-2.5 px-4 font-medium">{isId ? 'Buka Dialog Ekspor Stock SVG & Paket' : 'Open Export Stock SVG & Package Dialog'}</td>
                      <td className="py-2.5 px-4 text-neutral-400">{isId ? 'Global di mana saja' : 'Global anywhere'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-mono font-bold text-amber-400">Ctrl + Z / Cmd + Z</td>
                      <td className="py-2.5 px-4 font-medium">{isId ? 'Batalkan Tindakan (Undo)' : 'Undo last action'}</td>
                      <td className="py-2.5 px-4 text-neutral-400">{isId ? 'Kanvas & Proyek' : 'Canvas & Project'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-mono font-bold text-amber-400">Ctrl + Shift + Z</td>
                      <td className="py-2.5 px-4 font-medium">{isId ? 'Ulangi Tindakan (Redo)' : 'Redo last undone action'}</td>
                      <td className="py-2.5 px-4 text-neutral-400">{isId ? 'Kanvas & Proyek' : 'Canvas & Project'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-mono font-bold text-cyan-400">O</td>
                      <td className="py-2.5 px-4 font-medium">{isId ? 'Beralih ke Mode Garis Luar (Outline Wireframe)' : 'Toggle Outline Wireframe Mode'}</td>
                      <td className="py-2.5 px-4 text-neutral-400">{isId ? 'Deteksi jalur terbuka' : 'Detect open paths'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-mono font-bold text-cyan-400">G</td>
                      <td className="py-2.5 px-4 font-medium">{isId ? 'Tampilkan / Sembunyikan Garis Kisi (Grid)' : 'Toggle Canvas Grid Lines'}</td>
                      <td className="py-2.5 px-4 text-neutral-400">{isId ? 'Perataan kanvas' : 'Canvas alignment'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-mono font-bold text-purple-400">? atau F1</td>
                      <td className="py-2.5 px-4 font-medium">{isId ? 'Buka Panduan Manual & Bantuan' : 'Open User Manual & Help Guide'}</td>
                      <td className="py-2.5 px-4 text-neutral-400">{isId ? 'Global' : 'Global'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-mono font-bold text-neutral-400">Esc</td>
                      <td className="py-2.5 px-4 font-medium">{isId ? 'Tutup Jendela Modal yang Aktif' : 'Close active modal dialog'}</td>
                      <td className="py-2.5 px-4 text-neutral-400">{isId ? 'Semua Modal' : 'All Modals'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 6: FAQ */}
          {activeSection === 'faq' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-amber-400" />
                  <span>{isId ? 'Tanya Jawab & Pemecahan Masalah (FAQ)' : 'Frequently Asked Questions & Troubleshooting'}</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  {isId 
                    ? 'Pertanyaan yang paling sering dialami oleh kontributor saat menggunakan ASVF.' 
                    : 'Common questions and troubleshooting advice for vector stock contributors.'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1.5">
                  <h4 className="font-bold text-neutral-100 text-sm">
                    Q: {isId ? 'Apakah file SVG hasil ekspor benar-benar 100% kompatibel dengan Adobe Stock?' : 'Are exported SVG files 100% compatible with Adobe Stock contributor requirements?'}
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Ya. ASVF menghasilkan file SVG standar W3C murni dengan dimensi 4000 × 4000 px, 16 grup terisolasi semantik (slot-01 s/d slot-16), tanpa tag teks aktif, dan bebas skrip asing sehingga siap diunggah langsung.'
                      : 'Yes. ASVF outputs pure W3C compliant SVGs sized at 4000 × 4000 px with 16 semantic groups, zero un-outlined text, and no foreign scripts.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1.5">
                  <h4 className="font-bold text-neutral-100 text-sm">
                    Q: {isId ? 'Bagaimana cara mengatasi peringatan "Teks Aktif Terdeteksi"?' : 'How do I fix the "Live Font Text Detected" warning?'}
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Buka modal PREFLIGHT, lalu klik tombol "Konversi/Hapus Teks Aktif" di sebelah item peringatan teks. Sistem akan membersihkan tag teks aktif sehingga preflight menjadi PASS.'
                      : 'Open the PREFLIGHT modal and click the "Strip / Convert Live Text" quick-action button next to the violation item.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1.5">
                  <h4 className="font-bold text-neutral-100 text-sm">
                    Q: {isId ? 'Apakah data karya saya disimpan di cloud atau server lain?' : 'Is my artwork saved or stored on an external cloud server?'}
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Tidak. Semua proses parsing SVG, normalisasi, audit preflight, dan kalkulasi hash kriptografi berjalan 100% di browser lokal Anda. Proyek disimpan secara privat di IndexedDB browser Anda.'
                      : 'No. All parsing, normalization, audit runs, and cryptographic hashing execute 100% on the client side. Your work is stored locally in IndexedDB.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1.5">
                  <h4 className="font-bold text-neutral-100 text-sm">
                    Q: {isId ? 'Bagaimana cara membuat cadangan data proyek saya?' : 'How can I backup all my projects and rejection histories?'}
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {isId
                      ? 'Buka tab "Cadangan & Penyimpanan" pada sidebar kiri. Anda dapat mengunduh seluruh database proyek dalam bentuk file cadangan JSON yang bisa dipulihkan kapan saja.'
                      : 'Navigate to the "Backup & Storage" tab on the left sidebar. You can export a unified JSON snapshot of all your projects and restore it anytime.'}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  if (isEmbeddedView) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        id="help-guide-modal-container"
        className="w-full max-w-5xl h-[88vh] rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden flex flex-col"
      >
        {content}
      </div>
    </div>
  );
};
