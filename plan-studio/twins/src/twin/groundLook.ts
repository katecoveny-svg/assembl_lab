// The look and the words of the Real ground card that need no browser: the colour of ground drawn from survey heights, and
// what the card says while LINZ's files arrive. No imports, so the tests load this file directly (Node strips the types).

/** the colour of one spot of ground drawn from the survey: muted green where it is gentle, earth brown where it is steep
 *  (slope as rise over run), a touch lighter higher up, darker on each metre line and darker still each 5 m. sRGB 0-255. */
export const GENTLE = [98, 116, 78], STEEP = [114, 108, 82];
export function groundTint(slope: number, rel: number, line: 0 | 1 | 5): [number, number, number] {
  const t = Math.min(1, Math.max(0, (slope - 0.18) / (0.8 - 0.18))), s = t * t * (3 - 2 * t);   // about 10° to 39°
  const k = (0.95 + 0.1 * Math.min(1, Math.max(0, rel))) * (line === 5 ? 0.6 : line === 1 ? 0.8 : 1);
  return [0, 1, 2].map((i) => Math.round((GENTLE[i] + (STEEP[i] - GENTLE[i]) * s) * k)) as [number, number, number];
}
export const LIMIT_S = 60, SLOW_S = 8;
/** what the card says while the browser reads LINZ's files: answers so far, megabytes, seconds, and a plain word when it is slow */
export function progressText(phase: string, requests: number, bytes: number, seconds: number) {
  return `${phase}: ${requests} answer${requests === 1 ? '' : 's'} from LINZ, ${(bytes / 1e6).toFixed(1)} MB, ${Math.floor(seconds)} s.` +
    (seconds >= SLOW_S ? ` Slower than usual. LINZ’s files come from Sydney; this stops by itself at ${LIMIT_S} s, and nothing is drawn until every part has arrived.` : '');
}
