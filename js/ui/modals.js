/* ══════════════════════════════════════════════════════
   MODALS — Xelvon Studio v11
   - Focus trap in modals
   - Recycle Bin with bulk select
   - Profile sync fix
══════════════════════════════════════════════════════ */
var _trashSelected = [];
var _trashLastClickedIdx = null;

function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('open');
  m.setAttribute('aria-modal', 'true');
  requestAnimationFrame(function() {
    const focusable = m.querySelector('input:not([type=hidden]),textarea,select,button:not(.modal-close)');
    if (focusable) focusable.focus();
  });
  if (id === 'trash-modal') { _trashSelected = []; renderTrashModal(); }
  initFocusTrap(m);
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove('open');
    removeFocusTrap(m);
  }
  if (id === 'trash-modal') { _trashSelected = []; _trashLastClickedIdx = null; }
}

function handleOverlayClose(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}

/* Focus trap */
var _focusTrapHandler = null;
function initFocusTrap(modal) {
  _focusTrapHandler = function(e) {
    if (e.key !== 'Tab') return;
    var focusable = modal.querySelectorAll('button, [href], input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  };
  document.addEventListener('keydown', _focusTrapHandler);
}
function removeFocusTrap(modal) {
  if (_focusTrapHandler) document.removeEventListener('keydown', _focusTrapHandler);
  _focusTrapHandler = null;
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const so = document.getElementById('search-overlay');
    if (so && so.classList.contains('open')) { closeSearch(); return; }
    const openModals = document.querySelectorAll('.modal-overlay.open');
    if (openModals.length) openModals[openModals.length-1].classList.remove('open');
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault(); openSearch();
  }
});

/* Confirm modal */
var _confirmCallback = null;
var _cancelCallback  = null;

function showConfirm(opts) {
  opts = opts || {};
  var title   = opts.title   || 'Are you sure?';
  var message = opts.message || '';
  var label   = opts.confirmLabel || 'Confirm';
  var style   = opts.confirmStyle || 'danger';
  _confirmCallback = opts.onConfirm || null;
  _cancelCallback  = opts.onCancel  || null;

  var titleEl = document.getElementById('confirm-modal-title');
  var msgEl   = document.getElementById('confirm-modal-msg');
  var btnEl   = document.getElementById('confirm-modal-btn');
  if (titleEl) titleEl.textContent = title;
  if (msgEl)   msgEl.textContent   = message;
  if (btnEl) {
    btnEl.textContent  = label;
    btnEl.className = 'btn ' + (style === 'primary' ? 'btn-primary' : 'btn-danger');
  }
  openModal('confirm-modal');
}

function _confirmYes() {
  closeModal('confirm-modal');
  if (typeof _confirmCallback === 'function') _confirmCallback();
  _confirmCallback = null; _cancelCallback = null;
}
function _confirmNo() {
  closeModal('confirm-modal');
  if (typeof _cancelCallback === 'function') _cancelCallback();
  _confirmCallback = null; _cancelCallback = null;
}

/* Profile - FIX: Always sync sidebar avatar */
function applyProfile() {
  const p = state.profile || {};
  const name = p.name || '';
  const rawInitials = name.trim().split(/\s+/).map(function(w){ return w[0] || ''; }).join('').toUpperCase().slice(0,2);
  const initials = rawInitials || '?';

  /* Sidebar avatar */
  const sbAv = document.getElementById('sb-avatar');
  if (sbAv) {
    sbAv.innerHTML = '';
    if (p.avatar) {
      var img = document.createElement('img');
      img.src = p.avatar;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:7px;';
      sbAv.appendChild(img);
    } else {
      sbAv.textContent = initials;
    }
  }

  /* Profile modal avatar */
  const avUp = document.getElementById('avatar-upload');
  const ai = document.getElementById('avatar-initials');
  if (avUp) {
    var existingImg = avUp.querySelector('img');
    if (p.avatar) {
      if (!existingImg) {
        existingImg = document.createElement('img');
        existingImg.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0;border-radius:var(--r-lg);';
        avUp.prepend(existingImg);
      }
      existingImg.src = p.avatar;
      if (ai) ai.style.display = 'none';
    } else {
      if (existingImg) existingImg.remove();
      if (ai) { ai.textContent = initials; ai.style.display = ''; }
    }
  }

  const removeBtn = document.getElementById('remove-photo-btn');
  if (removeBtn) removeBtn.style.display = p.avatar ? 'block' : 'none';
  const sbName = document.getElementById('sb-name');
  const sbRole = document.getElementById('sb-role');
  if (sbName) sbName.textContent = name || 'Set up profile';
  if (sbRole) sbRole.textContent = p.role || 'Click to edit';
  const pn = document.getElementById('prof-name');
  const pr = document.getElementById('prof-role');
  if (pn) pn.value = name;
  if (pr) pr.value = p.role || '';
}

function handleAvatar(e) {
  var file = e.target.files[0]; if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Please select an image file','error',3500,'avatar'); return; }
  compressImage(file, 200, 200, 0.72).then(function(dataUrl) {
    state.profile.avatar = dataUrl;
    applyProfile(); saveState();
    toast('Avatar updated','success',3500,'avatar');
  }).catch(function() { toast('Could not process image','error',3500,'avatar'); });
}

function saveProfile() {
  state.profile.name = document.getElementById('prof-name').value.trim();
  state.profile.role = document.getElementById('prof-role').value.trim();
  saveState(); applyProfile(); closeModal('profile-modal');
  toast('Profile saved','success',3500,'profile');
}

function removeAvatar() {
  state.profile.avatar = null;
  saveState(); applyProfile();
  toast('Photo removed','info',3500,'avatar');
}

/* Delete account flow */
function openDeleteAccountPanel() {
  var panel = document.getElementById('delete-account-panel');
  if (panel) panel.style.display = '';
  checkDeleteConfirmReady();
}
function closeDeleteAccountPanel() {
  var panel = document.getElementById('delete-account-panel');
  if (panel) panel.style.display = 'none';
  var passInp = document.getElementById('del-pass');
  var textInp = document.getElementById('del-confirm-text');
  if (passInp) passInp.value = '';
  if (textInp) textInp.value = '';
  checkDeleteConfirmReady();
}
function checkDeleteConfirmReady() {
  var textInp = document.getElementById('del-confirm-text');
  var btn     = document.getElementById('del-confirm-btn');
  if (!btn) return;
  btn.disabled = !(textInp && textInp.value === 'remove my account');
}
function confirmDeleteAccount() {
  var textInp = document.getElementById('del-confirm-text');
  if (!textInp || textInp.value !== 'remove my account') return;
  var blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'xelvon-export-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  state.profile = { name:'', role:'', avatar:null };
  saveState(); applyProfile(); closeDeleteAccountPanel(); closeModal('profile-modal');
  toast('Profile reset. Your data was exported.','info',3500,'profile');
}

/* Trash icon helper */
function _trashIcon(type) {
  var icons = {
    task:   '<svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    phase:  '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="12"/></svg>',
    link:   '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    doc:    '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    folder: '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    plan:   '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
  };
  return icons[type] || icons.doc;
}

/* Trash modal with bulk select */
function renderTrashModal() {
  const wrap = document.getElementById('trash-content');
  if (!wrap) return;
  
  /* Update select all visibility */
  var selectAllWrap = document.querySelector('.trash-select-all-wrap');
  if (selectAllWrap) selectAllWrap.style.display = state.trash.length ? 'flex' : 'none';
  
  /* Update bulk actions */
  updateTrashBulkActions();
  
  if (!state.trash.length) {
    wrap.innerHTML = '<div class="trash-empty-state"><svg style="width:36px;height:36px;stroke:var(--text3);fill:none;stroke-width:1.5;display:block;margin:0 auto 10px;" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Recycle bin is empty</div>';
    return;
  }
  wrap.innerHTML = state.trash.map(function(item, i) {
    var title='', meta='', typeLabel='';
    if (item.type==='phase') { title=item.phase.title; meta=item.phase.tasks.length+' tasks'; typeLabel='Phase'; }
    else if (item.type==='task') { title=item.task.text; meta='From: '+(item.phaseTitle||'?'); typeLabel='Task'; }
    else if (item.type==='link') { title=item.link.title||item.link.url; meta=tryGetDomain(item.link.url)||''; typeLabel='Link'; }
    else if (item.type==='doc') { title=item.doc.title||'Untitled'; meta='Document'; typeLabel='Doc'; }
    else if (item.type==='folder') { title=item.folder.name; meta=(item.children||[]).length+' docs'; typeLabel='Folder'; }
    if (!title) return '';
    var isSelected = _trashSelected.includes(i);
    return '<div class="trash-item-row'+(isSelected?' selected':'')+'" data-idx="'+i+'">'+
      '<input type="checkbox" class="trash-item-cb" '+(isSelected?'checked':'')+' onclick="trashToggleSelect('+i+', event)" onchange="event.stopPropagation()">'+
      '<div class="trash-item-icon">'+_trashIcon(item.type)+'</div>'+
      '<div class="trash-item-info"><div class="trash-item-title">'+esc(title)+'</div><div class="trash-item-meta">'+esc(typeLabel)+' - '+esc(meta)+'</div></div>'+
      '<button class="trash-recover-btn" aria-label="Recover '+esc(title)+'" onclick="recoverItem('+i+')">Recover</button>'+
      '<button class="trash-del-btn" aria-label="Permanently delete" onclick="permDelete('+i+')">x</button>'+
    '</div>';
  }).join('');
}

function trashToggleSelect(idx, event) {
  event.stopPropagation();
  /* Shift+click for range selection */
  if (event.shiftKey && _trashLastClickedIdx !== null) {
    var start = Math.min(_trashLastClickedIdx, idx);
    var end = Math.max(_trashLastClickedIdx, idx);
    for (var i = start; i <= end; i++) {
      if (!_trashSelected.includes(i)) _trashSelected.push(i);
    }
  } else {
    var pos = _trashSelected.indexOf(idx);
    if (pos >= 0) _trashSelected.splice(pos, 1);
    else _trashSelected.push(idx);
  }
  _trashLastClickedIdx = idx;
  renderTrashModal();
}

function trashToggleSelectAll(checked) {
  if (checked) {
    _trashSelected = state.trash.map(function(_, i) { return i; });
  } else {
    _trashSelected = [];
  }
  renderTrashModal();
}

function updateTrashBulkActions() {
  var bulkEl = document.getElementById('trash-bulk-actions');
  var countEl = document.getElementById('trash-bulk-count');
  var selectAllCb = document.getElementById('trash-select-all');
  if (bulkEl) bulkEl.style.display = _trashSelected.length ? 'flex' : 'none';
  if (countEl) countEl.textContent = _trashSelected.length;
  if (selectAllCb) selectAllCb.checked = _trashSelected.length === state.trash.length && state.trash.length > 0;
}

function trashBulkRecover() {
  if (!_trashSelected.length) return;
  var sorted = _trashSelected.slice().sort(function(a,b){ return b-a; });
  sorted.forEach(function(idx) { _recoverItemSilent(idx); });
  _trashSelected = [];
  saveState(); renderTrashModal(); renderAll(); updateBadges();
  toast(sorted.length+' item(s) recovered','success',3500,'restore');
}

function trashBulkDelete() {
  if (!_trashSelected.length) return;
  showConfirm({
    title: 'Permanently Delete '+_trashSelected.length+' Item(s)',
    message: 'These items will be permanently deleted and cannot be recovered.',
    confirmLabel: 'Delete Forever',
    confirmStyle: 'danger',
    onConfirm: function() {
      var sorted = _trashSelected.slice().sort(function(a,b){ return b-a; });
      sorted.forEach(function(idx) { state.trash.splice(idx, 1); });
      _trashSelected = [];
      saveState(); renderTrashModal(); updateBadges();
      toast(sorted.length+' item(s) permanently deleted','info',3500,'trash');
    }
  });
}

function _recoverItemSilent(idx) {
  const item = state.trash[idx]; if (!item) return;
  if (item.type === 'phase') {
    state.phases.push(item.phase);
  } else if (item.type === 'link') {
    const rlink = JSON.parse(JSON.stringify(item.link));
    if (state.links.find(function(l){ return l.title===rlink.title; })) rlink.title='Recovered - '+rlink.title;
    state.links.push(rlink);
  } else if (item.type === 'doc') {
    const rdoc = JSON.parse(JSON.stringify(item.doc));
    if (state.documents.find(function(d){ return d.title===rdoc.title; })) rdoc.title='Recovered - '+rdoc.title;
    state.documents.push(rdoc);
  } else if (item.type === 'folder') {
    var rf = JSON.parse(JSON.stringify(item.folder));
    if (!state.docFolders) state.docFolders = [];
    state.docFolders.push(rf);
    (item.children||[]).forEach(function(dc) {
      var rdoc = JSON.parse(JSON.stringify(dc));
      state.documents.push(rdoc);
    });
  } else if (item.type === 'task') {
    let phase = state.phases.find(function(p){ return p.id===item.phaseId; });
    if (!phase) phase = state.phases.find(function(p){ return p.title===item.phaseTitle; });
    if (!phase) {
      phase = state.phases.find(function(p){ return p.id==='recovered-phase'; });
      if (!phase) {
        phase = {id:'recovered-phase',title:'Recovered Tasks',description:'',color:'#6B7280',startDate:TODAY_STR,deadline:{value:1,unit:'months'},tasks:[],dailyPlans:[]};
        state.phases.push(phase);
      }
    }
    const rtask = JSON.parse(JSON.stringify(item.task));
    if (phase.tasks.find(function(t){ return t.text===rtask.text; })) rtask.text='Recovered - '+rtask.text;
    phase.tasks.push(rtask);
  }
  state.trash.splice(idx,1);
}

function recoverItem(idx) {
  _recoverItemSilent(idx);
  saveState(); renderTrashModal(); renderAll(); updateBadges();
  toast('Item recovered','success',3500,'restore');
}

function permDelete(idx) {
  showConfirm({
    title: 'Permanently Delete',
    message: 'This item will be permanently deleted and cannot be recovered.',
    confirmLabel: 'Delete Forever',
    confirmStyle: 'danger',
    onConfirm: function() {
      state.trash.splice(idx,1);
      _trashSelected = _trashSelected.filter(function(i){ return i !== idx; }).map(function(i){ return i > idx ? i-1 : i; });
      saveState(); renderTrashModal(); updateBadges();
      toast('Permanently deleted','info',3500,'trash');
    }
  });
}

function emptyTrash() {
  if (!state.trash.length) { toast('Bin is already empty','info',3500,'trash'); return; }
  showConfirm({
    title: 'Empty Recycle Bin',
    message: 'Permanently delete all '+state.trash.length+' item(s)? This cannot be undone.',
    confirmLabel: 'Empty Bin',
    confirmStyle: 'danger',
    onConfirm: function() {
      state.trash = [];
      _trashSelected = [];
      saveState(); renderTrashModal(); updateBadges();
      toast('Recycle Bin emptied','info',3500,'trash');
    }
  });
}
