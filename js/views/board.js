/* ══════════════════════════════════════════════════════
   BOARD VIEW — Kanban + List with v14 Updates
   v14 Features:
   - Fixed progress bar animation for restore (decrease vs increase)
   - Task start date and completion date display
   - Removed "Cannot restore" message
   - Hover animations
══════════════════════════════════════════════════════ */
var archiveOpen = false;
var dragSrcIdx = null;
var _progressAnimated = {}; // Track which progress bars have animated
var _lastProgressValues = {}; // Track last known progress values

function renderBoard() {
  const cont = document.getElementById('board-content');
  if (!cont) return;
  
  // Use persisted view preference
  var currentBoardView = state.boardView || 'list';
  
  // Update toggle buttons
  var k = document.getElementById('vt-kanban');
  var l = document.getElementById('vt-list');
  if (k) k.classList.toggle('active', currentBoardView === 'kanban');
  if (l) l.classList.toggle('active', currentBoardView === 'list');
  
  if (currentBoardView === 'kanban') renderKanban(cont);
  else renderListView(cont);
}

function renderKanban(cont) {
  var allBT=[], allBD=[];
  state.phases.forEach(function(ph){ 
    ph.tasks.forEach(function(t){ allBT.push(t); if(t.checked) allBD.push(t); });
    (ph.completedTasks||[]).forEach(function(t){ allBT.push(t); allBD.push(t); });
  });
  var bPct = allBT.length > 0 ? Math.round(allBD.length/allBT.length*100) : 0;
  var strip = document.getElementById('board-prog-strip');
  
  if (strip) {
    strip.style.display = 'flex';
    
    // v14: Check if progress changed and determine animation direction
    var prevBoardPct = _lastProgressValues['board'];
    var isInitial = prevBoardPct === undefined;
    var shouldAnimate = isInitial || prevBoardPct !== bPct;
    var isDecrease = !isInitial && bPct < prevBoardPct;
    // Do NOT update _lastProgressValues here — animateProgressBar owns that after animation completes
    
    var progressClass = shouldAnimate ? '' : ' progress-locked';
    strip.className = 'board-prog-strip' + progressClass;
    
    var startWidth = shouldAnimate ? (isInitial ? 0 : prevBoardPct) : bPct;
    strip.innerHTML = '<span class="bps-label">Total Progress</span><div class="bps-bar"><div class="bps-fill" id="board-progress-fill" data-target="'+bPct+'" style="width:'+startWidth+'%"></div></div><span class="bps-pct" id="board-progress-pct">'+startWidth+'%</span><span class="bps-count">'+allBD.length+'/'+allBT.length+' tasks done</span>';
    
    if (shouldAnimate) {
      requestAnimationFrame(function(){ 
        animateProgressBar('board-progress-fill', 'board-progress-pct', bPct, 'board', isDecrease);
      });
    }
  }

  var html = '<div class="board-scroll" id="board-scroll-inner">';
  state.phases.forEach(function(ph, phIdx) {
    const activeTasks = ph.tasks.filter(function(t){ return !t.checked; });
    const checkedTasks = ph.tasks.filter(function(t){ return t.checked; });
    const completedTasks = ph.completedTasks || [];
    const done = checkedTasks.length + completedTasks.length;
    const total = ph.tasks.length + completedTasks.length;
    const pct  = total > 0 ? Math.round(done/total*100) : 0;
    const startD = ph.startDate ? new Date(ph.startDate+'T00:00:00') : new Date();
    const dl  = ph.deadline || {value:3,unit:'months'};
    const endD = new Date(startD);
    if (dl.unit==='days') endD.setDate(endD.getDate()+dl.value);
    else if (dl.unit==='weeks') endD.setDate(endD.getDate()+dl.value*7);
    else endD.setMonth(endD.getMonth()+dl.value);
    const nowMs=Date.now(), startMs=startD.getTime(), endMs=endD.getTime();
    const tlPct = Math.min(100, Math.round(Math.max(0,nowMs-startMs)/Math.max(endMs-startMs,1)*100));
    const daysLeft = Math.ceil((endMs-nowMs)/86400000);
    const dCls  = daysLeft<0?'over':daysLeft<14?'warn':'ok';
    const dStr  = daysLeft<0?'Overdue '+Math.abs(daysLeft)+'d':daysLeft===0?'Due today':daysLeft+'d left';
    const sStr  = startD.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const eStr  = endD.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'});
    const tlClr = daysLeft<0?'var(--danger)':daysLeft<14?'var(--warning)':ph.color;

    var todayPlanItems = (ph.dailyPlans||[]).filter(function(p){ return p.date===TODAY_STR; });
    var todayStripHtml = '';
    if (todayPlanItems.length) {
      var colKey = 'phtoday_'+ph.id;
      var isOpen = window[colKey] || false;
      todayStripHtml =
        '<div class="ph-today-strip">'+
          '<div class="ph-today-hd'+(isOpen?' open':'')+'\" onclick="togglePhToday(\''+ph.id+'\')">'+
            '<svg class="arr" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>'+
            '<svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'+
            " Today's Plans <span class='ph-today-count'>"+todayPlanItems.length+'</span>'+
          '</div>';
      if (isOpen) {
        todayStripHtml += '<div class="ph-today-body">'+todayPlanItems.map(function(p){
          var isDone=p.status==='done',isFail=p.status==='failed',isSkip=p.status==='skipped';
          return '<div class="ph-plan-row">'+
            '<div class="ph-plan-title'+(isDone?' done-txt':'')+'">'+esc(p.title||p.text||'Plan')+'</div>'+
            '<div class="ph-plan-actions">'+
              '<button class="ph-plan-btn ok'+(isDone?' active-ok':'')+'" onclick="setPlanStatus(\''+ph.id+'\',\''+p.id+'\',\'done\')" title="Done"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></button>'+
              '<button class="ph-plan-btn fail'+(isFail?' active-fail':'')+'" onclick="setPlanStatus(\''+ph.id+'\',\''+p.id+'\',\'failed\')" title="Failed"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'+
              '<button class="ph-plan-btn skip'+(isSkip?' active-skip':'')+'" onclick="setPlanStatus(\''+ph.id+'\',\''+p.id+'\',\'skipped\')" title="Skip"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>'+
            '</div>'+
          '</div>';
        }).join('')+'</div>';
      }
      todayStripHtml += '</div>';
    }

    // v14: Completed tasks section with time tracking
    var allCompleted = checkedTasks.concat(completedTasks);
    var completedHtml = '';
    if (allCompleted.length > 0) {
      var isCompCollapsed = state._completedTasksCollapsed && state._completedTasksCollapsed[ph.id];
      completedHtml = 
        '<div class="ph-completed-strip">'+
          '<div class="ph-completed-hd'+(isCompCollapsed?'':' open')+'" onclick="toggleCompletedTasks(\''+ph.id+'\')">'+
            '<svg class="arr" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>'+
            '<svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:var(--success);fill:none;stroke-width:2;"><polyline points="20 6 9 17 4 12"/></svg>'+
            ' Completed <span class="ph-completed-count">'+allCompleted.length+'</span>'+
          '</div>';
      if (!isCompCollapsed) {
        completedHtml += '<div class="ph-completed-body">';
        allCompleted.forEach(function(t){
          completedHtml += renderCompletedTaskCard(t, ph.id);
        });
        completedHtml += '</div>';
      }
      completedHtml += '</div>';
    }
    
    // v14: Check if phase progress should animate with direction
    var phaseKey = 'phase_' + ph.id;
    var prevPhasePct = _lastProgressValues[phaseKey];
    var isPhaseInitial = prevPhasePct === undefined;
    var shouldAnimatePhase = isPhaseInitial || prevPhasePct !== pct;
    var isPhaseDecrease = !isPhaseInitial && pct < prevPhasePct;
    // Do NOT update _lastProgressValues here — animateProgressBar owns that after animation completes

    var phaseStartWidth = shouldAnimatePhase ? (isPhaseInitial ? 0 : prevPhasePct) : pct;

    html +=
      '<div class="ph-col" draggable="true" data-idx="'+phIdx+'" ondragstart="phaseDragStart(event,'+phIdx+')" ondragover="phaseDragOver(event,'+phIdx+')" ondrop="phaseDrop(event,'+phIdx+')" ondragleave="phaseDragLeave(event)">'+
        '<div class="ph-head">'+
          '<div class="ph-head-top">'+
            '<div class="ph-drag" title="Drag to reorder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg></div>'+
            '<div class="ph-col-dot" style="background:'+esc(ph.color)+'"></div>'+
            '<div class="ph-title">'+esc(ph.title)+'</div>'+
            '<div class="ph-count">'+activeTasks.length+'</div>'+
            '<button class="ph-opts-btn" onclick="openPhaseMenu(\''+ph.id+'\',event)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button>'+
          '</div>'+
          '<div class="ph-prog-row'+(shouldAnimatePhase?'':' progress-locked')+'"><div class="ph-prog-bar"><div class="ph-prog-fill" id="ph-prog-'+ph.id+'" data-target="'+pct+'" style="width:'+phaseStartWidth+'%;background:'+esc(ph.color)+'"></div></div><span class="ph-prog-pct" id="ph-pct-'+ph.id+'">'+phaseStartWidth+'%</span></div>'+
        '</div>'+
        '<div class="ph-timeline">'+
          '<div class="ph-tl-dates"><span>'+sStr+'</span><span class="ph-tl-days '+dCls+'">'+dStr+'</span><span>'+eStr+'</span></div>'+
          '<div class="ph-tl-bar"><div class="ph-tl-fill" style="width:'+tlPct+'%;background:'+esc(tlClr)+'"></div></div>'+
        '</div>'+
        '<div class="ph-tasks" id="ph-tasks-'+ph.id+'">';
    activeTasks.forEach(function(t){ html += renderTaskCard(t, ph.id); });
    html +=
        '</div>'+
        completedHtml+
        todayStripHtml+
        '<div style="display:flex;border-top:1px dashed var(--border);">'+
          '<button class="ph-add-btn" style="flex:1;border-radius:0 0 0 var(--r-md);border:none;border-right:1px solid var(--border);" onclick="openNewTaskModal(\''+ph.id+'\')"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add task</button>'+
          '<button class="ph-add-btn" style="border-radius:0 0 var(--r-md) 0;border:none;padding:10px 12px;" title="Daily Planner" onclick="openPlannerModal(\''+ph.id+'\')"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></button>'+
        '</div>'+
      '</div>';
  });

  html += '<div class="ph-new-col" onclick="openNewPhaseModal()" role="button" tabindex="0"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>New Phase</span></div>';
  html += '</div>';
  cont.innerHTML = html;
  renderArchiveStrip();

  
  // v14: Animate phase progress bars after DOM is ready
  requestAnimationFrame(function(){
    state.phases.forEach(function(ph){
      var phaseKey = 'phase_' + ph.id;
      var completedTasks = ph.completedTasks || [];
      var done = ph.tasks.filter(function(t){ return t.checked; }).length + completedTasks.length;
      var total = ph.tasks.length + completedTasks.length;
      var pct = total > 0 ? Math.round(done/total*100) : 0;
      var prevPct = _lastProgressValues[phaseKey];
      if (prevPct === undefined || prevPct !== pct) {
        var isDecrease = prevPct !== undefined && pct < prevPct;
        animateProgressBar('ph-prog-'+ph.id, 'ph-pct-'+ph.id, pct, phaseKey, isDecrease);
      }
    });
  });
}

// v14: Progress bar animation with direction support (increase/decrease)
function animateProgressBar(fillId, pctId, targetPct, trackKey, isDecrease) {
  var fill = document.getElementById(fillId);
  var pctEl = document.getElementById(pctId);
  if (!fill) return;
  
  var currentWidth = parseFloat(fill.style.width) || 0;
  var start = currentWidth;
  var duration = 600;
  var startTime = null;
  
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t)  { return t * t * t; }
  
  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    var progress = Math.min((timestamp - startTime) / duration, 1);
    var eased = isDecrease ? easeIn(progress) : easeOut(progress);
    var current = Math.round(start + (targetPct - start) * eased);
    
    fill.style.width = current + '%';
    if (pctEl) pctEl.textContent = current + '%';
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Animation done — record final value as the new baseline
      if (trackKey) {
        _lastProgressValues[trackKey] = targetPct;
        _progressAnimated[trackKey] = true;
      }
    }
  }
  
  requestAnimationFrame(animate);
}

// v13: Toggle completed tasks section
function toggleCompletedTasks(phaseId) {
  if (!state._completedTasksCollapsed) state._completedTasksCollapsed = {};
  state._completedTasksCollapsed[phaseId] = !state._completedTasksCollapsed[phaseId];
  saveState();
  renderBoard();
}

// v14: Completed task card with time info (can be restored)
function renderCompletedTaskCard(t, phaseId) {
  var timeInfo = '';
  if (t.createdAt || t.completedAt) {
    var parts = [];
    if (t.createdAt) parts.push('Started: '+fmtDateShort(t.createdAt));
    if (t.completedAt) parts.push('Done: '+fmtDateShort(t.completedAt));
    if (t.timeSpent > 0) parts.push('Time: '+fmtSecs(t.timeSpent));
    timeInfo = '<div class="task-time-info">'+parts.join(' • ')+'</div>';
  }
  return '<div class="completed-task-card" tabindex="0">'+
    '<div style="flex:1;min-width:0;">'+
      '<div class="completed-task-title">'+esc(t.text)+'</div>'+
      timeInfo+
    '</div>'+
    '<button class="completed-restore-btn" onclick="restoreCompletedTask(\''+phaseId+'\',\''+t.id+'\')" title="Restore task">'+
      '<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.36"/></svg>'+
    '</button>'+
  '</div>';
}

// v14: Helper to format date short
function fmtDateShort(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {month:'short', day:'numeric'});
}

// v14: Restore a completed task back to active with animation
function restoreCompletedTask(phaseId, taskId) {
  var ph = state.phases.find(function(p){ return p.id === phaseId; });
  if (!ph) return;
  
  // Check in checked tasks first
  var task = ph.tasks.find(function(t){ return t.id === taskId && t.checked; });
  if (task) {
    task.checked = false;
    delete task.completedAt;
  } else {
    // Check in completedTasks array
    var idx = (ph.completedTasks||[]).findIndex(function(t){ return t.id === taskId; });
    if (idx !== -1) {
      task = ph.completedTasks.splice(idx, 1)[0];
      task.checked = false;
      delete task.completedAt;
      ph.tasks.push(task);
    }
  }
  
  if (task) {
    logActivity('Restored task "'+task.text+'" to active');
    saveState();
    renderBoard();
    
    // v14: Apply restore animation to the task card
    setTimeout(function(){
      var card = document.getElementById('task-' + taskId);
      if (card) card.classList.add('restoring');
    }, 50);
    
    toast('Task restored','success',3500,'restore');
  }
}



function renderTaskCard(t, phaseId) {
  const priClass = 'pri-'+t.priority;
  const doneClass = t.checked ? 'done-card' : '';
  const clTotal = t.checklist.length;
  const clDone  = t.checklist.filter(function(c){ return c.done; }).length;
  const timerRunning = activeTimer && activeTimer.taskId === t.id;
  
  // v13: Check if task is in today's plan
  var inTodayPlan = (state.todayPlans||[]).some(function(p){
    return p.taskId === t.id && p.date === TODAY_STR;
  });

  var meta = '';
  if (t.tags && t.tags.length) t.tags.slice(0,2).forEach(function(tg){ meta += '<span class="task-tag">'+esc(tg)+'</span>'; });
  if (t.dueDate) {
    var cls = isOverdue(t.dueDate)?'overdue-due':isToday(t.dueDate)?'today-due':'';
    meta += '<span class="task-due '+cls+'"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'+fmtDate(t.dueDate)+'</span>';
  }
  if (clTotal>0) meta += '<span class="task-checklist-prog"><svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'+clDone+'/'+clTotal+'</span>';
  if (t.timeSpent>0||timerRunning) meta += '<span class="task-timer-badge"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'+(timerRunning?'Running':fmtSecs(t.timeSpent))+'</span>';
  var priLabel = t.priority==='high'?'HIGH':t.priority==='med'?'MED':'LOW';
  var priBadge = '<span class="pri-badge '+t.priority+'" aria-label="Priority '+priLabel+'">'+priLabel+'</span>';
  var descPrev = (t.description&&t.description.trim()) ? '<div class="task-desc-preview">'+esc(t.description.trim().slice(0,90))+'</div>' : '';

  // v13: Toggle button for add/remove from today
  var todayBtnClass = inTodayPlan ? 'today-add-act active' : 'today-add-act';
  var todayBtnTitle = inTodayPlan ? 'Remove from Today' : 'Add to Today';
  var todayBtnIcon = inTodayPlan 
    ? '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 15 12 18 16 13"/></svg>'
    : '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>';

  // Timer toggle — if running on this task, clicking stops it
  var timerBtnClass = timerRunning ? 'tc-act timer-running' : 'tc-act';
  var timerBtnTitle = timerRunning ? 'Stop timer' : 'Start timer';
  var timerBtnAction = timerRunning ? 'stopTimer()' : 'startTimer(\''+phaseId+'\',\''+t.id+'\')';
  var timerBtnIcon = timerRunning
    ? '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
    : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';

  return '<div class="task-card '+priClass+' '+doneClass+'" id="task-'+t.id+'" onclick="openTaskModal(\''+phaseId+'\',\''+t.id+'\')" tabindex="0" role="button" aria-label="'+esc(t.text)+'">'+
    '<div class="task-card-title'+(t.checked?' done-text':'')+'">'+esc(t.text)+'</div>'+
    descPrev+
    '<div class="task-card-meta" style="margin-top:5px;">'+priBadge+meta+'</div>'+
    '<div class="task-card-actions" onclick="event.stopPropagation()">'+
      '<div class="tc-act" data-tip="'+(t.checked?'Unmark done':'Mark done')+'" onclick="toggleTaskDone(\''+phaseId+'\',\''+t.id+'\')"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>'+
      '<div class="'+timerBtnClass+'" data-tip="'+timerBtnTitle+'" onclick="'+timerBtnAction+'">'+timerBtnIcon+'</div>'+
      '<div class="tc-act '+todayBtnClass+'" data-tip="'+todayBtnTitle+'" onclick="toggleTaskToday(\''+phaseId+'\',\''+t.id+'\')">'+todayBtnIcon+'</div>'+
      '<div class="tc-act del" data-tip="Delete task" onclick="trashTask(\''+phaseId+'\',\''+t.id+'\')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>'+
    '</div>'+
  '</div>';
}

// v14: List view — 2-column compact grid per phase
function renderListView(cont) {
  var allBT=[], allBD=[];
  state.phases.forEach(function(ph){
    ph.tasks.forEach(function(t){ allBT.push(t); if(t.checked) allBD.push(t); });
    (ph.completedTasks||[]).forEach(function(t){ allBT.push(t); allBD.push(t); });
  });
  var bPct = allBT.length > 0 ? Math.round(allBD.length/allBT.length*100) : 0;

  var strip = document.getElementById('board-prog-strip');
  if (strip) {
    var prevBoardPct = _lastProgressValues['board'] || 0;
    var shouldAnimate = !_progressAnimated['board'] || prevBoardPct !== bPct;
    _lastProgressValues['board'] = bPct;
    strip.style.display = 'flex';
    strip.className = 'board-prog-strip' + (shouldAnimate ? '' : ' progress-locked');
    strip.innerHTML = '<span class="bps-label">Total Progress</span><div class="bps-bar"><div class="bps-fill" id="board-progress-fill" data-target="'+bPct+'" style="width:'+(shouldAnimate?'0':bPct)+'%"></div></div><span class="bps-pct" id="board-progress-pct">'+(shouldAnimate?'0':bPct)+'%</span><span class="bps-count">'+allBD.length+'/'+allBT.length+' tasks done</span>';
    if (shouldAnimate) requestAnimationFrame(function(){ animateProgressBar('board-progress-fill','board-progress-pct',bPct,'board'); });
  }
  var a = document.getElementById('board-archive-strip'); if(a) a.style.display='none';

  var html = '<div class="list-view">';
  state.phases.forEach(function(ph) {
    var activeTasks   = ph.tasks.filter(function(t){ return !t.checked; });
    var completedTasks = ph.completedTasks || [];
    var checkedTasks  = ph.tasks.filter(function(t){ return t.checked; });
    var allCompleted  = checkedTasks.concat(completedTasks);
    var done = allCompleted.length;
    var total = ph.tasks.length + completedTasks.length;
    var pct  = total > 0 ? Math.round(done/total*100) : 0;

    html += '<div class="lv-phase-section">';
    html += '<div class="lv-phase-head">'+
      '<div class="lv-phase-dot" style="background:'+esc(ph.color)+'"></div>'+
      '<span class="lv-phase-title">'+esc(ph.title)+'</span>'+
      '<div class="lv-phase-prog">'+
        '<div class="lv-prog-bar"><div class="lv-prog-fill" style="width:'+pct+'%;background:'+esc(ph.color)+'"></div></div>'+
        '<span class="lv-prog-pct">'+pct+'%</span>'+
      '</div>'+
      '<span class="lv-phase-count">'+done+'/'+total+'</span>'+
    '</div>';

    // 2-column grid for active tasks
    if (activeTasks.length) {
      html += '<div class="lv-tasks-grid">';
      activeTasks.forEach(function(t){ html += renderListTaskRow(t, ph); });
      html += '</div>';
    } else {
      html += '<div style="padding:12px 16px;font-size:.78rem;color:var(--text3);">No active tasks</div>';
    }

    // Completed collapsible
    if (allCompleted.length) {
      var isCollapsed = state._completedTasksCollapsed && state._completedTasksCollapsed[ph.id];
      html += '<div class="lv-completed-section">';
      html += '<div class="lv-completed-hd'+(isCollapsed?'':' open')+'" onclick="toggleCompletedTasks(\''+ph.id+'\')">'+
        '<svg class="arr" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>'+
        '<span>Completed</span>'+
        '<span class="lv-completed-count">'+allCompleted.length+'</span>'+
      '</div>';
      if (!isCollapsed) {
        html += '<div class="lv-completed-body"><div class="lv-tasks-grid">';
        allCompleted.forEach(function(t){ html += renderListCompletedRow(t, ph); });
        html += '</div></div>';
      }
      html += '</div>';
    }

    html += '</div>';
  });
  html += '</div>';
  cont.innerHTML = html;
}

// v14: Compact list task row — 3 actions (timer, today, delete), no separate check button
function renderListTaskRow(t, ph) {
  var priClass = 'pri-'+t.priority;
  var dueHtml = '';
  if (t.dueDate) {
    var cls = isOverdue(t.dueDate)?' overdue-due':isToday(t.dueDate)?' today-due':'';
    dueHtml = '<span class="lv-task-due'+cls+'">'+fmtDate(t.dueDate)+'</span>';
  }
  var clTotal = t.checklist ? t.checklist.length : 0;
  var clDone  = t.checklist ? t.checklist.filter(function(c){ return c.done; }).length : 0;
  var inTodayPlan = (state.todayPlans||[]).some(function(p){ return p.taskId===t.id && p.date===TODAY_STR; });
  var timerRunning = activeTimer && activeTimer.taskId === t.id;
  var timerBtnClass = timerRunning ? 'tc-act timer-running' : 'tc-act';
  var timerBtnTip   = timerRunning ? 'Stop timer' : 'Start timer';
  var timerAction   = timerRunning ? 'stopTimer()' : 'startTimer(\''+ph.id+'\',\''+t.id+'\')';
  var timerIcon     = timerRunning
    ? '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
    : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  var todayTip = inTodayPlan ? 'Remove from Today' : 'Add to Today';
  var todayClass = inTodayPlan ? 'tc-act active' : 'tc-act';

  return '<div class="lv-task '+priClass+'" onclick="openTaskModal(\''+ph.id+'\',\''+t.id+'\')" tabindex="0" role="button">'+
    '<div class="lv-cb'+(t.checked?' checked':'')+'" onclick="event.stopPropagation();toggleTaskDone(\''+ph.id+'\',\''+t.id+'\')">'+
      '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'+
    '</div>'+
    '<div class="lv-task-main">'+
      '<div class="lv-title">'+esc(t.text)+'</div>'+
      (t.description ? '<div class="lv-task-subtitle"><span class="lv-task-desc">'+esc(t.description.slice(0,45))+(t.description.length>45?'…':'')+'</span></div>' : '')+
    '</div>'+
    (inTodayPlan ? '<span class="lv-today-badge">Today</span>' : '')+
    (clTotal>0 ? '<span class="lv-task-checklist">'+clDone+'/'+clTotal+'</span>' : '')+
    dueHtml+
    '<div class="lv-task-actions" onclick="event.stopPropagation()">'+
      '<div class="'+timerBtnClass+'" data-tip="'+timerTip(timerRunning)+'" onclick="'+timerAction+'">'+timerIcon+'</div>'+
      '<div class="'+todayClass+'" data-tip="'+todayTip+'" onclick="toggleTaskToday(\''+ph.id+'\',\''+t.id+'\')">'+
        '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'+
        (inTodayPlan?'<polyline points="9 15 12 18 16 13"/>':'<line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>')+
        '</svg>'+
      '</div>'+
      '<div class="tc-act del" data-tip="Delete task" onclick="trashTask(\''+ph.id+'\',\''+t.id+'\')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>'+
    '</div>'+
  '</div>';
}

function timerTip(running){ return running ? 'Stop timer' : 'Start timer'; }

// v13: Completed task row in list view
function renderListCompletedRow(t, ph) {
  return '<div class="lv-task lv-task-completed" tabindex="0">'+
    '<div class="lv-cb checked"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>'+
    '<div class="lv-task-main">'+
      '<div class="lv-title done">'+esc(t.text)+'</div>'+
    '</div>'+
    '<button class="lv-restore-btn" onclick="event.stopPropagation();restoreCompletedTask(\''+ph.id+'\',\''+t.id+'\')" title="Restore">'+
      '<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.36"/></svg>'+
    '</button>'+
  '</div>';
}

function setBoardView(v) {
  state.boardView = v;
  saveState();
  var k = document.getElementById('vt-kanban');
  var l = document.getElementById('vt-list');
  if (k) k.classList.toggle('active', v==='kanban');
  if (l) l.classList.toggle('active', v==='list');
  renderBoard();
}

function renderArchiveStrip() {
  var strip = document.getElementById('board-archive-strip');
  if (!strip) return;
  var archived = state.archivedPhases || [];
  if (!archived.length) { strip.style.display='none'; return; }
  strip.style.display = 'block';
  var html = '<div class="archive-hd'+(archiveOpen?' open':'')+'" onclick="toggleArchive()">'+
    '<svg class="arr" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>'+
    '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>'+
    ' Archived <span class="archive-count-badge">'+archived.length+'</span></div>';
  if (archiveOpen) {
    html += '<div class="archive-list">'+archived.map(function(ph,i){
      var done  = ph.tasks.filter(function(t){return t.checked;}).length;
      var total = ph.tasks.length;
      var archDate = ph.archivedAt ? new Date(ph.archivedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '';
      return '<div class="arch-card" style="border-left-color:'+esc(ph.color)+'">'+
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">'+
          '<div style="width:9px;height:9px;border-radius:50%;background:'+esc(ph.color)+';flex-shrink:0;"></div>'+
          '<div class="arch-card-title">'+esc(ph.title)+'</div>'+
        '</div>'+
        '<div class="arch-card-meta">'+done+'/'+total+' tasks done</div>'+
        (archDate ? '<div class="arch-card-date">Archived '+archDate+'</div>' : '')+
        '<div class="arch-card-restore" onclick="restoreArchivedPhase('+i+')" role="button" tabindex="0">'+
          '<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.36"/></svg> Restore'+
        '</div>'+
      '</div>';
    }).join('')+'</div>';
  }
  strip.innerHTML = html;
}

function toggleArchive(){ archiveOpen=!archiveOpen; renderArchiveStrip(); }

function phaseDragStart(e,idx){ dragSrcIdx=idx; e.dataTransfer.effectAllowed='move'; setTimeout(function(){e.currentTarget.classList.add('dragging');},0); }
function phaseDragOver(e,idx){ e.preventDefault(); e.dataTransfer.dropEffect='move'; document.querySelectorAll('.ph-col').forEach(function(el){el.classList.remove('drag-over');}); if(idx!==dragSrcIdx) e.currentTarget.classList.add('drag-over'); }
function phaseDragLeave(e){ e.currentTarget.classList.remove('drag-over'); }
function phaseDrop(e,targetIdx){
  e.preventDefault();
  document.querySelectorAll('.ph-col').forEach(function(el){el.classList.remove('drag-over','dragging');});
  if(dragSrcIdx===null||dragSrcIdx===targetIdx){dragSrcIdx=null;return;}
  var moved = state.phases.splice(dragSrcIdx,1)[0];
  state.phases.splice(targetIdx,0,moved);
  dragSrcIdx=null;
  saveState(); renderBoard(); toast('Phase reordered','success',3500,'phase');
}

function togglePhToday(phaseId){
  var key='phtoday_'+phaseId;
  window[key]=!window[key];
  renderBoard();
}

function restoreArchivedPhase(idx){
  if(!state.archivedPhases||!state.archivedPhases[idx]) return;
  var ph=state.archivedPhases.splice(idx,1)[0];
  state.phases.push(ph);
  logActivity('Restored archived phase "'+ph.title+'"');
  saveState(); renderAll(); toast('Phase restored','success',3500,'restore');
}

function setTodayPhaseStatus(id,status){
  var r=(state.todayPhaseRecords||[]).find(function(r){return r.id===id;});
  if(!r) return;
  r.status=(r.status===status)?'pending':status;
  saveState(); renderBoard(); if(currentView==='today') renderToday();
}

function deleteTodayRecord(id){
  state.todayPhaseRecords=(state.todayPhaseRecords||[]).filter(function(r){return r.id!==id;});
  saveState(); renderBoard(); if(currentView==='today') renderToday();
  toast('Record deleted','info',3500,'trash');
}

function openAddTodayRecordModal(){
  document.getElementById('planner-phase-id').value='__today_log__';
  document.getElementById('planner-modal-title').textContent='Add to Today Log';
  document.getElementById('plan-date').value=TODAY_STR;
  document.getElementById('plan-title').value='';
  document.getElementById('plan-text').value='';
  renderPlannerList('__today_log__');
  openModal('planner-modal');
  setTimeout(function(){document.getElementById('plan-title').focus();},100);
}

// v13: Toggle add/remove task from today's plan
function toggleTaskToday(phId, taskId) {
  var ph = state.phases.find(function(p){ return p.id === phId; });
  if (!ph) return;
  var task = ph.tasks.find(function(t){ return t.id === taskId; });
  if (!task) return;
  
  if (!state.todayPlans) state.todayPlans = [];
  
  var existingIdx = state.todayPlans.findIndex(function(p){
    return p.taskId === taskId && p.date === TODAY_STR;
  });
  
  if (existingIdx !== -1) {
    // Remove from today's plan
    state.todayPlans.splice(existingIdx, 1);
    saveState();
    updateBadges();
    renderBoard();
    toast('Removed from today's plan','info',3500,'plan');
  } else {
    // Add to today's plan
    state.todayPlans.push({
      id: uid(),
      taskId: taskId,
      phaseId: phId,
      text: task.text,
      date: TODAY_STR,
      status: 'pending',
      fromBoard: true
    });
    saveState();
    updateBadges();
    renderBoard();
    toast('Added to today's plan','success',3500,'plan');
  }
}

// Legacy function for backwards compatibility
function addTaskToToday(phId, taskId) {
  toggleTaskToday(phId, taskId);
}

// v13: Enhanced task completion with animation and progress unlock
function toggleTaskDone(phaseId, taskId) {
  var ph = state.phases.find(function(p){ return p.id === phaseId; });
  if (!ph) return;
  var task = ph.tasks.find(function(t){ return t.id === taskId; });
  if (!task) return;
  
  var card = document.getElementById('task-' + taskId);
  
  if (!task.checked) {
    // Mark as done with animation
    task.checked = true;
    task.completedAt = new Date().toISOString();
    
    if (card) {
      card.classList.add('completing');
      setTimeout(function() {
        saveState();
        renderBoard();
        updateBadges();
        toast('Task completed','success',3500,'task_done');
      }, 300);
    } else {
      saveState();
      renderBoard();
      updateBadges();
      toast('Task completed','success',3500,'task_done');
    }
  } else {
    // Unmark - restore to active
    task.checked = false;
    delete task.completedAt;
    saveState();
    renderBoard();
    updateBadges();
    toast('Task restored to active','info',3500,'restore');
  }
}
