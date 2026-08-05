let runtimeTablesReady = false;

const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const BUSINESS_TYPES = [
  { id: "coffee_shop", name: "Coffee Shop", badge: "CO", price: 15000, income: 900, upkeep: 250, rating: 450, description: "A compact cafe with dependable daily traffic." },
  { id: "pizza_restaurant", name: "Pizza Restaurant", badge: "PZ", price: 35000, income: 2200, upkeep: 700, rating: 500, description: "A delivery-first restaurant with strong evening sales." },
  { id: "hotel", name: "Hotel", badge: "HT", price: 320000, income: 26000, upkeep: 9000, rating: 650, description: "Rooms, events and premium city visitors." },
  { id: "gas_station", name: "Gas Station", badge: "GS", price: 90000, income: 6000, upkeep: 2000, rating: 550, description: "Fuel and convenience sales around the clock." },
  { id: "supermarket", name: "Supermarket", badge: "SM", price: 180000, income: 13500, upkeep: 4500, rating: 600, description: "A high-volume grocery business with broad demand." },
  { id: "casino", name: "Casino", badge: "CA", price: 650000, income: 60000, upkeep: 23000, rating: 700, description: "A licensed gaming venue with large operating costs." },
  { id: "football_club", name: "Football Club", badge: "FC", price: 1200000, income: 120000, upkeep: 55000, rating: 720, description: "Tickets, sponsors and a professional squad." },
  { id: "bank", name: "Bank", badge: "BK", price: 2500000, income: 260000, upkeep: 120000, rating: 750, description: "The city's most expensive financial institution." },
];

const FORTUNE_WHEEL_SEGMENTS = [
  { label: "BANKRUPT", multiplier: 0, weight: 28 },
  { label: "LOSE", multiplier: 0, weight: 24 },
  { label: "HALF", multiplier: 0.5, weight: 16 },
  { label: "REFUND", multiplier: 1, weight: 14 },
  { label: "x1.5", multiplier: 1.5, weight: 8 },
  { label: "x2", multiplier: 2, weight: 5 },
  { label: "x3", multiplier: 3, weight: 3 },
  { label: "x5", multiplier: 5, weight: 1 },
  { label: "JACKPOT x10", multiplier: 10, weight: 1 },
];

const DICE_WIN_CHANCE = 0.1;
const CRASH_HOUSE_FACTOR = 0.82;
const FORTUNE_WIN_CHANCE = 0.18;
const SLOT_JACKPOT_CHANCE = 0.0005;
const SLOT_TRIPLE_CHANCE = 0.003;
const SLOT_ANY_WIN_CHANCE = 0.01;
const ROULETTE_WIN_CHANCE = 0.015;
const LOTTERY_TICKET_PRICE = 25;
const LOTTERY_DRAW_SECONDS = 300;
const LOTTERY_NUMBER_COUNT = 6;
const LOTTERY_MAX_NUMBER = 49;
const LOTTERY_PRIZES = { 2: 25, 3: 100, 4: 500, 5: 5000, 6: 50000 };
const MINES_GRID_SIZE = 25;
const MINES_MIN_COUNT = 3;
const BLACKJACK_SUITS = ["S", "H", "D", "C"];
const BLACKJACK_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

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
  { id: "bread", name: "Fresh Bread", wholesale: 4, basePrice: 9, demand: 10, decay: 18, fixture: "shelves", fixtureLevel: 1, color: "gold" },
  { id: "chips", name: "Matchday Chips", wholesale: 5, basePrice: 12, demand: 9, decay: 3, fixture: "shelves", fixtureLevel: 1, color: "red" },
  { id: "fruit", name: "Fruit Box", wholesale: 7, basePrice: 16, demand: 7, decay: 15, fixture: "shelves", fixtureLevel: 1, color: "green" },
  { id: "coffee", name: "Premium Coffee", wholesale: 9, basePrice: 21, demand: 6, decay: 4, fixture: "shelves", fixtureLevel: 2, color: "brown" },
  { id: "water", name: "Cold Water", wholesale: 3, basePrice: 8, demand: 11, decay: 1, fixture: "fridges", fixtureLevel: 1, color: "blue" },
  { id: "pizza", name: "Fresh Pizza", wholesale: 13, basePrice: 31, demand: 7, decay: 20, fixture: "fridges", fixtureLevel: 1, color: "red" },
  { id: "sushi", name: "Sushi Tray", wholesale: 18, basePrice: 44, demand: 5, decay: 25, fixture: "fridges", fixtureLevel: 2, color: "green" },
  { id: "steak", name: "Prime Steak", wholesale: 26, basePrice: 64, demand: 3, decay: 12, fixture: "fridges", fixtureLevel: 3, color: "gold" },
  { id: "milk", name: "Farm Milk", wholesale: 5, basePrice: 13, demand: 8, decay: 18, fixture: "fridges", fixtureLevel: 1, color: "blue" },
  { id: "energy_drink", name: "Energy Drink", wholesale: 7, basePrice: 18, demand: 9, decay: 2, fixture: "fridges", fixtureLevel: 1, color: "red" },
  { id: "cheese", name: "Aged Cheese", wholesale: 10, basePrice: 25, demand: 6, decay: 8, fixture: "fridges", fixtureLevel: 2, color: "gold" },
  { id: "ice_cream", name: "Ice Cream Box", wholesale: 12, basePrice: 30, demand: 7, decay: 10, fixture: "fridges", fixtureLevel: 2, color: "blue" },
  { id: "noodles", name: "Spicy Noodles", wholesale: 6, basePrice: 15, demand: 7, decay: 3, fixture: "shelves", fixtureLevel: 2, color: "red" },
  { id: "cake_box", name: "Rose Cake", wholesale: 16, basePrice: 39, demand: 5, decay: 16, fixture: "fridges", fixtureLevel: 3, color: "green" },
];

const STORE_EQUIPMENT = [
  { id: "shelves", name: "Display Shelves", baseCost: 3000, maxLevel: 6, capacity: 25, description: "Unlock dry goods and add 25 storage slots per level." },
  { id: "fridges", name: "Refrigerator", baseCost: 9000, maxLevel: 3, capacity: 20, description: "Unlock chilled products and add 20 storage slots per level." },
  { id: "checkouts", name: "Checkout Counter", baseCost: 7500, maxLevel: 3, capacity: 0, description: "Serve customers faster and increase store traffic." },
  { id: "signage", name: "Store Signage", baseCost: 5000, maxLevel: 3, capacity: 0, description: "Bring more people in from the street." },
];

const STORE_STAFF = [
  { id: "cashier", name: "Cashier", baseCost: 8000, maxLevel: 3, badge: "C", description: "Opens faster lanes and increases customer traffic." },
  { id: "stocker", name: "Stock Clerk", baseCost: 6000, maxLevel: 3, badge: "S", description: "Adds 20 storage slots per level and protects deliveries." },
  { id: "cleaner", name: "Cleaner", baseCost: 5000, maxLevel: 3, badge: "K", description: "Slows building wear and unlocks inspection responses." },
  { id: "security", name: "Security", baseCost: 10000, maxLevel: 3, badge: "G", description: "Prevents theft and unlocks safer incident choices." },
  { id: "manager", name: "Manager", baseCost: 15000, maxLevel: 3, badge: "M", description: "Improves traffic and handles publicity events." },
];

const STORE_INCIDENTS = [
  {
    id: "rush_hour",
    title: "Sudden Rush Hour",
    description: "A stadium crowd has entered the district and the checkout line is growing fast.",
    tone: "gold",
    choices: [
      { id: "express_lane", label: "Open express lane", detail: "+500 cash, +4 reputation", requires: "cashier", wallet: 500, reputation: 4, condition: -1 },
      { id: "all_hands", label: "All hands on deck", detail: "+220 cash, heavier wear", wallet: 220, reputation: 2, condition: -4 },
      { id: "limit_entry", label: "Limit entry", detail: "+80 cash, -1 reputation", wallet: 80, reputation: -1, condition: -1 },
    ],
  },
  {
    id: "inspection",
    title: "Surprise Inspection",
    description: "A city inspector is checking the shop floor, storage area, and customer facilities.",
    tone: "blue",
    choices: [
      { id: "clean_sweep", label: "Clean sweep", detail: "+8 condition, +7 reputation", requires: "cleaner", wallet: 0, reputation: 7, condition: 8 },
      { id: "emergency_crew", label: "Emergency crew", detail: "Costs 300, +15 condition", wallet: -300, reputation: 4, condition: 15 },
      { id: "take_notes", label: "Accept the report", detail: "No cost, -3 reputation", wallet: 0, reputation: -3, condition: 0 },
    ],
  },
  {
    id: "shoplifter",
    title: "Shoplifter Spotted",
    description: "A customer is moving toward the exit with unpaid premium goods.",
    tone: "red",
    choices: [
      { id: "security_stop", label: "Security stop", detail: "+250 recovered, +3 reputation", requires: "security", wallet: 250, reputation: 3, condition: 0 },
      { id: "lock_doors", label: "Lock the doors", detail: "+80 recovered, minor damage", wallet: 80, reputation: -1, condition: -2 },
      { id: "write_off", label: "Write off the loss", detail: "Lose 180, avoid a scene", wallet: -180, reputation: 0, condition: 0 },
    ],
  },
  {
    id: "power_outage",
    title: "Power Outage",
    description: "The refrigerators are warming up and customers are waiting in the dark.",
    tone: "blue",
    choices: [
      { id: "save_delivery", label: "Reroute chilled stock", detail: "+100 saved, minor wear", requires: "stocker", wallet: 100, reputation: 2, condition: -2 },
      { id: "electrician", label: "Call electrician", detail: "Costs 400, +10 condition", wallet: -400, reputation: 3, condition: 10 },
      { id: "wait_grid", label: "Wait for the grid", detail: "Lose 150 and condition", wallet: -150, reputation: -2, condition: -5 },
    ],
  },
  {
    id: "influencer_visit",
    title: "Influencer Visit",
    description: "A local food creator is filming inside the store and asks to feature the business.",
    tone: "green",
    choices: [
      { id: "manager_campaign", label: "Launch campaign", detail: "+450 cash, +10 reputation", requires: "manager", wallet: 450, reputation: 10, condition: -1 },
      { id: "free_samples", label: "Offer samples", detail: "Costs 250, +7 reputation", wallet: -250, reputation: 7, condition: 0 },
      { id: "decline", label: "Decline politely", detail: "No cost, -1 reputation", wallet: 0, reputation: -1, condition: 0 },
    ],
  },
  {
    id: "armed_robbery",
    title: "Armed Robbery",
    description: "A masked crew has entered the store and is trying to empty the tills.",
    tone: "red",
    choices: [
      { id: "security_alarm", label: "Trigger silent alarm", detail: "+350 recovered, +4 reputation", requires: "security", wallet: 350, reputation: 4, condition: -2 },
      { id: "protect_people", label: "Protect customers", detail: "Lose 900, +6 reputation", wallet: -900, reputation: 6, condition: -4, insurable: true },
      { id: "chase_robbers", label: "Chase the crew", detail: "Lose 500 and heavy damage", wallet: -500, reputation: -3, condition: -14, insurable: true },
    ],
  },
];

const CITY_SUPPLIERS = [
  { id: "local_coop", name: "Local Cooperative", priceFactor: 1, freshness: 95, demandBonus: 0.02, description: "Reliable local deliveries with balanced prices." },
  { id: "budget_hub", name: "Budget Hub", priceFactor: 0.82, freshness: 76, demandBonus: -0.04, description: "Cheap bulk goods with shorter shelf life." },
  { id: "premium_imports", name: "Premium Imports", priceFactor: 1.22, freshness: 100, demandBonus: 0.08, description: "Expensive products that attract premium customers." },
];

const CITY_CAMPAIGNS = [
  { id: "flyers", name: "Street Flyers", cost: 500, duration: 600, trafficBonus: 0.08 },
  { id: "radio", name: "City Radio", cost: 2500, duration: 900, trafficBonus: 0.16 },
  { id: "takeover", name: "District Takeover", cost: 10000, duration: 1200, trafficBonus: 0.25 },
];

const CITY_VEHICLES = [
  { id: "scooter", name: "Delivery Scooter", price: 25000, fuelCapacity: 60, tripFuel: 5, conditionLoss: 1, cargo: 60 },
  { id: "cargo_van", name: "Cargo Van", price: 100000, fuelCapacity: 140, tripFuel: 9, conditionLoss: 2, cargo: 180 },
  { id: "electric_truck", name: "Electric Truck", price: 400000, fuelCapacity: 260, tripFuel: 7, conditionLoss: 1, cargo: 500 },
];

const CITY_WAREHOUSES = [
  { level: 0, name: "No warehouse", capacity: 0, cost: 50000 },
  { level: 1, name: "Small Depot", capacity: 200, cost: 150000 },
  { level: 2, name: "Distribution Center", capacity: 600, cost: 500000 },
  { level: 3, name: "Automated Hub", capacity: 2000, cost: null },
];

const BLACK_MARKET_ITEMS = [
  { id: "diamond", name: "Cut Diamond", code: "DIA", price: 48000, legalPrice: 80000, resaleValue: 62000, policeRisk: 0.24, stock: 1, kind: "valuable", description: "Certified stone with its serial marks removed." },
  { id: "gold_bar", name: "Gold Bar", code: "AU", price: 28000, legalPrice: 45000, resaleValue: 35000, policeRisk: 0.18, stock: 1, kind: "valuable", description: "Investment gold offered far below the official exchange price." },
  { id: "silver_case", name: "Silver Case", code: "AG", price: 10500, legalPrice: 18000, resaleValue: 13500, policeRisk: 0.12, stock: 2, kind: "valuable", description: "Sealed case of unregistered silver ingots." },
  { id: "luxury_watch", name: "Luxury Watch", code: "WATCH", price: 34000, legalPrice: 60000, resaleValue: 46000, policeRisk: 0.22, stock: 1, kind: "valuable", description: "Rare mechanical watch without papers or receipt." },
  { id: "ancient_coin", name: "Ancient Coin", code: "COIN", price: 56000, legalPrice: 100000, resaleValue: 76000, policeRisk: 0.30, stock: 1, kind: "valuable", description: "Museum-grade coin from an anonymous private collection." },
  { id: "uncut_emerald", name: "Uncut Emerald", code: "EM", price: 39000, legalPrice: 70000, resaleValue: 52000, policeRisk: 0.26, stock: 1, kind: "valuable", description: "Large untreated gem sold through an unlicensed broker." },
  { id: "insurance_papers", name: "Insurance Papers", code: "DOC", price: 8500, legalPrice: 13000, policeRisk: 0.08, stock: 1, kind: "utility", description: "Covers 70% of insured robbery losses for 30 minutes." },
  { id: "rare_parts", name: "Rare Vehicle Parts", code: "PART", price: 4800, legalPrice: 7500, policeRisk: 0.06, stock: 2, kind: "utility", description: "Restores 30 vehicle condition." },
  { id: "supplier_pass", name: "Supplier Pass", code: "PASS", price: 6500, legalPrice: 10000, policeRisk: 0.10, stock: 1, kind: "utility", description: "Cuts supplier prices by 15% for 15 minutes." },
  { id: "repair_kit", name: "Store Repair Kit", code: "FIX", price: 4200, legalPrice: 6800, policeRisk: 0.05, stock: 2, kind: "utility", description: "Restores 20 condition at one store." },
  { id: "camera_kit", name: "Camera Kit", code: "CAM", price: 12000, legalPrice: 19000, policeRisk: 0.11, stock: 1, kind: "utility", description: "Adds one security level to a store." },
];

const CITY_NEWS = [
  { id: "heatwave", title: "Heatwave across the city", description: "Cold drinks and ice cream are selling quickly.", products: ["water", "energy_drink", "ice_cream"], multiplier: 1.65 },
  { id: "food_festival", title: "Central food festival opens", description: "Prepared food and desserts are in demand.", products: ["pizza", "sushi", "cake_box"], multiplier: 1.55 },
  { id: "supply_strike", title: "Regional supply strike", description: "Shelf-stable products are attracting more buyers.", products: ["chips", "coffee", "noodles"], multiplier: 1.45 },
  { id: "fitness_week", title: "City fitness week", description: "Fruit, water, and dairy have a temporary boost.", products: ["fruit", "water", "milk"], multiplier: 1.5 },
  { id: "quiet_week", title: "Quiet trading week", description: "No product category has a special advantage.", products: [], multiplier: 1 },
];

const CITY_COMPETITORS = [
  { premisesId: "food_cart", name: "Quick Bite Cart", strength: 0.05 },
  { premisesId: "corner_store", name: "Metro Mini Mart", strength: 0.09 },
  { premisesId: "market_hall", name: "Fresh Square", strength: 0.13 },
  { premisesId: "city_supermarket", name: "Atlas Hypermarket", strength: 0.18 },
];

const STORE_MARKUPS = [
  { value: 0.85, label: "Budget", demand: 1.18 },
  { value: 1, label: "Regular", demand: 1 },
  { value: 1.2, label: "High", demand: 0.82 },
  { value: 1.45, label: "Premium", demand: 0.62 },
];

function secureRandomInt(maxExclusive) {
  const max = Math.floor(Number(maxExclusive));
  if (!Number.isFinite(max) || max < 1 || max > 0x100000000) throw new Error("Bad random range");
  const range = 0x100000000;
  const limit = Math.floor(range / max) * max;
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return values[0] % max;
}

function secureRandomUnit() {
  return secureRandomInt(1_000_000) / 1_000_000;
}

function secureShuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = secureRandomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function lotteryNumbers() {
  return secureShuffle(Array.from({ length: LOTTERY_MAX_NUMBER }, (_, index) => index + 1))
    .slice(0, LOTTERY_NUMBER_COUNT)
    .sort((left, right) => left - right);
}

function blackjackDeck() {
  return secureShuffle(BLACKJACK_SUITS.flatMap(suit => BLACKJACK_RANKS.map(rank => `${rank}${suit}`)));
}

function blackjackHandValue(cards) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    const rank = String(card).slice(0, -1);
    if (rank === "A") {
      total += 11;
      aces += 1;
    } else if (["J", "Q", "K"].includes(rank)) {
      total += 10;
    } else {
      total += Number(rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 };
}

function minesMultiplier(mines, revealedCount) {
  let multiplier = 0.96;
  for (let index = 0; index < revealedCount; index++) {
    multiplier *= (MINES_GRID_SIZE - index) / (MINES_GRID_SIZE - mines - index);
  }
  return Math.max(1, Math.floor(multiplier * 100) / 100);
}

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
  const fixedStoreEventWaitSeconds = positiveEnvInt(env.STORE_EVENT_WAIT_SECONDS, 0);
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

  function propertyRepairCost(listing, condition) {
    const missing = Math.max(0, 100 - Number(condition ?? 100));
    return missing * Math.max(10, Math.ceil(Number(listing?.price || 0) / 10000));
  }

  function propertyRentalIncome(listing, condition) {
    const value = clamp(Number(condition ?? 100), 0, 100);
    if (value < 20) return 0;
    return Math.max(1, Math.floor(Number(listing?.income || 0) * (0.35 + value * 0.0065)));
  }

  async function propertyState(userId) {
    const rows = await DB.prepare(`
      SELECT id, property_id, rented_out, condition, created_at
      FROM owned_properties
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();
    const owned = rows.results
      .map(row => {
        const listing = propertyListing(row.property_id);
        if (!listing) return null;
        const condition = clamp(Number(row.condition ?? 100), 0, 100);
        return {
          ...publicPropertyListing(listing),
          id: row.id,
          propertyId: row.property_id,
          rentedOut: !!row.rented_out,
          condition,
          repairCost: propertyRepairCost(listing, condition),
          effectiveIncome: propertyRentalIncome(listing, condition),
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
      incomePerDay: owned.reduce((sum, item) => sum + (item.rentedOut ? item.effectiveIncome : 0), 0),
    };
  }

  async function propertyIncomePerDay(userId) {
    const rows = await DB.prepare("SELECT property_id, condition FROM owned_properties WHERE user_id = ? AND rented_out = 1")
      .bind(userId).all();
    return rows.results.reduce((sum, row) => {
      const listing = propertyListing(row.property_id);
      return sum + (listing ? propertyRentalIncome(listing, row.condition) : 0);
    }, 0);
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

  function storeStaffRole(roleId) {
    const key = housingKey(roleId);
    return STORE_STAFF.find(role => role.id === key) || null;
  }

  function storeIncidentType(incidentType) {
    const key = housingKey(incidentType);
    return STORE_INCIDENTS.find(incident => incident.id === key) || null;
  }

  function storeMarkup(value) {
    const number = Number(value);
    return STORE_MARKUPS.find(markup => Math.abs(markup.value - number) < 0.001) || null;
  }

  function storeEquipmentCost(equipment, currentLevel) {
    return equipment.baseCost * (Number(currentLevel || 0) + 1);
  }

  function storeStaffCost(role, currentLevel) {
    return role.baseCost * (Number(currentLevel || 0) + 1);
  }

  async function storeStaffLevels(storeId) {
    const rows = await DB.prepare("SELECT role_id, level FROM player_store_staff WHERE store_id = ?")
      .bind(storeId).all();
    return Object.fromEntries(rows.results.map(row => [row.role_id, Number(row.level || 0)]));
  }

  function storeCapacity(store, premises, staff = {}) {
    return Number(premises?.capacity || 0)
      + Number(store?.shelves || 0) * 25
      + Number(store?.fridges || 0) * 20
      + Number(staff.stocker || 0) * 20;
  }

  function storeSalePrice(product, markupValue) {
    return Math.max(product.wholesale + 1, Math.round(product.basePrice * Number(markupValue || 1)));
  }

  function storeProductUnlocked(product, store) {
    return Number(store?.[product.fixture] || 0) >= product.fixtureLevel;
  }

  function storeRepairCost(store) {
    const premises = storePremises(store?.premises_id);
    const missing = Math.max(0, 100 - Number(store?.condition ?? 100));
    return missing * Math.max(20, Math.ceil(Number(premises?.price || 0) / 5000));
  }

  function citySupplier(supplierId) {
    return CITY_SUPPLIERS.find(item => item.id === housingKey(supplierId)) || CITY_SUPPLIERS[0];
  }

  function cityVehicle(vehicleId) {
    return CITY_VEHICLES.find(item => item.id === housingKey(vehicleId)) || null;
  }

  function currentCityNews() {
    const cycle = Math.floor(nowSeconds() / 300);
    return { ...CITY_NEWS[cycle % CITY_NEWS.length], cycle, endsAt: (cycle + 1) * 300 };
  }

  function competitorForStore(store) {
    return CITY_COMPETITORS.find(item => item.premisesId === store.premises_id) || CITY_COMPETITORS[0];
  }

  function campaignForStore(store) {
    if (Number(store.campaign_until || 0) <= nowSeconds()) return null;
    return CITY_CAMPAIGNS.find(item => item.id === store.campaign_type) || null;
  }

  async function ensureCityProfile(userId) {
    await DB.prepare(`
      INSERT OR IGNORE INTO city_profiles (user_id, created_at)
      VALUES (?, ?)
    `).bind(userId, nowSeconds()).run();
    return await DB.prepare("SELECT * FROM city_profiles WHERE user_id = ?").bind(userId).first();
  }

  async function refreshPoliceHeat(profile) {
    const current = nowSeconds();
    const updatedAt = Number(profile.heat_updated_at || current);
    const cooled = Math.floor(Math.max(0, current - updatedAt) / 60);
    if (cooled < 1) return profile;
    const heat = Math.max(0, Number(profile.police_heat || 0) - cooled);
    await DB.prepare("UPDATE city_profiles SET police_heat = ?, heat_updated_at = ? WHERE user_id = ?")
      .bind(heat, updatedAt + cooled * 60, profile.user_id).run();
    return { ...profile, police_heat: heat, heat_updated_at: updatedAt + cooled * 60 };
  }

  function blackMarketOffers(cycle) {
    const valuables = BLACK_MARKET_ITEMS.filter(item => item.kind === "valuable");
    const utilities = BLACK_MARKET_ITEMS.filter(item => item.kind === "utility");
    const rotate = (items, salt) => items
      .map((item, index) => ({ item, sort: (cycle * salt + index * 29) % 101 }))
      .sort((a, b) => a.sort - b.sort)
      .map(entry => entry.item);
    return [...rotate(valuables, 17).slice(0, 3), ...rotate(utilities, 23).slice(0, 1)];
  }

  function blackMarketRisk(item, heat, multiplier = 1) {
    return clamp(Number(item.policeRisk || 0.05) * multiplier + Number(heat || 0) / 500, 0.03, 0.75);
  }

  async function refreshStockFreshness(table, ownerColumn, ownerId) {
    const rows = await DB.prepare(`
      SELECT product_id, quantity, freshness, freshness_updated_at
      FROM ${table} WHERE ${ownerColumn} = ? AND quantity > 0
    `).bind(ownerId).all();
    const current = nowSeconds();
    const statements = [];
    for (const row of rows.results) {
      const product = storeProduct(row.product_id);
      const updatedAt = Number(row.freshness_updated_at || current);
      const elapsedDays = Math.floor(Math.max(0, current - updatedAt) / dayLengthSeconds);
      if (!product || elapsedDays < 1) continue;
      const freshness = Math.max(0, Number(row.freshness ?? 100) - elapsedDays * Number(product.decay || 1));
      statements.push(DB.prepare(`
        UPDATE ${table}
        SET freshness = ?, freshness_updated_at = ?, quantity = CASE WHEN ? <= 0 THEN 0 ELSE quantity END
        WHERE ${ownerColumn} = ? AND product_id = ?
      `).bind(freshness, updatedAt + elapsedDays * dayLengthSeconds, freshness, ownerId, row.product_id));
    }
    if (statements.length) await DB.batch(statements);
  }

  function warehouseInfo(profile) {
    return CITY_WAREHOUSES.find(item => item.level === Number(profile?.warehouse_level || 0)) || CITY_WAREHOUSES[0];
  }

  function weightedFreshness(currentQuantity, currentFreshness, addedQuantity, addedFreshness) {
    const total = Number(currentQuantity || 0) + Number(addedQuantity || 0);
    if (total < 1) return Number(addedFreshness || 100);
    return Math.round((Number(currentQuantity || 0) * Number(currentFreshness || 100)
      + Number(addedQuantity || 0) * Number(addedFreshness || 100)) / total);
  }

  async function ensureCityAuctions() {
    const rows = await DB.prepare("SELECT * FROM property_auctions ORDER BY id").all();
    const current = nowSeconds();
    if (!rows.results.length) {
      await DB.batch(PROPERTY_LISTINGS.slice(0, 4).map((listing, index) => DB.prepare(`
        INSERT OR IGNORE INTO property_auctions
          (id, property_id, current_bid, bidder_id, ends_at, status, round, updated_at)
        VALUES (?, ?, ?, NULL, ?, 'active', 1, ?)
      `).bind(`city-auction-${index + 1}`, listing.id, Math.round(listing.price * 0.7), current + 420 + index * 60, current)));
      return;
    }
    for (const row of rows.results.filter(item => item.status === "active" && Number(item.ends_at) <= current)) {
      const claimed = await DB.prepare(`
        UPDATE property_auctions SET status = 'settling'
        WHERE id = ? AND status = 'active' AND ends_at <= ? RETURNING *
      `).bind(row.id, current).first();
      if (!claimed) continue;
      const listing = propertyListing(claimed.property_id);
      const nextIndex = (PROPERTY_LISTINGS.findIndex(item => item.id === claimed.property_id) + 4) % PROPERTY_LISTINGS.length;
      const next = PROPERTY_LISTINGS[nextIndex];
      const statements = [];
      if (claimed.bidder_id && listing) {
        statements.push(DB.prepare(`
          INSERT INTO owned_properties (id, user_id, property_id, rented_out, condition, created_at)
          VALUES (?, ?, ?, 0, 100, ?)
        `).bind(crypto.randomUUID(), claimed.bidder_id, listing.id, current));
      }
      statements.push(DB.prepare(`
        UPDATE property_auctions
        SET property_id = ?, current_bid = ?, bidder_id = NULL, ends_at = ?, status = 'active',
          round = round + 1, updated_at = ? WHERE id = ?
      `).bind(next.id, Math.round(next.price * 0.7), current + 600, current, claimed.id));
      await DB.batch(statements);
    }
  }

  async function cityState(userId) {
    const profile = await refreshPoliceHeat(await ensureCityProfile(userId));
    await ensureCityAuctions();
    await refreshStockFreshness("warehouse_stock", "user_id", userId);
    const [warehouseRows, inventoryRows, auctionRows, storeRows] = await Promise.all([
      DB.prepare("SELECT * FROM warehouse_stock WHERE user_id = ? AND quantity > 0 ORDER BY product_id").bind(userId).all(),
      DB.prepare("SELECT item_id, quantity FROM city_inventory WHERE user_id = ? AND quantity > 0 ORDER BY item_id").bind(userId).all(),
      DB.prepare("SELECT * FROM property_auctions WHERE status = 'active' ORDER BY ends_at").all(),
      DB.prepare("SELECT id, premises_id, name, supplier_id, campaign_type, campaign_until FROM player_stores WHERE user_id = ? ORDER BY created_at").bind(userId).all(),
    ]);
    const warehouse = warehouseInfo(profile);
    const warehouseUsed = warehouseRows.results.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const cycle = Math.floor(nowSeconds() / 600);
    const offers = blackMarketOffers(cycle);
    const purchaseRows = await DB.prepare("SELECT item_id, quantity FROM black_market_purchases WHERE user_id = ? AND market_cycle = ?")
      .bind(userId, cycle).all();
    const purchased = Object.fromEntries(purchaseRows.results.map(row => [row.item_id, Number(row.quantity || 0)]));
    const vehicle = cityVehicle(profile.vehicle_id);
    return {
      profile: {
        brandName: profile.brand_name,
        brandLevel: Number(profile.brand_level || 1),
        nextBrandCost: Number(profile.brand_level || 1) >= 10 ? null : 50000 * Number(profile.brand_level || 1),
        insuranceUntil: Number(profile.insurance_until || 0),
        supplierPassUntil: Number(profile.supplier_pass_until || 0),
      },
      news: currentCityNews(),
      suppliers: CITY_SUPPLIERS,
      campaigns: CITY_CAMPAIGNS,
      stores: storeRows.results.map(store => ({
        id: store.id,
        name: store.name,
        supplierId: store.supplier_id,
        supplier: citySupplier(store.supplier_id),
        campaign: campaignForStore(store) ? { ...campaignForStore(store), endsAt: Number(store.campaign_until || 0) } : null,
        competitor: competitorForStore(store),
      })),
      vehicles: CITY_VEHICLES.map(item => ({ ...item, owned: item.id === profile.vehicle_id })),
      vehicle: vehicle ? {
        ...vehicle,
        fuel: Number(profile.vehicle_fuel || 0),
        condition: Number(profile.vehicle_condition ?? 100),
        refuelCost: Math.max(0, vehicle.fuelCapacity - Number(profile.vehicle_fuel || 0)) * 5,
        repairCost: Math.max(0, 100 - Number(profile.vehicle_condition ?? 100)) * 180,
      } : null,
      warehouse: {
        ...warehouse,
        used: warehouseUsed,
        next: CITY_WAREHOUSES.find(item => item.level === warehouse.level + 1) || null,
        stock: warehouseRows.results.map(row => ({
          productId: row.product_id,
          name: storeProduct(row.product_id)?.name || row.product_id,
          quantity: Number(row.quantity || 0),
          freshness: Number(row.freshness ?? 100),
        })),
        products: STORE_PRODUCTS.map(product => ({ id: product.id, name: product.name, wholesale: product.wholesale })),
      },
      auctions: auctionRows.results.map(row => {
        const listing = propertyListing(row.property_id);
        return {
          id: row.id,
          property: listing ? publicPropertyListing(listing) : null,
          currentBid: Number(row.current_bid || 0),
          minimumBid: Number(row.current_bid || 0) + Math.max(1000, Math.ceil(Number(row.current_bid || 0) * 0.05)),
          bidderId: row.bidder_id || "",
          leading: row.bidder_id === userId,
          endsAt: Number(row.ends_at || 0),
          round: Number(row.round || 1),
        };
      }),
      blackMarket: {
        cycle,
        endsAt: (cycle + 1) * 600,
        heat: Number(profile.police_heat || 0),
        heatUpdatedAt: Number(profile.heat_updated_at || 0),
        offers: offers.map(item => ({
          ...item,
          discount: Math.round((1 - item.price / item.legalPrice) * 100),
          currentRisk: blackMarketRisk(item, profile.police_heat),
          remaining: Math.max(0, item.stock - Number(purchased[item.id] || 0)),
        })),
        inventory: inventoryRows.results.map(row => ({
          ...BLACK_MARKET_ITEMS.find(item => item.id === row.item_id),
          id: row.item_id,
          quantity: Number(row.quantity || 0),
        })),
      },
    };
  }

  function pickStoreEventWaitSeconds() {
    if (fixedStoreEventWaitSeconds > 0) return fixedStoreEventWaitSeconds;
    return 120 + Math.floor(Math.random() * 181);
  }

  function publicStoreIncident(row, staff) {
    if (!row) return null;
    const incident = storeIncidentType(row.incident_type);
    if (!incident) return null;
    return {
      id: row.id,
      type: incident.id,
      title: incident.title,
      description: incident.description,
      tone: incident.tone,
      createdAt: Number(row.created_at),
      choices: incident.choices.map(choice => ({
        id: choice.id,
        label: choice.label,
        detail: choice.detail,
        requires: choice.requires || "",
        locked: !!choice.requires && Number(staff[choice.requires] || 0) < 1,
        cost: Math.max(0, -Number(choice.wallet || 0)),
      })),
    };
  }

  async function ensureStoreIncident(store, staff) {
    let pending = await DB.prepare(`
      SELECT * FROM store_incidents
      WHERE store_id = ? AND status IN ('pending', 'resolving')
      ORDER BY created_at DESC LIMIT 1
    `).bind(store.id).first();
    if (pending || Number(store.next_event_at || 0) > nowSeconds()) return publicStoreIncident(pending, staff);
    const incident = STORE_INCIDENTS[Math.floor(Math.random() * STORE_INCIDENTS.length)];
    await DB.prepare(`
      INSERT OR IGNORE INTO store_incidents (id, store_id, user_id, incident_type, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).bind(crypto.randomUUID(), store.id, store.user_id, incident.id, nowSeconds()).run();
    pending = await DB.prepare(`
      SELECT * FROM store_incidents
      WHERE store_id = ? AND status IN ('pending', 'resolving')
      ORDER BY created_at DESC LIMIT 1
    `).bind(store.id).first();
    return publicStoreIncident(pending, staff);
  }

  async function processOneStoreSales(store) {
    const current = nowSeconds();
    const lastSalesAt = Number(store.last_sales_at || current);
    const elapsedTicks = Math.floor(Math.max(0, current - lastSalesAt) / storeSaleTickSeconds);
    const ticks = Math.min(720, elapsedTicks);
    if (ticks < 1) return store;
    const processedAt = lastSalesAt + ticks * storeSaleTickSeconds;
    const premises = storePremises(store.premises_id);
    const markup = storeMarkup(store.markup) || STORE_MARKUPS[1];
    const staff = await storeStaffLevels(store.id);
    if (Number(store.condition ?? 100) <= 10) {
      await DB.prepare("UPDATE player_stores SET last_sales_at = ? WHERE id = ?")
        .bind(processedAt, store.id).run();
      return { ...store, last_sales_at: processedAt };
    }
    await refreshStockFreshness("player_store_stock", "store_id", store.id);
    const stockRows = await DB.prepare("SELECT product_id, quantity, freshness FROM player_store_stock WHERE store_id = ? AND quantity > 0")
      .bind(store.id).all();
    const quantities = Object.fromEntries(stockRows.results.map(row => [row.product_id, Number(row.quantity)]));
    const freshness = Object.fromEntries(stockRows.results.map(row => [row.product_id, Number(row.freshness ?? 100)]));
    const available = STORE_PRODUCTS.filter(product => quantities[product.id] > 0 && freshness[product.id] > 0 && storeProductUnlocked(product, store));
    const totalStock = available.reduce((sum, product) => sum + quantities[product.id], 0);
    if (!premises || totalStock < 1) {
      await DB.prepare("UPDATE player_stores SET last_sales_at = ? WHERE id = ?")
        .bind(processedAt, store.id).run();
      return { ...store, last_sales_at: processedAt };
    }

    const profile = await ensureCityProfile(store.user_id);
    const supplier = citySupplier(store.supplier_id);
    const campaign = campaignForStore(store);
    const competitor = competitorForStore(store);
    const conditionFactor = 0.5 + clamp(Number(store.condition ?? 100), 0, 100) / 200;
    const traffic = clamp(
      (premises.traffic + Number(store.signage || 0) * 0.07 + Number(store.checkouts || 0) * 0.05
        + Number(store.reputation || 50) / 500 + Number(staff.cashier || 0) * 0.05
        + Number(staff.manager || 0) * 0.03 + supplier.demandBonus + Number(campaign?.trafficBonus || 0)
        + (Number(profile.brand_level || 1) - 1) * 0.015 - competitor.strength) * markup.demand * conditionFactor,
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
      const news = currentCityNews();
      const demandWeight = product => product.demand * Math.min(4, quantities[product.id])
        * (news.products.includes(product.id) ? news.multiplier : 1)
        * (0.7 + freshness[product.id] / 100 * 0.3);
      const totalWeight = choices.reduce((sum, product) => sum + demandWeight(product), 0);
      let roll = Math.random() * totalWeight;
      let selected = choices[0];
      for (const product of choices) {
        roll -= demandWeight(product);
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
      await DB.prepare("UPDATE player_stores SET last_sales_at = ? WHERE id = ?")
        .bind(processedAt, store.id).run();
      return { ...store, last_sales_at: processedAt };
    }

    const wear = Math.max(1, Math.ceil(served / (12 + Number(staff.cleaner || 0) * 8)));
    const statements = [
      DB.prepare("UPDATE users SET wallet = wallet + ? WHERE id = ?").bind(revenue, store.user_id),
      DB.prepare(`
        UPDATE player_stores
        SET lifetime_revenue = lifetime_revenue + ?, customers_served = customers_served + ?,
          reputation = MIN(100, reputation + ?), condition = MAX(0, condition - ?), last_sales_at = ?
        WHERE id = ?
      `).bind(revenue, served, Math.floor(served / 25), wear, processedAt, store.id),
      DB.prepare("DELETE FROM player_store_sales WHERE store_id = ? AND created_at < ?")
        .bind(store.id, current - 30 * 24 * 60 * 60),
    ];
    for (const [productId, quantity] of Object.entries(sold)) {
      const product = storeProduct(productId);
      const unitPrice = storeSalePrice(product, markup.value);
      statements.push(
        DB.prepare("UPDATE player_store_stock SET quantity = MAX(0, quantity - ?) WHERE store_id = ? AND product_id = ?")
          .bind(quantity, store.id, productId),
        DB.prepare(`
          INSERT INTO player_store_sales (id, store_id, user_id, product_id, quantity, unit_price, revenue, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(crypto.randomUUID(), store.id, store.user_id, productId, quantity, unitPrice, unitPrice * quantity, current),
      );
    }
    await DB.batch(statements);
    return await DB.prepare("SELECT * FROM player_stores WHERE id = ?").bind(store.id).first();
  }

  async function processStoreSales(userId, storeId = "") {
    const query = storeId
      ? DB.prepare("SELECT * FROM player_stores WHERE user_id = ? AND id = ?").bind(userId, storeId)
      : DB.prepare("SELECT * FROM player_stores WHERE user_id = ? ORDER BY created_at ASC").bind(userId);
    const rows = await query.all();
    for (const store of rows.results) {
      await processOneStoreSales(store);
    }
    return rows.results.length;
  }

  async function publicStoreState(store) {
    await refreshStockFreshness("player_store_stock", "store_id", store.id);
    const [stockRows, salesRows, todayRow, staffRows, incidentRows] = await Promise.all([
      DB.prepare("SELECT product_id, quantity, freshness FROM player_store_stock WHERE store_id = ? ORDER BY product_id").bind(store.id).all(),
      DB.prepare(`
        SELECT product_id, quantity, unit_price, revenue, created_at
        FROM player_store_sales
        WHERE store_id = ?
        ORDER BY created_at DESC
        LIMIT 12
      `).bind(store.id).all(),
      DB.prepare("SELECT COALESCE(SUM(revenue), 0) AS revenue FROM player_store_sales WHERE store_id = ? AND created_at >= ?")
        .bind(store.id, nowSeconds() - 24 * 60 * 60).first(),
      DB.prepare("SELECT role_id, level FROM player_store_staff WHERE store_id = ?").bind(store.id).all(),
      DB.prepare(`
        SELECT incident_type, choice_id, resolved_at
        FROM store_incidents
        WHERE store_id = ? AND status = 'resolved'
        ORDER BY resolved_at DESC LIMIT 4
      `).bind(store.id).all(),
    ]);
    const stock = Object.fromEntries(stockRows.results.map(row => [row.product_id, Number(row.quantity)]));
    const freshness = Object.fromEntries(stockRows.results.map(row => [row.product_id, Number(row.freshness ?? 100)]));
    const staff = Object.fromEntries(staffRows.results.map(row => [row.role_id, Number(row.level || 0)]));
    const premises = storePremises(store.premises_id) || STORE_PREMISES[0];
    const capacity = storeCapacity(store, premises, staff);
    const stockUsed = Object.values(stock).reduce((sum, quantity) => sum + Number(quantity), 0);
    const markup = storeMarkup(store.markup) || STORE_MARKUPS[1];
    const unlockedProducts = STORE_PRODUCTS.filter(product => storeProductUnlocked(product, store));
    const averageProfit = unlockedProducts.length
      ? unlockedProducts.reduce((sum, product) => sum + storeSalePrice(product, markup.value) - product.wholesale, 0) / unlockedProducts.length
      : 0;
    const profile = await ensureCityProfile(store.user_id);
    const supplier = citySupplier(store.supplier_id);
    const competitor = competitorForStore(store);
    const campaign = campaignForStore(store);
    const traffic = clamp(
      (premises.traffic + Number(store.signage || 0) * 0.07 + Number(store.checkouts || 0) * 0.05
        + Number(store.reputation || 50) / 500 + Number(staff.cashier || 0) * 0.05
        + Number(staff.manager || 0) * 0.03 + supplier.demandBonus + Number(campaign?.trafficBonus || 0)
        + (Number(profile.brand_level || 1) - 1) * 0.015 - competitor.strength) * markup.demand
        * (0.5 + clamp(Number(store.condition ?? 100), 0, 100) / 200),
      0.08,
      0.98,
    );
    const hasFixtures = Number(store.shelves || 0) + Number(store.fridges || 0) > 0;
    const condition = clamp(Number(store.condition ?? 100), 0, 100);
    const status = condition <= 10 ? "maintenance" : !hasFixtures ? "setup" : stockUsed < 1 ? "out_of_stock" : "open";

    return {
      id: store.id,
      name: store.name,
      premises,
      markup: markup.value,
      markupLabel: markup.label,
      markupOptions: STORE_MARKUPS.map(item => ({ value: item.value, label: item.label })),
      status,
      capacity,
      stockUsed,
      reputation: Number(store.reputation || 50),
      condition,
      repairCost: storeRepairCost(store),
      supplier,
      competitor,
      campaign,
      lifetimeRevenue: Number(store.lifetime_revenue || 0),
      customersServed: Number(store.customers_served || 0),
      todayRevenue: Number(todayRow?.revenue || 0),
      projectedHourlyProfit: Math.round((3600 / storeSaleTickSeconds) * traffic * averageProfit),
      nextSaleIn: Math.max(0, Number(store.last_sales_at || 0) + storeSaleTickSeconds - nowSeconds()),
      incident: await ensureStoreIncident(store, staff),
      incidentHistory: incidentRows.results.map(row => {
        const incident = storeIncidentType(row.incident_type);
        const choice = incident?.choices.find(item => item.id === row.choice_id);
        return {
          title: incident?.title || row.incident_type,
          choice: choice?.label || row.choice_id || "Resolved",
          resolvedAt: Number(row.resolved_at || 0),
        };
      }),
      staff: STORE_STAFF.map(role => {
        const level = Number(staff[role.id] || 0);
        return {
          ...role,
          level,
          maxed: level >= role.maxLevel,
          nextCost: level >= role.maxLevel ? null : storeStaffCost(role, level),
        };
      }),
      staffCount: Object.values(staff).reduce((sum, level) => sum + Number(level || 0), 0),
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
          freshness: Number(freshness[product.id] ?? 100),
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

  async function storeState(userId) {
    await processStoreSales(userId);
    const rows = await DB.prepare("SELECT * FROM player_stores WHERE user_id = ? ORDER BY created_at ASC")
      .bind(userId).all();
    const ownedPremises = new Set(rows.results.map(store => store.premises_id));
    const premisesListings = STORE_PREMISES.map(premises => ({
      ...premises,
      owned: ownedPremises.has(premises.id),
    }));
    const stores = [];
    for (const store of rows.results) stores.push(await publicStoreState(store));
    if (!stores.length) {
      return {
        owned: false,
        stores: [],
        maxStores: STORE_PREMISES.length,
        premisesListings,
        equipment: STORE_EQUIPMENT.map(item => ({ ...item, level: 0, nextCost: item.baseCost })),
        staff: STORE_STAFF.map(role => ({ ...role, level: 0, nextCost: role.baseCost })),
        markupOptions: STORE_MARKUPS.map(item => ({ value: item.value, label: item.label })),
      };
    }
    return {
      owned: true,
      stores,
      maxStores: STORE_PREMISES.length,
      premisesListings,
      empire: {
        locations: stores.length,
        staff: stores.reduce((sum, store) => sum + store.staffCount, 0),
        todayRevenue: stores.reduce((sum, store) => sum + store.todayRevenue, 0),
        lifetimeRevenue: stores.reduce((sum, store) => sum + store.lifetimeRevenue, 0),
        averageCondition: Math.round(stores.reduce((sum, store) => sum + store.condition, 0) / stores.length),
        activeIncidents: stores.filter(store => store.incident).length,
      },
      ...stores[0],
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

    await DB.batch([
      DB.prepare(`
        UPDATE users
        SET wallet = ?, day = ?, debt = ?, rating = ?, loan_due = ?,
          hunger = ?, thirst = ?, rent_due = ?, housing = ?, last_daily_at = ?
        WHERE id = ?
      `).bind(wallet, day, debt, rating, due, hunger, thirst, rentDue, housing.id, current, user.id),
      DB.prepare(`
        UPDATE owned_properties
        SET condition = MAX(0, condition - ? * CASE WHEN rented_out = 1 THEN 4 ELSE 1 END)
        WHERE user_id = ?
      `).bind(days, user.id),
    ]);
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

  function businessType(typeId) {
    const id = String(typeId || "").trim().toLowerCase();
    return BUSINESS_TYPES.find(item => item.id === id) || null;
  }

  function businessNumbers(type, level) {
    const safeLevel = clamp(Number(level || 1), 1, 10);
    const income = Math.round(type.income * (1 + (safeLevel - 1) * 0.55));
    const upkeep = Math.round(type.upkeep * (1 + (safeLevel - 1) * 0.35));
    return {
      income,
      upkeep,
      netIncome: Math.max(0, income - upkeep),
      upgradeCost: safeLevel >= 10 ? null : Math.round(type.price * (0.7 + safeLevel * 0.45)),
    };
  }

  function businessAccrual(row, type, current = nowSeconds()) {
    const lastCollect = Number(row.last_collect || row.created_at || current);
    const elapsed = Math.max(0, current - lastCollect);
    const completedDays = Math.min(7, Math.floor(elapsed / dayLengthSeconds));
    const numbers = businessNumbers(type, row.level);
    return {
      completedDays,
      accrued: completedDays * numbers.netIncome,
      nextCollectIn: completedDays >= 7 ? 0 : Math.max(0, dayLengthSeconds - (elapsed % dayLengthSeconds)),
      ...numbers,
    };
  }

  async function businessState(userId) {
    const rows = await DB.prepare(`
      SELECT id, business_type, name, level, last_collect, created_at
      FROM player_businesses
      WHERE user_id = ?
      ORDER BY created_at
    `).bind(userId).all();
    const current = nowSeconds();
    const ownedByType = new Map(rows.results.map(row => [row.business_type, row]));
    const catalog = BUSINESS_TYPES.map(type => {
      const owned = ownedByType.get(type.id);
      if (!owned) return { ...type, owned: false };
      return {
        ...type,
        owned: true,
        businessId: owned.id,
        businessName: owned.name,
        level: Number(owned.level),
        ...businessAccrual(owned, type, current),
      };
    });
    return {
      catalog,
      owned: catalog.filter(item => item.owned),
      totalNetPerDay: catalog.filter(item => item.owned).reduce((sum, item) => sum + item.netIncome, 0),
      totalAccrued: catalog.filter(item => item.owned).reduce((sum, item) => sum + item.accrued, 0),
      dayLengthSeconds,
    };
  }

  async function recordCasinoPlay(userId, game, bet, payout, result) {
    await DB.prepare(`
      INSERT INTO casino_plays (id, user_id, game, bet, payout, result, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), userId, game, bet, payout, String(result || "").slice(0, 240), nowSeconds()).run();
  }

  function publicMinesGame(row) {
    if (!row) return null;
    const revealed = JSON.parse(row.revealed_positions || "[]");
    const multiplier = minesMultiplier(Number(row.mines), revealed.length);
    return {
      id: row.id,
      bet: Number(row.bet),
      mines: Number(row.mines),
      revealed,
      status: row.status,
      multiplier,
      payout: Number(row.payout || 0),
      cashout: row.status === "active" ? Math.floor(Number(row.bet) * multiplier) : Number(row.payout || 0),
      createdAt: Number(row.created_at),
      gridSize: MINES_GRID_SIZE,
    };
  }

  function publicBlackjackGame(row) {
    if (!row) return null;
    const playerCards = JSON.parse(row.player_cards || "[]");
    const dealerCards = JSON.parse(row.dealer_cards || "[]");
    const active = row.status === "active";
    return {
      id: row.id,
      bet: Number(row.bet),
      status: row.status,
      payout: Number(row.payout || 0),
      playerCards,
      playerValue: blackjackHandValue(playerCards).total,
      dealerCards: active && dealerCards.length > 1 ? [dealerCards[0], "??"] : dealerCards,
      dealerValue: active ? blackjackHandValue(dealerCards.slice(0, 1)).total : blackjackHandValue(dealerCards).total,
      createdAt: Number(row.created_at),
    };
  }

  async function casinoState(userId) {
    const [mines, blackjack, plays] = await Promise.all([
      DB.prepare("SELECT * FROM casino_mines_games WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1").bind(userId).first(),
      DB.prepare("SELECT * FROM casino_blackjack_games WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1").bind(userId).first(),
      DB.prepare(`
        SELECT game, bet, payout, result, created_at
        FROM casino_plays
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 12
      `).bind(userId).all(),
    ]);
    return {
      mines: publicMinesGame(mines),
      blackjack: publicBlackjackGame(blackjack),
      fortuneSegments: FORTUNE_WHEEL_SEGMENTS.map(({ weight, ...segment }) => segment),
      recent: plays.results.map(play => ({
        game: play.game,
        bet: Number(play.bet),
        payout: Number(play.payout),
        result: play.result,
        createdAt: Number(play.created_at),
      })),
    };
  }

  function ticketNumbers(value) {
    if (!Array.isArray(value) || value.length !== LOTTERY_NUMBER_COUNT) return null;
    const numbers = value.map(number => Math.floor(Number(number))).sort((left, right) => left - right);
    if (numbers.some(number => !Number.isFinite(number) || number < 1 || number > LOTTERY_MAX_NUMBER)) return null;
    if (new Set(numbers).size !== LOTTERY_NUMBER_COUNT) return null;
    return numbers;
  }

  function lotteryPrize(matches) {
    return Number(LOTTERY_PRIZES[matches] || 0);
  }

  async function settleLotteryDraws() {
    const current = nowSeconds();
    const due = await DB.prepare(`
      SELECT id, draw_at
      FROM lottery_draws
      WHERE status = 'open' AND draw_at <= ?
      ORDER BY draw_at
      LIMIT 5
    `).bind(current).all();
    for (const draw of due.results) {
      const claim = await DB.prepare("UPDATE lottery_draws SET status = 'drawing' WHERE id = ? AND status = 'open'")
        .bind(draw.id).run();
      if (!Number(claim.meta?.changes || 0)) continue;
      try {
        const winning = lotteryNumbers();
        const tickets = await DB.prepare(`
          SELECT id, user_id, numbers
          FROM lottery_tickets
          WHERE draw_id = ? AND status = 'pending'
        `).bind(draw.id).all();
        const payouts = new Map();
        const statements = [
          DB.prepare("UPDATE lottery_draws SET winning_numbers = ?, status = 'closed' WHERE id = ?")
            .bind(JSON.stringify(winning), draw.id),
        ];
        for (const ticket of tickets.results) {
          const selected = JSON.parse(ticket.numbers || "[]");
          const matches = selected.filter(number => winning.includes(number)).length;
          const prize = lotteryPrize(matches);
          statements.push(DB.prepare(`
            UPDATE lottery_tickets
            SET status = ?, matches = ?, prize = ?
            WHERE id = ?
          `).bind(prize > 0 ? "won" : "lost", matches, prize, ticket.id));
          if (prize > 0) payouts.set(ticket.user_id, (payouts.get(ticket.user_id) || 0) + prize);
        }
        for (const [winnerId, payout] of payouts) {
          statements.push(DB.prepare("UPDATE users SET wallet = wallet + ? WHERE id = ?").bind(payout, winnerId));
        }
        await DB.batch(statements);
      } catch (error) {
        await DB.prepare("UPDATE lottery_draws SET status = 'open' WHERE id = ? AND status = 'drawing'").bind(draw.id).run();
        throw error;
      }
    }
  }

  async function lotteryState(userId) {
    await settleLotteryDraws();
    const current = nowSeconds();
    const nextDrawAt = Math.floor(current / LOTTERY_DRAW_SECONDS) * LOTTERY_DRAW_SECONDS + LOTTERY_DRAW_SECONDS;
    const tickets = await DB.prepare(`
      SELECT lottery_tickets.id, lottery_tickets.numbers, lottery_tickets.status,
        lottery_tickets.matches, lottery_tickets.prize, lottery_tickets.purchased_at,
        lottery_draws.draw_at, lottery_draws.winning_numbers
      FROM lottery_tickets
      JOIN lottery_draws ON lottery_draws.id = lottery_tickets.draw_id
      WHERE lottery_tickets.user_id = ?
      ORDER BY lottery_tickets.purchased_at DESC
      LIMIT 12
    `).bind(userId).all();
    return {
      ticketPrice: LOTTERY_TICKET_PRICE,
      nextDrawAt,
      maxNumber: LOTTERY_MAX_NUMBER,
      numberCount: LOTTERY_NUMBER_COUNT,
      tickets: tickets.results.map(ticket => ({
        id: ticket.id,
        numbers: JSON.parse(ticket.numbers || "[]"),
        status: ticket.status,
        matches: Number(ticket.matches || 0),
        prize: Number(ticket.prize || 0),
        purchasedAt: Number(ticket.purchased_at),
        drawAt: Number(ticket.draw_at),
        winningNumbers: ticket.winning_numbers ? JSON.parse(ticket.winning_numbers) : null,
      })),
    };
  }

  async function finishBlackjack(row, playerCards, dealerCards, deck) {
    const claim = await DB.prepare("UPDATE casino_blackjack_games SET status = 'resolving' WHERE id = ? AND status = 'active'")
      .bind(row.id).run();
    if (!Number(claim.meta?.changes || 0)) throw new Error("Blackjack hand is already settled");
    while (true) {
      const dealerValue = blackjackHandValue(dealerCards);
      if (dealerValue.total > 17 || (dealerValue.total === 17 && !dealerValue.soft)) break;
      dealerCards.push(deck.pop());
    }
    const playerValue = blackjackHandValue(playerCards).total;
    const dealerValue = blackjackHandValue(dealerCards).total;
    let status = "lost";
    let payout = 0;
    if (playerValue <= 21 && (dealerValue > 21 || playerValue > dealerValue)) {
      status = "won";
      payout = Number(row.bet) * 2;
    } else if (playerValue <= 21 && playerValue === dealerValue) {
      status = "push";
      payout = Number(row.bet);
    }
    const statements = [DB.prepare(`
      UPDATE casino_blackjack_games
      SET deck = ?, player_cards = ?, dealer_cards = ?, status = ?, payout = ?
      WHERE id = ? AND status = 'resolving'
    `).bind(JSON.stringify(deck), JSON.stringify(playerCards), JSON.stringify(dealerCards), status, payout, row.id)];
    if (payout > 0) statements.push(DB.prepare("UPDATE users SET wallet = wallet + ? WHERE id = ?").bind(payout, row.user_id));
    try {
      await DB.batch(statements);
    } catch (error) {
      await DB.prepare("UPDATE casino_blackjack_games SET status = 'active' WHERE id = ? AND status = 'resolving'").bind(row.id).run();
      throw error;
    }
    await recordCasinoPlay(row.user_id, "blackjack", Number(row.bet), payout, `${status} ${playerValue}-${dealerValue}`);
    return publicBlackjackGame({ ...row, deck: JSON.stringify(deck), player_cards: JSON.stringify(playerCards), dealer_cards: JSON.stringify(dealerCards), status, payout });
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
      response.city = await cityState(user.id);
      response.businesses = await businessState(user.id);
      response.casino = await casinoState(user.id);
      response.lottery = await lotteryState(user.id);
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
          INSERT INTO owned_properties (id, user_id, property_id, rented_out, condition, created_at)
          VALUES (?, ?, ?, 0, 100, ?)
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
      if (rentedOut && Number(owned.condition ?? 100) < 20) {
        return json({ error: "Repair this apartment before renting it out" }, 400);
      }
      await DB.prepare("UPDATE owned_properties SET rented_out = ? WHERE id = ? AND user_id = ?")
        .bind(rentedOut, owned.id, user.id).run();
      return json({ ok: true, action, rentedOut: !!rentedOut, properties: await propertyState(user.id) });
    }

    if (action === "repair") {
      const owned = await DB.prepare("SELECT * FROM owned_properties WHERE id = ? AND user_id = ?")
        .bind(data.ownedId, user.id).first();
      if (!owned) return json({ error: "Owned property not found" }, 404);
      const listing = propertyListing(owned.property_id);
      if (!listing) return json({ error: "Property listing not found" }, 404);
      const cost = propertyRepairCost(listing, owned.condition);
      if (cost < 1) return json({ ok: true, action, cost: 0, properties: await propertyState(user.id) });
      if (cost > Number(user.wallet || 0)) return json({ error: `Need ${cost} wallet for repairs` }, 400);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(cost, user.id),
        DB.prepare("UPDATE owned_properties SET condition = 100 WHERE id = ? AND user_id = ?").bind(owned.id, user.id),
      ]);
      return json({ ok: true, action, cost, properties: await propertyState(user.id) });
    }

    return json({ error: "Bad property action" }, 400);
  }

  if (path === "/store" && request.method === "POST") {
    const data = await body();
    const action = String(data.action || "");

    if (action === "buyPremises") {
      const premises = storePremises(data.premisesId);
      if (!premises) return json({ error: "Premises not found" }, 404);
      const existing = await DB.prepare("SELECT id FROM player_stores WHERE user_id = ? AND premises_id = ?")
        .bind(user.id, premises.id).first();
      if (existing) return json({ error: "You already own this retail location" }, 400);
      if (premises.price > user.wallet) return json({ error: `Need ${premises.price} wallet to buy premises` }, 400);
      const createdAt = nowSeconds();
      const storeId = crypto.randomUUID();
      const defaultName = `${String(user.username).slice(0, 14)} ${premises.name}`.slice(0, 28);
      const nextEventAt = createdAt + pickStoreEventWaitSeconds();
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(premises.price, user.id),
        DB.prepare(`
          INSERT INTO player_stores (id, user_id, premises_id, name, last_sales_at, next_event_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(storeId, user.id, premises.id, defaultName, createdAt, nextEventAt, createdAt),
      ]);
      const state = await storeState(user.id);
      return json({ ok: true, action, storeId, location: state.stores.find(item => item.id === storeId), store: state });
    }

    let store = data.storeId
      ? await DB.prepare("SELECT * FROM player_stores WHERE id = ? AND user_id = ?").bind(String(data.storeId), user.id).first()
      : await DB.prepare("SELECT * FROM player_stores WHERE user_id = ? ORDER BY created_at ASC").bind(user.id).first();
    if (!store) return json({ error: "Buy premises first" }, 400);
    await processStoreSales(user.id, store.id);
    store = await DB.prepare("SELECT * FROM player_stores WHERE id = ? AND user_id = ?").bind(store.id, user.id).first();
    const freshUser = await userById(user.id);

    if (action === "hireStaff") {
      const role = storeStaffRole(data.roleId);
      if (!role) return json({ error: "Staff role not found" }, 404);
      const staff = await storeStaffLevels(store.id);
      const level = Number(staff[role.id] || 0);
      if (level >= role.maxLevel) return json({ error: "Staff role already maxed" }, 400);
      const cost = storeStaffCost(role, level);
      if (cost > Number(freshUser.wallet || 0)) return json({ error: `Need ${cost} wallet to hire or train staff` }, 400);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(cost, user.id),
        DB.prepare(`
          INSERT INTO player_store_staff (store_id, role_id, level)
          VALUES (?, ?, 1)
          ON CONFLICT(store_id, role_id) DO UPDATE SET level = level + 1
        `).bind(store.id, role.id),
      ]);
      return json({ ok: true, action, roleId: role.id, level: level + 1, cost, store: await storeState(user.id) });
    }

    if (action === "resolveIncident") {
      const incidentRow = await DB.prepare(`
        SELECT * FROM store_incidents
        WHERE id = ? AND store_id = ? AND user_id = ? AND status = 'pending'
      `).bind(String(data.incidentId || ""), store.id, user.id).first();
      if (!incidentRow) return json({ error: "Active store incident not found" }, 404);
      const incident = storeIncidentType(incidentRow.incident_type);
      const choice = incident?.choices.find(item => item.id === String(data.choiceId || ""));
      if (!incident || !choice) return json({ error: "Incident choice not found" }, 400);
      const staff = await storeStaffLevels(store.id);
      if (choice.requires && Number(staff[choice.requires] || 0) < 1) {
        return json({ error: `Hire ${storeStaffRole(choice.requires)?.name || choice.requires} to use this choice` }, 400);
      }
      const cityProfile = await ensureCityProfile(user.id);
      const insured = !!choice.insurable && Number(cityProfile.insurance_until || 0) > nowSeconds();
      const walletDelta = insured ? Math.ceil(Number(choice.wallet || 0) * 0.3) : Number(choice.wallet || 0);
      if (walletDelta < 0 && Number(freshUser.wallet || 0) < Math.abs(walletDelta)) {
        return json({ error: `Need ${Math.abs(walletDelta)} wallet for this response` }, 400);
      }
      const current = nowSeconds();
      const claimed = await DB.prepare(`
        UPDATE store_incidents SET status = 'resolving'
        WHERE id = ? AND status = 'pending'
        RETURNING id
      `).bind(incidentRow.id).first();
      if (!claimed) return json({ error: "This incident was already resolved" }, 409);
      try {
        await DB.batch([
          DB.prepare("UPDATE users SET wallet = wallet + ? WHERE id = ?").bind(walletDelta, user.id),
          DB.prepare(`
            UPDATE player_stores
            SET reputation = MIN(100, MAX(0, reputation + ?)),
              condition = MIN(100, MAX(0, condition + ?)),
              lifetime_revenue = lifetime_revenue + ?, next_event_at = ?
            WHERE id = ?
          `).bind(Number(choice.reputation || 0), Number(choice.condition || 0), Math.max(0, walletDelta),
            current + pickStoreEventWaitSeconds(), store.id),
          DB.prepare(`
            UPDATE store_incidents
            SET status = 'resolved', choice_id = ?, resolved_at = ?
            WHERE id = ? AND status = 'resolving'
          `).bind(choice.id, current, incidentRow.id),
        ]);
      } catch (error) {
        await DB.prepare("UPDATE store_incidents SET status = 'pending' WHERE id = ? AND status = 'resolving'")
          .bind(incidentRow.id).run();
        throw error;
      }
      return json({
        ok: true,
        action,
        outcome: { title: incident.title, choice: choice.label, walletDelta, insured },
        store: await storeState(user.id),
      });
    }

    if (action === "buyEquipment") {
      const equipment = storeEquipment(data.equipmentId);
      if (!equipment) return json({ error: "Equipment not found" }, 404);
      const level = Number(store[equipment.id] || 0);
      if (level >= equipment.maxLevel) return json({ error: "Equipment already maxed" }, 400);
      const cost = storeEquipmentCost(equipment, level);
      if (cost > Number(freshUser.wallet || 0)) return json({ error: `Need ${cost} wallet for equipment` }, 400);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(cost, user.id),
        DB.prepare(`UPDATE player_stores SET ${equipment.id} = ${equipment.id} + 1 WHERE id = ?`).bind(store.id),
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
      const stockRows = await DB.prepare("SELECT quantity FROM player_store_stock WHERE store_id = ?").bind(store.id).all();
      const used = stockRows.results.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
      const premises = storePremises(store.premises_id);
      const staff = await storeStaffLevels(store.id);
      const availableCapacity = Math.max(0, storeCapacity(store, premises, staff) - used);
      if (quantity > availableCapacity) return json({ error: `Only ${availableCapacity} storage slots available` }, 400);
      const cityProfile = await ensureCityProfile(user.id);
      const supplier = citySupplier(store.supplier_id);
      const passDiscount = Number(cityProfile.supplier_pass_until || 0) > nowSeconds() ? 0.85 : 1;
      const cost = Math.ceil(product.wholesale * quantity * supplier.priceFactor * passDiscount);
      if (cost > Number(freshUser.wallet || 0)) return json({ error: `Need ${cost} wallet for stock` }, 400);
      const existingStock = await DB.prepare("SELECT quantity, freshness FROM player_store_stock WHERE store_id = ? AND product_id = ?")
        .bind(store.id, product.id).first();
      const freshness = weightedFreshness(existingStock?.quantity, existingStock?.freshness, quantity, supplier.freshness);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(cost, user.id),
        DB.prepare(`
          INSERT INTO player_store_stock (store_id, product_id, quantity, freshness, freshness_updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(store_id, product_id) DO UPDATE SET
            quantity = quantity + excluded.quantity,
            freshness = excluded.freshness,
            freshness_updated_at = excluded.freshness_updated_at
        `).bind(store.id, product.id, quantity, freshness, nowSeconds()),
      ]);
      return json({ ok: true, action, productId: product.id, quantity, cost, store: await storeState(user.id) });
    }

    if (action === "setMarkup") {
      const markup = storeMarkup(data.markup);
      if (!markup) return json({ error: "Bad markup option" }, 400);
      await DB.prepare("UPDATE player_stores SET markup = ? WHERE id = ?")
        .bind(markup.value, store.id).run();
      return json({ ok: true, action, markup: markup.value, store: await storeState(user.id) });
    }

    if (action === "rename") {
      const name = String(data.name || "").trim().replace(/\s+/g, " ");
      if (name.length < 3 || name.length > 28 || !/^[\p{L}\p{N} '.-]+$/u.test(name)) {
        return json({ error: "Store name must be 3-28 letters or numbers" }, 400);
      }
      await DB.prepare("UPDATE player_stores SET name = ? WHERE id = ?").bind(name, store.id).run();
      return json({ ok: true, action, name, store: await storeState(user.id) });
    }

    if (action === "repair") {
      const cost = storeRepairCost(store);
      if (cost < 1) return json({ ok: true, action, cost: 0, store: await storeState(user.id) });
      if (cost > Number(freshUser.wallet || 0)) return json({ error: `Need ${cost} wallet for repairs` }, 400);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(cost, user.id),
        DB.prepare("UPDATE player_stores SET condition = 100 WHERE id = ?").bind(store.id),
      ]);
      return json({ ok: true, action, cost, store: await storeState(user.id) });
    }

    return json({ error: "Bad store action" }, 400);
  }

  if (path === "/city" && request.method === "POST") {
    const data = await body();
    const action = String(data.action || "");
    const profile = await refreshPoliceHeat(await ensureCityProfile(user.id));
    const freshUser = await userById(user.id);
    let cityOutcome = null;
    const ownedStore = async () => {
      if (!data.storeId) return null;
      return await DB.prepare("SELECT * FROM player_stores WHERE id = ? AND user_id = ?")
        .bind(String(data.storeId), user.id).first();
    };

    if (action === "setSupplier") {
      const store = await ownedStore();
      const supplier = CITY_SUPPLIERS.find(item => item.id === String(data.supplierId || ""));
      if (!store || !supplier) return json({ error: "Store or supplier not found" }, 404);
      await DB.prepare("UPDATE player_stores SET supplier_id = ? WHERE id = ?").bind(supplier.id, store.id).run();
    } else if (action === "startCampaign") {
      const store = await ownedStore();
      const campaign = CITY_CAMPAIGNS.find(item => item.id === String(data.campaignId || ""));
      if (!store || !campaign) return json({ error: "Store or campaign not found" }, 404);
      if (campaign.cost > Number(freshUser.wallet || 0)) return json({ error: `Need ${campaign.cost} wallet` }, 400);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(campaign.cost, user.id),
        DB.prepare("UPDATE player_stores SET campaign_type = ?, campaign_until = ? WHERE id = ?")
          .bind(campaign.id, nowSeconds() + campaign.duration, store.id),
      ]);
    } else if (action === "renameBrand") {
      const name = String(data.name || "").trim().replace(/\s+/g, " ");
      if (name.length < 3 || name.length > 28 || !/^[\p{L}\p{N} '.-]+$/u.test(name)) {
        return json({ error: "Brand name must be 3-28 letters or numbers" }, 400);
      }
      await DB.prepare("UPDATE city_profiles SET brand_name = ? WHERE user_id = ?").bind(name, user.id).run();
    } else if (action === "upgradeBrand") {
      const level = Number(profile.brand_level || 1);
      if (level >= 10) return json({ error: "Brand is already max level" }, 400);
      const cost = 50000 * level;
      if (cost > Number(freshUser.wallet || 0)) return json({ error: `Need ${cost} wallet` }, 400);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(cost, user.id),
        DB.prepare("UPDATE city_profiles SET brand_level = brand_level + 1 WHERE user_id = ?").bind(user.id),
      ]);
    } else if (action === "buyVehicle") {
      const vehicle = cityVehicle(data.vehicleId);
      if (!vehicle) return json({ error: "Vehicle not found" }, 404);
      if (vehicle.price > Number(freshUser.wallet || 0)) return json({ error: `Need ${vehicle.price} wallet` }, 400);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(vehicle.price, user.id),
        DB.prepare(`
          UPDATE city_profiles SET vehicle_id = ?, vehicle_fuel = ?, vehicle_condition = 100 WHERE user_id = ?
        `).bind(vehicle.id, vehicle.fuelCapacity, user.id),
      ]);
    } else if (action === "refuelVehicle" || action === "repairVehicle") {
      const vehicle = cityVehicle(profile.vehicle_id);
      if (!vehicle) return json({ error: "Buy a vehicle first" }, 400);
      const cost = action === "refuelVehicle"
        ? Math.max(0, vehicle.fuelCapacity - Number(profile.vehicle_fuel || 0)) * 5
        : Math.max(0, 100 - Number(profile.vehicle_condition ?? 100)) * 180;
      if (cost > Number(freshUser.wallet || 0)) return json({ error: `Need ${cost} wallet` }, 400);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(cost, user.id),
        action === "refuelVehicle"
          ? DB.prepare("UPDATE city_profiles SET vehicle_fuel = ? WHERE user_id = ?").bind(vehicle.fuelCapacity, user.id)
          : DB.prepare("UPDATE city_profiles SET vehicle_condition = 100 WHERE user_id = ?").bind(user.id),
      ]);
    } else if (action === "upgradeWarehouse") {
      const current = warehouseInfo(profile);
      const next = CITY_WAREHOUSES.find(item => item.level === current.level + 1);
      if (!next) return json({ error: "Warehouse is already max level" }, 400);
      if (Number(current.cost || 0) > Number(freshUser.wallet || 0)) return json({ error: `Need ${current.cost} wallet` }, 400);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(current.cost, user.id),
        DB.prepare("UPDATE city_profiles SET warehouse_level = ? WHERE user_id = ?").bind(next.level, user.id),
      ]);
    } else if (action === "buyWarehouseStock") {
      const warehouse = warehouseInfo(profile);
      if (warehouse.capacity < 1) return json({ error: "Buy a warehouse first" }, 400);
      const product = storeProduct(data.productId);
      const supplier = citySupplier(data.supplierId);
      const quantity = clamp(money(data.quantity || 1), 1, 500);
      if (!product) return json({ error: "Product not found" }, 404);
      const usedRow = await DB.prepare("SELECT COALESCE(SUM(quantity), 0) AS used FROM warehouse_stock WHERE user_id = ?")
        .bind(user.id).first();
      if (Number(usedRow?.used || 0) + quantity > warehouse.capacity) return json({ error: "Warehouse capacity exceeded" }, 400);
      const vehicle = cityVehicle(profile.vehicle_id);
      if (vehicle && (Number(profile.vehicle_fuel || 0) < vehicle.tripFuel || Number(profile.vehicle_condition || 0) <= 5)) {
        return json({ error: "Vehicle needs fuel or repair" }, 400);
      }
      if (vehicle && quantity > vehicle.cargo) return json({ error: `Vehicle cargo limit is ${vehicle.cargo}` }, 400);
      const discount = Number(profile.supplier_pass_until || 0) > nowSeconds() ? 0.85 : 1;
      const deliveryFee = vehicle ? 0 : 250 + quantity * 2;
      const cost = Math.ceil(product.wholesale * supplier.priceFactor * discount * quantity) + deliveryFee;
      if (cost > Number(freshUser.wallet || 0)) return json({ error: `Need ${cost} wallet` }, 400);
      const existing = await DB.prepare("SELECT quantity, freshness FROM warehouse_stock WHERE user_id = ? AND product_id = ?")
        .bind(user.id, product.id).first();
      const freshness = weightedFreshness(existing?.quantity, existing?.freshness, quantity, supplier.freshness);
      const statements = [
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(cost, user.id),
        DB.prepare(`
          INSERT INTO warehouse_stock (user_id, product_id, quantity, freshness, freshness_updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity,
            freshness = excluded.freshness, freshness_updated_at = excluded.freshness_updated_at
        `).bind(user.id, product.id, quantity, freshness, nowSeconds()),
      ];
      if (vehicle) statements.push(DB.prepare(`
        UPDATE city_profiles SET vehicle_fuel = MAX(0, vehicle_fuel - ?),
          vehicle_condition = MAX(0, vehicle_condition - ?) WHERE user_id = ?
      `).bind(vehicle.tripFuel, vehicle.conditionLoss, user.id));
      await DB.batch(statements);
    } else if (action === "transferWarehouseStock") {
      const store = await ownedStore();
      const product = storeProduct(data.productId);
      const quantity = clamp(money(data.quantity || 1), 1, 500);
      if (!store || !product) return json({ error: "Store or product not found" }, 404);
      if (!storeProductUnlocked(product, store)) return json({ error: `Need ${product.fixture} level ${product.fixtureLevel}` }, 400);
      const warehouseStock = await DB.prepare("SELECT * FROM warehouse_stock WHERE user_id = ? AND product_id = ?")
        .bind(user.id, product.id).first();
      if (quantity > Number(warehouseStock?.quantity || 0)) return json({ error: "Not enough warehouse stock" }, 400);
      const stockRows = await DB.prepare("SELECT quantity FROM player_store_stock WHERE store_id = ?").bind(store.id).all();
      const staff = await storeStaffLevels(store.id);
      const available = storeCapacity(store, storePremises(store.premises_id), staff)
        - stockRows.results.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
      if (quantity > available) return json({ error: `Only ${Math.max(0, available)} store slots available` }, 400);
      const vehicle = cityVehicle(profile.vehicle_id);
      const deliveryCost = vehicle ? 0 : 100 + quantity;
      if (vehicle && (quantity > vehicle.cargo || Number(profile.vehicle_fuel || 0) < vehicle.tripFuel)) {
        return json({ error: "Vehicle cargo or fuel is insufficient" }, 400);
      }
      if (deliveryCost > Number(freshUser.wallet || 0)) return json({ error: `Need ${deliveryCost} wallet` }, 400);
      const existing = await DB.prepare("SELECT quantity, freshness FROM player_store_stock WHERE store_id = ? AND product_id = ?")
        .bind(store.id, product.id).first();
      const freshness = weightedFreshness(existing?.quantity, existing?.freshness, quantity, warehouseStock.freshness);
      const statements = [
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(deliveryCost, user.id),
        DB.prepare("UPDATE warehouse_stock SET quantity = quantity - ? WHERE user_id = ? AND product_id = ?")
          .bind(quantity, user.id, product.id),
        DB.prepare(`
          INSERT INTO player_store_stock (store_id, product_id, quantity, freshness, freshness_updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(store_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity,
            freshness = excluded.freshness, freshness_updated_at = excluded.freshness_updated_at
        `).bind(store.id, product.id, quantity, freshness, nowSeconds()),
      ];
      if (vehicle) statements.push(DB.prepare(`
        UPDATE city_profiles SET vehicle_fuel = MAX(0, vehicle_fuel - ?),
          vehicle_condition = MAX(0, vehicle_condition - ?) WHERE user_id = ?
      `).bind(vehicle.tripFuel, vehicle.conditionLoss, user.id));
      await DB.batch(statements);
    } else if (action === "blackMarketBuy") {
      const item = BLACK_MARKET_ITEMS.find(entry => entry.id === String(data.itemId || ""));
      const cycle = Math.floor(nowSeconds() / 600);
      const offeredIds = blackMarketOffers(cycle).map(entry => entry.id);
      if (!item || !offeredIds.includes(item.id)) return json({ error: "Item is not on sale this cycle" }, 404);
      const purchased = await DB.prepare("SELECT quantity FROM black_market_purchases WHERE user_id = ? AND item_id = ? AND market_cycle = ?")
        .bind(user.id, item.id, cycle).first();
      if (Number(purchased?.quantity || 0) >= item.stock) return json({ error: "Offer sold out" }, 400);
      if (item.price > Number(freshUser.wallet || 0)) return json({ error: `Need ${item.price} wallet` }, 400);
      const risk = blackMarketRisk(item, profile.police_heat);
      const caught = Math.random() < risk;
      const fine = caught ? Math.ceil(Number(item.legalPrice || item.price) * 0.12 + risk * 1000) : 0;
      const statements = [
        DB.prepare(`
          INSERT INTO black_market_purchases (user_id, item_id, market_cycle, quantity) VALUES (?, ?, ?, 1)
          ON CONFLICT(user_id, item_id, market_cycle) DO UPDATE SET quantity = quantity + 1
        `).bind(user.id, item.id, cycle),
      ];
      if (caught) {
        statements.push(
          DB.prepare("UPDATE users SET wallet = MAX(0, wallet - ?) WHERE id = ?").bind(item.price + fine, user.id),
          DB.prepare("UPDATE city_profiles SET police_heat = MIN(100, police_heat + 25), heat_updated_at = ? WHERE user_id = ?")
            .bind(nowSeconds(), user.id),
        );
        cityOutcome = { type: "police", caught: true, item: item.name, fine, lost: item.price, risk };
      } else {
        statements.push(
          DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(item.price, user.id),
          DB.prepare("UPDATE city_profiles SET police_heat = MIN(100, police_heat + 4), heat_updated_at = ? WHERE user_id = ?")
            .bind(nowSeconds(), user.id),
          DB.prepare(`
          INSERT INTO city_inventory (user_id, item_id, quantity) VALUES (?, ?, 1)
          ON CONFLICT(user_id, item_id) DO UPDATE SET quantity = quantity + 1
          `).bind(user.id, item.id),
        );
        cityOutcome = { type: "deal", caught: false, item: item.name, paid: item.price, saved: item.legalPrice - item.price, risk };
      }
      await DB.batch(statements);
    } else if (action === "sellContraband") {
      const item = BLACK_MARKET_ITEMS.find(entry => entry.id === String(data.itemId || "") && entry.kind === "valuable");
      const inventory = item && await DB.prepare("SELECT quantity FROM city_inventory WHERE user_id = ? AND item_id = ?")
        .bind(user.id, item.id).first();
      if (!item || Number(inventory?.quantity || 0) < 1) return json({ error: "Valuable not in inventory" }, 404);
      const risk = blackMarketRisk(item, profile.police_heat, 0.65);
      const caught = Math.random() < risk;
      const fine = caught ? Math.ceil(item.legalPrice * 0.16) : 0;
      const statements = [
        DB.prepare("UPDATE city_inventory SET quantity = quantity - 1 WHERE user_id = ? AND item_id = ?").bind(user.id, item.id),
        DB.prepare("UPDATE city_profiles SET police_heat = MIN(100, police_heat + ?), heat_updated_at = ? WHERE user_id = ?")
          .bind(caught ? 30 : 7, nowSeconds(), user.id),
      ];
      if (caught) {
        statements.push(DB.prepare("UPDATE users SET wallet = MAX(0, wallet - ?) WHERE id = ?").bind(fine, user.id));
        cityOutcome = { type: "police", caught: true, item: item.name, fine, confiscated: true, risk };
      } else {
        statements.push(DB.prepare("UPDATE users SET wallet = wallet + ? WHERE id = ?").bind(item.resaleValue, user.id));
        cityOutcome = { type: "sale", caught: false, item: item.name, received: item.resaleValue, risk };
      }
      await DB.batch(statements);
    } else if (action === "useBlackMarketItem") {
      const item = BLACK_MARKET_ITEMS.find(entry => entry.id === String(data.itemId || ""));
      const inventory = item && await DB.prepare("SELECT quantity FROM city_inventory WHERE user_id = ? AND item_id = ?")
        .bind(user.id, item.id).first();
      if (!item || Number(inventory?.quantity || 0) < 1) return json({ error: "Item not in inventory" }, 404);
      if (item.kind === "valuable") return json({ error: "Valuables can be sold, not used" }, 400);
      const statements = [DB.prepare("UPDATE city_inventory SET quantity = quantity - 1 WHERE user_id = ? AND item_id = ?")
        .bind(user.id, item.id)];
      if (item.id === "insurance_papers") {
        statements.push(DB.prepare("UPDATE city_profiles SET insurance_until = ? WHERE user_id = ?").bind(nowSeconds() + 1800, user.id));
      } else if (item.id === "supplier_pass") {
        statements.push(DB.prepare("UPDATE city_profiles SET supplier_pass_until = ? WHERE user_id = ?").bind(nowSeconds() + 900, user.id));
      } else if (item.id === "rare_parts") {
        if (!cityVehicle(profile.vehicle_id)) return json({ error: "Buy a vehicle first" }, 400);
        statements.push(DB.prepare("UPDATE city_profiles SET vehicle_condition = MIN(100, vehicle_condition + 30) WHERE user_id = ?").bind(user.id));
      } else {
        const store = await ownedStore();
        if (!store) return json({ error: "Choose one of your stores" }, 400);
        if (item.id === "repair_kit") statements.push(DB.prepare("UPDATE player_stores SET condition = MIN(100, condition + 20) WHERE id = ?").bind(store.id));
        if (item.id === "camera_kit") statements.push(DB.prepare(`
          INSERT INTO player_store_staff (store_id, role_id, level) VALUES (?, 'security', 1)
          ON CONFLICT(store_id, role_id) DO UPDATE SET level = MIN(3, level + 1)
        `).bind(store.id));
      }
      await DB.batch(statements);
    } else if (action === "auctionBid") {
      await ensureCityAuctions();
      const auction = await DB.prepare("SELECT * FROM property_auctions WHERE id = ? AND status = 'active' AND ends_at > ?")
        .bind(String(data.auctionId || ""), nowSeconds()).first();
      if (!auction) return json({ error: "Auction has ended" }, 400);
      const minimum = Number(auction.current_bid || 0) + Math.max(1000, Math.ceil(Number(auction.current_bid || 0) * 0.05));
      const bid = Math.max(0, money(data.amount || 0));
      if (bid < minimum) return json({ error: `Minimum bid is ${minimum}` }, 400);
      const ownIncrease = auction.bidder_id === user.id ? bid - Number(auction.current_bid || 0) : bid;
      if (ownIncrease > Number(freshUser.wallet || 0)) return json({ error: `Need ${ownIncrease} wallet` }, 400);
      const statements = [
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(ownIncrease, user.id),
        DB.prepare(`
          UPDATE property_auctions SET current_bid = ?, bidder_id = ?, updated_at = ?,
            ends_at = CASE WHEN ends_at - ? < 30 THEN ? + 30 ELSE ends_at END
          WHERE id = ? AND status = 'active'
        `).bind(bid, user.id, nowSeconds(), nowSeconds(), nowSeconds(), auction.id),
      ];
      if (auction.bidder_id && auction.bidder_id !== user.id) {
        statements.push(DB.prepare("UPDATE users SET wallet = wallet + ? WHERE id = ?")
          .bind(Number(auction.current_bid || 0), auction.bidder_id));
      }
      await DB.batch(statements);
    } else {
      return json({ error: "Bad city action" }, 400);
    }

    return json({ ok: true, action, outcome: cityOutcome, city: await cityState(user.id), store: await storeState(user.id) });
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

  if (path === "/business" && request.method === "POST") {
    const data = await body();
    const action = String(data.action || "");
    const type = businessType(data.businessType);
    if (!type) return json({ error: "Unknown business" }, 404);
    const existing = await DB.prepare("SELECT * FROM player_businesses WHERE user_id = ? AND business_type = ?")
      .bind(user.id, type.id).first();
    const freshUser = await userById(user.id);
    const current = nowSeconds();

    if (action === "buy") {
      if (existing) return json({ error: "Business already owned" }, 400);
      if (Number(freshUser.rating) < type.rating) return json({ error: `Credit rating ${type.rating} required` }, 400);
      if (Number(freshUser.wallet) < type.price) return json({ error: `Need ${type.price} wallet` }, 400);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(type.price, user.id),
        DB.prepare(`
          INSERT INTO player_businesses (id, user_id, business_type, name, level, last_collect, created_at)
          VALUES (?, ?, ?, ?, 1, ?, ?)
        `).bind(crypto.randomUUID(), user.id, type.id, type.name, current, current),
      ]);
    } else if (action === "collect") {
      if (!existing) return json({ error: "Buy this business first" }, 400);
      const accrual = businessAccrual(existing, type, current);
      if (accrual.accrued < 1) return json({ error: `Income is not ready. Wait ${accrual.nextCollectIn}s` }, 400);
      const elapsed = Math.max(0, current - Number(existing.last_collect || current));
      const newLastCollect = current - (elapsed % dayLengthSeconds);
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet + ? WHERE id = ?").bind(accrual.accrued, user.id),
        DB.prepare("UPDATE player_businesses SET last_collect = ? WHERE id = ?").bind(newLastCollect, existing.id),
      ]);
    } else if (action === "upgrade") {
      if (!existing) return json({ error: "Buy this business first" }, 400);
      const accrual = businessAccrual(existing, type, current);
      if (!accrual.upgradeCost) return json({ error: "Business is at maximum level" }, 400);
      if (Number(freshUser.wallet) + accrual.accrued < accrual.upgradeCost) {
        return json({ error: `Need ${accrual.upgradeCost} wallet` }, 400);
      }
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet + ? - ? WHERE id = ?")
          .bind(accrual.accrued, accrual.upgradeCost, user.id),
        DB.prepare("UPDATE player_businesses SET level = level + 1, last_collect = ? WHERE id = ?")
          .bind(current, existing.id),
      ]);
    } else {
      return json({ error: "Bad business action" }, 400);
    }
    return json({ ok: true, businesses: await businessState(user.id) });
  }

  if (path === "/lottery" && request.method === "POST") {
    const data = await body();
    if (String(data.action || "") !== "buy") return json({ error: "Bad lottery action" }, 400);
    const selected = data.numbers === undefined || data.numbers === null || data.numbers.length === 0
      ? lotteryNumbers()
      : ticketNumbers(data.numbers);
    if (!selected) return json({ error: `Choose ${LOTTERY_NUMBER_COUNT} unique numbers from 1 to ${LOTTERY_MAX_NUMBER}` }, 400);
    const freshUser = await userById(user.id);
    if (Number(freshUser.wallet) < LOTTERY_TICKET_PRICE) return json({ error: `Ticket costs ${LOTTERY_TICKET_PRICE}` }, 400);
    const current = nowSeconds();
    const drawAt = Math.floor(current / LOTTERY_DRAW_SECONDS) * LOTTERY_DRAW_SECONDS + LOTTERY_DRAW_SECONDS;
    const drawId = `draw-${drawAt}`;
    const ticketId = crypto.randomUUID();
    await DB.batch([
      DB.prepare(`
        INSERT OR IGNORE INTO lottery_draws (id, draw_at, winning_numbers, status)
        VALUES (?, ?, NULL, 'open')
      `).bind(drawId, drawAt),
      DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(LOTTERY_TICKET_PRICE, user.id),
      DB.prepare(`
        INSERT INTO lottery_tickets (
          id, user_id, draw_id, numbers, price, status, matches, prize, purchased_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', 0, 0, ?)
      `).bind(ticketId, user.id, drawId, JSON.stringify(selected), LOTTERY_TICKET_PRICE, current),
    ]);
    return json({ ok: true, ticket: { id: ticketId, numbers: selected, drawAt, price: LOTTERY_TICKET_PRICE }, lottery: await lotteryState(user.id) });
  }

  if (path === "/casino/dice" && request.method === "POST") {
    const data = await body();
    const amount = money(data.amount);
    const chosen = money(data.number);
    if (amount < 1 || amount > user.wallet) return json({ error: "Bad amount / not enough wallet" }, 400);
    if (chosen < 1 || chosen > 6) return json({ error: "Choose a dice number from 1 to 6" }, 400);
    const result = secureRandomUnit() < DICE_WIN_CHANCE
      ? chosen
      : [1, 2, 3, 4, 5, 6].filter(number => number !== chosen)[secureRandomInt(5)];
    const multiplier = result === chosen ? 5.5 : 0;
    const win = Math.floor(amount * multiplier);
    await DB.prepare("UPDATE users SET wallet = wallet - ? + ? WHERE id = ?").bind(amount, win, user.id).run();
    await recordCasinoPlay(user.id, "dice", amount, win, `picked ${chosen}, rolled ${result}`);
    return json({ result, chosen, multiplier, win, winChance: DICE_WIN_CHANCE });
  }

  if (path === "/casino/crash" && request.method === "POST") {
    const data = await body();
    const amount = money(data.amount);
    const target = Math.floor(Number(data.target) * 100) / 100;
    if (amount < 1 || amount > user.wallet) return json({ error: "Bad amount / not enough wallet" }, 400);
    if (!Number.isFinite(target) || target < 1.2 || target > 10) return json({ error: "Cash-out target must be 1.20x to 10.00x" }, 400);
    const crashPoint = Math.max(1, Math.min(50, Math.floor((CRASH_HOUSE_FACTOR / (1 - secureRandomUnit())) * 100) / 100));
    const won = crashPoint >= target;
    const win = won ? Math.floor(amount * target) : 0;
    await DB.prepare("UPDATE users SET wallet = wallet - ? + ? WHERE id = ?").bind(amount, win, user.id).run();
    await recordCasinoPlay(user.id, "crash", amount, win, `target ${target.toFixed(2)}x, crash ${crashPoint.toFixed(2)}x`);
    return json({ target, crashPoint, won, win, houseFactor: CRASH_HOUSE_FACTOR, winChance: CRASH_HOUSE_FACTOR / target });
  }

  if (path === "/casino/wheel" && request.method === "POST") {
    const data = await body();
    const amount = money(data.amount);
    if (amount < 1 || amount > user.wallet) return json({ error: "Bad amount / not enough wallet" }, 400);
    const totalWeight = FORTUNE_WHEEL_SEGMENTS.reduce((sum, segment) => sum + segment.weight, 0);
    let roll = secureRandomInt(totalWeight);
    let segmentIndex = 0;
    for (let index = 0; index < FORTUNE_WHEEL_SEGMENTS.length; index++) {
      if (roll < FORTUNE_WHEEL_SEGMENTS[index].weight) {
        segmentIndex = index;
        break;
      }
      roll -= FORTUNE_WHEEL_SEGMENTS[index].weight;
    }
    const segment = FORTUNE_WHEEL_SEGMENTS[segmentIndex];
    const win = Math.floor(amount * segment.multiplier);
    await DB.prepare("UPDATE users SET wallet = wallet - ? + ? WHERE id = ?").bind(amount, win, user.id).run();
    await recordCasinoPlay(user.id, "wheel", amount, win, segment.label);
    return json({ segmentIndex, label: segment.label, multiplier: segment.multiplier, win, winChance: FORTUNE_WIN_CHANCE });
  }

  if (path === "/casino/mines" && request.method === "POST") {
    const data = await body();
    const action = String(data.action || "");
    let game = await DB.prepare("SELECT * FROM casino_mines_games WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1")
      .bind(user.id).first();

    if (action === "start") {
      if (game) return json({ error: "Finish the active Mines game first" }, 400);
      const amount = money(data.amount);
      const mineCount = money(data.mines);
      if (amount < 1 || amount > user.wallet) return json({ error: "Bad amount / not enough wallet" }, 400);
      if (mineCount < MINES_MIN_COUNT || mineCount > 20) return json({ error: `Choose ${MINES_MIN_COUNT} to 20 mines` }, 400);
      const positions = secureShuffle(Array.from({ length: MINES_GRID_SIZE }, (_, index) => index)).slice(0, mineCount);
      game = {
        id: crypto.randomUUID(), user_id: user.id, bet: amount, mines: mineCount,
        mine_positions: JSON.stringify(positions), revealed_positions: "[]", status: "active", payout: 0, created_at: nowSeconds(),
      };
      await DB.batch([
        DB.prepare("UPDATE users SET wallet = wallet - ? WHERE id = ?").bind(amount, user.id),
        DB.prepare(`
          INSERT INTO casino_mines_games (
            id, user_id, bet, mines, mine_positions, revealed_positions, status, payout, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'active', 0, ?)
        `).bind(game.id, user.id, amount, mineCount, game.mine_positions, game.revealed_positions, game.created_at),
      ]);
      return json({ game: publicMinesGame(game) });
    }

    if (!game) return json({ error: "No active Mines game" }, 404);
    if (action === "reveal") {
      const position = money(data.position);
      if (position < 0 || position >= MINES_GRID_SIZE) return json({ error: "Bad tile" }, 400);
      const mines = JSON.parse(game.mine_positions || "[]");
      const revealed = JSON.parse(game.revealed_positions || "[]");
      if (revealed.includes(position)) return json({ game: publicMinesGame(game), alreadyRevealed: true });
      revealed.push(position);
      if (mines.includes(position)) {
        await DB.prepare("UPDATE casino_mines_games SET revealed_positions = ?, status = 'lost' WHERE id = ?")
          .bind(JSON.stringify(revealed), game.id).run();
        await recordCasinoPlay(user.id, "mines", Number(game.bet), 0, `mine at ${position + 1}`);
        return json({ game: publicMinesGame({ ...game, revealed_positions: JSON.stringify(revealed), status: "lost" }), hitMine: true, mineIndex: position });
      }
      const wonBoard = revealed.length >= MINES_GRID_SIZE - Number(game.mines);
      const multiplier = minesMultiplier(Number(game.mines), revealed.length);
      const payout = wonBoard ? Math.floor(Number(game.bet) * multiplier) : 0;
      const statements = [DB.prepare("UPDATE casino_mines_games SET revealed_positions = ?, status = ?, payout = ? WHERE id = ?")
        .bind(JSON.stringify(revealed), wonBoard ? "won" : "active", payout, game.id)];
      if (payout > 0) statements.push(DB.prepare("UPDATE users SET wallet = wallet + ? WHERE id = ?").bind(payout, user.id));
      await DB.batch(statements);
      if (wonBoard) await recordCasinoPlay(user.id, "mines", Number(game.bet), payout, "cleared board");
      return json({ game: publicMinesGame({ ...game, revealed_positions: JSON.stringify(revealed), status: wonBoard ? "won" : "active", payout }), cleared: wonBoard });
    }
    if (action === "cashout") {
      const revealed = JSON.parse(game.revealed_positions || "[]");
      if (!revealed.length) return json({ error: "Reveal at least one safe tile" }, 400);
      const multiplier = minesMultiplier(Number(game.mines), revealed.length);
      const payout = Math.floor(Number(game.bet) * multiplier);
      const claim = await DB.prepare("UPDATE casino_mines_games SET status = 'resolving' WHERE id = ? AND status = 'active'")
        .bind(game.id).run();
      if (!Number(claim.meta?.changes || 0)) return json({ error: "Mines game is already settled" }, 409);
      try {
        await DB.batch([
          DB.prepare("UPDATE casino_mines_games SET status = 'cashed_out', payout = ? WHERE id = ? AND status = 'resolving'").bind(payout, game.id),
          DB.prepare("UPDATE users SET wallet = wallet + ? WHERE id = ?").bind(payout, user.id),
        ]);
      } catch (error) {
        await DB.prepare("UPDATE casino_mines_games SET status = 'active' WHERE id = ? AND status = 'resolving'").bind(game.id).run();
        throw error;
      }
      await recordCasinoPlay(user.id, "mines", Number(game.bet), payout, `cashed out ${multiplier.toFixed(2)}x`);
      return json({ game: publicMinesGame({ ...game, status: "cashed_out", payout }) });
    }
    return json({ error: "Bad Mines action" }, 400);
  }

  if (path === "/casino/blackjack" && request.method === "POST") {
    const data = await body();
    const action = String(data.action || "");
    let game = await DB.prepare("SELECT * FROM casino_blackjack_games WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1")
      .bind(user.id).first();

    if (action === "start") {
      if (game) return json({ error: "Finish the active Blackjack hand first" }, 400);
      const amount = money(data.amount);
      if (amount < 1 || amount > user.wallet) return json({ error: "Bad amount / not enough wallet" }, 400);
      const deck = blackjackDeck();
      const playerCards = [deck.pop(), deck.pop()];
      const dealerCards = [deck.pop(), deck.pop()];
      const playerNatural = blackjackHandValue(playerCards).total === 21;
      const dealerNatural = blackjackHandValue(dealerCards).total === 21;
      let status = "active";
      let payout = 0;
      if (playerNatural || dealerNatural) {
        if (playerNatural && dealerNatural) {
          status = "push";
          payout = amount;
        } else if (playerNatural) {
          status = "blackjack";
          payout = Math.floor(amount * 2.2);
        } else {
          status = "lost";
        }
      }
      game = {
        id: crypto.randomUUID(), user_id: user.id, bet: amount, deck: JSON.stringify(deck),
        player_cards: JSON.stringify(playerCards), dealer_cards: JSON.stringify(dealerCards), status, payout, created_at: nowSeconds(),
      };
      const statements = [
        DB.prepare("UPDATE users SET wallet = wallet - ? + ? WHERE id = ?").bind(amount, payout, user.id),
        DB.prepare(`
          INSERT INTO casino_blackjack_games (
            id, user_id, bet, deck, player_cards, dealer_cards, status, payout, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(game.id, user.id, amount, game.deck, game.player_cards, game.dealer_cards, status, payout, game.created_at),
      ];
      await DB.batch(statements);
      if (status !== "active") await recordCasinoPlay(user.id, "blackjack", amount, payout, status);
      return json({ game: publicBlackjackGame(game) });
    }

    if (!game) return json({ error: "No active Blackjack hand" }, 404);
    const deck = JSON.parse(game.deck || "[]");
    const playerCards = JSON.parse(game.player_cards || "[]");
    const dealerCards = JSON.parse(game.dealer_cards || "[]");
    if (action === "hit") {
      playerCards.push(deck.pop());
      const value = blackjackHandValue(playerCards).total;
      if (value > 21) {
        await DB.prepare("UPDATE casino_blackjack_games SET deck = ?, player_cards = ?, status = 'bust' WHERE id = ? AND status = 'active'")
          .bind(JSON.stringify(deck), JSON.stringify(playerCards), game.id).run();
        await recordCasinoPlay(user.id, "blackjack", Number(game.bet), 0, `bust ${value}`);
        return json({ game: publicBlackjackGame({ ...game, deck: JSON.stringify(deck), player_cards: JSON.stringify(playerCards), status: "bust" }) });
      }
      if (value === 21) return json({ game: await finishBlackjack(game, playerCards, dealerCards, deck) });
      await DB.prepare("UPDATE casino_blackjack_games SET deck = ?, player_cards = ? WHERE id = ? AND status = 'active'")
        .bind(JSON.stringify(deck), JSON.stringify(playerCards), game.id).run();
      return json({ game: publicBlackjackGame({ ...game, deck: JSON.stringify(deck), player_cards: JSON.stringify(playerCards) }) });
    }
    if (action === "stand") return json({ game: await finishBlackjack(game, playerCards, dealerCards, deck) });
    return json({ error: "Bad Blackjack action" }, 400);
  }

  if (path === "/casino/slot" && request.method === "POST") {
    const data = await body();
    const amount = money(data.amount);
    if (amount < 1 || amount > user.wallet) return json({ error: "Bad amount / not enough wallet" }, 400);

    const symbols = ["DIAMOND", "SEVEN", "CROWN", "BAR", "STAR", "CHERRY"];
    const triplePayouts = { DIAMOND: 200, SEVEN: 80, CROWN: 35, BAR: 15, STAR: 10, CHERRY: 6 };
    const pick = items => items[secureRandomInt(items.length)];
    const lossReels = () => secureShuffle(symbols).slice(0, 3);
    const pairReels = () => {
      const pair = pick(symbols);
      const other = pick(symbols.filter(symbol => symbol !== pair));
      const reels = [pair, pair, pair];
      reels[secureRandomInt(3)] = other;
      return reels;
    };

    const roll = secureRandomUnit();
    let reels = lossReels();
    let mult = 0;
    let label = "LOSS";

    if (roll < SLOT_JACKPOT_CHANCE) {
      reels = ["DIAMOND", "DIAMOND", "DIAMOND"];
      mult = triplePayouts.DIAMOND;
      label = "JACKPOT";
    } else if (roll < SLOT_TRIPLE_CHANCE) {
      const symbol = pick(symbols.filter(item => item !== "DIAMOND"));
      reels = [symbol, symbol, symbol];
      mult = triplePayouts[symbol];
      label = symbol;
    } else if (roll < SLOT_ANY_WIN_CHANCE) {
      reels = pairReels();
      mult = 2;
      label = "PAIR";
    }

    const win = Math.floor(amount * mult);
    await DB.prepare("UPDATE users SET wallet=wallet-?+? WHERE id=?").bind(amount, win, user.id).run();
    await recordCasinoPlay(user.id, "slot", amount, win, `${label}: ${reels.join("-")}`);
    return json({ reels, mult, win, label, odds: { jackpot: SLOT_JACKPOT_CHANCE, anyWin: SLOT_ANY_WIN_CHANCE } });
  }

  if (path === "/casino/roulette" && request.method === "POST") {
    const data = await body();
    const amount = money(data.amount);
    const chosen = money(data.number);
    if (amount < 1 || amount > user.wallet) return json({ error: "Bad amount / not enough wallet" }, 400);
    if (chosen < 0 || chosen > 36) return json({ error: "Choose 0-36" }, 400);
    const hit = secureRandomUnit() < ROULETTE_WIN_CHANCE;
    const losingNumbers = ROULETTE_NUMBERS.filter(number => number !== chosen);
    const result = hit ? chosen : losingNumbers[secureRandomInt(losingNumbers.length)];
    const slotIndex = ROULETTE_NUMBERS.indexOf(result);
    const mult = chosen === result ? (result === 0 ? 36 : 5) : 0;
    const win = amount * mult;
    await DB.prepare("UPDATE users SET wallet=wallet-?+? WHERE id=?").bind(amount, win, user.id).run();
    await recordCasinoPlay(user.id, "roulette", amount, win, `picked ${chosen}, result ${result}`);
    return json({ result, slotIndex, wheel: ROULETTE_NUMBERS, mult, win, winChance: ROULETTE_WIN_CHANCE });
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
        condition INTEGER NOT NULL DEFAULT 100,
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
      CREATE TABLE IF NOT EXISTS player_stores (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        premises_id TEXT NOT NULL,
        name TEXT NOT NULL,
        markup REAL NOT NULL DEFAULT 1,
        shelves INTEGER NOT NULL DEFAULT 0,
        fridges INTEGER NOT NULL DEFAULT 0,
        checkouts INTEGER NOT NULL DEFAULT 0,
        signage INTEGER NOT NULL DEFAULT 0,
        reputation INTEGER NOT NULL DEFAULT 50,
        condition INTEGER NOT NULL DEFAULT 100,
        lifetime_revenue INTEGER NOT NULL DEFAULT 0,
        customers_served INTEGER NOT NULL DEFAULT 0,
        last_sales_at INTEGER NOT NULL,
        next_event_at INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS player_store_stock (
        store_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(store_id, product_id)
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS player_store_sales (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price INTEGER NOT NULL,
        revenue INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_player_stores_user ON player_stores(user_id)"),
    DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_player_stores_user_premises ON player_stores(user_id, premises_id)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_player_store_sales_store_created ON player_store_sales(store_id, created_at)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_player_store_sales_user_created ON player_store_sales(user_id, created_at)"),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS player_store_staff (
        store_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(store_id, role_id)
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS store_incidents (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        incident_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        choice_id TEXT,
        created_at INTEGER NOT NULL,
        resolved_at INTEGER
      )
    `),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_store_incidents_store_status ON store_incidents(store_id, status)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_store_incidents_user_created ON store_incidents(user_id, created_at)"),
    DB.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_store_incidents_one_pending
      ON store_incidents(store_id) WHERE status IN ('pending', 'resolving')
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS city_profiles (
        user_id TEXT PRIMARY KEY,
        brand_name TEXT NOT NULL DEFAULT 'Independent Retail',
        brand_level INTEGER NOT NULL DEFAULT 1,
        vehicle_id TEXT NOT NULL DEFAULT '',
        vehicle_fuel INTEGER NOT NULL DEFAULT 0,
        vehicle_condition INTEGER NOT NULL DEFAULT 100,
        warehouse_level INTEGER NOT NULL DEFAULT 0,
        insurance_until INTEGER NOT NULL DEFAULT 0,
        supplier_pass_until INTEGER NOT NULL DEFAULT 0,
        police_heat INTEGER NOT NULL DEFAULT 0,
        heat_updated_at INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS warehouse_stock (
        user_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0,
        freshness INTEGER NOT NULL DEFAULT 100, freshness_updated_at INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(user_id, product_id)
      )
    `),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_warehouse_stock_user ON warehouse_stock(user_id)"),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS city_inventory (
        user_id TEXT NOT NULL, item_id TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(user_id, item_id)
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS black_market_purchases (
        user_id TEXT NOT NULL, item_id TEXT NOT NULL, market_cycle INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id, item_id, market_cycle)
      )
    `),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_black_market_cycle ON black_market_purchases(market_cycle)"),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS property_auctions (
        id TEXT PRIMARY KEY, property_id TEXT NOT NULL, current_bid INTEGER NOT NULL,
        bidder_id TEXT, ends_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active',
        round INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL
      )
    `),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_property_auctions_ends ON property_auctions(status, ends_at)"),
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
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS player_businesses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        business_type TEXT NOT NULL,
        name TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        last_collect INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(user_id, business_type)
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS casino_plays (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        game TEXT NOT NULL,
        bet INTEGER NOT NULL,
        payout INTEGER NOT NULL DEFAULT 0,
        result TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS casino_mines_games (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        bet INTEGER NOT NULL,
        mines INTEGER NOT NULL,
        mine_positions TEXT NOT NULL,
        revealed_positions TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'active',
        payout INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS casino_blackjack_games (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        bet INTEGER NOT NULL,
        deck TEXT NOT NULL,
        player_cards TEXT NOT NULL,
        dealer_cards TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        payout INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS lottery_draws (
        id TEXT PRIMARY KEY,
        draw_at INTEGER NOT NULL,
        winning_numbers TEXT,
        status TEXT NOT NULL DEFAULT 'open'
      )
    `),
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS lottery_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        draw_id TEXT NOT NULL,
        numbers TEXT NOT NULL,
        price INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        matches INTEGER NOT NULL DEFAULT 0,
        prize INTEGER NOT NULL DEFAULT 0,
        purchased_at INTEGER NOT NULL
      )
    `),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_market_holdings_symbol ON market_holdings(symbol)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_market_trades_user_created ON market_trades(user_id, created_at)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_market_history_symbol_time ON market_history(symbol, recorded_at)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_player_businesses_user ON player_businesses(user_id)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_casino_plays_user_created ON casino_plays(user_id, created_at)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_casino_mines_user_status ON casino_mines_games(user_id, status)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_casino_blackjack_user_status ON casino_blackjack_games(user_id, status)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_lottery_draws_status_time ON lottery_draws(status, draw_at)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_lottery_tickets_user_time ON lottery_tickets(user_id, purchased_at)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_lottery_tickets_draw ON lottery_tickets(draw_id, status)"),
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
  await ensureTableColumn(DB, "owned_properties", "condition", "INTEGER NOT NULL DEFAULT 100");
  await ensureTableColumn(DB, "player_stores", "next_event_at", "INTEGER NOT NULL DEFAULT 0");
  await ensureTableColumn(DB, "player_stores", "supplier_id", "TEXT NOT NULL DEFAULT 'local_coop'");
  await ensureTableColumn(DB, "player_stores", "campaign_type", "TEXT NOT NULL DEFAULT ''");
  await ensureTableColumn(DB, "player_stores", "campaign_until", "INTEGER NOT NULL DEFAULT 0");
  await ensureTableColumn(DB, "player_store_stock", "freshness", "INTEGER NOT NULL DEFAULT 100");
  await ensureTableColumn(DB, "player_store_stock", "freshness_updated_at", "INTEGER NOT NULL DEFAULT 0");
  await ensureTableColumn(DB, "city_profiles", "police_heat", "INTEGER NOT NULL DEFAULT 0");
  await ensureTableColumn(DB, "city_profiles", "heat_updated_at", "INTEGER NOT NULL DEFAULT 0");
  await DB.batch([
    DB.prepare(`
      INSERT OR IGNORE INTO player_stores (
        id, user_id, premises_id, name, markup, shelves, fridges, checkouts, signage,
        reputation, condition, lifetime_revenue, customers_served, last_sales_at, created_at
      )
      SELECT 'legacy-' || user_id, user_id, premises_id, name, markup, shelves, fridges, checkouts, signage,
        reputation, 100, lifetime_revenue, customers_served, last_sales_at, created_at
      FROM retail_stores
    `),
    DB.prepare(`
      INSERT OR IGNORE INTO player_store_stock (store_id, product_id, quantity)
      SELECT 'legacy-' || user_id, product_id, quantity FROM store_stock
    `),
    DB.prepare(`
      INSERT OR IGNORE INTO player_store_sales (
        id, store_id, user_id, product_id, quantity, unit_price, revenue, created_at
      )
      SELECT id, 'legacy-' || user_id, user_id, product_id, quantity, unit_price, revenue, created_at
      FROM store_sales
    `),
  ]);
  await DB.batch(MARKET_ASSETS.map(asset => DB.prepare(`
    UPDATE market_assets
    SET tick_offset = ?
    WHERE symbol = ? AND tick_offset = 0
  `).bind(initialMarketTickOffset(asset.symbol), asset.symbol)));
  await DB.prepare("UPDATE player_stores SET next_event_at = ? WHERE next_event_at = 0")
    .bind(now + 120).run();
  await DB.prepare("UPDATE player_store_stock SET freshness_updated_at = ? WHERE freshness_updated_at = 0")
    .bind(now).run();
  await DB.prepare("UPDATE warehouse_stock SET freshness_updated_at = ? WHERE freshness_updated_at = 0")
    .bind(now).run();
  await DB.prepare("UPDATE city_profiles SET heat_updated_at = ? WHERE heat_updated_at = 0")
    .bind(now).run();
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
