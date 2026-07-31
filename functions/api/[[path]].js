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

const WORK_CHALLENGES = {
  "Deliver stadium flyers": [
    {
      prompt: "The north gate is closed. Which route reaches the fan zone without crossing the team entrance?",
      options: [
        { id: "route_market", label: "Market Street to the public west gate" },
        { id: "route_tunnel", label: "Players tunnel under the north stand" },
        { id: "route_pitch", label: "Cross the pitch before warm-up" },
      ],
      answer: "route_market",
      success: "The first flyer bundle reached the public entrance.",
    },
    {
      prompt: "You have 30 flyers and each handout stack holds 6. How many full stacks do you prepare?",
      options: [
        { id: "stacks_4", label: "4 stacks" },
        { id: "stacks_5", label: "5 stacks" },
        { id: "stacks_6", label: "6 stacks" },
      ],
      answer: "stacks_5",
      success: "All 30 flyers are counted and ready.",
    },
  ],
  "Clean a snack kiosk": [
    {
      prompt: "The grill is still hot. What is the first safe action before cleaning it?",
      options: [
        { id: "grill_power", label: "Switch it off and isolate the power" },
        { id: "grill_water", label: "Pour cold water over the plate" },
        { id: "grill_spray", label: "Spray cleaner while it is running" },
      ],
      answer: "grill_power",
      success: "The grill is safely isolated.",
    },
    {
      prompt: "A food counter has crumbs and grease. Which order passes inspection?",
      options: [
        { id: "clean_correct", label: "Remove debris, wash, sanitize, air-dry" },
        { id: "clean_fast", label: "Sanitize, wipe with used towel, restock" },
        { id: "clean_hide", label: "Cover the counter with paper" },
      ],
      answer: "clean_correct",
      success: "The counter passes the hygiene check.",
    },
  ],
  "Repair betting terminals": [
    {
      prompt: "Terminal 1 has power but shows NETWORK OFFLINE. What do you inspect first?",
      options: [
        { id: "network_cable", label: "Ethernet cable and link light" },
        { id: "screen_brightness", label: "Screen brightness" },
        { id: "receipt_roll", label: "Receipt paper roll" },
      ],
      answer: "network_cable",
      success: "The loose network cable is reseated.",
    },
    {
      prompt: "Terminal 2 prints half a ticket and reports PAPER JAM. What is the safe fix?",
      options: [
        { id: "printer_clear", label: "Open the latch and remove the torn paper" },
        { id: "printer_pull", label: "Pull the paper while the printer runs" },
        { id: "printer_ignore", label: "Disable ticket printing" },
      ],
      answer: "printer_clear",
      success: "The printer path is clear and the roll is aligned.",
    },
    {
      prompt: "All terminals are online. Which final test proves the repair is complete?",
      options: [
        { id: "terminal_demo", label: "Run and void one demo ticket on each terminal" },
        { id: "terminal_restart", label: "Restart every terminal again" },
        { id: "terminal_photo", label: "Take a photo of the screens" },
      ],
      answer: "terminal_demo",
      success: "Every terminal completes the demo transaction.",
    },
  ],
  "Guard VIP parking": [
    {
      prompt: "A pass has the correct logo but yesterday's date. What do you do?",
      options: [
        { id: "pass_hold", label: "Hold the car and verify the pass" },
        { id: "pass_wave", label: "Wave it through because the logo is correct" },
        { id: "pass_edit", label: "Change the date by hand" },
      ],
      answer: "pass_hold",
      success: "The expired pass is sent for verification.",
    },
    {
      prompt: "A delivery van stops in the marked emergency lane. What has priority?",
      options: [
        { id: "lane_clear", label: "Move the van to the loading bay immediately" },
        { id: "lane_wait", label: "Let it unload for ten minutes" },
        { id: "lane_cone", label: "Put a cone behind it and leave it" },
      ],
      answer: "lane_clear",
      success: "The emergency route is clear.",
    },
    {
      prompt: "The guest name matches, but the license plate does not. What is the correct response?",
      options: [
        { id: "plate_verify", label: "Call the supervisor before entry" },
        { id: "plate_allow", label: "Allow entry on the guest name alone" },
        { id: "plate_replace", label: "Write the new plate on the old pass" },
      ],
      answer: "plate_verify",
      success: "The replacement vehicle is confirmed by the supervisor.",
    },
  ],
  "Audit casino receipts": [
    {
      prompt: "Receipt batches total 42, 38, and 55. The drawer report says 140. What is the mismatch?",
      options: [
        { id: "audit_5_over", label: "Drawer is 5 over" },
        { id: "audit_5_short", label: "Drawer is 5 short" },
        { id: "audit_balanced", label: "No mismatch" },
      ],
      answer: "audit_5_over",
      success: "The 5 credit overage is flagged.",
    },
    {
      prompt: "Two receipts share the same transaction number but have different totals. What should be flagged?",
      options: [
        { id: "audit_duplicate", label: "Possible duplicate or altered receipt" },
        { id: "audit_rounding", label: "Normal rounding difference" },
        { id: "audit_ignore", label: "Nothing if both are signed" },
      ],
      answer: "audit_duplicate",
      success: "The duplicate transaction is isolated.",
    },
    {
      prompt: "Cash sales are 260 and refunds are 35. How much cash should remain from those transactions?",
      options: [
        { id: "cash_225", label: "225" },
        { id: "cash_295", label: "295" },
        { id: "cash_235", label: "235" },
      ],
      answer: "cash_225",
      success: "The net cash total is correct.",
    },
    {
      prompt: "A card payment appears in receipts but not in the payment terminal report. Where does it go?",
      options: [
        { id: "card_exception", label: "Payment exception report for investigation" },
        { id: "card_cash", label: "Add it to the cash drawer total" },
        { id: "card_delete", label: "Delete the receipt" },
      ],
      answer: "card_exception",
      success: "The missing card settlement is documented.",
    },
  ],
  "Recover missing sponsor files": [
    {
      prompt: "The sign-out sheet shows the courier took the folder last. What is your first move?",
      options: [
        { id: "files_call", label: "Call the courier using the logged job number" },
        { id: "files_accuse", label: "Report the courier for theft immediately" },
        { id: "files_copy", label: "Create a blank replacement folder" },
      ],
      answer: "files_call",
      success: "The courier confirms the last delivery point.",
    },
    {
      prompt: "You find the folder in an unlocked meeting room. What do you record before moving it?",
      options: [
        { id: "files_location", label: "Location, time, and who recovered it" },
        { id: "files_contents", label: "Only the number of pages" },
        { id: "files_nothing", label: "Nothing, return it quickly" },
      ],
      answer: "files_location",
      success: "The recovery has a clear chain of custody.",
    },
    {
      prompt: "One contract page is missing. What is the correct next step?",
      options: [
        { id: "files_escalate", label: "Seal the folder and report the missing page" },
        { id: "files_guess", label: "Replace it with an older draft" },
        { id: "files_return", label: "Return the incomplete folder silently" },
      ],
      answer: "files_escalate",
      success: "The incomplete file is secured for review.",
    },
    {
      prompt: "The sponsor desk accepts the recovered folder. What closes the task?",
      options: [
        { id: "files_receipt", label: "Get a signed handover receipt" },
        { id: "files_photo", label: "Photograph the sponsor desk" },
        { id: "files_leave", label: "Leave before they count the pages" },
      ],
      answer: "files_receipt",
      success: "The handover is signed and complete.",
    },
  ],
  "Run a private finals event": [
    {
      prompt: "Ten guests arrive but two names are missing from the list. What do you do?",
      options: [
        { id: "event_verify", label: "Hold entry and verify with the host" },
        { id: "event_allow", label: "Allow them in with the group" },
        { id: "event_charge", label: "Sell them replacement invitations" },
      ],
      answer: "event_verify",
      success: "The host verifies the two additional guests.",
    },
    {
      prompt: "Catering has 24 meals for 30 confirmed guests. What is the best immediate response?",
      options: [
        { id: "event_catering", label: "Order six fast replacement meals and delay service" },
        { id: "event_smaller", label: "Make every meal smaller without telling guests" },
        { id: "event_skip", label: "Serve only the first 24 guests" },
      ],
      answer: "event_catering",
      success: "The meal shortage is covered before service.",
    },
    {
      prompt: "A decoration blocks part of the emergency exit. What happens next?",
      options: [
        { id: "event_exit", label: "Remove it before opening the room" },
        { id: "event_sign", label: "Add a sign pointing around it" },
        { id: "event_ignore", label: "Leave it because the door still opens" },
      ],
      answer: "event_exit",
      success: "The emergency exit is fully clear.",
    },
    {
      prompt: "One helper is absent. Which post must remain staffed at all times?",
      options: [
        { id: "event_entry", label: "Guest entry and emergency contact point" },
        { id: "event_coats", label: "Coat rack" },
        { id: "event_screen", label: "Score display" },
      ],
      answer: "event_entry",
      success: "Entry control remains covered.",
    },
    {
      prompt: "The event is over and the cash box total matches receipts. What closes the shift?",
      options: [
        { id: "event_close", label: "Seal cash, sign the report, and hand over keys" },
        { id: "event_keys", label: "Take the keys home for safety" },
        { id: "event_later", label: "Leave the cash count for tomorrow" },
      ],
      answer: "event_close",
      success: "The event closes with a complete handover.",
    },
  ],
};

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
const MARKET_MIN_BASE_RATIO = 0.12;
const DEFAULT_DAY_LENGTH_SECONDS = 600;
const DEFAULT_STORE_SALE_TICK_SECONDS = 30;
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

const PROPERTY_LISTINGS = [
  {
    id: "micro_loft",
    name: "Micro Loft",
    area: "South Yard",
    floor: 1,
    comfort: 18,
    price: 100000,
    rent: 170,
    deposit: 510,
    income: 420,
    description: "Small first-floor apartment with basic repairs and stable demand.",
  },
  {
    id: "market_studio",
    name: "Market Studio",
    area: "Market Street",
    floor: 3,
    comfort: 24,
    price: 135000,
    rent: 230,
    deposit: 690,
    income: 560,
    description: "Compact studio near shops, good for short rentals.",
  },
  {
    id: "river_flat",
    name: "River Flat",
    area: "River Walk",
    floor: 5,
    comfort: 31,
    price: 180000,
    rent: 310,
    deposit: 930,
    income: 760,
    description: "Bright one-bedroom flat with a better view and safer entrance.",
  },
  {
    id: "arena_two_room",
    name: "Arena Two-Room",
    area: "Stadium District",
    floor: 7,
    comfort: 42,
    price: 260000,
    rent: 460,
    deposit: 1380,
    income: 1120,
    description: "Two rooms near the arena, expensive on match weeks.",
  },
  {
    id: "business_suite",
    name: "Business Suite",
    area: "Central Blocks",
    floor: 9,
    comfort: 55,
    price: 390000,
    rent: 690,
    deposit: 2070,
    income: 1680,
    description: "Clean business apartment with strong rent-out potential.",
  },
  {
    id: "garden_apartment",
    name: "Garden Apartment",
    area: "Hill Road",
    floor: 2,
    comfort: 68,
    price: 560000,
    rent: 980,
    deposit: 2940,
    income: 2360,
    description: "Quiet apartment beside private gardens and better neighbors.",
  },
  {
    id: "tower_view",
    name: "Tower View",
    area: "Tower Lane",
    floor: 14,
    comfort: 82,
    price: 840000,
    rent: 1460,
    deposit: 4380,
    income: 3520,
    description: "High-floor apartment with a premium city view.",
  },
  {
    id: "executive_floor",
    name: "Executive Floor",
    area: "Financial Plaza",
    floor: 18,
    comfort: 96,
    price: 1250000,
    rent: 2180,
    deposit: 6540,
    income: 5260,
    description: "Large executive apartment with concierge service.",
  },
  {
    id: "sky_residence",
    name: "Sky Residence",
    area: "Tower Lane",
    floor: 28,
    comfort: 120,
    price: 1900000,
    rent: 3300,
    deposit: 9900,
    income: 7950,
    description: "Luxury residence for rich players and high-status tenants.",
  },
  {
    id: "royal_penthouse",
    name: "Royal Penthouse",
    area: "Arena Heights",
    floor: 36,
    comfort: 160,
    price: 3000000,
    rent: 5200,
    deposit: 15600,
    income: 12400,
    description: "Top penthouse with the highest comfort and rental income.",
  },
];

const STORE_PREMISES = [
  {
    id: "street_kiosk",
    name: "Street Kiosk",
    area: "Stadium Gate",
    price: 25000,
    capacity: 30,
    traffic: 0.30,
    prestige: 1,
    description: "Small first business with matchday foot traffic and low running costs.",
  },
  {
    id: "corner_store",
    name: "Corner Store",
    area: "Market Street",
    price: 100000,
    capacity: 70,
    traffic: 0.46,
    prestige: 2,
    description: "A proper neighborhood shop with room for several product lines.",
  },
  {
    id: "market_hall",
    name: "Market Hall Unit",
    area: "Central Market",
    price: 350000,
    capacity: 160,
    traffic: 0.66,
    prestige: 4,
    description: "Large retail floor in a busy indoor market with strong daily demand.",
  },
  {
    id: "city_supermarket",
    name: "City Supermarket",
    area: "Financial Plaza",
    price: 1000000,
    capacity: 360,
    traffic: 0.88,
    prestige: 7,
    description: "Flagship supermarket with the highest traffic, capacity, and status.",
  },
];

const STORE_PRODUCTS = [
  { id: "bread", name: "Fresh Bread", wholesale: 4, basePrice: 9, demand: 10, fixture: "shelves", fixtureLevel: 1, color: "gold" },
  { id: "chips", name: "Matchday Chips", wholesale: 5, basePrice: 12, demand: 9, fixture: "shelves", fixtureLevel: 1, color: "red" },
  { id: "fruit", name: "Fruit Box", wholesale: 7, basePrice: 16, demand: 7, fixture: "shelves", fixtureLevel: 1, color: "green" },
  { id: "coffee", name: "Premium Coffee", wholesale: 9, basePrice: 21, demand: 6, fixture: "shelves", fixtureLevel: 2, color: "brown" },
  { id: "water", name: "Cold Water", wholesale: 3, basePrice: 8, demand: 11, fixture: "fridges", fixtureLevel: 1, color: "blue" },
  { id: "pizza", name: "Fresh Pizza", wholesale: 13, basePrice: 31, demand: 7, fixture: "fridges", fixtureLevel: 1, color: "red" },
  { id: "sushi", name: "Sushi Tray", wholesale: 18, basePrice: 44, demand: 5, fixture: "fridges", fixtureLevel: 2, color: "green" },
  { id: "steak", name: "Prime Steak", wholesale: 26, basePrice: 64, demand: 3, fixture: "fridges", fixtureLevel: 3, color: "gold" },
];

const STORE_EQUIPMENT = [
  { id: "shelves", name: "Display Shelves", baseCost: 3000, maxLevel: 6, capacity: 25, description: "Unlock dry goods and add 25 storage slots per level." },
  { id: "fridges", name: "Refrigerator", baseCost: 9000, maxLevel: 3, capacity: 20, description: "Unlock chilled products and add 20 storage slots per level." },
  { id: "checkouts", name: "Checkout Counter", baseCost: 7500, maxLevel: 3, capacity: 0, description: "Serve customers faster and increase store traffic." },
  { id: "signage", name: "Store Signage", baseCost: 5000, maxLevel: 3, capacity: 0, description: "Bring more people in from the street." },
];

const STORE_MARKUPS = [
  { value: 0.85, label: "Budget", demand: 1.18 },
  { value: 1, label: "Regular", demand: 1 },
  { value: 1.2, label: "High", demand: 0.82 },
  { value: 1.45, label: "Premium", demand: 0.62 },
];

function initialMarketTickOffset(symbol) {
  const hash = [...symbol].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0);
  return 5 + (hash % Math.max(1, MARKET_TICK_SECONDS - 10));
}

function randomMarketTickOffset() {
  return 5 + Math.floor(Math.random() * Math.max(1, MARKET_TICK_SECONDS - 10));
}

function marketBasePrice(symbol) {
  return Number(MARKET_ASSETS.find(asset => asset.symbol === symbol)?.price || 10);
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
  const dayLengthSeconds = positiveEnvInt(env.DAY_LENGTH_SECONDS, DEFAULT_DAY_LENGTH_SECONDS);
  const storeSaleTickSeconds = positiveEnvInt(env.STORE_SALE_TICK_SECONDS, DEFAULT_STORE_SALE_TICK_SECONDS);
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
    )) || PROPERTY_LISTINGS.find(listing => listing.id === key) || HOUSING_LISTINGS[0];
  }

  function housingListing(housingId) {
    const key = housingKey(housingId);
    return HOUSING_LISTINGS.find(listing => listing.id === key)
      || PROPERTY_LISTINGS.find(listing => listing.id === key)
      || null;
  }

  function publicHousingListings() {
    return HOUSING_LISTINGS.map(listing => ({ ...listing }));
  }

  function propertyListing(propertyId) {
    const key = housingKey(propertyId);
    return PROPERTY_LISTINGS.find(listing => listing.id === key) || null;
  }

  function publicPropertyListing(listing, ownedCount = 0) {
    return {
      id: listing.id,
      name: listing.name,
      area: listing.area,
      floor: listing.floor,
      comfort: listing.comfort,
      price: listing.price,
      rent: listing.rent,
      deposit: listing.deposit,
      income: listing.income,
      description: listing.description,
      ownedCount,
    };
  }

  async function propertyState(userId) {
    const rows = await DB.prepare(`
      SELECT id, property_id, rented_out, created_at
      FROM owned_properties
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();
    const owned = rows.results
      .map(row => {
        const listing = propertyListing(row.property_id);
        if (!listing) return null;
        return {
          ...publicPropertyListing(listing),
          id: row.id,
          propertyId: row.property_id,
          rentedOut: !!row.rented_out,
          createdAt: Number(row.created_at),
        };
      })
      .filter(Boolean);
    const ownedCounts = owned.reduce((counts, item) => {
      counts[item.propertyId] = (counts[item.propertyId] || 0) + 1;
      return counts;
    }, {});
    return {
      listings: PROPERTY_LISTINGS.map(listing => publicPropertyListing(listing, ownedCounts[listing.id] || 0)),
      owned,
      value: owned.reduce((sum, item) => sum + item.price, 0),
      incomePerDay: owned.reduce((sum, item) => sum + (item.rentedOut ? item.income : 0), 0),
    };
  }

  async function propertyIncomePerDay(userId) {
    const rows = await DB.prepare("SELECT property_id FROM owned_properties WHERE user_id = ? AND rented_out = 1")
      .bind(userId).all();
    return rows.results.reduce((sum, row) => sum + Number(propertyListing(row.property_id)?.income || 0), 0);
  }

  function storePremises(premisesId) {
    const key = housingKey(premisesId);
    return STORE_PREMISES.find(premises => premises.id === key) || null;
  }

  function storeProduct(productId) {
    const key = housingKey(productId);
    return STORE_PRODUCTS.find(product => product.id === key) || null;
  }

  function storeEquipment(equipmentId) {
    const key = housingKey(equipmentId);
    return STORE_EQUIPMENT.find(equipment => equipment.id === key) || null;
  }

  function storeMarkup(value) {
    const number = Number(value);
    return STORE_MARKUPS.find(markup => Math.abs(markup.value - number) < 0.001) || null;
  }

  function storeEquipmentCost(equipment, currentLevel) {
    return equipment.baseCost * (Number(currentLevel || 0) + 1);
  }

  function storeCapacity(store, premises) {
    return Number(premises?.capacity || 0)
      + Number(store?.shelves || 0) * 25
      + Number(store?.fridges || 0) * 20;
  }

  function storeSalePrice(product, markupValue) {
    return Math.max(product.wholesale + 1, Math.round(product.basePrice * Number(markupValue || 1)));
  }

  function storeProductUnlocked(product, store) {
    return Number(store?.[product.fixture] || 0) >= product.fixtureLevel;
  }

  async function processStoreSales(userId) {
    const store = await DB.prepare("SELECT * FROM retail_stores WHERE user_id = ?").bind(userId).first();
    if (!store) return null;

    const current = nowSeconds();
    const lastSalesAt = Number(store.last_sales_at || current);
    const elapsedTicks = Math.floor(Math.max(0, current - lastSalesAt) / storeSaleTickSeconds);
    const ticks = Math.min(720, elapsedTicks);
    if (ticks < 1) return store;
    const processedAt = lastSalesAt + ticks * storeSaleTickSeconds;
    const premises = storePremises(store.premises_id);
    const markup = storeMarkup(store.markup) || STORE_MARKUPS[1];
    const stockRows = await DB.prepare("SELECT product_id, quantity FROM store_stock WHERE user_id = ? AND quantity > 0")
      .bind(userId).all();
    const quantities = Object.fromEntries(stockRows.results.map(row => [row.product_id, Number(row.quantity)]));
    const available = STORE_PRODUCTS.filter(product => quantities[product.id] > 0 && storeProductUnlocked(product, store));
    const totalStock = available.reduce((sum, product) => sum + quantities[product.id], 0);
    if (!premises || totalStock < 1) {
      await DB.prepare("UPDATE retail_stores SET last_sales_at = ? WHERE user_id = ?")
        .bind(processedAt, userId).run();
      return { ...store, last_sales_at: processedAt };
    }

    const traffic = clamp(
      (premises.traffic + Number(store.signage || 0) * 0.07 + Number(store.checkouts || 0) * 0.05
        + Number(store.reputation || 50) / 500) * markup.demand,
      0.08,
      0.98,
    );
    const customerCount = Math.min(totalStock, Math.floor(ticks * traffic));
    if (customerCount < 1) {
      return store;
    }

    const sold = {};
    let revenue = 0;
    let served = 0;
    for (let index = 0; index < customerCount; index++) {
      const choices = available.filter(product => quantities[product.id] > 0);
      if (!choices.length) break;
      const totalWeight = choices.reduce((sum, product) => sum + product.demand * Math.min(4, quantities[product.id]), 0);
      let roll = Math.random() * totalWeight;
      let selected = choices[0];
      for (const product of choices) {
        roll -= product.demand * Math.min(4, quantities[product.id]);
        if (roll <= 0) {
          selected = product;
          break;
        }
      }
      quantities[selected.id] -= 1;
      sold[selected.id] = (sold[selected.id] || 0) + 1;
      revenue += storeSalePrice(selected, markup.value);
      served += 1;
    }

    if (served < 1) {
      await DB.prepare("UPDATE retail_stores SET last_sales_at = ? WHERE user_id = ?")
        .bind(processedAt, userId).run();
      return { ...store, last_sales_at: processedAt };
    }

    const statements = [
      DB.prepare("UPDATE users SET wallet = wallet + ? WHERE id = ?").bind(revenue, userId),
      DB.prepare(`
        UPDATE retail_stores
        SET lifetime_revenue = lifetime_revenue + ?, customers_served = customers_served + ?,
          reputation = MIN(100, reputation + ?), last_sales_at = ?
        WHERE user_id = ?
      `).bind(revenue, served, Math.floor(served / 25), processedAt, userId),
      DB.prepare("DELETE FROM store_sales WHERE user_id = ? AND created_at < ?")
        .bind(userId, current - 30 * 24 * 60 * 60),
    ];
    for (const [productId, quantity] of Object.entries(sold)) {
      const product = storeProduct(productId);
      const unitPrice = storeSalePrice(product, markup.value);
      statements.push(
        DB.prepare("UPDATE store_stock SET quantity = MAX(0, quantity - ?) WHERE user_id = ? AND product_id = ?")
          .bind(quantity, userId, productId),
        DB.prepare(`
          INSERT INTO store_sales (id, user_id, product_id, quantity, unit_price, revenue, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(crypto.randomUUID(), userId, productId, quantity, unitPrice, unitPrice * quantity, current),
      );
    }
    await DB.batch(statements);
    return await DB.prepare("SELECT * FROM retail_stores WHERE user_id = ?").bind(userId).first();
  }

  async function storeState(userId) {
    await processStoreSales(userId);
    const store = await DB.prepare("SELECT * FROM retail_stores WHERE user_id = ?").bind(userId).first();
    const premisesListings = STORE_PREMISES.map(premises => ({ ...premises }));
    if (!store) {
      return {
        owned: false,
        premisesListings,
        equipment: STORE_EQUIPMENT.map(item => ({ ...item, level: 0, nextCost: item.baseCost })),
        markupOptions: STORE_MARKUPS.map(item => ({ value: item.value, label: item.label })),
      };
    }

    const [stockRows, salesRows, todayRow] = await Promise.all([
      DB.prepare("SELECT product_id, quantity FROM store_stock WHERE user_id = ? ORDER BY product_id").bind(userId).all(),
      DB.prepare(`
        SELECT product_id, quantity, unit_price, revenue, created_at
        FROM store_sales
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 12
      `).bind(userId).all(),
      DB.prepare("SELECT COALESCE(SUM(revenue), 0) AS revenue FROM store_sales WHERE user_id = ? AND created_at >= ?")
        .bind(userId, nowSeconds() - 24 * 60 * 60).first(),
    ]);
    const stock = Object.fromEntries(stockRows.results.map(row => [row.product_id, Number(row.quantity)]));
    const premises = storePremises(store.premises_id) || STORE_PREMISES[0];
    const capacity = storeCapacity(store, premises);
    const stockUsed = Object.values(stock).reduce((sum, quantity) => sum + Number(quantity), 0);
    const markup = storeMarkup(store.markup) || STORE_MARKUPS[1];
    const unlockedProducts = STORE_PRODUCTS.filter(product => storeProductUnlocked(product, store));
    const averageProfit = unlockedProducts.length
      ? unlockedProducts.reduce((sum, product) => sum + storeSalePrice(product, markup.value) - product.wholesale, 0) / unlockedProducts.length
      : 0;
    const traffic = clamp(
      (premises.traffic + Number(store.signage || 0) * 0.07 + Number(store.checkouts || 0) * 0.05
        + Number(store.reputation || 50) / 500) * markup.demand,
      0.08,
      0.98,
    );
    const hasFixtures = Number(store.shelves || 0) + Number(store.fridges || 0) > 0;
    const status = !hasFixtures ? "setup" : stockUsed < 1 ? "out_of_stock" : "open";

    return {
      owned: true,
      name: store.name,
      premises,
      premisesListings,
      markup: markup.value,
      markupLabel: markup.label,
      markupOptions: STORE_MARKUPS.map(item => ({ value: item.value, label: item.label })),
      status,
      capacity,
      stockUsed,
      reputation: Number(store.reputation || 50),
      lifetimeRevenue: Number(store.lifetime_revenue || 0),
      customersServed: Number(store.customers_served || 0),
      todayRevenue: Number(todayRow?.revenue || 0),
      projectedHourlyProfit: Math.round((3600 / storeSaleTickSeconds) * traffic * averageProfit),
      nextSaleIn: Math.max(0, Number(store.last_sales_at || 0) + storeSaleTickSeconds - nowSeconds()),
      equipment: STORE_EQUIPMENT.map(item => {
        const level = Number(store[item.id] || 0);
        return {
          ...item,
          level,
          maxed: level >= item.maxLevel,
          nextCost: level >= item.maxLevel ? null : storeEquipmentCost(item, level),
        };
      }),
      products: STORE_PRODUCTS.map(product => {
        const salePrice = storeSalePrice(product, markup.value);
        return {
          ...product,
          stock: Number(stock[product.id] || 0),
          unlocked: storeProductUnlocked(product, store),
          salePrice,
          unitProfit: salePrice - product.wholesale,
        };
      }),
      recentSales: salesRows.results.map(sale => ({
        productId: sale.product_id,
        productName: storeProduct(sale.product_id)?.name || sale.product_id,
        quantity: Number(sale.quantity),
        unitPrice: Number(sale.unit_price),
        revenue: Number(sale.revenue),
        createdAt: Number(sale.created_at),
      })),
    };
  }

  async function userById(userId) {
    return await DB.prepare(`
      SELECT users.*,
        CASE WHEN bans.user_id IS NULL THEN 0 ELSE 1 END AS banned,
        bans.reason AS ban_reason
      FROM users
      LEFT JOIN bans ON bans.user_id = users.id
      WHERE users.id = ?
    `).bind(userId).first();
  }

  async function applyAutomaticDays(user) {
    const current = nowSeconds();
    const lastDailyAt = Number(user.last_daily_at || 0);
    if (lastDailyAt <= 0) {
      await DB.prepare("UPDATE users SET last_daily_at = ? WHERE id = ?")
        .bind(current, user.id).run();
      return { ...user, last_daily_at: current };
    }
    const elapsed = current - lastDailyAt;
    const days = Math.min(7, Math.floor(elapsed / dayLengthSeconds));
    if (days < 1) return user;

    await advanceUserDays(user, days, current);
    return await userById(user.id);
  }

  async function advanceUserDays(user, days, current) {
    let debt = Number(user.debt || 0);
    let rating = Number(user.rating || 700);
    let due = user.loan_due;
    let day = Number(user.day || 0);
    let hunger = Number(user.hunger ?? 100);
    let thirst = Number(user.thirst ?? 100);
    let rentDue = Number(user.rent_due || 0);
    let wallet = Number(user.wallet || 0);
    const incomePerDay = await propertyIncomePerDay(user.id);
    const housing = selectedHousing(user.housing);

    for (let index = 0; index < days; index++) {
      day += 1;
      hunger = Math.max(0, hunger - HUNGER_DECAY_PER_DAY);
      thirst = Math.max(0, thirst - THIRST_DECAY_PER_DAY);
      rentDue += Number(housing.rent || 0);
      wallet += incomePerDay;
      if (debt > 0 && due !== null && day > due) {
        rating = Math.max(300, rating - 50);
        debt = Math.ceil(debt * 1.15);
        due = day + 2;
      }
      if (hunger <= 0) rating = Math.max(300, rating - 15);
      if (thirst <= 0) rating = Math.max(300, rating - 20);
      if (rentDue >= Math.max(100, Number(housing.rent || 0) * 4)) rating = Math.max(300, rating - 10);
    }

    await DB.prepare(`
      UPDATE users
      SET wallet = ?, day = ?, debt = ?, rating = ?, loan_due = ?,
        hunger = ?, thirst = ?, rent_due = ?, housing = ?, last_daily_at = ?
      WHERE id = ?
    `).bind(wallet, day, debt, rating, due, hunger, thirst, rentDue, housing.id, current, user.id).run();
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

  function workStepsForDifficulty(difficulty) {
    return ({
      Easy: 2,
      Standard: 3,
      Hard: 4,
      Elite: 5,
    })[difficulty] || 3;
  }

  function workTaskPrompt(quest) {
    if (quest.difficulty === "Elite") return "Coordinate shift";
    if (quest.difficulty === "Hard") return "Finish assignment";
    if (quest.difficulty === "Standard") return "Do work step";
    return "Handle small task";
  }

  function workChallenge(quest) {
    const challenges = WORK_CHALLENGES[quest.title] || WORK_CHALLENGES["Repair betting terminals"];
    const progress = Number(quest.progress || 0);
    return challenges[Math.min(progress, challenges.length - 1)];
  }

  function publicWorkChallenge(quest) {
    const stepsRequired = Number(quest.steps_required || workStepsForDifficulty(quest.difficulty));
    if (Number(quest.progress || 0) >= stepsRequired || quest.status !== "posted") return null;
    const challenge = workChallenge(quest);
    return {
      prompt: challenge.prompt,
      options: challenge.options.map(option => ({ id: option.id, label: option.label })),
    };
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
      taskPrompt: quest.task_prompt || workTaskPrompt(quest),
      progress: Number(quest.progress || 0),
      stepsRequired: Number(quest.steps_required || workStepsForDifficulty(quest.difficulty)),
      mistakes: Number(quest.mistakes || 0),
      maxMistakes: 3,
      challenge: publicWorkChallenge(quest),
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
      const basePrice = marketBasePrice(asset.symbol);
      const priceFloor = Math.max(1, Math.round(basePrice * MARKET_MIN_BASE_RATIO));
      for (let index = 0; index < steps; index++) {
        const swing = Math.max(1, Math.round(price * Number(asset.volatility) / 100));
        const lastDirection = price < Number(asset.previous_price || price) ? "down" : "up";
        const valueRatio = price / basePrice;
        const roll = Math.random();
        let delta = 0;
        if (roll < 0.07 && price > priceFloor) {
          delta = -Math.max(1, Math.ceil(swing * (0.9 + Math.random() * 1.1)));
        } else if (roll < 0.17) {
          delta = Math.max(1, Math.ceil(swing * (0.6 + Math.random() * 1.1)));
        } else {
          let upChance = lastDirection === "down" ? 0.56 : 0.49;
          if (valueRatio < 0.65) upChance += 0.18;
          if (valueRatio > 1.35) upChance -= 0.14;
          const direction = Math.random() < upChance ? 1 : -1;
          delta = Math.floor(Math.random() * (swing + 1)) * direction;
          if (delta === 0 && Math.random() < 0.35) delta = direction;
        }
        if (valueRatio < 0.45 && delta < 1) delta = 1;
        price = Math.max(priceFloor, price + delta);
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

  let user = await currentUser();
  if (user) user = await applyAutomaticDays(user);

  if (path === "/state") {
    const store = user ? await storeState(user.id) : null;
    if (user) user = await userById(user.id);
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
      response.properties = await propertyState(user.id);
      response.store = store;
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
        task_prompt: workTaskPrompt(selected),
        steps_required: workStepsForDifficulty(selected.difficulty),
        progress: 0,
        reward: selected.reward,
        status: "posted",
        created_at: createdAt,
        available_at: createdAt + pickWorkWaitSeconds(),
        completed_at: null,
      };
      await DB.prepare(`
        INSERT INTO work_quests (
          id, user_id, title, difficulty, description, objective, task_prompt,
          steps_required, progress, reward, status, available_at, completed_at, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        quest.id,
        quest.user_id,
        quest.title,
        quest.difficulty,
        quest.description,
        quest.objective,
        quest.task_prompt,
        quest.steps_required,
        quest.progress,
        quest.reward,
        quest.status,
        quest.available_at,
        quest.completed_at,
        quest.created_at,
      ).run();
      return json({ ok: true, quest: publicWorkQuest(quest) });
    }

    if (action === "task") {
      const quest = await activeWorkQuest(user.id);
      if (!quest) return json({ error: "No active work quest" }, 400);
      if (Number(user.hunger ?? 100) <= 0) {
        return json({ error: "Eat food before doing work", quest: publicWorkQuest(quest) }, 400);
      }
      if (Number(user.thirst ?? 100) <= 0) {
        return json({ error: "Drink water before doing work", quest: publicWorkQuest(quest) }, 400);
      }

      const current = nowSeconds();
      if (Math.max(0, Number(quest.available_at) - current) > 0) {
        return json({ error: "Quest not ready", quest: publicWorkQuest(quest) }, 400);
      }

      const stepsRequired = Number(quest.steps_required || workStepsForDifficulty(quest.difficulty));
      if (Number(quest.progress || 0) >= stepsRequired) {
        return json({ error: "Work task already finished", quest: publicWorkQuest(quest) }, 400);
      }
      const challenge = workChallenge(quest);
      const answer = String(data.answer || "");
      if (!challenge.options.some(option => option.id === answer)) {
        return json({ error: "Choose an answer for the task", quest: publicWorkQuest(quest) }, 400);
      }
      const nextHunger = Math.max(0, Number(user.hunger ?? 100) - 1);
      const nextThirst = Math.max(0, Number(user.thirst ?? 100) - 1);
      if (answer !== challenge.answer) {
        const mistakes = Number(quest.mistakes || 0) + 1;
        const failed = mistakes >= 3;
        await DB.batch([
          DB.prepare("UPDATE work_quests SET mistakes = ?, status = ? WHERE id = ? AND user_id = ? AND status = 'posted'")
            .bind(mistakes, failed ? "failed" : "posted", quest.id, user.id),
          DB.prepare("UPDATE users SET hunger = ?, thirst = ? WHERE id = ?")
            .bind(nextHunger, nextThirst, user.id),
        ]);
        return json({
          ok: true,
          correct: false,
          failed,
          feedback: failed ? "Third mistake. The client cancelled the job." : "Wrong decision. Check the task and try again.",
          quest: publicWorkQuest({ ...quest, mistakes, status: failed ? "failed" : "posted" }),
          hunger: nextHunger,
          thirst: nextThirst,
        });
      }

      const progress = Math.min(stepsRequired, Number(quest.progress || 0) + 1);
      await DB.batch([
        DB.prepare("UPDATE work_quests SET progress = ? WHERE id = ? AND user_id = ? AND status = 'posted'")
          .bind(progress, quest.id, user.id),
        DB.prepare("UPDATE users SET hunger = ?, thirst = ? WHERE id = ?")
          .bind(nextHunger, nextThirst, user.id),
      ]);
      return json({
        ok: true,
        correct: true,
        feedback: challenge.success,
        quest: publicWorkQuest({ ...quest, progress }),
        hunger: nextHunger,
        thirst: nextThirst,
      });
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
      const stepsRequired = Number(quest.steps_required || workStepsForDifficulty(quest.difficulty));
      if (Number(quest.progress || 0) < stepsRequired) {
        return json({ error: "Finish the work task first", quest: publicWorkQuest(quest) }, 400);
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

  if (path === "/property" && request.method === "POST") {
    const data = await body();
    const action = String(data.action || "");

    if (action === "buy") {
      const listing = propertyListing(data.propertyId);
      if (!listing) return json({ error: "Property not found" }, 404);
      if (listing.price > user.wallet) return json({ error: `Need ${listing.price} wallet to buy` }, 400);
      const existing = await DB.prepare("SELECT id FROM owned_properties WHERE user_id = ? AND property_id = ?")
        .bind(user.id, listing.id).first();
      if (existing) return json({ error: "Property already owned" }, 400);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(listing.price, user.id),
        DB.prepare(`
          INSERT INTO owned_properties (id, user_id, property_id, rented_out, created_at)
          VALUES (?, ?, ?, 0, ?)
        `).bind(crypto.randomUUID(), user.id, listing.id, nowSeconds()),
      ]);
      return json({ ok: true, action, property: publicPropertyListing(listing), properties: await propertyState(user.id) });
    }

    if (action === "rentHome") {
      const listing = propertyListing(data.propertyId);
      if (!listing) return json({ error: "Property not found" }, 404);
      if (listing.deposit > user.wallet) return json({ error: `Need ${listing.deposit} wallet for deposit` }, 400);
      await DB.prepare("UPDATE users SET wallet = wallet - ?, housing = ? WHERE id = ?")
        .bind(listing.deposit, listing.id, user.id).run();
      return json({ ok: true, action, housing: publicPropertyListing(listing) });
    }

    if (action === "toggleRentOut") {
      const owned = await DB.prepare("SELECT * FROM owned_properties WHERE id = ? AND user_id = ?")
        .bind(data.ownedId, user.id).first();
      if (!owned) return json({ error: "Owned property not found" }, 404);
      const rentedOut = Number(owned.rented_out || 0) ? 0 : 1;
      await DB.prepare("UPDATE owned_properties SET rented_out = ? WHERE id = ? AND user_id = ?")
        .bind(rentedOut, owned.id, user.id).run();
      return json({ ok: true, action, rentedOut: !!rentedOut, properties: await propertyState(user.id) });
    }

    return json({ error: "Bad property action" }, 400);
  }

  if (path === "/store" && request.method === "POST") {
    const data = await body();
    const action = String(data.action || "");
    let store = await DB.prepare("SELECT * FROM retail_stores WHERE user_id = ?").bind(user.id).first();

    if (action === "buyPremises") {
      if (store) return json({ error: "You already own a store" }, 400);
      const premises = storePremises(data.premisesId);
      if (!premises) return json({ error: "Premises not found" }, 404);
      if (premises.price > user.wallet) return json({ error: `Need ${premises.price} wallet to buy premises` }, 400);
      const createdAt = nowSeconds();
      const defaultName = `${String(user.username).slice(0, 18)} Market`;
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(premises.price, user.id),
        DB.prepare(`
          INSERT INTO retail_stores (user_id, premises_id, name, last_sales_at, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(user.id, premises.id, defaultName, createdAt, createdAt),
      ]);
      return json({ ok: true, action, store: await storeState(user.id) });
    }

    if (!store) return json({ error: "Buy premises first" }, 400);
    await processStoreSales(user.id);
    store = await DB.prepare("SELECT * FROM retail_stores WHERE user_id = ?").bind(user.id).first();
    const freshUser = await userById(user.id);

    if (action === "buyEquipment") {
      const equipment = storeEquipment(data.equipmentId);
      if (!equipment) return json({ error: "Equipment not found" }, 404);
      const level = Number(store[equipment.id] || 0);
      if (level >= equipment.maxLevel) return json({ error: "Equipment already maxed" }, 400);
      const cost = storeEquipmentCost(equipment, level);
      if (cost > Number(freshUser.wallet || 0)) return json({ error: `Need ${cost} wallet for equipment` }, 400);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(cost, user.id),
        DB.prepare(`UPDATE retail_stores SET ${equipment.id} = ${equipment.id} + 1 WHERE user_id = ?`).bind(user.id),
      ]);
      return json({ ok: true, action, equipmentId: equipment.id, cost, store: await storeState(user.id) });
    }

    if (action === "restock") {
      const product = storeProduct(data.productId);
      if (!product) return json({ error: "Supplier product not found" }, 404);
      if (!storeProductUnlocked(product, store)) {
        return json({ error: `Need ${product.fixture} level ${product.fixtureLevel}` }, 400);
      }
      const quantity = clamp(money(data.quantity || 1), 1, 100);
      const stockRows = await DB.prepare("SELECT quantity FROM store_stock WHERE user_id = ?").bind(user.id).all();
      const used = stockRows.results.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
      const premises = storePremises(store.premises_id);
      const availableCapacity = Math.max(0, storeCapacity(store, premises) - used);
      if (quantity > availableCapacity) return json({ error: `Only ${availableCapacity} storage slots available` }, 400);
      const cost = product.wholesale * quantity;
      if (cost > Number(freshUser.wallet || 0)) return json({ error: `Need ${cost} wallet for stock` }, 400);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(cost, user.id),
        DB.prepare(`
          INSERT INTO store_stock (user_id, product_id, quantity)
          VALUES (?, ?, ?)
          ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity
        `).bind(user.id, product.id, quantity),
      ]);
      return json({ ok: true, action, productId: product.id, quantity, cost, store: await storeState(user.id) });
    }

    if (action === "setMarkup") {
      const markup = storeMarkup(data.markup);
      if (!markup) return json({ error: "Bad markup option" }, 400);
      await DB.prepare("UPDATE retail_stores SET markup = ? WHERE user_id = ?")
        .bind(markup.value, user.id).run();
      return json({ ok: true, action, markup: markup.value, store: await storeState(user.id) });
    }

    if (action === "rename") {
      const name = String(data.name || "").trim().replace(/\s+/g, " ");
      if (name.length < 3 || name.length > 28 || !/^[\p{L}\p{N} '.-]+$/u.test(name)) {
        return json({ error: "Store name must be 3-28 letters or numbers" }, 400);
      }
      await DB.prepare("UPDATE retail_stores SET name = ? WHERE user_id = ?").bind(name, user.id).run();
      return json({ ok: true, action, name, store: await storeState(user.id) });
    }

    return json({ error: "Bad store action" }, 400);
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
      await advanceUserDays(user, 1, nowSeconds());
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
        mistakes INTEGER NOT NULL DEFAULT 0,
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
      CREATE TABLE IF NOT EXISTS owned_properties (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        rented_out INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_owned_properties_user ON owned_properties(user_id)"),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS retail_stores (
        user_id TEXT PRIMARY KEY,
        premises_id TEXT NOT NULL,
        name TEXT NOT NULL,
        markup REAL NOT NULL DEFAULT 1,
        shelves INTEGER NOT NULL DEFAULT 0,
        fridges INTEGER NOT NULL DEFAULT 0,
        checkouts INTEGER NOT NULL DEFAULT 0,
        signage INTEGER NOT NULL DEFAULT 0,
        reputation INTEGER NOT NULL DEFAULT 50,
        lifetime_revenue INTEGER NOT NULL DEFAULT 0,
        customers_served INTEGER NOT NULL DEFAULT 0,
        last_sales_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS store_stock (
        user_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(user_id, product_id)
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS store_sales (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price INTEGER NOT NULL,
        revenue INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_store_sales_user_created ON store_sales(user_id, created_at)"),
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
  await ensureTableColumn(DB, "users", "last_daily_at", "INTEGER NOT NULL DEFAULT 0");
  await ensureTableColumn(DB, "work_quests", "description", "TEXT NOT NULL DEFAULT ''");
  await ensureTableColumn(DB, "work_quests", "objective", "TEXT NOT NULL DEFAULT ''");
  await ensureTableColumn(DB, "work_quests", "task_prompt", "TEXT NOT NULL DEFAULT ''");
  await ensureTableColumn(DB, "work_quests", "steps_required", "INTEGER NOT NULL DEFAULT 3");
  await ensureTableColumn(DB, "work_quests", "progress", "INTEGER NOT NULL DEFAULT 0");
  await ensureTableColumn(DB, "work_quests", "mistakes", "INTEGER NOT NULL DEFAULT 0");
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
