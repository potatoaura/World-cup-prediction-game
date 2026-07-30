# Prediction Economy

## Cloudflare Pages settings

Framework preset: None
Build command: empty
Build output directory: public

## D1 setup

Create a D1 database named `worldcup_db`.

Run `schema.sql`, then `seed.sql` in the D1 Console.

Pages project -> Settings -> Functions -> D1 bindings:

Variable name: `DB`
Database: `worldcup_db`

Environment variable:

`ADMIN_CODE = your secret admin code`

First admin: register and enter `ADMIN_CODE` in the optional admin code field.

## v2.9 gameplay state

The World Cup bracket UI has been removed from the main screen. Match prediction and payout endpoints remain in the API as archived season support.

Current main systems:

- Accounts and sessions
- Wallet, bank, debt, rating, life needs, rent, and timed work quests
- Slot and roulette casino games
- Basic market trading
- Leaderboard
- Admin user management

Admin users can:

- Add or remove wallet money
- Add or remove bank money
- Clear player debt
- Set credit rating through the API
- Ban and unban regular players

Loan behavior:

- Players can take more than one loan while they still have available credit.
- Work is now a board flow: post an ad, wait while the offer is hidden, then reveal and collect the quest reward.
- Production work quest search time is random by default: 2-10 minutes.
- The client does not receive exact remaining work time while a job is hidden.
- Revealed work quests now include a description and concrete task objective.
- Casino actions do not change credit rating.

Life behavior:

- Players have hunger, thirst, food storage, water storage, housing, and rent due.
- The life shop sells water, snacks, pizza, steak, sushi, and rose berry cake.
- Food and drinks have different hunger and thirst effects.
- Players can choose housing from listings shown beside a small city map.
- Better housing costs a deposit and changes rent added each day.
- Advancing to the next day lowers hunger and thirst and adds housing rent due.
- Zero hunger or zero thirst blocks work quest completion.
- Overdue rent, starvation, and dehydration can reduce credit rating over time.

Casino behavior:

- Slot jackpot chance is 0.1%.
- Slot any-win chance is 2%.
- Roulette uses a European wheel order. The server result drives the ball stop position and the UI uses the original simple spin-only animation.

Market behavior:

- Players can buy and sell shares from the main screen.
- Prices are stored in D1 and move roughly every 45 seconds.
- Market movement is risky but no longer broadly biased downward.
- Each tick can produce a small move, a rare selloff, or a rally, with more rebound chance after drops.
- Assets keep a small fundamental price floor, so old selloff streaks cannot trap the whole board near 1 forever.
- Companies update on staggered timers instead of all changing at the same moment.
- More companies are listed, every asset card shows a saved price-history chart, and clicking a company opens an all-time chart with the player's trade prices.
- Portfolio value is included in player state.

## Local development

Install dependencies:

```bash
npm install
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm.ps1`.

Create `.dev.vars` from `.dev.vars.example` and set `ADMIN_CODE`.

Set up local D1:

```bash
npm run db:setup
```

Run Pages locally:

```bash
npm run dev
```

Run the core API smoke test:

```bash
npm run smoke
```

The local Wrangler config is intentionally named `wrangler.local.toml` so it does not replace the production D1 binding configured in the Cloudflare dashboard.
