/* =============================================================
   Page behaviour: menu, active nav link, fade-in on scroll.
   Nothing 3D happens in here.
   ============================================================= */

(function () {
  'use strict';

  /* ---------- Mobile menu ---------- */
  const toggle = document.querySelector('.menu-toggle');
  const nav    = document.querySelector('.site-nav');

  function closeMenu() {
    nav.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', function () {
    const open = nav.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });

  // tapping a link closes the menu
  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeMenu);
  });

  // Esc closes it too
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  /* ---------- Highlight the nav link for the section you're on ---------- */
  const sections = Array.prototype.slice.call(document.querySelectorAll('.page'));
  const navLinks = Array.prototype.slice.call(document.querySelectorAll('.site-nav a'));

  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach(function (link) {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { spy.observe(s); });

    /* ---------- Fade content in as it scrolls into view ---------- */
    const revealTargets = document.querySelectorAll(
      '.page-inner > .eyebrow, .page-title, .page-lede, .art-card, .project, .site-footer'
    );

    revealTargets.forEach(function (el, i) {
      el.classList.add('reveal');
      // a small stagger so items don't all pop at once
      el.style.transitionDelay = (i % 6) * 70 + 'ms';
    });

    const revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    revealTargets.forEach(function (el) { revealer.observe(el); });
  }

  /* ---------- Hide any artwork image that fails to load ---------- */
  /* So missing placeholder files don't show a broken-image icon. */
  document.querySelectorAll('.art-frame img').forEach(function (img) {
    img.addEventListener('error', function () {
      img.style.display = 'none';
      img.parentElement.style.background =
        'linear-gradient(135deg, rgba(124,196,255,.14), rgba(185,140,255,.10))';
    });
  });

})();
