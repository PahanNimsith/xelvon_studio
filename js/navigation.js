/* ══════════════════════════════════════════════════════
   NAVIGATION & BADGES — Xelvon Studio v11
══════════════════════════════════════════════════════ */
const VIEW_META = {
  dashboard: { label:'Dashboard', action:'New Task',   actionFn:'openNewTaskModal' },
  board:     { label:'Board',     action:'New Phase',  actionFn:'openNewPhaseModal' },
  today:     { label:'Today',     action:'New Task',   actionFn:'openNewTaskModal' },
  links:     { label:'Links',     action:'Add Link',   actionFn:'openLinkModal' },
  docs:      { label:'Files',     action:'New Doc',    actionFn:'createDoc' },
  scratch:   { label:'Scratch Pad', action:null,       actionFn:null }
};

function navigate(view) {
  currentView = view;
  document.querySelectorAll('.sb-item').forEach(function(el){ el.classList.remove('active'); });
  const navEl = document.getElementById('nav-'+view);
  if (navEl) navEl.classList.add('active');
  document.querySelectorAll('.view').forEach(function(el){
    el.classList.remove('active');
    el.style.display = '';
  });
  const vEl = document.getElementById('view-'+view);
  if (vEl) {
    vEl.classList.add('active');
    if (view === 'board') vEl.style.display = 'flex';
  }
  const meta = VIEW_META[view] || {};
  const titleEl = document.getElementById('tb-title');
  if (titleEl) titleEl.textContent = meta.label || view;
  const abtn = document.getElementById('tb-action-btn');
  const albl = document.getElementById('tb-action-label');
  if (abtn && albl) {
    if (meta.action) { abtn.style.display = 'flex'; albl.textContent = meta.action; }
    else { abtn.style.display = 'none'; }
  }
  renderView(view);
}

function handleTopAction() {
  const meta = VIEW_META[currentView];
  if (meta && meta.actionFn && window[meta.actionFn]) window[meta.actionFn]();
}

function renderView(v) {
  if (v === 'dashboard') renderDashboard();
  else if (v === 'board') renderBoard();
  else if (v === 'today') renderToday();
  else if (v === 'links') renderLinks();
  else if (v === 'docs') renderDocList();
  else if (v === 'scratch') renderScratch();
}

function renderAll() {
  renderView(currentView);
  updateBadges();
}

function updateBadges() {
  const tb = document.getElementById('trash-badge');
  if (tb) {
    if (state.trash.length) { tb.textContent = state.trash.length; tb.style.display = ''; }
    else { tb.style.display = 'none'; }
  }
  var todayPending = (state.todayPlans||[]).filter(function(p){
    return p.date === TODAY_STR && (!p.status || p.status === 'pending');
  }).length;
  const todayB = document.getElementById('today-badge');
  if (todayB) {
    if (todayPending) { todayB.textContent = todayPending; todayB.style.display = ''; }
    else { todayB.style.display = 'none'; }
  }
}
