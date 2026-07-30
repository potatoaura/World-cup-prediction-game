let STATE = { user: null, admin: false, leaderboard: [], adminUsers: [] };
let wheelRotation = 0;
let ballRotation = 0;
let rouletteBusy = false;
let serverClockOffsetSeconds = 0;
let workRefreshQueued = false;
let lastWorkPollAt = 0;
let rouletteCameraFrame = 0;
let lastRouletteTrack = null;

const ROULETTE_SPIN_MS = 5400;

const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

function el(id) {
  return document.getElementById(id);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

function log(text) {
  el("log").innerHTML = `${esc(text)}<br>${el("log").innerHTML}`;
}

async function api(path, body = null) {
  const options = body ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  } : {};
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({ error: "Bad response" }));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function loadState() {
  try {
    STATE = await api("/api/state");
    if (Number.isFinite(Number(STATE.now))) {
      serverClockOffsetSeconds = Number(STATE.now) - Math.floor(Date.now() / 1000);
    }
    hideError();
  } catch (error) {
    STATE = { user: null, admin: false, leaderboard: [], adminUsers: [] };
    showError(`API error: ${error.message}`);
  }
  render();
}

function showError(text) {
  el("errorBox").textContent = text;
  el("errorBox").classList.remove("hidden");
}

function hideError() {
  el("errorBox").classList.add("hidden");
}

function render() {
  const user = STATE.user;
  el("auth").classList.toggle("hidden", !!user);
  el("me").classList.toggle("hidden", !user);
  el("stats").classList.toggle("hidden", !user);
  el("timeWidget").classList.toggle("hidden", !user);
  el("workPanel").classList.toggle("hidden", !user);
  el("marketPanel").classList.toggle("hidden", !user);
  el("adminPanel").classList.toggle("hidden", !(user && user.isAdmin));

  if (user) {
    for (const key of ["wallet", "bank", "debt", "rating", "score", "day"]) {
      el(key).textContent = user[key];
    }
    el("loanDue").textContent = user.loanDue ?? "-";
    el("meName").textContent = `${user.username}${user.isAdmin ? " (admin)" : ""}${user.banned ? " (banned)" : ""}`;
  }

  renderLeaderboard();
  renderAdmin();
  renderWorkQuest();
  renderMarket();
  renderClock();
  drawWheel();
}

function renderLeaderboard() {
  const box = el("leaderboard");
  box.innerHTML = '<div class="leaderRow"><b>#</b><b>User</b><b>Total</b><b>Score</b></div>';
  for (const [index, user] of (STATE.leaderboard || []).entries()) {
    box.innerHTML += `<div class="leaderRow"><span>${index + 1}</span><span>${esc(user.username)}</span><span>${user.wallet + user.bank}</span><span>${user.score}</span></div>`;
  }
}

function renderAdmin() {
  if (!STATE.admin) return;
  const box = el("adminUsers");
  const users = STATE.adminUsers || [];
  box.innerHTML = users.map(user => `
    <div class="adminUser ${user.banned ? "isBanned" : ""}">
      <div>
        <b>${esc(user.username)}${user.isAdmin ? " admin" : ""}</b>
        <span>W ${user.wallet} | B ${user.bank} | D ${user.debt} | R ${user.rating}</span>
        ${user.banned ? `<small>Banned: ${esc(user.banReason || "no reason")}</small>` : ""}
      </div>
      <div class="adminActions">
        <button onclick="adminUserAction('${user.id}','addWallet')">+Wallet</button>
        <button onclick="adminUserAction('${user.id}','addBank')">+Bank</button>
        <button class="secondary" onclick="adminUserAction('${user.id}','takeWallet')">-Wallet</button>
        <button class="secondary" onclick="adminUserAction('${user.id}','clearDebt')">Clear debt</button>
        <button class="danger" onclick="adminUserAction('${user.id}','ban')" ${user.isAdmin ? "disabled" : ""}>Ban</button>
        <button class="secondary" onclick="adminUserAction('${user.id}','unban')">Unban</button>
      </div>
    </div>
  `).join("");
}

async function register() {
  try {
    await api("/api/register", {
      username: el("username").value,
      password: el("password").value,
      adminCode: el("adminCode").value,
    });
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

async function login() {
  try {
    await api("/api/login", {
      username: el("username").value,
      password: el("password").value,
    });
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

async function logout() {
  try {
    await api("/api/logout");
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

async function bankAction(action) {
  try {
    await api("/api/bank", {
      action,
      amount: Number(el("bankAmount").value),
    });
    log(`Bank: ${action}`);
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

function currentServerSecond() {
  return Math.floor(Date.now() / 1000) + serverClockOffsetSeconds;
}

function formatCountdown(seconds) {
  const total = Math.max(0, Math.ceil(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function questRemaining(quest) {
  if (!quest || quest.availableAt === null || quest.availableAt === undefined) return null;
  return Math.max(0, Number(quest.availableAt) - currentServerSecond());
}

function renderClock() {
  if (!STATE.user || !el("clockTime")) return;
  const now = new Date();
  el("clockTime").textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  el("clockDate").textContent = now.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  el("clockDay").textContent = `Day ${STATE.user.day}`;
  el("clockLoan").textContent = STATE.user.loanDue === null || STATE.user.loanDue === undefined
    ? "No loan due"
    : `Loan due day ${STATE.user.loanDue}`;

  const quest = STATE.activeQuest;
  if (!quest) {
    el("clockQuest").textContent = "No work quest";
    return;
  }
  if (!quest.revealed) {
    el("clockQuest").textContent = "Finding work";
    return;
  }
  el("clockQuest").textContent = "Work ready";
}

function renderWorkQuest() {
  const panel = el("workPanel");
  if (!panel) return;
  const postButton = el("postWorkBtn");
  const completeButton = el("completeWorkBtn");
  const box = el("workQuest");
  if (!STATE.user) {
    panel.classList.add("hidden");
    return;
  }

  const quest = STATE.activeQuest;
  if (!quest) {
    workRefreshQueued = false;
    postButton.disabled = false;
    completeButton.disabled = true;
    completeButton.textContent = "Complete quest";
    box.innerHTML = `
      <div class="questEmpty">
        <b>No active job</b>
        <span>Post ad</span>
      </div>
    `;
    return;
  }

  const ready = !!quest.ready;
  postButton.disabled = true;

  if (!quest.revealed) {
    completeButton.disabled = true;
    completeButton.textContent = "Waiting";
    box.innerHTML = `
      <div class="questTop">
        <b>Looking for a job</b>
        <span>Ad posted</span>
      </div>
      <div class="questMeta">
        <span>Quest hidden</span>
        <span>No timer</span>
      </div>
    `;
    return;
  }

  workRefreshQueued = false;
  completeButton.disabled = !ready;
  completeButton.textContent = ready ? `Collect ${quest.reward}` : "Waiting";
  box.innerHTML = `
    <div class="questTop">
      <b>${esc(quest.title)}</b>
      <span>${esc(quest.difficulty)}</span>
    </div>
    <div class="questMeta">
      <span>Reward <b>${quest.reward}</b></span>
      <span>Ready</span>
    </div>
  `;
}

function maybePollWorkQuest() {
  const quest = STATE.activeQuest;
  if (!STATE.user || !quest || quest.revealed || workRefreshQueued) return;
  const now = Date.now();
  if (now - lastWorkPollAt < 15000) return;
  lastWorkPollAt = now;
  workRefreshQueued = true;
  loadState().finally(() => { workRefreshQueued = false; });
}

function renderMarket() {
  const panel = el("marketPanel");
  if (!panel) return;
  const market = STATE.market || { assets: [], value: 0 };
  el("marketValue").textContent = market.value || 0;

  const select = el("marketSymbol");
  const selected = select.value;
  select.innerHTML = (market.assets || []).map(asset => `
    <option value="${esc(asset.symbol)}">${esc(asset.symbol)}</option>
  `).join("");
  if ((market.assets || []).some(asset => asset.symbol === selected)) select.value = selected;

  const box = el("marketAssets");
  box.innerHTML = (market.assets || []).map(asset => {
    const direction = asset.change > 0 ? "up" : asset.change < 0 ? "down" : "flat";
    const changeLabel = `${asset.change > 0 ? "+" : ""}${asset.change} (${asset.changePct > 0 ? "+" : ""}${asset.changePct}%)`;
    return `
      <div class="marketAsset ${direction}">
        <div>
          <b>${esc(asset.symbol)}</b>
          <span>${esc(asset.name)}</span>
        </div>
        <div>
          <strong>${asset.price}</strong>
          <small>${changeLabel}</small>
        </div>
        <div>
          <span>Shares ${asset.shares}</span>
          <span>Value ${asset.value}</span>
        </div>
      </div>
    `;
  }).join("");
}

async function marketAction(action) {
  try {
    const result = await api("/api/market", {
      action,
      symbol: el("marketSymbol").value,
      shares: Number(el("marketShares").value),
    });
    log(`Market ${action}: ${result.shares} ${result.symbol} for ${result.total}`);
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

async function postWorkAd() {
  try {
    const result = await api("/api/work", { action: "post" });
    log(result.existing ? "Work ad already active" : "Work ad posted");
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

async function completeWorkQuest() {
  try {
    const result = await api("/api/work", { action: "complete" });
    log(`Work quest earned ${result.reward}`);
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

async function slot() {
  try {
    const amount = Number(el("slotAmount").value);
    const reels = [el("reel1"), el("reel2"), el("reel3")];
    reels.forEach(reel => reel.classList.add("spin"));
    const result = await api("/api/casino/slot", { amount });
    setTimeout(async () => {
      reels.forEach((reel, index) => {
        reel.textContent = result.reels[index];
        reel.classList.remove("spin");
      });
      el("slotMsg").textContent = result.win ? `${result.label}: +${result.win}` : `LOSS: -${amount}`;
      await loadState();
    }, 1200);
  } catch (error) {
    alert(error.message);
  }
}

async function roulette() {
  if (rouletteBusy) return;
  const button = el("rouletteButton");
  try {
    rouletteBusy = true;
    if (button) button.disabled = true;
    const amount = Number(el("rouletteAmount").value);
    const number = Number(el("rouletteNumber").value);
    const result = await api("/api/casino/roulette", { amount, number });
    const track = animateRoulette(result.result);
    startRouletteCamera(track);
    el("rouletteMsg").textContent = "Tracking ball";
    setTimeout(async () => {
      el("rouletteMsg").textContent = result.win ? `Result ${result.result}: +${result.win}` : `Result ${result.result}: -${amount}`;
      settleRouletteCamera();
      await loadState();
      rouletteBusy = false;
      if (button) button.disabled = false;
    }, 5400);
  } catch (error) {
    settleRouletteCamera();
    rouletteBusy = false;
    if (button) button.disabled = false;
    alert(error.message);
  }
}

function positiveMod(value, size) {
  return ((value % size) + size) % size;
}

function rouletteAngle(number) {
  const slotIndex = ROULETTE_NUMBERS.indexOf(number);
  return (slotIndex + 0.5) * (360 / ROULETTE_NUMBERS.length);
}

function animateRoulette(resultNumber) {
  const wheel = el("wheel");
  const ballOrbit = el("ballOrbit");
  const sector = 360 / ROULETTE_NUMBERS.length;
  const startBallRotation = ballRotation;
  wheelRotation -= 1080 + sector * 5;
  const targetBall = rouletteAngle(resultNumber) + positiveMod(wheelRotation, 360) + 90;
  ballRotation += 1800 + positiveMod(targetBall - positiveMod(ballRotation, 360), 360);
  wheel.style.transform = `rotate(${wheelRotation}deg)`;
  ballOrbit.style.transform = `rotate(${ballRotation}deg)`;
  return { startBallRotation, endBallRotation: ballRotation };
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function rouletteFocus(angle) {
  const radians = (positiveMod(angle, 360) * Math.PI) / 180;
  const radius = 45;
  return {
    x: 50 + Math.sin(radians) * radius,
    y: 50 - Math.cos(radians) * radius,
  };
}

function setRouletteCameraPose(camera, angle, progress) {
  const focus = rouletteFocus(angle);
  const zoom = progress < 0.48
    ? lerp(0.62, 1.08, progress / 0.48)
    : lerp(1.08, 3.45, easeOutCubic((progress - 0.48) / 0.52));
  const rotateX = lerp(24, 64, easeOutCubic(progress));
  const rotateY = lerp(0, -22, easeOutCubic(Math.max(0, progress - 0.18) / 0.82));
  const driftX = lerp(0, -9, progress);
  const driftY = lerp(0, 7, progress);
  camera.style.transformOrigin = `${focus.x}% ${focus.y}%`;
  camera.style.transform = `perspective(1100px) translate3d(${driftX}%,${driftY}%,0) scale(${zoom}) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}

function startRouletteCamera(track) {
  const camera = el("wheelCamera");
  const ball = el("ball");
  if (!camera || !ball) return;
  if (rouletteCameraFrame) cancelAnimationFrame(rouletteCameraFrame);
  lastRouletteTrack = track;
  camera.classList.remove("settled", "cinematic");
  ball.classList.remove("ballBounce");
  void camera.offsetWidth;
  void ball.offsetWidth;
  camera.classList.add("cinematic");
  ball.classList.add("ballBounce");

  const startedAt = performance.now();
  const step = now => {
    const progress = Math.min(1, (now - startedAt) / ROULETTE_SPIN_MS);
    const eased = easeOutCubic(progress);
    const angle = lerp(track.startBallRotation, track.endBallRotation, eased);
    setRouletteCameraPose(camera, angle, progress);
    if (progress < 1) rouletteCameraFrame = requestAnimationFrame(step);
  };
  rouletteCameraFrame = requestAnimationFrame(step);
}

function settleRouletteCamera() {
  const camera = el("wheelCamera");
  const ball = el("ball");
  if (!camera || !ball) return;
  if (rouletteCameraFrame) cancelAnimationFrame(rouletteCameraFrame);
  if (lastRouletteTrack) setRouletteCameraPose(camera, lastRouletteTrack.endBallRotation, 1);
  camera.classList.remove("cinematic");
  camera.classList.add("settled");
  ball.classList.remove("ballBounce");
}

async function adminUserAction(userId, action) {
  try {
    await api("/api/admin/userAction", {
      userId,
      action,
      amount: Number(el("adminAmount").value),
      reason: el("adminReason").value,
    });
    log(`Admin: ${action}`);
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

function drawWheel() {
  const canvas = el("wheel");
  if (!canvas) return;
  const size = Math.round(canvas.clientWidth || canvas.getBoundingClientRect().width || 320);
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
    canvas.width = size * dpr;
    canvas.height = size * dpr;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const center = size / 2;
  const outer = size * 0.475;
  const inner = size * 0.15;
  const sector = Math.PI * 2 / ROULETTE_NUMBERS.length;

  ctx.beginPath();
  ctx.arc(center, center, Math.min(size * 0.495, outer + 6), 0, Math.PI * 2);
  ctx.fillStyle = "#c9a84d";
  ctx.fill();

  for (let index = 0; index < ROULETTE_NUMBERS.length; index++) {
    const number = ROULETTE_NUMBERS[index];
    const start = index * sector;
    const end = start + sector;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, outer, start, end);
    ctx.closePath();
    ctx.fillStyle = number === 0 ? "#0d7a43" : index % 2 ? "#9f2434" : "#191c22";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.24)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(start + sector / 2);
    ctx.fillStyle = "#f8fafc";
    ctx.font = `700 ${Math.max(10, size * 0.037)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(number), size * 0.362, 0);
    ctx.restore();
  }

  for (let index = 0; index < ROULETTE_NUMBERS.length; index++) {
    const angle = index * sector;
    const x = center + Math.cos(angle) * (outer - 9);
    const y = center + Math.sin(angle) * (outer - 9);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, size * 0.009), 0, Math.PI * 2);
    ctx.fillStyle = "#d8b85a";
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(center, center, inner, 0, Math.PI * 2);
  ctx.fillStyle = "#222833";
  ctx.fill();
  ctx.strokeStyle = "#c9a84d";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(center, center, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#d8b85a";
  ctx.fill();
}

loadState();
setInterval(() => {
  renderClock();
  renderWorkQuest();
  maybePollWorkQuest();
}, 1000);
