let runtimeTablesReady = false;

const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const WORK_QUEST_POOL = [
  {
    title: "Deliver stadium flyers",
    difficulty: "Easy",
    reward: 12,
    description: "A small sponsor needs flyers delivered before the next match crowd arrives.",
    objective: "Visit the fan zone, drop off 30 flyers, and report back to the kiosk manager.",
  },
  {
    title: "Clean a snack kiosk",
    difficulty: "Easy",
    reward: 16,
    description: "A snack stand failed inspection and needs a quick reset before opening.",
    objective: "Clear the counter, restock cups, wipe the grill, and sign the checklist.",
  },
  {
    title: "Repair betting terminals",
    difficulty: "Standard",
    reward: 34,
    description: "Three terminals are frozen and the betting clerk needs them back online.",
    objective: "Restart the terminals, test one demo ticket on each, and mark the broken printer.",
  },
  {
    title: "Guard VIP parking",
    difficulty: "Standard",
    reward: 42,
    description: "The VIP lot is crowded and the staff needs help checking incoming cars.",
    objective: "Check 12 parking passes, redirect fake passes, and keep one emergency lane clear.",
  },
  {
    title: "Audit casino receipts",
    difficulty: "Hard",
    reward: 78,
    description: "The casino desk has missing receipt totals after a busy roulette run.",
    objective: "Compare the cash drawer with 5 receipt batches and flag any mismatch.",
  },
  {
    title: "Recover missing sponsor files",
    difficulty: "Hard",
    reward: 95,
    description: "A sponsor contract folder vanished during the evening shift.",
    objective: "Search the office, call the courier, and return the folder to the admin desk.",
  },
  {
    title: "Run a private finals event",
    difficulty: "Elite",
    reward: 145,
    description: "A private watch party needs one person to coordinate staff, food, and entry.",
    objective: "Confirm the guest list, assign two helpers, settle catering, and close the event report.",
  },
];

const MARKET_ASSETS = [
  { symbol: "BANK", name: "Credit Bank", price: 85, volatility: 7 },
  { symbol: "CLUB", name: "Football Club", price: 120, volatility: 14 },
  { symbol: "CSNO", name: "Casino Group", price: 55, volatility: 18 },
  { symbol: "ENER", name: "Energy Drinks", price: 32, volatility: 15 },
  { symbol: "FIFA", name: "FIFA Media", price: 42, volatility: 8 },
  { symbol: "FOOD", name: "Street Food", price: 19, volatility: 20 },
  { symbol: "GEAR", name: "Fan Gear", price: 38, volatility: 16 },
  { symbol: "HOTL", name: "Stadium Hotels", price: 67, volatility: 11 },
  { symbol: "MED", name: "Sports Medicine", price: 74, volatility: 10 },
  { symbol: "PIZA", name: "Pizza Chain", price: 28, volatility: 13 },
  { symbol: "SHOP", name: "Corner Shop", price: 24, volatility: 14 },
  { symbol: "TAXI", name: "Matchday Taxi", price: 46, volatility: 17 },
  { symbol: "TECH", name: "Replay Tech", price: 96, volatility: 18 },
  { symbol: "TRVL", name: "Travel Agency", price: 61, volatility: 19 },
  { symbol: "TV", name: "Sports TV", price: 88, volatility: 12 },
];

const MARKET_TICK_SECONDS = 45;
const MARKET_HISTORY_POINTS = 20;
const HUNGER_DECAY_PER_DAY = 18;
const THIRST_DECAY_PER_DAY = 24;

const LIFE_ITEMS = [
  { id: "water", name: "Mineral Water", type: "drink", price: 6, hunger: 0, thirst: 35, stockColumn: "water" },
  { id: "snack", name: "Stadium Snack Box", type: "food", price: 14, hunger: 18, thirst: 0, stockColumn: "food" },
  { id: "pizza", name: "Mozzarella Pizza", type: "food", price: 28, hunger: 45, thirst: -5, stockColumn: "pizza" },
  { id: "steak", name: "Steak Dinner", type: "food", price: 55, hunger: 80, thirst: -8, stockColumn: "steak" },
  { id: "sushi", name: "Sushi Box", type: "food", price: 42, hunger: 55, thirst: 4, stockColumn: "sushi" },
  { id: "rose_cake", name: "Rose Berry Cake", type: "food", price: 36, hunger: 38, thirst: -4, stockColumn: "cake" },
];

const HOUSING_LISTINGS = [
  {
    id: "room",
    name: "Starter Room",
    area: "Old Town",
    rent: 22,
    deposit: 0,
    comfort: 1,
    x: 16,
    y: 72,
    description: "Cheap private room with a lock, shower, and basic bed.",
  },
  {
    id: "clean_room",
    name: "Clean Room",
    area: "Market Street",
    rent: 30,
    deposit: 30,
    comfort: 2,
    x: 32,
    y: 52,
    description: "Cleaner building, better kitchen, and a quieter block.",
  },
  {
    id: "studio",
    name: "City Studio",
    area: "Central Blocks",
    rent: 45,
    deposit: 80,
    comfort: 3,
    x: 51,
    y: 42,
    description: "Your own compact studio near shops and transport.",
  },
  {
    id: "apartment",
    name: "Arena Apartment",
    area: "Stadium District",
    rent: 85,
    deposit: 180,
    comfort: 4,
    x: 70,
    y: 35,
    description: "Modern apartment close to the stadium and casino.",
  },
  {
    id: "villa",
    name: "Garden Villa",
    area: "Hill Road",
    rent: 160,
    deposit: 360,
    comfort: 5,
    x: 84,
    y: 20,
    description: "Large house with a garden, quiet nights, and high status.",
  },
  {
    id: "penthouse",
    name: "Sky Penthouse",
    area: "Tower Lane",
    rent: 260,
    deposit: 700,
    comfort: 6,
    x: 90,
    y: 58,
    description: "Top-floor luxury with the best view over the city.",
  },
];

function initialMarketTickOffset(symbol) {
  const hash = [...symbol].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0);
  return 5 + (hash % Math.max(1, MARKET_TICK_SECONDS - 10));
}

function randomMarketTickOffset() {
  return 5 + Math.floor(Math.random() * Math.max(1, MARKET_TICK_SECONDS - 10));
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";
  const DB = env.DB;
  const ADMIN_CODE = env.ADMIN_CODE || "";
  const fixedWorkWaitSeconds = positiveEnvInt(env.WORK_WAIT_SECONDS, 0);
  const minWorkWaitSeconds = positiveEnvInt(env.WORK_WAIT_MIN_SECONDS, 120);
  const maxWorkWaitSeconds = Math.max(minWorkWaitSeconds, positiveEnvInt(env.WORK_WAIT_MAX_SECONDS, 600));
  const cookieAttrs = `HttpOnly; Path=/; SameSite=Lax${url.protocol === "https:" ? "; Secure" : ""}`;

  const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

  if (!DB) return json({ error: "D1 binding DB missing" }, 500);
  await ensureRuntimeTables(DB);

  const body = async () => {
    try {
      return await request.json();
    } catch {
      return {};
    }
  };

  async function sha(value) {
    const data = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function cookie(name) {
    const raw = request.headers.get("Cookie") || "";
    return raw.split(";").map(item => item.trim()).find(item => item.startsWith(`${name}=`))?.split("=")[1] || "";
  }

  function token() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }

  async function currentUser() {
    const sid = cookie("sid");
    if (!sid) return null;
    return await DB.prepare(`
      SELECT users.*,
        CASE WHEN bans.user_id IS NULL THEN 0 ELSE 1 END AS banned,
        bans.reason AS ban_reason
      FROM sessions
      JOIN users ON sessions.user_id = users.id
      LEFT JOIN bans ON bans.user_id = users.id
      WHERE sessions.token = ?
    `).bind(sid).first();
  }

  function publicUser(user) {
    const housing = selectedHousing(user.housing);
    const inventory = lifeInventory(user);
    return {
      id: user.id,
      username: user.username,
      isAdmin: !!user.is_admin,
      banned: !!user.banned,
      banReason: user.ban_reason || "",
      wallet: user.wallet,
      bank: user.bank,
      debt: user.debt,
      rating: user.rating,
      day: user.day,
      loanDue: user.loan_due,
      score: user.score,
      life: {
        hunger: Number(user.hunger ?? 100),
        thirst: Number(user.thirst ?? 100),
        food: LIFE_ITEMS
          .filter(item => item.type === "food")
          .reduce((sum, item) => sum + Number(inventory[item.id] || 0), 0),
        water: Number(inventory.water || 0),
        inventory,
        items: publicLifeItems(),
        rentDue: Number(user.rent_due ?? 0),
        housing,
        housingListings: publicHousingListings(),
        rentPerDay: housing.rent,
      },
    };
  }

  function stageFromRound(round) {
    return ({
      "1/16": "Round of 32",
      "1/8": "Round of 16",
      "1/4": "Quarterfinal",
      "1/2": "Semifinal",
      Final: "Final",
    })[round] || round || "Other";
  }

  function matchSort(match) {
    if (match.sort_order !== null && match.sort_order !== undefined && match.sort_order !== "") {
      return Number(match.sort_order);
    }
    return Number(String(match.id || "").replace(/\D/g, "")) || 0;
  }

  async function allMatches() {
    const rows = await DB.prepare("SELECT * FROM matches").all();
    return rows.results
      .map(match => ({
        ...match,
        stage: match.stage || stageFromRound(match.round),
        sort_order: matchSort(match),
        teams: JSON.parse(match.teams),
        closed: !!match.closed,
      }))
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  async function adminUsers() {
    const rows = await DB.prepare(`
      SELECT users.id, users.username, users.is_admin, users.wallet, users.bank, users.debt,
        users.rating, users.day, users.loan_due, users.score,
        users.hunger, users.thirst, users.food, users.water, users.pizza, users.steak,
        users.sushi, users.cake, users.rent_due, users.housing,
        CASE WHEN bans.user_id IS NULL THEN 0 ELSE 1 END AS banned,
        bans.reason AS ban_reason
      FROM users
      LEFT JOIN bans ON bans.user_id = users.id
      ORDER BY users.is_admin DESC, lower(users.username)
      LIMIT 200
    `).all();
    return rows.results.map(publicUser);
  }

  function terms(rating) {
    if (rating >= 750) return { limit: 5000, interest: 0.10 };
    if (rating >= 650) return { limit: 2000, interest: 0.20 };
    if (rating >= 550) return { limit: 500, interest: 0.40 };
    if (rating >= 400) return { limit: 150, interest: 0.75 };
    return { limit: 0, interest: 1 };
  }

  function money(value) {
    const amount = Math.floor(Number(value));
    return Number.isFinite(amount) ? amount : 0;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hungerStatus(hunger) {
    if (hunger <= 0) return "Starving";
    if (hunger < 25) return "Hungry";
    if (hunger < 60) return "Okay";
    return "Fed";
  }

  function thirstStatus(thirst) {
    if (thirst <= 0) return "Dehydrated";
    if (thirst < 25) return "Thirsty";
    if (thirst < 60) return "Okay";
    return "Hydrated";
  }

  function publicLifeItems() {
    return LIFE_ITEMS.map(({ stockColumn, ...item }) => item);
  }

  function lifeItem(itemId) {
    const id = String(itemId || "").trim().toLowerCase();
    return LIFE_ITEMS.find(item => item.id === id || item.stockColumn === id) || null;
  }

  function lifeInventory(user) {
    const inventory = {};
    for (const item of LIFE_ITEMS) {
      inventory[item.id] = Number(user[item.stockColumn] ?? 0);
    }
    return inventory;
  }

  function housingKey(value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function selectedHousing(value) {
    const key = housingKey(value);
    return HOUSING_LISTINGS.find(listing => (
      listing.id === key || housingKey(listing.name) === key
    )) || HOUSING_LISTINGS[0];
  }

  function housingListing(housingId) {
    const key = housingKey(housingId);
    return HOUSING_LISTINGS.find(listing => listing.id === key) || null;
  }

  function publicHousingListings() {
    return HOUSING_LISTINGS.map(listing => ({ ...listing }));
  }

  function reason(value) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, 160);
  }

  function nowSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  function positiveEnvInt(value, fallback) {
    const parsed = Math.floor(Number(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function pickWorkQuest() {
    return WORK_QUEST_POOL[Math.floor(Math.random() * WORK_QUEST_POOL.length)];
  }

  function pickWorkWaitSeconds() {
    if (fixedWorkWaitSeconds > 0) return fixedWorkWaitSeconds;
    return minWorkWaitSeconds + Math.floor(Math.random() * (maxWorkWaitSeconds - minWorkWaitSeconds + 1));
  }

  function publicWorkQuest(quest) {
    if (!quest) return null;
    const availableAt = Number(quest.available_at);
    const remainingSeconds = Math.max(0, availableAt - nowSeconds());
    const ready = quest.status === "posted" && remainingSeconds === 0;
    const revealed = quest.status !== "posted" || ready;
    const base = {
      id: quest.id,
      status: quest.status,
      createdAt: Number(quest.created_at),
      ready,
      revealed,
    };
    if (!revealed) return base;
    return {
      ...base,
      title: quest.title,
      difficulty: quest.difficulty,
      description: quest.description || "A local business needs a quick job finished.",
      objective: quest.objective || "Complete the assignment and return for payout.",
      reward: Number(quest.reward),
      completedAt: quest.completed_at === null || quest.completed_at === undefined ? null : Number(quest.completed_at),
    };
  }

  async function activeWorkQuest(userId) {
    return await DB.prepare(`
      SELECT *
      FROM work_quests
      WHERE user_id = ? AND status = 'posted'
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(userId).first();
  }

  async function audit(adminId, targetUserId, action, amount = 0, note = "") {
    await DB.prepare(`
      INSERT INTO admin_logs (id, admin_id, target_user_id, action, amount, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), adminId, targetUserId, action, amount, note).run();
  }

  async function refreshMarketPrices() {
    const now = nowSeconds();
    const rows = await DB.prepare("SELECT * FROM market_assets ORDER BY symbol").all();
    const updates = [];
    for (const asset of rows.results) {
      const updatedAt = Number(asset.updated_at || 0);
      const elapsed = now - updatedAt;
      const tickOffset = Number(asset.tick_offset || 0);
      if (elapsed < MARKET_TICK_SECONDS + tickOffset) continue;

      const steps = Math.min(8, Math.floor((elapsed - tickOffset) / MARKET_TICK_SECONDS));
      let price = Number(asset.price);
      const previousPrice = price;
      for (let index = 0; index < steps; index++) {
        const swing = Math.max(1, Math.round(price * Number(asset.volatility) / 100));
        const lastDirection = price < Number(asset.previous_price || price) ? "down" : "up";
        const roll = Math.random();
        let delta = 0;
        if (roll < 0.07) {
          delta = -Math.max(1, Math.ceil(swing * (0.9 + Math.random() * 1.1)));
        } else if (roll < 0.17) {
          delta = Math.max(1, Math.ceil(swing * (0.6 + Math.random() * 1.1)));
        } else {
          const upChance = lastDirection === "down" ? 0.56 : 0.49;
          const direction = Math.random() < upChance ? 1 : -1;
          delta = Math.floor(Math.random() * (swing + 1)) * direction;
          if (delta === 0 && Math.random() < 0.35) delta = direction;
        }
        price = Math.max(1, price + delta);
      }
      updates.push(DB.prepare(`
        UPDATE market_assets
        SET previous_price = ?, price = ?, updated_at = ?, tick_offset = ?
        WHERE symbol = ?
      `).bind(previousPrice, price, now, randomMarketTickOffset(), asset.symbol));
      updates.push(DB.prepare(`
        INSERT INTO market_history (id, symbol, price, recorded_at)
        VALUES (?, ?, ?, ?)
      `).bind(crypto.randomUUID(), asset.symbol, price, now));
    }
    if (updates.length) await DB.batch(updates);
  }

  async function marketState(userId) {
    await refreshMarketPrices();
    const rows = await DB.prepare(`
      SELECT market_assets.symbol, market_assets.name, market_assets.price,
        market_assets.previous_price, market_assets.volatility, market_assets.updated_at, market_assets.tick_offset,
        COALESCE(market_holdings.shares, 0) AS shares,
        COALESCE(market_holdings.average_price, 0) AS average_price
      FROM market_assets
      LEFT JOIN market_holdings
        ON market_holdings.symbol = market_assets.symbol
        AND market_holdings.user_id = ?
      ORDER BY market_assets.symbol
    `).bind(userId).all();
    const historyRows = await DB.prepare(`
      SELECT symbol, price, recorded_at
      FROM (
        SELECT symbol, price, recorded_at,
          ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY recorded_at DESC) AS rn
        FROM market_history
      )
      WHERE rn <= ?
      ORDER BY symbol, recorded_at DESC
    `).bind(MARKET_HISTORY_POINTS).all();
    const historyBySymbol = {};
    for (const row of historyRows.results) {
      if (!historyBySymbol[row.symbol]) historyBySymbol[row.symbol] = [];
      if (historyBySymbol[row.symbol].length < MARKET_HISTORY_POINTS) {
        historyBySymbol[row.symbol].push(Number(row.price));
      }
    }
    const assets = rows.results.map(asset => {
      const price = Number(asset.price);
      const previousPrice = Number(asset.previous_price || asset.price);
      const shares = Number(asset.shares || 0);
      const history = (historyBySymbol[asset.symbol] || []).reverse();
      if (history.length < 2) history.unshift(previousPrice);
      if (history[history.length - 1] !== price) history.push(price);
      return {
        symbol: asset.symbol,
        name: asset.name,
        price,
        previousPrice,
        change: price - previousPrice,
        changePct: previousPrice > 0 ? Math.round(((price - previousPrice) / previousPrice) * 1000) / 10 : 0,
        volatility: Number(asset.volatility),
        nextTickIn: Math.max(0, Number(asset.updated_at || 0) + MARKET_TICK_SECONDS + Number(asset.tick_offset || 0) - nowSeconds()),
        shares,
        averagePrice: Number(asset.average_price || 0),
        value: shares * price,
        history: history.slice(-MARKET_HISTORY_POINTS),
      };
    });
    return {
      assets,
      value: assets.reduce((sum, asset) => sum + asset.value, 0),
    };
  }

  async function marketAssetDetails(userId, symbol) {
    await refreshMarketPrices();
    const asset = await DB.prepare(`
      SELECT market_assets.symbol, market_assets.name, market_assets.price,
        market_assets.previous_price, market_assets.volatility, market_assets.updated_at, market_assets.tick_offset,
        COALESCE(market_holdings.shares, 0) AS shares,
        COALESCE(market_holdings.average_price, 0) AS average_price
      FROM market_assets
      LEFT JOIN market_holdings
        ON market_holdings.symbol = market_assets.symbol
        AND market_holdings.user_id = ?
      WHERE market_assets.symbol = ?
    `).bind(userId, symbol).first();
    if (!asset) return null;

    const historyRows = await DB.prepare(`
      SELECT price, recorded_at
      FROM market_history
      WHERE symbol = ?
      ORDER BY recorded_at ASC
    `).bind(symbol).all();
    const tradeRows = await DB.prepare(`
      SELECT side, shares, price, total, created_at
      FROM market_trades
      WHERE user_id = ? AND symbol = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).bind(userId, symbol).all();
    const price = Number(asset.price);
    const previousPrice = Number(asset.previous_price || asset.price);
    const shares = Number(asset.shares || 0);
    const averagePrice = Number(asset.average_price || 0);
    let history = historyRows.results.map(row => ({
      price: Number(row.price),
      recordedAt: Number(row.recorded_at),
    }));
    if (history.length < 2) history.unshift({ price: previousPrice, recordedAt: Number(asset.updated_at || nowSeconds()) });
    if (history[history.length - 1]?.price !== price) {
      history.push({ price, recordedAt: Number(asset.updated_at || nowSeconds()) });
    }

    return {
      asset: {
        symbol: asset.symbol,
        name: asset.name,
        price,
        previousPrice,
        change: price - previousPrice,
        changePct: previousPrice > 0 ? Math.round(((price - previousPrice) / previousPrice) * 1000) / 10 : 0,
        volatility: Number(asset.volatility),
        nextTickIn: Math.max(0, Number(asset.updated_at || 0) + MARKET_TICK_SECONDS + Number(asset.tick_offset || 0) - nowSeconds()),
        shares,
        averagePrice,
        value: shares * price,
        profit: shares > 0 ? (price - averagePrice) * shares : 0,
        history,
        trades: tradeRows.results.map(trade => ({
          side: trade.side,
          shares: Number(trade.shares),
          price: Number(trade.price),
          total: Number(trade.total),
          createdAt: Number(trade.created_at),
        })),
      },
    };
  }

  const user = await currentUser();

  if (path === "/state") {
    const leaders = await DB.prepare(`
      SELECT username, wallet, bank, score, rating
      FROM users
      WHERE NOT EXISTS (SELECT 1 FROM bans WHERE bans.user_id = users.id)
      ORDER BY (wallet + bank + score) DESC
      LIMIT 20
    `).all();
    const response = {
      user: user ? publicUser(user) : null,
      admin: !!user?.is_admin,
      matches: await allMatches(),
      leaderboard: leaders.results,
      now: nowSeconds(),
    };
    if (user) {
      response.activeQuest = publicWorkQuest(await activeWorkQuest(user.id));
      response.market = await marketState(user.id);
    }
    if (user?.is_admin) response.adminUsers = await adminUsers();
    return json(response);
  }

  if (path === "/register" && request.method === "POST") {
    const data = await body();
    const username = String(data.username || "").trim();
    const password = String(data.password || "");
    if (username.length < 3 || password.length < 4) {
      return json({ error: "Username min 3, password min 4" }, 400);
    }
    if (await DB.prepare("SELECT id FROM users WHERE lower(username)=lower(?)").bind(username).first()) {
      return json({ error: "Username taken" }, 400);
    }
    const id = crypto.randomUUID();
    const pass = await sha(password);
    const isAdmin = ADMIN_CODE && data.adminCode && String(data.adminCode) === ADMIN_CODE ? 1 : 0;
    await DB.prepare("INSERT INTO users (id, username, pass_hash, is_admin) VALUES (?, ?, ?, ?)")
      .bind(id, username, pass, isAdmin).run();
    const sid = token();
    await DB.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").bind(sid, id).run();
    const created = await DB.prepare(`
      SELECT users.*, 0 AS banned, '' AS ban_reason
      FROM users
      WHERE id = ?
    `).bind(id).first();
    return json({ user: publicUser(created) }, 200, { "Set-Cookie": `sid=${sid}; ${cookieAttrs}` });
  }

  if (path === "/login" && request.method === "POST") {
    const data = await body();
    const pass = await sha(String(data.password || ""));
    const found = await DB.prepare("SELECT * FROM users WHERE lower(username)=lower(?)")
      .bind(String(data.username || "").trim()).first();
    if (!found || found.pass_hash !== pass) return json({ error: "Wrong login/password" }, 401);
    const ban = await DB.prepare("SELECT reason FROM bans WHERE user_id=?").bind(found.id).first();
    if (ban) return json({ error: "Account banned", reason: ban.reason || "" }, 403);
    const sid = token();
    await DB.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").bind(sid, found.id).run();
    return json({ user: publicUser({ ...found, banned: 0, ban_reason: "" }) }, 200, { "Set-Cookie": `sid=${sid}; ${cookieAttrs}` });
  }

  if (path === "/logout") {
    const sid = cookie("sid");
    if (sid) await DB.prepare("DELETE FROM sessions WHERE token=?").bind(sid).run();
    return json({ ok: true }, 200, { "Set-Cookie": `sid=; Max-Age=0; ${cookieAttrs}` });
  }

  if (!user) return json({ error: "Login required" }, 401);
  if (user.banned) return json({ error: "Account banned", reason: user.ban_reason || "" }, 403);

  if (path === "/work" && request.method === "POST") {
    const data = await body();
    const action = String(data.action || "");

    if (action === "post") {
      const existing = await activeWorkQuest(user.id);
      if (existing) return json({ ok: true, existing: true, quest: publicWorkQuest(existing) });

      const selected = pickWorkQuest();
      const createdAt = nowSeconds();
      const quest = {
        id: crypto.randomUUID(),
        user_id: user.id,
        title: selected.title,
        difficulty: selected.difficulty,
        description: selected.description,
        objective: selected.objective,
        reward: selected.reward,
        status: "posted",
        created_at: createdAt,
        available_at: createdAt + pickWorkWaitSeconds(),
        completed_at: null,
      };
      await DB.prepare(`
        INSERT INTO work_quests (id, user_id, title, difficulty, description, objective, reward, status, available_at, completed_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        quest.id,
        quest.user_id,
        quest.title,
        quest.difficulty,
        quest.description,
        quest.objective,
        quest.reward,
        quest.status,
        quest.available_at,
        quest.completed_at,
        quest.created_at,
      ).run();
      return json({ ok: true, quest: publicWorkQuest(quest) });
    }

    if (action === "complete") {
      const quest = await activeWorkQuest(user.id);
      if (!quest) return json({ error: "No active work quest" }, 400);
      if (Number(user.hunger ?? 100) <= 0) {
        return json({ error: "Eat food before completing work", quest: publicWorkQuest(quest) }, 400);
      }
      if (Number(user.thirst ?? 100) <= 0) {
        return json({ error: "Drink water before completing work", quest: publicWorkQuest(quest) }, 400);
      }

      const current = nowSeconds();
      const remainingSeconds = Math.max(0, Number(quest.available_at) - current);
      if (remainingSeconds > 0) {
        return json({ error: "Quest not ready", quest: publicWorkQuest(quest) }, 400);
      }

      const reward = Number(quest.reward);
      const results = await DB.batch([
        DB.prepare(`
          UPDATE users
          SET wallet = wallet + (
            SELECT reward
            FROM work_quests
            WHERE id = ? AND user_id = ? AND status = 'posted' AND available_at <= ?
          )
          WHERE id = ?
            AND EXISTS (
              SELECT 1
              FROM work_quests
              WHERE id = ? AND user_id = ? AND status = 'posted' AND available_at <= ?
            )
        `).bind(quest.id, user.id, current, user.id, quest.id, user.id, current),
        DB.prepare(`
          UPDATE work_quests
          SET status = 'completed', completed_at = ?
          WHERE id = ? AND user_id = ? AND status = 'posted' AND available_at <= ?
        `).bind(current, quest.id, user.id, current),
      ]);
      if (!results[0]?.meta?.changes) return json({ error: "Quest already completed" }, 400);

      return json({
        ok: true,
        reward,
        quest: publicWorkQuest({ ...quest, status: "completed", completed_at: current }),
      });
    }

    return json({ error: "Bad work action" }, 400);
  }

  if (path === "/life" && request.method === "POST") {
    const data = await body();
    const action = String(data.action || "");
    const amount = Math.max(1, money(data.amount || 1));
    const hunger = Number(user.hunger ?? 100);
    const thirst = Number(user.thirst ?? 100);
    const rentDue = Number(user.rent_due ?? 0);
    const currentHousing = selectedHousing(user.housing);

    if (action === "buyItem" || action === "buyFood" || action === "buyWater") {
      const item = lifeItem(action === "buyFood" ? "snack" : action === "buyWater" ? "water" : data.itemId);
      if (!item) return json({ error: "Item not found" }, 404);
      const count = clamp(amount, 1, 20);
      const cost = count * item.price;
      if (cost > user.wallet) return json({ error: "Not enough wallet for item" }, 400);
      await DB.prepare(`UPDATE users SET wallet = wallet - ?, ${item.stockColumn} = ${item.stockColumn} + ? WHERE id = ?`)
        .bind(cost, count, user.id).run();
      return json({ ok: true, itemId: item.id, bought: count, cost });
    }

    if (action === "useItem" || action === "eatFood" || action === "drinkWater") {
      const item = lifeItem(action === "eatFood" ? "snack" : action === "drinkWater" ? "water" : data.itemId);
      if (!item) return json({ error: "Item not found" }, 404);
      const stock = Number(user[item.stockColumn] ?? 0);
      if (stock < 1) return json({ error: "No item in storage" }, 400);
      const nextHunger = clamp(hunger + item.hunger, 0, 100);
      const nextThirst = clamp(thirst + item.thirst, 0, 100);
      await DB.prepare(`UPDATE users SET ${item.stockColumn} = ${item.stockColumn} - 1, hunger = ?, thirst = ? WHERE id = ?`)
        .bind(nextHunger, nextThirst, user.id).run();
      return json({
        ok: true,
        itemId: item.id,
        hunger: nextHunger,
        thirst: nextThirst,
        status: `${hungerStatus(nextHunger)} / ${thirstStatus(nextThirst)}`,
      });
    }

    if (action === "moveHousing") {
      const listing = housingListing(data.housingId);
      if (!listing) return json({ error: "Housing not found" }, 404);
      if (listing.id === currentHousing.id) return json({ ok: true, housing: listing, cost: 0 });
      if (listing.deposit > user.wallet) return json({ error: `Need ${listing.deposit} wallet for deposit` }, 400);
      await DB.prepare("UPDATE users SET wallet = wallet - ?, housing = ? WHERE id = ?")
        .bind(listing.deposit, listing.id, user.id).run();
      return json({ ok: true, housing: listing, cost: listing.deposit });
    }

    if (action === "payRent") {
      if (rentDue <= 0) return json({ ok: true, paid: 0 });
      const paid = Math.min(amount, user.wallet, rentDue);
      if (paid < 1) return json({ error: "Not enough wallet for rent" }, 400);
      const nextRentDue = rentDue - paid;
      const nextRating = nextRentDue === 0 ? Math.min(850, Number(user.rating) + 2) : user.rating;
      await DB.prepare("UPDATE users SET wallet = wallet - ?, rent_due = ?, rating = ? WHERE id = ?")
        .bind(paid, nextRentDue, nextRating, user.id).run();
      return json({ ok: true, paid, rentDue: nextRentDue });
    }

    return json({ error: "Bad life action" }, 400);
  }

  if (path.startsWith("/market/") && request.method === "GET") {
    const symbol = decodeURIComponent(path.slice("/market/".length)).trim().toUpperCase();
    if (!/^[A-Z0-9]{1,8}$/.test(symbol)) return json({ error: "Bad market symbol" }, 400);
    const details = await marketAssetDetails(user.id, symbol);
    if (!details) return json({ error: "Asset not found" }, 404);
    return json(details);
  }

  if (path === "/market" && request.method === "POST") {
    const data = await body();
    const action = String(data.action || "");
    const symbol = String(data.symbol || "").trim().toUpperCase();
    const shares = Math.max(1, money(data.shares || 1));

    if (!["buy", "sell"].includes(action)) return json({ error: "Bad market action" }, 400);
    await refreshMarketPrices();

    const asset = await DB.prepare("SELECT * FROM market_assets WHERE symbol = ?").bind(symbol).first();
    if (!asset) return json({ error: "Asset not found" }, 404);

    const price = Number(asset.price);
    const total = price * shares;
    const holding = await DB.prepare("SELECT * FROM market_holdings WHERE user_id = ? AND symbol = ?")
      .bind(user.id, symbol).first();
    const currentShares = Number(holding?.shares || 0);
    const currentAverage = Number(holding?.average_price || 0);

    if (action === "buy") {
      if (total > user.wallet) return json({ error: "Not enough wallet" }, 400);
      const nextShares = currentShares + shares;
      const averagePrice = Math.round(((currentShares * currentAverage) + total) / nextShares);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(total, user.id),
        DB.prepare(`
          INSERT INTO market_holdings (user_id, symbol, shares, average_price)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, symbol) DO UPDATE
          SET shares = excluded.shares,
            average_price = excluded.average_price
        `).bind(user.id, symbol, nextShares, averagePrice),
        DB.prepare(`
          INSERT INTO market_trades (id, user_id, symbol, side, shares, price, total, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(crypto.randomUUID(), user.id, symbol, action, shares, price, total, nowSeconds()),
      ]);
    } else {
      if (shares > currentShares) return json({ error: "Not enough shares" }, 400);
      const nextShares = currentShares - shares;
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet + ? WHERE id = ?").bind(total, user.id),
        DB.prepare("UPDATE market_holdings SET shares = ? WHERE user_id = ? AND symbol = ?")
          .bind(nextShares, user.id, symbol),
        DB.prepare("DELETE FROM market_holdings WHERE user_id = ? AND symbol = ? AND shares <= 0")
          .bind(user.id, symbol),
        DB.prepare(`
          INSERT INTO market_trades (id, user_id, symbol, side, shares, price, total, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(crypto.randomUUID(), user.id, symbol, action, shares, price, total, nowSeconds()),
      ]);
    }

    return json({ ok: true, action, symbol, shares, price, total, market: await marketState(user.id) });
  }

  if (path === "/predict" && request.method === "POST") {
    const data = await body();
    const match = await DB.prepare("SELECT * FROM matches WHERE id=?").bind(data.matchId).first();
    if (!match) return json({ error: "Match not found" }, 404);
    if (match.closed) return json({ error: "Match closed" }, 400);
    if (!JSON.parse(match.teams).includes(data.team)) return json({ error: "Bad team" }, 400);
    await DB.prepare(`
      INSERT INTO predictions (user_id, match_id, team)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, match_id) DO UPDATE SET team=excluded.team
    `).bind(user.id, match.id, data.team).run();
    return json({ ok: true });
  }

  if (path === "/bet" && request.method === "POST") {
    const data = await body();
    const amount = money(data.amount);
    const match = await DB.prepare("SELECT * FROM matches WHERE id=?").bind(data.matchId).first();
    if (!match) return json({ error: "Match not found" }, 404);
    if (match.closed) return json({ error: "Match closed" }, 400);
    if (amount < 1 || amount > user.wallet) return json({ error: "Bad amount / not enough wallet" }, 400);
    if (!JSON.parse(match.teams).includes(data.team)) return json({ error: "Bad team" }, 400);
    if (await DB.prepare("SELECT id FROM bets WHERE user_id=? AND match_id=?").bind(user.id, match.id).first()) {
      return json({ error: "Already bet on this match" }, 400);
    }
    await DB.batch([
      DB.prepare("UPDATE users SET wallet=wallet-? WHERE id=?").bind(amount, user.id),
      DB.prepare("INSERT INTO bets (id, user_id, match_id, team, amount, odds) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), user.id, match.id, data.team, amount, match.odds),
    ]);
    return json({ ok: true });
  }

  if (path === "/bank" && request.method === "POST") {
    const data = await body();
    const action = String(data.action || "");

    if (action === "work") {
      return json({ error: "Use the Work Board" }, 400);
    }

    const amount = Math.max(1, money(data.amount || 1));
    if (action === "withdraw") {
      const moved = Math.min(amount, user.bank);
      await DB.prepare("UPDATE users SET bank=bank-?, wallet=wallet+? WHERE id=?")
        .bind(moved, moved, user.id).run();
    } else if (action === "deposit") {
      const moved = Math.min(amount, user.wallet);
      await DB.prepare("UPDATE users SET wallet=wallet-?, bank=bank+? WHERE id=?")
        .bind(moved, moved, user.id).run();
    } else if (action === "loan") {
      const term = terms(user.rating);
      if (term.limit <= 0) return json({ error: "Bank refused" }, 400);
      const addedDebt = Math.ceil(amount * (1 + term.interest));
      const availableDebt = Math.max(0, term.limit - user.debt);
      if (addedDebt > availableDebt) return json({ error: `Available credit ${availableDebt}` }, 400);
      await DB.prepare(`
        UPDATE users
        SET wallet=wallet+?,
          debt=debt+?,
          loan_due=CASE WHEN loan_due IS NULL OR loan_due < day+3 THEN day+3 ELSE loan_due END
        WHERE id=?
      `).bind(amount, addedDebt, user.id).run();
    } else if (action === "repay") {
      const paid = Math.min(amount, user.wallet, user.debt);
      const newDebt = user.debt - paid;
      const newRating = newDebt === 0 && paid > 0 ? Math.min(850, user.rating + 10) : user.rating;
      await DB.prepare("UPDATE users SET wallet=wallet-?, debt=?, rating=?, loan_due=? WHERE id=?")
        .bind(paid, newDebt, newRating, newDebt === 0 ? null : user.loan_due, user.id).run();
    } else if (action === "nextDay") {
      let debt = user.debt;
      let rating = user.rating;
      let due = user.loan_due;
      const day = user.day + 1;
      const housing = selectedHousing(user.housing);
      const hunger = Math.max(0, Number(user.hunger ?? 100) - HUNGER_DECAY_PER_DAY);
      const thirst = Math.max(0, Number(user.thirst ?? 100) - THIRST_DECAY_PER_DAY);
      const rentDue = Number(user.rent_due ?? 0) + housing.rent;
      if (debt > 0 && due !== null && day > due) {
        rating = Math.max(300, rating - 50);
        debt = Math.ceil(debt * 1.15);
        due = day + 2;
      }
      if (hunger <= 0) rating = Math.max(300, rating - 15);
      if (thirst <= 0) rating = Math.max(300, rating - 20);
      if (rentDue >= Math.max(100, housing.rent * 4)) rating = Math.max(300, rating - 10);
      await DB.prepare("UPDATE users SET day=?, debt=?, rating=?, loan_due=?, hunger=?, thirst=?, rent_due=?, housing=? WHERE id=?")
        .bind(day, debt, rating, due, hunger, thirst, rentDue, housing.id, user.id).run();
    } else {
      return json({ error: "Bad action" }, 400);
    }
    return json({ ok: true });
  }

  if (path === "/casino/slot" && request.method === "POST") {
    const data = await body();
    const amount = money(data.amount);
    if (amount < 1 || amount > user.wallet) return json({ error: "Bad amount / not enough wallet" }, 400);

    const symbols = ["DIAMOND", "SEVEN", "CROWN", "BAR", "STAR", "CHERRY"];
    const triplePayouts = { DIAMOND: 200, SEVEN: 80, CROWN: 35, BAR: 15, STAR: 10, CHERRY: 6 };
    const pick = items => items[Math.floor(Math.random() * items.length)];
    const lossReels = () => [...symbols].sort(() => Math.random() - 0.5).slice(0, 3);
    const pairReels = () => {
      const pair = pick(symbols);
      const other = pick(symbols.filter(symbol => symbol !== pair));
      const reels = [pair, pair, pair];
      reels[Math.floor(Math.random() * 3)] = other;
      return reels;
    };

    const roll = Math.random();
    let reels = lossReels();
    let mult = 0;
    let label = "LOSS";

    if (roll < 0.001) {
      reels = ["DIAMOND", "DIAMOND", "DIAMOND"];
      mult = triplePayouts.DIAMOND;
      label = "JACKPOT";
    } else if (roll < 0.006) {
      const symbol = pick(symbols.filter(item => item !== "DIAMOND"));
      reels = [symbol, symbol, symbol];
      mult = triplePayouts[symbol];
      label = symbol;
    } else if (roll < 0.02) {
      reels = pairReels();
      mult = 2;
      label = "PAIR";
    }

    const win = Math.floor(amount * mult);
    await DB.prepare("UPDATE users SET wallet=wallet-?+? WHERE id=?").bind(amount, win, user.id).run();
    return json({ reels, mult, win, label, odds: { jackpot: 0.001, anyWin: 0.02 } });
  }

  if (path === "/casino/roulette" && request.method === "POST") {
    const data = await body();
    const amount = money(data.amount);
    const chosen = money(data.number);
    if (amount < 1 || amount > user.wallet) return json({ error: "Bad amount / not enough wallet" }, 400);
    if (chosen < 0 || chosen > 36) return json({ error: "Choose 0-36" }, 400);
    const slotIndex = Math.floor(Math.random() * ROULETTE_NUMBERS.length);
    const result = ROULETTE_NUMBERS[slotIndex];
    const mult = chosen === result ? (result === 0 ? 36 : 5) : 0;
    const win = amount * mult;
    await DB.prepare("UPDATE users SET wallet=wallet-?+? WHERE id=?").bind(amount, win, user.id).run();
    return json({ result, slotIndex, wheel: ROULETTE_NUMBERS, mult, win });
  }

  if (path === "/admin/userAction" && request.method === "POST") {
    if (!user.is_admin) return json({ error: "Admin only" }, 403);
    const data = await body();
    const action = String(data.action || "");
    const target = await DB.prepare("SELECT * FROM users WHERE id=?").bind(data.userId).first();
    if (!target) return json({ error: "User not found" }, 404);

    const amount = Math.max(0, money(data.amount || 0));
    const note = reason(data.reason);

    if (["addWallet", "takeWallet", "addBank", "takeBank", "setRating"].includes(action) && amount < 1) {
      return json({ error: "Amount required" }, 400);
    }

    if (action === "addWallet") {
      await DB.prepare("UPDATE users SET wallet=wallet+? WHERE id=?").bind(amount, target.id).run();
    } else if (action === "takeWallet") {
      await DB.prepare("UPDATE users SET wallet=CASE WHEN wallet>? THEN wallet-? ELSE 0 END WHERE id=?")
        .bind(amount, amount, target.id).run();
    } else if (action === "addBank") {
      await DB.prepare("UPDATE users SET bank=bank+? WHERE id=?").bind(amount, target.id).run();
    } else if (action === "takeBank") {
      await DB.prepare("UPDATE users SET bank=CASE WHEN bank>? THEN bank-? ELSE 0 END WHERE id=?")
        .bind(amount, amount, target.id).run();
    } else if (action === "clearDebt") {
      await DB.prepare("UPDATE users SET debt=0, loan_due=NULL WHERE id=?").bind(target.id).run();
    } else if (action === "setRating") {
      await DB.prepare("UPDATE users SET rating=? WHERE id=?").bind(clamp(amount, 300, 850), target.id).run();
    } else if (action === "ban") {
      if (target.id === user.id || target.is_admin) return json({ error: "Cannot ban admins" }, 400);
      await DB.batch([
        DB.prepare("INSERT OR REPLACE INTO bans (user_id, admin_id, reason) VALUES (?, ?, ?)")
          .bind(target.id, user.id, note),
        DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(target.id),
      ]);
    } else if (action === "unban") {
      await DB.prepare("DELETE FROM bans WHERE user_id=?").bind(target.id).run();
    } else {
      return json({ error: "Bad admin action" }, 400);
    }

    await audit(user.id, target.id, action, amount, note);
    return json({ ok: true });
  }

  if (path === "/admin/setWinner" && request.method === "POST") {
    if (!user.is_admin) return json({ error: "Admin only" }, 403);
    const data = await body();
    const match = await DB.prepare("SELECT * FROM matches WHERE id=?").bind(data.matchId).first();
    if (!match) return json({ error: "Match not found" }, 404);
    if (!JSON.parse(match.teams).includes(data.winner)) return json({ error: "Bad winner" }, 400);
    await DB.prepare("UPDATE matches SET winner=?, closed=1 WHERE id=?").bind(data.winner, match.id).run();

    const bets = await DB.prepare("SELECT * FROM bets WHERE match_id=? AND status='pending'").bind(match.id).all();
    for (const bet of bets.results) {
      if (bet.team === data.winner) {
        const payout = Math.floor(bet.amount * match.odds);
        await DB.batch([
          DB.prepare("UPDATE users SET wallet=wallet+? WHERE id=?").bind(payout, bet.user_id),
          DB.prepare("UPDATE bets SET status='won', payout=? WHERE id=?").bind(payout, bet.id),
        ]);
      } else {
        await DB.prepare("UPDATE bets SET status='lost', payout=0 WHERE id=?").bind(bet.id).run();
      }
    }

    const predictions = await DB.prepare("SELECT * FROM predictions WHERE match_id=? AND scored=0").bind(match.id).all();
    for (const prediction of predictions.results) {
      if (prediction.team === data.winner) {
        await DB.prepare("UPDATE users SET wallet=wallet+?, score=score+? WHERE id=?")
          .bind(match.points, match.points, prediction.user_id).run();
      }
      await DB.prepare("UPDATE predictions SET scored=1 WHERE user_id=? AND match_id=?")
        .bind(prediction.user_id, match.id).run();
    }
    await audit(user.id, null, "setWinner", 0, `${match.id}:${data.winner}`);
    return json({ ok: true });
  }

  return json({ error: "Unknown endpoint" }, 404);
}

async function ensureRuntimeTables(DB) {
  if (runtimeTablesReady) return;
  const now = Math.floor(Date.now() / 1000);
  await DB.batch([
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS bans (
        user_id TEXT PRIMARY KEY,
        admin_id TEXT,
        reason TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL,
        target_user_id TEXT,
        action TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        reason TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS work_quests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        objective TEXT NOT NULL DEFAULT '',
        reward INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'posted',
        available_at INTEGER NOT NULL,
        completed_at INTEGER,
        created_at INTEGER NOT NULL
      )
    `),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_work_quests_user_status ON work_quests(user_id, status)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_work_quests_available_at ON work_quests(available_at)"),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS market_assets (
        symbol TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        previous_price INTEGER NOT NULL,
        volatility INTEGER NOT NULL,
        tick_offset INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS market_holdings (
        user_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        shares INTEGER NOT NULL DEFAULT 0,
        average_price INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(user_id, symbol)
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS market_trades (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        shares INTEGER NOT NULL,
        price INTEGER NOT NULL,
        total INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS market_history (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        price INTEGER NOT NULL,
        recorded_at INTEGER NOT NULL
      )
    `),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_market_holdings_symbol ON market_holdings(symbol)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_market_trades_user_created ON market_trades(user_id, created_at)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_market_history_symbol_time ON market_history(symbol, recorded_at)"),
    ...MARKET_ASSETS.map(asset => DB.prepare(`
      INSERT INTO market_assets (symbol, name, price, previous_price, volatility, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(symbol) DO UPDATE SET
        name = excluded.name,
        volatility = excluded.volatility
    `).bind(asset.symbol, asset.name, asset.price, asset.price, asset.volatility, now)),
    ...MARKET_ASSETS.map(asset => DB.prepare(`
      INSERT OR IGNORE INTO market_history (id, symbol, price, recorded_at)
      VALUES (?, ?, ?, ?)
    `).bind(`${asset.symbol}-initial`, asset.symbol, asset.price, now)),
  ]);
  await ensureTableColumn(DB, "users", "hunger", "INTEGER NOT NULL DEFAULT 100");
  await ensureTableColumn(DB, "users", "thirst", "INTEGER NOT NULL DEFAULT 100");
  await ensureTableColumn(DB, "users", "food", "INTEGER NOT NULL DEFAULT 1");
  await ensureTableColumn(DB, "users", "water", "INTEGER NOT NULL DEFAULT 1");
  await ensureTableColumn(DB, "users", "pizza", "INTEGER NOT NULL DEFAULT 0");
  await ensureTableColumn(DB, "users", "steak", "INTEGER NOT NULL DEFAULT 0");
  await ensureTableColumn(DB, "users", "sushi", "INTEGER NOT NULL DEFAULT 0");
  await ensureTableColumn(DB, "users", "cake", "INTEGER NOT NULL DEFAULT 0");
  await ensureTableColumn(DB, "users", "rent_due", "INTEGER NOT NULL DEFAULT 0");
  await ensureTableColumn(DB, "users", "housing", "TEXT NOT NULL DEFAULT 'room'");
  await ensureTableColumn(DB, "work_quests", "description", "TEXT NOT NULL DEFAULT ''");
  await ensureTableColumn(DB, "work_quests", "objective", "TEXT NOT NULL DEFAULT ''");
  await ensureTableColumn(DB, "market_assets", "tick_offset", "INTEGER NOT NULL DEFAULT 0");
  await DB.batch(MARKET_ASSETS.map(asset => DB.prepare(`
    UPDATE market_assets
    SET tick_offset = ?
    WHERE symbol = ? AND tick_offset = 0
  `).bind(initialMarketTickOffset(asset.symbol), asset.symbol)));
  runtimeTablesReady = true;
}

async function ensureTableColumn(DB, table, column, definition) {
  if (!/^[a-z_]+$/.test(table) || !/^[a-z_]+$/.test(column)) {
    throw new Error("Bad migration identifier");
  }
  const info = await DB.prepare(`PRAGMA table_info(${table})`).all();
  if (info.results.some(row => row.name === column)) return;
  try {
    await DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  } catch (error) {
    if (!String(error?.message || "").toLowerCase().includes("duplicate column")) throw error;
  }
}
