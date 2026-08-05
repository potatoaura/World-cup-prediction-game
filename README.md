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

Optional economy variable:

`DAY_LENGTH_SECONDS = 600`

First admin: register and enter `ADMIN_CODE` in the optional admin code field.

## v3.0 gameplay state

The World Cup bracket UI has been removed from the main screen. Match prediction and payout endpoints remain in the API as archived season support.

Current main systems:

- Accounts and sessions
- Wallet, bank, debt, rating, life needs, rent, and timed work quests
- Slot and roulette casino games
- Dice, Crash, Mines, Blackjack, Wheel of Fortune, and lottery tickets
- Basic market trading
- Diversified businesses with upgrades and collectable daily income
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
- Revealed work quests now require task progress before the reward can be collected.
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
- The manual Next day button is removed from the player UI.
- Server upkeep advances days automatically on a hidden timer.
- Automatic upkeep lowers hunger and thirst, adds housing rent due, handles overdue loans, and applies rental-property income.
- Zero hunger or zero thirst blocks work quest completion.
- Overdue rent, starvation, and dehydration can reduce credit rating over time.

Real estate behavior:

- Apartments can be shown from the Real Estate panel.
- Apartments can be rented as the player's home or bought as investments.
- The cheapest buyable apartment costs 100000 wallet.
- Owned apartments can be rented out for passive income during automatic upkeep.
- Apartment cards show purchase price, home rent, deposit, floor, comfort points, and rent-out income.

Casino behavior:

- Slot jackpot chance is 0.05%, and its any-win chance is 1%.
- Roulette uses a European wheel order with a disclosed 1.5% exact-number win chance. The server result drives the ball stop position.
- Dice has a disclosed 10% exact-number win chance and pays 5.5x.
- Crash uses a 0.82 server-side house factor; a 2.00x target has a 41% win chance.
- Mines and Blackjack keep active games in D1 so the browser never receives hidden mine positions or the remaining deck.
- Mines requires 10-20 mines, defaults to 15, and requires two safe reveals before cashout. Blackjack dealers hit soft 17 and naturals pay 6:5.
- Wheel of Fortune uses weighted server-side segments, with a 6.5% chance to win more than the bet and prizes up to 10x.
- Lottery tickets cost 25, contain six unique numbers from 1-49, and join five-minute shared draws.
- Lottery draws settle when the API is next visited after the draw time; prizes are credited directly to winners' wallets.
- Five scratch-ticket designs cost 5-100 wallet and use symbol matching, number matching, or find-three rules.
- Scratch results are generated with server-side Web Crypto, stored in D1, and can be claimed only once after the coating is scratched or revealed.

Business behavior:

- Players can buy a Coffee Shop, Pizza Restaurant, Hotel, Gas Station, Supermarket, Casino, Football Club, and Bank.
- Every business has a purchase price, minimum credit rating, gross income, upkeep, and ten upgrade levels.
- Completed business days accumulate net profit for manual collection, capped at seven days of offline accrual.

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
