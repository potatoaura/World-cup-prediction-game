let runtimeTablesReady = false;

const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";
  const DB = env.DB;
  const ADMIN_CODE = env.ADMIN_CODE || "";
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

  function reason(value) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, 160);
  }

  async function audit(adminId, targetUserId, action, amount = 0, note = "") {
    await DB.prepare(`
      INSERT INTO admin_logs (id, admin_id, target_user_id, action, amount, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), adminId, targetUserId, action, amount, note).run();
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
    };
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
      await DB.prepare("UPDATE users SET wallet=wallet+25 WHERE id=?").bind(user.id).run();
      return json({ ok: true, earned: 25 });
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
      if (debt > 0 && due !== null && day > due) {
        rating = Math.max(300, rating - 50);
        debt = Math.ceil(debt * 1.15);
        due = day + 2;
      }
      await DB.prepare("UPDATE users SET day=?, debt=?, rating=?, loan_due=? WHERE id=?")
        .bind(day, debt, rating, due, user.id).run();
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
  ]);
  runtimeTablesReady = true;
}
