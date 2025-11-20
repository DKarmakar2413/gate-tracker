
// Main client script for GATE Tracker (multi-file)
// Config
let APPS_ENDPOINT = localStorage.getItem('gate_apps_endpoint') || '';
let csvFallback = '';

if(APPS_ENDPOINT) document.addEventListener('DOMContentLoaded', ()=> document.getElementById('appsUrl').value = APPS_ENDPOINT);

// Utilities
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines.shift().split(',').map(h=>h.trim());
  return lines.map(line => {
    const parts = line.match(/("[^"]*"|[^,]+)/g).map(s=>s.replace(/^"|"$/g,'').trim());
    const obj = {};
    headers.forEach((h,i)=> obj[h]=parts[i] || '');
    return obj;
  });
}
function saveLocal(data){ localStorage.setItem('gate_tracker_data', JSON.stringify(data)); }
function loadLocal(){ try{return JSON.parse(localStorage.getItem('gate_tracker_data')||'null')}catch(e){return null} }

let rawData = [];
let data = [];

// Compute subjects
function computeSubjects(data){
  const map = {};
  data.forEach(r=>{
    const s = r.Subject||'Misc';
    if(!map[s]) map[s]={total:0,done:0,items:[]};
    map[s].total++;
    if((r.Status||'').toLowerCase()==='done') map[s].done++;
    map[s].items.push(r);
  });
  return map;
}

// Rendering
function renderSubjectsList(map){
  const container = document.getElementById('subjectsList'); if(!container) return;
  container.innerHTML='';
  Object.keys(map).sort().forEach(s=>{
    const obj = map[s];
    const pct = Math.round((obj.done/obj.total)*100||0);
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <div class="font-medium">${s}</div>
          <div class="muted text-xs">${obj.done} / ${obj.total} topics</div>
        </div>
        <div class="w-48 ml-4">
          <div class="bg-gray-200 rounded h-3 overflow-hidden" style="background:transparent">
            <div style="width:${pct}%; background:linear-gradient(90deg,var(--accent),var(--accent-2)); height:12px; border-radius:6px"></div>
          </div>
          <div class="muted text-xs mt-1">${pct}%</div>
        </div>
      </div>`;
    container.appendChild(div);
  });
}

function renderTasksTable(data){
  const tbody = document.getElementById('tasksTable'); if(!tbody) return; tbody.innerHTML='';
  data.forEach((r,idx)=>{
    const tr = document.createElement('tr'); tr.className='border-b';
    const status = (r.Status||'todo').toLowerCase();
    tr.innerHTML = `
      <td class="p-2 align-top">${r.Subject||''}</td>
      <td class="p-2 align-top">${r.Topic||''}</td>
      <td class="p-2 align-top"><button data-idx="${idx}" class="statusBtn px-3 py-1 rounded text-sm">${status}</button></td>
      <td class="p-2 align-top">${r.PlannedDate||''}</td>
      <td class="p-2 align-top">${r.EstimatedHours||''}</td>
      <td class="p-2 align-top">${r.Notes||''}</td>`;
    tbody.appendChild(tr);
  });
  document.querySelectorAll('.statusBtn').forEach(btn=>btn.addEventListener('click', async ()=>{
    const i = +btn.getAttribute('data-idx');
    const order = ['todo','inprogress','done'];
    const cur = (data[i].Status||'todo').toLowerCase();
    const next = order[(order.indexOf(cur)+1)%order.length];
    data[i].Status = next;
    saveLocal(data);
    refreshUI();
    if(APPS_ENDPOINT){
      try{
        await fetch(APPS_ENDPOINT, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'updateStatus', payload:{Subject:data[i].Subject, Topic:data[i].Topic, Status:data[i].Status}})});
      }catch(err){ console.warn('sync failed',err); }
    }
  }));
}

// Charts
let pieChart,lineChart,weeklyChart;
function renderCharts(map){
  const labels = Object.keys(map);
  const doneCounts = labels.map(l=>map[l].done);
  const totals = labels.map(l=>map[l].total);
  const pct = labels.map((l,i)=> Math.round(doneCounts[i]/(totals[i]||1)*100));

  const pieCtx = document.getElementById('pieChart');
  if(pieChart) pieChart.destroy();
  pieChart = new Chart(pieCtx, {
    type:'doughnut', data: { labels, datasets:[{ data: pct, label:'% done', hoverOffset:6 }]}, options:{plugins:{legend:{position:'bottom'}}}
  });

  const lineCtx = document.getElementById('lineChart');
  if(lineChart) lineChart.destroy();
  lineChart = new Chart(lineCtx, { type:'bar', data:{ labels, datasets:[{ label:'% done', data:pct }]}, options:{plugins:{legend:{display:false}}} });

  const wk = document.getElementById('weeklyChart');
  if(weeklyChart) weeklyChart.destroy();
  // simple weekly mock data: percent completion last 7 days (from data timestamps if available). fallback random.
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  weeklyChart = new Chart(wk, { type:'line', data:{ labels: days, datasets:[{ label:'Weekly progress', data: days.map(()=> Math.round(Math.random()*30+50) ), fill:true }]}, options:{plugins:{legend:{display:false}}} });
}

// Today's tasks widget (simple list view)
function renderTodayTasks(){
  const cont = document.getElementById('todayTasks'); if(!cont) return; cont.innerHTML='';
  const today = new Date().toISOString().slice(0,10);
  const todays = (data||[]).filter(r=> (r.PlannedDate||'').slice(0,10) === today || (r.Status||'').toLowerCase()!=='done' && (r.PlannedDate||'').trim()==='');
  if(!todays.length) { cont.innerHTML = '<div class="muted">No tasks for today. Use the sheet to schedule topics.</div>'; return; }
  todays.forEach((t,i)=>{
    const div = document.createElement('div');
    div.className='p-3 rounded border flex items-start justify-between';
    div.innerHTML = `<div><div class="font-medium">${t.Subject} — ${t.Topic}</div><div class="muted text-xs">${t.Notes||''}</div></div>
      <div><input type="checkbox" data-idx="${i}" ${ (t.Status||'').toLowerCase()==='done' ? 'checked':'' }/></div>`;
    cont.appendChild(div);
  });
  cont.querySelectorAll('input[type="checkbox"]').forEach(cb=>cb.addEventListener('change', (e)=>{
    const idx = +cb.getAttribute('data-idx');
    // find corresponding item in data (by subject+topic)
    const todaysAll = (data||[]).filter(r=> (r.PlannedDate||'').slice(0,10) === new Date().toISOString().slice(0,10) || (r.Status||'').toLowerCase()!=='done' && (r.PlannedDate||'').trim()==='');
    const item = todaysAll[idx];
    if(!item) return;
    const globalIdx = data.findIndex(d=> d.Subject===item.Subject && d.Topic===item.Topic);
    if(globalIdx===-1) return;
    data[globalIdx].Status = cb.checked ? 'done' : 'todo';
    saveLocal(data); refreshUI();
    if(APPS_ENDPOINT){
      fetch(APPS_ENDPOINT, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'updateStatus', payload:{Subject:data[globalIdx].Subject, Topic:data[globalIdx].Topic, Status:data[globalIdx].Status}})}).catch(()=>{});
    }
  }));
}

// refresh UI
function refreshUI(){
  data = loadLocal() || rawData.slice();
  const map = computeSubjects(data);
  renderSubjectsList(map);
  renderTasksTable(data);
  renderCharts(map);
  renderTodayTasks();
}

// Load CSV fallback
document.getElementById('loadBtn').addEventListener('click', async ()=>{
  const url = document.getElementById('sheetUrl').value.trim();
  if(!url) return alert('Paste the CSV URL first');
  csvFallback = url;
  try{
    const res = await fetch(url);
    const text = await res.text();
    rawData = parseCSV(text);
    rawData = rawData.map(r=>{ const out={}; Object.keys(r).forEach(k=> out[k.trim()]=r[k]); return out; });
    const local = loadLocal();
    if(local){
      const map = {}; local.forEach(l=> map[(l.Subject||'')+'||'+(l.Topic||'')] = l.Status);
      rawData.forEach(r=>{ const key=(r.Subject||'')+'||'+(r.Topic||''); if(map[key]) r.Status=map[key]; else if(!r.Status) r.Status='todo'; });
      data = rawData.slice(); saveLocal(data);
    } else { data = rawData.slice(); saveLocal(data); }
    refreshUI();
  }catch(e){ alert('Failed to load CSV - check URL and CORS/publishing'); console.error(e); }
});

// Apps endpoint save/test
document.getElementById('saveEndpoint').addEventListener('click', ()=>{
  const url = document.getElementById('appsUrl').value.trim();
  if(!url) return alert('Paste Apps Script URL first');
  APPS_ENDPOINT = url; localStorage.setItem('gate_apps_endpoint', url); alert('Saved endpoint');
});
document.getElementById('testEndpoint').addEventListener('click', async ()=>{
  if(!APPS_ENDPOINT) return alert('Save endpoint first');
  try{
    const res = await fetch(APPS_ENDPOINT);
    const json = await res.json();
    if(Array.isArray(json)){ rawData = json; data = rawData.slice(); saveLocal(data); refreshUI(); alert('Loaded data from Apps Script'); }
    else alert('Unexpected response — ensure you deployed the web app correctly');
  }catch(e){ alert('Failed to call endpoint: '+e.message); }
});

// download CSV
function toCSV(rows){
  if(!rows || !rows.length) return '';
  const keys = Object.keys(rows[0]); const lines=[keys.join(',')];
  rows.forEach(r=>{ const line = keys.map(k=> '"'+String(r[k]||'').replace(/"/g,'""')+'"').join(','); lines.push(line); });
  return lines.join('\n');
}
document.getElementById('downloadCsv')?.addEventListener('click', ()=>{
  const out = toCSV(data); const blob = new Blob([out],{type:'text/csv'}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='gate_tracker_export.csv'; document.body.appendChild(a); a.click(); a.remove();
});

// reset
document.getElementById('resetBtn')?.addEventListener('click', ()=>{ if(confirm('Clear local saved progress?')){ localStorage.removeItem('gate_tracker_data'); rawData=[]; data=[]; refreshUI(); }});

// use CSV fallback only
document.getElementById('useCsvFallback')?.addEventListener('click', ()=>{ if(!csvFallback) return alert('Load a CSV first'); APPS_ENDPOINT=''; localStorage.removeItem('gate_apps_endpoint'); alert('Now using CSV fallback only'); });

// auto-load local
window.addEventListener('load', ()=>{ const local = loadLocal(); if(local){ rawData = local.slice(); data = rawData.slice(); refreshUI(); } loadMotivation(); loadStreaks(); applyThemeFromStorage(); });

// Motivation & Streaks
const quotes = [
  "Small steps daily lead to massive results.",
  "Stay consistent, your future self is watching.",
  "One hour today beats zero hours forever.",
  "Champions are built on regular boring practice.",
  "If you study today, tomorrow will thank you.",
  "Don’t stop until you are proud.",
  "Your only competition is yesterday’s you.",
  "Deep focus beats long hours.",
  "Greatness is consistency.",
  "You don’t need to be extreme, just consistent."
];
function loadMotivation(){ const q = quotes[Math.floor(Math.random()*quotes.length)]; document.getElementById('motivationText').textContent = q; }

function loadStreaks(){
  const gh = localStorage.getItem('username_github') || '';
  const lc = localStorage.getItem('username_leetcode') || '';
  if(gh){ document.getElementById('githubStreakImg').src = `https://streak-stats.demolab.com?user=${gh}&theme=dark&hide_border=true`; }
  else document.getElementById('githubStreakImg').src = '';
  if(lc){ document.getElementById('leetcodeStatsImg').src = `https://leetcard.jacoblin.cool/${lc}?theme=dark&border=0`; }
  else document.getElementById('leetcodeStatsImg').src = '';
}
document.getElementById('setUsernames')?.addEventListener('click', ()=>{
  const gh = prompt('Enter your GitHub username (or leave blank)'); const lc = prompt('Enter your LeetCode username (or leave blank)');
  if(gh) localStorage.setItem('username_github', gh); if(lc) localStorage.setItem('username_leetcode', lc); loadStreaks();
});

// Theme (dark/light toggle + pastel)
function applyThemeFromStorage(){
  const t = localStorage.getItem('gate_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
}
document.getElementById('themeToggle')?.addEventListener('click', ()=>{
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('gate_theme', next);
});

// Expose apps preview text
document.addEventListener('DOMContentLoaded', ()=>{ fetch('apps_script.gs').then(r=> r.text()).then(t=> document.getElementById('appsPreview').textContent = t).catch(()=>{}); });
