// assembl AR: the brand palette, as used for objects, the stage and the QR card.
export const PAL = {
  paper: '#FFFDFB', chalk: '#F5F1F2', ink: '#492B3E', plum: '#240B21', muted: '#654A4E', rose: '#916A70',
  line: '#E6DCE0', line2: '#D9CCD2'
};

// Object colours offered in the studio. The id is what a share link carries.
export const SWATCHES = [
  { id: 'ink', name: 'Plum', hex: PAL.ink },
  { id: 'plum', name: 'Deep plum', hex: PAL.plum },
  { id: 'muted', name: 'Muted plum', hex: PAL.muted },
  { id: 'rose', name: 'Dusty rose', hex: PAL.rose },
  { id: 'chalk', name: 'Chalk', hex: PAL.chalk },
  { id: 'paper', name: 'Paper', hex: PAL.paper }
];
export const swatch = id => SWATCHES.find(s => s.id === id) || SWATCHES[0];
export const isLight = id => id === 'chalk' || id === 'paper';

// Surface finishes. Kept to what both GLB and USDZ (UsdPreviewSurface) show the same way.
export const FINISHES = [
  { id: 's', name: 'Satin', roughness: 0.48, metalness: 0, clearcoat: 0 },
  { id: 'g', name: 'Gloss', roughness: 0.18, metalness: 0, clearcoat: 0.6 },
  { id: 'm', name: 'Metal', roughness: 0.32, metalness: 1, clearcoat: 0 }
];
export const finish = id => FINISHES.find(f => f.id === id) || FINISHES[0];
