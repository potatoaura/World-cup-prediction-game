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

## v2.2 gameplay state

The World Cup bracket UI has been removed from the main screen. Match prediction and payout endpoints remain in the API as archived season support.

Current main systems:

- Accounts and sessions
- Wallet, bank, debt, rating, and work income
- Slot and roulette casino games
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
- `Work +25` gives broke players a recovery path without using casino.
- Casino actions do not change credit rating.

Casino behavior:

- Slot jackpot chance is 0.1%.
- Slot any-win chance is 2%.
- Roulette uses a European wheel order. The server result drives the ball stop position.

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
