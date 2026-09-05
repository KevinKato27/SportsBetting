# OVERLAY v0.1

OVERLAY is a persistent, mobile-first sports betting research workspace. It visualizes daily slate gates, auditable candidate grades, paper experiments, real-card history, P&L, and learning evidence without placing wagers.

## Live site

The production website is published by GitHub Pages at `https://kevinkato27.github.io/SportsBetting/`. Every push to `main` rebuilds and deploys the same persistent site.

## Strategic source of truth

- `config/master-prompt/Master_Sports_Betting_Prompt_v4.1_2026-09-04.txt` is the current constitution. It preserves the v4 rules and adds source-blind audit, standalone qualification, frozen rankings, causal construction, broad-market comparison, and source-learning controls.
- `config/master-prompt/Independent_Candidate_Discovery_Addendum_v4.2_2026-09-04.txt` requires every research chat to search the full eligible slate instead of defaulting to supplied-card names.
- `config/master-prompt/Paper_Lab_Production_Gate_Addendum_v4.4_2026-09-05.txt` makes exact external originals, feature tests, construction tests, and system challengers prospective Paper Lab objects while reserving real money for previously supported edge families.
- `config/prompt-stack.v4.4.json` defines the three-file prompt package that must be loaded together.
- `config/candidate-discovery-policy.v0.2.json` makes independent-first discovery, candidate-origin labels, and slate-coverage reporting machine-checkable.
- `config/evals/candidate-discovery.v0.1.json` tests that the model can surface a stronger unlisted candidate, recognize genuine overlap, and return no pick when appropriate.
- `config/scoring/market-models.v0.1.json` contains versioned prospective scoring models.
- `config/sports-scope.v0.2.json` defines the approved soccer competitions and blocks unsourced soccer grades.
- `config/sportsbooks.v0.1.json` sets DraftKings as the primary book and defines each sport's slip research markets.
- `data/history/edge_lab_full_history.json` is the imported historical datastore.
- `data/imports/sports_betting_backtest_tracker_v0_45.xlsx` remains the reconciliation/export source and receives the same current slate in its `Daily Slate` worksheet.
- `data/slates/YYYY-MM-DD.json` holds daily facts so future updates change data/config instead of creating a new site.
- `data/slates/current.json` is the dashboard pointer generated from the newest validated daily snapshot.
- `data/chat-intake/YYYY-MM-DD.json` contains minimized, public-safe same-day slip summaries from user-authorized project chats. It never stores transcripts or conversation identifiers.
- `data/morning-scan/current.json` holds the first daily independent slate pass, prospective lineups and role projections, candidate origins, and exact source URLs. Projections are never presented as confirmed lineups.

## Automatic updates

The GitHub Pages workflow refreshes schedule and result facts at 7:17 AM, 11:17 AM, 4:17 PM, and 11:17 PM America/New_York time. Each run records the exact endpoint, provider, and verification time, validates the payload, syncs the tracker workbook, commits both artifacts, and deploys the current site. The game-level feed includes teams, scores, status, venue, broadcasts, and announced MLB probable pitchers. A failed source is labeled `source_error`; the updater never invents a game count. Betting inputs remain unavailable until authenticated providers are configured.

An hourly Codex watcher checks the Sports Betting project for newly updated chats. Its first morning run builds the independent slate and prospective lineup map before reading supplied cards; later runs revise the same daily snapshot. Meaningful same-day slip changes are summarized into `data/chat-intake`, validated, synchronized to the workbook, and pushed to this repository. A ticket enters the Real Card when the user explicitly says it was placed, answers affirmatively to a direct placement question, or says “done” immediately after a specific placement instruction. Recommendations without that confirmation remain outside the Real Card.

Soccer coverage is intentionally limited to the Premier League, La Liga, Bundesliga, Serie A, Ligue 1, UEFA Champions League, and UEFA Europa League. MLS and the Saudi Pro League are excluded.

## Local development

Install dependencies and run `pnpm dev`. Use `pnpm refresh:data`, `pnpm validate:data`, `pnpm validate:config`, `pnpm validate:intake`, and `pnpm sync:workbook` for the daily pipeline. Use `pnpm build` to validate the Sites build and `pnpm build:pages` to validate the GitHub Pages artifact.

## Guardrails

OVERLAY is a research and tracking interface, not a sportsbook. Historical entries and design-demo cards are labeled. Current prices, lineups, injuries, weather, and bankroll must be independently re-verified before a card can move from PRELIMINARY to FINAL. Supplied cards are research inputs, not the candidate universe: GPT searches the full eligible slate, identifies its own candidates, then compares and merges the two lists with visible origin labels.
