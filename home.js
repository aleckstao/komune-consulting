// Home page game: a "+" that drifts away from the cursor like a repelling magnet.
// It roams the whole viewport, eases back towards the middle of the right column
// when left alone, and if it gets cornered it fades out and reappears elsewhere.

(function () {
  const plus = document.querySelector('.plus');
  const content = document.querySelector('.content');
  if (!plus || !content) return;

  // Tuning
  const FIELD = 160;      // px: cursor starts pushing within this distance
  const PUSH = 2.4;       // strength of the push at point-blank range
  const MIN_GAP = 44;     // px: the cursor can never get closer than this (from the + centre)
  const HOME_PULL = 0.004;// gentle spring back to the starting spot
  const DAMPING = 0.88;   // 1 = no friction
  const EDGE = 16;        // px: keep this far from the window edges
  const WARP_MS = 150;    // matches --duration-fast

  const pos = { x: 0, y: 0 };
  const vel = { x: 0, y: 0 };
  const home = { x: 0, y: 0 };
  const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, active: false };
  let half = { w: 0, h: 0 };
  let warping = false;
  let last = performance.now();

  function measure() {
    const r = plus.getBoundingClientRect();
    half = { w: r.width / 2, h: r.height / 2 };
    const c = content.getBoundingClientRect();
    home.x = c.left + c.width / 2;
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
    const dx = pos.x - pointer.x;
    const dy = pos.y - pointer.y;
    const d = Math.hypot(dx, dy);
    if (!pointer.active || d >= MIN_GAP) return;
    // Dead-centre hit: get shoved ahead in the direction the cursor is moving.
    const ux = d > 0.001 ? dx / d : pointer.vx || 1;
    const uy = d > 0.001 ? dy / d : pointer.vy || 0;
    const ul = Math.hypot(ux, uy) || 1;
    pos.x = pointer.x + (ux / ul) * MIN_GAP;
    pos.y = pointer.y + (uy / ul) * MIN_GAP;
  }

  function step(now) {
    const dt = Math.min((now - last) / 16.667, 3); // frames at 60fps; capped after tab switches
    last = now;

    if (!warping) {
      let fx = (home.x - pos.x) * HOME_PULL;
      let fy = (home.y - pos.y) * HOME_PULL;

      const dx = pos.x - pointer.x;
      const dy = pos.y - pointer.y;
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
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    // Don't wait for the next frame: a fast flick could otherwise land on it.
    if (!warping) {
      keepAway();
      confine();
      render();
    }
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
