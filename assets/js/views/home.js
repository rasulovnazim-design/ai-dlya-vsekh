import { course, getJSON, t, plural } from '../i18n.js';
import { h, icon, horn, setTitle, link } from '../ui.js';
import { getState, isLessonDone, isQuizPassed, moduleDone, progressOf } from '../state.js';
import { canOpen, hasAccess, isFree } from '../access.js';
import { beforeAfter, routeBar } from '../components.js';

function stop(m, freeEnd) {
  const open = canOpen(m.id);
  const done = m.lessons.filter(isLessonDone).length + (isQuizPassed(m.id) ? 1 : 0);
  const total = m.lessons.length + 1;
  const finished = moduleDone(m);
  const status = finished
    ? h('span', { class: 'stop-status is-done' }, icon('check', 16), t('home.stopDone'))
    : !open
      ? h('span', { class: 'stop-status' }, icon('lock', 16), t('home.stopLocked'))
      : h('span', { class: 'stop-status' }, plural('plural.lessons', m.lessons.length), done ? ` · ${done}/${total}` : '');

  return [
    h('li', { class: `stop${finished ? ' stop-finished' : ''}` },
      h('span', { class: 'stop-dot', 'aria-hidden': 'true' }, String(m.id)),
      h('a', { class: `stop-card felt felt-${m.color}${open ? '' : ' is-locked'}`, href: `#/module/${m.id}` },
        h('span', { class: 'stop-kicker' }, t('home.stop', { n: m.id })),
        h('span', { class: 'stop-title' }, m.title),
        h('span', { class: 'stop-blurb' }, m.blurb),
        status)),
    freeEnd
      ? h('li', { class: 'stop stop-ticket' },
        h('span', { class: 'stop-dot stop-dot-small', 'aria-hidden': 'true' }),
        h('div', { class: 'ticket' },
          h('strong', null, t('home.ticketTitle')),
          h('p', null, t('home.ticketText')),
          link('#/buy', 'btn btn-small', t('home.ticketCta'))))
      : null,
  ];
}

// Куда вести по кнопке «Продолжить»: незаконченный урок, потом следующий шаг по маршруту.
function resumeHref(modules, lastLesson) {
  if (lastLesson && !isLessonDone(lastLesson)) return `#/lesson/${lastLesson}`;
  for (const m of modules) {
    if (!canOpen(m.id)) return '#/buy';
    const lesson = m.lessons.find((id) => !isLessonDone(id));
    if (lesson) return `#/lesson/${lesson}`;
    if (!isQuizPassed(m.id)) return `#/quiz/${m.id}`;
  }
  return '#/certificate';
}

export default async function home() {
  setTitle('');
  const data = await course();
  const demo = await getJSON('home.json');
  const state = getState();
  const progress = progressOf(data.modules);
  const started = progress.done > 0 || state.lastLesson;
  const firstLesson = data.modules[0].lessons[0];
  const lastFree = !hasAccess() ? Math.max(...data.modules.filter((m) => isFree(m.id)).map((m) => m.id)) : null;

  return h('div', { class: 'home' },
    h('section', { class: 'hero' },
      h('div', { class: 'hero-copy' },
        h('p', { class: 'eyebrow' }, t('home.eyebrow')),
        h('h1', { class: 'hero-title' },
          h('span', { class: 'hero-patch' }, t('home.titleA')),
          h('span', { class: 'hero-rest' }, t('home.titleB'))),
        h('p', { class: 'lead' }, t('home.lead')),
        h('a', { class: 'btn btn-hero', href: resumeHref(data.modules, state.lastLesson) }, started ? t('home.ctaResume') : t('home.cta'), icon('arrow')),
        h('p', { class: 'muted' }, t('home.free'))),
      h('div', { class: 'hero-demo' }, beforeAfter(demo.demo)),
      horn('hero-horn')),

    h('section', { class: 'route', id: 'route' },
      h('div', { class: 'route-head' },
        h('h2', null, t('home.routeTitle')),
        h('p', null, t('home.routeText'))),
      started ? h('div', { class: 'route-progress' },
        routeBar(progress.percent, t('progress.label')),
        h('p', { class: 'muted' }, t('home.progress', { percent: progress.percent }))) : null,
      h('ol', { class: 'stops' },
        data.modules.map((m) => stop(m, m.id === lastFree)),
        h('li', { class: 'stop stop-end' },
          h('span', { class: 'stop-dot', 'aria-hidden': 'true' }, horn()),
          h('a', { class: 'stop-card felt felt-ink', href: '#/certificate' },
            h('span', { class: 'stop-kicker' }, t('home.endKicker')),
            h('span', { class: 'stop-title' }, t('home.endTitle')),
            h('span', { class: 'stop-blurb' }, t('home.endText')))))),

    h('section', { class: 'tools' },
      h('h2', null, t('home.toolsTitle')),
      h('a', { class: 'tool felt felt-sun', href: '#/builder' },
        h('span', { class: 'tool-title' }, t('home.tool1')),
        h('span', null, t('home.tool1Text'))),
      h('a', { class: 'tool felt felt-lake', href: `#/lesson/${firstLesson}` },
        h('span', { class: 'tool-title' }, t('home.tool2')),
        h('span', null, t('home.tool2Text'))),
      h('a', { class: 'tool felt felt-pink', href: '#/library' },
        h('span', { class: 'tool-title' }, t('home.tool3')),
        h('span', null, t('home.tool3Text')))),

    h('section', { class: 'band felt felt-ink' },
      h('h2', null, t('home.bandTitle')),
      h('p', null, t('home.bandText')),
      link('#/corporate', 'btn btn-sun', t('home.bandCta'))));
}
