// Мелкие помощники для интерфейса: создание элементов, копирование, всплывающие сообщения, значки.
import { t } from './i18n.js';

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'value') el.value = value;
    else if (key === 'style') el.style.cssText = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child);
  }
}

const ICONS = {
  route: '<path d="M6 21v-5a4 4 0 0 1 4-4h4a4 4 0 0 0 4-4V3"/><circle cx="6" cy="21" r="1.2"/><circle cx="18" cy="3" r="1.2"/>',
  build: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>',
  book: '<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5z"/><path d="M5 21.5A2.5 2.5 0 0 0 7.5 22H19v-3"/>',
  ticket: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6.5v2M14 11v2M14 15.5v2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cross: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  save: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/>',
};

export function icon(name, size = 22) {
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return span;
}

// Завиток «кочкор муүз» (рога барана) из узоров шырдака.
export const HORN_PATHS = [
  'M50 92C50 66 47 54 34 47 20 40 11 29 17 18 23 7 41 10 41 24 41 33 30 36 26 29',
  'M50 92C50 66 53 54 66 47 80 40 89 29 83 18 77 7 59 10 59 24 59 33 70 36 74 29',
];

export function horn(className = '') {
  const span = document.createElement('span');
  span.className = `horn ${className}`;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round">${HORN_PATHS.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
  return span;
}

export function van() {
  const span = document.createElement('span');
  span.className = 'van';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = '<svg viewBox="0 0 48 28" width="44" height="26"><path d="M4 22V8a4 4 0 0 1 4-4h24c2 0 3.6 1 4.6 2.6L43 16c.7 1 1 2 1 3v3z" fill="#FFC933" stroke="#1F1A3D" stroke-width="2.2" stroke-linejoin="round"/><path d="M9 8h7v7H9zM19 8h7v7h-7zM29 8h4l4.4 7H29z" fill="#FFF4DC" stroke="#1F1A3D" stroke-width="1.8" stroke-linejoin="round"/><circle cx="13" cy="23" r="3.6" fill="#1F1A3D"/><circle cx="35" cy="23" r="3.6" fill="#1F1A3D"/></svg>';
  return span;
}

let toastTimer;
export function toast(text) {
  const box = document.getElementById('toast');
  box.textContent = text;
  box.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove('show'), 2400);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = h('textarea', { style: 'position:fixed;opacity:0', readonly: true });
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  toast(t('toast.copied'));
}

export function copyButton(getText, label = t('btn.copy'), cls = 'btn btn-small') {
  return h('button', { type: 'button', class: cls, onclick: () => copyText(getText()) }, icon('copy', 18), label);
}

export function setTitle(text) {
  document.title = text ? `${text} · ${t('site.name')}` : t('site.title');
}

export function link(href, cls, ...children) {
  return h('a', { href, class: cls }, ...children);
}

// Подсветка [пропусков] в готовых промптах.
export function withBlanks(text) {
  const frag = document.createDocumentFragment();
  text.split(/(\[[^\]]+\])/g).forEach((part) => {
    if (!part) return;
    frag.append(/^\[.*\]$/.test(part) ? h('mark', { class: 'blank' }, part) : part);
  });
  return frag;
}

export function autosize(area) {
  const fit = () => {
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight + 2}px`;
  };
  area.addEventListener('input', fit);
  requestAnimationFrame(fit);
  return fit;
}

export const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
