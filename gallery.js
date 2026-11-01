// Work page galleries: click the left/right half of an image to go back/forward.
// A custom "<>" cursor follows the mouse over images; the side you're on is black.

(function () {
  const cursor = document.querySelector('.gallery-cursor');

  document.querySelectorAll('.gallery').forEach((gallery) => {
    const slides = [...gallery.querySelectorAll('.slide')];
    let index = 0;
    let preloaded = false;

    function show(next) {
      index = (next + slides.length) % slides.length; // wraps around at both ends
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));    }

    // Fetch the whole set the first time someone shows interest, so clicks are instant.
    function preload() {
      if (preloaded) return;
      preloaded = true;
      slides.forEach((slide) => { slide.loading = 'eager'; });
    }

    gallery.querySelector('.gallery-btn--prev').addEventListener('click', () => show(index - 1));
    gallery.querySelector('.gallery-btn--next').addEventListener('click', () => show(index + 1));

    gallery.addEventListener('pointerenter', preload);
    gallery.addEventListener('focusin', preload);

    gallery.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { show(index - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { show(index + 1); e.preventDefault(); }
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

  // Scroll fade: each project fades in as it comes into view and out as it leaves.
  // Without this script (or the browser feature) everything simply stays visible.
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
