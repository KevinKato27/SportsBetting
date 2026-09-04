import { readFile } from 'node:fs/promises';

const file = process.argv[2] ?? 'data/slates/current.json';
const slate = JSON.parse(await readFile(file, 'utf8'));
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const allowedStatuses = new Set(['active', 'no_slate', 'source_error']);

function assert(condition, message) {
  if (!condition) throw new Error(`Slate validation failed: ${message}`);
}

assert(slate.schemaVersion === '1.0', 'unsupported schemaVersion');
assert(isoDate.test(slate.date), 'date must be YYYY-MM-DD');
assert(slate.timezone === 'America/New_York', 'unexpected timezone');
assert(!Number.isNaN(Date.parse(slate.lastVerified)), 'lastVerified must be ISO-8601');
assert(Array.isArray(slate.leagues) && slate.leagues.length > 0, 'leagues must be non-empty');
assert(new Set(slate.leagues.map((league) => league.league)).size === slate.leagues.length, 'league names must be unique');

for (const league of slate.leagues) {
  assert(typeof league.league === 'string' && league.league.length > 0, 'league name missing');
  assert(allowedStatuses.has(league.status), `${league.league} has invalid status`);
  assert(typeof league.source === 'string' && league.source.startsWith('https://'), `${league.league} source missing`);
  assert(typeof league.endpoint === 'string' && league.endpoint.startsWith('https://'), `${league.league} endpoint missing`);
  if (league.status === 'source_error') {
    assert(league.games === null, `${league.league} source errors must not claim a game count`);
  } else {
    assert(Number.isInteger(league.games) && league.games >= 0, `${league.league} games must be a non-negative integer`);
    assert(league.completed + league.live + league.scheduled === league.games, `${league.league} state totals do not match games`);
    assert((league.status === 'active') === (league.games > 0), `${league.league} status disagrees with game count`);
    if (league.games > 0) assert(!Number.isNaN(Date.parse(league.earliestStartIso)), `${league.league} earliest start is invalid`);
  }
}

console.log(`Validated ${file}: ${slate.date}, ${slate.leagues.length} leagues.`);
