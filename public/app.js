let STATE = { user: null, admin: false, leaderboard: [], adminUsers: [], properties: null, store: null, city: null, businesses: null, casino: null, lottery: null };
let wheelRotation = 0;
let ballRotation = 0;
let rouletteBusy = false;
let fortuneRotation = 0;
let serverClockOffsetSeconds = 0;
let storeRefreshQueued = false;
let lastStorePollAt = 0;
let marketDetailSymbol = "";
let marketDetail = null;
let marketDetailLoading = false;
let marketDetailRange = "all";
let housingListingsOpen = false;
let propertyListingsOpen = false;
let storeLocationsOpen = false;
let activeStoreId = "";
let activeStoreProductId = "";
let cityMapOpen = false;
let activeCityView = "hq";
let activeScratchTicketId = "";
const scratchClaimsInFlight = new Set();

const MARKET_DETAIL_RANGES = [
  { id: "5m", label: "5M", seconds: 5 * 60 },
  { id: "30m", label: "30M", seconds: 30 * 60 },
  { id: "2h", label: "2H", seconds: 2 * 60 * 60 },
  { id: "1d", label: "1D", seconds: 24 * 60 * 60 },
  { id: "all", label: "ALL", seconds: 0 },
];

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
    lastStorePollAt = Date.now();
    hideError();
  } catch (error) {
    STATE = { user: null, admin: false, leaderboard: [], adminUsers: [], properties: null, store: null, city: null, businesses: null, casino: null, lottery: null };
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
  document.body.classList.toggle("gameReady", !!user);
  el("auth").classList.toggle("hidden", !!user);
  el("me").classList.toggle("hidden", !user);
  el("stats").classList.toggle("hidden", !user);
  el("timeWidget").classList.toggle("hidden", !user);
  el("lifePanel").classList.toggle("hidden", !user);
  el("propertyPanel").classList.toggle("hidden", !user);
  el("storePanel").classList.toggle("hidden", !user);
  el("businessPanel").classList.toggle("hidden", !user);
  el("marketPanel").classList.toggle("hidden", !user);
  el("casinoPanel").classList.toggle("hidden", !user);
  el("adminPanel").classList.toggle("hidden", !(user && user.isAdmin));
  el("gameNav").classList.toggle("hidden", !user);
  el("heroPrimaryButton").textContent = user ? "Enter city map" : "Start your empire";

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
  renderStore();
  renderBusinesses();
  renderMarket();
  renderMarketDetail();
  renderCity();
  renderMines();
  renderBlackjack();
  renderScratchTickets();
  renderLottery();
  renderCasinoRecent();
  renderClock();
  drawWheel();
}

function cityCountdown(seconds) {
  const left = Math.max(0, Number(seconds || 0) - Math.floor(Date.now() / 1000) - serverClockOffsetSeconds);
  const minutes = Math.floor(left / 60);
  return `${minutes}:${String(Math.floor(left % 60)).padStart(2, "0")}`;
}

function cityStoreOptions(selected = "") {
  return (STATE.city?.stores || []).map(store => `
    <option value="${esc(store.id)}" ${store.id === selected ? "selected" : ""}>${esc(store.name)}</option>
  `).join("");
}

function openCityMap() {
  if (!STATE.user) return;
  cityMapOpen = true;
  document.body.classList.add("cityOpen");
  renderCity();
}

function closeCityMap() {
  cityMapOpen = false;
  document.body.classList.remove("cityOpen");
  renderCity();
}

function heroPrimaryAction() {
  if (STATE.user) {
    openCityMap();
    return;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => el("username")?.focus(), 350);
}

function heroExplore() {
  if (STATE.user) {
    el("bankPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => el("username")?.focus(), 350);
}

function selectCityView(view) {
  activeCityView = view;
  renderCity();
}

async function cityAction(action, payload = {}) {
  try {
    const result = await api("/api/city", { action, ...payload });
    if (result.outcome?.caught) {
      const details = result.outcome.confiscated
        ? `${result.outcome.item} confiscated, fine ${result.outcome.fine}`
        : `${result.outcome.item} lost, fine ${result.outcome.fine}`;
      alert(`Police caught the deal. ${details}.`);
      log(`Police: ${details}`);
    } else if (result.outcome?.type === "deal") {
      log(`Night market: bought ${result.outcome.item}, saved ${result.outcome.saved}`);
    } else if (result.outcome?.type === "sale") {
      log(`Night market: sold ${result.outcome.item} for ${result.outcome.received}`);
    } else {
      log(`City: ${action}`);
    }
    if (result.city) STATE.city = result.city;
    if (result.store) STATE.store = result.store;
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

function cityHqView(city) {
  const stores = city.stores || [];
  return `
    <div class="cityViewHead"><small>CHAIN CONTROL</small><h3>${esc(city.profile.brandName)}</h3><p>Level ${city.profile.brandLevel} brand across ${stores.length} locations.</p></div>
    <div class="cityKpis">
      <span>Locations<b>${stores.length}</b></span>
      <span>Brand level<b>${city.profile.brandLevel}/10</b></span>
      <span>Insurance<b>${city.profile.insuranceUntil > Date.now() / 1000 ? cityCountdown(city.profile.insuranceUntil) : "Inactive"}</b></span>
    </div>
    <div class="cityControlRow">
      <input id="cityBrandName" value="${esc(city.profile.brandName)}" maxlength="28" aria-label="Brand name">
      <button onclick="cityAction('renameBrand',{name:el('cityBrandName').value})">Rename</button>
      <button onclick="cityAction('upgradeBrand')" ${city.profile.nextBrandCost === null ? "disabled" : ""}>Upgrade ${city.profile.nextBrandCost ?? "MAX"}</button>
    </div>
    <div class="citySectionTitle"><b>Competitive map</b><span>Rivals reduce traffic; campaigns push back.</span></div>
    <div class="cityList">${stores.length ? stores.map(store => `
      <article class="cityRow">
        <div><b>${esc(store.name)}</b><span>${esc(store.supplier.name)}</span></div>
        <div class="cityRival"><small>RIVAL</small><strong>${esc(store.competitor.name)}</strong><span>-${Math.round(store.competitor.strength * 100)}% traffic pressure</span></div>
        <div><small>CAMPAIGN</small><strong>${store.campaign ? esc(store.campaign.name) : "None"}</strong><span>${store.campaign ? `${cityCountdown(store.campaign.endsAt)} remaining` : "Start one at Supplier Row"}</span></div>
      </article>
    `).join("") : '<div class="cityEmpty">Buy a retail location on the main screen to build a chain.</div>'}</div>
  `;
}

function citySuppliersView(city) {
  return `
    <div class="cityViewHead"><small>SUPPLY STREET</small><h3>Contracts and Campaigns</h3><p>Each location can use a different supplier and advertising plan.</p></div>
    ${(city.stores || []).map(store => `
      <section class="cityStoreContract">
        <div class="citySectionTitle"><b>${esc(store.name)}</b><span>Current: ${esc(store.supplier.name)}</span></div>
        <div class="supplierGrid">${city.suppliers.map(supplier => `
          <button class="supplierChoice ${store.supplierId === supplier.id ? "active" : ""}" onclick="cityAction('setSupplier',{storeId:'${esc(store.id)}',supplierId:'${esc(supplier.id)}'})">
            <b>${esc(supplier.name)}</b><span>${Math.round(supplier.priceFactor * 100)}% price | ${supplier.freshness}% freshness</span><small>${esc(supplier.description)}</small>
          </button>
        `).join("")}</div>
        <div class="campaignStrip">${city.campaigns.map(campaign => `
          <button onclick="cityAction('startCampaign',{storeId:'${esc(store.id)}',campaignId:'${esc(campaign.id)}'})">
            <b>${esc(campaign.name)}</b><span>+${Math.round(campaign.trafficBonus * 100)}% | ${campaign.cost}</span>
          </button>
        `).join("")}</div>
      </section>
    `).join("") || '<div class="cityEmpty">No stores available.</div>'}
  `;
}

function cityVehiclesView(city) {
  const vehicle = city.vehicle;
  return `
    <div class="cityViewHead"><small>DELIVERY FLEET</small><h3>City Dealership</h3><p>Owned transport removes courier fees and moves larger warehouse loads.</p></div>
    ${vehicle ? `<div class="fleetStatus"><div><small>ACTIVE VEHICLE</small><b>${esc(vehicle.name)}</b></div><span>Fuel <b>${vehicle.fuel}/${vehicle.fuelCapacity}</b></span><span>Condition <b>${vehicle.condition}%</b></span><span>Cargo <b>${vehicle.cargo}</b></span></div>
      <div class="cityControlRow"><button onclick="cityAction('refuelVehicle')" ${vehicle.refuelCost < 1 ? "disabled" : ""}>Refuel ${vehicle.refuelCost}</button><button onclick="cityAction('repairVehicle')" ${vehicle.repairCost < 1 ? "disabled" : ""}>Repair ${vehicle.repairCost}</button></div>` : '<div class="cityEmpty">No vehicle. Couriers charge for every warehouse trip.</div>'}
    <div class="vehicleGrid">${city.vehicles.map(item => `
      <article class="vehicleCard ${item.owned ? "owned" : ""}">
        <div class="vehicleShape"><i></i><i></i><span>${item.id === "scooter" ? "S" : item.id === "cargo_van" ? "VAN" : "EV"}</span></div>
        <b>${esc(item.name)}</b><span>Cargo ${item.cargo} | Fuel ${item.fuelCapacity}</span>
        <button onclick="cityAction('buyVehicle',{vehicleId:'${item.id}'})" ${item.owned ? "disabled" : ""}>${item.owned ? "Active" : `Buy ${item.price}`}</button>
      </article>
    `).join("")}</div>
  `;
}

function cityWarehouseView(city) {
  const warehouse = city.warehouse;
  const productOptions = warehouse.products.map(product => `<option value="${product.id}">${esc(product.name)} (${product.wholesale})</option>`).join("");
  return `
    <div class="cityViewHead"><small>LOGISTICS</small><h3>${esc(warehouse.name)}</h3><p>${warehouse.used}/${warehouse.capacity} storage slots used.</p></div>
    <div class="warehouseMeter"><i style="width:${warehouse.capacity ? Math.min(100, warehouse.used / warehouse.capacity * 100) : 0}%"></i></div>
    <button class="cityWideAction" onclick="cityAction('upgradeWarehouse')" ${!warehouse.next ? "disabled" : ""}>${warehouse.next ? `Upgrade to ${esc(warehouse.next.name)} for ${warehouse.cost}` : "Warehouse maxed"}</button>
    ${warehouse.capacity ? `
      <div class="citySectionTitle"><b>Inbound order</b><span>Supplier freshness applies to the full batch.</span></div>
      <div class="cityControlRow warehouseOrder">
        <select id="warehouseProduct">${productOptions}</select>
        <select id="warehouseSupplier">${city.suppliers.map(item => `<option value="${item.id}">${esc(item.name)}</option>`).join("")}</select>
        <input id="warehouseQty" type="number" value="20" min="1" max="500" aria-label="Quantity">
        <button onclick="cityAction('buyWarehouseStock',{productId:el('warehouseProduct').value,supplierId:el('warehouseSupplier').value,quantity:Number(el('warehouseQty').value)})">Order</button>
      </div>
      <div class="citySectionTitle"><b>Warehouse inventory</b><span>Send goods to any unlocked store fixture.</span></div>
      <div class="cityList">${warehouse.stock.length ? warehouse.stock.map(item => `
        <article class="warehouseRow">
          <div><b>${esc(item.name)}</b><span>${item.quantity} units | ${item.freshness}% fresh</span></div>
          <select id="transferStore-${esc(item.productId)}">${cityStoreOptions()}</select>
          <input id="transferQty-${esc(item.productId)}" type="number" value="5" min="1" max="${item.quantity}" aria-label="Transfer quantity">
          <button onclick="cityAction('transferWarehouseStock',{storeId:el('transferStore-${esc(item.productId)}').value,productId:'${esc(item.productId)}',quantity:Number(el('transferQty-${esc(item.productId)}').value)})" ${(city.stores || []).length ? "" : "disabled"}>Deliver</button>
        </article>
      `).join("") : '<div class="cityEmpty">The warehouse is empty.</div>'}</div>
    ` : ""}
  `;
}

function cityAuctionView(city) {
  return `
    <div class="cityViewHead"><small>LIVE PROPERTY SALES</small><h3>Auction House</h3><p>Your bid is held until another player outbids you or the auction settles.</p></div>
    <div class="auctionGrid">${city.auctions.map(auction => `
      <article class="auctionCard ${auction.leading ? "leading" : ""}">
        <div class="auctionClock">${cityCountdown(auction.endsAt)}</div>
        <small>ROUND ${auction.round}</small><h4>${esc(auction.property?.name || "Property")}</h4>
        <p>${esc(auction.property?.area || "City")}, floor ${auction.property?.floor || 1}</p>
        <span>Current bid <b>${auction.currentBid}</b></span>
        <input id="bid-${esc(auction.id)}" type="number" value="${auction.minimumBid}" min="${auction.minimumBid}" aria-label="Bid amount">
        <button onclick="cityAction('auctionBid',{auctionId:'${esc(auction.id)}',amount:Number(el('bid-${esc(auction.id)}').value)})">${auction.leading ? "Raise bid" : "Place bid"}</button>
      </article>
    `).join("")}</div>
  `;
}

function cityBlackMarketView(city) {
  const market = city.blackMarket;
  return `
    <div class="cityViewHead night"><small>UNLICENSED TRADING</small><h3>Underground Exchange</h3><p>Discounted valuables with no paperwork. Stock rotates in ${cityCountdown(market.endsAt)}.</p></div>
    <div class="policeHeat ${market.heat >= 60 ? "danger" : market.heat >= 30 ? "warm" : ""}">
      <div><small>POLICE ATTENTION</small><b>${market.heat}/100</b><span>${market.heat ? "Risk cools by 1 point each minute" : "No active attention"}</span></div>
      <div class="policeHeatTrack"><i style="width:${market.heat}%"></i></div>
    </div>
    <div class="blackMarketGrid">${market.offers.map(item => `
      <article class="blackOffer ${item.kind}">
        <div class="contrabandMark">${esc(item.code || "ITEM")}</div>
        <small>${item.remaining} LEFT</small><b>${esc(item.name)}</b><p>${esc(item.description)}</p>
        <div class="contrabandPrices"><span>Official <s>${item.legalPrice}</s></span><strong>${item.price}</strong><em>-${item.discount}%</em></div>
        <div class="dealRisk"><span>Police risk</span><b>${Math.round(item.currentRisk * 100)}%</b></div>
        <button onclick="cityAction('blackMarketBuy',{itemId:'${item.id}'})" ${item.remaining < 1 ? "disabled" : ""}>Buy discreetly</button>
      </article>
    `).join("")}</div>
    <div class="citySectionTitle"><b>Safe inventory</b><span>Valuables can be fenced for profit, with another police check.</span></div>
    <div class="cityList">${market.inventory.length ? market.inventory.map(item => `
      <article class="inventoryRow"><div><b>${esc(item.name || item.id)}</b><span>Quantity ${item.quantity}</span></div>
      ${item.kind === "valuable" ? `<span class="fenceValue">Fence value <b>${item.resaleValue}</b></span>` : (["repair_kit", "camera_kit"].includes(item.id) ? `<select id="itemStore-${item.id}">${cityStoreOptions()}</select>` : "")}
      <button onclick="cityAction('${item.kind === "valuable" ? "sellContraband" : "useBlackMarketItem"}',{itemId:'${item.id}',storeId:el('itemStore-${item.id}')?.value||''})">${item.kind === "valuable" ? "Sell to fence" : "Use"}</button></article>
    `).join("") : '<div class="cityEmpty">No items in street inventory.</div>'}</div>
  `;
}

function cityNewsView(city) {
  const news = city.news;
  const productNames = news.products.map(id => city.warehouse.products.find(item => item.id === id)?.name || id);
  return `
    <div class="cityViewHead"><small>LIVE CITY FEED</small><h3>${esc(news.title)}</h3><p>${esc(news.description)}</p></div>
    <div class="newsBroadcast"><div class="newsSignal">LIVE</div><strong>${Math.round(news.multiplier * 100)}%</strong><span>${productNames.length ? `Demand for ${esc(productNames.join(", "))}` : "Normal demand across all categories"}</span><small>Next bulletin in ${cityCountdown(news.endsAt)}</small></div>
    <div class="citySectionTitle"><b>Business effect</b><span>News changes which stocked products customers choose.</span></div>
    <div class="cityList">${(city.stores || []).map(store => `<article class="cityRow"><div><b>${esc(store.name)}</b><span>${productNames.length ? "Stock the trending products to benefit" : "No special category today"}</span></div><strong>${store.campaign ? `Campaign +${Math.round(store.campaign.trafficBonus * 100)}%` : "No campaign"}</strong></article>`).join("")}</div>
  `;
}

function renderCity() {
  const overlay = el("cityOverlay");
  const body = el("cityPanelBody");
  if (!overlay || !body) return;
  overlay.classList.toggle("hidden", !cityMapOpen || !STATE.user);
  if (!cityMapOpen || !STATE.user) return;
  const city = STATE.city;
  if (!city) {
    body.innerHTML = '<div class="cityEmpty">Loading city...</div>';
    return;
  }
  el("cityWallet").textContent = `Wallet ${STATE.user.wallet}`;
  el("cityTicker").innerHTML = `<b>LIVE</b> ${esc(city.news.title)} <span>${esc(city.news.description)}</span>`;
  const titles = { hq: "Chain HQ", suppliers: "Supplier Row", vehicles: "Dealership", warehouse: "Warehouse", auction: "Auction House", blackmarket: "Underground Exchange", news: "City News" };
  el("cityTitle").textContent = titles[activeCityView] || "City Map";
  const views = {
    hq: cityHqView,
    suppliers: citySuppliersView,
    vehicles: cityVehiclesView,
    warehouse: cityWarehouseView,
    auction: cityAuctionView,
    blackmarket: cityBlackMarketView,
    news: cityNewsView,
  };
  body.innerHTML = (views[activeCityView] || cityHqView)(city);
  document.querySelectorAll(".cityBuilding").forEach(button => {
    button.classList.toggle("active", button.getAttribute("onclick")?.includes(`'${activeCityView}'`));
  });
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
        <div class="conditionTrack" title="Apartment condition">
          <i style="width:${item.condition}%"></i>
        </div>
        <small>Condition ${item.condition}/100${item.condition < 20 ? " | repair required" : ""}</small>
      </div>
      <div>
        <strong>${item.rentedOut ? `+${item.effectiveIncome}/day` : "Idle"}</strong>
        <small>${item.rentedOut ? "Rented out" : "Not rented"}</small>
      </div>
      <div class="propertyManageActions">
        <button class="secondary" onclick="propertyAction('toggleRentOut','${esc(item.propertyId)}','${esc(item.id)}')"
          ${!item.rentedOut && item.condition < 20 ? "disabled" : ""}>
          ${item.rentedOut ? "Stop rent" : "Rent out"}
        </button>
        <button onclick="propertyAction('repair','${esc(item.propertyId)}','${esc(item.id)}')"
          ${item.repairCost < 1 || STATE.user.wallet < item.repairCost ? "disabled" : ""}>
          ${item.repairCost < 1 ? "Repaired" : `Repair ${item.repairCost}`}
        </button>
      </div>
    </div>
  `).join("") : `<div class="propertyEmpty">No owned apartments</div>`;
}

function renderBusinesses() {
  const panel = el("businessPanel");
  if (!panel || !STATE.user) return;
  const businesses = STATE.businesses || { catalog: [], owned: [], totalNetPerDay: 0, totalAccrued: 0 };
  el("businessOwned").textContent = businesses.owned?.length || 0;
  el("businessIncome").textContent = businesses.totalNetPerDay || 0;
  el("businessAccrued").textContent = businesses.totalAccrued || 0;
  el("businessCatalog").innerHTML = (businesses.catalog || []).map(item => {
    const locked = Number(STATE.user.rating || 0) < Number(item.rating || 0);
    if (!item.owned) return `
      <article class="businessCard ${locked ? "locked" : ""}">
        <div class="businessBadge">${esc(item.badge)}</div>
        <div class="businessCardHead"><div><span>AVAILABLE BUSINESS</span><h3>${esc(item.name)}</h3></div><strong>${item.price}</strong></div>
        <p>${esc(item.description)}</p>
        <div class="businessMetrics">
          <span>Gross/day<b>${item.income}</b></span>
          <span>Upkeep/day<b>-${item.upkeep}</b></span>
          <span>Rating<b>${item.rating}</b></span>
        </div>
        <button onclick="businessAction('buy','${esc(item.id)}')" ${locked || STATE.user.wallet < item.price ? "disabled" : ""}>
          ${locked ? `Rating ${item.rating} required` : `Buy for ${item.price}`}
        </button>
      </article>
    `;
    return `
      <article class="businessCard owned">
        <div class="businessBadge">${esc(item.badge)}</div>
        <div class="businessCardHead"><div><span>OWNED · LEVEL ${item.level}</span><h3>${esc(item.businessName || item.name)}</h3></div><strong>+${item.netIncome}/day</strong></div>
        <p>${esc(item.description)}</p>
        <div class="businessMetrics">
          <span>Gross/day<b>${item.income}</b></span>
          <span>Upkeep/day<b>-${item.upkeep}</b></span>
          <span>Ready<b>${item.accrued}</b></span>
        </div>
        <div class="businessActions">
          <button onclick="businessAction('collect','${esc(item.id)}')" ${item.accrued < 1 ? "disabled" : ""}>Collect ${item.accrued || "later"}</button>
          <button class="secondary" onclick="businessAction('upgrade','${esc(item.id)}')" ${!item.upgradeCost || STATE.user.wallet + item.accrued < item.upgradeCost ? "disabled" : ""}>
            ${item.upgradeCost ? `Upgrade ${item.upgradeCost}` : "Max level"}
          </button>
        </div>
      </article>
    `;
  }).join("");
}

async function businessAction(action, businessType) {
  try {
    const result = await api("/api/business", { action, businessType });
    if (result.businesses) STATE.businesses = result.businesses;
    log(`Business: ${action} ${businessType}`);
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

function storePremisesCards(listings) {
  return `<div class="storePremisesGrid">
    ${(listings || []).map(premises => `
      <div class="storePremises ${premises.owned ? "owned" : ""}">
        <div class="storePremisesTop">
          <span>${esc(premises.area)}</span>
          <b>${premises.price}</b>
        </div>
        <h3>${esc(premises.name)}</h3>
        <p>${esc(premises.description)}</p>
        <div class="storePremisesStats">
          <span>Capacity <b>${premises.capacity}</b></span>
          <span>Traffic <b>${Math.round(premises.traffic * 100)}</b></span>
          <span>Prestige <b>${premises.prestige}</b></span>
        </div>
        <button onclick="buyStorePremises('${esc(premises.id)}')"
          ${premises.owned || STATE.user.wallet < premises.price ? "disabled" : ""}>
          ${premises.owned ? "Location owned" : STATE.user.wallet >= premises.price ? "Buy premises" : `Need ${premises.price}`}
        </button>
      </div>
    `).join("")}
  </div>`;
}

function renderStore() {
  const panel = el("storePanel");
  const content = el("storeContent");
  if (!STATE.user || !panel || !content) return;
  const storePortfolio = STATE.store || { owned: false, stores: [], premisesListings: [] };

  if (!storePortfolio.owned) {
    content.innerHTML = `
      <div class="storeLaunch">
        <div class="storefrontPreview">
          <div class="storeAwning"><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <b>YOUR STORE</b>
          <div class="storeWindows"><span></span><span></span><em></em></div>
        </div>
        <div>
          <span class="storeEyebrow">NEW BUSINESS</span>
          <h3>Choose premises</h3>
          <p>Four retail units are currently listed.</p>
        </div>
      </div>
      ${storePremisesCards(storePortfolio.premisesListings)}
    `;
    return;
  }

  const stores = Array.isArray(storePortfolio.stores) && storePortfolio.stores.length
    ? storePortfolio.stores
    : [storePortfolio];
  if (!stores.some(item => item.id === activeStoreId)) activeStoreId = stores[0].id;
  const store = stores.find(item => item.id === activeStoreId) || stores[0];

  const status = ({
    open: { label: "OPEN", detail: "Customers are shopping" },
    setup: { label: "SETUP", detail: "Install shelves or a refrigerator" },
    out_of_stock: { label: "EMPTY", detail: "Restock products to open" },
    maintenance: { label: "REPAIR", detail: "The store is too worn to serve customers" },
  })[store.status] || { label: "CLOSED", detail: "Store unavailable" };
  const equipment = Array.isArray(store.equipment) ? store.equipment : [];
  const products = Array.isArray(store.products) ? store.products : [];
  const sales = Array.isArray(store.recentSales) ? store.recentSales : [];
  const staff = Array.isArray(store.staff) ? store.staff : [];
  const incident = store.incident || null;
  const incidentHistory = Array.isArray(store.incidentHistory) ? store.incidentHistory : [];
  const empire = storePortfolio.empire || {};
  const shelfLevel = Number(equipment.find(item => item.id === "shelves")?.level || 0);
  const fridgeLevel = Number(equipment.find(item => item.id === "fridges")?.level || 0);
  const checkoutLevel = Number(equipment.find(item => item.id === "checkouts")?.level || 0);
  const stockColors = products.filter(product => product.stock > 0).map(product => product.color);
  const displayColors = stockColors.length ? stockColors : ["empty"];
  const sceneShelves = Array.from({ length: Math.max(1, Math.min(4, shelfLevel)) }, (_, index) => `
    <div class="visualShelf ${shelfLevel ? "built" : "ghost"}">
      <span></span>
      <i class="${esc(displayColors[index % displayColors.length])}"></i>
      <i class="${esc(displayColors[(index + 1) % displayColors.length])}"></i>
      <i class="${esc(displayColors[(index + 2) % displayColors.length])}"></i>
    </div>
  `).join("");
  const sceneFridges = Array.from({ length: Math.min(3, fridgeLevel) }, (_, index) => `
    <div class="visualFridge"><i></i><i></i><span>${index + 1}</span></div>
  `).join("");
  const customers = store.status === "open"
    ? Array.from({ length: Math.min(5, 2 + Number(store.premises.prestige || 0)) }, (_, index) => `<i style="--customer:${index}"></i>`).join("")
    : "";
  const sceneProducts = products.filter(product => product.stock > 0).slice(0, 8).map((product, index) => `
    <button type="button" class="sceneProduct ${esc(product.color)}" style="--col:${index % 4};--row:${Math.floor(index / 4)}"
      title="${esc(product.name)}: ${product.stock} in stock" onclick="focusStoreProduct('${esc(product.id)}')">
      <span>${esc(product.name)}</span><b>${product.stock}</b>
    </button>
  `).join("");
  const sceneStaff = staff.filter(role => role.level > 0).map((role, index) => `
    <button type="button" class="storeEmployee" style="--employee:${index}" title="${esc(role.name)} level ${role.level}"
      onclick="focusStoreStaff('${esc(role.id)}')">
      <i>${esc(role.badge)}</i><span>${role.level}</span>
    </button>
  `).join("");

  content.innerHTML = `
    <div class="storePortfolioBar">
      <div class="storeTabs" role="tablist" aria-label="Owned stores">
        ${stores.map(item => `
          <button type="button" role="tab" aria-selected="${item.id === store.id}"
            class="${item.id === store.id ? "active" : ""}" onclick="selectStore('${esc(item.id)}')">
            <b>${esc(item.name)}</b><span>${esc(item.premises.area)}</span>
          </button>
        `).join("")}
      </div>
      <button class="secondary storeAddLocation" onclick="toggleStoreLocations()">
        ${storeLocationsOpen ? "Hide locations" : `Add location ${stores.length}/${storePortfolio.maxStores || 4}`}
      </button>
    </div>
    ${storeLocationsOpen ? storePremisesCards(storePortfolio.premisesListings) : ""}

    <div class="storeEmpireStrip">
      <span><small>EMPIRE</small><b>${empire.locations || stores.length} locations</b></span>
      <span><small>TEAM</small><b>${empire.staff || 0} staff levels</b></span>
      <span><small>TODAY</small><b>+${empire.todayRevenue || 0}</b></span>
      <span><small>ALL REVENUE</small><b>${empire.lifetimeRevenue || 0}</b></span>
      <span class="${empire.activeIncidents ? "alert" : ""}"><small>INCIDENTS</small><b>${empire.activeIncidents || 0} active</b></span>
    </div>

    ${incident ? `
      <section class="storeIncident ${esc(incident.tone)}">
        <div class="incidentSignal"><i></i><span>LIVE STORE EVENT</span></div>
        <div class="incidentBody">
          <div>
            <h3>${esc(incident.title)}</h3>
            <p>${esc(incident.description)}</p>
          </div>
          <div class="incidentChoices">
            ${incident.choices.map(choice => `
              <button type="button" onclick="resolveStoreIncident('${esc(store.id)}','${esc(incident.id)}','${esc(choice.id)}')"
                ${choice.locked || STATE.user.wallet < choice.cost ? "disabled" : ""}>
                <b>${esc(choice.label)}</b>
                <span>${choice.locked ? `Needs ${esc(choice.requires)}` : esc(choice.detail)}</span>
              </button>
            `).join("")}
          </div>
        </div>
      </section>
    ` : ""}

    <div class="storeHeader">
      <div>
        <span class="storeEyebrow">${esc(store.premises.area)} / ${esc(store.premises.name)}</span>
        <h3>${esc(store.name)}</h3>
        <small>${status.detail}</small>
      </div>
      <span class="storeStatus ${esc(store.status)}"><i></i>${status.label}</span>
    </div>

    <div class="storeMetrics">
      <span>Today <b>+${store.todayRevenue}</b></span>
      <span>Lifetime <b>${store.lifetimeRevenue}</b></span>
      <span>Customers <b>${store.customersServed}</b></span>
      <span>Reputation <b>${store.reputation}/100</b></span>
      <span>Projected/hour <b>+${store.projectedHourlyProfit}</b></span>
      <span>Storage <b>${store.stockUsed}/${store.capacity}</b></span>
      <span>Condition <b>${store.condition}/100</b></span>
    </div>

    <div class="storeWorkspace">
      <div class="storeScene ${esc(store.status)}">
        <div class="storeSceneSign"><span>${esc(store.name)}</span><small>${status.label}</small></div>
        <div class="storeSceneFloor">
          <div class="storeAisles">${sceneShelves}</div>
          <div class="storeCold">${sceneFridges}</div>
          <div class="storeSceneProducts">${sceneProducts}</div>
          <div class="storeEmployees">${sceneStaff}</div>
          <div class="visualCheckout ${checkoutLevel ? "upgraded" : ""}"><span></span><i>${checkoutLevel}</i></div>
          <div class="storeCustomers">${customers}</div>
        </div>
      </div>

      <div class="storeControls">
        <div class="storeControlBlock">
          <label for="storeName">Store name</label>
          <div class="storeNameControl">
            <input id="storeName" value="${esc(store.name)}" maxlength="28">
            <button class="secondary" onclick="renameStore('${esc(store.id)}')">Save</button>
          </div>
        </div>
        <div class="storeControlBlock">
          <label>Pricing</label>
          <div class="storeMarkup">
            ${(store.markupOptions || []).map(option => `
              <button class="${Number(option.value) === Number(store.markup) ? "active" : ""}"
                onclick="setStoreMarkup('${esc(store.id)}',${Number(option.value)})">${esc(option.label)}</button>
            `).join("")}
          </div>
          <small>${esc(store.markupLabel)} price tier</small>
        </div>
        <div class="storeControlBlock maintenanceControl ${store.condition <= 30 ? "urgent" : ""}">
          <label>Building condition</label>
          <div class="conditionTrack"><i style="width:${store.condition}%"></i></div>
          <small>${store.condition > 70 ? "Good condition" : store.condition > 10 ? "Wear is reducing customer traffic" : "Closed until repaired"}</small>
          <button onclick="repairStore('${esc(store.id)}')"
            ${store.repairCost < 1 || STATE.user.wallet < store.repairCost ? "disabled" : ""}>
            ${store.repairCost < 1 ? "No repairs needed" : `Repair for ${store.repairCost}`}
          </button>
        </div>
      </div>
    </div>

    <div class="storeSectionHead">
      <div><span>OPERATIONS TEAM</span><h3>Staff</h3></div>
      <small>${store.staffCount || 0} total staff levels in this location</small>
    </div>
    <div class="storeStaffGrid">
      ${staff.map(role => `
        <div id="storeStaff_${esc(role.id)}" class="storeStaff ${role.level ? "hired" : ""}">
          <div class="staffPortrait"><i>${esc(role.badge)}</i><span>${role.level ? `L${role.level}` : "OPEN"}</span></div>
          <div class="staffCopy">
            <b>${esc(role.name)}</b>
            <p>${esc(role.description)}</p>
            <div class="storeLevelTrack">${Array.from({ length: role.maxLevel }, (_, index) => `<i class="${index < role.level ? "filled" : ""}"></i>`).join("")}</div>
          </div>
          <button onclick="hireStoreStaff('${esc(store.id)}','${esc(role.id)}')"
            ${role.maxed || STATE.user.wallet < role.nextCost ? "disabled" : ""}>
            ${role.maxed ? "Team maxed" : role.level ? `Train ${role.nextCost}` : `Hire ${role.nextCost}`}
          </button>
        </div>
      `).join("")}
    </div>
    <div class="incidentLedger">
      <b>Incident log</b>
      ${incidentHistory.length ? incidentHistory.map(item => `
        <span><strong>${esc(item.title)}</strong><em>${esc(item.choice)}</em><small>${formatDate(item.resolvedAt)}</small></span>
      `).join("") : `<span class="empty">No resolved store events</span>`}
    </div>

    <div class="storeSectionHead">
      <div><span>FIT OUT</span><h3>Equipment</h3></div>
      <small>${equipment.reduce((sum, item) => sum + item.level, 0)} upgrades installed</small>
    </div>
    <div class="storeEquipmentGrid">
      ${equipment.map(item => `
        <div class="storeEquipment ${item.maxed ? "maxed" : ""}">
          <div>
            <span>${esc(item.name)}</span>
            <b>Level ${item.level}/${item.maxLevel}</b>
          </div>
          <div class="storeLevelTrack">${Array.from({ length: item.maxLevel }, (_, index) => `<i class="${index < item.level ? "filled" : ""}"></i>`).join("")}</div>
          <p>${item.capacity ? `Storage capacity +${item.capacity} per level` : "Customer traffic upgrade"}</p>
          <button onclick="buyStoreEquipment('${esc(store.id)}','${esc(item.id)}')" ${item.maxed || STATE.user.wallet < item.nextCost ? "disabled" : ""}>
            ${item.maxed ? "Max level" : `Upgrade ${item.nextCost}`}
          </button>
        </div>
      `).join("")}
    </div>

    <div class="storeSectionHead">
      <div><span>SUPPLIERS</span><h3>Products</h3></div>
      <small>${Math.max(0, store.capacity - store.stockUsed)} storage slots free</small>
    </div>
    <div class="storeProductGrid">
      ${products.map(product => `
        <div id="storeProduct_${esc(product.id)}" class="storeProduct ${esc(product.color)} ${product.unlocked ? "" : "locked"} ${activeStoreProductId === product.id ? "selected" : ""}">
          <div class="storeProductBand"></div>
          <div class="storeProductTop">
            <div><b>${esc(product.name)}</b><span>${product.fixture} L${product.fixtureLevel}</span></div>
            <strong>${product.stock}</strong>
          </div>
          <div class="storeProductPrices">
            <span>Buy <b>${product.wholesale}</b></span>
            <span>Sell <b>${product.salePrice}</b></span>
            <span>Profit <b>+${product.unitProfit}</b></span>
          </div>
          <div class="freshnessLabel"><span>Freshness</span><b>${product.stock ? product.freshness : "-"}${product.stock ? "%" : ""}</b></div>
          <div class="freshnessBar"><i style="width:${product.stock ? product.freshness : 0}%"></i></div>
          <div class="storeRestock">
            <input id="storeQty_${esc(product.id)}" type="number" value="10" min="1" max="100">
            <button onclick="restockStore('${esc(store.id)}','${esc(product.id)}')" ${product.unlocked ? "" : "disabled"}>
              ${product.unlocked ? "Order stock" : "Locked"}
            </button>
          </div>
        </div>
      `).join("")}
    </div>

    <div class="storeSectionHead">
      <div><span>REGISTER</span><h3>Recent sales</h3></div>
      <small>Last 12 transactions</small>
    </div>
    <div class="storeSales">
      ${sales.length ? sales.map(sale => `
        <div class="storeSaleRow">
          <span>${esc(sale.productName)}</span>
          <span>${sale.quantity} sold at ${sale.unitPrice}</span>
          <b>+${sale.revenue}</b>
          <small>${formatDate(sale.createdAt)}</small>
        </div>
      `).join("") : `<div class="storeSaleEmpty">No sales yet</div>`}
    </div>
  `;
}

async function runStoreAction(payload, successMessage) {
  try {
    const result = await api("/api/store", payload);
    log(successMessage(result));
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

function buyStorePremises(premisesId) {
  return runStoreAction(
    { action: "buyPremises", premisesId },
    result => {
      activeStoreId = result.storeId;
      storeLocationsOpen = false;
      return `Store premises bought: ${result.location?.premises?.name || "new location"}`;
    },
  );
}

function selectStore(storeId) {
  activeStoreId = storeId;
  activeStoreProductId = "";
  renderStore();
}

function toggleStoreLocations() {
  storeLocationsOpen = !storeLocationsOpen;
  renderStore();
}

function focusStoreProduct(productId) {
  activeStoreProductId = productId;
  renderStore();
  requestAnimationFrame(() => {
    const card = el(`storeProduct_${productId}`);
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
    card?.querySelector("input")?.focus({ preventScroll: true });
  });
}

function focusStoreStaff(roleId) {
  const card = el(`storeStaff_${roleId}`);
  card?.scrollIntoView({ behavior: "smooth", block: "center" });
  card?.animate([
    { boxShadow: "0 0 0 0 rgba(215,173,85,0)" },
    { boxShadow: "0 0 0 3px rgba(215,173,85,.55)" },
    { boxShadow: "0 0 0 0 rgba(215,173,85,0)" },
  ], { duration: 900 });
}

function hireStoreStaff(storeId, roleId) {
  return runStoreAction(
    { action: "hireStaff", storeId, roleId },
    result => `${result.roleId} staff upgraded to level ${result.level} for ${result.cost}`,
  );
}

function resolveStoreIncident(storeId, incidentId, choiceId) {
  return runStoreAction(
    { action: "resolveIncident", storeId, incidentId, choiceId },
    result => `${result.outcome.title}: ${result.outcome.choice}${result.outcome.walletDelta ? ` (${result.outcome.walletDelta > 0 ? "+" : ""}${result.outcome.walletDelta})` : ""}`,
  );
}

function buyStoreEquipment(storeId, equipmentId) {
  return runStoreAction(
    { action: "buyEquipment", storeId, equipmentId },
    result => `Store equipment upgraded for ${result.cost}`,
  );
}

function restockStore(storeId, productId) {
  const quantity = Math.max(1, Number(el(`storeQty_${productId}`)?.value || 1));
  return runStoreAction(
    { action: "restock", storeId, productId, quantity },
    result => `Store stock: ${result.quantity} ${result.productId} for ${result.cost}`,
  );
}

function setStoreMarkup(storeId, markup) {
  return runStoreAction(
    { action: "setMarkup", storeId, markup },
    () => "Store pricing updated",
  );
}

function renameStore(storeId) {
  return runStoreAction(
    { action: "rename", storeId, name: el("storeName")?.value || "" },
    result => `Store renamed to ${result.name}`,
  );
}

function repairStore(storeId) {
  return runStoreAction(
    { action: "repair", storeId },
    result => result.cost ? `Store repaired for ${result.cost}` : "Store needs no repairs",
  );
}

function maybePollStore() {
  if (!STATE.user || !STATE.store?.owned || storeRefreshQueued) return;
  const now = Date.now();
  if (now - lastStorePollAt < 30000) return;
  storeRefreshQueued = true;
  loadState().finally(() => { storeRefreshQueued = false; });
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

function marketRangeHistory(history, rangeId = marketDetailRange) {
  const points = marketHistoryPoints(history)
    .sort((left, right) => left.recordedAt - right.recordedAt);
  const range = MARKET_DETAIL_RANGES.find(item => item.id === rangeId) || MARKET_DETAIL_RANGES.at(-1);
  if (!range.seconds || points.length < 2) return points;

  const cutoff = points.at(-1).recordedAt - range.seconds;
  const firstVisible = points.findIndex(point => point.recordedAt >= cutoff);
  if (firstVisible <= 0) return points;

  return [
    { price: points[firstVisible - 1].price, recordedAt: cutoff },
    ...points.slice(firstVisible),
  ];
}

function setMarketDetailRange(rangeId) {
  if (!MARKET_DETAIL_RANGES.some(range => range.id === rangeId)) return;
  marketDetailRange = rangeId;
  renderMarketDetail();
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
  const visibleHistory = marketRangeHistory(asset.history);
  const visibleStart = visibleHistory[0]?.recordedAt;
  const visibleEnd = visibleHistory.at(-1)?.recordedAt;
  const visibleTrades = (asset.trades || []).filter(trade => (
    (!Number.isFinite(visibleStart) || trade.createdAt >= visibleStart)
    && (!Number.isFinite(visibleEnd) || trade.createdAt <= visibleEnd)
  ));
  const chartAsset = { ...asset, history: visibleHistory, trades: visibleTrades };
  const activeRange = MARKET_DETAIL_RANGES.find(range => range.id === marketDetailRange) || MARKET_DETAIL_RANGES.at(-1);
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
    <div class="marketRangePicker" role="group" aria-label="Chart period">
      ${MARKET_DETAIL_RANGES.map(range => `
        <button type="button" class="${range.id === activeRange.id ? "active" : ""}"
          aria-pressed="${range.id === activeRange.id}"
          onclick="setMarketDetailRange('${range.id}')">${range.label}</button>
      `).join("")}
    </div>
    <div class="marketDetailChartBox">${marketDetailChart(chartAsset)}</div>
    <div class="marketDetailRange">
      <span>${formatDate(visibleStart)}</span>
      <span>${activeRange.id === "all" ? "All time" : `Last ${activeRange.label}`}</span>
      <span>${formatDate(visibleEnd)}</span>
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

async function dice() {
  try {
    const amount = Number(el("diceAmount").value);
    const number = Number(el("diceNumber").value);
    el("diceVisual").classList.add("rolling");
    el("diceMsg").textContent = "Rolling";
    const result = await api("/api/casino/dice", { amount, number });
    setTimeout(async () => {
      el("diceVisual").textContent = result.result;
      el("diceVisual").classList.remove("rolling");
      el("diceMsg").textContent = result.win ? `Exact roll · +${result.win}` : `Rolled ${result.result} · -${amount}`;
      await loadState();
    }, 650);
  } catch (error) {
    el("diceVisual").classList.remove("rolling");
    alert(error.message);
  }
}

async function crash() {
  try {
    const amount = Number(el("crashAmount").value);
    const target = Number(el("crashTarget").value);
    const result = await api("/api/casino/crash", { amount, target });
    const rocket = el("crashRocket");
    const display = el("crashMultiplier");
    rocket.classList.remove("launched");
    void rocket.offsetWidth;
    rocket.style.setProperty("--crash-progress", `${Math.min(100, result.crashPoint / 10 * 100)}%`);
    rocket.classList.add("launched");
    display.textContent = `${result.crashPoint.toFixed(2)}x`;
    display.classList.toggle("win", result.won);
    el("crashMsg").textContent = result.won
      ? `Cashed out at ${result.target.toFixed(2)}x · +${result.win}`
      : `Crashed before ${result.target.toFixed(2)}x · -${amount}`;
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

async function fortuneWheel() {
  const button = el("fortuneButton");
  try {
    button.disabled = true;
    const amount = Number(el("fortuneAmount").value);
    const result = await api("/api/casino/wheel", { amount });
    const segmentSize = 360 / 9;
    fortuneRotation += 1080 + (9 - result.segmentIndex) * segmentSize;
    el("fortuneWheel").style.transform = `rotate(${fortuneRotation}deg)`;
    el("fortuneMsg").textContent = "Spinning";
    setTimeout(async () => {
      el("fortuneMsg").textContent = result.win ? `${result.label} · +${result.win}` : `${result.label} · -${amount}`;
      button.disabled = false;
      await loadState();
    }, 1900);
  } catch (error) {
    button.disabled = false;
    alert(error.message);
  }
}

function renderMines(gameOverride = undefined) {
  const board = el("minesBoard");
  if (!board) return;
  const game = gameOverride === undefined ? STATE.casino?.mines : gameOverride;
  const active = game?.status === "active";
  const prizeMode = game?.mode === "prize_tiles";
  const tiles = Array.isArray(game?.tiles) ? game.tiles : [];
  const revealed = new Set(game?.revealed || []);
  const selectedPosition = Number.isInteger(game?.revealed?.[0]) ? game.revealed[0] : -1;
  board.innerHTML = Array.from({ length: game?.gridSize || 25 }, (_, index) => `
    <button class="mineTile ${tiles[index] ? "revealed" : ""} ${index === selectedPosition ? "selected" : ""} ${tiles[index] ? (tiles[index].loss ? "mineHit" : Number(tiles[index].multiplier) > 1 ? "tileWin" : "tileLow") : ""}" onclick="minesReveal(${index})" ${!active || (!prizeMode && revealed.has(index)) ? "disabled" : ""}>
      ${tiles[index] ? (tiles[index].loss ? "✹" : esc(tiles[index].label)) : (!prizeMode && revealed.has(index) ? "◆" : "")}
    </button>
  `).join("");
  el("minesStartButton").disabled = active;
  const cashoutButton = el("minesCashoutButton");
  const legacyMode = game?.mode === "legacy";
  cashoutButton.classList.toggle("hidden", !legacyMode);
  cashoutButton.disabled = !active || revealed.size < Number(game?.minimumReveals || 2);
  el("minesAmount").disabled = active;
  if (!game) {
    el("minesStatus").textContent = "Start a game and choose one tile";
    el("minesMultiplier").textContent = "—";
  } else if (prizeMode && active) {
    el("minesStatus").textContent = "Choose one hidden tile";
    el("minesMultiplier").textContent = "?";
  } else if (prizeMode && game.result) {
    el("minesStatus").textContent = game.result.loss
      ? "Mine · bet lost"
      : `${game.result.label} · payout ${game.payout}`;
    el("minesMultiplier").textContent = game.result.label;
  } else {
    const minimumReveals = Number(game?.minimumReveals || 2);
    el("minesStatus").textContent = `${game.status.replaceAll("_", " ")} · ${game.mines} mines · ${Math.min(revealed.size, minimumReveals)}/${minimumReveals} safe tiles · cash out ${game.cashout}`;
    el("minesMultiplier").textContent = `${Number(game?.multiplier || 1).toFixed(2)}x`;
  }
}

async function minesStart() {
  try {
    const result = await api("/api/casino/mines", {
      action: "start",
      amount: Number(el("minesAmount").value),
    });
    STATE.casino = { ...(STATE.casino || {}), mines: result.game };
    renderMines();
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

async function minesReveal(position) {
  try {
    const result = await api("/api/casino/mines", { action: "reveal", position });
    STATE.casino = { ...(STATE.casino || {}), mines: result.game };
    renderMines();
    if (result.game?.mode === "prize_tiles") {
      log(result.outcome?.loss
        ? "Mines: losing tile"
        : `Mines: ${result.outcome?.label} paid ${result.game.payout}`);
      setTimeout(() => loadState(), 2500);
      return;
    }
    if (result.hitMine) {
      const tile = el("minesBoard")?.children[result.mineIndex];
      if (tile) {
        tile.textContent = "✹";
        tile.classList.add("mineHit");
      }
      el("minesStatus").textContent = "Mine hit · bet lost";
      setTimeout(() => loadState(), 1200);
    } else {
      await loadState();
    }
  } catch (error) {
    alert(error.message);
  }
}

async function minesCashout() {
  try {
    const result = await api("/api/casino/mines", { action: "cashout" });
    STATE.casino = { ...(STATE.casino || {}), mines: result.game };
    renderMines();
    el("minesStatus").textContent = `Cashed out ${result.game.cashout}`;
    setTimeout(() => loadState(), 900);
  } catch (error) {
    alert(error.message);
  }
}

function playingCard(card) {
  if (card === "??") return `<i class="playingCard hiddenCard">?</i>`;
  const rank = String(card).slice(0, -1);
  const suitCode = String(card).slice(-1);
  const suits = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const red = suitCode === "H" || suitCode === "D";
  return `<i class="playingCard ${red ? "red" : ""}"><b>${esc(rank)}</b><span>${suits[suitCode] || ""}</span></i>`;
}

function renderBlackjack(gameOverride = undefined) {
  if (!el("blackjackMsg")) return;
  const game = gameOverride === undefined ? STATE.casino?.blackjack : gameOverride;
  const active = game?.status === "active";
  el("blackjackStartButton").disabled = active;
  el("blackjackAmount").disabled = active;
  el("blackjackHitButton").disabled = !active;
  el("blackjackStandButton").disabled = !active;
  el("playerCards").innerHTML = (game?.playerCards || []).map(playingCard).join("");
  el("dealerCards").innerHTML = (game?.dealerCards || []).map(playingCard).join("");
  el("playerValue").textContent = game?.playerValue || 0;
  el("dealerValue").textContent = game?.dealerValue || 0;
  el("blackjackMsg").textContent = game
    ? `${game.status.replaceAll("_", " ")}${game.payout ? ` · payout ${game.payout}` : ""}`
    : "Place a bet to deal";
}

async function blackjackAction(action) {
  try {
    const result = await api("/api/casino/blackjack", {
      action,
      amount: action === "start" ? Number(el("blackjackAmount").value) : undefined,
    });
    STATE.casino = { ...(STATE.casino || {}), blackjack: result.game };
    renderBlackjack();
    if (result.game.status === "active") await loadState();
    else setTimeout(() => loadState(), 1400);
  } catch (error) {
    alert(error.message);
  }
}

function scratchSymbol(symbol) {
  return ({
    STAR: "★",
    CROWN: "♛",
    BAR: "BAR",
    COIN: "$",
    DIAMOND: "◆",
    "7": "7",
  })[symbol] || esc(symbol);
}

function scratchResultMarkup(ticket) {
  const result = ticket.result || {};
  if (result.mode === "numbers") {
    return `
      <div class="scratchWinningNumbers">
        <small>WINNING NUMBERS</small>
        <div>${(result.winningNumbers || []).map(number => `<i>${number}</i>`).join("")}</div>
      </div>
      <div class="scratchYourNumbers">
        <small>YOUR NUMBERS</small>
        <div>${(result.numbers || []).map(number => `<i>${number}</i>`).join("")}</div>
      </div>
    `;
  }
  return `
    <div class="scratchSymbolGrid">
      ${(result.cells || []).map(symbol => `<i title="${esc(symbol)}">${scratchSymbol(symbol)}</i>`).join("")}
    </div>
  `;
}

function renderScratchTickets() {
  const catalogBox = el("scratchCatalog");
  const stage = el("scratchStage");
  const history = el("scratchHistory");
  if (!catalogBox || !stage || !history) return;
  const catalog = STATE.casino?.scratchCatalog || [];
  const tickets = STATE.casino?.scratchTickets || [];
  catalogBox.innerHTML = catalog.map(type => `
    <article class="scratchShopCard theme-${esc(type.theme)}">
      <span class="scratchShopBadge">${esc(type.badge)}</span>
      <div><b>${esc(type.name)}</b><small>${esc(type.rule)}</small></div>
      <p><span>${Math.round(Number(type.winChance) * 100)}% win</span><span>Top ${type.topPrize}</span></p>
      <button onclick="buyScratchTicket('${type.id}')">Buy · ${type.price}</button>
    </article>
  `).join("");

  if (!tickets.some(ticket => ticket.id === activeScratchTicketId)) {
    activeScratchTicketId = tickets.find(ticket => ticket.status !== "claimed")?.id || tickets[0]?.id || "";
  }
  const ticket = tickets.find(item => item.id === activeScratchTicketId);
  if (!ticket) {
    stage.innerHTML = `<div class="casinoEmpty">Choose one of the scratch tickets above.</div>`;
  } else {
    const claimed = ticket.status === "claimed";
    stage.innerHTML = `
      <article class="scratchTicket theme-${esc(ticket.theme)} ${claimed ? "claimed" : ""}">
        <header><span>INSTANT WIN</span><b>${esc(ticket.name)}</b><em>Ticket ${ticket.price}</em></header>
        <div class="scratchRevealArea">
          <div class="scratchResult">${scratchResultMarkup(ticket)}</div>
          ${claimed ? "" : `<canvas id="scratchCanvas" aria-label="Scratch coating for ${esc(ticket.name)}"></canvas>`}
        </div>
        <footer>
          <span id="scratchMessage">${claimed ? (ticket.prize ? `WINNER · +${ticket.prize}` : "NO PRIZE · TRY ANOTHER") : "Scratch at least half of the silver area"}</span>
          ${claimed ? "" : `<button class="secondary" onclick="scratchRevealAll('${ticket.id}')">Reveal all</button>`}
        </footer>
      </article>
    `;
    if (!claimed) requestAnimationFrame(() => setupScratchCanvas(ticket.id));
  }

  history.innerHTML = tickets.length ? tickets.slice(0, 8).map(ticket => `
    <button class="${ticket.id === activeScratchTicketId ? "active" : ""}" onclick="selectScratchTicket('${ticket.id}')">
      <b>${esc(ticket.name)}</b><span>${ticket.status === "claimed" ? (ticket.prize ? `Won ${ticket.prize}` : "No prize") : "Ready to scratch"}</span>
    </button>
  `).join("") : "";
}

function selectScratchTicket(ticketId) {
  activeScratchTicketId = ticketId;
  renderScratchTickets();
}

async function buyScratchTicket(ticketType) {
  try {
    const result = await api("/api/casino/scratch", { action: "buy", ticketType });
    activeScratchTicketId = result.ticket.id;
    log(`Scratch ticket bought: ${result.ticket.name}`);
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

function setupScratchCanvas(ticketId) {
  const canvas = el("scratchCanvas");
  if (!canvas || activeScratchTicketId !== ticketId || canvas.dataset.ready) return;
  const area = canvas.parentElement;
  const bounds = area.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const scale = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(bounds.width * scale);
  canvas.height = Math.round(bounds.height * scale);
  canvas.dataset.ready = "true";
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.setTransform(scale, 0, 0, scale, 0, 0);
  const silver = context.createLinearGradient(0, 0, bounds.width, bounds.height);
  silver.addColorStop(0, "#727b80");
  silver.addColorStop(0.45, "#e1e4e4");
  silver.addColorStop(1, "#687176");
  context.fillStyle = silver;
  context.fillRect(0, 0, bounds.width, bounds.height);
  context.fillStyle = "rgba(255,255,255,.24)";
  for (let index = 0; index < 42; index++) {
    const x = (index * 73) % Math.max(1, bounds.width);
    const y = (index * 41) % Math.max(1, bounds.height);
    context.fillRect(x, y, 18, 2);
  }
  context.fillStyle = "rgba(24,31,34,.7)";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `900 ${Math.max(16, Math.min(25, bounds.width / 15))}px Arial`;
  context.fillText("SCRATCH HERE", bounds.width / 2, bounds.height / 2);
  context.globalCompositeOperation = "destination-out";

  let scratching = false;
  let moveCount = 0;
  const scratchAt = event => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    context.beginPath();
    context.arc(x, y, 25, 0, Math.PI * 2);
    context.fill();
    moveCount += 1;
  };
  const checkCoverage = () => {
    if (moveCount < 5) return;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    let sampled = 0;
    for (let index = 3; index < pixels.length; index += 80) {
      sampled += 1;
      if (pixels[index] < 40) transparent += 1;
    }
    if (sampled && transparent / sampled >= 0.5) claimScratchTicket(ticketId);
  };
  canvas.addEventListener("pointerdown", event => {
    scratching = true;
    canvas.setPointerCapture(event.pointerId);
    scratchAt(event);
  });
  canvas.addEventListener("pointermove", event => {
    if (!scratching) return;
    for (const point of event.getCoalescedEvents?.() || [event]) scratchAt(point);
  });
  canvas.addEventListener("pointerup", () => {
    scratching = false;
    checkCoverage();
  });
  canvas.addEventListener("pointercancel", () => { scratching = false; });
}

function scratchRevealAll(ticketId) {
  const canvas = el("scratchCanvas");
  const context = canvas?.getContext("2d");
  if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  claimScratchTicket(ticketId);
}

async function claimScratchTicket(ticketId) {
  if (scratchClaimsInFlight.has(ticketId)) return;
  scratchClaimsInFlight.add(ticketId);
  try {
    const message = el("scratchMessage");
    if (message) message.textContent = "Checking ticket...";
    const result = await api("/api/casino/scratch", { action: "claim", ticketId });
    log(result.ticket.prize ? `Scratch ticket won ${result.ticket.prize}` : "Scratch ticket: no prize");
    await loadState();
  } catch (error) {
    alert(error.message);
  } finally {
    scratchClaimsInFlight.delete(ticketId);
  }
}

function renderLotteryCountdown() {
  const target = Number(STATE.lottery?.nextDrawAt || 0);
  if (!el("lotteryCountdown")) return;
  if (!target) {
    el("lotteryCountdown").textContent = "--:--";
    return;
  }
  const current = Math.floor(Date.now() / 1000) + serverClockOffsetSeconds;
  const remaining = Math.max(0, target - current);
  el("lotteryCountdown").textContent = `${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, "0")}`;
}

function renderLottery() {
  if (!el("lotteryTickets")) return;
  const lottery = STATE.lottery || { tickets: [], ticketPrice: 25 };
  el("lotteryPrice").textContent = lottery.ticketPrice || 25;
  renderLotteryCountdown();
  el("lotteryTickets").innerHTML = (lottery.tickets || []).length
    ? lottery.tickets.map(ticket => `
      <article class="lotteryTicket ${esc(ticket.status)}">
        <div class="lotteryBalls">${ticket.numbers.map(number => `<i>${number}</i>`).join("")}</div>
        <div><b>${esc(ticket.status)}</b><span>Draw ${formatDate(ticket.drawAt)}</span></div>
        <strong>${ticket.status === "pending" ? "WAITING" : ticket.prize ? `+${ticket.prize}` : `${ticket.matches} matches`}</strong>
        ${ticket.winningNumbers ? `<small>Drawn: ${ticket.winningNumbers.join(", ")}</small>` : ""}
      </article>
    `).join("")
    : `<div class="casinoEmpty">No lottery tickets yet. Buy a selected ticket or use Quick Pick.</div>`;
}

async function buyLotteryTicket(quickPick) {
  try {
    let numbers;
    if (!quickPick) {
      numbers = el("lotteryNumbers").value.split(/[,\s]+/).filter(Boolean).map(Number);
    }
    const result = await api("/api/lottery", { action: "buy", numbers });
    el("lotteryNumbers").value = result.ticket.numbers.join(", ");
    STATE.lottery = result.lottery;
    renderLottery();
    log(`Lottery ticket bought: ${result.ticket.numbers.join("-")}`);
    await loadState();
  } catch (error) {
    alert(error.message);
  }
}

function renderCasinoRecent() {
  const box = el("casinoRecent");
  if (!box) return;
  const plays = STATE.casino?.recent || [];
  box.innerHTML = plays.length ? plays.map(play => `
    <span><b>${esc(play.game)}</b><em>${esc(play.result)}</em><strong>${play.payout ? `+${play.payout}` : `-${play.bet}`}</strong></span>
  `).join("") : `<div class="casinoEmpty">No casino plays yet.</div>`;
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
  renderLotteryCountdown();
  maybePollStore();
}, 1000);
