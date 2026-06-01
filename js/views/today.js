/* ══════════════════════════════════════════════════════
   TODAY VIEW — v14 Updates
   Features:
   - All tasks can be restored (v14 simplified recovery)
   - Removed "Cannot restore" messages
   - Delete button triggers select mode
   - Cleaner UX
══════════════════════════════════════════════════════ */
var _todayTab = 'plan';
var _todayDeleteMode = false; // v13: Delete mode instead of always showing checkboxes
var _todayLogSelected = {};

function renderToday() {
  var cont = document.getElementById('today-content');
  if (!cont) return;

  var today   = (state.todayPlans||[]).filter(function(p){ return p.date === TODAY_STR; });
  var pending = today.filter(function(p){ return !p.status || p.status === 'pending'; });
  var doneN   = today.filter(function(p){ return p.status === 'done'; }).length;
  var failN   = today.filter(function(p){ return p.status === 'failed' || p.status === 'auto-failed'; }).length;
  var skipN   = today.filter(function(p){ return p.status === 'skipped'; }).length;

  var html = '';

  /* ── Stats ── */
  html +=
    '<div class="today-stats-row">'+
      '<div class="today-stat done"><div class="today-stat-num">'+doneN+'</div><div class="today-stat-lbl">Done</div></div>'+
      '<div class="today-stat fail"><div class="today-stat-num">'+failN+'</div><div class="today-stat-lbl">Auto-Failed</div></div>'+
      '<div class="today-stat skip"><div class="today-stat-num">'+skipN+'</div><div class="today-stat-lbl">Skipped</div></div>'+
      '<div class="today-stat pending"><div class="today-stat-num">'+pending.length+'</div><div class="today-stat-lbl">Pending</div></div>'+
    '</div>';

  /* ── Tab switcher ── */
  html +=
    '<div class="today-tabs">'+
      '<button class="today-tab'+(_todayTab==='plan'?' active':'')+'" onclick="switchTodayTab(\'plan\')">'+
        '<svg viewBox="0 0 24 24" class="today-tab-icon"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 12 2 2 4-4"/></svg>'+
        'Today\'s Plan'+
      '</button>'+
      '<button class="today-tab'+(_todayTab==='log'?' active':'')+'" onclick="switchTodayTab(\'log\')">'+
        '<svg viewBox="0 0 24 24" class="today-tab-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>'+
        'Today Log'+
      '</button>'+
    '</div>';

  /* ══ PANEL A — TODAY'S PLAN ══ */
  html += '<div class="today-panel'+(_todayTab==='plan'?' active':'')+'">';
  html +=
    '<div class="today-free-add">'+
      '<input id="today-plan-input" class="form-input" placeholder="Type a task for today and press Enter..." style="flex:1;"'+
        ' onkeydown="if(event.key===\'Enter\')addTodayFreeplan()">'+
      '<button class="btn btn-primary" onclick="addTodayFreeplan()">+ Add</button>'+
    '</div>';
  if (pending.length) {
    html += '<div class="today-section"><div class="today-section-head"><h3>Today\'s Plan</h3><span class="today-badge due">'+pending.length+'</span></div>';
    pending.forEach(function(p){ html += todayPlanCard(p); });
    html += '</div>';
  } else {
    html +=
      '<div class="focus-empty">'+
        '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'+
        '<h3>No pending tasks today</h3>'+
        '<p>Type above or hit <b>Add to Today</b> on any Board task.</p>'+
      '</div>';
  }
  html += '</div>';

  /* ══ PANEL B — TODAY LOG ══ */
  html += '<div class="today-panel'+(_todayTab==='log'?' active':'')+'">';
  var allPlans = (state.todayPlans||[]);
  
  if (allPlans.length) {
    // v13: Simplified toolbar - delete button enters delete mode
    var selectedCount = Object.keys(_todayLogSelected).filter(function(k){ return _todayLogSelected[k]; }).length;
    
    html += '<div class="today-log-toolbar">';
    
    if (_todayDeleteMode) {
      // v13: Delete mode - show select all and action buttons
      html += '<label class="today-select-all">'+
        '<input type="checkbox" '+(selectedCount === allPlans.length && allPlans.length > 0 ? 'checked' : '')+' onchange="toggleTodaySelectAll(this.checked)">'+
        '<span>Select All</span>'+
      '</label>'+
      '<span class="today-selected-count">'+(selectedCount > 0 ? selectedCount + ' selected' : 'Select entries to delete')+'</span>'+
      (selectedCount > 0 ? '<button class="btn btn-danger btn-sm" onclick="clearSelectedTodayLogs()">Delete ('+selectedCount+')</button>' : '')+
      '<button class="btn btn-ghost btn-sm" style="margin-left:auto;" onclick="exitTodayDeleteMode()">Cancel</button>';
    } else {
      // v13: Normal mode - just show delete button
      html += '<span style="flex:1;font-size:.75rem;color:var(--text3);">'+allPlans.length+' total entries</span>'+
        '<button class="btn btn-ghost btn-sm" onclick="enterTodayDeleteMode()">'+
          '<svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;margin-right:4px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>'+
          'Delete'+
        '</button>';
    }
    
    html += '</div>';
    
    var grouped = {};
    allPlans.forEach(function(p){
      var d = p.date || 'Unknown';
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(p);
    });
    var sortedDates = Object.keys(grouped).sort(function(a,b){ return b.localeCompare(a); });
    sortedDates.forEach(function(d) {
      var label = d === TODAY_STR ? 'Today - '+d : d;
      html += '<div class="today-log-group"><div class="today-log-date">'+esc(label)+'</div>';
      grouped[d].forEach(function(p) { html += _todayLogEntry(p); });
      html += '</div>';
    });
  } else {
    html +=
      '<div class="focus-empty">'+
        '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'+
        '<h3>No history yet</h3>'+
        '<p>Completed and logged tasks will appear here.</p>'+
      '</div>';
  }
  html += '</div>';
  cont.innerHTML = html;
}

function _todayLogEntry(p) {
  var status = p.status || 'pending';
  var isAutoFail = status === 'failed' || status === 'auto-failed';
  var isSkipped  = status === 'skipped';
  var isDone     = status === 'done';

  var ph = p.phaseId ? state.phases.find(function(x){ return x.id===p.phaseId; }) : null;
  var phaseBadge = ph
    ? '<span class="today-log-phase"><span style="background:'+esc(ph.color)+';width:6px;height:6px;border-radius:50%;display:inline-block;margin-right:4px;flex-shrink:0;"></span>'+esc(ph.title)+'</span>'
    : '';

  var startStr    = p.startedAt    ? fmtClock(p.startedAt)    : (p.statusSetAt ? fmtClock(p.statusSetAt) : '');
  var endStr      = p.completedAt  ? fmtClock(p.completedAt)  : '';
  var durStr      = (p.startedAt && p.completedAt) ? fmtDuration(p.startedAt, p.completedAt) : '';

  var timeHtml = '';
  if (startStr) timeHtml += '<span class="tlog-time-chip">Started '+startStr+'</span>';
  if (endStr)   timeHtml += '<span class="tlog-time-chip">Ended '+endStr+'</span>';
  if (durStr)   timeHtml += '<span class="tlog-time-chip"><svg viewBox="0 0 24 24" style="width:10px;height:10px;stroke:currentColor;fill:none;stroke-width:2;margin-right:3px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'+durStr+'</span>';

  var statusLabel = isAutoFail ? 'auto-failed' : status;
  var statusCls   = isAutoFail ? 'tlog-failed' : 'tlog-'+status;

  // v16: every logged Today item can be restored to today's pending plan.
  var canRecover = status !== 'pending';

  var restoreBtn = canRecover
    ? '<button class="today-recover-btn" style="margin-left:auto;flex-shrink:0;" onclick="event.stopPropagation();recoverTodayPlan(\''+p.id+'\')">'+
        '<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.36"/></svg>Restore'+
      '</button>'
    : '';

  var isSelected = _todayLogSelected[p.id];

  var checkboxHtml = _todayDeleteMode
    ? '<label class="today-log-checkbox" onclick="event.stopPropagation()">'+
        '<input type="checkbox" '+(isSelected?'checked':'')+' onchange="toggleTodayLogSelect(\''+p.id+'\',this.checked)">'+
      '</label>'
    : '';

  return (
    '<div class="today-log-entry'+(isSelected && _todayDeleteMode?' selected':'')+'">'+
      checkboxHtml+
      '<div class="tlog-entry-main">'+
        '<span class="today-log-dot '+statusCls+'"></span>'+
        '<div class="tlog-entry-body" style="flex:1;min-width:0;">'+
          '<div class="tlog-entry-top" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'+
            '<span class="today-log-name">'+esc(p.text)+'</span>'+
            phaseBadge+
            '<span class="today-log-status '+statusCls+'">'+esc(statusLabel)+'</span>'+
            restoreBtn+
          '</div>'+
          (timeHtml ? '<div class="tlog-time-row">'+timeHtml+'</div>' : '')+
        '</div>'+
      '</div>'+
    '</div>'
  );
}

function fmtClock(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); } catch(e){ return ''; }
}

function fmtDuration(startIso, endIso) {
  try {
    var ms = new Date(endIso) - new Date(startIso);
    if (ms < 0) return '';
    var m = Math.floor(ms/60000), s = Math.floor((ms%60000)/1000);
    if (m >= 60) return Math.floor(m/60)+'h '+(m%60)+'m';
    return m ? m+'m '+(s<10?'0':'')+s+'s' : s+'s';
  } catch(e){ return ''; }
}

function switchTodayTab(tab) { 
  _todayTab = tab; 
  // v13: Exit delete mode when switching tabs
  if (_todayDeleteMode) exitTodayDeleteMode();
  renderToday(); 
}

function todayPlanCard(p) {
  var isDone = p.status === 'done';
  var isFail = p.status === 'failed' || p.status === 'auto-failed';
  var isSkip = p.status === 'skipped';
  var dotClr = isDone ? 'var(--success)' : isFail ? 'var(--danger)' : isSkip ? 'var(--warning)' : 'var(--brand)';
  var ph = p.phaseId ? state.phases.find(function(x){ return x.id===p.phaseId; }) : null;
  var phaseBadge = ph
    ? '<span class="today-plan-phase"><span style="background:'+esc(ph.color)+';width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:4px;flex-shrink:0;"></span>'+esc(ph.title)+'</span>'
    : '';
  var boardBadge = p.fromBoard ? '<span class="today-from-board">Board</span>' : '';
  var acts = isFail
    ? '<span class="today-auto-fail-label">Auto-failed</span>'
    : '<button class="tpa-btn ok'+(isDone?' active':'')+'" onclick="setTodayPlanStatus(\''+p.id+'\',\'done\')" aria-label="Done">Done</button>'+
      '<button class="tpa-btn skip'+(isSkip?' active':'')+'" onclick="setTodayPlanStatus(\''+p.id+'\',\'skipped\')" aria-label="Skip">Skip</button>';
  return (
    '<div class="today-plan-card'+(isFail?' auto-failed':'')+'">'+
      '<div class="today-plan-card-head">'+
        '<div class="today-plan-status-dot" style="background:'+dotClr+';width:9px;height:9px;border-radius:50%;flex-shrink:0;"></div>'+
        '<div class="today-plan-info">'+
          '<div class="today-plan-name'+(isDone?' done-txt':'')+'">'+esc(p.text)+'</div>'+
          '<div class="today-plan-foot">'+phaseBadge+boardBadge+'</div>'+
        '</div>'+
        '<div class="today-plan-acts">'+acts+'</div>'+
        (isFail?'':'<button class="today-del-btn" onclick="deleteTodayPlan(\''+p.id+'\')" aria-label="Remove"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>')+
      '</div>'+
    '</div>'
  );
}

function addTodayFreeplan() {
  var inp  = document.getElementById('today-plan-input');
  var text = inp ? inp.value.trim() : '';
  if (!text) { toast('Type something first','error',3500,'task_add'); if(inp) inp.focus(); return; }
  if (!state.todayPlans) state.todayPlans = [];
  state.todayPlans.push({ id:uid(), text:text, date:TODAY_STR, status:'pending', fromBoard:false, addedAt:new Date().toISOString() });
  logActivity('Today plan added: "'+text+'"');
  saveState(); renderToday(); updateBadges();
  if (inp) { inp.value = ''; inp.focus(); }
}

function setTodayPlanStatus(id, status) {
  var plan = (state.todayPlans||[]).find(function(p){ return p.id===id; });
  if (!plan) return;
  plan.status = (plan.status === status) ? 'pending' : status;
  if (plan.status !== 'pending') {
    plan.completedAt = new Date().toISOString();
    plan.statusSetAt = new Date().toISOString();
  } else { delete plan.completedAt; delete plan.statusSetAt; }
  logActivity('Today plan "'+plan.text+'" -> '+plan.status);
  saveState(); renderToday(); updateBadges();
}

function deleteTodayPlan(id) {
  var plan = (state.todayPlans||[]).find(function(p){ return p.id===id; });
  if (!plan) return;
  state.trash.push({ type:'todayPlan', plan:JSON.parse(JSON.stringify(plan)), deletedAt:new Date().toISOString() });
  state.todayPlans = (state.todayPlans||[]).filter(function(p){ return p.id!==id; });
  saveState(); renderToday(); updateBadges();
  toast('Plan moved to trash','info',3500,'trash');
}

// v14: Recover task - all tasks can be restored
function recoverTodayPlan(id) {
  var plan = (state.todayPlans||[]).find(function(p){ return p.id===id; });
  if (!plan) return;
  state.todayPlans.push({
    id: uid(),
    text: plan.text,
    date: TODAY_STR,
    status: 'pending',
    fromBoard: plan.fromBoard || false,
    phaseId: plan.phaseId || null,
    recoveredFrom: id,
    addedAt: new Date().toISOString()
  });
  logActivity('Recovered "'+plan.text+'" as pending today');
  saveState();
  _todayTab = 'plan';
  renderToday();
  updateBadges();
  toast("Task restored to today's plan",'success',3500,'restore');
}

// v13: Enter delete mode
function enterTodayDeleteMode() {
  _todayDeleteMode = true;
  _todayLogSelected = {};
  renderToday();
}

// v13: Exit delete mode
function exitTodayDeleteMode() {
  _todayDeleteMode = false;
  _todayLogSelected = {};
  renderToday();
}

// v13: Select/deselect log entries (only in delete mode)
function toggleTodayLogSelect(id, checked) {
  _todayLogSelected[id] = checked;
  renderToday();
}

function toggleTodaySelectAll(checked) {
  _todayLogSelected = {};
  if (checked) {
    (state.todayPlans||[]).forEach(function(p) {
      _todayLogSelected[p.id] = true;
    });
  }
  renderToday();
}

// v13: Clear selected log entries
function clearSelectedTodayLogs() {
  var toRemove = Object.keys(_todayLogSelected).filter(function(k){ return _todayLogSelected[k]; });
  if (toRemove.length === 0) {
    toast('No entries selected','error',3500,'select');
    return;
  }
  
  if (!confirm('Move '+toRemove.length+' selected entries to Trash?')) return;
  
  if (!state.trash) state.trash = [];
  toRemove.forEach(function(id) {
    var plan = (state.todayPlans||[]).find(function(p){ return p.id === id; });
    if (plan) state.trash.push({ type:'todayPlan', plan:JSON.parse(JSON.stringify(plan)), deletedAt:new Date().toISOString() });
    state.todayPlans = (state.todayPlans||[]).filter(function(p){ return p.id !== id; });
  });
  
  _todayLogSelected = {};
  _todayDeleteMode = false;
  logActivity('Deleted '+toRemove.length+' today log entries');
  saveState();
  renderToday();
  updateBadges();
  toast('Moved '+toRemove.length+' entries to trash','success',3500,'trash');
}
