// A small MP4 writer for one H.264 video track, so a film made frame by frame in the browser (WebCodecs VideoEncoder,
// format 'avc') leaves as an .mp4 any phone or editor plays. No library: the boxes are written here (ISO/IEC 14496-12/15).
// Pure: no page, no three.js; tested in tests/architecture/flight-path.test.mjs.

export interface Sample { data: Uint8Array; key: boolean; /** duration in timescale units */ dur: number }

const enc = new TextEncoder();
function box(type: string, ...parts: (Uint8Array | number[])[]): Uint8Array {
  const body = parts.map((p) => (p instanceof Uint8Array ? p : new Uint8Array(p)));
  const size = 8 + body.reduce((s, p) => s + p.length, 0), out = new Uint8Array(size), dv = new DataView(out.buffer);
  dv.setUint32(0, size); out.set(enc.encode(type), 4);
  let o = 8; for (const p of body) { out.set(p, o); o += p.length; }
  return out;
}
const u32 = (v: number) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
const u16 = (v: number) => [(v >>> 8) & 255, v & 255];
const full = (type: string, version: number, flags: number, ...parts: (Uint8Array | number[])[]) => box(type, [version, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255], ...parts);
const MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].flatMap(u32);

/**
 * The MP4 file. avcC: the decoder configuration VideoEncoder gives (metadata.decoderConfig.description). Samples in decode
 * order, each its length-prefixed NAL units. timescale: units a second (e.g. 30000 at 30 fps with dur 1000 a frame).
 */
export function muxMp4(o: { width: number; height: number; timescale: number; avcC: Uint8Array; samples: Sample[] }): Uint8Array {
  const { width: W, height: H, timescale: TS, samples } = o;
  if (!samples.length) throw new Error('no frames to write');
  const total = samples.reduce((s, x) => s + x.dur, 0);
  const ftyp = box('ftyp', enc.encode('isom'), u32(512), enc.encode('isomiso2avc1mp41'));
  const mdatSize = 8 + samples.reduce((s, x) => s + x.data.length, 0);
  // the sample tables
  const stts: number[] = []; { let run = 0, d = samples[0].dur, entries = 0; const out: number[] = []; for (const s of samples) { if (s.dur === d) run++; else { out.push(...u32(run), ...u32(d)); entries++; run = 1; d = s.dur; } } out.push(...u32(run), ...u32(d)); entries++; stts.push(...u32(entries), ...out); }
  const keys = samples.map((s, i) => (s.key ? i + 1 : 0)).filter(Boolean);
  const stss = [...u32(keys.length), ...keys.flatMap(u32)];
  const stsz = [...u32(0), ...u32(samples.length), ...samples.flatMap((s) => u32(s.data.length))];
  const stsc = [...u32(1), ...u32(1), ...u32(samples.length), ...u32(1)];
  const avc1 = box('avc1', [0, 0, 0, 0, 0, 0, 0, 1], new Array(16).fill(0), u16(W), u16(H), u32(0x00480000), u32(0x00480000), u32(0), u16(1), new Array(32).fill(0), u16(0x18), u16(0xffff), box('avcC', o.avcC));
  const build = (chunkOffset: number) => {
    const stbl = box('stbl', full('stsd', 0, 0, u32(1), avc1), full('stts', 0, 0, stts), full('stss', 0, 0, stss), full('stsc', 0, 0, stsc), full('stsz', 0, 0, stsz), full('stco', 0, 0, u32(1), u32(chunkOffset)));
    const minf = box('minf', full('vmhd', 0, 1, [0, 0, 0, 0, 0, 0, 0, 0]), box('dinf', full('dref', 0, 0, u32(1), full('url ', 0, 1))), stbl);
    const mdia = box('mdia', full('mdhd', 0, 0, u32(0), u32(0), u32(TS), u32(total), u16(0x55c4), u16(0)), full('hdlr', 0, 0, u32(0), enc.encode('vide'), new Array(12).fill(0), enc.encode('VideoHandler\0')), minf);
    const tkhd = full('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(total), new Array(8).fill(0), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(W << 16), u32(H << 16));
    const mvhd = full('mvhd', 0, 0, u32(0), u32(0), u32(TS), u32(total), u32(0x00010000), u16(0x0100), new Array(10).fill(0), MATRIX, new Array(24).fill(0), u32(2));
    return box('moov', mvhd, box('trak', tkhd, mdia));
  };
  // the moov goes before the mdat (plays while it downloads): its size does not depend on the offset's value
  const moovLen = build(0).length, moov = build(ftyp.length + moovLen + 8);
  const out = new Uint8Array(ftyp.length + moov.length + mdatSize);
  out.set(ftyp, 0); out.set(moov, ftyp.length);
  let p = ftyp.length + moov.length; new DataView(out.buffer).setUint32(p, mdatSize); out.set(enc.encode('mdat'), p + 4); p += 8;
  for (const s of samples) { out.set(s.data, p); p += s.data.length; }
  return out;
}

/** the boxes of an MP4 at its top level, or inside a box's body: [type, offset, size] (for checks) */
export function boxes(b: Uint8Array, from = 0, to = b.length): [string, number, number][] {
  const out: [string, number, number][] = [], dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let o = from;
  while (o + 8 <= to) { const size = dv.getUint32(o); if (size < 8) break; out.push([new TextDecoder().decode(b.subarray(o + 4, o + 8)), o, size]); o += size; }
  return out;
}
