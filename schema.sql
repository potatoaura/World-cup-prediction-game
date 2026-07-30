
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

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_bets_match_status ON bets(match_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bets_user_match ON bets(user_id, match_id);
CREATE INDEX IF NOT EXISTS idx_bans_admin_id ON bans(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_user_id ON admin_logs(target_user_id);
