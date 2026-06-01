/* ══════════════════════════════════════════════════════
   CONSTANTS & PURE UTILITIES — Xelvon Studio v15
   v14 Features:
   - Removed "Cannot restore" messages
   - Version update
══════════════════════════════════════════════════════ */
const APP_VERSION = '16';
const THEMES = ['theme-light','theme-dark','theme-light-glow','theme-dark-glow'];
const PHASE_COLORS = ['#5B6CFF','#22D3EE','#F59E0B','#10B981','#EF4444','#D946EF','#F97316','#06B6D4','#8B5CF6','#EC4899'];
const FOLDER_COLORS = ['#5B6CFF','#22D3EE','#F59E0B','#10B981','#EF4444','#D946EF','#F97316','#8B5CF6','#EC4899','#6B7280'];
const TODAY_STR = (function(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); })();
const ACTIVITY_LOG_MAX = 50;

/* Theme dot colors - fitted to project palette */
const THEME_DOT_COLORS = {
  'theme-light':      { fill: '#F4F5FB', border: '#C4C9DC' },
  'theme-dark':       { fill: '#0F1018', border: 'rgba(255,255,255,0.18)' },
  'theme-light-glow': { fill: '#EEF0FA', border: '#C8CCDD' },
  'theme-dark-glow':  { fill: '#1a0a2e', border: 'rgba(255,255,255,0.18)' }
};

/* v14: Simplified recovery - all tasks can be restored */
const RECOVERY_LIMITS = {
  done: -1,      // Done tasks: always restorable
  failed: -1,    // Failed tasks: always restorable
  skipped: -1    // Skipped: always restorable
};

function uid() { return Math.random().toString(36).slice(2,10) + Date.now().toString(36); }
function esc(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtDate(d) { if (!d) return ''; const dt = new Date(d+'T00:00:00'); return dt.toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
function isOverdue(d) { return d && d < TODAY_STR; }
function isToday(d) { return d === TODAY_STR; }
function fmtSecs(s) { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; if(h>0) return h+'h '+m+'m'; if(m>0) return m+'m '+sec+'s'; return sec+'s'; }
function fmtRelTime(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60)+'m ago';
  if (diff < 86400) return Math.floor(diff/3600)+'h ago';
  return Math.floor(diff/86400)+'d ago';
}
function tryGetDomain(url) {
  try { return new URL(url).hostname.replace('www.',''); } catch(e){ return ''; }
}
function logActivity(text) {
  if (!state.activityLog) state.activityLog = [];
  state.activityLog.unshift({ text: text, time: new Date().toISOString() });
  if (state.activityLog.length > ACTIVITY_LOG_MAX) state.activityLog.length = ACTIVITY_LOG_MAX;
}

/* Generate unique copy name - avoids duplicates */
function generateCopyName(baseName, existingNames) {
  if (!existingNames.includes(baseName)) return baseName;
  var copyRegex = /^(.+) copy(?: (\d+))?$/i;
  var match = baseName.match(copyRegex);
  var root = match ? match[1] : baseName;
  var maxNum = 0;
  existingNames.forEach(function(n) {
    if (n === root + ' copy') maxNum = Math.max(maxNum, 1);
    var m = n.match(new RegExp('^' + root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' copy (\\d+)$', 'i'));
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  });
  return root + ' copy' + (maxNum > 0 ? ' ' + (maxNum + 1) : '');
}

/* v14: Simplified - all tasks can always be recovered */
function canRecoverTask(status, completedAt) {
  return { canRecover: true, reason: null };
}
