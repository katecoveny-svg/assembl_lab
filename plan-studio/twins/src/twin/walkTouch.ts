// A thumb joystick for walk mode on phones and tablets: the left thumb walks, a drag anywhere else looks round.
// Shown only while walking on a touch screen. Writes the stick's position (−1 to 1 each way) into `stick`.

export interface Stick { x: number; y: number; on: boolean }

export function walkJoystick(stage: HTMLElement, stick: Stick) {
  const pad = document.createElement('div'), knob = document.createElement('div');
  pad.className = 'walk-stick';
  pad.setAttribute('aria-label', 'Walk: drag the knob to move');
  pad.style.cssText = 'position:absolute;left:18px;bottom:calc(96px + env(safe-area-inset-bottom));width:116px;height:116px;border-radius:50%;background:rgba(36,11,33,.28);border:1.5px solid rgba(245,241,242,.7);z-index:7;touch-action:none;backdrop-filter:blur(4px)';
  knob.style.cssText = 'position:absolute;left:38px;top:38px;width:40px;height:40px;border-radius:50%;background:rgba(245,241,242,.92);box-shadow:0 2px 10px rgba(0,0,0,.25);pointer-events:none';
  pad.append(knob);
  let id: number | null = null;
  const set = (e: PointerEvent) => {
    const r = pad.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2 - 20;
    let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    stick.x = dx / R; stick.y = -dy / R; stick.on = true;
  };
  const end = () => { id = null; stick.x = stick.y = 0; stick.on = false; knob.style.transform = ''; };
  pad.addEventListener('pointerdown', (e) => { id = e.pointerId; pad.setPointerCapture(e.pointerId); set(e); e.stopPropagation(); e.preventDefault(); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === id) { set(e); e.preventDefault(); } });
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  stage.append(pad);
  return { remove: () => { end(); pad.remove(); } };
}

/** a touch screen, where the joystick is offered */
export const touchScreen = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
