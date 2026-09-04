import { readFile } from 'node:fs/promises';

const inputPath = process.argv[2] ?? 'data/morning-scan/current.json';
const scan = JSON.parse(await readFile(inputPath, 'utf8'));
const allowedStatuses = new Set(['PENDING_NEXT_MORNING_RUN', 'COMPLETE', 'PARTIAL', 'SOURCE_ERROR']);
const allowedOrigins = new Set(['INDEPENDENT', 'SUPPLIED', 'BOTH']);

if (scan.schemaVersion !== '0.1') throw new Error('Unsupported morning scan schema version.');
if (!/^\d{4}-\d{2}-\d{2}$/.test(scan.date)) throw new Error('Morning scan date must be YYYY-MM-DD.');
if (!allowedStatuses.has(scan.status)) throw new Error('Unsupported morning scan status.');
if (!Array.isArray(scan.games) || !Array.isArray(scan.candidates) || !Array.isArray(scan.sources)) throw new Error('Morning scan arrays are missing.');
if (scan.excluded?.includes('MLS') !== true || scan.excluded?.includes('Saudi Pro League') !== true) throw new Error('Excluded soccer leagues must remain explicit.');
if (scan.status === 'COMPLETE' && !scan.generatedAt) throw new Error('A completed morning scan needs a generation time.');

for (const game of scan.games) {
  if (!game.id || !game.sport || !game.event || !game.startTime || !game.projectionStatus) throw new Error('Morning scan game is missing a required field.');
  if (game.projectionStatus === 'CONFIRMED') throw new Error(`${game.id} cannot label a prospective lineup as confirmed.`);
  if (!Array.isArray(game.projectedParticipants) || !Array.isArray(game.sources)) throw new Error(`${game.id} is missing projected participants or sources.`);
}

for (const candidate of scan.candidates) {
  if (!candidate.id || !candidate.entity || !candidate.marketFamily || !allowedOrigins.has(candidate.origin)) throw new Error('Morning candidate is missing a required field.');
  if (candidate.draftKingsPrice !== null && candidate.sportsbook !== 'DraftKings') throw new Error(`${candidate.id} has a price without the matching sportsbook.`);
}

console.log(`Validated morning scan for ${scan.date}: ${scan.games.length} games and ${scan.candidates.length} candidates.`);
