// Проверка кода доступа в браузере. Компромисс этого подхода описан в README.
import config from '../../config.js';
import { getState, update } from './state.js';

// Кириллица, похожая на латиницу: на телефоне код часто набирают на русской раскладке.
const LOOKALIKE = { А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X', У: 'Y' };

export function normalizeCode(code) {
  return code
    .toUpperCase()
    .replace(/[АВЕКМНОРСТХУ]/g, (ch) => LOOKALIKE[ch])
    .replace(/[^A-Z0-9]/g, '');
}

export async function hashCode(code) {
  const data = new TextEncoder().encode(config.access.salt + normalizeCode(code));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Сверяем с текущим списком при каждой проверке, поэтому удалённый из конфига код перестаёт работать.
export const hasAccess = () => config.access.hashes.includes(getState().access);

export const isFree = (moduleId) => config.freeModules.includes(moduleId);
export const canOpen = (moduleId) => isFree(moduleId) || hasAccess();

export async function tryCode(code) {
  if (!normalizeCode(code)) return false;
  const hash = await hashCode(code);
  if (!config.access.hashes.includes(hash)) return false;
  update((s) => {
    s.access = hash;
  });
  return true;
}
