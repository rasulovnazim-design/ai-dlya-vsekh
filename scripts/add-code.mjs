// Новые коды доступа.
//   node scripts/add-code.mjs              один случайный код
//   node scripts/add-code.mjs 10           десять кодов
//   node scripts/add-code.mjs 5 "Айгуль"   пять кодов с пометкой, для кого они
//
// В config.js попадает только хэш, сам код в репозиторий не попадает. Открытые коды
// дописываются в codes.local.txt (этот файл в .gitignore): храните его у себя.
import { createHash, randomInt } from 'node:crypto';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const configPath = fileURLToPath(new URL('../config.js', import.meta.url));
const localPath = fileURLToPath(new URL('../codes.local.txt', import.meta.url));

// Только символы, которые выглядят одинаково в обеих раскладках, плюс цифры без 0 и 1:
// код можно набрать и на русской клавиатуре, сайт сам приведёт кириллицу к латинице.
const ALPHABET = 'ABCEHKMPTX23456789';
const pick = (n) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
const makeCode = () => `${pick(4)}-${pick(4)}-${pick(4)}`;

const count = Number(process.argv[2]) || 1;
const label = (process.argv[3] || '').replace(/[\r\n]/g, ' ');

let config = readFileSync(configPath, 'utf8');
const salt = config.match(/salt:\s*'([^']+)'/)[1];
const date = new Date().toISOString().slice(0, 10);
const hashOf = (code) => createHash('sha256').update(salt + code.replace(/[^A-Z0-9]/g, '')).digest('hex');

const codes = Array.from({ length: count }, makeCode);
const lines = codes.map((code) => `      '${hashOf(code)}', // ${date}${label ? ` ${label}` : ''}`).join('\n');
config = config.replace(/^(\s*)\/\/ КОДЫ-КОНЕЦ/m, `${lines}\n$1// КОДЫ-КОНЕЦ`);
writeFileSync(configPath, config);

appendFileSync(localPath, codes.map((code) => `${code}\t${date}\t${label}\n`).join(''));

console.log(codes.join('\n'));
console.log(`\nГотово: ${count} шт. Хэши добавлены в config.js, коды записаны в codes.local.txt.`);
console.log('Чтобы коды заработали на сайте: git add config.js, git commit, git push.');
