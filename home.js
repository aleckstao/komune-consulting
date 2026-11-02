// Home page game: a "+" that drifts away from the cursor like a repelling magnet.
// It roams the whole viewport, eases back towards the middle of the right column
// when left alone, and if it gets cornered it fades out and reappears elsewhere.

(function () {
  const plus = document.querySelector('.plus');
  const content = document.querySelector('.content');
  if (!plus || !content) return;

  // Tuning
  const FIELD = 240;      // px: cursor starts pushing within this distance
  const PUSH = 4;         // strength of the push at point-blank range
  const MIN_GAP = 72;     // px: the cursor can never get closer than this (from the + centre)
  const LOOKAHEAD = 5;    // frames: it reacts to where the cursor is heading, not just where it is
  const HOME_PULL = 0.004;// gentle spring back to the starting spot
  const DAMPING = 0.88;   // 1 = no friction
  const EDGE = 16;        // px: keep this far from the window edges
  const WARP_MS = 150;    // matches --duration-fast

  const pos = { x: 0, y: 0 };
  const vel = { x: 0, y: 0 };
  const home = { x: 0, y: 0 };
  const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, sx: 0, sy: 0, active: false };

  // Where the cursor will be in a few frames, from its smoothed velocity.
  function threat() {
    return { x: pointer.x + pointer.sx * LOOKAHEAD, y: pointer.y + pointer.sy * LOOKAHEAD };
  }
  let half = { w: 0, h: 0 };
  let warping = false;
  let last = performance.now();

  function measure() {
    const r = plus.getBoundingClientRect();
    half = { w: r.width / 2, h: r.height / 2 };
    const c = content.getBoundingClientRect();
    // Desktop: the content spans grid columns 4-12, but column 4 is left empty, so the
    // focal point is the middle of columns 5-12 (where images and copy are centred).
    let left = c.left, width = c.width;
    if (window.innerWidth > 900) {
      const gutter = parseFloat(getComputedStyle(content.parentElement).columnGap) || 0;
      const column = (c.width - 8 * gutter) / 9;
      left += column + gutter;
      width -= column + gutter;
    }
    home.x = left + width / 2;
    // Desktop: middle of the window. Phone layout: middle of the space below the menu.
    home.y = c.top > 0 ? (c.top + window.innerHeight) / 2 : window.innerHeight / 2;
  }

  function render() {
    plus.style.transform = `translate3d(${pos.x - half.w}px, ${pos.y - half.h}px, 0)`;
  }

  function bounds() {
    return {
      minX: EDGE + half.w, maxX: window.innerWidth - EDGE - half.w,
      minY: EDGE + half.h, maxY: window.innerHeight - EDGE - half.h,
    };
  }

  // Fade out, jump to a spot far from the cursor, fade back in.
  function warp() {
    warping = true;
    plus.classList.add('is-warping');
    setTimeout(() => {
      const b = bounds();
      let best = { x: home.x, y: home.y, d: -1 };
      for (let i = 0; i < 24; i++) {
        const x = b.minX + Math.random() * (b.maxX - b.minX);
        const y = b.minY + Math.random() * (b.maxY - b.minY);
        const d = Math.hypot(x - pointer.x, y - pointer.y);
        if (d > best.d) best = { x, y, d };
        if (d > 320) break;
      }
      pos.x = best.x; pos.y = best.y;
      vel.x = 0; vel.y = 0;
      render();
      plus.classList.remove('is-warping');
      setTimeout(() => { warping = false; }, WARP_MS);
    }, WARP_MS);
  }

  // Hard rule: the cursor can never reach it, however fast it moves.
  function keepAway() {
    if (!pointer.active) return;
    gapFrom(threat());
    gapFrom(pointer);
  }

  function gapFrom(point) {
    const dx = pos.x - point.x;
    const dy = pos.y - point.y;
    const d = Math.hypot(dx, dy);
    if (d >= MIN_GAP) return;
    // Dead-centre hit: get shoved ahead in the direction the cursor is moving.
    const ux = d > 0.001 ? dx / d : pointer.vx || 1;
    const uy = d > 0.001 ? dy / d : pointer.vy || 0;
    const ul = Math.hypot(ux, uy) || 1;
    pos.x = point.x + (ux / ul) * MIN_GAP;
    pos.y = point.y + (uy / ul) * MIN_GAP;
  }

  function step(now) {
    const dt = Math.min((now - last) / 16.667, 3); // frames at 60fps; capped after tab switches
    last = now;

    if (!warping) {
      let fx = (home.x - pos.x) * HOME_PULL;
      let fy = (home.y - pos.y) * HOME_PULL;

      const t = threat();
      const dx = pos.x - t.x;
      const dy = pos.y - t.y;
      const dist = Math.hypot(dx, dy) || 0.001;

      if (pointer.active && dist < FIELD) {
        const strength = PUSH * Math.pow(1 - dist / FIELD, 2);
        fx += (dx / dist) * strength;
        fy += (dy / dist) * strength;
      }

      const damp = Math.pow(DAMPING, dt);
      vel.x = (vel.x + fx * dt) * damp;
      vel.y = (vel.y + fy * dt) * damp;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;

      keepAway();
      confine();
      render();
    } else {
      // Fading out to jump elsewhere: keep dodging so it can't be caught mid-fade.
      keepAway();
      render();
    }

    requestAnimationFrame(step);
  }

  // Stay on screen; if pinned against an edge with the cursor on top of it, escape.
  function confine() {
    const b = bounds();
    const clampedX = Math.min(Math.max(pos.x, b.minX), b.maxX);
    const clampedY = Math.min(Math.max(pos.y, b.minY), b.maxY);
    const pinned = clampedX !== pos.x || clampedY !== pos.y;
    if (clampedX !== pos.x) vel.x = 0;
    if (clampedY !== pos.y) vel.y = 0;
    pos.x = clampedX; pos.y = clampedY;

    if (pinned && pointer.active && Math.hypot(pos.x - pointer.x, pos.y - pointer.y) < MIN_GAP + 8) {
      warp();
    }
  }

  function track(e) {
    pointer.vx = e.clientX - pointer.x;
    pointer.vy = e.clientY - pointer.y;
    if (!pointer.active) { pointer.vx = 0; pointer.vy = 0; } // first event: no jump from off-screen
    pointer.sx = pointer.sx * 0.6 + pointer.vx * 0.4;
    pointer.sy = pointer.sy * 0.6 + pointer.vy * 0.4;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    // Don't wait for the next frame: a fast flick could otherwise land on it.
    keepAway();
    if (!warping) confine();
    render();
  }

  window.addEventListener('pointermove', track, { passive: true });
  window.addEventListener('pointerdown', track, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; });
  window.addEventListener('blur', () => { pointer.active = false; });

  window.addEventListener('resize', () => {
    measure();
    const b = bounds();
    pos.x = Math.min(Math.max(pos.x, b.minX), b.maxX);
    pos.y = Math.min(Math.max(pos.y, b.minY), b.maxY);
    render();
  });

  measure();
  pos.x = home.x;
  pos.y = home.y;
  render();
  plus.classList.add('is-ready');
  requestAnimationFrame(step);
})();
