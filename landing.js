// Keepset landing page: nav, menu, reveal, pinned features, parallax, keeper types band.
// Everything works without this file; it only adds motion and the pinned phone.

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const isTablet = matchMedia('(min-width: 48em)');
const isDesktop = matchMedia('(min-width: 68.75em)');

// Nav gets smaller once the page scrolls
const nav = document.getElementById('nav');
const updateNav = () => nav.classList.toggle('is-compact', scrollY > 24);
addEventListener('scroll', updateNav, { passive: true });
updateNav();

// Mobile menu: a modal dialog gives focus trapping and Escape for free
const menu = document.getElementById('menu');
const menuButton = document.querySelector('.menu-btn');
menuButton.addEventListener('click', () => {
  menu.showModal();
  document.documentElement.style.overflow = 'hidden';
});
menu.addEventListener('close', () => {
  document.documentElement.style.overflow = '';
  menuButton.focus();
});
menu.querySelector('.menu-close').addEventListener('click', () => menu.close());
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => menu.close()));
isTablet.addEventListener('change', e => { if (e.matches && menu.open) menu.close(); });

// Problem cards slide in once
const revealer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-in');
      revealer.unobserve(entry.target);
    }
  }
}, { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('.reveal').forEach(el => revealer.observe(el));

// Pinned features: the step in the middle of the screen picks the phone screen
const features = [...document.querySelectorAll('.feature')];
const screens = [...document.querySelectorAll('.phone-pin picture')];
const setFeature = index => {
  features.forEach((f, i) => f.classList.toggle('is-active', i === index));
  screens.forEach((s, i) => {
    s.classList.toggle('is-active', i === index);
    const img = s.querySelector('img');
    if (i === index) img.removeAttribute('aria-hidden'); else img.setAttribute('aria-hidden', 'true');
  });
};
const featureWatcher = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) setFeature(features.indexOf(entry.target));
  }
}, { rootMargin: '-45% 0px -45% 0px' });
features.forEach(f => featureWatcher.observe(f));
setFeature(0);

// Parallax. Desktop: 3 layers. Tablet: 2 layers, under 80 px. Mobile: 1 light layer, under 40 px.
const layers = [...document.querySelectorAll('[data-depth]')];
const visible = new Set();
const layerWatcher = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target);
  }
  requestTick();
});
layers.forEach(el => layerWatcher.observe(el));

const maxOffset = depth => {
  if (reduceMotion.matches) return 0;
  if (isDesktop.matches) return [0, 32, 64, 100][depth];
  if (isTablet.matches) return [0, 28, 60, 0][depth];
  return [0, 24, 0, 0][depth];
};

let ticking = false;
function requestTick() {
  if (!ticking) { ticking = true; requestAnimationFrame(renderParallax); }
}
function renderParallax() {
  ticking = false;
  const half = innerHeight / 2;
  for (const el of layers) {
    const max = maxOffset(Number(el.dataset.depth));
    if (!max) { el.style.translate = ''; continue; }
    if (!visible.has(el)) continue;
    // Measure without our own offset so the layer does not chase itself
    const rect = el.getBoundingClientRect();
    const current = parseFloat(el.dataset.offset || '0');
    const center = rect.top - current + rect.height / 2;
    const progress = Math.max(-1, Math.min(1, (center - half) / (half + rect.height / 2)));
    const offset = Math.round(progress * max * 10) / 10;
    el.dataset.offset = offset;
    el.style.translate = `0 ${offset}px`;
  }
}
addEventListener('scroll', requestTick, { passive: true });
addEventListener('resize', requestTick);
[reduceMotion, isTablet, isDesktop].forEach(q => q.addEventListener('change', requestTick));

// Keeper types band drifts sideways; people can also swipe or scroll it by hand
const band = document.querySelector('.band');
const track = band.querySelector('.band-track');
const originals = [...track.children];
originals.forEach(item => {
  const copy = item.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  track.append(copy);
});

let paused = false, bandVisible = false, last = 0, resumeTimer;
const pause = () => { paused = true; clearTimeout(resumeTimer); };
const resumeSoon = () => { clearTimeout(resumeTimer); resumeTimer = setTimeout(() => { paused = false; }, 2500); };
band.addEventListener('pointerenter', pause);
band.addEventListener('pointerleave', resumeSoon);
band.addEventListener('touchstart', pause, { passive: true });
band.addEventListener('touchend', resumeSoon, { passive: true });
band.addEventListener('focusin', pause);
band.addEventListener('focusout', resumeSoon);
band.addEventListener('wheel', () => { pause(); resumeSoon(); }, { passive: true });

new IntersectionObserver(([entry]) => {
  bandVisible = entry.isIntersecting;
  if (bandVisible) { last = 0; requestAnimationFrame(drift); }
}).observe(band);

let position = 0;
function drift(time) {
  if (!bandVisible) return;
  const loop = track.scrollWidth / 2;
  if (!paused && !reduceMotion.matches && !document.hidden && last) {
    if (Math.abs(band.scrollLeft - position) > 2) position = band.scrollLeft; // the person scrolled it
    position += Math.min(time - last, 50) * 0.03;
    if (position >= loop) position -= loop;
    band.scrollLeft = position;
  } else {
    position = band.scrollLeft;
  }
  if (band.scrollLeft >= loop) { band.scrollLeft -= loop; position = band.scrollLeft; }
  last = time;
  requestAnimationFrame(drift);
}
