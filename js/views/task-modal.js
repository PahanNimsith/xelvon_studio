/* ══════════════════════════════════════════════════════
   TASK MODAL — open / save / delete tasks
   FIX: Tags Tab handling fixed; date validated before save
══════════════════════════════════════════════════════ */
var _taskEditPhaseId = null;
var _taskEditId = null;
var _taskTags = [];
var _taskChecklist = [];

function openNewTaskModal(phaseId) {
  _taskEditPhaseId = phaseId || (state.phases[0] ? state.phases[0].id : null);
  _taskEditId = null;
  _taskTags = [];
  _taskChecklist = [];
  _populateTaskModal(null);
  openModal('task-modal');
  setTimeout(function(){ var el=document.getElementById('task-text'); if(el) el.focus(); }, 100);
}

function openTaskModal(phaseId, taskId) {
  _taskEditPhaseId = phaseId;
  _taskEditId = taskId;
  var phase = state.phases.find(function(p){ return p.id===phaseId; });
  var task  = phase ? phase.tasks.find(function(t){ return t.id===taskId; }) : null;
  _taskTags      = task ? (task.tags||[]).slice() : [];
  _taskChecklist = task ? (task.checklist||[]).map(function(c){ return Object.assign({},c); }) : [];
  _populateTaskModal(task);
  openModal('task-modal');
}

function _populateTaskModal(t) {
  var phaseOpts = state.phases.map(function(ph){
    return '<option value="'+ph.id+'"'+(ph.id===_taskEditPhaseId?' selected':'')+'>'+esc(ph.title)+'</option>';
  }).join('');
  document.getElementById('task-modal-title').textContent = t ? 'Edit Task' : 'New Task';
  document.getElementById('task-text').value    = t ? t.text        : '';
  document.getElementById('task-desc').value    = t ? t.description||'' : '';
  document.getElementById('task-priority').value= t ? t.priority||'med'  : 'med';
  document.getElementById('task-due').value     = t ? t.dueDate||'' : '';
  document.getElementById('task-phase').innerHTML = phaseOpts;
  if (t && t.timeSpent) {
    document.getElementById('task-time-info').textContent = 'Logged time: '+fmtSecs(t.timeSpent);
    document.getElementById('task-time-info').style.display='block';
  } else {
    document.getElementById('task-time-info').style.display='none';
  }
  renderTaskModalTags();
  renderTaskModalChecklist();
}

function renderTaskModalTags() {
  var wrap = document.getElementById('task-tags-wrap');
  if (!wrap) return;
  var pills = _taskTags.map(function(tg, i){
    return '<span class="tag-pill">'+esc(tg)+'<span class="tag-pill-x" onclick="removeTaskTag('+i+')" aria-label="Remove tag">×</span></span>';
  }).join('');
  var sugs = (state.tags||[]).filter(function(s){ return !_taskTags.includes(s); }).slice(0,6);
  var sugHtml = sugs.length ? '<div class="tag-suggestions">'+sugs.map(function(s){
    return '<div class="tag-sug-item" onclick="addTaskTag(\''+esc(s)+'\')" tabindex="0" role="button">'+esc(s)+'</div>';
  }).join('')+'</div>' : '';
  wrap.innerHTML =
    '<div class="tags-input-wrap" onclick="document.getElementById(\'tag-input\').focus()">'+
      pills+
      '<input id="tag-input" class="tag-input" placeholder="Add tag…" autocomplete="off"'+
      ' onkeydown="handleTagKeydown(event)" aria-label="Add tag">'+
    '</div>'+sugHtml;
}

// FIX: Tab now correctly blurs/moves focus instead of adding a tab character
//      Comma and Enter both confirm a tag
function handleTagKeydown(e) {
  var inp = e.target;
  var val = inp.value.trim().replace(/,/g,'');
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    if (val) addTaskTag(val);
    inp.value = '';
  } else if (e.key === 'Tab') {
    if (val) { e.preventDefault(); addTaskTag(val); inp.value=''; }
    // If empty, let Tab bubble naturally to next form element
  } else if (e.key === 'Backspace' && !inp.value && _taskTags.length) {
    _taskTags.pop();
    renderTaskModalTags();
  }
}

function addTaskTag(t) {
  t = t.trim().replace(/[,\t]/g,'');
  if (!t || _taskTags.includes(t)) return;
  _taskTags.push(t);
  if (!state.tags.includes(t)) state.tags.push(t);
  renderTaskModalTags();
  setTimeout(function(){ var el=document.getElementById('tag-input'); if(el) el.focus(); }, 0);
}

function removeTaskTag(i) {
  _taskTags.splice(i,1);
  renderTaskModalTags();
}

function renderTaskModalChecklist() {
  var wrap = document.getElementById('task-checklist-wrap');
  if (!wrap) return;
  var items = _taskChecklist.map(function(c, i){
    return '<div class="cl-item">'+
      '<div class="cl-item-cb'+(c.done?' done':'')+'" onclick="toggleClItem('+i+')" aria-label="Toggle" role="checkbox" aria-checked="'+c.done+'" tabindex="0">'+
        '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'+
      '</div>'+
      '<span class="cl-item-text'+(c.done?' done':'')+'">'+esc(c.text)+'</span>'+
      '<button class="cl-del" onclick="removeClItem('+i+')" aria-label="Remove checklist item"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'+
    '</div>';
  }).join('');
  wrap.innerHTML = items+
    '<div class="cl-add-row">'+
      '<input id="cl-new-text" class="cl-add-input" placeholder="Add checklist item…" onkeydown="if(event.key===\'Enter\'){event.preventDefault();addClItem();}" aria-label="New checklist item">'+
      '<button class="btn btn-ghost" style="padding:6px 12px;font-size:.75rem;" onclick="addClItem()">+ Add</button>'+
    '</div>';
}

function addClItem() {
  var inp = document.getElementById('cl-new-text');
  var text = inp ? inp.value.trim() : '';
  if (!text) return;
  // FIX: use uid() for truly unique IDs, no collision risk
  _taskChecklist.push({ id:uid(), text:text, done:false });
  renderTaskModalChecklist();
  setTimeout(function(){ var el=document.getElementById('cl-new-text'); if(el) el.focus(); }, 0);
}

function removeClItem(i) { _taskChecklist.splice(i,1); renderTaskModalChecklist(); }
function toggleClItem(i) { _taskChecklist[i].done = !_taskChecklist[i].done; renderTaskModalChecklist(); }

function saveTask() {
  var text  = document.getElementById('task-text').value.trim();
  var desc  = document.getElementById('task-desc').value.trim();
  var pri   = document.getElementById('task-priority').value;
  var due   = document.getElementById('task-due').value;
  var phId  = document.getElementById('task-phase').value;

  if (!text) { toast('Task name is required','error',3500,'task_add'); document.getElementById('task-text').focus(); return; }

  // FIX: validate date (impossible dates like Feb 30 auto-corrected by browser,
  //      but we ensure format is correct and not in a ridiculously wrong range)
  if (due) {
    var d = new Date(due+'T00:00:00');
    if (isNaN(d.getTime())) { toast('Invalid date','error',3500,'plan'); document.getElementById('task-due').focus(); return; }
    if (d.getFullYear() < 2020 || d.getFullYear() > 2099) { toast('Date out of range','error',3500,'plan'); return; }
  }

  var phase = state.phases.find(function(p){ return p.id===phId; });
  if (!phase) { toast('Phase not found','error',3500,'phase'); return; }

  if (_taskEditId) {
    var task = phase.tasks.find(function(t){ return t.id===_taskEditId; });
    // Handle phase change
    if (phId !== _taskEditPhaseId) {
      var oldPhase = state.phases.find(function(p){ return p.id===_taskEditPhaseId; });
      if (oldPhase) { oldPhase.tasks = oldPhase.tasks.filter(function(t){ return t.id!==_taskEditId; }); }
    }
    if (task) {
      task.text=text; task.description=desc; task.priority=pri; task.dueDate=due;
      task.tags=_taskTags; task.checklist=_taskChecklist;
    } else {
      // Task moved to new phase
      phase.tasks.push({ id:_taskEditId, text:text, description:desc, priority:pri, dueDate:due, checked:false, tags:_taskTags, checklist:_taskChecklist, timeSpent:0, createdAt:TODAY_STR });
    }
    logActivity('Updated task "'+text+'"');
    toast('Task updated','success',3500,'task_done');
  } else {
    phase.tasks.push({ id:uid(), text:text, description:desc, priority:pri, dueDate:due, checked:false, tags:_taskTags, checklist:_taskChecklist, timeSpent:0, createdAt:TODAY_STR });
    logActivity('Added task "'+text+'" to '+phase.title);
    toast('Task added','success',3500,'task_add');
  }
  saveState(); closeModal('task-modal'); renderAll(); updateBadges(); updateSavePill('unsaved');
}

function toggleTaskDone(phaseId, taskId) {
  var phase = state.phases.find(function(p){ return p.id===phaseId; });
  if (!phase) return;
  var task = phase.tasks.find(function(t){ return t.id===taskId; });
  if (!task) return;
  task.checked = !task.checked;
  logActivity((task.checked?'Completed':'Reopened')+' "'+task.text+'"');
  saveState(); renderAll(); updateBadges(); updateSavePill('unsaved');
}

function trashTask(phaseId, taskId) {
  var phase = state.phases.find(function(p){ return p.id===phaseId; });
  if (!phase) return;
  var task = phase.tasks.find(function(t){ return t.id===taskId; });
  if (!task) return;
  state.trash.push({ type:'task', task:JSON.parse(JSON.stringify(task)), phaseId:phaseId, phaseTitle:phase.title, deletedAt:new Date().toISOString() });
  phase.tasks = phase.tasks.filter(function(t){ return t.id!==taskId; });
  logActivity('Deleted task "'+task.text+'"');
  saveState(); renderAll(); updateBadges(); updateSavePill('unsaved');
  toast('Task moved to trash','info',3500,'trash');
}
