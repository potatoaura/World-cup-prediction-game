
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "db.json");
const PUBLIC = path.join(__dirname, "public");
const ADMIN_CODE = process.env.ADMIN_CODE || "admin123";

function defaultDb(){
  return {
    users: [],
    sessions: {},
    matches: seedMatches(),
    logs: []
  };
}

function seedMatches(){
  const data = [
    ["M73","1/16","South Africa 0–1 Canada",["South Africa","Canada"],"Canada",5,1.5],
    ["M75","1/16","Netherlands 1–1 Morocco",["Netherlands","Morocco"],"Morocco",5,1.5],
    ["M74","1/16","Germany 1–1 Paraguay",["Germany","Paraguay"],"Paraguay",5,1.5],
    ["M77","1/16","France vs Sweden",["France","Sweden"],"",5,1.5],
    ["M76","1/16","Brazil 2–1 Japan",["Brazil","Japan"],"Brazil",5,1.5],
    ["M78","1/16","Ivory Coast vs Norway",["Ivory Coast","Norway"],"",5,1.5],
    ["M79","1/16","Mexico vs Ecuador",["Mexico","Ecuador"],"",5,1.5],
    ["M80","1/16","England vs DR Congo",["England","DR Congo"],"",5,1.5],
    ["M85","1/16","USA vs Bosnia",["USA","Bosnia and Herzegovina"],"",5,1.5],
    ["M87","1/16","Belgium vs Senegal",["Belgium","Senegal"],"",5,1.5],
    ["M86","1/16","Portugal vs Croatia",["Portugal","Croatia"],"",5,1.5],
    ["M88","1/16","Spain vs Austria",["Spain","Austria"],"",5,1.5],
    ["M81","1/16","Argentina vs Cape Verde",["Argentina","Cape Verde"],"",5,1.5],
    ["M82","1/16","Australia vs Egypt",["Australia","Egypt"],"",5,1.5],
    ["M83","1/16","Switzerland vs Algeria",["Switzerland","Algeria"],"",5,1.5],
    ["M84","1/16","Colombia vs Ghana",["Colombia","Ghana"],"",5,1.5],

    ["M89","1/8","Canada vs Morocco",["Canada","Morocco"],"",10,1.8],
    ["M90","1/8","Paraguay vs W77",["Paraguay","France","Sweden"],"",10,1.8],
    ["M91","1/8","Brazil vs W78",["Brazil","Ivory Coast","Norway"],"",10,1.8],
    ["M92","1/8","W79 vs W80",["Mexico","Ecuador","England","DR Congo"],"",10,1.8],
    ["M96","1/8","W85 vs W87",["USA","Bosnia and Herzegovina","Belgium","Senegal"],"",10,1.8],
    ["M95","1/8","W86 vs W88",["Portugal","Croatia","Spain","Austria"],"",10,1.8],
    ["M93","1/8","W81 vs W82",["Argentina","Cape Verde","Australia","Egypt"],"",10,1.8],
    ["M94","1/8","W83 vs W84",["Switzerland","Algeria","Colombia","Ghana"],"",10,1.8],

    ["M97","1/4","W89 vs W90",["Canada","Morocco","Paraguay","France","Sweden"],"",20,2.2],
    ["M99","1/4","W91 vs W92",["Brazil","Ivory Coast","Norway","Mexico","Ecuador","England","DR Congo"],"",20,2.2],
    ["M100","1/4","W96 vs W95",["USA","Bosnia and Herzegovina","Belgium","Senegal","Portugal","Croatia","Spain","Austria"],"",20,2.2],
    ["M98","1/4","W93 vs W94",["Argentina","Cape Verde","Australia","Egypt","Switzerland","Algeria","Colombia","Ghana"],"",20,2.2],

    ["M101","1/2","W97 vs W100",["Canada","Morocco","Paraguay","France","Sweden","USA","Bosnia and Herzegovina","Belgium","Senegal","Portugal","Croatia","Spain","Austria"],"",35,3],
    ["M102","1/2","W99 vs W98",["Brazil","Ivory Coast","Norway","Mexico","Ecuador","England","DR Congo","Argentina","Cape Verde","Australia","Egypt","Switzerland","Algeria","Colombia","Ghana"],"",35,3],

    ["M104","Final","Final",["Canada","Morocco","Paraguay","France","Sweden","Brazil","Ivory Coast","Norway","Mexico","Ecuador","England","DR Congo","USA","Bosnia and Herzegovina","Belgium","Senegal","Portugal","Croatia","Spain","Austria","Argentina","Cape Verde","Australia","Egypt","Switzerland","Algeria","Colombia","Ghana"],"",60,5]
  ];
  return data.map(x => ({
    id:x[0], round:x[1], label:x[2], teams:x[3], winner:x[4],
    points:x[5], odds:x[6], closed: !!x[4]
  }));
}

function readDb(){
  if(!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb(), null, 2));
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function writeDb(db){ fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

function sha(s){ return crypto.createHash("sha256").update(s).digest("hex"); }
function token(){ return crypto.randomBytes(24).toString("hex"); }

function parseCookies(req){
  const raw = req.headers.cookie || "";
  const out = {};
  raw.split(";").forEach(p => {
    const i = p.indexOf("=");
    if(i > -1) out[p.slice(0,i).trim()] = decodeURIComponent(p.slice(i+1));
  });
  return out;
}

function getUser(req, db){
  const sid = parseCookies(req).sid;
  if(!sid || !db.sessions[sid]) return null;
  return db.users.find(u => u.id === db.sessions[sid]);
}

function send(res, status, body, type="application/json"){
  res.writeHead(status, {"Content-Type": type});
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

function readBody(req){
  return new Promise(resolve => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { resolve({}); }
    });
  });
}

function publicUser(u){
  return {
    id:u.id, username:u.username, isAdmin:u.isAdmin,
    wallet:u.wallet, bank:u.bank, debt:u.debt, rating:u.rating,
    day:u.day, loanDue:u.loanDue, score:u.score || 0
  };
}

function getTerms(rating){
  if(rating >= 750) return {limit:5000, interest:.10};
  if(rating >= 650) return {limit:2000, interest:.20};
  if(rating >= 550) return {limit:500, interest:.40};
  if(rating >= 400) return {limit:150, interest:.75};
  return {limit:0, interest:1};
}

function settleMatchForAll(db, match){
  for(const u of db.users){
    for(const bet of u.bets){
      if(bet.matchId === match.id && bet.status === "pending"){
        if(bet.prediction === match.winner){
          const win = Math.floor(bet.amount * match.odds);
          u.wallet += win;
          bet.status = "won";
          bet.payout = win;
        } else {
          bet.status = "lost";
          bet.payout = 0;
        }
      }
    }

    const pred = u.predictions[match.id];
    if(pred && !u.scoredMatches.includes(match.id)){
      if(pred === match.winner){
        u.score += match.points;
        u.wallet += match.points;
      }
      u.scoredMatches.push(match.id);
    }
  }
}

async function api(req, res){
  const db = readDb();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;
  const user = getUser(req, db);

  if(url.pathname === "/api/register" && method === "POST"){
    const b = await readBody(req);
    const username = String(b.username || "").trim();
    const password = String(b.password || "");
    const adminCode = String(b.adminCode || "");
    if(username.length < 3 || password.length < 4) return send(res, 400, {error:"Username min 3, password min 4"});
    if(db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) return send(res, 400, {error:"Username taken"});
    const u = {
      id: crypto.randomUUID(), username, passHash:sha(password),
      isAdmin: adminCode && adminCode === ADMIN_CODE,
      wallet:0, bank:100, debt:0, rating:700, day:0, loanDue:null, score:0,
      predictions:{}, bets:[], scoredMatches:[]
    };
    db.users.push(u);
    const sid = token(); db.sessions[sid] = u.id;
    writeDb(db);
    res.writeHead(200, {"Content-Type":"application/json", "Set-Cookie":`sid=${sid}; HttpOnly; Path=/; SameSite=Lax`});
    res.end(JSON.stringify({user:publicUser(u)}));
    return;
  }

  if(url.pathname === "/api/login" && method === "POST"){
    const b = await readBody(req);
    const u = db.users.find(u => u.username.toLowerCase() === String(b.username||"").toLowerCase());
    if(!u || u.passHash !== sha(String(b.password||""))) return send(res, 401, {error:"Wrong login/password"});
    const sid = token(); db.sessions[sid] = u.id;
    writeDb(db);
    res.writeHead(200, {"Content-Type":"application/json", "Set-Cookie":`sid=${sid}; HttpOnly; Path=/; SameSite=Lax`});
    res.end(JSON.stringify({user:publicUser(u)}));
    return;
  }

  if(url.pathname === "/api/logout"){
    const sid = parseCookies(req).sid;
    if(sid) delete db.sessions[sid];
    writeDb(db);
    res.writeHead(200, {"Content-Type":"application/json", "Set-Cookie":"sid=; Max-Age=0; Path=/"});
    res.end(JSON.stringify({ok:true}));
    return;
  }

  if(url.pathname === "/api/state"){
    const leaderboard = db.users
      .map(u => ({username:u.username, wallet:u.wallet, bank:u.bank, score:u.score || 0, rating:u.rating}))
      .sort((a,b) => (b.wallet+b.bank+b.score) - (a.wallet+a.bank+a.score))
      .slice(0, 20);
    return send(res, 200, {
      user: user ? publicUser(user) : null,
      matches: db.matches,
      leaderboard,
      admin: user?.isAdmin || false
    });
  }

  if(!user) return send(res, 401, {error:"Login required"});

  if(url.pathname === "/api/predict" && method === "POST"){
    const b = await readBody(req);
    const m = db.matches.find(m => m.id === b.matchId);
    if(!m) return send(res, 404, {error:"Match not found"});
    if(m.closed) return send(res, 400, {error:"Match closed"});
    if(!m.teams.includes(b.team)) return send(res, 400, {error:"Bad team"});
    user.predictions[m.id] = b.team;
    writeDb(db);
    return send(res, 200, {ok:true, user:publicUser(user)});
  }

  if(url.pathname === "/api/bet" && method === "POST"){
    const b = await readBody(req);
    const m = db.matches.find(m => m.id === b.matchId);
    const amount = Math.floor(Number(b.amount));
    if(!m) return send(res, 404, {error:"Match not found"});
    if(m.closed) return send(res, 400, {error:"Match already closed"});
    if(!m.teams.includes(b.team)) return send(res, 400, {error:"Bad team"});
    if(!Number.isFinite(amount) || amount < 1) return send(res, 400, {error:"Bad amount"});
    if(amount > user.wallet) return send(res, 400, {error:"Not enough wallet"});
    if(user.bets.some(x => x.matchId === m.id)) return send(res, 400, {error:"Already bet on this match"});
    user.wallet -= amount;
    user.bets.push({matchId:m.id, prediction:b.team, amount, odds:m.odds, status:"pending", payout:0});
    writeDb(db);
    return send(res, 200, {ok:true, user:publicUser(user)});
  }

  if(url.pathname === "/api/bank" && method === "POST"){
    const b = await readBody(req);
    const action = String(b.action || "");
    const amount = Math.floor(Number(b.amount || 0));
    if(amount < 1) return send(res, 400, {error:"Bad amount"});

    if(action === "withdraw"){
      const moved = Math.min(amount, user.bank);
      user.bank -= moved; user.wallet += moved;
    } else if(action === "deposit"){
      const moved = Math.min(amount, user.wallet);
      user.wallet -= moved; user.bank += moved;
    } else if(action === "loan"){
      const terms = getTerms(user.rating);
      if(terms.limit <= 0) return send(res, 400, {error:"Bank refused"});
      if(user.debt > 0) return send(res, 400, {error:"Pay old loan first"});
      if(amount > terms.limit) return send(res, 400, {error:`Limit ${terms.limit}`});
      user.wallet += amount;
      user.debt = Math.ceil(amount * (1 + terms.interest));
      user.loanDue = user.day + 3;
    } else if(action === "repay"){
      const paid = Math.min(amount, user.wallet, user.debt);
      user.wallet -= paid; user.debt -= paid;
      if(user.debt === 0 && paid > 0){ user.rating = Math.min(850, user.rating + 10); user.loanDue = null; }
    } else if(action === "nextDay"){
      user.day++;
      if(user.debt > 0 && user.loanDue !== null && user.day > user.loanDue){
        user.rating = Math.max(300, user.rating - 50);
        user.debt = Math.ceil(user.debt * 1.15);
        user.loanDue = user.day + 2;
      }
    } else return send(res, 400, {error:"Bad action"});

    writeDb(db);
    return send(res, 200, {ok:true, user:publicUser(user), terms:getTerms(user.rating)});
  }

  if(url.pathname === "/api/casino/slot" && method === "POST"){
    const b = await readBody(req);
    const amount = Math.floor(Number(b.amount || 0));
    if(amount < 1) return send(res, 400, {error:"Bad amount"});
    if(amount > user.wallet) return send(res, 400, {error:"Not enough wallet"});
    user.wallet -= amount;

    const symbols = ["DIAMOND","SEVEN","CROWN","STAR","BAR","CHERRY","BELL"];
    const randSym = () => symbols[Math.floor(Math.random()*symbols.length)];
    const r = Math.random();
    let reels = [randSym(), randSym(), randSym()];
    let mult = 0;
    let label = "LOSS";

    if(r < 0.005){
      reels = ["DIAMOND","DIAMOND","DIAMOND"]; mult = 200; label = "JACKPOT";
    } else if(r < 0.055){
      const s = randSym(); reels = [s, s, randSym()]; mult = 2; label = "PAIR";
    }

    const [a, c, d] = reels;
    if(a === c && c === d){
      if(a === "DIAMOND"){ mult = Math.max(mult, 200); label = "JACKPOT"; }
      else if(a === "SEVEN"){ mult = Math.max(mult, 100); label = "SEVEN"; }
      else if(a === "CROWN"){ mult = Math.max(mult, 50); label = "CROWN"; }
      else if(a === "STAR"){ mult = Math.max(mult, 25); label = "STAR"; }
      else if(a === "BAR"){ mult = Math.max(mult, 15); label = "BAR"; }
      else if(a === "CHERRY"){ mult = Math.max(mult, 8); label = "CHERRY"; }
    } else if(a === c || a === d || c === d){
      mult = Math.max(mult, 2); label = "PAIR";
    }

    const win = Math.floor(amount * mult);
    user.wallet += win;
    writeDb(db);
    return send(res, 200, {reels, mult, win, label, user:publicUser(user)});
  }

  if(url.pathname === "/api/casino/roulette" && method === "POST"){
    const b = await readBody(req);
    const amount = Math.floor(Number(b.amount || 0));
    const chosen = Math.floor(Number(b.number));
    if(amount < 1) return send(res, 400, {error:"Bad amount"});
    if(chosen < 0 || chosen > 36) return send(res, 400, {error:"Choose 0-36"});
    if(amount > user.wallet) return send(res, 400, {error:"Not enough wallet"});
    user.wallet -= amount;
    const result = Math.floor(Math.random()*37);
    let mult = 0;
    if(chosen === result) mult = result === 0 ? 36 : 5;
    const win = amount * mult;
    user.wallet += win;
    writeDb(db);
    return send(res, 200, {result, mult, win, user:publicUser(user)});
  }

  if(url.pathname === "/api/admin/setWinner" && method === "POST"){
    if(!user.isAdmin) return send(res, 403, {error:"Admin only"});
    const b = await readBody(req);
    const m = db.matches.find(m => m.id === b.matchId);
    if(!m) return send(res, 404, {error:"Match not found"});
    if(!m.teams.includes(b.winner)) return send(res, 400, {error:"Bad winner"});
    m.winner = b.winner;
    m.closed = true;
    settleMatchForAll(db, m);
    writeDb(db);
    return send(res, 200, {ok:true, match:m});
  }

  if(url.pathname === "/api/admin/openMatch" && method === "POST"){
    if(!user.isAdmin) return send(res, 403, {error:"Admin only"});
    const b = await readBody(req);
    const m = db.matches.find(m => m.id === b.matchId);
    if(!m) return send(res, 404, {error:"Match not found"});
    m.closed = false; m.winner = "";
    writeDb(db);
    return send(res, 200, {ok:true});
  }

  return send(res, 404, {error:"Unknown API"});
}

function serveStatic(req, res){
  let file = req.url.split("?")[0];
  if(file === "/") file = "/index.html";
  const p = path.normalize(path.join(PUBLIC, file));
  if(!p.startsWith(PUBLIC)) return send(res, 403, "Forbidden", "text/plain");
  if(!fs.existsSync(p)) return send(res, 404, "Not found", "text/plain");
  const ext = path.extname(p);
  const type = ext === ".html" ? "text/html" : ext === ".js" ? "application/javascript" : ext === ".css" ? "text/css" : "text/plain";
  send(res, 200, fs.readFileSync(p), type);
}

const server = http.createServer((req,res) => {
  if(req.url.startsWith("/api/")) api(req,res).catch(e => send(res,500,{error:String(e)}));
  else serveStatic(req,res);
});

server.listen(PORT, () => console.log("Server running on http://localhost:" + PORT));
