// Всё, что сайт помнит об ученике, лежит в localStorage этого браузера и никуда не отправляется.
const KEY = 'aidv:v1';

const empty = () => ({
  lang: null,
  name: '',
  access: null,
  lastLesson: null,
  certDate: null,
  lessons: {},
  quizzes: {},
  exercises: {},
  saved: [],
  builder: {},
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

const state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Приватный режим или заполненное хранилище: прогресс живёт до закрытия вкладки.
  }
}

export const getState = () => state;

export function update(fn) {
  fn(state);
  save();
}

const progressChanged = () => window.dispatchEvent(new Event('progress-changed'));

export function markLesson(id, data = {}) {
  update((s) => {
    s.lessons[id] = { ...s.lessons[id], ...data, done: true };
  });
  progressChanged();
}

export const isLessonDone = (id) => Boolean(state.lessons[id]?.done);

export function saveQuiz(moduleId, correct, total, passed) {
  update((s) => {
    const prev = s.quizzes[moduleId];
    s.quizzes[moduleId] = {
      best: Math.max(prev?.best || 0, correct),
      total,
      passed: Boolean(prev?.passed || passed),
    };
  });
  progressChanged();
}

export const isQuizPassed = (moduleId) => Boolean(state.quizzes[moduleId]?.passed);

export function savePrompt(title, text) {
  const item = { id: `p${Date.now().toString(36)}`, title, text, at: new Date().toISOString() };
  update((s) => s.saved.unshift(item));
  return item;
}

export function deletePrompt(id) {
  update((s) => {
    s.saved = s.saved.filter((p) => p.id !== id);
  });
}

// Сколько пройдено: уроки и мини тесты считаются поровну.
export function progressOf(modules) {
  let total = 0;
  let done = 0;
  for (const m of modules) {
    total += m.lessons.length + 1;
    done += m.lessons.filter(isLessonDone).length + (isQuizPassed(m.id) ? 1 : 0);
  }
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

export function moduleDone(m) {
  return m.lessons.every(isLessonDone) && isQuizPassed(m.id);
}
