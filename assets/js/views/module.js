import config from '../../../config.js';
import { course, lessonFile, t } from '../i18n.js';
import { h, icon, setTitle } from '../ui.js';
import { isLessonDone, getState } from '../state.js';
import { canOpen } from '../access.js';
import { lockCard } from '../components.js';

export default async function moduleView(id) {
  const data = await course();
  const m = data.modules.find((x) => x.id === Number(id));
  if (!m) return null;
  setTitle(m.title);
  const lessons = await Promise.all(m.lessons.map(lessonFile));
  const open = canOpen(m.id);
  const quiz = getState().quizzes[m.id];

  return h('div', { class: 'page' },
    h('a', { class: 'back', href: '#/' }, icon('back', 18), t('nav.route')),
    h('header', { class: `module-head felt felt-${m.color}` },
      h('p', { class: 'stop-kicker' }, t('home.stop', { n: m.id })),
      h('h1', null, m.title),
      h('p', null, m.blurb)),
    open ? null : lockCard(t('lock.title'), t('lock.moduleText')),
    h('ol', { class: 'lesson-list' },
      lessons.map((lesson, i) => {
        const done = isLessonDone(lesson.id);
        const inner = [
          h('span', { class: `lesson-num${done ? ' is-done' : ''}` }, done ? icon('check', 18) : String(i + 1)),
          h('span', { class: 'lesson-name' }, lesson.title),
          open ? null : icon('lock', 18),
        ];
        return h('li', null, open
          ? h('a', { class: 'lesson-row', href: `#/lesson/${lesson.id}` }, inner)
          : h('div', { class: 'lesson-row is-locked' }, inner));
      }),
      h('li', null, open
        ? h('a', { class: 'lesson-row lesson-quiz', href: `#/quiz/${m.id}` },
          h('span', { class: `lesson-num${quiz?.passed ? ' is-done' : ''}` }, quiz?.passed ? icon('check', 18) : '?'),
          h('span', { class: 'lesson-name' }, t('quiz.name'), quiz ? h('small', null, t('quiz.best', { best: quiz.best, total: quiz.total })) : null))
        : h('div', { class: 'lesson-row is-locked' },
          h('span', { class: 'lesson-num' }, '?'),
          h('span', { class: 'lesson-name' }, t('quiz.name')),
          icon('lock', 18)))),
    h('p', { class: 'muted' }, config.freeModules.includes(m.id) ? t('module.free') : ''));
}
