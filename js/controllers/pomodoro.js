/* ══════════════════════════════════════════════════════
   POMODORO CONTROLLER — Xelvon Studio v14
   v14: Slide animation, click-outside close
══════════════════════════════════════════════════════ */
var pomoRunning = false, pomoSecs = 0, pomoTotal = 0, pomoMode = 'work', pomoInterval = null;

// v14: Click outside to close Pomodoro widget
document.addEventListener('click', function(e) {
  var widget = document.getElementById('pomo-widget');
  if (!widget || !widget.classList.contains('open')) return;
  
  // Check if click is outside the widget
  if (!widget.contains(e.target) && !e.target.closest('[onclick*="togglePomodoro"]')) {
    closePomodoroWidget();
  }
});

function togglePomodoro() {
  const w = document.getElementById('pomo-widget');
  if (!w) return;
  
  if (!w.classList.contains('open')) {
    // v14: Open with slide-up animation
    w.classList.remove('closing');
    w.classList.add('open');
    resetPomo(true);
  } else {
    closePomodoroWidget();
  }
}

// v14: Close with slide-down animation
function closePomodoroWidget() {
  const w = document.getElementById('pomo-widget');
  if (!w || !w.classList.contains('open')) return;
  
  w.classList.add('closing');
  setTimeout(function() {
    w.classList.remove('open', 'closing');
  }, 250);
}

function resetPomo(silent) {
  clearInterval(pomoInterval); pomoRunning = false;
  pomoMode = 'work';
  pomoSecs = (state.pomodoroSettings.work || 25) * 60;
  pomoTotal = pomoSecs;
  updatePomoUI();
  const btn = document.getElementById('pomo-start-btn');
  if (btn) btn.textContent = 'Start';
  if (!silent) toast('Pomodoro reset','info',3500,'pomodoro');
}

function togglePomo() {
  if (pomoRunning) {
    clearInterval(pomoInterval); pomoRunning = false;
    const btn = document.getElementById('pomo-start-btn');
    if (btn) btn.textContent = 'Resume';
  } else {
    pomoRunning = true;
    const btn = document.getElementById('pomo-start-btn');
    if (btn) btn.textContent = 'Pause';
    pomoInterval = setInterval(function(){
      pomoSecs--;
      if (pomoSecs <= 0) {
        clearInterval(pomoInterval); pomoRunning = false;
        if (pomoMode === 'work') {
          pomoMode = 'break';
          pomoSecs = (state.pomodoroSettings.shortBreak || 5) * 60;
          toast('Work session done! Take a break.','success',3500,'pomodoro');
        } else {
          pomoMode = 'work';
          pomoSecs = (state.pomodoroSettings.work || 25) * 60;
          toast('Break over. Back to work!','info',3500,'pomodoro');
        }
        pomoTotal = pomoSecs;
        const btn2 = document.getElementById('pomo-start-btn');
        if (btn2) btn2.textContent = 'Start';
      }
      updatePomoUI();
    }, 1000);
  }
}

function applyPomoSettings() {
  const w = parseInt(document.getElementById('pomo-set-work').value) || 25;
  const b = parseInt(document.getElementById('pomo-set-break').value) || 5;
  state.pomodoroSettings.work = Math.max(1, Math.min(120, w));
  state.pomodoroSettings.shortBreak = Math.max(1, Math.min(60, b));
  saveState();
  resetPomo(false);
  toast('Pomodoro settings saved','success',3500,'save');
}

function updatePomoUI() {
  const m = Math.floor(pomoSecs/60), s = pomoSecs%60;
  const disp = document.getElementById('pomo-display');
  const mode = document.getElementById('pomo-mode');
  const prog = document.getElementById('pomo-prog');
  if (disp) disp.textContent = (m<10?'0':'')+m+':'+(s<10?'0':'')+s;
  if (mode) mode.textContent = pomoMode === 'work' ? 'Work Session' : 'Break Time';
  const pct = pomoTotal > 0 ? ((pomoTotal-pomoSecs)/pomoTotal*100) : 0;
  if (prog) prog.style.width = pct + '%';
}
