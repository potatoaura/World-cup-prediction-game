
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
  food INTEGER NOT NULL DEFAULT 1,
  rent_due INTEGER NOT NULL DEFAULT 0,
  housing TEXT NOT NULL DEFAULT 'Room',
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
  reward INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'posted',
  available_at INTEGER NOT NULL,
  completed_at INTEGER,
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
CREATE INDEX IF NOT EXISTS idx_market_holdings_symbol ON market_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_market_trades_user_created ON market_trades(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_market_history_symbol_time ON market_history(symbol, recorded_at);
