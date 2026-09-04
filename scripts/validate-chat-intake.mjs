import { readFile } from 'node:fs/promises';

const inputPath = process.argv[2] ?? 'data/chat-intake/current.json';
const intake = JSON.parse(await readFile(inputPath, 'utf8'));
const history = JSON.parse(await readFile('data/history/edge_lab_full_history.json', 'utf8'));
const allowedStatuses = new Set(['PLACED_USER_CONFIRMED', 'RECOMMENDED_NOT_CONFIRMED', 'INCOMPLETE_RESEARCH_BUILD', 'HOLD_FOR_RECHECK']);
const allowedOrigins = new Set(['INDEPENDENT', 'SUPPLIED', 'BOTH']);
const allowedVerification = new Set(['NEEDS_RECHECK', 'PARTIALLY_VERIFIED', 'VERIFIED']);
const forbiddenKeys = /thread.?id|conversation.?id|transcript|private.?url|account.?id/i;

if (intake.schemaVersion !== '0.1') throw new Error('Unsupported chat intake schema version.');
if (!/^\d{4}-\d{2}-\d{2}$/.test(intake.date)) throw new Error('Chat intake date must be YYYY-MM-DD.');
if (intake.publicExport !== true) throw new Error('Public chat intake must record explicit export authorization.');
if (!Array.isArray(intake.slips)) throw new Error('Chat intake slips must be an array.');

const ids = new Set();
for (const slip of intake.slips) {
  if (!slip.id || ids.has(slip.id)) throw new Error(`Missing or duplicate slip id: ${slip.id}`);
  ids.add(slip.id);
  if (slip.date !== intake.date) throw new Error(`${slip.id} is not from the current intake date.`);
  if (!allowedStatuses.has(slip.status)) throw new Error(`${slip.id} has an unsupported status.`);
  if (!allowedOrigins.has(slip.origin)) throw new Error(`${slip.id} has an unsupported origin.`);
  if (!allowedVerification.has(slip.verificationStatus)) throw new Error(`${slip.id} has an unsupported verification status.`);
  if (!slip.sourceLabel || !slip.sourceTurnTime) throw new Error(`${slip.id} is missing public-safe source metadata.`);
  if (!Array.isArray(slip.legs) || slip.legs.length === 0) throw new Error(`${slip.id} must contain at least one leg.`);
  for (const leg of slip.legs) {
    for (const field of ['entity', 'event', 'market', 'side', 'status']) {
      if (!leg[field]) throw new Error(`${slip.id} has a leg missing ${field}.`);
    }
  }
}

function scan(value, path = 'root') {
  if (Array.isArray(value)) return value.forEach((item, index) => scan(item, `${path}[${index}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.test(key)) throw new Error(`Private field ${path}.${key} is not allowed in public intake.`);
    scan(child, `${path}.${key}`);
  }
}

scan(intake);
const realDescriptions = history['Ticket Log'].filter((ticket) => ticket.Date === intake.date).map((ticket) => `${ticket.Description} ${ticket['Execution Note']}`.toLowerCase());
for (const slip of intake.slips.filter((item) => item.status === 'PLACED_USER_CONFIRMED')) {
  const entities = slip.legs.map((leg) => leg.entity.toLowerCase());
  if (!realDescriptions.some((description) => entities.every((entity) => description.includes(entity)))) {
    throw new Error(`${slip.id} is user-confirmed but missing from today’s Ticket Log.`);
  }
}
console.log(`Validated ${intake.slips.length} public-safe chat intake slips for ${intake.date}.`);
