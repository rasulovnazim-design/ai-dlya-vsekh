// Проверка всего контента перед публикацией.
//   node scripts/validate-content.mjs            весь курс и библиотека
//   node scripts/validate-content.mjs 3 4        только модули 3 и 4
//   node scripts/validate-content.mjs library    только библиотека
// Ошибки надо исправить. Предупреждения стоит прочитать.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkPrompt, countWords } from '../assets/js/checker.js';

const LANG = process.env.LANG_CODE || 'ru';
const root = fileURLToPath(new URL(`../content/${LANG}/`, import.meta.url));
const read = (p) => JSON.parse(readFileSync(root + p, 'utf8'));

const args = process.argv.slice(2);
const wantLibrary = !args.length || args.includes('library');
const wantedModules = args.filter((a) => /^\d+$/.test(a)).map(Number);

const rubric = read('rubric.json');
const course = read('course.json');
const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const MAX_WORDS = 300;
const FORBIDDEN = [
  [/—/, 'длинное тире'],
  [/–/, 'среднее тире'],
  [/\s-\s/, 'дефис вместо тире (" - ")'],
  [/\*/, 'звёздочка'],
  [/`/, 'обратная кавычка'],
  [/(^|\n)\s*#/, 'решётка в начале строки'],
  [/__/, 'двойное подчёркивание'],
  [/\[[^\]]*\]\(/, 'ссылка в разметке Markdown'],
  [/\.{3}/, 'три точки вместо …'],
];
const SOFT = ['давайте разберёмся', 'важно отметить', 'стоит отметить', 'в современном мире', 'не просто ', 'является ', 'данный ', 'в заключение', 'таким образом', 'мощный инструмент', 'погрузимся', 'в эпоху'];

function scanText(where, text) {
  for (const [re, name] of FORBIDDEN) {
    if (re.test(text)) err(where, `${name} в тексте: "${text.slice(0, 70)}"`);
  }
  for (const phrase of SOFT) {
    if (text.toLowerCase().includes(phrase)) warn(where, `штамп "${phrase.trim()}": "${text.slice(0, 70)}"`);
  }
}

function walkStrings(value, fn) {
  if (typeof value === 'string') fn(value);
  else if (Array.isArray(value)) value.forEach((v) => walkStrings(v, fn));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => walkStrings(v, fn));
}

function bodyWords(body) {
  let n = 0;
  walkStrings(body, (s) => (n += countWords(s)));
  return n;
}

function need(where, obj, keys) {
  for (const k of keys) {
    if (obj?.[k] === undefined || obj?.[k] === '') err(where, `нет поля ${k}`);
  }
}

function checkLesson(id, moduleId) {
  const where = id;
  const path = `lessons/${id}.json`;
  if (!existsSync(root + path)) {
    err(where, 'файла нет');
    return;
  }
  let lesson;
  try {
    lesson = read(path);
  } catch (e) {
    err(where, `JSON не читается: ${e.message}`);
    return;
  }
  need(where, lesson, ['id', 'title', 'body', 'beforeAfter', 'exercise']);
  if (lesson.id !== id) err(where, `id в файле: ${lesson.id}`);
  walkStrings(lesson, (s) => scanText(where, s));

  const ba = lesson.beforeAfter || {};
  need(`${where} beforeAfter`, ba, ['situation', 'before', 'after', 'why']);
  need(`${where} before`, ba.before, ['prompt', 'output']);
  need(`${where} after`, ba.after, ['prompt', 'output']);

  const ex = lesson.exercise || {};
  const visible = [lesson.body, ba.situation, ba.before, ba.after, ba.why, ex.scenario, ex.question];
  const optionWords = (ex.options || []).map((o) => o.text);
  const total = bodyWords(visible) + bodyWords(optionWords);
  if (total >= MAX_WORDS) err(where, `${total} слов на экране, нужно меньше ${MAX_WORDS}`);

  if (ba.before?.prompt) {
    const r = checkPrompt(ba.before.prompt, rubric);
    if (r.score > 5) err(where, `слабый промпт набирает ${r.score}/10, должен быть не выше 5: сделайте его слабее`);
  }
  if (ba.after?.prompt) {
    const r = checkPrompt(ba.after.prompt, rubric);
    if (r.score < 6) {
      const miss = r.results.filter((x) => !x.ok).map((x) => x.id).join(', ');
      err(where, `сильный промпт набирает ${r.score}/10, нужно от 6: не хватает ${miss}`);
    }
  }

  if (ex.type === 'prompt') {
    need(`${where} exercise`, ex, ['scenario', 'sample']);
    const ids = rubric.criteria.map((c) => c.id);
    for (const id2 of [...(ex.skip || []), ...Object.keys(ex.hints || {})]) {
      if (!ids.includes(id2)) err(where, `неизвестный критерий: ${id2}`);
    }
    if (ex.sample) {
      const r = checkPrompt(ex.sample, rubric, { skip: ex.skip });
      if (r.score < 7) {
        const miss = r.results.filter((x) => !x.ok).map((x) => x.id).join(', ');
        err(where, `образец набирает ${r.score}/10, нужно от 7: не хватает ${miss}`);
      }
    }
  } else if (ex.type === 'choice') {
    need(`${where} exercise`, ex, ['question', 'options']);
    if (!(ex.options || []).some((o) => o.correct)) err(where, 'нет правильного варианта');
    for (const o of ex.options || []) need(`${where} option`, o, ['text', 'why']);
  } else {
    err(where, `неизвестный тип упражнения: ${ex.type}`);
  }
  return moduleId;
}

function checkQuiz(moduleId) {
  const where = `квиз ${moduleId}`;
  const path = `quizzes/m${moduleId}.json`;
  if (!existsSync(root + path)) {
    err(where, 'файла нет');
    return;
  }
  const quiz = read(path);
  walkStrings(quiz, (s) => scanText(where, s));
  if ((quiz.questions || []).length < 5) err(where, `вопросов ${quiz.questions?.length || 0}, нужно от 5`);
  for (const q of quiz.questions || []) {
    need(where, q, ['q', 'options', 'explain']);
    if (typeof q.correct !== 'number' || !q.options?.[q.correct]) err(where, `неверный correct: ${q.q}`);
  }
}

function checkLibrary() {
  const where = 'библиотека';
  if (!existsSync(root + 'library.json')) {
    err(where, 'файла нет');
    return;
  }
  const lib = read('library.json');
  walkStrings(lib, (s) => scanText(where, s));
  const ids = new Set();
  let count = 0;
  for (const s of lib.situations || []) {
    need(where, s, ['id', 'title', 'prompts']);
    for (const p of s.prompts || []) {
      count += 1;
      need(`${where} ${p.id}`, p, ['id', 'title', 'prompt', 'change']);
      if (ids.has(p.id)) err(where, `повтор id: ${p.id}`);
      ids.add(p.id);
      const r = checkPrompt(p.prompt, rubric);
      if (r.score < 6) warn(`${where} ${p.id}`, `набирает только ${r.score}/10`);
    }
  }
  if (count < 60) err(where, `промптов ${count}, нужно от 60`);
  console.log(`Промптов в библиотеке: ${count}`);
}

const modules = course.modules.filter((m) => !wantedModules.length || wantedModules.includes(m.id));
if (args.length === 0 || wantedModules.length) {
  for (const m of modules) {
    m.lessons.forEach((id) => checkLesson(id, m.id));
    checkQuiz(m.id);
  }
}
if (wantLibrary) checkLibrary();
if (!args.length) {
  for (const file of ['ui.json', 'home.json', 'builder.json', 'course.json']) {
    walkStrings(read(file), (s) => scanText(file, s));
  }
  const demo = read('home.json').demo;
  if (checkPrompt(demo.before.prompt, rubric).score > 5) err('home.json', 'слабый промпт слишком хорош');
  if (checkPrompt(demo.after.prompt, rubric).score < 6) err('home.json', 'сильный промпт слишком слаб');
}

warnings.forEach((w) => console.log(`предупреждение  ${w}`));
errors.forEach((e) => console.log(`ОШИБКА  ${e}`));
console.log(`\nОшибок: ${errors.length}, предупреждений: ${warnings.length}`);
process.exit(errors.length ? 1 : 0);
