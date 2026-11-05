// Проверка промпта по рубрике. Никаких запросов в сеть: только сравнение текста с правилами
// из content/<язык>/rubric.json. Работает и в браузере, и в Node (для scripts/validate-content.mjs).

const normalize = (text) => text.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function hasStem(text, stems = []) {
  if (!stems.length) return false;
  const body = stems.map((s) => escapeRe(normalize(s) + (s.endsWith(' ') ? ' ' : ''))).join('|');
  return new RegExp(`(^|[^а-яңөүa-z0-9])(?:${body})`, 'i').test(text);
}

function foundStems(text, stems = []) {
  return stems.filter((s) => hasStem(text, [s]));
}

function hasRegex(text, list = []) {
  return list.some((source) => new RegExp(source, 'i').test(text));
}

export function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function evaluate(criterion, text, words) {
  if (criterion.taskCount) {
    // «Не придумывай» это ограничение, а не задача. Разные основы одного глагола (переведи/перевед)
    // считаем за одну задачу.
    const found = foundStems(text.replace(/(^|[^а-яңөүa-z0-9])не\s+[а-яңөү]+/g, '$1'), criterion.taskCount.stems);
    const unique = found.filter((s, i) => !found.some((o, j) => j < i && (o.startsWith(s.slice(0, 5)) || s.startsWith(o.slice(0, 5)))));
    return { ok: unique.length <= criterion.taskCount.max, found: unique };
  }
  const matched = hasStem(text, criterion.startsWith) || hasRegex(text, criterion.regex);
  if (criterion.absent) {
    return { ok: !matched && (!criterion.maxWords || words <= criterion.maxWords) };
  }
  return { ok: matched };
}

export function checkPrompt(rawText, rubric, options = {}) {
  const { skip = [], hints = {} } = options;
  const text = normalize(rawText);
  const words = countWords(rawText);
  const active = rubric.criteria.filter((c) => !skip.includes(c.id));
  const total = active.reduce((sum, c) => sum + c.points, 0);

  let earned = 0;
  const results = active.map((criterion) => {
    const { ok, found } = evaluate(criterion, text, words);
    if (ok) earned += criterion.points;
    const message = ok ? criterion.pass : criterion.fail.replace('{found}', (found || []).join(', '));
    return {
      id: criterion.id,
      label: criterion.label,
      ok,
      message,
      suggestion: ok ? '' : hints[criterion.id] || criterion.suggestion,
    };
  });

  let score = total ? Math.round((earned / total) * 10) : 0;
  const short = words < rubric.minWords;
  if (short) score = Math.min(score, rubric.shortCap);

  const warnings = rubric.warnings
    .filter((w) => {
      const match = rawText.toLowerCase().match(new RegExp(w.regex, 'i'));
      if (!match) return false;
      if (!w.minDigits) return true;
      return match[0].replace(/\D/g, '').length >= w.minDigits;
    })
    .map((w) => w.message);

  const level = [...rubric.levels].reverse().find((l) => score >= l.min) || rubric.levels[0];

  return {
    score,
    max: 10,
    words,
    short,
    shortMessage: short ? rubric.shortMessage.replace('{cap}', rubric.shortCap) : '',
    results,
    warnings,
    level,
  };
}
