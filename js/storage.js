/* ══════════════════════════════════════════════════════
   STORAGE — Supabase primary, localStorage fallback
   Xelvon Studio v11
══════════════════════════════════════════════════════ */

async function loadFromSupabase() {
  if (!_currentUser) return null;
  try {
    var res = await _sb
      .from('user_data')
      .select('data')
      .eq('user_id', _currentUser.id)
      .single();
    if (res.error || !res.data) return null;
    var d = res.data.data;
    return (typeof d === 'string') ? JSON.parse(d) : d;
  } catch(e) {
    console.warn('[Xelvon] Supabase load failed:', e);
    return null;
  }
}

async function saveToSupabase() {
  if (!_currentUser) return;
  try {
    var res = await _sb.from('user_data').upsert(
      { user_id: _currentUser.id, data: state },
      { onConflict: 'user_id' }
    );
    if (res.error) throw res.error;
  } catch(e) {
    console.warn('[Xelvon] Supabase save failed:', e);
  }
}

function saveState() {
  var tag = document.getElementById('xelvon-data');
  if (tag) tag.textContent = JSON.stringify(state);
  try { localStorage.setItem('xelvon_v4', JSON.stringify(state)); } catch(e) {}
  saveToSupabase();
  updateSavePill('saved');
}

function updateSavePill(mode) {
  var pill = document.getElementById('save-pill');
  if (!pill) return;
  var checkIcon = '<svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2.8;"><path d="M20 6L9 17l-5-5"/></svg>';
  pill.className = 'save-pill';
  pill.title = 'Auto-saved';
  pill.innerHTML = checkIcon + '<span>Saved</span>';
  pill.onclick = null;
}

function exportJSON() {
  var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'xelvon-backup-' + TODAY_STR + '.json';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  toast('Backup exported - keep this file safe', 'success');
}

function importJSON(e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var imp = JSON.parse(ev.target.result);
      if (!imp.phases) throw new Error('invalid');
      state = imp;
      migrateState();
      saveState();
      applyTheme();
      applyProfile();
      renderAll();
      closeModal('backup-modal');
      toast('Workspace restored from backup', 'success');
    } catch(err) {
      toast('Invalid backup file - nothing changed', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function clearAllData() {
  showConfirm({
    title: 'Reset Workspace',
    message: 'This will permanently delete all your phases, tasks, notes, and links. This cannot be undone.',
    confirmLabel: 'Reset Everything',
    confirmStyle: 'danger',
    onConfirm: function() {
      try { localStorage.removeItem('xelvon_v4'); } catch(e) {}
      state = makeSeed();
      if (_currentUser) {
        _sb.from('user_data').delete().eq('user_id', _currentUser.id).then(function(){});
      }
      saveState();
      renderAll();
      applyProfile();
      updateBadges();
      closeModal('backup-modal');
      toast('Workspace cleared', 'info');
    }
  });
}
