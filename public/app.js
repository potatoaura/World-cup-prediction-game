let STATE = { user: null, admin: false, leaderboard: [], adminUsers: [], properties: null };
let wheelRotation = 0;
let ballRotation = 0;
let rouletteBusy = false;
let serverClockOffsetSeconds = 0;
let workRefreshQueued = false;
let lastWorkPollAt = 0;
let marketDetailSymbol = "";
let marketDetail = null;
let marketDetailLoading = false;
let housingListingsOpen = false;
let propertyListingsOpen = false;

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

function formatDate(seconds) {
  if (!Number.isFinite(Number(seconds))) return "-";
  return new Date(Number(seconds) * 1000).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
    STATE = { user: null, admin: false, leaderboard: [], adminUsers: [], properties: null };
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
  el("lifePanel").classList.toggle("hidden", !user);
  el("propertyPanel").classList.toggle("hidden", !user);
  el("workPanel").classList.toggle("hidden", !user);
  el("marketPanel").classList.toggle("hidden", !user);
  el("adminPanel").classList.toggle("hidden", !(user && user.isAdmin));

  if (user) {
    for (const key of ["wallet", "bank", "debt", "rating", "score", "day"]) {
      el(key).textContent = user[key];
    }
    el("hunger").textContent = user.life?.hunger ?? 100;
    el("thirst").textContent = user.life?.thirst ?? 100;
    el("food").textContent = user.life?.food ?? 0;
    el("water").textContent = user.life?.water ?? 0;
    el("rentDue").textContent = user.life?.rentDue ?? 0;
    el("loanDue").textContent = user.loanDue ?? "-";
    el("meName").textContent = `${user.username}${user.isAdmin ? " (admin)" : ""}${user.banned ? " (banned)" : ""}`;
  }

  renderLeaderboard();
  renderAdmin();
  renderLife();
  renderProperties();
  renderWorkQuest();
  renderMarket();
  renderMarketDetail();
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

async function lifeAction(action) {
  try {
    const amount = Number(el("rentAmount").value);
    await api("/api/life", { action, amount });
    log(`Life: ${action}`);
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

async function lifeItemAction(action, itemId) {
  try {
    const input = el(`lifeAmount_${itemId}`);
    const amount = Math.max(1, Number(input?.value || 1));
    const result = await api("/api/life", { action, itemId, amount });
    log(action === "buyItem"
      ? `Bought ${result.bought} ${itemId} for ${result.cost}`
      : `Used ${itemId}`);
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

async function chooseHousing(housingId) {
  try {
    const result = await api("/api/life", { action: "moveHousing", housingId });
    log(result.cost ? `Moved to ${result.housing.name} for ${result.cost}` : `Housing unchanged`);
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

function toggleHousingListings() {
  housingListingsOpen = !housingListingsOpen;
  renderLife();
}

function togglePropertyListings() {
  propertyListingsOpen = !propertyListingsOpen;
  renderProperties();
}

async function propertyAction(action, propertyId, ownedId = "") {
  try {
    const result = await api("/api/property", { action, propertyId, ownedId });
    if (result.properties) STATE.properties = result.properties;
    log(`Property: ${action}`);
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
  el("clockDay").textContent = `Day ${STATE.user.day} auto`;
  el("clockLoan").textContent = STATE.user.loanDue === null || STATE.user.loanDue === undefined
    ? "No loan due"
    : `Loan due day ${STATE.user.loanDue}`;
  const life = STATE.user.life || {};
  const hunger = Number(life.hunger ?? 100);
  const thirst = Number(life.thirst ?? 100);
  const rentDue = Number(life.rentDue ?? 0);
  el("clockLife").textContent = rentDue > 0
    ? `Rent due ${rentDue}`
    : thirst < 25 ? "Thirsty" : hunger < 25 ? "Hungry" : "Life stable";

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

function renderLife() {
  if (!STATE.user || !el("lifePanel")) return;
  const life = STATE.user.life || {};
  const hunger = Number(life.hunger ?? 100);
  const thirst = Number(life.thirst ?? 100);
  const food = Number(life.food ?? 0);
  const water = Number(life.water ?? 0);
  const rentDue = Number(life.rentDue ?? 0);
  const housing = life.housing || {};
  const rentPerDay = Number(life.rentPerDay ?? housing.rent ?? 22);
  const inventory = life.inventory || {};
  const items = Array.isArray(life.items) ? life.items : [];
  const listings = Array.isArray(life.housingListings) ? life.housingListings : [];
  el("lifeHunger").textContent = hunger;
  el("lifeHungerBar").style.width = `${Math.max(0, Math.min(100, hunger))}%`;
  el("lifeThirst").textContent = thirst;
  el("lifeThirstBar").style.width = `${Math.max(0, Math.min(100, thirst))}%`;
  el("lifeStorage").textContent = `${food} food / ${water} water`;
  el("lifeHousing").textContent = housing.name || "Starter Room";
  el("lifeHousingArea").textContent = housing.area || "Old Town";
  el("lifeComfort").textContent = `Comfort ${housing.comfort || 1}`;
  el("housingBoard").classList.toggle("hidden", !housingListingsOpen);
  const housingToggle = el("housingBoard").previousElementSibling?.querySelector("button");
  if (housingToggle) housingToggle.textContent = housingListingsOpen ? "Hide rentals" : "Show rentals";
  el("lifeRentPerDay").textContent = rentPerDay;
  el("lifeRentDue").textContent = rentDue;
  el("lifeRentStatus").textContent = rentDue > 0 ? "Unpaid" : "Paid";
  el("lifeShop").innerHTML = items.map(item => {
    const count = Number(inventory[item.id] || 0);
    const effects = [
      item.hunger ? `${item.hunger > 0 ? "+" : ""}${item.hunger} hunger` : "",
      item.thirst ? `${item.thirst > 0 ? "+" : ""}${item.thirst} thirst` : "",
    ].filter(Boolean).join(" / ") || "Storage item";
    return `
      <div class="shopItem ${item.type === "drink" ? "drink" : "food"}">
        <div>
          <b>${esc(item.name)}</b>
          <span>${effects}</span>
        </div>
        <div class="shopMeta">
          <strong>${item.price}</strong>
          <small>Stock ${count}</small>
        </div>
        <div class="shopActions">
          <input id="lifeAmount_${esc(item.id)}" type="number" value="1" min="1" max="20">
          <button onclick="lifeItemAction('buyItem','${esc(item.id)}')" ${STATE.user.wallet < item.price ? "disabled" : ""}>Buy</button>
          <button class="secondary" onclick="lifeItemAction('useItem','${esc(item.id)}')" ${count < 1 ? "disabled" : ""}>Use</button>
        </div>
      </div>
    `;
  }).join("");

  const selectedHousingId = housing.id || "room";
  el("housingMap").innerHTML = listings.map(listing => `
    <button
      type="button"
      class="housingPin ${listing.id === selectedHousingId ? "current" : ""}"
      style="left:${Number(listing.x) || 50}%;top:${Number(listing.y) || 50}%"
      title="${esc(listing.name)}"
      onclick="chooseHousing('${esc(listing.id)}')"
    >
      ${listing.comfort}
    </button>
  `).join("");

  el("housingListings").innerHTML = listings.map(listing => {
    const current = listing.id === selectedHousingId;
    const affordable = Number(STATE.user.wallet) >= Number(listing.deposit || 0);
    return `
      <div class="housingListing ${current ? "current" : ""}">
        <div>
          <b>${esc(listing.name)}</b>
          <span>${esc(listing.area)}</span>
          <small>${esc(listing.description)}</small>
        </div>
        <div class="housingPrice">
          <strong>${listing.rent}/day</strong>
          <small>Deposit ${listing.deposit}</small>
          <small>Comfort ${listing.comfort}</small>
        </div>
        <button onclick="chooseHousing('${esc(listing.id)}')" ${current || !affordable ? "disabled" : ""}>
          ${current ? "Current" : affordable ? "Move in" : "Need cash"}
        </button>
      </div>
    `;
  }).join("");

  const hungerText = hunger <= 0 ? "Eat before work." : hunger < 25 ? "Low hunger." : "Food ready.";
  const thirstText = thirst <= 0 ? " Drink water before work." : thirst < 25 ? " Low thirst." : "";
  el("lifeHint").textContent = rentDue >= 100
    ? `${hungerText}${thirstText} Rent is overdue.`
    : `${hungerText}${thirstText} Rent grows each day.`;
  if (rentDue > 0) {
    el("rentAmount").value = rentDue;
  }
}

function renderProperties() {
  const panel = el("propertyPanel");
  if (!STATE.user || !panel) return;
  const properties = STATE.properties || { listings: [], owned: [], value: 0, incomePerDay: 0 };
  const listings = Array.isArray(properties.listings) ? properties.listings : [];
  const owned = Array.isArray(properties.owned) ? properties.owned : [];
  el("propertyOwned").textContent = owned.length;
  el("propertyValue").textContent = properties.value || 0;
  el("propertyIncome").textContent = properties.incomePerDay || 0;
  el("propertyToggle").textContent = propertyListingsOpen ? "Hide apartments" : "Show apartments";
  el("propertyListings").classList.toggle("hidden", !propertyListingsOpen);
  el("propertyListings").innerHTML = listings.map(item => {
    const canBuy = Number(STATE.user.wallet) >= Number(item.price || 0) && !item.ownedCount;
    const canRent = Number(STATE.user.wallet) >= Number(item.deposit || 0);
    return `
      <div class="propertyListing">
        <div>
          <b>${esc(item.name)}</b>
          <span>${esc(item.area)} | floor ${item.floor} | comfort ${item.comfort}</span>
          <small>${esc(item.description)}</small>
        </div>
        <div class="propertyNumbers">
          <strong>${item.price}</strong>
          <small>Rent ${item.rent}/day</small>
          <small>Deposit ${item.deposit}</small>
          <small>Income ${item.income}/day</small>
        </div>
        <div class="propertyActions">
          <button onclick="propertyAction('buy','${esc(item.id)}')" ${canBuy ? "" : "disabled"}>${item.ownedCount ? "Owned" : "Buy"}</button>
          <button class="secondary" onclick="propertyAction('rentHome','${esc(item.id)}')" ${canRent ? "" : "disabled"}>Rent home</button>
        </div>
      </div>
    `;
  }).join("");

  el("ownedProperties").innerHTML = owned.length ? owned.map(item => `
    <div class="ownedProperty ${item.rentedOut ? "rented" : ""}">
      <div>
        <b>${esc(item.name)}</b>
        <span>${esc(item.area)} | floor ${item.floor} | comfort ${item.comfort}</span>
      </div>
      <div>
        <strong>${item.rentedOut ? `+${item.income}/day` : "Idle"}</strong>
        <small>${item.rentedOut ? "Rented out" : "Not rented"}</small>
      </div>
      <button class="secondary" onclick="propertyAction('toggleRentOut','${esc(item.propertyId)}','${esc(item.id)}')">
        ${item.rentedOut ? "Stop rent" : "Rent out"}
      </button>
    </div>
  `).join("") : `<div class="propertyEmpty">No owned apartments</div>`;
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
  const progress = Number(quest.progress || 0);
  const stepsRequired = Math.max(1, Number(quest.stepsRequired || 1));
  const taskDone = progress >= stepsRequired;
  completeButton.disabled = !ready || !taskDone;
  completeButton.textContent = ready ? `Collect ${quest.reward}` : "Waiting";
  box.innerHTML = `
    <div class="questTop">
      <b>${esc(quest.title)}</b>
      <span>${esc(quest.difficulty)}</span>
    </div>
    <p class="questDescription">${esc(quest.description)}</p>
    <div class="questTask">
      <b>Task</b>
      <span>${esc(quest.objective)}</span>
    </div>
    <div class="workProgress">
      <span>${esc(quest.taskPrompt || "Do work step")}</span>
      <b>${progress}/${stepsRequired}</b>
      <i><em style="width:${Math.min(100, Math.round((progress / stepsRequired) * 100))}%"></em></i>
      <button class="secondary" onclick="doWorkTask()" ${ready && !taskDone ? "" : "disabled"}>Do task</button>
    </div>
    <div class="questMeta">
      <span>Reward <b>${quest.reward}</b></span>
      <span>${taskDone ? "Ready" : "Task required"}</span>
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

function marketSparkline(history, direction) {
  const prices = marketHistoryPoints(history)
    .map(point => point.price)
    .filter(price => Number.isFinite(price));
  if (prices.length === 1) prices.unshift(prices[0]);
  if (!prices.length) prices.push(0, 0);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(1, max - min);
  const lastIndex = Math.max(1, prices.length - 1);
  const points = prices.map((price, index) => {
    const x = (index / lastIndex) * 100;
    const y = 36 - ((price - min) / range) * 30;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const trend = direction === "up" ? "up" : direction === "down" ? "down" : "flat";
  return `
    <svg class="marketChart ${trend}" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="${points}"></polyline>
    </svg>
  `;
}

function marketHistoryPoints(history) {
  return (Array.isArray(history) ? history : [])
    .map((point, index) => {
      const recordedAt = Number(typeof point === "object" ? point.recordedAt : index);
      return {
        price: Number(typeof point === "object" ? point.price : point),
        recordedAt: Number.isFinite(recordedAt) ? recordedAt : index,
      };
    })
    .filter(point => Number.isFinite(point.price));
}

function marketDetailChart(asset) {
  const history = marketHistoryPoints(asset.history);
  if (history.length === 1) history.unshift({ ...history[0] });
  if (!history.length) history.push({ price: asset.price, recordedAt: 0 }, { price: asset.price, recordedAt: 1 });
  const prices = history.map(point => point.price);
  const min = Math.min(...prices, asset.averagePrice || asset.price);
  const max = Math.max(...prices, asset.averagePrice || asset.price);
  const range = Math.max(1, max - min);
  const firstTime = history[0].recordedAt;
  const lastTime = history[history.length - 1].recordedAt;
  const timeRange = Math.max(1, lastTime - firstTime);
  const pointFor = (price, recordedAt) => ({
    x: ((recordedAt - firstTime) / timeRange) * 100,
    y: 68 - ((price - min) / range) * 60,
  });
  const points = history.map(point => {
    const pos = pointFor(point.price, point.recordedAt);
    return `${pos.x.toFixed(2)},${pos.y.toFixed(2)}`;
  }).join(" ");
  const averageY = 68 - (((asset.averagePrice || asset.price) - min) / range) * 60;
  const markers = (asset.trades || []).map(trade => {
    const pos = pointFor(trade.price, trade.createdAt || lastTime);
    const side = trade.side === "sell" ? "sell" : "buy";
    return `<circle class="${side}" cx="${pos.x.toFixed(2)}" cy="${pos.y.toFixed(2)}" r="1.9"><title>${side} ${trade.shares} at ${trade.price}</title></circle>`;
  }).join("");
  const averageLine = asset.shares > 0
    ? `<line class="average" x1="0" y1="${averageY.toFixed(2)}" x2="100" y2="${averageY.toFixed(2)}"></line>`
    : "";
  return `
    <svg class="marketChart detail ${asset.change > 0 ? "up" : asset.change < 0 ? "down" : "flat"}" viewBox="0 0 100 76" preserveAspectRatio="none" aria-hidden="true">
      ${averageLine}
      <polyline points="${points}"></polyline>
      ${markers}
    </svg>
  `;
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
      <button type="button" class="marketAsset ${direction}" onclick="openMarketDetail('${esc(asset.symbol)}')">
        <div class="marketAssetName">
          <b>${esc(asset.symbol)}</b>
          <span>${esc(asset.name)}</span>
        </div>
        <div class="marketAssetPrice">
          <strong>${asset.price}</strong>
          <small>${changeLabel}</small>
        </div>
        <div class="marketChartBox">${marketSparkline(asset.history, direction)}</div>
        <div class="marketPosition">
          <span>Shares ${asset.shares}</span>
          <span>Avg ${asset.averagePrice || "-"}</span>
          <span>Value ${asset.value}</span>
        </div>
      </button>
    `;
  }).join("");
}

async function openMarketDetail(symbol) {
  marketDetailSymbol = symbol;
  marketDetail = null;
  marketDetailLoading = true;
  const select = el("marketSymbol");
  if (select && [...select.options].some(option => option.value === symbol)) select.value = symbol;
  renderMarketDetail();
  try {
    marketDetail = await api(`/api/market/${encodeURIComponent(symbol)}`);
  } catch (error) {
    marketDetail = { error: error.message };
  } finally {
    marketDetailLoading = false;
    renderMarketDetail();
  }
}

function closeMarketDetail(event) {
  if (event && event.target !== event.currentTarget) return;
  marketDetailSymbol = "";
  marketDetail = null;
  marketDetailLoading = false;
  renderMarketDetail();
}

function renderMarketDetail() {
  const overlay = el("marketDetailOverlay");
  const body = el("marketDetailBody");
  const title = el("marketDetailTitle");
  if (!overlay || !body || !title) return;
  overlay.classList.toggle("hidden", !marketDetailSymbol);
  if (!marketDetailSymbol) return;
  title.textContent = marketDetailSymbol;
  if (marketDetailLoading) {
    body.innerHTML = `<div class="marketDetailEmpty">Loading</div>`;
    return;
  }
  if (marketDetail?.error) {
    body.innerHTML = `<div class="marketDetailEmpty">${esc(marketDetail.error)}</div>`;
    return;
  }
  const asset = marketDetail?.asset;
  if (!asset) {
    body.innerHTML = `<div class="marketDetailEmpty">No data</div>`;
    return;
  }
  const direction = asset.change > 0 ? "up" : asset.change < 0 ? "down" : "flat";
  const changeLabel = `${asset.change > 0 ? "+" : ""}${asset.change} (${asset.changePct > 0 ? "+" : ""}${asset.changePct}%)`;
  const trades = (asset.trades || []).map(trade => `
    <div class="marketTradeRow ${trade.side}">
      <span>${esc(trade.side.toUpperCase())}</span>
      <span>${trade.shares} share${trade.shares === 1 ? "" : "s"}</span>
      <span>@ ${trade.price}</span>
      <span>${formatDate(trade.createdAt)}</span>
    </div>
  `).join("") || `<div class="marketTradeRow empty">No trades</div>`;
  body.innerHTML = `
    <div class="marketDetailTop ${direction}">
      <div>
        <b>${esc(asset.name)}</b>
        <span>${asset.symbol}</span>
      </div>
      <div>
        <strong>${asset.price}</strong>
        <small>${changeLabel}</small>
      </div>
    </div>
    <div class="marketDetailStats">
      <span>Shares <b>${asset.shares}</b></span>
      <span>Avg buy <b>${asset.averagePrice || "-"}</b></span>
      <span>Value <b>${asset.value}</b></span>
      <span>P/L <b>${asset.profit > 0 ? "+" : ""}${asset.profit}</b></span>
    </div>
    <div class="marketDetailChartBox">${marketDetailChart(asset)}</div>
    <div class="marketDetailRange">
      <span>${formatDate(asset.history?.[0]?.recordedAt)}</span>
      <span>All time</span>
      <span>${formatDate(asset.history?.[asset.history.length - 1]?.recordedAt)}</span>
    </div>
    <div class="marketTradeList">
      <b>Trades</b>
      ${trades}
    </div>
  `;
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
    if (marketDetailSymbol === result.symbol) await openMarketDetail(result.symbol);
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

async function doWorkTask() {
  try {
    const result = await api("/api/work", { action: "task" });
    log(`Work task ${result.quest.progress}/${result.quest.stepsRequired}`);
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
    el("rouletteMsg").textContent = "Spinning";
    setTimeout(async () => {
      el("rouletteMsg").textContent = result.win ? `Result ${result.result}: +${result.win}` : `Result ${result.result}: -${amount}`;
      settleRouletteCamera();
      await loadState();
      rouletteBusy = false;
      if (button) button.disabled = false;
    }, 4200);
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
  const camera = el("wheelCamera");
  const ball = el("ball");
  if (!camera || !ball) return;
  camera.classList.remove("settled", "cinematic");
  ball.classList.remove("ballBounce");
}

function settleRouletteCamera() {
  const camera = el("wheelCamera");
  const ball = el("ball");
  if (!camera || !ball) return;
  camera.classList.remove("cinematic");
  camera.classList.remove("settled");
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
