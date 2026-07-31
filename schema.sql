
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  pass_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  wallet INTEGER NOT NULL DEFAULT 0,
  bank INTEGER NOT NULL DEFAULT 100,
  debt INTEGER NOT NULL DEFAULT 0,
  rating INTEGER NOT NULL DEFAULT 700,
  day INTEGER NOT NULL DEFAULT 0,
  loan_due INTEGER,
  score INTEGER NOT NULL DEFAULT 0,
  hunger INTEGER NOT NULL DEFAULT 100,
  thirst INTEGER NOT NULL DEFAULT 100,
  food INTEGER NOT NULL DEFAULT 1,
  water INTEGER NOT NULL DEFAULT 1,
  pizza INTEGER NOT NULL DEFAULT 0,
  steak INTEGER NOT NULL DEFAULT 0,
  sushi INTEGER NOT NULL DEFAULT 0,
  cake INTEGER NOT NULL DEFAULT 0,
  rent_due INTEGER NOT NULL DEFAULT 0,
  housing TEXT NOT NULL DEFAULT 'room',
  last_daily_at INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  round TEXT NOT NULL,
  stage TEXT,
  sort_order INTEGER,
  label TEXT NOT NULL,
  teams TEXT NOT NULL,
  winner TEXT NOT NULL DEFAULT '',
  points INTEGER NOT NULL,
  odds REAL NOT NULL,
  closed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS predictions (
  user_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  team TEXT NOT NULL,
  scored INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, match_id)
);

CREATE TABLE IF NOT EXISTS bets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  team TEXT NOT NULL,
  amount INTEGER NOT NULL,
  odds REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payout INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bans (
  user_id TEXT PRIMARY KEY,
  admin_id TEXT,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  target_user_id TEXT,
  action TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_quests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  objective TEXT NOT NULL DEFAULT '',
  task_prompt TEXT NOT NULL DEFAULT '',
  steps_required INTEGER NOT NULL DEFAULT 3,
  progress INTEGER NOT NULL DEFAULT 0,
  mistakes INTEGER NOT NULL DEFAULT 0,
  reward INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'posted',
  available_at INTEGER NOT NULL,
  completed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS owned_properties (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  rented_out INTEGER NOT NULL DEFAULT 0,
  condition INTEGER NOT NULL DEFAULT 100,
  created_at INTEGER NOT NULL
);

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
);

CREATE TABLE IF NOT EXISTS store_stock (
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS store_sales (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  revenue INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Multi-location retail tables. The legacy retail_* tables remain in place so
-- existing stores can be copied without destructive schema changes.
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
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS player_store_stock (
  store_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(store_id, product_id)
);

CREATE TABLE IF NOT EXISTS player_store_sales (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  revenue INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS market_assets (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  previous_price INTEGER NOT NULL,
  volatility INTEGER NOT NULL,
  tick_offset INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS market_holdings (
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  shares INTEGER NOT NULL DEFAULT 0,
  average_price INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, symbol)
);

CREATE TABLE IF NOT EXISTS market_trades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  shares INTEGER NOT NULL,
  price INTEGER NOT NULL,
  total INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS market_history (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  price INTEGER NOT NULL,
  recorded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_bets_match_status ON bets(match_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bets_user_match ON bets(user_id, match_id);
CREATE INDEX IF NOT EXISTS idx_bans_admin_id ON bans(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_user_id ON admin_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_work_quests_user_status ON work_quests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_work_quests_available_at ON work_quests(available_at);
CREATE INDEX IF NOT EXISTS idx_owned_properties_user ON owned_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_store_sales_user_created ON store_sales(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_player_stores_user ON player_stores(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_stores_user_premises ON player_stores(user_id, premises_id);
CREATE INDEX IF NOT EXISTS idx_player_store_sales_store_created ON player_store_sales(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_player_store_sales_user_created ON player_store_sales(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_market_holdings_symbol ON market_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_market_trades_user_created ON market_trades(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_market_history_symbol_time ON market_history(symbol, recorded_at);
