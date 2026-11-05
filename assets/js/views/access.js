import config from '../../../config.js';
import { t } from '../i18n.js';
import { h, icon, setTitle } from '../ui.js';
import { hasAccess } from '../access.js';
import { codeForm, messageButtons } from '../components.js';

export default async function buy() {
  setTitle(t('buy.title'));
  if (hasAccess()) {
    return h('div', { class: 'page buy' },
      h('h1', null, t('buy.title')),
      h('section', { class: 'price felt felt-grass' },
        h('h2', null, t('buy.openTitle')),
        h('p', null, t('buy.openText'))),
      h('a', { class: 'btn btn-wide', href: '#/module/5' }, t('buy.toModule5'), icon('arrow')),
      h('a', { class: 'btn btn-wide btn-ghost', href: '#/library' }, t('buy.toLibrary')),
      h('a', { class: 'link-quiet', href: '#/certificate' }, t('buy.toCertificate')));
  }

  const message = () => t('buy.message', { price: config.price.amount });
  const steps = [t('buy.step1'), t('buy.step2'), t('buy.step3')];
  const items = ['buy.item1', 'buy.item2', 'buy.item3', 'buy.item4', 'buy.item5', 'buy.item6'];

  return h('div', { class: 'page buy' },
    h('h1', null, t('buy.title')),
    h('p', { class: 'lead' }, t('buy.lead')),
    h('section', { class: 'price felt felt-sun' },
      h('p', { class: 'price-amount' }, config.price.amount),
      h('p', { class: 'price-note' }, config.price.note),
      h('ul', { class: 'lesson-bullets' }, items.map((key) => h('li', null, t(key))))),
    h('h2', { class: 'section-label' }, t('buy.how')),
    h('ol', { class: 'steps' }, steps.map((step) => h('li', null, step))),
    messageButtons(message),
    h('section', { class: 'code-box felt felt-sand' },
      h('h2', null, t('buy.haveCode')),
      codeForm(() => {
        setTimeout(() => {
          location.hash = '#/module/5';
        }, 900);
      }),
      h('p', { class: 'muted' }, t('buy.codeNote'))));
}

export async function corporate() {
  setTitle(t('corp.title'));
  const fields = {
    name: h('input', { id: 'c-name', class: 'field', type: 'text', required: true, autocomplete: 'name' }),
    company: h('input', { id: 'c-company', class: 'field', type: 'text', required: true, autocomplete: 'organization' }),
    city: h('input', { id: 'c-city', class: 'field', type: 'text' }),
    people: h('input', { id: 'c-people', class: 'field', type: 'number', min: 1, inputmode: 'numeric' }),
    format: h('select', { id: 'c-format', class: 'field' }, ['corp.format1', 'corp.format2', 'corp.format3'].map((key) => h('option', null, t(key)))),
    goal: h('textarea', { id: 'c-goal', class: 'field', rows: 3, placeholder: t('corp.goalHint') }),
  };
  const row = (key, label) => h('div', { class: 'form-row' }, h('label', { for: `c-${key}` }, label), fields[key]);
  const form = h('form', { class: 'corp-form', onsubmit: (e) => e.preventDefault() },
    row('name', t('corp.name')),
    row('company', t('corp.company')),
    row('city', t('corp.city')),
    row('people', t('corp.people')),
    row('format', t('corp.format')),
    row('goal', t('corp.goal')));

  const message = () => {
    if (!form.reportValidity()) return null;
    const lines = [
      t('corp.msgIntro'),
      `${t('corp.name')}: ${fields.name.value.trim()}`,
      `${t('corp.company')}: ${fields.company.value.trim()}`,
    ];
    if (fields.city.value.trim()) lines.push(`${t('corp.city')}: ${fields.city.value.trim()}`);
    if (fields.people.value) lines.push(`${t('corp.people')}: ${fields.people.value}`);
    lines.push(`${t('corp.format')}: ${fields.format.value}`);
    if (fields.goal.value.trim()) lines.push(`${t('corp.goal')}: ${fields.goal.value.trim()}`);
    return lines.join('\n');
  };

  return h('div', { class: 'page corp' },
    h('h1', null, t('corp.title')),
    h('p', { class: 'lead' }, t('corp.lead')),
    h('ul', { class: 'lesson-bullets' }, ['corp.p1', 'corp.p2', 'corp.p3'].map((key) => h('li', null, t(key)))),
    h('section', { class: 'corp-box felt felt-lake' }, form, messageButtons(message), h('p', { class: 'corp-note' }, t('corp.note'))));
}
