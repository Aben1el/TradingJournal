# TradeVault — Professional Trading Journal

A modern, professional trading journal web application designed for serious traders.
Track performance, analyze psychology, and improve consistently.

## Features

- **Landing Page** — Premium dark design with animated lighting and smooth scroll reveals
- **Dashboard** — Greeting header, today's P&L, current balance, streaks, monthly performance navigator, recent trades, and Smart Insights generated from your real data
- **Trade Journal** — Full trade logging with entry/exit, R multiples, strategies, sessions, emotions, discipline ratings, notes, and chart screenshots
- **Trade History** — Search, filters (asset/strategy/result/direction), pagination, CSV import & export
- **Reviews** — Daily, weekly, and monthly trading reviews
- **Strategy Analytics** — Win rate, P&L, avg R, profit factor, best/worst trade per strategy with comparison table
- **Psychology** — Discipline bands, emotion analysis, and mindset insights connected to real performance
- **Calculators** — Position size, risk/reward, and risk calculators
- **Goals** — Visual progress tracking
- **Data Safety** — Everything stored locally in your browser (IndexedDB). JSON backup & restore included.

## Technology

- Pure HTML / CSS / JavaScript (no frameworks, no build step)
- IndexedDB for local storage
- Chart.js for visualizations
- Hosted on GitHub Pages

## Getting Started

1. Clone or download this repository
2. Open `index.html` in your browser
3. Or deploy to GitHub Pages (Settings → Pages → Deploy from branch `main`)

## Your Data

- All data lives **only in your browser** — private by default.
- Use **Settings → Export All Data** for a full JSON backup.
- Use **Trades → Export CSV** to open your trades in Excel/Sheets.
- Use **Trades → Import CSV** to bring trades from a broker or another journal.
  (Recognized columns: date, symbol, direction/side, entry, exit, stop loss, size, P&L, R, strategy, session, notes…)

## Project Structure
