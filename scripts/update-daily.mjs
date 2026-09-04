import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TIMEZONE = 'America/New_York';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'data', 'slates');
const sportsScope = JSON.parse(await readFile(path.join(ROOT, 'config', 'sports-scope.v0.2.json'), 'utf8'));
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

function summarizedLeague({ sport, league, provider, source, endpoint, events }) {
  const exactDateEvents = events.filter((event) => event.date && localDate(event.date) === date);
  const completed = exactDateEvents.filter((event) => event.completed).length;
  const live = exactDateEvents.filter((event) => event.state === 'in').length;
  const games = exactDateEvents.length;
  return {
    sport,
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
    events: exactDateEvents.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

async function mlb() {
  const endpoint = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}&hydrate=probablePitcher,team,venue`;
  const payload = await fetchJson(endpoint);
  const games = (payload.dates ?? []).flatMap((day) => day.games ?? []).map((game) => ({
    id: `mlb-${game.gamePk}`,
    date: game.gameDate,
    completed: Boolean(game.status?.abstractGameState === 'Final'),
    state: game.status?.abstractGameState === 'Final' ? 'post' : game.status?.abstractGameState === 'Live' ? 'in' : 'pre',
    status: game.status?.detailedState ?? game.status?.abstractGameState ?? 'Scheduled',
    name: `${game.teams?.away?.team?.name ?? 'Away'} at ${game.teams?.home?.team?.name ?? 'Home'}`,
    shortName: `${game.teams?.away?.team?.abbreviation ?? 'AWAY'} @ ${game.teams?.home?.team?.abbreviation ?? 'HOME'}`,
    competitors: [
      {
        side: 'away',
        name: game.teams?.away?.team?.name ?? 'Away',
        abbreviation: game.teams?.away?.team?.abbreviation ?? null,
        score: game.teams?.away?.score ?? null,
        record: game.teams?.away?.leagueRecord ? `${game.teams.away.leagueRecord.wins}-${game.teams.away.leagueRecord.losses}` : null,
      },
      {
        side: 'home',
        name: game.teams?.home?.team?.name ?? 'Home',
        abbreviation: game.teams?.home?.team?.abbreviation ?? null,
        score: game.teams?.home?.score ?? null,
        record: game.teams?.home?.leagueRecord ? `${game.teams.home.leagueRecord.wins}-${game.teams.home.leagueRecord.losses}` : null,
      },
    ],
    venue: game.venue?.name ?? null,
    probablePitchers: {
      away: game.teams?.away?.probablePitcher?.fullName ?? null,
      home: game.teams?.home?.probablePitcher?.fullName ?? null,
    },
    broadcasts: [],
    source: `https://www.mlb.com/gameday/${game.gamePk}`,
  }));
  return summarizedLeague({
    sport: 'Baseball',
    league: 'MLB',
    provider: 'MLB Stats API',
    source: `https://www.mlb.com/schedule/${date}`,
    endpoint,
    events: games,
  });
}

const espnLeagues = [
  { league: 'CFB', sport: 'Football', apiSport: 'football', slug: 'college-football', pageSlug: 'college-football' },
  { league: 'NFL', sport: 'Football', apiSport: 'football', slug: 'nfl', pageSlug: 'nfl' },
  { league: 'WNBA', sport: 'Basketball', apiSport: 'basketball', slug: 'wnba', pageSlug: 'wnba' },
  { league: 'NBA', sport: 'Basketball', apiSport: 'basketball', slug: 'nba', pageSlug: 'nba' },
  { league: 'NHL', sport: 'Hockey', apiSport: 'hockey', slug: 'nhl', pageSlug: 'nhl' },
  ...sportsScope.soccer.included.map((competition) => ({
    league: competition.league,
    sport: 'Soccer',
    apiSport: 'soccer',
    slug: competition.espnSlug,
    pageSlug: 'soccer',
    sourceLeague: competition.espnSlug,
  })),
];

function espnSource(definition) {
  return definition.apiSport === 'soccer'
    ? `https://www.espn.com/soccer/scoreboard/_/league/${definition.sourceLeague}/date/${compactDate}`
    : `https://www.espn.com/${definition.pageSlug}/scoreboard/_/date/${compactDate}`;
}

async function espn(definition) {
  const endpoint = `https://site.api.espn.com/apis/site/v2/sports/${definition.apiSport}/${definition.slug}/scoreboard?dates=${compactDate}&limit=200`;
  const payload = await fetchJson(endpoint);
  const events = (payload.events ?? []).map((event) => {
    const competition = event.competitions?.[0] ?? {};
    const competitors = (competition.competitors ?? []).map((competitor) => ({
      side: competitor.homeAway ?? null,
      name: competitor.team?.displayName ?? competitor.team?.name ?? 'Unknown team',
      abbreviation: competitor.team?.abbreviation ?? null,
      score: competitor.score ?? null,
      record: competitor.records?.[0]?.summary ?? null,
    }));
    return {
      id: `${definition.slug}-${event.id}`,
      date: event.date,
      completed: Boolean(event.status?.type?.completed),
      state: event.status?.type?.state,
      status: event.status?.type?.shortDetail ?? event.status?.type?.detail ?? 'Scheduled',
      name: event.name ?? event.shortName ?? definition.league,
      shortName: event.shortName ?? event.name ?? definition.league,
      competitors,
      venue: competition.venue?.fullName ?? null,
      probablePitchers: null,
      broadcasts: (competition.broadcasts ?? []).flatMap((broadcast) => broadcast.names ?? []),
      source: event.links?.find((link) => link.rel?.includes('summary'))?.href ?? espnSource(definition),
    };
  });
  return summarizedLeague({
    sport: definition.sport,
    league: definition.league,
    provider: 'ESPN Scoreboard API',
    source: espnSource(definition),
    endpoint,
    events,
  });
}

function sourceError(sport, league, provider, source, endpoint, error) {
  return {
    sport,
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
    events: [],
    error: error instanceof Error ? error.message : String(error),
  };
}

const jobs = [
  { sport: 'Baseball', league: 'MLB', run: mlb, provider: 'MLB Stats API', source: `https://www.mlb.com/schedule/${date}`, endpoint: `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}` },
  ...espnLeagues.map((definition) => ({
    sport: definition.sport,
    league: definition.league,
    run: () => espn(definition),
    provider: 'ESPN Scoreboard API',
    source: espnSource(definition),
    endpoint: `https://site.api.espn.com/apis/site/v2/sports/${definition.apiSport}/${definition.slug}/scoreboard?dates=${compactDate}&limit=200`,
  })),
];

const settled = await Promise.allSettled(jobs.map((job) => job.run()));
const leagues = settled.map((result, index) => result.status === 'fulfilled'
  ? result.value
  : sourceError(jobs[index].sport, jobs[index].league, jobs[index].provider, jobs[index].source, jobs[index].endpoint, result.reason));

const errors = leagues.filter((league) => league.status === 'source_error').map((league) => `${league.league}: ${league.error}`);
const activeGames = leagues.reduce((sum, league) => sum + (league.games ?? 0), 0);
const slate = {
  schemaVersion: '1.1',
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
  soccerScope: {
    configVersion: sportsScope.version,
    trackingMode: sportsScope.soccer.trackingMode,
    included: sportsScope.soccer.included.map((competition) => competition.league),
    excluded: sportsScope.soccer.excluded,
    analysisGate: sportsScope.soccer.analysisGate,
  },
  note: `${activeGames} schedule entries found across ${leagues.filter((league) => league.status === 'active').length} active leagues. Soccer is limited to the European Big Five plus UEFA Champions League and Europa League; MLS and the Saudi Pro League are excluded. Schedule and result facts are collected separately from betting inputs. No wager may become FINAL from this file.`,
};

await mkdir(OUT_DIR, { recursive: true });
const serialized = `${JSON.stringify(slate, null, 2)}\n`;
await Promise.all([
  writeFile(path.join(OUT_DIR, `${date}.json`), serialized),
  writeFile(path.join(OUT_DIR, 'current.json'), serialized),
]);

console.log(`Updated ${date}: ${activeGames} games, ${errors.length} source errors.`);
if (errors.length === leagues.length) process.exitCode = 1;
