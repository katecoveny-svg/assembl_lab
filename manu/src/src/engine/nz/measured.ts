// Published measurements for the birds on the Manu pages: the numbers the body shells are
// built from (see ./shell.ts and docs/manu/proportions.md, which gives every figure's source).
//
// Adult males where the sexes differ (the pages show males). Millimetres and grams.
// Wing = flattened chord, wrist to tip of the longest primary. Tail = base of the central
// rectrices to tip. billF = exposed culmen, feathers to tip. billS = bill from the skull.
// thl = total head length, back of skull to bill tip. tarsus = tarsometatarsus.
// length = total length, bill tip to tail tip (NZ Birds Online, rounded).
//
// Sources: HANZAB (Higgins et al., Handbook of Australian, New Zealand and Antarctic Birds,
// vols 5-7), species accounts as reproduced on NZ Birds Online; lengths and weights from the
// NZ Birds Online species pages. Where HANZAB gives no figure for the form shown, `est`
// says what stands in for it.

export interface Measures {
  length: number;
  mass: number;
  wing: number;
  tail: number;
  billF: number;
  billS: number;
  thl: number;
  tarsus: number;
  /** figures that are stand-ins, not measured for this form */
  est?: string;
}

export const MEASURED: Record<string, Measures> = {
  // HANZAB 7: NZ skins, adult males (wing 154.5, tail 119.9, bill S 33.5, tarsus 38.3);
  // bill F from Onley 1986 skins (24.5); THL live, Tiritiri Matangi (63.3).
  tui: { length: 300, mass: 125, wing: 154.5, tail: 119.9, billF: 24.5, billS: 33.5, thl: 63.3, tarsus: 38.3 },
  // HANZAB 5: nominate melanura NI/SI skins, adult males (wing 90.5, tail 86.2, bill S 20.8,
  // tarsus 26.4); bill F 14.2, THL 41.1 (Tiritiri Matangi, live).
  korimako: { length: 200, mass: 34, wing: 90.5, tail: 86.2, billF: 14.2, billS: 20.8, thl: 41.1, tarsus: 26.4 },
  // HANZAB 7: nominate fuliginosa, South Island skins, adult males (wing 74.9, tail 95.5,
  // bill S 11.4, tarsus 19.2). bill F 7.6 (NI live, Orongorongo). THL is the Tasmanian figure.
  piwakawaka: { length: 160, mass: 8, wing: 74.9, tail: 95.5, billF: 7.6, billS: 11.4, thl: 24.5, tarsus: 19.2, est: 'THL from Tasmanian birds (no NZ figure); bill F from NI live birds' },
  // HANZAB 7: nominate lateralis, NZ skins (mostly NI), adult males (wing 61.4, tail 46.2,
  // bill S 13.0, tarsus 17.5); bill F 9.9 and THL 28.0 from live NZ birds (unsexed).
  tauhou: { length: 120, mass: 13, wing: 61.4, tail: 46.2, billF: 9.9, billS: 13.0, thl: 28.0, tarsus: 17.5 },
  // HANZAB 6: nominate macrocephala, South Island skins, adult males (wing 73.1, tail 52.3,
  // bill S 13.7, bill F 10.2, THL 31.4, tarsus 22.5).
  miromiro: { length: 130, mass: 11, wing: 73.1, tail: 52.3, billF: 10.2, billS: 13.7, thl: 31.4, tarsus: 22.5 },
  // HANZAB 6: subspecies longipes, NI skins, adult males (wing 93.3, tail 66.2, bill S 19.8,
  // tarsus 35.4); THL 41.9 (Pureora, live). bill F is the South Island robin's (13.8).
  toutouwai: { length: 180, mass: 35, wing: 93.3, tail: 66.2, billF: 13.8, billS: 19.8, thl: 41.9, tarsus: 35.4, est: 'bill F from South Island robin (no longipes figure)' },
  // HANZAB 5: NZ skins, adult males (wing 103.0, tail 73.9, bill S 21.5, tarsus 28.2);
  // THL 43.6 (Little Barrier, live). bill F not given: taken as bill S x 0.69 (bellbird's ratio).
  hihi: { length: 180, mass: 36.5, wing: 103.0, tail: 73.9, billF: 14.8, billS: 21.5, thl: 43.6, tarsus: 28.2, est: 'bill F = bill S x 0.69 (no figure)' },
  // HANZAB 4: nominate novaeseelandiae skins, adult males (wing 262.8, tail 193.6, bill 17.0,
  // tarsus 34.8). THL not given: taken from photographs (head about 2.6 bill lengths long).
  kereru: { length: 500, mass: 630, wing: 262.8, tail: 193.6, billF: 17.0, billS: 20.5, thl: 62, tarsus: 34.8, est: 'bill S and THL scaled from photographs (no figure)' },
};
