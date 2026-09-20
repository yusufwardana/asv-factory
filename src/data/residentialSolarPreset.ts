export interface PresetIconData {
  label: string;
  svg: string;
}

// 16 meticulously crafted vector icons for Residential Solar Energy
// Canvas viewBox 0 0 100 100 with unified stroke (2px) and balanced visual weights
export const RESIDENTIAL_SOLAR_PRESET: PresetIconData[] = [
  {
    label: "01 Solar Home",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M50 14L15 42v44h70V42L50 14z" fill="#062649" fill-opacity="0.08" />
  <path d="M38 86V54h24v32" />
  <path d="M28 32l-7 5.5" />
  <path d="M28 32l22-17.5 22 17.5" stroke="#4CA741" stroke-width="3" />
  <!-- Solar panel on roof -->
  <path d="M58 26l20 16h-16l-14-11z" fill="#4CA741" fill-opacity="0.25" stroke="#4CA741" />
  <line x1="68" y1="34" x2="52" y2="31" stroke="#4CA741" />
  <line x1="62" y1="29" x2="72" y2="37" stroke="#4CA741" />
</svg>`
  },
  {
    label: "02 Solar Panel",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="18,30 82,30 72,78 28,78" fill="#062649" fill-opacity="0.08" stroke="#2E7CC1" />
  <!-- Grid lines -->
  <line x1="39" y1="30" x2="42" y2="78" />
  <line x1="61" y1="30" x2="58" y2="78" />
  <line x1="23" y1="46" x2="77" y2="46" />
  <line x1="26" y1="62" x2="74" y2="62" />
  <!-- Stand -->
  <line x1="50" y1="78" x2="50" y2="88" stroke-width="3" />
  <line x1="34" y1="88" x2="66" y2="88" stroke-width="3" />
  <!-- Sun accent -->
  <circle cx="20" cy="18" r="6" fill="#FEC912" stroke="#FEC912" />
  <path d="M20 8v-2M20 30v-2M8 18h2M32 18h-2" stroke="#FEC912" />
</svg>`
  },
  {
    label: "03 Solar Generation",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="50" cy="42" r="18" stroke="#FEC912" stroke-width="3" fill="#FEC912" fill-opacity="0.15" />
  <path d="M50 16v-6M50 74v-6M24 42h-6M82 42h-6M32 24l-4-4M72 60l-4-4M32 60l-4 4M72 24l-4 4" stroke="#FEC912" stroke-width="2.5" />
  <!-- Energy lightning bolt -->
  <path d="M52 32l-10 14h8l-4 16 14-18h-8l6-12z" fill="#4CA741" stroke="#4CA741" stroke-width="2" />
  <!-- Base wave -->
  <path d="M22 82c8-5 16-5 24 0s16 5 24 0 8-3 8-3" stroke="#2E7CC1" />
</svg>`
  },
  {
    label: "04 Solar Inverter",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="24" y="20" width="52" height="64" rx="4" fill="#062649" fill-opacity="0.08" />
  <!-- Screen display -->
  <rect x="34" y="30" width="32" height="20" rx="2" fill="#2E7CC1" fill-opacity="0.15" stroke="#2E7CC1" />
  <path d="M38 40h6l3-6 4 12 3-6h6" stroke="#4CA741" stroke-width="2" />
  <!-- Status LEDs & Buttons -->
  <circle cx="36" cy="60" r="2.5" fill="#4CA741" stroke="#4CA741" />
  <circle cx="46" cy="60" r="2.5" fill="#FEC912" stroke="#FEC912" />
  <circle cx="56" cy="60" r="2.5" fill="#2E7CC1" stroke="#2E7CC1" />
  <line x1="34" y1="70" x2="66" y2="70" />
  <!-- Heat sink cooling fins -->
  <line x1="20" y1="36" x2="24" y2="36" />
  <line x1="20" y1="48" x2="24" y2="48" />
  <line x1="20" y1="60" x2="24" y2="60" />
  <line x1="76" y1="36" x2="80" y2="36" />
  <line x1="76" y1="48" x2="80" y2="48" />
  <line x1="76" y1="60" x2="80" y2="60" />
</svg>`
  },
  {
    label: "05 Home Battery",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="28" y="26" width="44" height="60" rx="5" fill="#062649" fill-opacity="0.08" />
  <!-- Battery terminal -->
  <path d="M42 26v-6h16v6" fill="#2E7CC1" fill-opacity="0.2" />
  <!-- Level bars -->
  <rect x="36" y="66" width="28" height="12" rx="2" fill="#4CA741" stroke="#4CA741" />
  <rect x="36" y="50" width="28" height="12" rx="2" fill="#4CA741" stroke="#4CA741" />
  <rect x="36" y="34" width="28" height="12" rx="2" fill="#4CA741" fill-opacity="0.3" stroke="#4CA741" />
  <!-- Energy Spark -->
  <path d="M78 46l6-10h-6l4-8-10 11h6l-4 7" stroke="#FEC912" fill="#FEC912" stroke-width="1.5" />
</svg>`
  },
  {
    label: "06 Smart Meter",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="50" cy="48" r="32" fill="#062649" fill-opacity="0.08" />
  <circle cx="50" cy="48" r="24" stroke="#2E7CC1" stroke-dasharray="3 3" />
  <!-- Digital readout -->
  <rect x="34" y="38" width="32" height="14" rx="2" fill="#2E7CC1" fill-opacity="0.2" stroke="#2E7CC1" />
  <!-- Digital readout outlines (82.4) -->
  <path d="M40 43h3v2h-3zm0 3h3v2h-3z M46 43h3v2.5h-3v2.5h3 M51 48.5h1.5v1.5h-1.5z M55 43v3h3v-3zm3 3v2.5" stroke="#4CA741" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <!-- Rotating dial pointer -->
  <line x1="50" y1="48" x2="62" y2="38" stroke="#FEC912" stroke-width="3" />
  <circle cx="50" cy="48" r="3" fill="#062649" />
  <!-- Connection plug base -->
  <path d="M42 80v6h16v-6" />
</svg>`
  },
  {
    label: "07 EV Home Charging",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- Charging Station -->
  <rect x="18" y="24" width="28" height="60" rx="4" fill="#062649" fill-opacity="0.08" />
  <rect x="24" y="32" width="16" height="14" rx="2" fill="#4CA741" fill-opacity="0.25" stroke="#4CA741" />
  <path d="M32 35l-3 5h4l-3 4" stroke="#4CA741" stroke-width="2" />
  <!-- Cable to EV -->
  <path d="M46 54c12 0 14 16 26 12l6-4" stroke="#4CA741" stroke-width="3" />
  <!-- Plug Handle -->
  <path d="M78 62l6-4v10l-6-4z" fill="#4CA741" stroke="#4CA741" />
  <!-- Car profile outline -->
  <path d="M54 44h18l8 8h12v12h-6a7 7 0 0 1-14 0h-8a7 7 0 0 1-14 0h-2" stroke="#2E7CC1" />
  <circle cx="60" cy="64" r="3" fill="#2E7CC1" />
  <circle cx="82" cy="64" r="3" fill="#2E7CC1" />
</svg>`
  },
  {
    label: "08 Grid Connected Home",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- House -->
  <path d="M36 44L18 58v26h36V58L36 44z" fill="#062649" fill-opacity="0.08" />
  <path d="M30 84V66h12v18" />
  <path d="M26 50l10-8 10 8" stroke="#4CA741" />
  <!-- Transmission Tower / Utility Pole -->
  <line x1="78" y1="20" x2="78" y2="84" stroke-width="3" />
  <line x1="64" y1="34" x2="92" y2="34" stroke-width="2" />
  <line x1="68" y1="48" x2="88" y2="48" stroke-width="2" />
  <path d="M70 34l8 14 8-14" />
  <!-- Power Line Connection -->
  <path d="M36 44c18-12 26-10 42-10" stroke="#FEC912" stroke-width="2" stroke-dasharray="3 2" />
</svg>`
  },
  {
    label: "09 Solar to Battery",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- Solar Panel on Left -->
  <polygon points="14,32 44,32 38,58 18,58" fill="#062649" fill-opacity="0.08" stroke="#2E7CC1" />
  <line x1="29" y1="32" x2="28" y2="58" />
  <line x1="16" y1="45" x2="41" y2="45" />
  <!-- Battery on Right -->
  <rect x="58" y="38" width="28" height="42" rx="3" fill="#062649" fill-opacity="0.08" />
  <path d="M68 38v-4h8v4" fill="#2E7CC1" />
  <rect x="64" y="66" width="16" height="8" rx="1" fill="#4CA741" stroke="#4CA741" />
  <rect x="64" y="54" width="16" height="8" rx="1" fill="#4CA741" stroke="#4CA741" />
  <!-- Energy Flow Arrow -->
  <path d="M32 64c0 14 16 16 22 10" stroke="#FEC912" stroke-width="3" />
  <polygon points="56,70 54,78 48,72" fill="#FEC912" stroke="#FEC912" />
  <circle cx="28" cy="20" r="4" fill="#FEC912" stroke="#FEC912" />
</svg>`
  },
  {
    label: "10 Battery to Home",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- Battery on Left -->
  <rect x="16" y="36" width="26" height="42" rx="3" fill="#062649" fill-opacity="0.08" />
  <path d="M24 36v-4h10v4" />
  <path d="M29 46l-4 7h6l-3 7" stroke="#FEC912" stroke-width="2" />
  <!-- House on Right -->
  <path d="M74 38L52 54v28h44V54L74 38z" fill="#062649" fill-opacity="0.08" />
  <path d="M68 82V66h12v16" />
  <!-- Flow Line with Arrow -->
  <path d="M42 56c12 0 10 0 16-4" stroke="#4CA741" stroke-width="3" />
  <polygon points="58,48 58,56 52,52" fill="#4CA741" stroke="#4CA741" />
</svg>`
  },
  {
    label: "11 Energy Monitoring",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- Tablet / Monitor frame -->
  <rect x="18" y="20" width="64" height="48" rx="4" fill="#062649" fill-opacity="0.08" />
  <circle cx="50" cy="62" r="2" fill="#2E7CC1" />
  <!-- Chart inside -->
  <path d="M28 50l10-14 8 8 12-16 10 10" stroke="#4CA741" stroke-width="3" />
  <circle cx="38" cy="36" r="2" fill="#4CA741" />
  <circle cx="46" cy="44" r="2" fill="#4CA741" />
  <circle cx="58" cy="28" r="2" fill="#FEC912" stroke="#FEC912" />
  <!-- Stand -->
  <path d="M42 68l-6 16h28l-6-16" />
  <line x1="30" y1="84" x2="70" y2="84" stroke-width="3" />
</svg>`
  },
  {
    label: "12 Energy Efficiency",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- Lightbulb -->
  <path d="M50 20a22 22 0 0 0-14 39c4 4 6 8 6 13h16c0-5 2-9 6-13a22 22 0 0 0-14-39z" fill="#062649" fill-opacity="0.08" />
  <line x1="44" y1="78" x2="56" y2="78" />
  <line x1="46" y1="84" x2="54" y2="84" stroke-width="3" />
  <!-- Leaf inside bulb for green efficiency -->
  <path d="M50 32c-7 8-4 18 2 20 6-2 9-12 2-20z" fill="#4CA741" stroke="#4CA741" stroke-width="2" />
  <line x1="50" y1="36" x2="52" y2="48" stroke="#2E7CC1" />
  <!-- Sparkles -->
  <path d="M22 24l4 4M78 24l-4 4M14 42h6M86 42h-6" stroke="#FEC912" />
</svg>`
  },
  {
    label: "13 Green Home",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- House base -->
  <path d="M50 22L18 48v36h64V48L50 22z" fill="#062649" fill-opacity="0.08" />
  <path d="M40 84V58h20v26" />
  <!-- Eco leaf hugging roof -->
  <path d="M50 22c12-14 32-4 32 14-8 10-22 8-32-14z" fill="#4CA741" fill-opacity="0.3" stroke="#4CA741" stroke-width="2.5" />
  <path d="M56 22c8 4 14 8 18 12" stroke="#4CA741" stroke-width="2" />
  <!-- Small sun ray -->
  <circle cx="24" cy="26" r="5" fill="#FEC912" stroke="#FEC912" />
</svg>`
  },
  {
    label: "14 Solar Installation",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- Roof section -->
  <line x1="16" y1="74" x2="84" y2="40" stroke-width="3" stroke="#062649" />
  <!-- Solar panel tilted on brackets -->
  <polygon points="34,58 72,39 66,25 28,44" fill="#062649" fill-opacity="0.08" stroke="#2E7CC1" />
  <line x1="53" y1="48" x2="47" y2="35" />
  <!-- Mounting Bracket Screws -->
  <line x1="32" y1="51" x2="36" y2="64" stroke="#4CA741" stroke-width="3" />
  <line x1="68" y1="33" x2="72" y2="46" stroke="#4CA741" stroke-width="3" />
  <!-- Tool / Screwdriver -->
  <path d="M72 16l8 8-16 16-6-6 14-18z" fill="#FEC912" stroke="#FEC912" stroke-width="2" />
  <line x1="58" y1="34" x2="52" y2="40" stroke="#062649" stroke-width="2.5" />
</svg>`
  },
  {
    label: "15 Solar Maintenance",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- Solar Panel -->
  <polygon points="18,34 76,34 68,76 26,76" fill="#062649" fill-opacity="0.08" stroke="#2E7CC1" />
  <line x1="37" y1="34" x2="40" y2="76" />
  <line x1="57" y1="34" x2="54" y2="76" />
  <line x1="22" y1="55" x2="72" y2="55" />
  <!-- Wrench tool -->
  <path d="M68 20a9 9 0 0 0-10 2l12 12a9 9 0 0 0 2-10l-4 4-4-4 4-4z" fill="#4CA741" stroke="#4CA741" stroke-width="1.5" />
  <path d="M64 28l-26 26-4-4 26-26" stroke="#4CA741" stroke-width="3" />
  <!-- Clean shine sparkle -->
  <path d="M26 24l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z" fill="#FEC912" stroke="#FEC912" />
</svg>`
  },
  {
    label: "16 Integrated Home Energy System",
    svg: `<svg viewBox="0 0 100 100" fill="none" stroke="#2E7CC1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- Central Hub Circle -->
  <circle cx="50" cy="50" r="16" fill="#062649" fill-opacity="0.1" stroke="#4CA741" stroke-width="3" />
  <path d="M52 42l-6 10h6l-4 8 10-11h-6z" fill="#FEC912" stroke="#FEC912" stroke-width="1.5" />
  <!-- Peripheral connected nodes -->
  <!-- Top Node: Sun -->
  <circle cx="50" cy="18" r="6" fill="#FEC912" stroke="#FEC912" />
  <line x1="50" y1="24" x2="50" y2="34" stroke-dasharray="2 2" />
  <!-- Right Node: Battery -->
  <rect x="76" y="44" width="12" height="14" rx="2" fill="#2E7CC1" stroke="#2E7CC1" />
  <line x1="66" y1="50" x2="76" y2="50" stroke-dasharray="2 2" />
  <!-- Bottom Node: EV Car -->
  <circle cx="50" cy="82" r="6" stroke="#2E7CC1" />
  <line x1="50" y1="66" x2="50" y2="76" stroke-dasharray="2 2" />
  <!-- Left Node: House -->
  <polygon points="18,52 24,44 30,52" stroke="#4CA741" />
  <rect x="19" y="52" width="10" height="8" stroke="#4CA741" />
  <line x1="29" y1="50" x2="34" y2="50" stroke-dasharray="2 2" />
</svg>`
  }
];
