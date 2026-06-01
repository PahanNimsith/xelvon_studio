/* ══ PHASE MODAL + PHASE CONTEXT MENU ══ */
var _phaseEditId = null;
var _phaseMenuOpen = null; /* id of currently open phase dropdown */

/* Close dropdown on outside click */
document.addEventListener('click', function(e) {
  if (!e.target.closest('.ph-dropdown')) closePhaseDropdown();
});

/* ── Phase context dropdown (⋯) ── */
function openPhaseMenu(phaseId, e) {
  e.stopPropagation();
  /* If same one is open, toggle closed */
  if (_phaseMenuOpen === phaseId) { closePhaseDropdown(); return; }
  closePhaseDropdown();
  _phaseMenuOpen = phaseId;
  /* Build inline dropdown next to the button */
  var btn = e.currentTarget;
  var menu = document.createElement('div');
  menu.className = 'ph-dropdown';
  menu.setAttribute('role','menu');
  menu.innerHTML =
    '<button class="ph-dd-item" onclick="closePhaseDropdown();editPhase(\''+phaseId+'\')">'+
      '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit Phase'+
    '</button>'+
    '<button class="ph-dd-item" onclick="closePhaseDropdown();archivePhase(\''+phaseId+'\')">'+
      '<svg viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>Archive Phase'+
    '</button>'+
    '<div class="ph-dd-sep"></div>'+
    '<button class="ph-dd-item danger" onclick="closePhaseDropdown();deletePhase(\''+phaseId+'\')">'+
      '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>Delete Phase'+
    '</button>';
  /* Position relative to button */
  var rect = btn.getBoundingClientRect();
  menu.style.cssText = 'position:fixed;top:'+(rect.bottom+4)+'px;right:'+(window.innerWidth-rect.right)+'px;z-index:9999;';
  document.body.appendChild(menu);
}

function closePhaseDropdown() {
  _phaseMenuOpen = null;
  var existing = document.querySelector('.ph-dropdown');
  if (existing) existing.remove();
}

/* ── Edit phase (open modal) ── */
function editPhase(phaseId) {
  var ph = state.phases.find(function(p){ return p.id===phaseId; });
  if (!ph) return;
  _phaseEditId = phaseId;
  document.getElementById('phase-modal-title').textContent = 'Edit Phase';
  document.getElementById('phase-name').value = ph.title;
  document.getElementById('phase-desc').value = ph.description||'';
  document.getElementById('phase-start').value = ph.startDate||TODAY_STR;
  var dl = ph.deadline||{value:3,unit:'months'};
  document.getElementById('phase-dl-val').value = dl.value;
  document.getElementById('phase-dl-unit').value = dl.unit;
  renderPhaseColors(ph.color||PHASE_COLORS[0]);
  document.getElementById('phase-color-selected').value = ph.color||PHASE_COLORS[0];
  openModal('phase-modal');
}

function openNewPhaseModal() {
  _phaseEditId = null;
  document.getElementById('phase-modal-title').textContent = 'New Phase';
  document.getElementById('phase-name').value = '';
  document.getElementById('phase-desc').value = '';
  document.getElementById('phase-start').value = TODAY_STR;
  document.getElementById('phase-dl-val').value = 3;
  document.getElementById('phase-dl-unit').value = 'months';
  renderPhaseColors(PHASE_COLORS[0]);
  document.getElementById('phase-color-selected').value = PHASE_COLORS[0];
  openModal('phase-modal');
  setTimeout(function(){ document.getElementById('phase-name').focus(); }, 100);
}

function renderPhaseColors(sel) {
  var row = document.getElementById('phase-color-row');
  if (!row) return;
  row.innerHTML = PHASE_COLORS.map(function(c){
    return '<div class="color-swatch'+(c===sel?' selected':'')+'\" style="background:'+c+';" onclick="selectPhaseColor(\''+c+'\')" role="radio" aria-checked="'+(c===sel)+'" aria-label="Color" tabindex="0"></div>';
  }).join('');
}

function selectPhaseColor(c) {
  document.getElementById('phase-color-selected').value = c;
  renderPhaseColors(c);
}

function savePhase() {
  var name  = document.getElementById('phase-name').value.trim();
  var desc  = document.getElementById('phase-desc').value.trim();
  var start = document.getElementById('phase-start').value;
  var dlVal = parseInt(document.getElementById('phase-dl-val').value)||3;
  var dlUnit= document.getElementById('phase-dl-unit').value||'months';
  var color = document.getElementById('phase-color-selected').value||PHASE_COLORS[0];
  if (!name) { toast('Phase name required','error',3500,'phase'); document.getElementById('phase-name').focus(); return; }
  if (!/^#[0-9a-fA-F]{3,8}$/.test(color)) { color = PHASE_COLORS[0]; }

  if (_phaseEditId) {
    var ph = state.phases.find(function(p){ return p.id===_phaseEditId; });
    if (ph) { ph.title=name; ph.description=desc; ph.startDate=start; ph.deadline={value:dlVal,unit:dlUnit}; ph.color=color; }
    logActivity('Updated phase "'+name+'"');
    toast('Phase updated','success',3500,'phase');
  } else {
    var phNew = { id:uid(), title:name, description:desc, color:color, startDate:start, deadline:{value:dlVal,unit:dlUnit}, tasks:[], dailyPlans:[] };
    state.phases.push(phNew);
    logActivity('Created phase "'+name+'"');
    toast('Phase created','success',3500,'phase');
  }
  saveState(); closeModal('phase-modal'); renderAll(); updateBadges(); updateSavePill('unsaved');
}

/* ── Delete phase ── */
function deletePhase(phaseId) {
  var ph = state.phases.find(function(p){ return p.id===phaseId; });
  if (!ph) return;
  showConfirm({
    title: 'Delete Phase',
    message: 'Move "'+ph.title+'" and all its tasks to Trash?',
    confirmLabel: 'Delete',
    confirmStyle: 'danger',
    onConfirm: function() {
      state.trash.push({ type:'phase', phase:JSON.parse(JSON.stringify(ph)), deletedAt:new Date().toISOString() });
      state.phases = state.phases.filter(function(p){ return p.id!==phaseId; });
      logActivity('Deleted phase "'+ph.title+'"');
      saveState(); closeModal('phase-modal'); renderAll(); updateBadges(); updateSavePill('unsaved');
      toast('Phase moved to trash','info',3500,'trash');
    }
  });
}

/* ── Archive phase ── */
function archivePhase(phaseId) {
  var ph = state.phases.find(function(p){ return p.id===phaseId; });
  if (!ph) return;
  showConfirm({
    title: 'Archive Phase',
    message: 'Archive "'+ph.title+'"? You can restore it anytime from the Board.',
    confirmLabel: 'Archive',
    confirmStyle: 'primary',
    onConfirm: function() {
      if (!state.archivedPhases) state.archivedPhases = [];
      var archEntry = JSON.parse(JSON.stringify(ph));
      archEntry.archivedAt = new Date().toISOString();
      state.archivedPhases.push(archEntry);
      state.phases = state.phases.filter(function(p){ return p.id!==phaseId; });
      logActivity('Archived phase "'+ph.title+'"');
      saveState(); renderAll(); updateBadges(); toast('Phase archived','info',3500,'phase');
    }
  });
}
