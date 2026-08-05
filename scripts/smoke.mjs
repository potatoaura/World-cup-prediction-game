import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";

const root = process.cwd();
const npx = process.platform === "win32" ? "cmd.exe" : "npx";
const npxPrefix = process.platform === "win32" ? ["/d", "/s", "/c", "npx.cmd"] : [];
const adminCode = "dev-admin-code";
const stamp = Date.now();
const persistTo = path.join(".wrangler", `smoke-${stamp}`);
const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const workAnswersByTitle = {
  "Deliver stadium flyers": ["route_market", "stacks_5"],
  "Clean a snack kiosk": ["grill_power", "clean_correct"],
  "Repair betting terminals": ["network_cable", "printer_clear", "terminal_demo"],
  "Guard VIP parking": ["pass_hold", "lane_clear", "plate_verify"],
  "Audit casino receipts": ["audit_5_over", "audit_duplicate", "cash_225", "card_exception"],
  "Recover missing sponsor files": ["files_call", "files_location", "files_escalate", "files_receipt"],
  "Run a private finals event": ["event_verify", "event_catering", "event_exit", "event_entry", "event_close"],
};

function runNpx(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(npx, [...npxPrefix, ...args], { cwd: root, shell: false, windowsHide: true });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk; });
    child.stderr.on("data", chunk => { output += chunk; });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolve(output);
      else reject(new Error(`npx ${args.join(" ")} failed with code ${code}\n${output}`));
    });
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
    server.on("error", reject);
  });
}

function startServer() {
  const args = [
    "wrangler", "pages", "dev", "public",
    "--d1", "DB=worldcup_db",
    "--binding", `ADMIN_CODE=${adminCode}`,
    "--binding", "WORK_WAIT_SECONDS=2",
    "--binding", "STORE_SALE_TICK_SECONDS=1",
    "--binding", "STORE_EVENT_WAIT_SECONDS=2",
    "--persist-to", persistTo,
    "--port", String(port),
    "--compatibility-date=2026-07-07",
    "--log-level", "error",
    "--show-interactive-dev-session=false",
  ];
  return spawn(npx, [...npxPrefix, ...args], {
    cwd: root,
    detached: process.platform !== "win32",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

function stopServer(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
}

async function waitForReady() {
  const deadline = Date.now() + 60_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const state = await request("/api/state");
      if (state.matches?.length === 31) return state;
      lastError = new Error(`expected 31 matches, got ${state.matches?.length ?? "none"}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw lastError || new Error("Pages Dev did not become ready");
}

function makeSession() {
  return { cookies: new Map() };
}

function cookieHeader(session) {
  return [...session.cookies].map(([key, value]) => `${key}=${value}`).join("; ");
}

function applySetCookie(session, response) {
  const values = response.headers.getSetCookie?.() || [response.headers.get("set-cookie")].filter(Boolean);
  for (const value of values) {
    const [pair] = value.split(";");
    const index = pair.indexOf("=");
    if (index === -1) continue;
    const key = pair.slice(0, index);
    const cookieValue = pair.slice(index + 1);
    if (!cookieValue) session.cookies.delete(key);
    else session.cookies.set(key, cookieValue);
  }
}

async function request(urlPath, { method = "GET", body, session } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (session && session.cookies.size) headers.Cookie = cookieHeader(session);
  const response = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (session) applySetCookie(session, response);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`${method} ${urlPath} failed: ${data.error || response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function expectError(status, urlPath, options = {}) {
  try {
    await request(urlPath, options);
  } catch (error) {
    if (error.status === status) return error;
    throw error;
  }
  throw new Error(`Expected ${urlPath} to fail with ${status}`);
}

await runNpx(["wrangler", "d1", "execute", "worldcup_db", "--local", "--config", "wrangler.local.toml", "--persist-to", persistTo, "--file", "schema.sql"]);
await runNpx(["wrangler", "d1", "execute", "worldcup_db", "--local", "--config", "wrangler.local.toml", "--persist-to", persistTo, "--file", "seed.sql"]);

const server = startServer();
let serverOutput = "";
server.stdout.on("data", chunk => { serverOutput += chunk; });
server.stderr.on("data", chunk => { serverOutput += chunk; });

try {
  await waitForReady();

  const player = makeSession();
  const admin = makeSession();
  const borrower = makeSession();
  const propertyBuyer = makeSession();
  const storeOwner = makeSession();
  const casinoOwner = makeSession();
  const playerName = `player_${stamp}`;
  const adminName = `admin_${stamp}`;
  const borrowerName = `borrower_${stamp}`;
  const propertyBuyerName = `property_${stamp}`;
  const storeOwnerName = `store_${stamp}`;
  const casinoOwnerName = `casino_${stamp}`;

  const registeredPlayer = await request("/api/register", {
    method: "POST",
    body: { username: playerName, password: "pass1234", adminCode: "" },
    session: player,
  });
  assert(!registeredPlayer.user.isAdmin, "regular player registered as admin");

  await request("/api/logout", { session: player });
  await request("/api/login", {
    method: "POST",
    body: { username: playerName, password: "pass1234" },
    session: player,
  });

  await request("/api/bank", { method: "POST", body: { action: "withdraw", amount: 50 }, session: player });
  await request("/api/predict", { method: "POST", body: { matchId: "M77", team: "France" }, session: player });
  await request("/api/bet", { method: "POST", body: { matchId: "M77", team: "France", amount: 10 }, session: player });

  const registeredAdmin = await request("/api/register", {
    method: "POST",
    body: { username: adminName, password: "pass1234", adminCode },
    session: admin,
  });
  assert(registeredAdmin.user.isAdmin, "admin registration failed");

  await request("/api/admin/userAction", {
    method: "POST",
    body: { userId: registeredAdmin.user.id, action: "addWallet", amount: 500, reason: "smoke self-fund" },
    session: admin,
  });
  let adminState = await request("/api/state", { session: admin });
  assert(adminState.user.wallet === 500, `expected admin wallet 500, got ${adminState.user.wallet}`);
  assert(adminState.adminUsers.some(user => user.id === registeredPlayer.user.id), "admin user list missing player");

  await request("/api/admin/userAction", {
    method: "POST",
    body: { userId: registeredPlayer.user.id, action: "addWallet", amount: 100, reason: "smoke grant" },
    session: admin,
  });

  let playerState = await request("/api/state", { session: player });
  assert(playerState.user.wallet === 140, `expected player wallet 140, got ${playerState.user.wallet}`);

  await request("/api/admin/setWinner", { method: "POST", body: { matchId: "M77", winner: "France" }, session: admin });

  const finalState = await request("/api/state", { session: player });
  const m77 = finalState.matches.find(match => match.id === "M77");
  assert(m77?.closed && m77.winner === "France", "admin winner was not persisted");
  assert(finalState.user.wallet === 160, `expected wallet 160, got ${finalState.user.wallet}`);
  assert(finalState.user.bank === 50, `expected bank 50, got ${finalState.user.bank}`);
  assert(finalState.user.score === 5, `expected score 5, got ${finalState.user.score}`);
  assert(finalState.user.rating === 700, `expected rating 700, got ${finalState.user.rating}`);
  assert(finalState.user.life?.hunger === 100, "new player hunger missing");
  assert(finalState.user.life?.thirst === 100, "new player thirst missing");
  assert(finalState.user.life?.food >= 1, "new player food storage missing");
  assert(finalState.user.life?.water >= 1, "new player water storage missing");
  assert(finalState.user.life?.items?.length >= 6, "life shop catalog missing");
  assert(finalState.user.life?.housingListings?.length >= 5, "housing listings missing");
  assert(finalState.properties?.listings?.some(item => item.price >= 100000), "property listings missing 100k apartments");

  const registeredCasinoOwner = await request("/api/register", {
    method: "POST",
    body: { username: casinoOwnerName, password: "pass1234", adminCode: "" },
    session: casinoOwner,
  });
  await request("/api/admin/userAction", {
    method: "POST",
    body: { userId: registeredCasinoOwner.user.id, action: "addWallet", amount: 4000000, reason: "smoke casino and businesses grant" },
    session: admin,
  });
  await request("/api/admin/userAction", {
    method: "POST",
    body: { userId: registeredCasinoOwner.user.id, action: "setRating", amount: 800, reason: "smoke business rating" },
    session: admin,
  });
  const casinoStart = await request("/api/state", { session: casinoOwner });
  assert(casinoStart.businesses?.catalog?.length === 8, "business catalog should contain eight businesses");
  assert(casinoStart.businesses.catalog.some(item => item.id === "coffee_shop"), "coffee shop business missing");
  assert(casinoStart.businesses.catalog.some(item => item.id === "pizza_restaurant"), "pizza restaurant business missing");
  assert(casinoStart.businesses.catalog.some(item => item.id === "hotel"), "hotel business missing");
  assert(casinoStart.businesses.catalog.some(item => item.id === "gas_station"), "gas station business missing");
  assert(casinoStart.businesses.catalog.some(item => item.id === "supermarket"), "supermarket business missing");
  assert(casinoStart.businesses.catalog.some(item => item.id === "casino"), "casino business missing");
  assert(casinoStart.businesses.catalog.some(item => item.id === "football_club"), "football club business missing");
  assert(casinoStart.businesses.catalog.some(item => item.id === "bank"), "bank business missing");
  await request("/api/business", {
    method: "POST",
    body: { action: "buy", businessType: "coffee_shop" },
    session: casinoOwner,
  });
  await request("/api/business", {
    method: "POST",
    body: { action: "upgrade", businessType: "coffee_shop" },
    session: casinoOwner,
  });
  await request("/api/business", {
    method: "POST",
    body: { action: "buy", businessType: "bank" },
    session: casinoOwner,
  });
  const businessReady = await request("/api/state", { session: casinoOwner });
  assert(businessReady.businesses.owned.length === 2, "business purchases did not persist");
  assert(businessReady.businesses.owned.find(item => item.id === "coffee_shop")?.level === 2, "business upgrade did not persist");
  assert(businessReady.casino.scratchCatalog?.length === 5, "scratch ticket catalog should contain five designs");
  assert(businessReady.casino.scratchCatalog.some(type => type.mode === "numbers"), "number scratch ticket missing");
  assert(businessReady.casino.scratchCatalog.some(type => type.mode === "match3"), "symbol scratch ticket missing");

  const numberScratch = await request("/api/casino/scratch", {
    method: "POST",
    body: { action: "buy", ticketType: "golden_numbers" },
    session: casinoOwner,
  });
  assert(numberScratch.ticket.status === "revealed", "number scratch ticket was not created");
  assert(numberScratch.ticket.result?.winningNumbers?.length === 2, "scratch winning numbers missing");
  assert(numberScratch.ticket.result?.numbers?.length === 8, "scratch player numbers missing");
  const symbolScratch = await request("/api/casino/scratch", {
    method: "POST",
    body: { action: "buy", ticketType: "gem_hunt" },
    session: casinoOwner,
  });
  assert(symbolScratch.ticket.result?.cells?.length === 9, "symbol scratch cells missing");
  const scratchClaim = await request("/api/casino/scratch", {
    method: "POST",
    body: { action: "claim", ticketId: numberScratch.ticket.id },
    session: casinoOwner,
  });
  assert(scratchClaim.ticket.status === "claimed", "scratch ticket claim failed");
  const duplicateScratchClaim = await request("/api/casino/scratch", {
    method: "POST",
    body: { action: "claim", ticketId: numberScratch.ticket.id },
    session: casinoOwner,
  });
  assert(duplicateScratchClaim.alreadyClaimed === true, "scratch ticket could be claimed twice");

  const dicePlay = await request("/api/casino/dice", {
    method: "POST",
    body: { amount: 10, number: 4 },
    session: casinoOwner,
  });
  assert(dicePlay.result >= 1 && dicePlay.result <= 6, "dice result outside 1-6");
  assert(dicePlay.winChance === 0.1, "dice win chance is not 10%");
  const crashPlay = await request("/api/casino/crash", {
    method: "POST",
    body: { amount: 10, target: 2 },
    session: casinoOwner,
  });
  assert(crashPlay.crashPoint >= 1 && typeof crashPlay.won === "boolean", "crash result missing");
  assert(crashPlay.houseFactor === 0.82 && crashPlay.winChance === 0.41, "crash odds are not reduced");
  const fortunePlay = await request("/api/casino/wheel", {
    method: "POST",
    body: { amount: 10 },
    session: casinoOwner,
  });
  assert(fortunePlay.segmentIndex >= 0 && fortunePlay.segmentIndex < 9, "fortune wheel segment invalid");
  assert(fortunePlay.winChance === 0.065, "fortune wheel win chance is not 6.5%");
  assert(fortunePlay.anyPayoutChance === 0.175, "fortune wheel payout chance is not 17.5%");
  const slotPlay = await request("/api/casino/slot", {
    method: "POST",
    body: { amount: 1 },
    session: casinoOwner,
  });
  assert(slotPlay.reels?.length === 3, "slot reels missing");
  assert(slotPlay.odds?.jackpot === 0.0005 && slotPlay.odds?.anyWin === 0.01, "slot odds are not reduced");

  const minesStart = await request("/api/casino/mines", {
    method: "POST",
    body: { action: "start", amount: 10 },
    session: casinoOwner,
  });
  assert(minesStart.game.mode === "prize_tiles" && minesStart.game.tiles === null, "Mines prize board leaked before selection");
  assert(minesStart.game.distribution?.x2 === 3 && minesStart.game.distribution?.LOSE === 4, "Mines distribution is invalid");
  const minesResult = await request("/api/casino/mines", {
    method: "POST",
    body: { action: "reveal", position: 0 },
    session: casinoOwner,
  });
  assert(minesResult.game.status === "settled" && minesResult.game.revealed[0] === 0, "Mines pick did not settle");
  assert(minesResult.game.tiles?.length === 25 && minesResult.game.result?.label, "Mines result board is missing");
  const minesLabels = minesResult.game.tiles.map(tile => tile.label);
  for (const label of ["x2", "x1.5", "x1.2", "x1", "x0.5", "x0.2", "x0"]) {
    assert(minesLabels.filter(value => value === label).length === 3, `Mines ${label} tile count is invalid`);
  }
  assert(minesLabels.filter(value => value === "LOSE").length === 4, "Mines losing tile count is invalid");
  assert(minesResult.game.payout === Math.floor(10 * minesResult.game.result.multiplier), "Mines payout does not match its tile");

  let blackjackStart;
  for (let attempt = 0; attempt < 5; attempt++) {
    blackjackStart = await request("/api/casino/blackjack", {
      method: "POST",
      body: { action: "start", amount: 20 },
      session: casinoOwner,
    });
    if (blackjackStart.game.status === "active") break;
  }
  assert(blackjackStart?.game?.playerCards?.length === 2, "Blackjack deal missing player cards");
  if (blackjackStart.game.status === "active") {
    const blackjackEnd = await request("/api/casino/blackjack", {
      method: "POST",
      body: { action: "stand" },
      session: casinoOwner,
    });
    assert(blackjackEnd.game.status !== "active", "Blackjack stand did not settle hand");
  }

  const lotteryBuy = await request("/api/lottery", {
    method: "POST",
    body: { action: "buy" },
    session: casinoOwner,
  });
  assert(lotteryBuy.ticket.numbers.length === 6, "lottery Quick Pick did not create six numbers");
  assert(new Set(lotteryBuy.ticket.numbers).size === 6, "lottery ticket numbers are not unique");
  assert(lotteryBuy.ticket.numbers.every(number => number >= 1 && number <= 49), "lottery number outside 1-49");
  const casinoReady = await request("/api/state", { session: casinoOwner });
  assert(casinoReady.lottery.tickets.some(ticket => ticket.id === lotteryBuy.ticket.id), "lottery ticket was not persisted");
  assert(casinoReady.casino.recent.some(play => play.game === "dice"), "casino history missing dice play");
  assert(casinoReady.casino.scratchTickets.some(ticket => ticket.id === numberScratch.ticket.id && ticket.status === "claimed"), "claimed scratch ticket was not persisted");
  assert(casinoReady.casino.recent.some(play => play.game === "scratch-golden_numbers"), "casino history missing scratch ticket");

  const registeredPropertyBuyer = await request("/api/register", {
    method: "POST",
    body: { username: propertyBuyerName, password: "pass1234", adminCode: "" },
    session: propertyBuyer,
  });
  await request("/api/admin/userAction", {
    method: "POST",
    body: { userId: registeredPropertyBuyer.user.id, action: "addWallet", amount: 110000, reason: "smoke property grant" },
    session: admin,
  });
  await request("/api/property", {
    method: "POST",
    body: { action: "buy", propertyId: "micro_loft" },
    session: propertyBuyer,
  });
  const propertyAfterBuy = await request("/api/state", { session: propertyBuyer });
  assert(propertyAfterBuy.properties.owned.length === 1, "property buy did not create owned apartment");
  assert(propertyAfterBuy.properties.owned[0].price === 100000, "cheapest apartment should cost 100000");
  await request("/api/property", {
    method: "POST",
    body: { action: "toggleRentOut", ownedId: propertyAfterBuy.properties.owned[0].id },
    session: propertyBuyer,
  });
  const propertyAfterRentOut = await request("/api/state", { session: propertyBuyer });
  assert(propertyAfterRentOut.properties.incomePerDay > 0, "renting out property did not add income");
  await request("/api/bank", { method: "POST", body: { action: "nextDay", amount: 1 }, session: propertyBuyer });
  const propertyAfterWear = await request("/api/state", { session: propertyBuyer });
  assert(propertyAfterWear.properties.owned[0].condition === 96, "rented property did not wear by four points per day");
  assert(propertyAfterWear.properties.owned[0].repairCost > 0, "property repair cost missing after wear");
  await request("/api/property", {
    method: "POST",
    body: { action: "repair", ownedId: propertyAfterWear.properties.owned[0].id },
    session: propertyBuyer,
  });
  const propertyAfterRepair = await request("/api/state", { session: propertyBuyer });
  assert(propertyAfterRepair.properties.owned[0].condition === 100, "property repair did not restore condition");
  await request("/api/property", {
    method: "POST",
    body: { action: "rentHome", propertyId: "market_studio" },
    session: propertyBuyer,
  });
  const propertyAfterHomeRent = await request("/api/state", { session: propertyBuyer });
  assert(propertyAfterHomeRent.user.life.housing.id === "market_studio", "renting apartment as home did not update housing");

  const registeredStoreOwner = await request("/api/register", {
    method: "POST",
    body: { username: storeOwnerName, password: "pass1234", adminCode: "" },
    session: storeOwner,
  });
  await request("/api/admin/userAction", {
    method: "POST",
    body: { userId: registeredStoreOwner.user.id, action: "addWallet", amount: 970000, reason: "smoke store and city grant" },
    session: admin,
  });
  const storeBeforeBuy = await request("/api/state", { session: storeOwner });
  assert(!storeBeforeBuy.store.owned, "new player should not own a store");
  assert(storeBeforeBuy.store.premisesListings.some(item => item.id === "street_kiosk" && item.price === 25000), "store premises catalog missing");
  const firstStorePurchase = await request("/api/store", {
    method: "POST",
    body: { action: "buyPremises", premisesId: "street_kiosk" },
    session: storeOwner,
  });
  const firstStoreId = firstStorePurchase.storeId;
  assert(firstStoreId, "store purchase did not return a location id");
  await request("/api/store", {
    method: "POST",
    body: { action: "buyEquipment", storeId: firstStoreId, equipmentId: "shelves" },
    session: storeOwner,
  });
  await request("/api/store", {
    method: "POST",
    body: { action: "restock", storeId: firstStoreId, productId: "bread", quantity: 20 },
    session: storeOwner,
  });
  await request("/api/store", {
    method: "POST",
    body: { action: "setMarkup", storeId: firstStoreId, markup: 1.2 },
    session: storeOwner,
  });
  await request("/api/store", {
    method: "POST",
    body: { action: "rename", storeId: firstStoreId, name: "Smoke Market" },
    session: storeOwner,
  });
  await request("/api/store", {
    method: "POST",
    body: { action: "hireStaff", storeId: firstStoreId, roleId: "cashier" },
    session: storeOwner,
  });
  await request("/api/store", {
    method: "POST",
    body: { action: "hireStaff", storeId: firstStoreId, roleId: "stocker" },
    session: storeOwner,
  });
  const secondStorePurchase = await request("/api/store", {
    method: "POST",
    body: { action: "buyPremises", premisesId: "corner_store" },
    session: storeOwner,
  });
  assert(secondStorePurchase.storeId !== firstStoreId, "second location reused the first store id");
  await expectError(400, "/api/store", {
    method: "POST",
    body: { action: "buyPremises", premisesId: "street_kiosk" },
    session: storeOwner,
  });
  const storeReady = await request("/api/state", { session: storeOwner });
  assert(storeReady.store.owned && storeReady.store.stores.length === 2, "player should own two store locations");
  const firstStoreReady = storeReady.store.stores.find(item => item.id === firstStoreId);
  const secondStoreReady = storeReady.store.stores.find(item => item.id === secondStorePurchase.storeId);
  assert(firstStoreReady?.status === "open", "stocked store should be open");
  assert(firstStoreReady.name === "Smoke Market", "store rename did not persist");
  assert(firstStoreReady.staff.find(item => item.id === "cashier")?.level === 1, "cashier hire did not persist");
  assert(firstStoreReady.staff.find(item => item.id === "stocker")?.level === 1, "stock clerk hire did not persist");
  assert(firstStoreReady.staffCount === 2, "store staff count incorrect");
  assert(firstStoreReady.capacity >= firstStoreReady.premises.capacity + 45, "staff storage bonus missing");
  assert(firstStoreReady.products.length >= 14, "new supplier products missing");
  const initialBreadStock = firstStoreReady.products.find(item => item.id === "bread")?.stock;
  assert(initialBreadStock > 0 && initialBreadStock <= 20, "store stock did not persist");
  assert(firstStoreReady.products.find(item => item.id === "water")?.unlocked === false, "fridge product unlocked without fridge");
  assert(secondStoreReady.products.find(item => item.id === "bread")?.stock === 0, "stock leaked into second location");
  let storeAfterSales;
  for (let index = 0; index < 4; index++) {
    await delay(1100);
    storeAfterSales = await request("/api/state", { session: storeOwner });
  }
  const firstStoreAfterSales = storeAfterSales.store.stores.find(item => item.id === firstStoreId);
  assert(firstStoreAfterSales.lifetimeRevenue > 0, "automatic store sales produced no revenue");
  assert(firstStoreAfterSales.products.find(item => item.id === "bread")?.stock < initialBreadStock, "automatic store sales did not reduce stock");
  assert(firstStoreAfterSales.recentSales.length > 0, "store sales history missing");
  assert(firstStoreAfterSales.condition < 100, "store did not wear after serving customers");
  assert(firstStoreAfterSales.incident?.choices?.length === 3, "live store incident was not generated");
  assert(storeAfterSales.user.wallet > storeReady.user.wallet, "store revenue did not reach wallet");
  const incidentChoice = firstStoreAfterSales.incident.choices.find(choice => !choice.locked && choice.cost <= storeAfterSales.user.wallet);
  assert(incidentChoice, "store incident has no available response");
  await request("/api/store", {
    method: "POST",
    body: {
      action: "resolveIncident",
      storeId: firstStoreId,
      incidentId: firstStoreAfterSales.incident.id,
      choiceId: incidentChoice.id,
    },
    session: storeOwner,
  });
  await expectError(404, "/api/store", {
    method: "POST",
    body: {
      action: "resolveIncident",
      storeId: firstStoreId,
      incidentId: firstStoreAfterSales.incident.id,
      choiceId: incidentChoice.id,
    },
    session: storeOwner,
  });
  const storeAfterIncident = await request("/api/state", { session: storeOwner });
  const firstStoreAfterIncident = storeAfterIncident.store.stores.find(item => item.id === firstStoreId);
  assert(!firstStoreAfterIncident.incident, "resolved incident remained active");
  assert(firstStoreAfterIncident.incidentHistory[0]?.choice, "incident history did not record response");
  assert(storeAfterIncident.store.empire.staff === 2, "empire staff summary incorrect");
  await request("/api/store", {
    method: "POST",
    body: { action: "repair", storeId: firstStoreId },
    session: storeOwner,
  });
  const storeAfterRepair = await request("/api/state", { session: storeOwner });
  assert(storeAfterRepair.store.stores.find(item => item.id === firstStoreId)?.condition === 100, "store repair failed");

  assert(storeAfterRepair.city?.news?.title, "city news missing from state");
  assert(storeAfterRepair.city.stores.find(item => item.id === firstStoreId)?.competitor?.name, "store competitor missing");
  await request("/api/city", {
    method: "POST",
    body: { action: "setSupplier", storeId: firstStoreId, supplierId: "premium_imports" },
    session: storeOwner,
  });
  await request("/api/city", {
    method: "POST",
    body: { action: "startCampaign", storeId: firstStoreId, campaignId: "flyers" },
    session: storeOwner,
  });
  await request("/api/city", {
    method: "POST",
    body: { action: "renameBrand", name: "Smoke City Retail" },
    session: storeOwner,
  });
  await request("/api/city", { method: "POST", body: { action: "upgradeBrand" }, session: storeOwner });
  await request("/api/city", {
    method: "POST",
    body: { action: "buyVehicle", vehicleId: "scooter" },
    session: storeOwner,
  });
  await request("/api/city", { method: "POST", body: { action: "upgradeWarehouse" }, session: storeOwner });
  await request("/api/city", {
    method: "POST",
    body: { action: "buyWarehouseStock", productId: "bread", supplierId: "local_coop", quantity: 20 },
    session: storeOwner,
  });
  await request("/api/city", {
    method: "POST",
    body: { action: "transferWarehouseStock", storeId: firstStoreId, productId: "bread", quantity: 5 },
    session: storeOwner,
  });
  let cityReady = await request("/api/state", { session: storeOwner });
  const blackOffer = cityReady.city.blackMarket.offers.find(item => item.remaining > 0 && item.kind === "utility");
  const valuableOffer = cityReady.city.blackMarket.offers.find(item => item.remaining > 0 && item.kind === "valuable");
  assert(blackOffer && valuableOffer, "black market utility or valuable offer missing");
  assert(valuableOffer.price < valuableOffer.legalPrice && valuableOffer.currentRisk > 0, "black market discount or police risk missing");
  const utilityDeal = await request("/api/city", {
    method: "POST",
    body: { action: "blackMarketBuy", itemId: blackOffer.id },
    session: storeOwner,
  });
  assert(typeof utilityDeal.outcome?.caught === "boolean", "black market police outcome missing");
  if (!utilityDeal.outcome.caught) {
    await request("/api/city", {
      method: "POST",
      body: { action: "useBlackMarketItem", itemId: blackOffer.id, storeId: firstStoreId },
      session: storeOwner,
    });
  }
  const valuableDeal = await request("/api/city", {
    method: "POST",
    body: { action: "blackMarketBuy", itemId: valuableOffer.id },
    session: storeOwner,
  });
  if (!valuableDeal.outcome.caught) {
    const fenceDeal = await request("/api/city", {
      method: "POST",
      body: { action: "sellContraband", itemId: valuableOffer.id },
      session: storeOwner,
    });
    assert(typeof fenceDeal.outcome?.caught === "boolean", "contraband sale police outcome missing");
  }
  cityReady = await request("/api/state", { session: storeOwner });
  assert(cityReady.city.blackMarket.heat >= 0, "police heat missing from black market state");
  const auction = cityReady.city.auctions[0];
  await request("/api/city", {
    method: "POST",
    body: { action: "auctionBid", auctionId: auction.id, amount: auction.minimumBid },
    session: storeOwner,
  });
  const cityAfterBid = await request("/api/state", { session: storeOwner });
  assert(cityAfterBid.city.profile.brandName === "Smoke City Retail", "city brand rename did not persist");
  assert(cityAfterBid.city.profile.brandLevel === 2, "city brand upgrade did not persist");
  assert(cityAfterBid.city.vehicle?.id === "scooter" && cityAfterBid.city.vehicle.fuel < 60, "city vehicle delivery state incorrect");
  assert(cityAfterBid.city.warehouse.level === 1, "warehouse upgrade did not persist");
  assert(cityAfterBid.city.warehouse.stock.find(item => item.productId === "bread")?.quantity === 15, "warehouse transfer quantity incorrect");
  assert(cityAfterBid.city.stores.find(item => item.id === firstStoreId)?.supplierId === "premium_imports", "supplier selection did not persist");
  assert(cityAfterBid.city.stores.find(item => item.id === firstStoreId)?.campaign?.id === "flyers", "campaign did not persist");
  assert(cityAfterBid.city.auctions.find(item => item.id === auction.id)?.leading, "auction bid did not persist");
  assert(cityAfterBid.store.stores.find(item => item.id === firstStoreId)?.products.find(item => item.id === "bread")?.freshness > 0, "store freshness missing");

  await request("/api/life", { method: "POST", body: { action: "buyItem", itemId: "pizza", amount: 1 }, session: player });
  await request("/api/life", { method: "POST", body: { action: "useItem", itemId: "pizza", amount: 1 }, session: player });
  await request("/api/life", { method: "POST", body: { action: "buyItem", itemId: "water", amount: 1 }, session: player });
  await request("/api/life", { method: "POST", body: { action: "useItem", itemId: "water", amount: 1 }, session: player });
  await request("/api/life", { method: "POST", body: { action: "moveHousing", housingId: "clean_room" }, session: player });
  await request("/api/bank", { method: "POST", body: { action: "nextDay", amount: 1 }, session: player });
  const lifeAfterDay = await request("/api/state", { session: player });
  assert(lifeAfterDay.user.life.hunger === 82, `expected hunger 82 after next day, got ${lifeAfterDay.user.life.hunger}`);
  assert(lifeAfterDay.user.life.thirst === 76, `expected thirst 76 after next day, got ${lifeAfterDay.user.life.thirst}`);
  assert(lifeAfterDay.user.life.housing.id === "clean_room", "housing move did not persist");
  assert(lifeAfterDay.user.life.rentDue === 30, `expected rent due 30, got ${lifeAfterDay.user.life.rentDue}`);
  await request("/api/life", { method: "POST", body: { action: "payRent", amount: 999 }, session: player });
  const lifeAfterRent = await request("/api/state", { session: player });
  assert(lifeAfterRent.user.life.rentDue === 0, `expected rent due 0, got ${lifeAfterRent.user.life.rentDue}`);

  const roulette = await request("/api/casino/roulette", {
    method: "POST",
    body: { amount: 1, number: 17 },
    session: player,
  });
  assert(Number.isInteger(roulette.result) && roulette.result >= 0 && roulette.result <= 36, "bad roulette result");
  assert(Number.isInteger(roulette.slotIndex) && roulette.slotIndex >= 0 && roulette.slotIndex < 37, "bad roulette slot");
  assert(roulette.winChance === 0.015, "roulette exact-number chance is not 1.5%");

  const marketBefore = await request("/api/state", { session: player });
  assert(marketBefore.market?.assets?.length >= 12, "market assets missing");
  assert(
    marketBefore.market.assets.every(asset => Array.isArray(asset.history) && asset.history.length >= 2),
    "market price history missing"
  );
  const tradeAsset = marketBefore.market.assets.find(asset => asset.price <= marketBefore.user.wallet);
  assert(tradeAsset, "no affordable market asset in smoke state");
  const marketDetailBefore = await request(`/api/market/${tradeAsset.symbol}`, { session: player });
  assert(marketDetailBefore.asset?.symbol === tradeAsset.symbol, "market detail returned wrong asset");
  assert(marketDetailBefore.asset.history.length >= 2, "market detail history missing");
  const buyMarket = await request("/api/market", {
    method: "POST",
    body: { action: "buy", symbol: tradeAsset.symbol, shares: 1 },
    session: player,
  });
  assert(buyMarket.market.assets.find(asset => asset.symbol === tradeAsset.symbol)?.shares === 1, "market buy did not add shares");
  const marketDetailAfterBuy = await request(`/api/market/${tradeAsset.symbol}`, { session: player });
  assert(marketDetailAfterBuy.asset.shares === 1, "market detail did not include owned shares");
  assert(marketDetailAfterBuy.asset.averagePrice > 0, "market detail did not include average buy price");
  assert(marketDetailAfterBuy.asset.trades.some(trade => trade.side === "buy" && trade.price > 0), "market detail did not include buy trade");
  const sellMarket = await request("/api/market", {
    method: "POST",
    body: { action: "sell", symbol: tradeAsset.symbol, shares: 1 },
    session: player,
  });
  assert(sellMarket.market.assets.find(asset => asset.symbol === tradeAsset.symbol)?.shares === 0, "market sell did not remove shares");

  const registeredBorrower = await request("/api/register", {
    method: "POST",
    body: { username: borrowerName, password: "pass1234", adminCode: "" },
    session: borrower,
  });
  await request("/api/bank", { method: "POST", body: { action: "loan", amount: 100 }, session: borrower });
  await request("/api/bank", { method: "POST", body: { action: "loan", amount: 50 }, session: borrower });
  await request("/api/admin/userAction", {
    method: "POST",
    body: { userId: registeredBorrower.user.id, action: "takeWallet", amount: 9999, reason: "smoke broke borrower" },
    session: admin,
  });
  await expectError(400, "/api/bank", {
    method: "POST",
    body: { action: "work", amount: 0 },
    session: borrower,
  });
  const postedWork = await request("/api/work", {
    method: "POST",
    body: { action: "post" },
    session: borrower,
  });
  assert(postedWork.quest && !postedWork.quest.revealed, "work quest should stay hidden while searching");
  assert(!("remainingSeconds" in postedWork.quest), "work quest leaked remaining seconds");
  assert(!("availableAt" in postedWork.quest), "work quest leaked availability time");
  assert(!("description" in postedWork.quest), "hidden work quest leaked description");
  assert(!("objective" in postedWork.quest), "hidden work quest leaked objective");
  const duplicateWork = await request("/api/work", {
    method: "POST",
    body: { action: "post" },
    session: borrower,
  });
  assert(duplicateWork.existing, "posting while a quest is active should return existing quest");
  const earlyWork = await expectError(400, "/api/work", {
    method: "POST",
    body: { action: "complete" },
    session: borrower,
  });
  assert(!("remainingSeconds" in earlyWork.data), "early work error leaked remaining seconds");
  await delay(2300);
  const readyWorkState = await request("/api/state", { session: borrower });
  assert(readyWorkState.activeQuest?.revealed, "work quest was not revealed after waiting");
  assert(readyWorkState.activeQuest.reward > 0, "revealed work quest did not include reward");
  assert(readyWorkState.activeQuest.description, "revealed work quest did not include description");
  assert(readyWorkState.activeQuest.objective, "revealed work quest did not include objective");
  assert(readyWorkState.activeQuest.stepsRequired > 0, "revealed work quest did not include required steps");
  assert(readyWorkState.activeQuest.progress === 0, "new work quest should start with zero progress");
  assert(readyWorkState.activeQuest.mistakes === 0, "new work quest should start with zero mistakes");
  assert(readyWorkState.activeQuest.challenge?.options?.length >= 3, "work challenge options missing");
  assert(
    readyWorkState.activeQuest.challenge.options.every(option => !("answer" in option)),
    "work challenge leaked its correct answer"
  );
  await expectError(400, "/api/work", {
    method: "POST",
    body: { action: "complete" },
    session: borrower,
  });
  const workAnswers = workAnswersByTitle[readyWorkState.activeQuest.title];
  assert(workAnswers?.length === readyWorkState.activeQuest.stepsRequired, "smoke answers missing for work quest");
  await expectError(400, "/api/work", {
    method: "POST",
    body: { action: "task" },
    session: borrower,
  });
  const wrongAnswer = readyWorkState.activeQuest.challenge.options.find(option => option.id !== workAnswers[0]);
  const wrongWork = await request("/api/work", {
    method: "POST",
    body: { action: "task", answer: wrongAnswer.id },
    session: borrower,
  });
  assert(!wrongWork.correct && !wrongWork.failed, "wrong work answer should count as a recoverable mistake");
  assert(wrongWork.quest.progress === 0 && wrongWork.quest.mistakes === 1, "wrong answer changed progress incorrectly");
  let workTaskResult;
  for (let index = 0; index < readyWorkState.activeQuest.stepsRequired; index++) {
    workTaskResult = await request("/api/work", {
      method: "POST",
      body: { action: "task", answer: workAnswers[index] },
      session: borrower,
    });
    assert(workTaskResult.correct, `correct work answer ${index + 1} was rejected`);
  }
  assert(
    workTaskResult.quest.progress === readyWorkState.activeQuest.stepsRequired,
    "work task progress did not reach required steps"
  );
  const completedWork = await request("/api/work", {
    method: "POST",
    body: { action: "complete" },
    session: borrower,
  });
  const borrowerState = await request("/api/state", { session: borrower });
  assert(borrowerState.user.wallet === completedWork.reward, `expected borrower wallet ${completedWork.reward}, got ${borrowerState.user.wallet}`);
  assert(borrowerState.user.debt === 180, `expected borrower debt 180, got ${borrowerState.user.debt}`);

  await request("/api/admin/userAction", {
    method: "POST",
    body: { userId: registeredPlayer.user.id, action: "ban", amount: 0, reason: "smoke ban" },
    session: admin,
  });
  await expectError(401, "/api/work", {
    method: "POST",
    body: { action: "post" },
    session: player,
  });
  await expectError(403, "/api/login", {
    method: "POST",
    body: { username: playerName, password: "pass1234" },
    session: player,
  });
  await request("/api/admin/userAction", {
    method: "POST",
    body: { userId: registeredPlayer.user.id, action: "unban", amount: 0, reason: "smoke unban" },
    session: admin,
  });
  await request("/api/login", {
    method: "POST",
    body: { username: playerName, password: "pass1234" },
    session: player,
  });

  console.log(JSON.stringify({
    ok: true,
    matches: finalState.matches.length,
    adminWallet: adminState.user.wallet,
    playerWallet: finalState.user.wallet,
    bank: finalState.user.bank,
    score: finalState.user.score,
    rating: finalState.user.rating,
    winner: m77.winner,
    rouletteResult: roulette.result,
    marketSymbol: tradeAsset.symbol,
    borrowerWallet: borrowerState.user.wallet,
    borrowerDebt: borrowerState.user.debt,
    workReward: completedWork.reward,
    workDifficulty: readyWorkState.activeQuest.difficulty,
    storeRevenue: firstStoreAfterSales.lifetimeRevenue,
    storeLocations: storeAfterSales.store.stores.length,
    storeStaff: storeAfterIncident.store.empire.staff,
    incidentChoice: incidentChoice.id,
    cityBrand: cityAfterBid.city.profile.brandName,
    cityWarehouseStock: cityAfterBid.city.warehouse.stock.find(item => item.productId === "bread")?.quantity,
    auctionLeading: cityAfterBid.city.auctions.find(item => item.id === auction.id)?.leading,
    businessesOwned: businessReady.businesses.owned.length,
    diceResult: dicePlay.result,
    crashPoint: crashPlay.crashPoint,
    fortuneSegment: fortunePlay.label,
    minesPayout: minesResult.game.payout,
    scratchPrize: scratchClaim.ticket.prize,
    lotteryNumbers: lotteryBuy.ticket.numbers,
  }, null, 2));
} catch (error) {
  console.error(serverOutput.trim());
  throw error;
} finally {
  stopServer(server);
}
