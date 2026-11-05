import config from '../../../config.js';
import { course, quizFile, t } from '../i18n.js';
import { h, icon, setTitle, shuffle } from '../ui.js';
import { saveQuiz } from '../state.js';
import { canOpen, hasAccess } from '../access.js';
import { lockCard } from '../components.js';

export default async function quizView(id) {
  const data = await course();
  const moduleId = Number(id);
  const m = data.modules.find((x) => x.id === moduleId);
  if (!m) return null;
  const quiz = await quizFile(moduleId);
  setTitle(quiz.title);

  const back = h('a', { class: 'back', href: `#/module/${m.id}` }, icon('back', 18), t('home.stop', { n: m.id }));
  if (!canOpen(m.id)) {
    return h('div', { class: 'page' }, back, h('h1', null, quiz.title), lockCard(t('lock.title'), t('lock.moduleText')));
  }

  const stage = h('div', { class: 'quiz-stage' });
  const root = h('div', { class: `page quiz theme-${m.color}` }, back, h('h1', null, quiz.title), stage);

  let index = 0;
  let correct = 0;

  function question() {
    const q = quiz.questions[index];
    const explain = h('div', { class: 'quiz-explain', hidden: true });
    const options = shuffle(q.options.map((text, i) => ({ text, right: i === q.correct })));
    const dots = h('div', { class: 'quiz-dots', 'aria-hidden': 'true' }, quiz.questions.map((_, i) => h('span', { class: i < index ? 'is-past' : i === index ? 'is-now' : '' })));

    const buttons = options.map((option) => h('button', {
      type: 'button',
      class: 'choice',
      onclick: (e) => {
        buttons.forEach((b, i) => {
          b.disabled = true;
          if (options[i].right) b.classList.add('is-right');
        });
        if (option.right) correct += 1;
        else e.currentTarget.classList.add('is-wrong');
        explain.hidden = false;
        explain.append(
          h('p', null, h('strong', null, option.right ? t('quiz.right') : t('quiz.wrong')), ` ${q.explain}`),
          h('button', {
            type: 'button',
            class: 'btn btn-wide',
            onclick: () => {
              index += 1;
              if (index < quiz.questions.length) question();
              else result();
            },
          }, index + 1 < quiz.questions.length ? t('quiz.next') : t('quiz.finish'), icon('arrow')),
        );
      },
    }, h('span', { class: 'choice-text' }, option.text)));

    stage.replaceChildren(
      dots,
      h('p', { class: 'muted' }, t('quiz.count', { n: index + 1, total: quiz.questions.length })),
      h('h2', { class: 'quiz-q' }, q.q),
      h('div', { class: 'choices' }, buttons),
      explain,
    );
    window.scrollTo(0, 0);
  }

  function result() {
    const total = quiz.questions.length;
    const passed = (correct / total) * 100 >= config.quizPassPercent;
    saveQuiz(moduleId, correct, total, passed);
    const next = data.modules.find((x) => x.id === moduleId + 1);
    let cta;
    if (!passed) cta = null;
    else if (!next) cta = h('a', { class: 'btn btn-wide', href: '#/certificate' }, t('quiz.toCertificate'), icon('arrow'));
    else if (canOpen(next.id)) cta = h('a', { class: 'btn btn-wide', href: `#/module/${next.id}` }, t('quiz.nextStop'), icon('arrow'));
    else cta = h('a', { class: 'btn btn-wide', href: '#/buy' }, t('quiz.toBuy'), icon('arrow'));

    const parts = [
      h('section', { class: `quiz-result felt ${passed ? `felt-${m.color}` : 'felt-sand'}` },
        h('p', { class: 'quiz-score' }, h('strong', null, String(correct)), h('span', null, `/${total}`)),
        h('h2', null, passed ? t('quiz.passedTitle') : t('quiz.failedTitle')),
        h('p', null, passed ? t('quiz.passedText') : t('quiz.failedText'))),
      cta,
      next && !canOpen(next.id) && passed && !hasAccess() ? h('p', { class: 'muted' }, t('quiz.freeEnd')) : null,
      h('button', {
        type: 'button',
        class: 'btn btn-wide btn-ghost',
        onclick: () => {
          index = 0;
          correct = 0;
          question();
        },
      }, t('quiz.retry')),
      h('a', { class: 'link-quiet', href: `#/module/${m.id}` }, t('quiz.backToModule')),
    ];
    stage.replaceChildren(...parts.filter(Boolean));
    window.scrollTo(0, 0);
  }

  question();
  return root;
}
