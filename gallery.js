// Work page.
// - Galleries: click the left/right half of an image to go back/forward. A custom "<>"
//   cursor follows the mouse over images; the side you're on is white.

(function () {
  const content = document.querySelector('.content');
  const cursor = document.querySelector('.gallery-cursor');
  const projects = [...document.querySelectorAll(".project")];
  if (!content || !projects.length) return;

  const projectId = (section) => section.id;

  // --- Galleries ---------------------------------------------------------------------
  const galleries = new Map(); // project id -> { index, slideSets }
  document.querySelectorAll('.project').forEach((section) => {
    const id = projectId(section);
    if (!galleries.has(id)) galleries.set(id, { index: 0, slideSets: [] });
    galleries.get(id).slideSets.push([...section.querySelectorAll('.slide')]);
  });

  function show(id, next) {
    const g = galleries.get(id);
    const count = g.slideSets[0].length;
    g.index = (next + count) % count; // wraps around at both ends
    g.slideSets.forEach((slides) =>
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === g.index)));
  }

  document.querySelectorAll('.project').forEach((section) => {
    const id = projectId(section);
    const gallery = section.querySelector('.gallery');
    let preloaded = false;

    // Fetch the whole set the first time someone shows interest, so clicks are instant.
    function preload() {
      if (preloaded) return;
      preloaded = true;
      galleries.get(id).slideSets.forEach((slides) =>
        slides.forEach((slide) => { slide.loading = 'eager'; }));
    }

    gallery.querySelector('.gallery-btn--prev').addEventListener('click', () => show(id, galleries.get(id).index - 1));
    gallery.querySelector('.gallery-btn--next').addEventListener('click', () => show(id, galleries.get(id).index + 1));

    gallery.addEventListener('pointerenter', preload);
    gallery.addEventListener('focusin', preload);

    gallery.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { show(id, galleries.get(id).index - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { show(id, galleries.get(id).index + 1); e.preventDefault(); }
    });

    if (!cursor) return;

    gallery.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const rect = gallery.getBoundingClientRect();
      cursor.dataset.side = e.clientX < rect.left + rect.width / 2 ? 'prev' : 'next';
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
      cursor.classList.add('is-visible');
    });

    gallery.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
  });

  // --- Scroll fade: each project fades in as it comes into view ----------------------
  // Without this browser feature everything simply stays visible.
  if ('IntersectionObserver' in window) {
    // Watch the image (not the full-height section), so the fade happens while you can see it.
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.closest('.project').classList.toggle('is-offscreen', !entry.isIntersecting);
      });
    }, { rootMargin: '-10% 0px -10% 0px' }); // "in view" once the image is 10% inside the window

    document.querySelectorAll('.project .gallery').forEach((gallery) => observer.observe(gallery));
  }

  // Scrolling moves the page under a still mouse, so hide the cursor until it moves again.
  window.addEventListener('scroll', () => cursor && cursor.classList.remove('is-visible'), { passive: true });
})();
