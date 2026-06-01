/* ══════════════════════════════════════════════════════
   PLANNER MODAL
   FIX #5: editId preserved through re-renders using
   data attribute instead of relying on DOM state.
══════════════════════════════════════════════════════ */
function openPlannerModal(phaseId) {
  document.getElementById('planner-phase-id').value  = phaseId;
  document.getElementById('planner-modal-title').textContent = 'Daily Planner';
  document.getElementById('plan-date').value  = TODAY_STR;
  document.getElementById('plan-title').value = '';
  document.getElementById('plan-text').value  = '';
  document.getElementById('plan-edit-id').value = '';
  renderPlannerList(phaseId);
  openModal('planner-modal');
  setTimeout(function(){ document.getElementById('plan-title').focus(); }, 100);
}

function renderPlannerList(phaseId) {
  var wrap = document.getElementById('planner-list');
  if (!wrap) return;
  var plans = [];
  if (phaseId === '__today_log__') {
    plans = state.todayPhaseRecords || [];
  } else {
    var ph = state.phases.find(function(p){ return p.id===phaseId; });
    plans = ph ? (ph.dailyPlans||[]) : [];
  }
  if (!plans.length) { wrap.innerHTML = '<div class="plan-empty">No plans added yet.</div>'; return; }
  // Sort by date descending
  var sorted = plans.slice().sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
  wrap.innerHTML = sorted.map(function(p){
    var isDone=p.status==='done', isFail=p.status==='failed', isSkip=p.status==='skipped';
    var dotClr=isDone?'var(--success)':isFail?'var(--danger)':isSkip?'var(--warning)':'var(--brand)';
    return '<div class="plan-entry">'+
      '<span class="plan-entry-date" style="color:'+dotClr+'">'+esc(p.date||'—')+'</span>'+
      '<div style="flex:1;min-width:0;">'+
        '<div style="font-size:.82rem;font-weight:600;color:var(--text)'+(isDone?';text-decoration:line-through;color:var(--text3)':'')+'" >'+esc(p.title||p.text||'—')+'</div>'+
        (p.text&&p.title?'<div style="font-size:.72rem;color:var(--text2);margin-top:2px;">'+esc(p.text)+'</div>':'')+
      '</div>'+
      '<button class="plan-del-btn" aria-label="Delete plan" onclick="deletePlanEntry(\''+phaseId+'\',\''+p.id+'\')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'+
    '</div>';
  }).join('');
}

function addPlanEntry() {
  var phaseId  = document.getElementById('planner-phase-id').value;
  var date     = document.getElementById('plan-date').value;
  var title    = document.getElementById('plan-title').value.trim();
  var text     = document.getElementById('plan-text').value.trim();
  // FIX: preserve editId through DOM
  var editId   = document.getElementById('plan-edit-id').value;

  if (!title) { toast('Title is required','error',3500,'plan'); document.getElementById('plan-title').focus(); return; }
  if (!date)  { toast('Date is required','error',3500,'plan');  document.getElementById('plan-date').focus();  return; }

  var entry = { id: editId||uid(), date:date, title:title, text:text, status:'pending' };

  if (phaseId === '__today_log__') {
    if (!state.todayPhaseRecords) state.todayPhaseRecords = [];
    if (editId) {
      var idx = state.todayPhaseRecords.findIndex(function(p){ return p.id===editId; });
      if (idx>-1) state.todayPhaseRecords[idx] = entry; else state.todayPhaseRecords.push(entry);
    } else {
      state.todayPhaseRecords.push(entry);
    }
  } else {
    var ph = state.phases.find(function(p){ return p.id===phaseId; });
    if (!ph) return;
    if (!ph.dailyPlans) ph.dailyPlans = [];
    if (editId) {
      var pidx = ph.dailyPlans.findIndex(function(p){ return p.id===editId; });
      if (pidx>-1) ph.dailyPlans[pidx] = entry; else ph.dailyPlans.push(entry);
    } else {
      ph.dailyPlans.push(entry);
    }
  }

  // Reset form but keep phaseId
  document.getElementById('plan-edit-id').value = '';
  document.getElementById('plan-title').value   = '';
  document.getElementById('plan-text').value    = '';
  document.getElementById('plan-date').value    = TODAY_STR;

  logActivity('Added plan "'+title+'" for '+date);
  saveState(); renderPlannerList(phaseId);
  if (currentView==='board') renderBoard();
  if (currentView==='today') renderToday();
  toast((editId?'Plan updated':'Plan added'),'success',3500,'plan');
  setTimeout(function(){ document.getElementById('plan-title').focus(); }, 50);
}

function deletePlanEntry(phaseId, planId) {
  if (phaseId === '__today_log__') {
    state.todayPhaseRecords = (state.todayPhaseRecords||[]).filter(function(p){ return p.id!==planId; });
  } else {
    var ph = state.phases.find(function(p){ return p.id===phaseId; });
    if (ph && ph.dailyPlans) ph.dailyPlans = ph.dailyPlans.filter(function(p){ return p.id!==planId; });
  }
  saveState(); renderPlannerList(phaseId);
  if (currentView==='board') renderBoard();
  if (currentView==='today') renderToday();
  toast('Plan removed','info',3500,'trash');
}

function setPlanStatus(phaseId, planId, status) {
  var ph = state.phases.find(function(p){ return p.id===phaseId; });
  if (!ph || !ph.dailyPlans) return;
  var plan = ph.dailyPlans.find(function(p){ return p.id===planId; });
  if (plan) plan.status = (plan.status===status) ? 'pending' : status;
  saveState(); renderBoard();
  if (currentView==='today') renderToday();
}
