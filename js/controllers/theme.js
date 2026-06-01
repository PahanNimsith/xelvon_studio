/* ══════════════════════════════════════════════════════
   THEME CONTROLLER — Xelvon Studio v15
══════════════════════════════════════════════════════ */
function setTheme(t) {
  THEMES.forEach(function(th){ document.documentElement.classList.remove(th); });
  document.documentElement.classList.add(t);
  state.theme = t;
  document.querySelectorAll('.sb-theme-dot').forEach(function(el){
    el.classList.toggle('active', el.dataset.t === t);
  });
  saveState();
}
function applyTheme() { setTheme(state.theme || 'theme-light'); }
