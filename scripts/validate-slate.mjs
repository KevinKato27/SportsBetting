import { readFile } from 'node:fs/promises';

const file = process.argv[2] ?? 'data/slates/current.json';
const slate = JSON.parse(await readFile(file, 'utf8'));
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const allowedStatuses = new Set(['active', 'no_slate', 'source_error']);
const soccerScope = ['EPL', 'LA LIGA', 'BUNDESLIGA', 'SERIE A', 'LIGUE 1', 'UCL', 'UEL'];

function assert(condition, message) {
  if (!condition) throw new Error(`Slate validation failed: ${message}`);
}

assert(slate.schemaVersion === '1.1', 'unsupported schemaVersion');
assert(isoDate.test(slate.date), 'date must be YYYY-MM-DD');
assert(slate.timezone === 'America/New_York', 'unexpected timezone');
assert(!Number.isNaN(Date.parse(slate.lastVerified)), 'lastVerified must be ISO-8601');
assert(Array.isArray(slate.leagues) && slate.leagues.length > 0, 'leagues must be non-empty');
assert(new Set(slate.leagues.map((league) => league.league)).size === slate.leagues.length, 'league names must be unique');

for (const league of slate.leagues) {
  assert(typeof league.sport === 'string' && league.sport.length > 0, `${league.league} sport missing`);
  assert(typeof league.league === 'string' && league.league.length > 0, 'league name missing');
  assert(allowedStatuses.has(league.status), `${league.league} has invalid status`);
  assert(typeof league.source === 'string' && league.source.startsWith('https://'), `${league.league} source missing`);
  assert(typeof league.endpoint === 'string' && league.endpoint.startsWith('https://'), `${league.league} endpoint missing`);
  if (league.status === 'source_error') {
    assert(league.games === null, `${league.league} source errors must not claim a game count`);
    assert(Array.isArray(league.events) && league.events.length === 0, `${league.league} source errors must not contain events`);
  } else {
    assert(Number.isInteger(league.games) && league.games >= 0, `${league.league} games must be a non-negative integer`);
    assert(league.completed + league.live + league.scheduled === league.games, `${league.league} state totals do not match games`);
    assert((league.status === 'active') === (league.games > 0), `${league.league} status disagrees with game count`);
    if (league.games > 0) assert(!Number.isNaN(Date.parse(league.earliestStartIso)), `${league.league} earliest start is invalid`);
    assert(Array.isArray(league.events) && league.events.length === league.games, `${league.league} event detail count must match games`);
    for (const event of league.events) {
      assert(typeof event.id === 'string' && event.id.length > 0, `${league.league} event id missing`);
      assert(!Number.isNaN(Date.parse(event.date)), `${event.id} date is invalid`);
      assert(typeof event.name === 'string' && event.name.length > 0, `${event.id} name missing`);
      assert(Array.isArray(event.competitors) && event.competitors.length >= 2, `${event.id} competitors missing`);
      assert(typeof event.source === 'string' && event.source.startsWith('https://'), `${event.id} source missing`);
    }
  }
}

assert(JSON.stringify(slate.soccerScope?.included) === JSON.stringify(soccerScope), 'major soccer scope changed');
assert(JSON.stringify(slate.soccerScope?.excluded) === JSON.stringify(['MLS', 'SAUDI PRO LEAGUE']), 'soccer exclusions changed');
assert(!slate.leagues.some((league) => ['MLS', 'SAUDI PRO LEAGUE'].includes(league.league)), 'excluded soccer league present');

console.log(`Validated ${file}: ${slate.date}, ${slate.leagues.length} leagues.`);
