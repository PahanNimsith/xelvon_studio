/* ══════════════════════════════════════════════════════
   DASHBOARD VIEW — Xelvon Studio v14
══════════════════════════════════════════════════════ */

/* Map activity text → icon class + svg */
function _actIcon(text) {
  var t = (text||'').toLowerCase();
  if (t.includes('added task') || t.includes('task added'))
    return {cls:'act-task-add', svg:'<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>'};
  if (t.includes('complet') || t.includes('done') || t.includes('checked'))
    return {cls:'act-task-done', svg:'<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'};
  if (t.includes('restor') || t.includes('recover'))
    return {cls:'act-task-restore', svg:'<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.36"/></svg>'};
  if (t.includes('delet') || t.includes('trash') || t.includes('remov'))
    return {cls:'act-task-delete', svg:'<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>'};
  if (t.includes('phase') || t.includes('board'))
    return {cls:'act-phase', svg:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="5" height="19" rx="1"/><rect x="10" y="3" width="5" height="11" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>'};
  if (t.includes('today') || t.includes('plan') || t.includes('skip') || t.includes('fail'))
    return {cls:'act-today', svg:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>'};
  if (t.includes('backup') || t.includes('save') || t.includes('export'))
    return {cls:'act-backup', svg:'<svg viewBox="0 0 24 24"><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h3.8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="13"/></svg>'};
  return {cls:'act-default', svg:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'};
}

function renderDashboard() {
  const cont = document.getElementById('dash-content');
  if (!cont) return;

  // Collect all tasks from phases using correct field name
  const all = [];
  state.phases.forEach(function(ph){
    ph.tasks.forEach(function(t){ all.push({task:t, phase:ph}); });
  });
  const total    = all.length;
  const done     = all.filter(function(x){ return x.task.checked; }).length;
  const todayTasks = all.filter(function(x){ return !x.task.checked && isToday(x.task.dueDate); });
  const overdue  = all.filter(function(x){ return !x.task.checked && isOverdue(x.task.dueDate); });

  // Today's plan tasks (from todayPlans, pending today)
  const todayPlanCount = (state.todayPlans||[]).filter(function(p){
    return p.date === TODAY_STR && (!p.status || p.status === 'pending');
  }).length;

  const tPct = total > 0 ? Math.round(done/total*100) : 0;

  // Phase progress rows
  const phaseRows = state.phases.map(function(ph) {
    const t = ph.tasks.length;
    const d = ph.tasks.filter(function(tk){ return tk.checked; }).length;
    const pct = t > 0 ? Math.round(d/t*100) : 0;
    return '<div class="phase-prog">'+
      '<div class="phase-prog-head">'+
        '<span class="phase-prog-name"><span class="phase-dot" style="background:'+esc(ph.color)+'"></span>'+esc(ph.title)+'</span>'+
        '<span class="phase-prog-pct">'+d+'/'+t+' &nbsp;'+pct+'%</span>'+
      '</div>'+
      '<div class="prog-bar"><div class="prog-fill" style="width:'+pct+'%;background:'+esc(ph.color)+'"></div></div>'+
    '</div>';
  }).join('') || '<div style="font-size:.8rem;color:var(--text3);">No phases yet</div>';

  // Activity with specific SVG icons
  const recentActs = (state.activityLog||[]).slice(0,12).map(function(a){
    var ico = _actIcon(a.text);
    return '<div class="act-item">'+
      '<div class="act-icon '+ico.cls+'">'+ico.svg+'</div>'+
      '<span class="act-text">'+esc(a.text)+'</span>'+
      '<span class="act-time">'+fmtRelTime(a.time)+'</span>'+
    '</div>';
  }).join('') || '<div style="font-size:.8rem;color:var(--text3);padding:10px 0;">No activity yet</div>';

  // Today & Overdue preview — show both today due tasks AND today plan tasks
  var previewItems = [];
  // due-today board tasks
  todayTasks.forEach(function(x){
    previewItems.push({text:x.task.text, phase:x.phase.title, type:'today'});
  });
  // overdue board tasks
  overdue.forEach(function(x){
    previewItems.push({text:x.task.text, phase:x.phase.title, type:'overdue'});
  });
  // pending today plans (if not already shown)
  (state.todayPlans||[]).filter(function(p){
    return p.date === TODAY_STR && (!p.status || p.status === 'pending');
  }).forEach(function(p){
    previewItems.push({text:p.text, phase:'Today\'s Plan', type:'plan'});
  });

  const todayPrev = previewItems.slice(0,8).map(function(item){
    var isOver = item.type==='overdue';
    var isplan = item.type==='plan';
    return '<div class="tprev-item'+(isOver?' overdue':'')+'" onclick="navigate(\''+(isplan?'today':'today')+'\')" >'+
      '<div class="tprev-cb"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>'+
      '<div class="tprev-text"><div>'+esc(item.text)+'</div><div class="tprev-phase">'+esc(item.phase)+'</div></div>'+
      (isOver ? '<span class="tprev-due">Overdue</span>' : '')+
      (isplan ? '<span class="tprev-badge-today">Today</span>' : '')+
    '</div>';
  }).join('') || '<div style="font-size:.8rem;color:var(--text3);padding:10px 0;">All clear for today! 🎉</div>';

  const phaseOpts = state.phases.map(function(ph){ return '<option value="'+ph.id+'">'+esc(ph.title)+'</option>'; }).join('');
  const greeting = getGreeting();

  cont.innerHTML =
    '<h2>'+greeting+(state.profile.name?', '+state.profile.name.split(' ')[0]:'')+'</h2>'+
    '<p class="sub">Here is your workspace overview</p>'+
    '<div class="dash-total-prog"><span class="dtp-label">Overall Progress</span><div class="dtp-bar"><div class="dtp-fill" style="width:'+tPct+'%"></div></div><span class="dtp-pct">'+tPct+'%</span></div>'+
    '<div class="dash-stats">'+
      '<div class="stat-card s-total"><div class="s-icon"><svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div><div class="s-num">'+total+'</div><div class="s-label">Total Tasks</div></div>'+
      '<div class="stat-card s-done"><div class="s-icon"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div><div class="s-num done">'+done+'</div><div class="s-label">Completed</div></div>'+
      '<div class="stat-card s-today"><div class="s-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="s-num today">'+todayTasks.length+'</div><div class="s-label">Due Today</div></div>'+
      '<div class="stat-card s-over"><div class="s-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="s-num over">'+overdue.length+'</div><div class="s-label">Overdue</div></div>'+
      '<div class="stat-card s-todaytask"><div class="s-icon"><svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 12 2 2 4-4"/></svg></div><div class="s-num todaytask">'+todayPlanCount+'</div><div class="s-label">Today\'s Plan</div></div>'+
    '</div>'+
    '<div class="dash-grid">'+
      '<div class="dash-left">'+
        '<div class="card" style="padding:16px;">'+
          '<div class="section-head"><h3>Phase Progress</h3><a onclick="navigate(\'board\')">View Board</a></div>'+
          '<div class="phase-prog-list">'+phaseRows+'</div>'+
        '</div>'+
        '<div class="card" style="padding:16px;">'+
          '<div class="section-head"><h3>Quick Add Task</h3></div>'+
          '<div class="quick-add-form">'+
            '<input id="dash-quick-text" class="form-input" placeholder="Task name..." onkeydown="if(event.key===\'Enter\')dashQuickAdd()">'+
            (phaseOpts ? '<select class="form-input" id="dash-quick-phase" style="width:auto;">'+phaseOpts+'</select>' : '')+
            '<button class="btn btn-primary" onclick="dashQuickAdd()">Add</button>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="dash-right">'+
        '<div class="card" style="padding:16px;">'+
          '<div class="section-head"><h3>Today and Overdue</h3><a onclick="navigate(\'today\')">See all</a></div>'+
          '<div class="today-preview">'+todayPrev+'</div>'+
        '</div>'+
        '<div class="card" style="padding:16px;">'+
          '<div class="section-head"><h3>Recent Activity</h3></div>'+
          '<div class="activity-list">'+recentActs+'</div>'+
        '</div>'+
      '</div>'+
    '</div>';
}

function getGreeting() {
  var h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function dashQuickAdd() {
  const inp = document.getElementById('dash-quick-text');
  const text = inp ? inp.value.trim() : '';
  const phSel = document.getElementById('dash-quick-phase');
  const phaseId = phSel ? phSel.value : '';
  if (!text || !phaseId) { toast('Enter a task name and select a phase','error',3500,'task_add'); return; }
  const phase = state.phases.find(function(p){ return p.id===phaseId; });
  if (!phase) return;
  const task = {id:uid(),text:text,description:'',priority:'med',dueDate:TODAY_STR,checked:false,tags:[],checklist:[],timeSpent:0,createdAt:TODAY_STR};
  phase.tasks.push(task);
  logActivity('Added task "'+text+'" to '+phase.title);
  saveState(); renderDashboard(); updateBadges();
  if (inp) { inp.value = ''; inp.focus(); }
  toast('Task added','success',3500,'task_add');
}
