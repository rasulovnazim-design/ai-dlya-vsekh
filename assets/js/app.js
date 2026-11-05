import config from '../../config.js';
import { course, lang, loadStrings, setLang, t } from './i18n.js';
import { h, horn, icon } from './ui.js';
import { progressOf } from './state.js';
import { hasAccess } from './access.js';
import home from './views/home.js';
import moduleView from './views/module.js';
import lessonView from './views/lesson.js';
import quizView from './views/quiz.js';
import builder from './views/builder.js';
import library, { myLibrary } from './views/library.js';
import buy, { corporate } from './views/access.js';
import certificate from './views/certificate.js';

const ROUTES = [
  [/^\/?$/, home],
  [/^\/module\/(\d+)$/, moduleView],
  [/^\/lesson\/(m\d+-l\d+)$/, lessonView],
  [/^\/quiz\/(\d+)$/, quizView],
  [/^\/builder$/, builder],
  [/^\/library$/, library],
  [/^\/my$/, myLibrary],
  [/^\/buy$/, buy],
  [/^\/corporate$/, corporate],
  [/^\/certificate$/, certificate],
];

const app = document.getElementById('app');
const top = document.getElementById('top');
const tabs = document.getElementById('tabs');
let renderToken = 0;

async function renderTop() {
  const data = await course();
  const { percent, done } = progressOf(data.modules);
  const languages = config.languages.length > 1
    ? h('select', {
      class: 'lang',
      'aria-label': t('nav.language'),
      onchange: (e) => setLang(e.target.value),
    }, config.languages.map((l) => h('option', { value: l.code, selected: l.code === lang() }, l.label)))
    : null;
  top.replaceChildren(
    h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-mark' }, horn()), t('site.name')),
    h('div', { class: 'top-right' },
      languages,
      done ? h('a', { class: 'top-progress', href: '#/', 'aria-label': t('progress.label') }, `${percent}%`) : null),
  );
}

function renderTabs(path) {
  const items = [
    ['#/', 'route', t('nav.route'), /^\/?$|^\/(module|lesson|quiz|certificate)/],
    ['#/builder', 'build', t('nav.builder'), /^\/builder/],
    ['#/library', 'book', t('nav.library'), /^\/(library|my)/],
    ['#/buy', 'ticket', hasAccess() ? t('nav.access') : t('nav.buy'), /^\/(buy|corporate)/],
  ];
  tabs.replaceChildren(...items.map(([href, name, label, match]) => h('a', {
    href,
    class: match.test(path) ? 'tab is-active' : 'tab',
    'aria-current': match.test(path) ? 'page' : null,
  }, icon(name), h('span', null, label))));
}

function footer() {
  return h('footer', { class: 'foot' },
    h('nav', { class: 'foot-links', 'aria-label': t('nav.more') },
      h('a', { href: '#/buy' }, t('nav.buy')),
      h('a', { href: '#/corporate' }, t('nav.corporate')),
      h('a', { href: '#/my' }, t('nav.my')),
      h('a', { href: '#/certificate' }, t('nav.certificate'))),
    h('p', null, t('foot.privacy')));
}

async function render() {
  const token = ++renderToken;
  const path = location.hash.replace(/^#/, '') || '/';
  renderTabs(path);
  renderTop();

  const route = ROUTES.find(([re]) => re.test(path));
  const params = route ? path.match(route[0]).slice(1) : [];
  try {
    const view = route ? await route[1](...params) : null;
    if (token !== renderToken) return;
    if (!view) {
      app.replaceChildren(h('div', { class: 'page' }, h('h1', null, t('error.notFoundTitle')), h('p', { class: 'lead' }, t('error.notFoundText')), h('a', { class: 'btn', href: '#/' }, t('nav.route'))));
    } else {
      app.replaceChildren(view, footer());
    }
  } catch (error) {
    console.error(error);
    if (token !== renderToken) return;
    app.replaceChildren(h('div', { class: 'page' }, h('h1', null, t('error.loadTitle')), h('p', { class: 'lead' }, t('error.loadText')), h('button', { type: 'button', class: 'btn', onclick: render }, t('error.retry'))));
  }
  window.scrollTo(0, 0);
  const heading = app.querySelector('h1');
  if (heading && path !== '/') {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

window.addEventListener('hashchange', render);
window.addEventListener('progress-changed', renderTop);

loadStrings().then(render).catch((error) => {
  console.error(error);
  app.textContent = 'Не удалось загрузить курс. Проверьте интернет и обновите страницу.';
});
