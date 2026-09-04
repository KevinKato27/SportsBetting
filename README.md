# OVERLAY v0.1

OVERLAY is a persistent, mobile-first sports betting research workspace. It visualizes daily slate gates, auditable candidate grades, paper experiments, real-card history, P&L, and learning evidence without placing wagers.

## Live site

The production website is published by GitHub Pages at `https://kevinkato27.github.io/SportsBetting/`. Every push to `main` rebuilds and deploys the same persistent site.

## Strategic source of truth

- `config/master-prompt/Master_Sports_Betting_Prompt_v4_2026-09-03.txt` is the preserved constitution.
- `config/scoring/market-models.v0.1.json` contains versioned prospective scoring models.
- `data/history/edge_lab_full_history.json` is the imported historical datastore.
- `data/imports/sports_betting_backtest_tracker_v0_45.xlsx` remains the reconciliation/export source during migration.
- `data/slates/YYYY-MM-DD.json` holds daily facts so future updates change data/config instead of creating a new site.
- `data/slates/current.json` is the dashboard pointer generated from the newest validated daily snapshot.

## Automatic updates

The GitHub Pages workflow refreshes schedule and result facts at 7:17 AM, 11:17 AM, 4:17 PM, and 11:17 PM America/New_York time. Each run records the exact endpoint, provider, and verification time, validates the payload, commits the dated snapshot, and deploys the current site. A failed source is labeled `source_error`; the updater never invents a game count. Betting inputs remain unavailable until authenticated providers are configured.

## Local development

Install dependencies and run `pnpm dev`. Use `pnpm build` to validate the Sites build and `pnpm build:pages` to validate the GitHub Pages artifact.

## Guardrails

OVERLAY is a research and tracking interface, not a sportsbook. Historical entries and design-demo cards are labeled. Current prices, lineups, injuries, weather, and bankroll must be independently re-verified before a card can move from PRELIMINARY to FINAL.
