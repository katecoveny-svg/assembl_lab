import type { BackdropTheme } from '../env/backdrop';
import type { FloraKind } from './flora';

// Names, real sizes and pairings for the library. Lengths are approximate adult body
// lengths, bill tip to tail tip, from standard New Zealand field-guide figures; the
// models themselves are all drawn at one on-screen size.

export interface BirdEntry {
  key: string;
  reo: string;
  english: string;
  scientific: string;
  /** approximate adult length, cm */
  lengthCm: number;
  /** what the model shows (sex / form), when the bird differs by it */
  form: string;
  /** the sprig it is shown on by default */
  flora: FloraKind;
  note: string;
}

export const BIRDS: BirdEntry[] = [
  { key: 'tui', reo: 'Tūī', english: 'Tūī', scientific: 'Prosthemadera novaeseelandiae', lengthCm: 30, form: 'Adult', flora: 'kowhai', note: 'Dark plumage with a shifting blue-green-violet sheen, a lacy neck collar, two white throat tufts (poi) and a white wing patch.' },
  { key: 'korimako', reo: 'Korimako', english: 'Bellbird', scientific: 'Anthornis melanura', lengthCm: 20, form: 'Adult male', flora: 'kowhai', note: 'Olive green with a violet gloss on the face, dark wings with a pale yellow patch at the bend, and a red eye.' },
  { key: 'piwakawaka', reo: 'Pīwakawaka', english: 'Fantail', scientific: 'Rhipidura fuliginosa', lengthCm: 16, form: 'Pied form', flora: 'manuka', note: 'White brow and throat, a black breast band, warm buff underparts and a long tail edged white that it fans constantly.' },
  { key: 'tauhou', reo: 'Tauhou', english: 'Silvereye', scientific: 'Zosterops lateralis', lengthCm: 12, form: 'Adult', flora: 'pohutukawa', note: 'Olive-green head, grey saddle, a bright white eye ring, yellowish throat and cinnamon flanks.' },
  { key: 'miromiro', reo: 'Miromiro', english: 'Tomtit', scientific: 'Petroica macrocephala macrocephala', lengthCm: 13, form: 'South Island male', flora: 'manuka', note: 'Big black head with a white spot over the bill, a white wing bar and a yellow-orange breast fading to white.' },
  { key: 'toutouwai', reo: 'Toutouwai', english: 'North Island robin', scientific: 'Petroica longipes', lengthCm: 18, form: 'Adult', flora: 'manuka', note: 'Dark slate grey with a pale patch low on the breast and a pale spot at the base of the bill; upright and long-legged.' },
  { key: 'hihi', reo: 'Hihi', english: 'Stitchbird', scientific: 'Notiomystis cincta', lengthCm: 18, form: 'Adult male', flora: 'pohutukawa', note: 'Velvet-black head with white ear tufts, a golden shoulder band, a white wing bar and an olive-brown body.' },
  { key: 'kereru', reo: 'Kererū', english: 'New Zealand pigeon', scientific: 'Hemiphaga novaeseelandiae', lengthCm: 51, form: 'Adult', flora: 'kowhai', note: 'Metallic green and bronze head and breast, a clean line to a white belly, and a red bill, eye and feet.' },
];

export interface FloraEntry {
  key: FloraKind;
  reo: string;
  english: string;
  scientific: string;
  note: string;
  theme: BackdropTheme;
}

export const FLORA: FloraEntry[] = [
  {
    key: 'kowhai',
    reo: 'Kōwhai',
    english: 'Kōwhai',
    scientific: 'Sophora spp.',
    note: 'Drooping racemes of curved golden pea-flowers on near-bare wood, with young pinnate leaves.',
    theme: { deep: [0.03, 0.07, 0.035], mid: [0.08, 0.17, 0.07], lite: [0.24, 0.32, 0.12], bokeh: [0.16, 0.12, 0.0] },
  },
  {
    key: 'pohutukawa',
    reo: 'Pōhutukawa',
    english: 'Pōhutukawa',
    scientific: 'Metrosideros excelsa',
    note: 'Crimson brush flowers of massed stamens with gold anthers, among leathery leaves felted white beneath.',
    theme: { deep: [0.025, 0.06, 0.07], mid: [0.06, 0.15, 0.17], lite: [0.3, 0.42, 0.46], bokeh: [0.08, 0.1, 0.12] },
  },
  {
    key: 'manuka',
    reo: 'Mānuka',
    english: 'Mānuka',
    scientific: 'Leptospermum scoparium',
    note: 'Wiry twigs crowded with small sharp leaves and small white five-petalled flowers with dark centres.',
    theme: { deep: [0.04, 0.05, 0.035], mid: [0.11, 0.13, 0.09], lite: [0.3, 0.32, 0.24], bokeh: [0.1, 0.1, 0.08] },
  },
];

export const birdEntry = (key: string) => BIRDS.find((b) => b.key === key) ?? BIRDS[0];
export const floraEntry = (key: string | null | undefined) => FLORA.find((f) => f.key === key) ?? null;
