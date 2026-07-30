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
  const playerName = `player_${stamp}`;
  const adminName = `admin_${stamp}`;
  const borrowerName = `borrower_${stamp}`;

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

  const roulette = await request("/api/casino/roulette", {
    method: "POST",
    body: { amount: 1, number: 17 },
    session: player,
  });
  assert(Number.isInteger(roulette.result) && roulette.result >= 0 && roulette.result <= 36, "bad roulette result");
  assert(Number.isInteger(roulette.slotIndex) && roulette.slotIndex >= 0 && roulette.slotIndex < 37, "bad roulette slot");

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
  await request("/api/bank", { method: "POST", body: { action: "work", amount: 0 }, session: borrower });
  const borrowerState = await request("/api/state", { session: borrower });
  assert(borrowerState.user.wallet === 25, `expected borrower wallet 25, got ${borrowerState.user.wallet}`);
  assert(borrowerState.user.debt === 180, `expected borrower debt 180, got ${borrowerState.user.debt}`);

  await request("/api/admin/userAction", {
    method: "POST",
    body: { userId: registeredPlayer.user.id, action: "ban", amount: 0, reason: "smoke ban" },
    session: admin,
  });
  await expectError(401, "/api/bank", {
    method: "POST",
    body: { action: "work", amount: 0 },
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
    borrowerWallet: borrowerState.user.wallet,
    borrowerDebt: borrowerState.user.debt,
  }, null, 2));
} catch (error) {
  console.error(serverOutput.trim());
  throw error;
} finally {
  stopServer(server);
}
