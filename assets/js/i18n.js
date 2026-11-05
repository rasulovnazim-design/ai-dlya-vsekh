// Загрузка контента и подписей. Если файла нет на выбранном языке, берём его с основного:
// так перевод можно выкладывать по частям.
import config from '../../config.js';
import { getState, update } from './state.js';

const cache = new Map();
let strings = {};

export const lang = () => {
  const saved = getState().lang;
  return config.languages.some((l) => l.code === saved) ? saved : config.defaultLang;
};

export function setLang(code) {
  update((s) => {
    s.lang = code;
  });
  location.reload();
}

export async function getJSON(path) {
  const key = `${lang()}/${path}`;
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      let res = await fetch(`content/${key}`);
      if (!res.ok && lang() !== config.defaultLang) res = await fetch(`content/${config.defaultLang}/${path}`);
      if (!res.ok) throw new Error(`Не удалось загрузить ${path}`);
      return res.json();
    })());
    cache.get(key).catch(() => cache.delete(key));
  }
  return cache.get(key);
}

export async function loadStrings() {
  strings = await getJSON('ui.json');
  document.documentElement.lang = lang();
}

export function t(key, vars = {}) {
  const value = strings[key] ?? key;
  return String(value).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

// Склонение: t.plural('lessons', 5) → «5 уроков». В ui.json три формы: один, два, пять.
export function plural(key, n) {
  const forms = strings[key] || [];
  const mod10 = n % 10;
  const mod100 = n % 100;
  let form = forms[2];
  if (mod10 === 1 && mod100 !== 11) form = forms[0];
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) form = forms[1];
  return `${n} ${form}`;
}

export const course = () => getJSON('course.json');
export const lessonFile = (id) => getJSON(`lessons/${id}.json`);
export const quizFile = (moduleId) => getJSON(`quizzes/m${moduleId}.json`);
export const rubricFile = () => getJSON('rubric.json');
export const libraryFile = () => getJSON('library.json');
