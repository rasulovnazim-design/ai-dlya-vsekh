import { libraryFile, t, plural } from '../i18n.js';
import { h, autosize, copyButton, icon, setTitle, toast, withBlanks } from '../ui.js';
import { deletePrompt, getState, savePrompt, update } from '../state.js';
import { hasAccess } from '../access.js';
import { lockCard } from '../components.js';

function promptCard(p) {
  return h('article', { class: 'prompt-card', 'data-id': p.id },
    h('h3', null, p.title),
    h('p', { class: 'prompt-text' }, withBlanks(p.prompt)),
    h('p', { class: 'prompt-change' }, h('strong', null, t('library.change')), ` ${p.change}`),
    h('div', { class: 'row' },
      copyButton(() => p.prompt),
      h('button', {
        type: 'button',
        class: 'btn btn-small btn-ghost',
        onclick: () => {
          savePrompt(p.title, p.prompt);
          toast(t('toast.saved'));
        },
      }, icon('save', 18), t('btn.save'))));
}

function myLink() {
  const count = getState().saved.length;
  return h('a', { class: 'my-link', href: '#/my' }, icon('save', 18), t('library.my'), count ? h('span', { class: 'count' }, String(count)) : null);
}

export default async function library() {
  setTitle(t('library.title'));
  const data = await libraryFile();
  const total = data.situations.reduce((n, s) => n + s.prompts.length, 0);

  if (!hasAccess()) {
    const free = data.situations.flatMap((s) => s.prompts.filter((p) => p.free));
    return h('div', { class: 'page library' },
      h('h1', null, t('library.title')),
      h('p', { class: 'lead' }, t('library.leadLocked', { total })),
      myLink(),
      h('h2', { class: 'section-label' }, t('library.samples')),
      h('div', { class: 'prompt-grid' }, free.map(promptCard)),
      lockCard(t('library.lockTitle', { total }), t('library.lockText')),
      h('h2', { class: 'section-label' }, t('library.inside')),
      h('ul', { class: 'situation-list' }, data.situations.map((s) => h('li', null,
        h('strong', null, s.title),
        h('span', null, plural('plural.prompts', s.prompts.length)),
        h('p', null, s.prompts.filter((p) => !p.free).map((p) => p.title).join(', '))))));
  }

  const list = h('div', { class: 'library-list' });
  const empty = h('p', { class: 'muted', hidden: true }, t('library.nothing'));
  let active = 'all';
  let query = '';

  const render = () => {
    const q = query.trim().toLowerCase();
    const sections = data.situations
      .filter((s) => active === 'all' || s.id === active)
      .map((s) => {
        const prompts = s.prompts.filter((p) => !q || `${p.title} ${p.prompt} ${p.change}`.toLowerCase().includes(q));
        if (!prompts.length) return null;
        return h('section', { class: 'library-section' },
          h('h2', null, s.title),
          s.blurb ? h('p', { class: 'muted' }, s.blurb) : null,
          h('div', { class: 'prompt-grid' }, prompts.map(promptCard)));
      })
      .filter(Boolean);
    list.replaceChildren(...sections);
    empty.hidden = sections.length > 0;
    chips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.id === active)));
  };

  const makeChip = (id, label) => {
    const chip = h('button', {
      type: 'button',
      class: 'chip',
      'data-id': id,
      onclick: () => {
        active = id;
        render();
      },
    }, label);
    return chip;
  };
  const chips = [makeChip('all', t('library.all')), ...data.situations.map((s) => makeChip(s.id, s.title))];

  render();

  return h('div', { class: 'page library' },
    h('h1', null, t('library.title')),
    h('p', { class: 'lead' }, t('library.lead', { total })),
    myLink(),
    h('input', {
      class: 'field',
      type: 'search',
      placeholder: t('library.search'),
      'aria-label': t('library.search'),
      oninput: (e) => {
        query = e.target.value;
        render();
      },
    }),
    h('div', { class: 'chips chips-scroll', role: 'group', 'aria-label': t('library.filter') }, chips),
    empty,
    list);
}

export async function myLibrary() {
  setTitle(t('my.title'));
  const body = h('div', { class: 'my-list' });

  const render = () => {
    const { saved } = getState();
    if (!saved.length) {
      body.replaceChildren(h('div', { class: 'empty felt felt-sand' },
        h('h2', null, t('my.emptyTitle')),
        h('p', null, t('my.emptyText')),
        h('a', { class: 'btn', href: '#/builder' }, t('my.toBuilder'))));
      return;
    }
    body.replaceChildren(...saved.map((item) => {
      const title = h('input', {
        class: 'my-title',
        value: item.title,
        'aria-label': t('my.rename'),
        oninput: (e) => update(() => {
          item.title = e.target.value;
        }),
      });
      const text = h('textarea', {
        class: 'field',
        value: item.text,
        'aria-label': t('my.edit'),
        oninput: (e) => update(() => {
          item.text = e.target.value;
        }),
      });
      autosize(text);
      return h('article', { class: 'prompt-card', 'data-id': item.id },
        title,
        text,
        h('div', { class: 'row' },
          copyButton(() => item.text),
          h('button', {
            type: 'button',
            class: 'btn btn-small btn-ghost',
            onclick: () => {
              if (!window.confirm(t('my.confirm'))) return;
              deletePrompt(item.id);
              render();
            },
          }, icon('trash', 18), t('my.delete'))));
    }));
  };

  render();
  return h('div', { class: 'page my' },
    h('h1', null, t('my.title')),
    h('p', { class: 'lead' }, t('my.lead')),
    body);
}
