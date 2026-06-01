/* ══════════════════════════════════════════════════════
   SEARCH CONTROLLER — Xelvon Studio v11
   - Improved search to include tags and document content
   - Uses Command symbol for Mac
══════════════════════════════════════════════════════ */
var _searchDebounce = null;

function openSearch() {
  const overlay = document.getElementById('search-overlay');
  if (overlay) overlay.classList.add('open');
  setTimeout(function(){ const inp = document.getElementById('search-input'); if (inp) inp.focus(); }, 50);
}

function closeSearch(e) {
  if (e && e.target && e.target.id !== 'search-overlay' && !e.target.classList.contains('search-esc')) return;
  const overlay = document.getElementById('search-overlay');
  if (overlay) overlay.classList.remove('open');
  const inp = document.getElementById('search-input');
  if (inp) inp.value = '';
  const results = document.getElementById('search-results');
  if (results) results.innerHTML = '<div class="search-empty">Start typing to search...</div>';
}

function doSearch(q) {
  clearTimeout(_searchDebounce);
  if (!q.trim()) {
    const results = document.getElementById('search-results');
    if (results) results.innerHTML = '<div class="search-empty">Start typing to search...</div>';
    return;
  }
  _searchDebounce = setTimeout(function(){ _executeSearch(q); }, 200);
}

function _executeSearch(q) {
  const ql = q.toLowerCase();
  const results = { tasks:[], links:[], docs:[] };

  /* Search tasks: text + description + tags */
  state.phases.forEach(function(ph){
    ph.tasks.forEach(function(t){
      var searchStr = (t.text || '') + ' ' + (t.description || '') + ' ' + (t.tags || []).join(' ');
      if (searchStr.toLowerCase().includes(ql)) {
        results.tasks.push({task:t, phase:ph});
      }
    });
  });

  /* Search links: title + url + description + tags */
  state.links.forEach(function(l){
    var searchStr = (l.title || '') + ' ' + (l.url || '') + ' ' + (l.description || '') + ' ' + (l.tags || []).join(' ');
    if (searchStr.toLowerCase().includes(ql)) {
      results.links.push(l);
    }
  });

  /* Search docs: title + content (strip HTML) */
  state.documents.forEach(function(d){
    var searchStr = (d.title || '') + ' ' + (d.content || '').replace(/<[^>]+>/g, '');
    if (searchStr.toLowerCase().includes(ql)) {
      results.docs.push(d);
    }
  });

  let html = '';
  if (results.tasks.length) {
    html += '<div class="search-result-group"><div class="srg-label">Tasks</div>'+
      results.tasks.slice(0,6).map(function(x){
        return '<div class="sr-item" role="button" tabindex="0" onclick="closeSearch();navigate(\'board\');setTimeout(function(){openTaskModal(\''+x.phase.id+'\',\''+x.task.id+'\')},200)">'+
          '<div class="sr-item-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>'+
          '<div class="sr-item-text"><div class="sr-item-title">'+esc(x.task.text)+'</div><div class="sr-item-sub">'+esc(x.phase.title)+'</div></div>'+
        '</div>';
      }).join('')+'</div>';
  }
  if (results.links.length) {
    html += '<div class="search-result-group"><div class="srg-label">Links</div>'+
      results.links.slice(0,4).map(function(l){
        return '<div class="sr-item" role="button" tabindex="0" onclick="closeSearch();navigate(\'links\')">'+
          '<div class="sr-item-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>'+
          '<div class="sr-item-text"><div class="sr-item-title">'+esc(l.title||l.url)+'</div><div class="sr-item-sub">'+esc(tryGetDomain(l.url))+'</div></div>'+
        '</div>';
      }).join('')+'</div>';
  }
  if (results.docs.length) {
    html += '<div class="search-result-group"><div class="srg-label">Documents</div>'+
      results.docs.slice(0,4).map(function(d){
        return '<div class="sr-item" role="button" tabindex="0" onclick="closeSearch();navigate(\'docs\');setTimeout(function(){openDoc(\''+d.id+'\')},200)">'+
          '<div class="sr-item-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div>'+
          '<div class="sr-item-text"><div class="sr-item-title">'+esc(d.title)+'</div></div>'+
        '</div>';
      }).join('')+'</div>';
  }
  if (!html) html = '<div class="search-empty">No results for "'+esc(q)+'"</div>';
  const resultsEl = document.getElementById('search-results');
  if (resultsEl) resultsEl.innerHTML = html;
}

/* Open doc from search - helper */
function openDoc(id) {
  filesOpenDoc(id);
}
