import { getJSON, rubricFile, t } from '../i18n.js';
import { h, autosize, copyText, icon, setTitle, toast } from '../ui.js';
import { getState, savePrompt, update } from '../state.js';
import { checkPrompt } from '../checker.js';
import { titleFrom } from '../components.js';

const FIELDS = ['role', 'context', 'task', 'format', 'constraints', 'examples'];

const sentence = (text) => {
  const clean = text.trim();
  return /[.!?:…»"]$/.test(clean) ? clean : `${clean}.`;
};

// Собираем промпт из заполненных полей. Пустые поля в него не попадают.
export function assemble(values) {
  const parts = [];
  const role = (values.role || '').trim();
  if (role) parts.push(sentence(/^ты\s/i.test(role) ? role : `Ты ${role.charAt(0).toLowerCase()}${role.slice(1)}`));
  if ((values.context || '').trim()) parts.push(`${t('builder.out.context')} ${sentence(values.context)}`);
  if ((values.task || '').trim()) parts.push(`${t('builder.out.task')} ${sentence(values.task)}`);
  if ((values.format || '').trim()) parts.push(`${t('builder.out.format')} ${sentence(values.format)}`);
  if ((values.constraints || '').trim()) parts.push(`${t('builder.out.constraints')} ${sentence(values.constraints)}`);
  if ((values.examples || '').trim()) parts.push(`${t('builder.out.examples')} ${sentence(values.examples)}`);
  return parts.join('\n\n');
}

export default async function builder() {
  setTitle(t('builder.title'));
  const [rubric, data] = await Promise.all([rubricFile(), getJSON('builder.json')]);
  const values = { ...getState().builder };

  const output = h('pre', { class: 'builder-output', tabindex: 0, 'aria-live': 'off' });
  const scoreLine = h('div', { class: 'builder-score' });
  const inputs = {};
  const fits = [];

  const refresh = () => {
    const prompt = assemble(values);
    output.textContent = prompt || t('builder.empty');
    output.classList.toggle('is-empty', !prompt);
    if (!prompt) {
      scoreLine.replaceChildren();
      return;
    }
    const result = checkPrompt(prompt, rubric);
    const missing = result.results.filter((r) => !r.ok).map((r) => r.label.toLowerCase());
    scoreLine.replaceChildren(
      h('strong', null, `${result.score}/10`),
      h('span', null, missing.length ? t('builder.missing', { list: missing.slice(0, 3).join(', ') }) : t('builder.complete')),
      ...result.warnings.map((w) => h('p', { class: 'report-warning' }, w)),
    );
  };

  const persist = () => update((s) => {
    s.builder = { ...values };
  });

  const fields = FIELDS.map((name) => {
    const id = `f-${name}`;
    const area = h('textarea', {
      id,
      class: 'field',
      rows: name === 'context' || name === 'task' ? 3 : 2,
      placeholder: t(`builder.${name}.hint`),
      value: values[name] || '',
      oninput: (e) => {
        values[name] = e.target.value;
        refresh();
        persist();
      },
    });
    inputs[name] = area;
    fits.push(autosize(area));
    return h('div', { class: 'builder-field' },
      h('label', { for: id }, h('strong', null, t(`builder.${name}.label`)), h('span', null, t(`builder.${name}.about`))),
      area);
  });

  const fill = (preset) => {
    FIELDS.forEach((name) => {
      values[name] = preset ? preset[name] || '' : '';
      inputs[name].value = values[name];
    });
    refresh();
    persist();
    fits.forEach((f) => f());
  };

  refresh();

  return h('div', { class: 'page builder' },
    h('h1', null, t('builder.title')),
    h('p', { class: 'lead' }, t('builder.lead')),
    h('div', { class: 'chips', role: 'group', 'aria-label': t('builder.examples') },
      h('span', { class: 'muted' }, t('builder.examples')),
      data.presets.map((p) => h('button', { type: 'button', class: 'chip', onclick: () => fill(p) }, p.name))),
    h('div', { class: 'builder-grid' },
      h('div', { class: 'builder-form' }, fields),
      h('section', { class: 'builder-result felt felt-sun', 'aria-label': t('builder.result') },
        h('h2', null, t('builder.result')),
        output,
        scoreLine,
        h('div', { class: 'row row-stack' },
          h('button', {
            type: 'button',
            class: 'btn',
            onclick: () => {
              const text = assemble(values);
              if (!text) toast(t('toast.empty'));
              else copyText(text);
            },
          }, icon('copy', 18), t('btn.copy')),
          h('button', {
            type: 'button',
            class: 'btn btn-ghost',
            onclick: () => {
              const text = assemble(values);
              if (!text) {
                toast(t('toast.empty'));
                return;
              }
              savePrompt(titleFrom(values.task || text), text);
              toast(t('toast.saved'));
            },
          }, icon('save', 18), t('builder.save'))),
        h('div', { class: 'row row-between' },
          h('a', { class: 'link-quiet', href: '#/my' }, t('builder.toMy')),
          h('button', { type: 'button', class: 'link-quiet', onclick: () => fill(null) }, t('builder.clear'))))));
}
