import './style.css';

document.documentElement.classList.add('js');

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

const toggle = document.querySelector('.nav-toggle');
const menu = document.getElementById('menu');

function closeMenu() {
  document.body.classList.remove('nav-open');
  toggle?.setAttribute('aria-expanded', 'false');
  toggle?.setAttribute('aria-label', 'Abrir menu');
}

if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  });
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}

const canvas = document.querySelector('.hero-canvas');
if (canvas instanceof HTMLCanvasElement) {
  import('./scene.js').then(({ mountHero }) => mountHero(canvas));
}

const float = document.querySelector('.wa-float');
const hero = document.querySelector('.hero');
if (float && hero && 'IntersectionObserver' in window) {
  const floatObserver = new IntersectionObserver(([entry]) => {
    float.classList.toggle('is-hidden', entry.isIntersecting && entry.intersectionRatio > 0.55);
  }, { threshold: [0, 0.55, 1] });
  floatObserver.observe(hero);
}

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (!reduce && finePointer) {
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `rotateY(${x * 12}deg) rotateX(${-y * 10}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
}

const reveals = document.querySelectorAll('.reveal');
if (reduce || !('IntersectionObserver' in window)) {
  reveals.forEach((item) => item.classList.add('in'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
  reveals.forEach((item) => observer.observe(item));
}
