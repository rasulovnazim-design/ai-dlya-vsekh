// Части, которые встречаются на нескольких страницах.
import config from '../../config.js';
import { t, plural, rubricFile } from './i18n.js';
import { h, icon, van, toast, copyButton, autosize } from './ui.js';
import { checkPrompt } from './checker.js';
import { savePrompt, getState, update } from './state.js';
import { tryCode, hasAccess } from './access.js';

// Прогресс как дорога с маршруткой.
export function routeBar(percent, label) {
  return h('div', {
    class: 'road',
    role: 'progressbar',
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuenow': percent,
    'aria-label': label,
    style: `--done:${percent}%`,
  }, h('div', { class: 'road-line' }, h('div', { class: 'road-done' })), h('div', { class: 'road-van' }, van()));
}

// Ответ ИИ: строки с « | » подряд показываем настоящей таблицей, первая строка это шапка.
function outputParts(text) {
  const parts = [];
  let rows = [];
  let lines = [];
  const flushText = () => {
    if (lines.length) parts.push(lines.join('\n').trim());
    lines = [];
  };
  const flushRows = () => {
    if (!rows.length) return;
    const [head, ...body] = rows;
    parts.push(h('table', { class: 'bubble-table' },
      h('thead', null, h('tr', null, head.map((cell) => h('th', { scope: 'col' }, cell)))),
      h('tbody', null, body.map((row) => h('tr', null, row.map((cell) => h('td', null, cell)))))));
    rows = [];
  };
  text.split('\n').forEach((line) => {
    if (line.includes(' | ')) {
      flushText();
      rows.push(line.split(' | ').map((cell) => cell.trim()));
    } else {
      flushRows();
      lines.push(line);
    }
  });
  flushRows();
  flushText();
  return parts.filter(Boolean);
}

// Было / стало: два слоя текста, верхний обрезается по положению ползунка.
export function beforeAfter(ba) {
  const chat = (side) => [
    h('div', { class: 'bubble bubble-you' }, h('small', null, t('ba.you')), side.prompt),
    h('div', { class: 'bubble bubble-ai' }, h('small', null, t('ba.ai')), outputParts(side.output)),
  ];
  const before = h('div', { class: 'ba-layer ba-before' }, h('span', { class: 'ba-tag' }, t('ba.before')), chat(ba.before));
  const after = h('div', { class: 'ba-layer ba-after' }, h('span', { class: 'ba-tag ba-tag-right' }, t('ba.after')), chat(ba.after));
  const grip = h('div', {
    class: 'ba-grip',
    role: 'slider',
    tabindex: 0,
    'aria-label': t('ba.slider'),
    'aria-valuemin': 0,
    'aria-valuemax': 100,
  }, h('span', { class: 'ba-arrows', 'aria-hidden': 'true' }, '‹ ›'));
  const handle = h('div', { class: 'ba-handle' }, grip);
  const stage = h('div', { class: 'ba-stage' }, after, before, handle);
  const toBefore = h('button', { type: 'button', class: 'seg', onclick: () => go(100, true) }, t('ba.before'));
  const toAfter = h('button', { type: 'button', class: 'seg', onclick: () => go(0, true) }, t('ba.after'));

  let pos = 74;
  function go(value, animate = false) {
    pos = Math.max(0, Math.min(100, value));
    stage.classList.toggle('animate', animate);
    stage.style.setProperty('--pos', `${pos}%`);
    grip.setAttribute('aria-valuenow', Math.round(pos));
    grip.setAttribute('aria-valuetext', pos > 50 ? t('ba.before') : t('ba.after'));
    toBefore.setAttribute('aria-pressed', String(pos > 50));
    toAfter.setAttribute('aria-pressed', String(pos <= 50));
  }
  go(pos);

  const fromEvent = (e) => {
    const box = stage.getBoundingClientRect();
    return ((e.clientX - box.left) / box.width) * 100;
  };
  const settle = () => {
    if (pos < 10) go(0, true);
    else if (pos > 90) go(100, true);
  };

  let start = null;
  let dragging = false;
  stage.addEventListener('pointerdown', (e) => {
    start = e.clientX;
    dragging = false;
  });
  stage.addEventListener('pointermove', (e) => {
    if (start === null) return;
    if (!dragging && Math.abs(e.clientX - start) > 6) {
      dragging = true;
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {
        // Некоторые браузеры уже отпустили указатель.
      }
    }
    if (dragging) go(fromEvent(e));
  });
  stage.addEventListener('pointerup', (e) => {
    if (start === null) return;
    if (!dragging) go(fromEvent(e), true);
    settle();
    start = null;
    dragging = false;
  });
  stage.addEventListener('pointercancel', () => {
    start = null;
    dragging = false;
  });
  grip.addEventListener('keydown', (e) => {
    const moves = { ArrowLeft: pos - 5, ArrowRight: pos + 5, Home: 0, End: 100 };
    if (e.key in moves) {
      e.preventDefault();
      go(moves[e.key], true);
    }
  });

  return h('figure', { class: 'ba' },
    ba.situation ? h('figcaption', { class: 'ba-situation' }, ba.situation) : null,
    h('div', { class: 'ba-switch', role: 'group', 'aria-label': t('ba.slider') }, toBefore, toAfter),
    stage,
    ba.why ? h('p', { class: 'ba-why' }, ba.why) : null);
}

function scorePatch(score) {
  const tone = score >= 7 ? 'good' : score >= 4 ? 'mid' : 'low';
  return h('div', { class: `score score-${tone}` }, h('strong', null, String(score)), h('span', null, t('checker.of10')));
}

// Отчёт проверки: сначала что добавить, потом что уже получилось.
export function checkerReport(result) {
  const missing = result.results.filter((r) => !r.ok);
  const passed = result.results.filter((r) => r.ok);
  return h('div', { class: 'report' },
    h('div', { class: 'report-head' }, scorePatch(result.score), h('div', null, h('h3', null, result.level.title), h('p', null, result.level.text))),
    result.warnings.map((w) => h('p', { class: 'report-warning' }, w)),
    result.short ? h('p', { class: 'report-note' }, result.shortMessage) : null,
    missing.length ? h('div', null, h('h4', null, t('checker.todo')), h('ul', { class: 'report-list' }, missing.map((r) => h('li', { class: 'miss' }, icon('cross', 18), h('div', null, h('b', null, r.label), h('span', null, `${r.message} ${r.suggestion}`)))))) : null,
    passed.length ? h('div', null, h('h4', null, t('checker.done')), h('ul', { class: 'report-list report-passed' }, passed.map((r) => h('li', { class: 'hit' }, icon('check', 18), h('div', null, h('b', null, r.label), h('span', null, r.message)))))) : null);
}

function savePromptButton(getText, getTitle) {
  return h('button', {
    type: 'button',
    class: 'btn btn-small btn-ghost',
    onclick: () => {
      const text = getText().trim();
      if (!text) {
        toast(t('toast.empty'));
        return;
      }
      savePrompt(getTitle(text), text);
      toast(t('toast.saved'));
    },
  }, icon('save', 18), t('btn.save'));
}

export { savePromptButton };

export const titleFrom = (text) => {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').slice(0, 6).join(' ');
  return words.length < text.trim().length ? `${words}…` : words;
};

// Упражнение: человек пишет промпт и сразу получает разбор.
export async function promptExercise(lesson, onAttempt) {
  const rubric = await rubricFile();
  const ex = lesson.exercise;
  const stored = getState().exercises[lesson.id];
  const area = h('textarea', {
    class: 'field',
    rows: 5,
    placeholder: t('exercise.placeholder'),
    'aria-label': t('exercise.placeholder'),
    value: stored?.text || '',
  });
  const fit = autosize(area);
  const output = h('div', { class: 'report-box', 'aria-live': 'polite' });
  const after = h('div', { class: 'exercise-after', hidden: true });
  let attempted = false;

  const score = () => checkPrompt(area.value, rubric, { skip: ex.skip, hints: ex.hints });
  const show = () => {
    output.replaceChildren(checkerReport(score()));
    after.hidden = false;
  };
  const check = () => {
    if (!area.value.trim()) {
      toast(t('toast.emptyPrompt'));
      area.focus();
      return;
    }
    const result = score();
    attempted = true;
    show();
    update((s) => {
      s.exercises[lesson.id] = { text: area.value, best: Math.max(s.exercises[lesson.id]?.best || 0, result.score) };
    });
    onAttempt(result.score);
  };

  let timer;
  area.addEventListener('input', () => {
    clearTimeout(timer);
    if (!attempted) return;
    timer = setTimeout(() => {
      show();
      update((s) => {
        s.exercises[lesson.id] = { text: area.value, best: Math.max(s.exercises[lesson.id]?.best || 0, score().score) };
      });
    }, 250);
  });

  after.append(
    h('div', { class: 'row' }, copyButton(() => area.value), savePromptButton(() => area.value, () => lesson.title)),
    h('details', { class: 'sample' },
      h('summary', null, t('exercise.sample')),
      h('p', null, ex.sample),
      h('div', { class: 'row' }, copyButton(() => ex.sample))),
  );

  const box = h('section', { class: 'exercise felt' },
    h('h2', null, t('exercise.title')),
    h('p', { class: 'exercise-scenario' }, ex.scenario),
    area,
    h('button', { type: 'button', class: 'btn btn-wide', onclick: check }, t('exercise.check')),
    output,
    after);

  if (stored?.text) {
    attempted = true;
    show();
    setTimeout(fit);
  }
  return box;
}

// Упражнение с выбором: выбрать, проверить, прочитать объяснение к каждому варианту.
export function choiceExercise(lesson, onAttempt) {
  const ex = lesson.exercise;
  const picked = new Set();
  let answered = false;

  const buttons = ex.options.map((option, index) => {
    const why = h('span', { class: 'choice-why', hidden: true }, option.why);
    const button = h('button', {
      type: 'button',
      class: 'choice',
      'aria-pressed': 'false',
      onclick: () => {
        if (answered) return;
        if (!ex.multiple) picked.clear();
        if (picked.has(index)) picked.delete(index);
        else picked.add(index);
        buttons.forEach((b, i) => b.el.setAttribute('aria-pressed', String(picked.has(i))));
        if (!ex.multiple) reveal();
      },
    }, h('span', { class: 'choice-text' }, option.text), why);
    return { el: button, why, option };
  });

  const submit = h('button', { type: 'button', class: 'btn btn-wide', onclick: () => reveal() }, t('exercise.check'));
  const verdict = h('p', { class: 'choice-verdict', 'aria-live': 'polite' });

  function reveal() {
    if (!picked.size) {
      toast(t('toast.pick'));
      return;
    }
    answered = true;
    buttons.forEach(({ el, why, option }, i) => {
      why.hidden = false;
      el.classList.add(option.correct ? 'is-right' : picked.has(i) ? 'is-wrong' : 'is-neutral');
      el.disabled = true;
    });
    const allRight = buttons.every(({ option }, i) => Boolean(option.correct) === picked.has(i));
    verdict.textContent = allRight ? t('exercise.allRight') : t('exercise.partlyRight');
    submit.hidden = true;
    onAttempt(allRight ? 10 : 5);
  }

  return h('section', { class: 'exercise felt' },
    h('h2', null, t('exercise.title')),
    h('p', { class: 'exercise-scenario' }, ex.question),
    ex.multiple ? h('p', { class: 'muted' }, t('exercise.multiple')) : null,
    h('div', { class: 'choices' }, buttons.map((b) => b.el)),
    ex.multiple ? submit : null,
    verdict);
}

// Форма кода доступа. Появляется на странице покупки и на закрытых модулях.
export function codeForm(onSuccess) {
  const input = h('input', {
    class: 'field field-code',
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'characters',
    spellcheck: 'false',
    placeholder: t('code.placeholder'),
    'aria-label': t('code.label'),
  });
  const message = h('p', { class: 'code-message', 'aria-live': 'polite' });
  const form = h('form', {
    class: 'code-form',
    onsubmit: async (e) => {
      e.preventDefault();
      message.className = 'code-message';
      if (!input.value.trim()) {
        message.textContent = t('code.empty');
        message.classList.add('is-bad');
        input.focus();
        return;
      }
      const ok = await tryCode(input.value);
      if (ok) {
        message.textContent = t('code.ok');
        message.classList.add('is-good');
        onSuccess();
      } else {
        message.textContent = t('code.bad');
        message.classList.add('is-bad');
        input.select();
      }
    },
  }, h('label', { class: 'code-label' }, t('code.label')), h('div', { class: 'code-row' }, input, h('button', { type: 'submit', class: 'btn' }, t('code.submit'))), message);
  return form;
}

// Карточка «дальше по билету» для закрытых страниц.
export function lockCard(title, text) {
  return h('section', { class: 'lock felt felt-violet' },
    h('div', { class: 'lock-icon' }, icon('lock', 26)),
    h('h2', null, title),
    h('p', null, text),
    h('a', { class: 'btn btn-wide', href: '#/buy' }, t('lock.buy', { price: config.price.amount })),
    codeForm(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }));
}

// Кнопки «написать мне» с готовым текстом. Без контактов в конфиге показываем честную заметку.
export function messageButtons(getText) {
  const { whatsapp, telegram } = config.contact;
  const open = (url) => {
    const text = getText();
    if (text === null) return;
    window.open(url(encodeURIComponent(text)), '_blank', 'noopener');
  };
  const buttons = [];
  if (whatsapp) {
    buttons.push(h('button', { type: 'button', class: 'btn btn-whatsapp', 'data-channel': 'whatsapp', onclick: () => open((text) => `https://wa.me/${whatsapp}?text=${text}`) }, t('contact.whatsapp')));
  }
  if (telegram) {
    buttons.push(h('button', { type: 'button', class: 'btn btn-telegram', 'data-channel': 'telegram', onclick: () => open((text) => `https://t.me/${telegram}?text=${text}`) }, t('contact.telegram')));
  }
  if (!buttons.length) {
    return h('p', { class: 'report-warning', 'data-contact-missing': true }, t('contact.missing'));
  }
  return h('div', { class: 'row row-stack' }, buttons);
}

export const lessonsCount = (m) => plural('plural.lessons', m.lessons.length);
export { hasAccess };
