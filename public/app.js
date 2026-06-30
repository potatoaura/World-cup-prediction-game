
let STATE = null;
let wheelRotation = 0;
let ballRotation = 0;

function el(id){return document.getElementById(id);}
function log(t){el("log").innerHTML = t + "<br>" + el("log").innerHTML;}
async function api(path, body=null){
  const opt = body ? {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)} : {};
  const r = await fetch(path, opt);
  const data = await r.json().catch(()=>({error:"Bad response"}));
  if(!r.ok) throw new Error(data.error || "Request failed");
  return data;
}
async function load(){
  STATE = await api("/api/state");
  render();
}
function updateUser(u){
  if(!u) return;
  el("wallet").textContent = u.wallet;
  el("bank").textContent = u.bank;
  el("debt").textContent = u.debt;
  el("rating").textContent = u.rating;
  el("score").textContent = u.score;
  el("meName").textContent = u.username + (u.isAdmin ? " (admin)" : "");
}
function render(){
  const u = STATE.user;
  el("authBox").classList.toggle("hidden", !!u);
  el("userBox").classList.toggle("hidden", !u);
  el("adminPanel").classList.toggle("hidden", !(u && u.isAdmin));
  updateUser(u);

  renderMatches();
  renderAdmin();
  renderLeaderboard();
  drawWheel();
}
function renderMatches(){
  const box = el("matches");
  box.innerHTML = "";
  for(const m of STATE.matches){
    const opts = ['<option value="">choose</option>'].concat(m.teams.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)).join("");
    const disabled = m.closed ? "disabled" : "";
    box.innerHTML += `
      <div class="match ${m.closed ? "closed" : ""}">
        <b>${m.id}</b>
        <div>
          <div>${escapeHtml(m.label)}</div>
          <div class="small">${m.round} | ${m.points} pts | odds x${m.odds} ${m.winner ? "| winner: "+escapeHtml(m.winner) : ""}</div>
        </div>
        <select id="pred_${m.id}" ${disabled}>${opts}</select>
        <button onclick="predict('${m.id}')" ${disabled}>Predict</button>
        <input id="bet_${m.id}" type="number" value="10" min="1" ${disabled}>
        <button onclick="bet('${m.id}')" ${disabled}>Bet</button>
      </div>`;
  }
}
function renderAdmin(){
  if(!STATE.admin) return;
  const box = el("adminMatches");
  box.innerHTML = "";
  for(const m of STATE.matches){
    const opts = m.teams.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
    box.innerHTML += `
      <div class="match">
        <b>${m.id}</b>
        <div>${escapeHtml(m.label)}<div class="small">${m.closed ? "closed" : "open"} ${m.winner ? "winner: "+escapeHtml(m.winner) : ""}</div></div>
        <select id="admin_${m.id}">${opts}</select>
        <button onclick="setWinner('${m.id}')">Set winner</button>
        <button class="secondary" onclick="openMatch('${m.id}')">Open</button>
      </div>`;
  }
}
function renderLeaderboard(){
  const box = el("leaderboard");
  box.innerHTML = `<div class="leaderRow"><b>#</b><b>User</b><b>Wallet</b><b>Score</b></div>`;
  STATE.leaderboard.forEach((u,i)=>{
    box.innerHTML += `<div class="leaderRow"><span>${i+1}</span><span>${escapeHtml(u.username)}</span><span>${u.wallet+u.bank}</span><span>${u.score}</span></div>`;
  });
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function register(){
  try{
    const r = await api("/api/register", {username:el("username").value, password:el("password").value, adminCode:el("adminCode").value});
    log("Registered.");
    await load();
  }catch(e){alert(e.message);}
}
async function login(){
  try{
    await api("/api/login", {username:el("username").value, password:el("password").value});
    log("Logged in.");
    await load();
  }catch(e){alert(e.message);}
}
async function logout(){ await api("/api/logout"); await load(); }

async function predict(matchId){
  try{
    const team = el("pred_"+matchId).value;
    await api("/api/predict", {matchId, team});
    log("Prediction saved: "+matchId+" "+team);
    await load();
  }catch(e){alert(e.message);}
}
async function bet(matchId){
  try{
    const team = el("pred_"+matchId).value;
    const amount = Number(el("bet_"+matchId).value);
    const r = await api("/api/bet", {matchId, team, amount});
    log("Bet placed: "+matchId);
    await load();
  }catch(e){alert(e.message);}
}
async function bankAction(action){
  try{
    const amount = Number(el("bankAmount").value);
    await api("/api/bank", {action, amount});
    log("Bank action: "+action);
    await load();
  }catch(e){alert(e.message);}
}
async function slot(){
  try{
    const amount = Number(el("slotAmount").value);
    const reels = [el("reel1"), el("reel2"), el("reel3")];
    reels.forEach(r=>r.classList.add("spin"));
    const r = await api("/api/casino/slot", {amount});
    setTimeout(()=>{
      reels[0].textContent = r.reels[0];
      reels[1].textContent = r.reels[1];
      reels[2].textContent = r.reels[2];
      reels.forEach(x=>x.classList.remove("spin"));
      el("slotMsg").textContent = `${r.label}: ${r.win ? "WIN +" + r.win : "LOSE -" + amount}`;
      log("Slot: " + r.label);
      load();
    }, 1400);
  }catch(e){alert(e.message);}
}
async function roulette(){
  try{
    const amount = Number(el("rouletteAmount").value);
    const number = Number(el("rouletteNumber").value);
    const r = await api("/api/casino/roulette", {amount, number});
    wheelRotation += 1800 + r.result * (360/37);
    ballRotation -= 2100 + r.result * (360/37);
    el("wheel").style.transform = `rotate(${wheelRotation}deg)`;
    el("ball").style.transform = `rotate(${ballRotation}deg)`;
    setTimeout(()=>{
      el("rouletteMsg").textContent = r.win ? `Result ${r.result}. WIN +${r.win}` : `Result ${r.result}. Lose -${amount}`;
      log("Roulette result: "+r.result);
      load();
    }, 4000);
  }catch(e){alert(e.message);}
}
async function setWinner(matchId){
  try{
    const winner = el("admin_"+matchId).value;
    await api("/api/admin/setWinner", {matchId, winner});
    log("Admin set winner: "+matchId+" "+winner);
    await load();
  }catch(e){alert(e.message);}
}
async function openMatch(matchId){
  try{
    await api("/api/admin/openMatch", {matchId});
    log("Admin opened match: "+matchId);
    await load();
  }catch(e){alert(e.message);}
}

function drawWheel(){
  const canvas = el("wheel");
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  const cx=130, cy=130, r=120;
  ctx.clearRect(0,0,260,260);
  for(let i=0;i<37;i++){
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,i*Math.PI*2/37,(i+1)*Math.PI*2/37);
    ctx.closePath();
    ctx.fillStyle = i===0 ? "#166534" : (i%2 ? "#991b1b" : "#111827");
    ctx.fill();
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate((i+.5)*Math.PI*2/37);
    ctx.fillStyle="white";
    ctx.font="10px Arial";
    ctx.fillText(String(i),86,3);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(cx,cy,24,0,Math.PI*2);
  ctx.fillStyle="#d9b66a";
  ctx.fill();
}

load().catch(e => log(e.message));
