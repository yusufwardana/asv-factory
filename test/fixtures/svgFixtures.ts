export const FIXTURES = {
  cleanIcon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 10 H 90 V 90 H 10 Z" fill="#2E7CC1" />
  <circle cx="50" cy="50" r="20" fill="#4CA741" />
</svg>`,

  liveTextSimple: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 10 H 90 V 90 H 10 Z" fill="#2E7CC1" />
  <text x="20" y="50" font-size="12">82.4</text>
</svg>`,

  liveTextNested: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <text x="10" y="40">
    <tspan fill="#062649">Solar </tspan>
    <tspan fill="#4CA741">KWh: </tspan>
    <tspan>82.4</tspan>
  </text>
</svg>`,

  rasterBase64: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="100" height="100" fill="#f0f0f0"/>
  <image href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" width="50" height="50"/>
</svg>`,

  rasterExternal: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <image href="https://example.com/solar-panel.jpg" width="80" height="80"/>
</svg>`,

  transparencyFillOpacity: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 14L15 42v44h70V42L50 14z" fill="#062649" fill-opacity="0.08" />
  <path d="M58 26l20 16h-16l-14-11z" fill="#4CA741" fill-opacity="0.25" stroke="#4CA741" />
</svg>`,

  transparencyOpacity: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g opacity="0.6">
    <rect x="10" y="10" width="80" height="80" fill="#2E7CC1"/>
  </g>
</svg>`,

  transparencyStrokeOpacity: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="30" stroke="#FEC912" stroke-width="4" stroke-opacity="0.4" fill="none"/>
</svg>`,

  transparencyCss: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="20" width="60" height="60" style="fill: #2E7CC1; fill-opacity: 0.35; opacity: 0.8" />
</svg>`,

  mixedElements: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 10L20 20" />
  <path d="M30 30L40 40" />
  <rect x="5" y="5" width="20" height="20" />
  <circle cx="50" cy="50" r="10" />
  <polygon points="60,60 70,60 65,70" />
  <line x1="80" y1="80" x2="90" y2="90" />
</svg>`,

  unsafeScript: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <script type="text/javascript">alert('xss');</script>
  <rect x="10" y="10" width="50" height="50" fill="#000"/>
</svg>`,

  unsafeForeignObject: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <foreignObject width="100" height="100">
    <div xmlns="http://www.w3.org/1999/xhtml">HTML embedded inside SVG</div>
  </foreignObject>
</svg>`,

  unsafeEventHandler: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="50" height="50" fill="#000" onclick="alert(1)" onmouseover="evil()"/>
</svg>`
};
