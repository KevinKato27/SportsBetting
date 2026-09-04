import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TIMEZONE = 'America/New_York';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'data', 'slates');
const requestedDate = process.argv.find((arg) => arg.startsWith('--date='))?.split('=')[1];
const date = requestedDate ?? new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Use --date=YYYY-MM-DD.');

const compactDate = date.replaceAll('-', '');
const now = new Date();

async function fetchJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'User-Agent': 'OVERLAY-v0.1-data-audit' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function localDate(iso) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

function earliestStart(events) {
  const starts = events.map((event) => Date.parse(event.date)).filter(Number.isFinite).sort((a, b) => a - b);
  if (!starts.length) return null;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(starts[0]));
}

function earliestStartIso(events) {
  return events.map((event) => event.date).filter((value) => value && Number.isFinite(Date.parse(value))).sort()[0] ?? null;
}

function summarizedLeague({ league, provider, source, endpoint, events }) {
  const exactDateEvents = events.filter((event) => event.date && localDate(event.date) === date);
  const completed = exactDateEvents.filter((event) => event.completed).length;
  const live = exactDateEvents.filter((event) => event.state === 'in').length;
  const games = exactDateEvents.length;
  return {
    league,
    status: games > 0 ? 'active' : 'no_slate',
    games,
    completed,
    live,
    scheduled: games - completed - live,
    earliestStart: earliestStart(exactDateEvents),
    earliestStartIso: earliestStartIso(exactDateEvents),
    provider,
    source,
    endpoint,
    sourceVerifiedAt: now.toISOString(),
  };
}

async function mlb() {
  const endpoint = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`;
  const payload = await fetchJson(endpoint);
  const games = (payload.dates ?? []).flatMap((day) => day.games ?? []).map((game) => ({
    date: game.gameDate,
    completed: Boolean(game.status?.abstractGameState === 'Final'),
    state: game.status?.abstractGameState === 'Live' ? 'in' : 'pre',
  }));
  return summarizedLeague({
    league: 'MLB',
    provider: 'MLB Stats API',
    source: `https://www.mlb.com/schedule/${date}`,
    endpoint,
    events: games,
  });
}

const espnLeagues = [
  ['CFB', 'football', 'college-football', 'college-football'],
  ['NFL', 'football', 'nfl', 'nfl'],
  ['WNBA', 'basketball', 'wnba', 'wnba'],
  ['NBA', 'basketball', 'nba', 'nba'],
  ['NHL', 'hockey', 'nhl', 'nhl'],
];

async function espn([league, sport, slug, pageSlug]) {
  const endpoint = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${slug}/scoreboard?dates=${compactDate}&limit=200`;
  const payload = await fetchJson(endpoint);
  const events = (payload.events ?? []).map((event) => ({
    date: event.date,
    completed: Boolean(event.status?.type?.completed),
    state: event.status?.type?.state,
  }));
  return summarizedLeague({
    league,
    provider: 'ESPN Scoreboard API',
    source: `https://www.espn.com/${pageSlug}/scoreboard/_/date/${compactDate}`,
    endpoint,
    events,
  });
}

function sourceError(league, provider, source, endpoint, error) {
  return {
    league,
    status: 'source_error',
    games: null,
    completed: null,
    live: null,
    scheduled: null,
    earliestStart: null,
    earliestStartIso: null,
    provider,
    source,
    endpoint,
    sourceVerifiedAt: null,
    error: error instanceof Error ? error.message : String(error),
  };
}

const jobs = [
  { league: 'MLB', run: mlb, provider: 'MLB Stats API', source: `https://www.mlb.com/schedule/${date}`, endpoint: `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}` },
  ...espnLeagues.map((definition) => ({
    league: definition[0],
    run: () => espn(definition),
    provider: 'ESPN Scoreboard API',
    source: `https://www.espn.com/${definition[3]}/scoreboard/_/date/${compactDate}`,
    endpoint: `https://site.api.espn.com/apis/site/v2/sports/${definition[1]}/${definition[2]}/scoreboard?dates=${compactDate}&limit=200`,
  })),
];

const settled = await Promise.allSettled(jobs.map((job) => job.run()));
const leagues = settled.map((result, index) => result.status === 'fulfilled'
  ? result.value
  : sourceError(jobs[index].league, jobs[index].provider, jobs[index].source, jobs[index].endpoint, result.reason));

const errors = leagues.filter((league) => league.status === 'source_error').map((league) => `${league.league}: ${league.error}`);
const activeGames = leagues.reduce((sum, league) => sum + (league.games ?? 0), 0);
const slate = {
  schemaVersion: '1.0',
  date,
  timezone: TIMEZONE,
  lastVerified: now.toISOString(),
  gate: 'PRELIMINARY',
  activeGames,
  leagues,
  dataAvailability: {
    schedules: errors.length ? 'partial' : 'verified',
    results: errors.length ? 'partial' : 'verified',
    odds: 'unavailable',
    lineups: 'unavailable',
    injuries: 'unavailable',
    weather: 'unavailable',
    promos: 'unavailable',
    bankroll: 'historical_only',
    gptGrades: 'unavailable',
  },
  errors,
  note: `${activeGames} schedule entries found across ${leagues.filter((league) => league.status === 'active').length} active leagues. Schedule and result facts are collected separately from betting inputs. No wager may become FINAL from this file.`,
};

await mkdir(OUT_DIR, { recursive: true });
const serialized = `${JSON.stringify(slate, null, 2)}\n`;
await Promise.all([
  writeFile(path.join(OUT_DIR, `${date}.json`), serialized),
  writeFile(path.join(OUT_DIR, 'current.json'), serialized),
]);

console.log(`Updated ${date}: ${activeGames} games, ${errors.length} source errors.`);
if (errors.length === leagues.length) process.exitCode = 1;
