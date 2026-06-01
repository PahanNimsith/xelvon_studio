/* ══════════════════════════════════════════════════════
   LINKS VIEW — Xelvon Studio v11
══════════════════════════════════════════════════════ */
var _linksEditMode = false;

function renderLinks() {
  var cont = document.getElementById('links-content');
  if (!cont) return;

  var headerEl = document.getElementById('links-section-head');
  if (headerEl) {
    headerEl.querySelector('#links-edit-toggle').classList.toggle('active', _linksEditMode);
  }

  if (!state.links.length) {
    cont.innerHTML =
      '<div class="links-empty">'+
        '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'+
        '<p style="font-size:.9rem;font-weight:700;margin-bottom:4px;">No links yet</p>'+
        '<p>Save your favourite resources and references.</p>'+
      '</div>';
    return;
  }
  cont.innerHTML = '<div class="links-grid">'+
    state.links.map(function(l,i){ return renderLinkCard(l,i); }).join('')+
  '</div>';
}

function renderLinkCard(l, i) {
  var domain     = tryGetDomain(l.url);
  var faviconUrl = domain ? 'https://www.google.com/s2/favicons?domain='+encodeURIComponent(domain)+'&sz=64' : '';
  var faviconEl  = faviconUrl
    ? '<img src="'+esc(faviconUrl)+'" alt="" loading="lazy" onerror="this.style.display=\'none\'"><div class="fav-fallback"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/></svg></div>'
    : '<div class="fav-fallback"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/></svg></div>';
  var tags = (l.tags||[]).map(function(t){ return '<span class="task-tag">'+esc(t)+'</span>'; }).join('');

  var editOverlay = _linksEditMode
    ? '<div class="link-edit-overlay">'+
        '<button class="lco-btn edit" onclick="event.stopPropagation();linkEnterEdit('+i+')" title="Edit">'+
          '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit'+
        '</button>'+
        '<button class="lco-btn delete" onclick="event.stopPropagation();trashLink('+i+')" title="Delete">'+
          '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>Delete'+
        '</button>'+
      '</div>'
    : '';

  return (
    '<div class="link-card'+(_linksEditMode?' edit-mode':'')+'" id="link-card-'+i+'" ondblclick="linkEnterEdit('+i+')">'+
      editOverlay+
      '<div class="link-card-head">'+
        '<div class="link-favicon">'+faviconEl+'</div>'+
        '<div class="link-info">'+
          '<div class="link-title">'+esc(l.title||l.url)+'</div>'+
          '<div class="link-domain">'+esc(domain)+'</div>'+
        '</div>'+
        '<button class="link-open-btn" onclick="event.stopPropagation();window.open(\''+esc(l.url)+'\',\'_blank\')" aria-label="Open link">'+
          '<svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'+
        '</button>'+
      '</div>'+
      (l.description ? '<div class="link-desc">'+esc(l.description)+'</div>' : '')+
      (tags ? '<div class="link-footer"><div class="link-tags">'+tags+'</div></div>' : '')+
    '</div>'
  );
}

function toggleLinksEditMode() {
  _linksEditMode = !_linksEditMode;
  var btn = document.getElementById('links-edit-toggle');
  if (btn) btn.classList.toggle('active', _linksEditMode);
  renderLinks();
}

function linkEnterEdit(idx) {
  var l = state.links[idx]; if (!l) return;
  var card = document.getElementById('link-card-'+idx);
  if (!card) return;
  card.classList.add('editing');
  card.ondblclick = null;
  card.innerHTML =
    '<div class="link-edit-form">'+
      '<input class="form-input link-edit-inp" id="le-title-'+idx+'" value="'+esc(l.title||'')+'" placeholder="Title">'+
      '<input class="form-input link-edit-inp" id="le-url-'+idx+'" value="'+esc(l.url||'')+'" placeholder="URL" type="url">'+
      '<input class="form-input link-edit-inp" id="le-desc-'+idx+'" value="'+esc(l.description||'')+'" placeholder="Description">'+
      '<input class="form-input link-edit-inp" id="le-tags-'+idx+'" value="'+esc((l.tags||[]).join(', '))+'" placeholder="Tags (comma separated)">'+
      '<div class="link-edit-actions">'+
        '<button class="btn btn-ghost" style="font-size:.75rem;" onclick="linkCancelEdit()">Cancel</button>'+
        '<button class="btn btn-primary" style="font-size:.75rem;" onclick="linkSaveEdit('+idx+')">Save</button>'+
      '</div>'+
    '</div>';
  var titleInp = document.getElementById('le-title-'+idx);
  if (titleInp) titleInp.focus();
}

function linkSaveEdit(idx) {
  var l = state.links[idx]; if (!l) return;
  var title = (document.getElementById('le-title-'+idx)||{}).value||'';
  var url   = (document.getElementById('le-url-'+idx)||{}).value||'';
  var desc  = (document.getElementById('le-desc-'+idx)||{}).value||'';
  var tags  = ((document.getElementById('le-tags-'+idx)||{}).value||'').split(',').map(function(t){return t.trim();}).filter(Boolean);
  if (!url) { toast('URL is required','error',3500,'link'); return; }
  if (!url.startsWith('http')) url = 'https://'+url;
  state.links[idx] = { url:url, title:title||tryGetDomain(url)||url, description:desc, tags:tags };
  logActivity('Updated link "'+state.links[idx].title+'"');
  saveState(); renderLinks();
  toast('Link updated','success',3500,'link');
}

function linkCancelEdit() { renderLinks(); }

async function autoFillLink() {
  var urlEl  = document.getElementById('link-url');
  var nameEl = document.getElementById('link-title');
  if (!urlEl || !nameEl) return;
  var url = urlEl.value.trim();
  if (!url || nameEl.value.trim()) return;

  var fullUrl = url.startsWith('http') ? url : 'https://'+url;
  nameEl.placeholder = 'Fetching title...';
  _setTitleSpinner(true);

  try {
    var controller = new AbortController();
    var timer = setTimeout(function(){ controller.abort(); }, 5000);
    var res  = await fetch(
      'https://api.allorigins.win/get?url=' + encodeURIComponent(fullUrl),
      { signal: controller.signal }
    );
    clearTimeout(timer);
    var data  = await res.json();
    var match = data.contents && data.contents.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (match && match[1].trim()) {
      nameEl.value = match[1].trim().slice(0, 80);
    } else {
      var d = tryGetDomain(fullUrl);
      if (d) nameEl.value = d.split('.')[0][0].toUpperCase() + d.split('.')[0].slice(1);
    }
  } catch(e) {
    var d = tryGetDomain(fullUrl);
    if (d && !nameEl.value) nameEl.value = d.split('.')[0][0].toUpperCase() + d.split('.')[0].slice(1);
  } finally {
    nameEl.placeholder = 'Link name (optional)';
    _setTitleSpinner(false);
  }
}

function _setTitleSpinner(on) {
  var wrap = document.getElementById('link-title-wrap');
  if (wrap) wrap.classList.toggle('fetching', on);
}

function openLinkModal(editIdx) {
  var l = (editIdx != null && editIdx !== '') ? state.links[editIdx] : null;
  document.getElementById('link-modal-title').textContent = l ? 'Edit Link' : 'Add Link';
  document.getElementById('link-edit-idx').value = (editIdx != null && editIdx !== '') ? editIdx : '';
  document.getElementById('link-url').value   = l ? l.url   : '';
  document.getElementById('link-title').value = l ? l.title : '';
  document.getElementById('link-desc').value  = l ? (l.description||'') : '';
  document.getElementById('link-tags').value  = l ? (l.tags||[]).join(', ') : '';
  openModal('link-modal');

  var urlInp = document.getElementById('link-url');
  if (urlInp) {
    urlInp.onblur = autoFillLink;
    urlInp.removeEventListener('paste', urlInp._pasteFn);
    urlInp._pasteFn = function(){ setTimeout(autoFillLink, 100); };
    urlInp.addEventListener('paste', urlInp._pasteFn);
    setTimeout(function(){ urlInp.focus(); }, 100);
  }
}

function saveLink() {
  var url     = document.getElementById('link-url').value.trim();
  var title   = document.getElementById('link-title').value.trim();
  var desc    = document.getElementById('link-desc').value.trim();
  var tags    = document.getElementById('link-tags').value.split(',').map(function(t){ return t.trim(); }).filter(Boolean);
  var editIdx = document.getElementById('link-edit-idx').value;
  if (!url) { toast('URL is required','error',3500,'link'); document.getElementById('link-url').focus(); return; }
  if (!url.startsWith('http')) url = 'https://'+url;
  var obj = { url:url, title:title||tryGetDomain(url)||url, description:desc, tags:tags };
  if (editIdx !== '') {
    state.links[parseInt(editIdx)] = obj;
    logActivity('Updated link "'+obj.title+'"');
    toast('Link updated','success',3500,'link');
  } else {
    state.links.push(obj);
    logActivity('Added link "'+obj.title+'"');
    toast('Link saved','success',3500,'link');
  }
  saveState(); renderLinks(); closeModal('link-modal');
}

function trashLink(idx) {
  var l = state.links[idx]; if (!l) return;
  showConfirm({
    title: 'Delete Link',
    message: 'Move "'+l.title+'" to Trash?',
    confirmLabel: 'Delete',
    confirmStyle: 'danger',
    onConfirm: function() {
      state.trash.push({ type:'link', link:JSON.parse(JSON.stringify(l)), deletedAt:new Date().toISOString() });
      state.links.splice(idx,1);
      logActivity('Deleted link "'+l.title+'"');
      saveState(); renderLinks(); updateBadges();
      toast('Link moved to trash','info',3500,'trash');
    }
  });
}
