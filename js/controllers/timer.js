/* ══════════════════════════════════════════════════════
   TIMER CONTROLLER — Xelvon Studio v15
══════════════════════════════════════════════════════ */
var activeTimer = null;
var timerInterval = null;

function startTimer(phaseId, taskId) {
  if (activeTimer) stopTimer();
  const phase = state.phases.find(function(p){ return p.id===phaseId; });
  const task = phase ? phase.tasks.find(function(t){ return t.id===taskId; }) : null;
  if (!task) return;
  activeTimer = { phaseId:phaseId, taskId:taskId, startSecs:Math.floor(Date.now()/1000) };
  const labelEl = document.getElementById('timer-task-label');
  if (labelEl) labelEl.textContent = task.text;
  const bar = document.getElementById('timer-bar');
  if (bar) bar.classList.add('show');
  timerInterval = setInterval(updateTimerDisplay, 1000);
  toast('Timer started: '+task.text,'info',3500,'timer');
  if (currentView === 'board') renderBoard();
  if (currentView === 'today') renderToday();
}

function stopTimer() {
  if (!activeTimer) return;
  clearInterval(timerInterval);
  timerInterval = null;
  const elapsed = Math.floor(Date.now()/1000) - activeTimer.startSecs;
  const phase = state.phases.find(function(p){ return p.id===activeTimer.phaseId; });
  if (phase) {
    const task = phase.tasks.find(function(t){ return t.id===activeTimer.taskId; });
    if (task) {
      task.timeSpent = (task.timeSpent||0) + elapsed;
      logActivity('Logged '+fmtSecs(elapsed)+' on "'+task.text+'"');
    }
  }
  activeTimer = null;
  const bar = document.getElementById('timer-bar');
  if (bar) bar.classList.remove('show');
  saveState(); renderAll();
  toast('Timer stopped','info',3500,'timer');
}

function updateTimerDisplay() {
  if (!activeTimer) return;
  const elapsed = Math.floor(Date.now()/1000) - activeTimer.startSecs;
  const m = Math.floor(elapsed/60), s = elapsed%60;
  const disp = document.getElementById('timer-display');
  if (disp) disp.textContent = (m<10?'0':'')+m+':'+(s<10?'0':'')+s;
}
