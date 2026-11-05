import { course, lessonFile, t } from '../i18n.js';
import { h, icon, setTitle } from '../ui.js';
import { isLessonDone, markLesson, update } from '../state.js';
import { canOpen } from '../access.js';
import { beforeAfter, choiceExercise, lockCard, promptExercise, routeBar } from '../components.js';

function renderBody(body) {
  return body.map((block) => {
    if (typeof block === 'string') return h('p', null, block);
    if (block.list) return h('ul', { class: 'lesson-bullets' }, block.list.map((item) => h('li', null, item)));
    if (block.note) return h('p', { class: 'lesson-note' }, block.note);
    return null;
  });
}

export default async function lessonView(id) {
  const data = await course();
  const m = data.modules.find((x) => x.lessons.includes(id));
  if (!m) return null;
  const lesson = await lessonFile(id);
  setTitle(lesson.title);

  const index = m.lessons.indexOf(id);
  const back = h('a', { class: 'back', href: `#/module/${m.id}` }, icon('back', 18), t('home.stop', { n: m.id }));

  if (!canOpen(m.id)) {
    return h('div', { class: 'page' }, back,
      h('h1', { class: 'lesson-title' }, lesson.title),
      lockCard(t('lock.title'), t('lock.moduleText')));
  }

  update((s) => {
    s.lastLesson = id;
  });

  const status = h('p', { class: 'lesson-status', 'aria-live': 'polite' }, isLessonDone(id) ? t('lesson.done') : t('lesson.pending'));
  const onAttempt = (score) => {
    markLesson(id, { score });
    status.textContent = t('lesson.done');
    status.classList.add('is-done');
  };
  if (isLessonDone(id)) status.classList.add('is-done');

  const exercise = lesson.exercise.type === 'choice'
    ? choiceExercise(lesson, onAttempt)
    : await promptExercise(lesson, onAttempt);

  const nextId = m.lessons[index + 1];
  const next = nextId
    ? h('a', { class: 'btn btn-wide', href: `#/lesson/${nextId}` }, t('lesson.next'), icon('arrow'))
    : h('a', { class: 'btn btn-wide', href: `#/quiz/${m.id}` }, t('lesson.toQuiz'), icon('arrow'));
  const prevId = m.lessons[index - 1];

  return h('article', { class: `page lesson theme-${m.color}` },
    h('div', { class: 'lesson-top' }, back, h('span', { class: 'muted' }, t('lesson.count', { n: index + 1, total: m.lessons.length }))),
    h('div', { class: 'lesson-progress' }, routeBar(Math.round(((index + 1) / m.lessons.length) * 100), t('progress.label'))),
    h('h1', { class: 'lesson-title' }, lesson.title),
    h('div', { class: 'lesson-body' }, renderBody(lesson.body)),
    h('h2', { class: 'section-label' }, t('ba.title')),
    beforeAfter(lesson.beforeAfter),
    exercise,
    h('footer', { class: 'lesson-foot' },
      status,
      next,
      prevId ? h('a', { class: 'link-quiet', href: `#/lesson/${prevId}` }, t('lesson.prev')) : null));
}
