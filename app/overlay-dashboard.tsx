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
  LockKeyhole,
  Menu,
  ShieldCheck,
  Target,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import history from '@/data/history/edge_lab_full_history.json';
import slate from '@/data/slates/2026-09-03.json';
import models from '@/config/scoring/market-models.v0.1.json';

type Row = Record<string, string>;

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
  { value: 'real', label: 'Real Card', icon: WalletCards },
  { value: 'history', label: 'Bet History', icon: HistoryIcon },
  { value: 'paper', label: 'Paper Lab', icon: FlaskConical },
  { value: 'results', label: 'Results', icon: BarChart3 },
  { value: 'learning', label: 'Learning', icon: Beaker },
  { value: 'config', label: 'Config', icon: Database },
];

const candidates = [
  { entity: 'Jackson Chourio reference', market: '2+ Total Bases', matchup: 'Supplied mockup · not today’s wager', grade: referenceLegGrade, confidence: referenceLegConfidence, status: 'REFERENCE', tone: 'blue' },
  { entity: 'MLB full-slate audit', market: 'Daily discovery queue', matchup: '9 games · schedule verified', grade: null, confidence: null, status: 'NEEDS DATA', tone: 'amber' },
  { entity: 'CFB full-slate audit', market: 'Daily discovery queue', matchup: '13 games · schedule verified', grade: null, confidence: null, status: 'NEEDS DATA', tone: 'amber' },
  { entity: 'WNBA', market: 'No slate today', matchup: 'FIBA break · resumes Sep 17', grade: null, confidence: null, status: 'NO SLATE', tone: 'muted' },
];

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

function LegCard() {
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
  const recentTickets = (history['Ticket Log'] as Row[]).slice(-12).reverse();
  const activeGames = slate.leagues.reduce((sum, league) => sum + (league.status === 'active' ? (league.games ?? 0) : 0), 0);

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
            <div><span className="kicker">THURSDAY · SEP 3, 2026</span><h1>Today’s research desk</h1><p>Slate first. Analysis before market. Price before portfolio.</p></div>
            <div className="gate-pill"><LockKeyhole size={15} /><span><b>PRELIMINARY</b> · required gates open</span></div>
          </div>
          <div className="truth-strip" aria-label="Data freshness and provenance">
            <span><i className="truth-dot live" /><b>SCHEDULE VERIFIED</b> official league sources</span>
            <span><i className="truth-dot historical" /><b>HISTORY</b> through Sep 2</span>
            <span><i className="truth-dot reference" /><b>REFERENCE</b> supplied mockups only</span>
            <span><i className="truth-dot unavailable" /><b>UNAVAILABLE</b> odds · lineups · weather · promos</span>
          </div>
          <div className="status-grid">
            <div className="status-card accent"><span>ACTIVE SLATE</span><strong>{activeGames}</strong><small>9 MLB + 13 CFB schedule entries</small></div>
            <div className="status-card"><span>EARLIEST START</span><strong>12:35</strong><small>PM ET · MLB</small></div>
            <div className="status-card"><span>LATEST BANKROLL</span><strong>${number(stats.latest['Ending Bankroll']).toFixed(2)}</strong><small>historical snapshot · {stats.latest.Date}</small></div>
            <div className="status-card"><span>PROMO STATUS</span><strong>—</strong><small>not supplied · no assumption</small></div>
          </div>
          <div className="today-layout">
            <aside className="candidate-rail">
              <div className="rail-head"><div><span className="eyebrow">RESEARCH QUEUE</span><strong>{candidates.length} surfaced items</strong></div><button>Grade ↓</button></div>
              {candidates.map((candidate) => (
                <button className="candidate-card" key={candidate.entity} onClick={() => candidate.grade && document.getElementById('featured-leg')?.scrollIntoView({ behavior: 'smooth' })}>
                  <i className={`signal-dot ${candidate.tone}`} />
                  <div><strong>{candidate.entity}</strong><span>{candidate.market}</span><small>{candidate.matchup}</small></div>
                  {candidate.grade ? <div className="mini-score"><b className={gradeClass(candidate.grade)}>{candidate.grade}</b><small>{candidate.confidence} conf.</small></div> : <div className="mini-score pending">—</div>}
                  <span className="card-tag">{candidate.status}</span><ChevronRight className="candidate-arrow" size={16} />
                </button>
              ))}
              <Panel title="Slate detection" icon={Clock3} className="slate-panel">
                {slate.leagues.map((league) => (
                  <a className="slate-row" href={league.source} target="_blank" rel="noreferrer" key={league.league}>
                    <span><i className={league.status === 'active' ? 'signal-dot green' : 'signal-dot muted'} />{league.league}</span>
                    <b>{league.games ?? '—'}</b><small>{league.earliestStart ?? 'no games today'}</small>
                  </a>
                ))}
                <p className="timestamp">Verified {slate.lastVerified} · schedule only</p>
              </Panel>
            </aside>
            <div className="candidate-stage" id="featured-leg"><LegCard /></div>
          </div>
        </TabsContent>

        <TabsContent value="real">
          <div className="page-heading"><div><span className="kicker">TODAY ONLY · SEP 3, 2026</span><h1>Real Card</h1><p>Only wagers from today’s slate appear here. Prior days live in Bet History.</p></div><div className="gate-pill"><CircleAlert size={15} /><span><b>0 FINAL</b> · today</span></div></div>
          <div className="status-grid three"><div className="status-card accent"><span>TODAY’S TICKETS</span><strong>0</strong><small>nothing approved yet</small></div><div className="status-card"><span>TODAY’S RISK</span><strong>$0.00</strong><small>no bankroll committed</small></div><div className="status-card"><span>CARD STATUS</span><strong>PRELIM</strong><small>odds, lineup, weather and audit gates open</small></div></div>
          <Panel title="Today’s real-money card" icon={WalletCards} action={<span className="tag">SEP 3</span>}>
            <div className="empty-real-card">
              <div className="empty-real-icon"><LockKeyhole size={28} /></div>
              <strong>No bets have cleared today’s final gate.</strong>
              <p>Today’s candidate research remains preliminary. A ticket appears here only after the full-slate audit, exact-price check, role and lineup verification, exposure review, and bankroll confirmation.</p>
              <div className="gate-checks"><span><i /> Full slate scan</span><span><i /> Exact odds</span><span><i /> Lineup / role</span><span><i /> Portfolio audit</span></div>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="history">
          <div className="page-heading"><div><span className="kicker">ARCHIVED REAL-MONEY RECORD</span><h1>Bet History</h1><p>All settled and prior-day tickets stay here, separate from today’s card.</p></div><div className="gate-pill"><HistoryIcon size={15} /><span><b>THROUGH SEP 2</b></span></div></div>
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
            <Panel title="Operational datastore" icon={Database}><div className="config-card"><span>IMPORTED HISTORY</span><strong>v0.45 reconciled</strong><p>{(history['Candidate Log'] as Row[]).length} candidates · {(history['Ticket Log'] as Row[]).length} tickets · {(history['Paper Portfolio'] as Row[]).length} paper observations · {(history['Experiment Registry'] as Row[]).length} experiments.</p><div className="data-health"><CircleCheck size={16} /> JSON and workbook retained for audit and export compatibility</div></div></Panel>
          </div>
          <Panel title="Market-specific scoring models" icon={Target} action={<span className="tag">{models.version}</span>}>
            <div className="model-grid">{Object.entries(models.models).map(([name, weights]) => <article key={name}><span>{name.replaceAll('_', ' ')}</span><strong>{(weights as { weight: number }[]).reduce((sum, item) => sum + item.weight, 0) * 100}% total weight</strong><div>{(weights as { metric: string; weight: number }[]).map((item) => <p key={item.metric}><span>{item.metric}</span><b>{Math.round(item.weight * 100)}%</b></p>)}</div></article>)}</div>
          </Panel>
          <Panel title="Daily update contract" icon={Database}><div className="update-flow"><span><b>1</b> Add <code>data/slates/YYYY-MM-DD.json</code></span><ChevronRight /><span><b>2</b> Import research &amp; freeze revisions</span><ChevronRight /><span><b>3</b> Settle results &amp; propose config changes</span></div></Panel>
        </TabsContent>
      </main>

      <TabsList className="mobile-nav">{nav.slice(0, 5).map(({ value, label, icon: Icon }) => <TabsTrigger key={value} value={value}><Icon size={18} /><span>{label === 'Real Card' ? 'Real' : label === 'Paper Lab' ? 'Paper' : label === 'Bet History' ? 'History' : label}</span></TabsTrigger>)}</TabsList>
      <footer className="site-footer"><span>OVERLAY v0.1</span><p>Research system only. No automated wagering.</p><span>History through 2026-09-02</span></footer>
    </Tabs>
  );
}
