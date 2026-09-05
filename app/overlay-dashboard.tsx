'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Beaker,
  BookOpenCheck,
  Bot,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  Database,
  FileInput,
  FlaskConical,
  Gauge,
  History as HistoryIcon,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LockKeyhole,
  MapPin,
  Menu,
  Radio,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  Tv,
  WalletCards,
  X,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import history from '@/data/history/edge_lab_full_history.json';
import slate from '@/data/slates/current.json';
import chatIntake from '@/data/chat-intake/current.json';
import morningScan from '@/data/morning-scan/current.json';
import researchBoard from '@/data/research-board/current.json';
import models from '@/config/scoring/market-models.v0.1.json';
import sportsbooks from '@/config/sportsbooks.v0.1.json';
import discoveryPolicy from '@/config/candidate-discovery-policy.v0.2.json';
import promptStack from '@/config/prompt-stack.v4.3.json';

type Row = Record<string, string>;
type SlateEvent = {
  id: string;
  date: string;
  completed: boolean;
  state: string;
  status: string;
  name: string;
  shortName: string;
  competitors: { side: string | null; name: string; abbreviation: string | null; score: string | number | null; record: string | null }[];
  venue: string | null;
  probablePitchers: { away: string | null; home: string | null } | null;
  broadcasts: string[];
  source: string;
  sport: string;
  league: string;
  provider: string;
};
type MorningParticipant = { name: string; role: string; basis: string };
type MorningGame = { id: string; sport: string; league: string; event: string; projectionStatus: string; projectedParticipants: MorningParticipant[] };

const metrics = [
  { name: 'Opportunity', raw: 92, confidence: 80, weight: 14, values: 'Leadoff role shown in reference', note: 'Reference input only; today’s lineup is unavailable.', source: 'User-supplied dashboard mockup' },
  { name: 'Matchup', raw: 86, confidence: 75, weight: 12, values: 'RHP · hard-hit note in reference', note: 'Reference matchup only; today’s opponent is unverified.', source: 'User-supplied dashboard mockup' },
  { name: 'Pitch-Type Fit', raw: 94, confidence: 80, weight: 14, values: '4-seam .412 xwOBA · slider .298', note: 'The supplied reference shows these pitch-band results.', source: 'User-supplied pitch-type mockup' },
  { name: 'Quality of Contact', raw: 88, confidence: 80, weight: 14, values: '51% HH vs 4-seam · 43% vs slider', note: 'The supplied reference shows these contact values.', source: 'User-supplied pitch-type mockup' },
  { name: 'Environment', raw: 72, confidence: 60, weight: 8, values: 'Reference score · live weather unavailable', note: 'No current park or weather inference is applied.', source: 'User-supplied dashboard mockup' },
  { name: 'Market Expression', raw: 74, confidence: 60, weight: 10, values: '2+ TB selected in reference', note: 'Alternates remain ungraded without current prices.', source: 'User-supplied dashboard mockup' },
  { name: 'Threshold / Price', raw: 80, confidence: 70, weight: 10, values: 'Reference price −102 · not live', note: 'A live price is required before any real decision.', source: 'User-supplied dashboard mockup' },
  { name: 'Source Agreement', raw: 70, confidence: 60, weight: 6, values: 'Reference score · no live consensus', note: 'No agreement claim is made beyond the supplied design.', source: 'User-supplied dashboard mockup' },
  { name: 'Portfolio Fit', raw: 78, confidence: 70, weight: 10, values: 'Reference score · today risk $0', note: 'Today’s Real Card has no approved exposure.', source: 'User-supplied dashboard mockup + imported ticket log' },
  { name: 'Player Rate', raw: 64, confidence: 50, weight: 2, values: '7 of 50 · 14% in reference', note: 'Experimental; never overrides matchup or price.', source: 'User-supplied dashboard mockup' },
];

const adjustedScore = (raw: number, confidence: number) => 50 + (raw - 50) * (confidence / 100);
const metricContribution = (metric: (typeof metrics)[number]) => adjustedScore(metric.raw, metric.confidence) * (metric.weight / 100);
const referenceLegGrade = Math.round(metrics.reduce((sum, metric) => sum + metricContribution(metric), 0));
const referenceLegConfidence = Math.round(metrics.reduce((sum, metric) => sum + metric.confidence * (metric.weight / 100), 0));

const marketAlternatives = [
  { market: '1+ Hit', price: 'unavailable', grade: null, why: 'Not graded without a current market and threshold check.' },
  { market: '2+ Total Bases', price: '−102 reference', grade: referenceLegGrade, why: 'Reference selection only; not eligible for today’s card.' },
  { market: '2+ H+R+RBI', price: 'unavailable', grade: null, why: 'Required challenger, but no current price is loaded.' },
  { market: 'Home Run', price: 'unavailable', grade: null, why: 'Not graded without a current price and volatility audit.' },
];

const nav = [
  { value: 'today', label: 'Today', icon: LayoutDashboard },
  { value: 'slips', label: 'Slips', icon: ListChecks },
  { value: 'real', label: 'Real Card', icon: WalletCards },
  { value: 'history', label: 'Bet History', icon: HistoryIcon },
  { value: 'paper', label: 'Paper Lab', icon: FlaskConical },
  { value: 'results', label: 'Results', icon: BarChart3 },
  { value: 'learning', label: 'Learning', icon: Beaker },
  { value: 'config', label: 'Config', icon: Database },
];

function SlipWorkspace() {
  return (
    <Tabs defaultValue={sportsbooks.slips[0].id} className="sport-slip-tabs">
      <TabsList className="sport-tab-list" aria-label="Sport slips">
        {sportsbooks.slips.map((slip) => <TabsTrigger key={slip.id} value={slip.id}>{slip.label}</TabsTrigger>)}
      </TabsList>
      {sportsbooks.slips.map((slip) => {
        const leagues = slate.leagues.filter((league) => league.sport === slip.sport);
        const active = leagues.filter((league) => league.status === 'active');
        const games = active.reduce((sum, league) => sum + (league.games ?? 0), 0);
        const suppliedSlips = chatIntake.slips.filter((item) => item.sport === slip.sport && item.date === slate.date);
        return (
          <TabsContent key={slip.id} value={slip.id} className="sport-slip-content">
            <div className="slip-status-grid">
              <div><span>PRIMARY BOOK</span><strong>{sportsbooks.primarySportsbook}</strong><small>preferred pricing source</small></div>
              <div><span>ACTIVE GAMES</span><strong>{games}</strong><small>{active.length} active competition{active.length === 1 ? '' : 's'}</small></div>
              <div><span>VERIFIED LINES</span><strong>0</strong><small>DraftKings feed not connected</small></div>
              <div><span>CHAT INTAKE</span><strong>{suppliedSlips.length}</strong><small>structured items · recheck required</small></div>
              <div><span>SLIP GATE</span><strong>WAIT</strong><small>no price or market inferred</small></div>
            </div>
            <Panel title={`${slip.label} chat intake`} icon={FileInput} action={<span className="tag">{suppliedSlips.length} TODAY</span>}>
              {suppliedSlips.length ? <div className="intake-list">
                {suppliedSlips.map((item) => (
                  <Accordion key={item.id} className="intake-accordion">
                    <AccordionItem value={item.id} className="intake-card">
                      <AccordionTrigger className="intake-trigger">
                        <div><span className="eyebrow">{item.origin} · {item.verificationStatus.replaceAll('_', ' ')}</span><strong>{item.title}</strong><small>{item.league} · {item.legs.length} leg{item.legs.length === 1 ? '' : 's'} · {item.sportsbook}</small></div>
                        <div className="intake-price"><strong>{item.displayedCombinedPrice ?? '—'}</strong><span>{item.status.replaceAll('_', ' ')}</span></div>
                      </AccordionTrigger>
                      <AccordionContent className="intake-detail">
                        <div className="intake-warning"><CircleAlert size={15} /><span>Chat-reported research only. Recheck the event, market, price, lineup and source evidence before using it.</span></div>
                        <div className="intake-legs">{item.legs.map((leg, index) => <div key={`${item.id}-${index}`}><b>{index + 1}</b><span><strong>{leg.entity}</strong><small>{leg.event}</small></span><span>{leg.market}{leg.threshold ? ` · ${leg.threshold}` : ''}</span><strong>{leg.displayedPrice ?? '—'}</strong></div>)}</div>
                        <div className="intake-notes"><p><b>Audit note:</b> {item.auditSummary}</p><p><b>Placement evidence:</b> {item.placementEvidence}</p><p><b>Public source URLs:</b> {item.sources.length ? item.sources.join(' · ') : 'None preserved in the chat export; independent source check required.'}</p></div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ))}
              </div> : <div className="slip-empty"><FileInput size={26} /><strong>No same-day chat items for this sport.</strong><p>The hourly watcher will add public-safe structured records when a project chat changes.</p></div>}
            </Panel>
            <div className="slip-layout">
              <Panel title={`${slip.label} slate`} icon={Clock3}>
                <div className="slip-leagues">
                  {leagues.map((league) => (
                    <a href={league.source} target="_blank" rel="noreferrer" key={league.league}>
                      <span><i className={league.status === 'active' ? 'signal-dot green' : league.status === 'source_error' ? 'signal-dot red' : 'signal-dot muted'} />{league.league}</span>
                      <strong>{league.games ?? '—'} game{league.games === 1 ? '' : 's'}</strong>
                      <small>{league.status === 'source_error' ? 'source unavailable' : league.earliestStart ?? 'no slate today'}</small>
                    </a>
                  ))}
                </div>
              </Panel>
              <Panel title="Research markets" icon={Target}>
                <div className="slip-markets">
                  {slip.markets.map((market) => <span key={market}><i />{market}</span>)}
                </div>
                <p className="slip-note">These are research queues, not recommendations. Available DraftKings markets must be verified each day.</p>
              </Panel>
            </div>
            <Panel title="Independent candidate discovery" icon={ShieldCheck} action={<span className="tag tag-demo">ANTI-ANCHORING</span>}>
              <DiscoveryProcess />
            </Panel>
            <Panel title={`${sportsbooks.primarySportsbook} slip builder`} icon={ListChecks} action={<span className="tag tag-demo">NO LIVE ODDS</span>}>
              <div className="slip-builder-head"><span>Candidate</span><span>Market</span><span>DK price</span><span>Grade</span><span>Confidence</span><span>Status</span></div>
              <div className="slip-empty">
                <LockKeyhole size={26} />
                <strong>No verified DraftKings lines loaded.</strong>
                <p>Load the exact market, threshold and price before GPT scores a leg. Schedule detection alone never creates a pick.</p>
              </div>
            </Panel>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function number(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function percent(value: unknown) {
  return `${(number(value) * 100).toFixed(1)}%`;
}

function money(value: number) {
  return `${value >= 0 ? '+' : '−'}$${Math.abs(value).toFixed(2)}`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: slate.timezone }).format(new Date(`${value}T12:00:00Z`)).toUpperCase();
}

function verifiedLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: slate.timezone }).format(new Date(value));
}

function gameTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: slate.timezone }).format(new Date(value));
}

function gradeClass(grade: number | null) {
  if (grade === null) return '';
  if (grade >= 86) return 'grade-a';
  if (grade >= 78) return 'grade-b';
  if (grade >= 70) return 'grade-c';
  return 'grade-pass';
}

function Panel({ title, icon: Icon, action, children, className = '' }: { title: string; icon?: typeof Activity; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div className="panel-title">{Icon && <Icon size={15} />}<span>{title}</span></div>
        {action}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

type BoardReal = (typeof researchBoard.realCard)[number];
type BoardCandidate = (typeof researchBoard.activeCandidates)[number] | (typeof researchBoard.paperCandidates)[number];

function ScoringDisclosure({ item }: { item: BoardReal | BoardCandidate }) {
  return (
    <div className="board-scores" aria-label="Recorded grade and confidence">
      <div><span>CHAT GRADE</span><strong>{item.chatGrade ?? '—'}</strong><small>{item.chatGrade ? 'explicitly assigned' : 'not assigned'}</small></div>
      <div><span>LEG GRADE</span><strong>{item.legGrade ?? '—'}</strong><small>/100 not calculated</small></div>
      <div><span>CONFIDENCE</span><strong>{item.confidence ?? '—'}</strong><small>/100 not calculated</small></div>
    </div>
  );
}

function RealBoardCard({ ticket }: { ticket: BoardReal }) {
  return (
    <Accordion className="board-accordion">
      <AccordionItem value={ticket.id} className="board-card real-board-card">
        <AccordionTrigger className="board-trigger">
          <div className="board-main"><span className="eyebrow">{ticket.sport} · {ticket.origin}</span><strong>{ticket.title}</strong><small>{ticket.promo} · ${ticket.stake.toFixed(2)} risk</small></div>
          <div className="board-price"><strong>{ticket.price}</strong><span>PLACED</span></div>
        </AccordionTrigger>
        <AccordionContent className="board-detail">
          <ScoringDisclosure item={ticket} />
          <div className="board-legs">{ticket.legs.map((leg, index) => <div key={`${ticket.id}-${leg}`}><b>{index + 1}</b><span>{leg}</span></div>)}</div>
          <p><b>Why it qualified:</b> {ticket.summary}</p>
          <p className="board-provenance"><ShieldCheck size={13} /> Placement is user-confirmed in the research chat. Result remains pending.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function CandidateBoardCard({ item, paper = false }: { item: BoardCandidate; paper?: boolean }) {
  const blockers = 'blockers' in item ? item.blockers : [];
  const experiment = 'experiment' in item ? item.experiment : null;
  return (
    <Accordion className="board-accordion">
      <AccordionItem value={item.id} className={`board-card ${paper ? 'paper-board-card' : 'active-board-card'}`}>
        <AccordionTrigger className="board-trigger">
          <div className="board-main"><span className="eyebrow">{item.sport} · {item.origin}</span><strong>{item.entity} — {item.market}</strong><small>{item.event}</small></div>
          <div className="board-price"><strong>{item.price}</strong><span>{paper ? 'PAPER' : 'FINAL CHECK'}</span></div>
          <div className={`board-letter ${item.chatGrade ? 'has-grade' : ''}`}><b>{item.chatGrade ?? '—'}</b><small>chat grade</small></div>
        </AccordionTrigger>
        <AccordionContent className="board-detail">
          <ScoringDisclosure item={item} />
          <p><b>Research read:</b> {item.rationale}</p>
          {experiment && <p><b>Paper purpose:</b> {experiment}</p>}
          {blockers.length > 0 && <div className="board-checks">{blockers.map((blocker) => <span key={blocker}><CircleAlert size={12} />{blocker}</span>)}</div>}
          <p className="board-provenance"><BookOpenCheck size={13} /> Exact public source URLs were not preserved in the chat export; this card reports the decision without inventing citations.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function TodayBoard({ compact = false }: { compact?: boolean }) {
  const realItems = compact ? researchBoard.realCard.slice(0, 3) : researchBoard.realCard;
  const paperItems = compact ? researchBoard.paperCandidates.slice(0, 3) : researchBoard.paperCandidates;
  return (
    <div className="today-board">
      <section className="board-section">
        <div className="board-section-head"><div><span className="eyebrow">NORMAL SLATE</span><strong>Placed today</strong></div><span className="tag">{researchBoard.realCard.length} TICKETS</span></div>
        <div className="board-stack">{realItems.map((ticket) => <RealBoardCard key={ticket.id} ticket={ticket} />)}</div>
      </section>
      <section className="board-section">
        <div className="board-section-head"><div><span className="eyebrow">NOT PLACED</span><strong>Final checks</strong></div><span className="tag tag-demo">{researchBoard.activeCandidates.length} ACTIVE</span></div>
        <div className="board-stack">{researchBoard.activeCandidates.map((item) => <CandidateBoardCard key={item.id} item={item} />)}</div>
      </section>
      <section className="board-section paper-board-section">
        <div className="board-section-head"><div><span className="eyebrow">PAPER TRADE</span><strong>Today’s challengers</strong></div><span className="tag tag-paper">{researchBoard.paperCandidates.length} PAPER</span></div>
        <div className="board-stack">{paperItems.map((item) => <CandidateBoardCard key={item.id} item={item} paper />)}</div>
        {compact && researchBoard.paperCandidates.length > paperItems.length && <p className="board-more">Open Today’s Board to see all {researchBoard.paperCandidates.length} paper candidates.</p>}
      </section>
    </div>
  );
}

function SlateExplorer() {
  const [sport, setSport] = useState('All');
  const [gameState, setGameState] = useState('All');
  const [query, setQuery] = useState('');
  const sports = ['All', ...Array.from(new Set(slate.leagues.map((league) => league.sport)))];
  const allEvents = slate.leagues.flatMap((league) => (league.events as Omit<SlateEvent, 'sport' | 'league' | 'provider'>[]).map((event) => ({
    ...event,
    sport: league.sport,
    league: league.league,
    provider: league.provider,
  }))) as SlateEvent[];
  const stateMatches = (event: SlateEvent) => gameState === 'All'
    || (gameState === 'Live' && event.state === 'in')
    || (gameState === 'Upcoming' && event.state === 'pre')
    || (gameState === 'Final' && event.state === 'post');
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = allEvents.filter((event) => (
    (sport === 'All' || event.sport === sport)
    && stateMatches(event)
    && (!normalizedQuery || `${event.name} ${event.shortName} ${event.league} ${event.venue ?? ''}`.toLowerCase().includes(normalizedQuery))
  ));

  const liveCount = allEvents.filter((event) => event.state === 'in').length;
  const upcomingCount = allEvents.filter((event) => event.state === 'pre').length;
  const finalCount = allEvents.filter((event) => event.state === 'post').length;

  return (
    <Accordion className="slate-explorer-drop">
      <AccordionItem value="live-slate" className="slate-drop-card">
        <AccordionTrigger className="slate-drop-trigger">
          <div className="slate-drop-title"><Radio size={18} /><span><small>LIVE SLATE EXPLORER</small><strong>{allEvents.length} games across {sports.length - 1} sports</strong></span></div>
          <div className="slate-drop-counts"><span><i className="truth-dot live" />{liveCount} live</span><span>{upcomingCount} upcoming</span><span>{finalCount} final</span><b>OPEN</b></div>
        </AccordionTrigger>
        <AccordionContent className="slate-drop-content">
      <div className="slate-controls">
        <div className="filter-chips" aria-label="Filter by sport">
          {sports.map((item) => <button type="button" className={sport === item ? 'active' : ''} onClick={() => setSport(item)} key={item}>{item}</button>)}
        </div>
        <label className="slate-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search team, league, or venue" aria-label="Search slate" /></label>
        <div className="state-filters" aria-label="Filter by game status">
          {['All', 'Live', 'Upcoming', 'Final'].map((item) => <button type="button" className={gameState === item ? 'active' : ''} onClick={() => setGameState(item)} key={item}>{item}</button>)}
        </div>
      </div>
      {filtered.length ? (
        <Accordion className="game-accordion">
          {filtered.map((event) => {
            const away = event.competitors.find((team) => team.side === 'away') ?? event.competitors[0];
            const home = event.competitors.find((team) => team.side === 'home') ?? event.competitors[1];
            return (
              <AccordionItem value={event.id} className="game-card" key={event.id}>
                <AccordionTrigger className="game-trigger">
                  <div className="game-meta"><span>{event.league}</span><b className={`game-state ${event.state}`}>{event.state === 'in' ? 'LIVE' : event.state === 'post' ? 'FINAL' : gameTime(event.date)}</b></div>
                  <div className="team-lines">
                    {[away, home].map((team) => <div key={`${event.id}-${team.side}`}><span>{team.abbreviation ?? team.name}</span><strong>{team.name}</strong><small>{team.record ?? 'record unavailable'}</small><b>{team.score ?? '—'}</b></div>)}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="game-detail">
                  <div className="game-facts">
                    <span><Clock3 size={14} /><b>{event.status}</b></span>
                    <span><MapPin size={14} />{event.venue ?? 'Venue unavailable'}</span>
                    <span><Tv size={14} />{event.broadcasts.length ? event.broadcasts.join(' · ') : 'Broadcast unavailable'}</span>
                  </div>
                  {event.probablePitchers && <div className="probable-pitchers"><div><span>{away.abbreviation ?? 'AWAY'} PROBABLE</span><strong>{event.probablePitchers.away ?? 'Not announced'}</strong></div><div><span>{home.abbreviation ?? 'HOME'} PROBABLE</span><strong>{event.probablePitchers.home ?? 'Not announced'}</strong></div></div>}
                  <div className="game-source"><span>Real schedule/result data · {event.provider}</span><a href={event.source} target="_blank" rel="noreferrer">Open source <ChevronRight size={14} /></a></div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : <div className="slate-empty"><Search size={24} /><strong>No games match these filters.</strong><button type="button" onClick={() => { setSport('All'); setGameState('All'); setQuery(''); }}>Clear filters</button></div>}
      <p className="slate-freshness">Snapshot verified {verifiedLabel(slate.lastVerified)}. The scheduled GitHub workflow refreshes this feed four times daily.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function DiscoveryProcess() {
  return (
    <div className="discovery-process">
      <div className="discovery-status"><Target size={18} /><div><span>SEARCH MODE</span><strong>FULL ELIGIBLE SLATE</strong></div></div>
      <ol className="discovery-steps">
        <li><b>Detect the slate</b><span>Map every active eligible game and supported market family.</span></li>
        <li><b>Search independently</b><span>Find candidates across the slate without copying names from supplied cards.</span></li>
        <li><b>Review supplied cards</b><span>Evaluate each supplied idea after the independent shortlist exists.</span></li>
        <li><b>Merge and rank</b><span>Show one list labeled INDEPENDENT, SUPPLIED, or BOTH.</span></li>
        <li><b>Verify the inputs</b><span>Cite the facts used in each grade and leave missing values unavailable.</span></li>
      </ol>
      <p>Supplied cards are leads, not the candidate universe. Strong candidates stay visible even when no supplied source mentions them, and the model may return no pick when the slate offers none.</p>
    </div>
  );
}

function MorningScan() {
  const morningGames = morningScan.games as MorningGame[];
  return (
    <div className="morning-scan">
      <div className="morning-scan-head">
        <div><span className="eyebrow">INITIAL INDEPENDENT PASS</span><strong>{morningScan.status.replaceAll('_', ' ')}</strong><small>{morningScan.generatedAt ? `Generated ${verifiedLabel(morningScan.generatedAt)}` : 'Scheduled for the first morning automation run'}</small></div>
        <span className="tag">{morningGames.length} GAMES · {morningScan.candidates.length} CANDIDATES</span>
      </div>
      {morningGames.length ? <Accordion className="morning-games">{morningGames.map((game) => (
        <AccordionItem key={game.id} value={game.id} className="game-card">
          <AccordionTrigger className="morning-game-trigger"><div><span>{game.sport} · {game.league}</span><strong>{game.event}</strong><small>{game.projectionStatus.replaceAll('_', ' ')} · {game.projectedParticipants.length} projected roles</small></div></AccordionTrigger>
          <AccordionContent className="morning-game-detail"><div className="projected-participants">{game.projectedParticipants.map((participant, index) => <div key={`${game.id}-${index}`}><strong>{participant.name}</strong><span>{participant.role}</span><small>{participant.basis}</small></div>)}</div></AccordionContent>
        </AccordionItem>
      ))}</Accordion> : <div className="morning-empty"><Clock3 size={24} /><strong>No retrospective projections were created.</strong><p>{morningScan.notes}</p></div>}
      <div className="morning-method"><span>1 · Detect every eligible game</span><span>2 · Project roles from recent usage</span><span>3 · Research the full slate independently</span><span>4 · Compare supplied cards afterward</span></div>
      <p className="slate-freshness">Major soccer leagues only. MLS and Saudi Pro League remain excluded. Prospective lineups are never labeled confirmed.</p>
    </div>
  );
}

function MetricTable() {
  return (
    <div className="metric-table" aria-label="Leg grade score breakdown">
      <div className="metric-row metric-header">
        <span>Metric</span><span>Raw</span><span>Conf.</span><span>Adjusted</span><span>Weight</span><span>Contribution</span>
      </div>
      {metrics.map((metric) => (
        <div className="metric-row" key={metric.name}>
          <div className="metric-name">
            <strong>{metric.name}</strong>
            <span>{metric.values}</span>
            <p>{metric.note}</p>
            <small>{metric.source}</small>
          </div>
          <span className="metric-number">{metric.raw}</span>
          <span className="metric-number muted-number">{metric.confidence}</span>
          <span className="metric-number muted-number">{adjustedScore(metric.raw, metric.confidence).toFixed(1)}</span>
          <span className="metric-number">{metric.weight}%</span>
          <span className="metric-number contribution">+{metricContribution(metric).toFixed(1)}</span>
        </div>
      ))}
      <div className="formula-strip">
        <span>Σ confidence-adjusted score × weight</span>
        <strong>{referenceLegGrade} / 100</strong>
        <small>Prompt v4 formula: 50 + (raw − 50) × confidence, then × weight. Grade is wager quality, not hit probability.</small>
      </div>
    </div>
  );
}

export function LegCard() {
  return (
    <Accordion defaultValue={['jackson']} className="leg-accordion">
      <AccordionItem value="jackson" className="leg-card">
        <AccordionTrigger className="leg-summary">
          <div className="leg-summary-main">
            <span className="entity-line"><i className="signal-dot blue" />Jackson Chourio <span className="tag tag-demo">REFERENCE ONLY</span></span>
            <strong>2+ Total Bases</strong>
            <span className="microcopy">Reference card · not a live wager · current price unverified</span>
          </div>
          <div className="leg-scores">
            <div><span className="score-label">GRADE</span><strong className={gradeClass(referenceLegGrade)}>{referenceLegGrade}</strong><small>/100</small></div>
            <div><span className="score-label">CONF.</span><strong>{referenceLegConfidence}</strong><small>/100</small></div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="leg-detail">
          <div className="warning-banner"><CircleAlert size={15} /><span>REFERENCE ONLY: all inputs below come from the supplied mockups. The score is formula-correct, but this is not a current candidate or recommendation.</span></div>
          <div className="detail-grid top-detail">
            <div className="summary-copy">
              <span className="eyebrow">THESIS</span>
              <h3>Contact quality and pitch-type fit create extra-base upside.</h3>
              <p>The design reference’s broad thesis favors total bases, but market, lineup, weather, and exact price must be refreshed before any real-card decision.</p>
            </div>
            <div className="player-rate">
              <div><span>PLAYER RATE</span><em>EXPERIMENTAL</em></div>
              <strong>14%</strong>
              <p>Selected in 7 of 50 comparable opportunities.</p>
            </div>
          </div>
          <MetricTable />
          <div className="evidence-grid">
            <Panel title="Pitch-type matchup" icon={Target}>
              <div className="pitcher-profile">
                <div className="pitcher-identity">
                  <span className="pitcher-badge">RHP</span>
                  <div><small>OPPOSING PITCHER</small><strong>Kevin Gausman</strong></div>
                </div>
                <div className="pitcher-stats">
                  <div><span>ERA</span><strong>4.52</strong></div>
                  <div><span>OPP AVG</span><strong>.253</strong></div>
                  <div><span>STUFF</span><strong className="positive">GOOD</strong></div>
                </div>
                <p>Historical values from the supplied pitch-type mockup · current opponent and stats require verification</p>
              </div>
              {[
                ['Four-seam', 92, '.412 xwOBA', '51% HH'],
                ['Slider', 78, '.298 xwOBA', '43% HH'],
                ['Changeup', 38, '.221 xwOBA', '29% HH'],
                ['Curveball', 31, '.198 xwOBA', '27% HH'],
              ].map(([name, value, xwoba, hh]) => (
                <div className="pitch-row" key={name as string}>
                  <span>{name}</span><Progress value={value as number} /><b>{xwoba}</b><small>{hh}</small>
                </div>
              ))}
              <div className="source-line"><BookOpenCheck size={13} /> Source: user-supplied pitch-type dashboard reference · freshness: historical design input</div>
            </Panel>
            <Panel title="Recent trend snapshot" icon={LineChart}>
              <div className="trend-grid">
                <span></span><b>1+ HIT</b><b>2+ TB</b><b>HR</b>
                <b>L5</b><span className="hot">80%</span><span className="warm">60%</span><span>40%</span>
                <b>L10</b><span className="hot">70%</span><span className="warm">50%</span><span className="cold">30%</span>
                <b>L20</b><span className="hot">65%</span><span>45%</span><span className="cold">25%</span>
              </div>
              <div className="source-line"><BookOpenCheck size={13} /> Source: supplied dashboard mockup · do not treat recent hit rate as a standalone edge</div>
            </Panel>
          </div>
          <Panel title="Market expression comparison" icon={Gauge}>
            <div className="market-comparison">
              {marketAlternatives.map((row) => (
                <div className={row.market === '2+ Total Bases' ? 'market-choice selected' : 'market-choice'} key={row.market}>
                  <div><strong>{row.market}</strong><span>{row.price}</span></div>
                  <b className={gradeClass(row.grade)}>{row.grade ?? '—'}</b>
                  <p>{row.why}</p>
                </div>
              ))}
            </div>
          </Panel>
          <div className="evidence-grid triple">
            <Panel title="Why this leg" icon={CircleCheck}>
              <ul className="check-list">
                <li>Impact-quality signal matches the threshold.</li>
                <li>Pitch mix aligns with the strongest contact bands.</li>
                <li>Alternate markets remain visible for price comparison.</li>
              </ul>
            </Panel>
            <Panel title="Failure modes" icon={CircleAlert}>
              <ul className="risk-list">
                <li>Lineup or role changes</li><li>Pitcher changes mix</li><li>Price deteriorates</li><li>Weather suppresses carry</li>
              </ul>
            </Panel>
            <Panel title="Provenance" icon={ShieldCheck}>
              <div className="provenance-list"><span><i className="prov user" /> USER-SUPPLIED</span><span><i className="prov gpt" /> GPT-DERIVED</span><span><i className="prov hist" /> HISTORICAL</span></div>
              <p className="small-copy">No value on this card is marked LIVE. Current odds and roster facts remain gated.</p>
            </Panel>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default function OverlayDashboard() {
  const [tab, setTab] = useState('today');
  const [menuOpen, setMenuOpen] = useState(false);

  const stats = useMemo(() => {
    const tickets = (history['Ticket Log'] as Row[]).filter((row) => row.Result);
    const pnl = tickets.reduce((sum, row) => sum + number(row['P/L']), 0);
    const wins = tickets.filter((row) => row.Result === 'Win').length;
    const daily = [...(history['Daily Summary'] as Row[])].sort((a, b) => b.Date.localeCompare(a.Date));
    return { tickets, pnl, wins, winRate: tickets.length ? wins / tickets.length : 0, daily, latest: daily[0] };
  }, []);

  const marketRows = history['Market Summary'] as Row[];
  const experimentRows = history['Experiment Registry'] as Row[];
  const paperRows = (history['Paper Portfolio'] as Row[]).slice(-10).reverse();
  const recentTickets = (history['Ticket Log'] as Row[]).filter((row) => row.Date !== slate.date).slice(-12).reverse();
  const activeGames = slate.leagues.reduce((sum, league) => sum + (league.status === 'active' ? (league.games ?? 0) : 0), 0);
  const activeLeagues = slate.leagues.filter((league) => league.status === 'active');
  const earliestLeague = [...activeLeagues].sort((a, b) => (a.earliestStartIso ?? '').localeCompare(b.earliestStartIso ?? ''))[0];
  const todayTickets = (history['Ticket Log'] as Row[]).filter((row) => row.Date === slate.date);
  const todayRisk = todayTickets.reduce((sum, row) => sum + number(row.Stake), 0);
  const historyThrough = stats.daily.find((row) => row['P/L'])?.Date ?? stats.latest.Date;

  return (
    <Tabs value={tab} onValueChange={(value) => { setTab(value); setMenuOpen(false); }} className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">O</span><div><strong>OVERLAY</strong><small>v0.1 · research OS</small></div></div>
        <TabsList className={menuOpen ? 'desktop-nav open' : 'desktop-nav'}>
          {nav.map(({ value, label, icon: Icon }) => <TabsTrigger key={value} value={value}><Icon size={15} />{label}</TabsTrigger>)}
        </TabsList>
        <div className="top-status"><span className="engine"><Bot size={14} /> GPT ONLY</span><span className="sync-dot" /> <span className="hide-small">History loaded</span></div>
        <button className="menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
      </header>

      <main className="main-content">
        <TabsContent value="today">
          <div className="page-heading">
            <div><span className="kicker">{dateLabel(slate.date)}</span><h1>Today’s research desk</h1><p>Slate first. Analysis before market. Price before portfolio.</p></div>
            <div className="gate-pill"><ListChecks size={15} /><span><b>LIVE BOARD</b> · {researchBoard.realCard.length} placed · {researchBoard.activeCandidates.length} final check</span></div>
          </div>
          <div className="truth-strip" aria-label="Data freshness and provenance">
            <span><i className="truth-dot live" /><b>SCHEDULE {slate.dataAvailability.schedules.toUpperCase()}</b> named source endpoints</span>
            <span><i className="truth-dot historical" /><b>HISTORY</b> through {historyThrough}</span>
            <span><i className="truth-dot reference" /><b>MORNING SCAN</b> prospective roles before supplied cards</span>
            <span><i className="truth-dot unavailable" /><b>NO LIVE FEED</b> prices and lineup facts are chat snapshots</span>
            <span><i className="truth-dot reference" /><b>DISCOVERY RULE</b> search the full slate beyond supplied cards</span>
          </div>
          <Tabs defaultValue="overview" className="today-sections">
            <TabsList className="page-subnav" aria-label="Today sections"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="candidates">Today’s Board</TabsTrigger><TabsTrigger value="morning">Morning scan</TabsTrigger><TabsTrigger value="sources">Sources</TabsTrigger></TabsList>
            <TabsContent value="overview" className="today-section-content">
              <div className="status-grid">
                <div className="status-card accent"><span>ACTIVE SLATE</span><strong>{activeGames}</strong><small>{activeLeagues.length ? `${activeLeagues.length} active competition${activeLeagues.length === 1 ? '' : 's'}` : 'no active leagues found'}</small></div>
                <div className="status-card"><span>EARLIEST START</span><strong>{earliestLeague?.earliestStart?.replace(/ E[DS]T$/, '') ?? '—'}</strong><small>{earliestLeague ? `${earliestLeague.league} · source verified` : 'no scheduled start'}</small></div>
                <div className="status-card"><span>PLACED TODAY</span><strong>{researchBoard.realCard.length}</strong><small>${researchBoard.realCard.reduce((sum, item) => sum + item.stake, 0).toFixed(2)} recorded risk</small></div>
                <div className="status-card"><span>PAPER TODAY</span><strong>{researchBoard.paperCandidates.length}</strong><small>challengers · no bankroll risk</small></div>
              </div>
              <Panel title="Today’s action board" icon={ListChecks} action={<span className="tag">UPDATED {verifiedLabel(researchBoard.lastUpdated)}</span>}><TodayBoard compact /></Panel>
              <SlateExplorer />
            </TabsContent>
            <TabsContent value="candidates" className="today-section-content">
              <div className="board-disclosure"><CircleCheck size={16} /><p><b>This page mirrors today’s actual decisions.</b> Placed tickets, unresolved finalists, and paper candidates are separate. A dash means the research chat did not calculate that score.</p></div>
              <TodayBoard />
              <Panel title="Independent discovery sequence" icon={ShieldCheck}><DiscoveryProcess /></Panel>
            </TabsContent>
            <TabsContent value="morning" className="today-section-content"><Panel title="Prospective lineups and independent shortlist" icon={Clock3}><MorningScan /></Panel></TabsContent>
            <TabsContent value="sources" className="today-section-content">
              <Panel title="Slate detection sources" icon={Database}>
                <div className="source-slate-grid">{slate.leagues.map((league) => (
                  <a className="slate-row" href={league.source} target="_blank" rel="noreferrer" key={league.league}>
                    <span><i className={league.status === 'active' ? 'signal-dot green' : league.status === 'source_error' ? 'signal-dot red' : 'signal-dot muted'} />{league.league}</span>
                    <b>{league.games ?? '—'}</b><small>{league.status === 'source_error' ? 'source error · no count inferred' : league.earliestStart ?? 'no games today'} · {league.provider}</small>
                  </a>
                ))}</div>
                <p className="timestamp">Verified {verifiedLabel(slate.lastVerified)} · schedule/results only</p>
              </Panel>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="slips">
          <div className="page-heading"><div><span className="kicker">TODAY’S SPORT WORKSPACES</span><h1>Slip research</h1><p>One queue per sport. DraftKings is the primary book; every price stays gated until verified.</p></div><div className="gate-pill"><LockKeyhole size={15} /><span><b>DRAFTKINGS</b> · primary sportsbook</span></div></div>
          <div className="truth-strip" aria-label="Slip data status">
            <span><i className="truth-dot live" /><b>SCHEDULES</b> source verified</span>
            <span><i className="truth-dot unavailable" /><b>DRAFTKINGS ODDS</b> not connected</span>
            <span><i className="truth-dot unavailable" /><b>SLIPS</b> no automatic picks</span>
          </div>
          <SlipWorkspace />
        </TabsContent>

        <TabsContent value="real">
          <div className="page-heading"><div><span className="kicker">TODAY ONLY · {dateLabel(slate.date)}</span><h1>Real Card</h1><p>Only wagers from today’s slate appear here. Prior days live in Bet History.</p></div><div className="gate-pill"><CircleAlert size={15} /><span><b>{todayTickets.length} FINAL</b> · today</span></div></div>
          <div className="status-grid three"><div className="status-card accent"><span>TODAY’S TICKETS</span><strong>{todayTickets.length}</strong><small>{todayTickets.length ? 'recorded for today' : 'nothing approved yet'}</small></div><div className="status-card"><span>TODAY’S RISK</span><strong>${todayRisk.toFixed(2)}</strong><small>{todayRisk ? 'recorded ticket stakes' : 'no bankroll committed'}</small></div><div className="status-card"><span>CARD STATUS</span><strong>{todayTickets.length ? 'RECORDED' : 'PRELIM'}</strong><small>odds, lineup, weather and audit gates remain explicit</small></div></div>
          <Panel title="Today’s real-money card" icon={WalletCards} action={<span className="tag">{slate.date}</span>}>
            {todayTickets.length ? <div className="data-table"><div className="data-row data-header"><span>Date</span><span>Ticket</span><span>Origin</span><span>Odds</span><span>Result</span><span>Stake</span></div>{todayTickets.map((row, index) => <div className="data-row" key={`${row['Ticket ID']}-${index}`}><span>{row.Date}</span><strong>{row.Description || row['Ticket ID']}</strong><span>{row.Origin}</span><span>{row['Odds (American)'] || '—'}</span><span className={row.Result === 'Win' ? 'positive' : row.Result === 'Loss' ? 'negative' : ''}>{row.Result || 'Pending'}</span><b>${number(row.Stake).toFixed(2)}</b></div>)}</div> : <div className="empty-real-card">
              <div className="empty-real-icon"><LockKeyhole size={28} /></div>
              <strong>No bets have cleared today’s final gate.</strong>
              <p>Today’s candidate research remains preliminary. A ticket appears here only after the full-slate audit, exact-price check, role and lineup verification, exposure review, and bankroll confirmation.</p>
              <div className="gate-checks"><span><i /> Full slate scan</span><span><i /> Independent discovery</span><span><i /> Supplied-card comparison</span><span><i /> Exact odds</span><span><i /> Lineup / role</span><span><i /> Portfolio audit</span></div>
            </div>}
          </Panel>
        </TabsContent>

        <TabsContent value="history">
          <div className="page-heading"><div><span className="kicker">ARCHIVED REAL-MONEY RECORD</span><h1>Bet History</h1><p>All settled and prior-day tickets stay here, separate from today’s card.</p></div><div className="gate-pill"><HistoryIcon size={15} /><span><b>THROUGH {historyThrough}</b></span></div></div>
          <div className="status-grid three"><div className="status-card accent"><span>SETTLED TICKETS</span><strong>{stats.tickets.length}</strong><small>imported historical record</small></div><div className="status-card"><span>TICKET HIT RATE</span><strong>{percent(stats.winRate)}</strong><small>{stats.wins} wins</small></div><div className="status-card"><span>NET P/L</span><strong className={stats.pnl >= 0 ? 'positive' : 'negative'}>{money(stats.pnl)}</strong><small>sum of recorded ticket P/L</small></div></div>
          <Panel title="Prior real tickets" icon={HistoryIcon} action={<span className="tag">IMPORTED</span>}>
            <div className="data-table"><div className="data-row data-header"><span>Date</span><span>Ticket</span><span>Origin</span><span>Odds</span><span>Result</span><span>P/L</span></div>{recentTickets.map((row, index) => <div className="data-row" key={`${row['Ticket ID']}-${index}`}><span>{row.Date}</span><strong>{row.Description || row['Ticket ID']}</strong><span>{row.Origin}</span><span>{row['Odds (American)'] || '—'}</span><span className={row.Result === 'Win' ? 'positive' : row.Result === 'Loss' ? 'negative' : ''}>{row.Result || 'Pending'}</span><b>{row['P/L'] ? money(number(row['P/L'])) : '—'}</b></div>)}</div>
          </Panel>
        </TabsContent>

        <TabsContent value="paper">
          <div className="page-heading"><div><span className="kicker">BROAD R&amp;D SANDBOX</span><h1>Paper Lab</h1><p>Replication, challenger, and innovation tests use the same grader as Real.</p></div><div className="gate-pill paper"><FlaskConical size={15} /><span><b>{(history['Paper Portfolio'] as Row[]).length} ROWS</b> · preserved</span></div></div>
          <div className="experiment-grid">
            {experimentRows.slice(0, 6).map((row) => <article className="experiment-card" key={row['Experiment ID']}><div><span className="tag tag-paper">{row['Experiment ID']}</span><span className="exp-status">{row['Current Status']}</span></div><h3>{row.Hypothesis}</h3><p>{row['Test Design']}</p><footer><span>Minimum N <b>{row['Minimum Sample']}</b></span><span>{row['Main Metric']}</span></footer></article>)}
          </div>
          <Panel title="Latest paper observations" icon={FileInput}>
            <div className="data-table paper-table"><div className="data-row data-header"><span>Date</span><span>Entity</span><span>Market</span><span>Experiment</span><span>Result</span><span>Learning</span></div>{paperRows.map((row, index) => <div className="data-row" key={`${row['Paper ID']}-${index}`}><span>{row.Date}</span><strong>{row.Entity}</strong><span>{row.Proposition}</span><span>{row['Experiment ID'] || row['Paper Pick Type']}</span><span className={row.Result === 'Win' ? 'positive' : row.Result === 'Loss' ? 'negative' : ''}>{row.Result}</span><span>{row['Post-Game Learning'] || row['Why Qualified']}</span></div>)}</div>
          </Panel>
        </TabsContent>

        <TabsContent value="results">
          <div className="page-heading"><div><span className="kicker">ECONOMIC CONTRIBUTION</span><h1>Results &amp; P/L</h1><p>Ticket results and bankroll movement from the imported historical record.</p></div></div>
          <div className="status-grid"><div className="status-card accent"><span>LATEST BANKROLL</span><strong>${number(stats.latest['Ending Bankroll']).toFixed(2)}</strong><small>{stats.latest.Date} confirmed snapshot</small></div><div className="status-card"><span>RECORDED DAYS</span><strong>{stats.daily.length}</strong><small>daily summary rows</small></div><div className="status-card"><span>REAL NET P/L</span><strong className={stats.pnl >= 0 ? 'positive' : 'negative'}>{money(stats.pnl)}</strong><small>settled ticket log</small></div><div className="status-card"><span>DATA QUALITY</span><strong>28</strong><small>workbook sheets inspected</small></div></div>
          <Panel title="Bankroll timeline" icon={TrendingUp}>
            <div className="timeline-chart">{stats.daily.slice().reverse().filter((row) => row['Ending Bankroll']).map((row) => <div className="timeline-point" key={row.Date}><div className="bar-wrap"><i style={{ height: `${Math.max(8, Math.min(100, number(row['Ending Bankroll']) / 55.51 * 100))}%` }} /></div><strong>${number(row['Ending Bankroll']).toFixed(2)}</strong><span>{row.Date.slice(5)}</span></div>)}</div>
          </Panel>
          <Panel title="Daily postmortem ledger" icon={BookOpenCheck}>
            <div className="daily-grid">{stats.daily.map((row) => <article key={row.Date}><div><strong>{row.Date}</strong><span className={number(row['P/L']) >= 0 ? 'positive' : 'negative'}>{row['P/L'] ? money(number(row['P/L'])) : 'Incomplete'}</span></div><p>{row.Notes}</p><footer>{row.Tickets || '—'} tickets · {row.Wins || '—'} wins</footer></article>)}</div>
          </Panel>
        </TabsContent>

        <TabsContent value="learning">
          <div className="page-heading"><div><span className="kicker">PROSPECTIVE LEARNING</span><h1>Calibration &amp; evidence</h1><p>Small samples stay labeled. Changes are proposed, never silently applied.</p></div><div className="gate-pill"><ShieldCheck size={15} /><span><b>GOVERNED</b> · versioned weights</span></div></div>
          <div className="learning-grid">
            <Panel title="Market performance" icon={BarChart3}><div className="market-bars">{marketRows.slice(0, 9).map((row) => <div key={row['Market Family']}><span>{row['Market Family']}</span><div><i style={{ width: percent(row['All Hit Rate']) }} /></div><b>{percent(row['All Hit Rate'])}</b><small>N={row['All Obs']}</small></div>)}</div></Panel>
            <Panel title="Source performance" icon={ShieldCheck}><div className="source-performance">{(history['Source Evaluation'] as Row[]).map((row) => <article key={row['Decision / Bucket']}><div><strong>{row['Decision / Bucket']}</strong><span>N={row.Observations}</span></div><b>{percent(row['Hit Rate'])}</b><p>{row.Interpretation}</p></article>)}</div></Panel>
          </div>
          <div className="learning-grid">
            <Panel title="Grade calibration" icon={Gauge}><div className="empty-chart"><LineChart size={28} /><strong>EXP-GRADE-01 initialized</strong><p>Historical records predate the numerical grader. Prospective buckets begin with frozen v0.1 snapshots.</p></div></Panel>
            <Panel title="Confidence calibration" icon={Activity}><div className="empty-chart"><Activity size={28} /><strong>EXP-CONF-01 initialized</strong><p>Confidence tracks input reliability and assumption failure—not event probability.</p></div></Panel>
          </div>
        </TabsContent>

        <TabsContent value="config">
          <div className="page-heading"><div><span className="kicker">STRATEGIC SOURCE OF TRUTH</span><h1>Versioned configuration</h1><p>Daily changes belong in data and config. The product stays one persistent site.</p></div><div className="gate-pill"><Bot size={15} /><span><b>GPT ONLY</b> · no alternate model path</span></div></div>
          <div className="config-grid">
            <Panel title="Core constitution" icon={BookOpenCheck}><div className="config-card"><span>MASTER PROMPT</span><strong>v4.0 · 2026-09-03</strong><p>All 58 sections are preserved verbatim in the repository. Website behavior extends the strategy without replacing it.</p><div className="principles"><span>ANALYSIS FIRST</span><span>EDGE FIRST</span><span>PRICE FIRST</span><span>PROMO LAST</span></div></div></Panel>
            <Panel title="Candidate discovery policy" icon={ShieldCheck}><div className="config-card"><span>PROMPT STACK</span><strong>v{promptStack.version} · source-blind audit first</strong><p>Every chat loads the preserved constitution plus the discovery contract. GPT freezes independent standalone rankings across the {discoveryPolicy.discovery.scope.replaceAll('_', ' ')} before reviewing supplied cards or constructing parlays.</p><div className="principles"><span>SEARCH THE WHOLE SLATE</span><span>FREEZE STANDALONE RANKS</span><span>SOURCES TEACH</span><span>SYSTEM DECIDES</span></div></div></Panel>
            <Panel title="Operational datastore" icon={Database}><div className="config-card"><span>IMPORTED HISTORY</span><strong>v0.45 reconciled</strong><p>{(history['Candidate Log'] as Row[]).length} candidates · {(history['Ticket Log'] as Row[]).length} tickets · {(history['Paper Portfolio'] as Row[]).length} paper observations · {(history['Experiment Registry'] as Row[]).length} experiments.</p><div className="data-health"><CircleCheck size={16} /> JSON and workbook retained for audit and export compatibility</div></div></Panel>
          </div>
          <Panel title="Market-specific scoring models" icon={Target} action={<span className="tag">{models.version}</span>}>
            <div className="model-grid">{Object.entries(models.models).map(([name, weights]) => <article key={name}><span>{name.replaceAll('_', ' ')}</span><strong>{(weights as { weight: number }[]).reduce((sum, item) => sum + item.weight, 0) * 100}% total weight</strong><div>{(weights as { metric: string; weight: number }[]).map((item) => <p key={item.metric}><span>{item.metric}</span><b>{Math.round(item.weight * 100)}%</b></p>)}</div></article>)}</div>
          </Panel>
          <Panel title="Daily update contract" icon={Database}><div className="update-flow"><span><b>1</b> Add <code>data/slates/YYYY-MM-DD.json</code></span><ChevronRight /><span><b>2</b> Import research &amp; freeze revisions</span><ChevronRight /><span><b>3</b> Settle results &amp; propose config changes</span></div></Panel>
        </TabsContent>
      </main>

      <TabsList className="mobile-nav">{nav.map(({ value, label, icon: Icon }) => <TabsTrigger key={value} value={value}><Icon size={18} /><span>{label === 'Real Card' ? 'Real' : label === 'Paper Lab' ? 'Paper' : label === 'Bet History' ? 'History' : label}</span></TabsTrigger>)}</TabsList>
      <footer className="site-footer"><span>OVERLAY v0.1</span><p>Research system only. No automated wagering.</p><span>History through {historyThrough}</span></footer>
    </Tabs>
  );
}
