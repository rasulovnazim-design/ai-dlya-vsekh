import { course, t, lang, plural } from '../i18n.js';
import { h, HORN_PATHS, icon, setTitle } from '../ui.js';
import { getState, moduleDone, progressOf, update } from '../state.js';
import { canOpen } from '../access.js';
import { routeBar } from '../components.js';

const COLORS = ['#F0512F', '#FFC933', '#19B5AC', '#FF8FB1', '#7BCB4B', '#FF9A3D', '#5AA9FF', '#B18CFF'];
const INK = '#1F1A3D';
const PAPER = '#FFF4DC';
const DISPLAY = '"Rubik", system-ui, sans-serif';
const TEXT = '-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function roundRect(ctx, x, y, w, ht, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + ht, r);
  ctx.arcTo(x + w, y + ht, x, y + ht, r);
  ctx.arcTo(x, y + ht, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHorn(ctx, x, y, size, color, width = 9) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  HORN_PATHS.forEach((d) => ctx.stroke(new Path2D(d)));
  ctx.restore();
}

function drawBorder(ctx, W, H) {
  const across = 9;
  const size = W / across;
  const down = Math.round(H / size);
  const sizeY = H / down;
  let n = 0;
  const tile = (col, row) => {
    const x = col * size;
    const y = row * sizeY;
    ctx.fillStyle = COLORS[n % COLORS.length];
    roundRect(ctx, x + 4, y + 4, size - 8, sizeY - 8, 18);
    ctx.fill();
    drawHorn(ctx, x + size * 0.17, y + sizeY * 0.12, size * 0.66, PAPER, 10);
    n += 1;
  };
  for (let c = 0; c < across; c += 1) tile(c, 0);
  for (let r = 1; r < down; r += 1) tile(across - 1, r);
  for (let c = across - 2; c >= 0; c -= 1) tile(c, down - 1);
  for (let r = down - 2; r >= 1; r -= 1) tile(0, r);
  return { size, sizeY };
}

// Подбираем размер шрифта, чтобы имя поместилось в одну-две строки.
function fitName(ctx, name, maxWidth) {
  for (let size = 92; size >= 36; size -= 4) {
    ctx.font = `800 ${size}px ${DISPLAY}`;
    if (ctx.measureText(name).width <= maxWidth) return { size, lines: [name] };
    const words = name.split(/\s+/);
    if (words.length > 1) {
      const middle = Math.ceil(words.length / 2);
      const lines = [words.slice(0, middle).join(' '), words.slice(middle).join(' ')];
      if (lines.every((line) => ctx.measureText(line).width <= maxWidth)) return { size, lines };
    }
  }
  return { size: 36, lines: [name] };
}

async function drawCertificate(canvas, name, dateText, lessonsTotal) {
  try {
    // Шрифт грузится кусками по алфавитам, поэтому просим именно те буквы, что будем рисовать.
    await document.fonts.load(`800 64px ${DISPLAY}`, `${name} ${t('site.name')} ${t('cert.heading')}`);
  } catch {
    // Шрифт не загрузился: сертификат всё равно нарисуется системным.
  }
  const W = 1080;
  const H = 1350;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  const { size, sizeY } = drawBorder(ctx, W, H);

  const inX = size + 26;
  const inY = sizeY + 26;
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 3;
  ctx.setLineDash([16, 12]);
  roundRect(ctx, inX, inY, W - inX * 2, H - inY * 2, 28);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  const cx = W / 2;
  const maxWidth = W - inX * 2 - 70;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  drawHorn(ctx, cx - 55, inY + 34, 110, '#F0512F', 10);

  ctx.fillStyle = INK;
  ctx.font = `800 64px ${DISPLAY}`;
  ctx.fillText(t('cert.heading'), cx, inY + 216);

  ctx.font = `500 30px ${TEXT}`;
  ctx.fillText(t('cert.givenTo'), cx, inY + 276);

  const fit = fitName(ctx, name, maxWidth);
  ctx.font = `800 ${fit.size}px ${DISPLAY}`;
  let y = inY + 306 + fit.size;
  fit.lines.forEach((line) => {
    ctx.fillStyle = INK;
    ctx.fillText(line, cx, y);
    y += fit.size * 1.1;
  });
  y -= fit.size * 1.1;

  ctx.fillStyle = '#F0512F';
  roundRect(ctx, cx - 70, y + 34, 140, 10, 5);
  ctx.fill();

  ctx.fillStyle = INK;
  ctx.font = `500 30px ${TEXT}`;
  ctx.fillText(t('cert.forRoute'), cx, y + 102);
  ctx.font = `800 58px ${DISPLAY}`;
  ctx.fillText(t('site.name'), cx, y + 168);

  const body = [t('cert.line1', { lessons: plural('plural.lessons', lessonsTotal) }), t('cert.line2'), t('cert.line3')];
  // Системный шрифт на разных телефонах разной ширины: уменьшаем, пока самая длинная строка не войдёт.
  let bodySize = 28;
  ctx.font = `500 ${bodySize}px ${TEXT}`;
  while (bodySize > 20 && body.some((line) => ctx.measureText(line).width > maxWidth)) {
    bodySize -= 1;
    ctx.font = `500 ${bodySize}px ${TEXT}`;
  }
  body.forEach((line, i) => ctx.fillText(line, cx, y + 222 + i * 40));

  ctx.font = `500 26px ${TEXT}`;
  ctx.globalAlpha = 0.75;
  ctx.fillText(dateText, cx, H - inY - 36);
  ctx.globalAlpha = 1;
}

export default async function certificate() {
  setTitle(t('cert.title'));
  const data = await course();
  const progress = progressOf(data.modules);
  const allDone = data.modules.every(moduleDone);

  if (!allDone) {
    const todo = data.modules.filter((m) => !moduleDone(m));
    return h('div', { class: 'page cert' },
      h('h1', null, t('cert.title')),
      h('p', { class: 'lead' }, t('cert.lockedLead')),
      routeBar(progress.percent, t('progress.label')),
      h('p', { class: 'muted' }, t('home.progress', { percent: progress.percent })),
      h('h2', { class: 'section-label' }, t('cert.todo')),
      h('ul', { class: 'lesson-list' }, todo.map((m) => h('li', null,
        h('a', { class: 'lesson-row', href: `#/module/${m.id}` },
          h('span', { class: 'lesson-num' }, canOpen(m.id) ? String(m.id) : icon('lock', 18)),
          h('span', { class: 'lesson-name' }, m.title))))));
  }

  const state = getState();
  const lessonsTotal = data.modules.reduce((n, m) => n + m.lessons.length, 0);
  if (!state.certDate) {
    update((s) => {
      s.certDate = new Date().toISOString();
    });
  }
  const dateText = new Date(getState().certDate).toLocaleDateString(lang() === 'ru' ? 'ru-RU' : lang(), { day: 'numeric', month: 'long', year: 'numeric' });

  const canvas = document.createElement('canvas');
  const preview = h('img', { class: 'cert-image', alt: t('cert.alt'), hidden: true });
  const save = h('a', { class: 'btn btn-wide', download: 'sertifikat-ii-dlya-vsekh.png', hidden: true, href: '#' }, t('cert.save'));
  const share = h('button', { type: 'button', class: 'btn btn-wide btn-ghost', hidden: true }, t('cert.share'));
  const input = h('input', {
    id: 'cert-name',
    class: 'field',
    type: 'text',
    maxlength: 60,
    autocomplete: 'name',
    placeholder: t('cert.namePlaceholder'),
    value: state.name || '',
  });
  const hint = h('p', { class: 'muted', hidden: true }, t('cert.hint'));
  let blobUrl = null;
  let blob = null;

  const render = async () => {
    const name = input.value.trim();
    if (!name) {
      preview.hidden = true;
      save.hidden = true;
      share.hidden = true;
      hint.hidden = true;
      return;
    }
    update((s) => {
      s.name = name;
    });
    await drawCertificate(canvas, name, dateText, lessonsTotal);
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(blob);
    preview.src = blobUrl;
    preview.hidden = false;
    save.href = blobUrl;
    save.hidden = false;
    hint.hidden = false;
    const file = new File([blob], 'sertifikat-ii-dlya-vsekh.png', { type: 'image/png' });
    share.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
    share.onclick = () => navigator.share({ files: [file], title: t('cert.heading') }).catch(() => {});
  };

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(render, 250);
  });
  setTimeout(render);

  return h('div', { class: 'page cert' },
    h('h1', null, t('cert.doneTitle')),
    h('p', { class: 'lead' }, t('cert.doneLead')),
    h('div', { class: 'form-row' }, h('label', { for: 'cert-name' }, t('cert.nameLabel')), input),
    preview,
    save,
    share,
    hint);
}
