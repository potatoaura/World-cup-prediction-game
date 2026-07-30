let STATE = { user: null, admin: false, leaderboard: [], adminUsers: [] };
let wheelRotation = 0;
let ballRotation = 0;
let rouletteBusy = false;
let serverClockOffsetSeconds = 0;

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
  if (!quest) return 0;
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
  const remaining = questRemaining(quest);
  el("clockQuest").textContent = remaining > 0 ? `Work ${formatCountdown(remaining)}` : "Work ready";
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

  const remaining = questRemaining(quest);
  const ready = remaining <= 0;
  const duration = Math.max(1, Number(quest.availableAt) - Number(quest.createdAt || quest.availableAt));
  const progress = ready ? 100 : Math.max(6, Math.min(96, Math.round((1 - remaining / duration) * 100)));
  postButton.disabled = true;
  completeButton.disabled = !ready;
  completeButton.textContent = ready ? `Collect ${quest.reward}` : formatCountdown(remaining);
  box.innerHTML = `
    <div class="questTop">
      <b>${esc(quest.title)}</b>
      <span>${esc(quest.difficulty)}</span>
    </div>
    <div class="questMeta">
      <span>Reward <b>${quest.reward}</b></span>
      <span>${ready ? "Ready" : `Ready in ${formatCountdown(remaining)}`}</span>
    </div>
    <div class="questProgress"><i style="width:${progress}%"></i></div>
  `;
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
    startRouletteCamera();
    animateRoulette(result.result);
    el("rouletteMsg").textContent = "Camera rolling";
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
  wheelRotation -= 1080 + sector * 5;
  const targetBall = rouletteAngle(resultNumber) + positiveMod(wheelRotation, 360) + 90;
  ballRotation += 1800 + positiveMod(targetBall - positiveMod(ballRotation, 360), 360);
  wheel.style.transform = `rotate(${wheelRotation}deg)`;
  ballOrbit.style.transform = `rotate(${ballRotation}deg)`;
}

function startRouletteCamera() {
  const box = el("wheelBox");
  const ball = el("ball");
  if (!box || !ball) return;
  box.classList.remove("settled", "cinematic");
  ball.classList.remove("ballBounce");
  void box.offsetWidth;
  void ball.offsetWidth;
  box.classList.add("cinematic");
  ball.classList.add("ballBounce");
}

function settleRouletteCamera() {
  const box = el("wheelBox");
  const ball = el("ball");
  if (!box || !ball) return;
  box.classList.remove("cinematic");
  box.classList.add("settled");
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
  const size = Math.round(canvas.getBoundingClientRect().width || 320);
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
}, 1000);
