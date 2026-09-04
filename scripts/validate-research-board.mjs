import { readFile } from 'node:fs/promises';

const path = process.argv[2] ?? 'data/research-board/current.json';
const board = JSON.parse(await readFile(path, 'utf8'));
const fail = (message) => { throw new Error(`Research board validation failed: ${message}`); };

if (board.schemaVersion !== '0.1') fail('schemaVersion must be 0.1');
if (!/^\d{4}-\d{2}-\d{2}$/.test(board.date)) fail('date must be YYYY-MM-DD');
for (const key of ['realCard', 'activeCandidates', 'paperCandidates']) {
  if (!Array.isArray(board[key])) fail(`${key} must be an array`);
}

for (const item of board.realCard) {
  if (item.status !== 'PLACED_USER_CONFIRMED') fail(`${item.id} is not placement-confirmed`);
  if (!(item.stake > 0)) fail(`${item.id} must have a positive stake`);
  if (!Array.isArray(item.legs) || !item.legs.length) fail(`${item.id} needs at least one leg`);
}

for (const item of [...board.activeCandidates, ...board.paperCandidates]) {
  if (!item.id || !item.entity || !item.market || !item.status) fail('candidate fields are incomplete');
  if (item.legGrade !== null || item.confidence !== null) fail(`${item.id} invents a numeric grade or confidence`);
}

console.log(`Research board valid: ${board.realCard.length} real, ${board.activeCandidates.length} active, ${board.paperCandidates.length} paper.`);
