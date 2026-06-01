/* ══════════════════════════════════════════════════════
   SCRATCH PAD VIEW — Xelvon Studio v12
   Features:
   - Modern UI with better visibility
   - Removed old square box styling
   - Clean minimal interface
   - Character/word count
   - Markdown-like formatting hints
══════════════════════════════════════════════════════ */
var _scratchSaveTimer = null;

function renderScratch() {
  var cont = document.getElementById('scratch-content');
  if (!cont) return;
  
  var text = state.scratchpad || '';
  var wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  var charCount = text.length;
  
  cont.innerHTML =
    '<div class="scratch-container">'+
      '<div class="scratch-header">'+
        '<div class="scratch-title-row">'+
          '<svg viewBox="0 0 24 24" class="scratch-icon"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'+
          '<h2>Scratch Pad</h2>'+
        '</div>'+
        '<div class="scratch-meta">'+
          '<span class="scratch-count">'+wordCount+' words, '+charCount+' chars</span>'+
          '<span class="scratch-status" id="scratch-status">Auto-saved</span>'+
        '</div>'+
      '</div>'+
      '<div class="scratch-editor-wrap">'+
        '<textarea class="scratch-editor" id="scratch-area" placeholder="Quick notes, ideas, rough drafts...\n\nUse this space for anything - it auto-saves as you type." spellcheck="true" aria-label="Scratch pad">'+esc(text)+'</textarea>'+
      '</div>'+
      '<div class="scratch-footer">'+
        '<div class="scratch-tips">'+
          '<span class="scratch-tip">Tip: Everything auto-saves instantly</span>'+
        '</div>'+
        '<div class="scratch-actions">'+
          '<button class="scratch-btn" onclick="clearScratchPad()" title="Clear all content">'+
            '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>'+
            'Clear'+
          '</button>'+
          '<button class="scratch-btn primary" onclick="copyScratchToClipboard()" title="Copy to clipboard">'+
            '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'+
            'Copy'+
          '</button>'+
        '</div>'+
      '</div>'+
    '</div>';
    
  var area = document.getElementById('scratch-area');
  if (area) {
    area.setSelectionRange(area.value.length, area.value.length);
    area.addEventListener('input', function(){ 
      debounceScratchSave(area.value);
      updateScratchCount(area.value);
    });
  }
}

function updateScratchCount(text) {
  var wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  var charCount = text.length;
  var countEl = document.querySelector('.scratch-count');
  if (countEl) {
    countEl.textContent = wordCount + ' words, ' + charCount + ' chars';
  }
}

function debounceScratchSave(val) {
  var status = document.getElementById('scratch-status');
  if (status) {
    status.textContent = 'Saving...';
    status.classList.add('saving');
  }
  clearTimeout(_scratchSaveTimer);
  _scratchSaveTimer = setTimeout(function(){
    try {
      state.scratchpad = val;
      saveState();
      var st = document.getElementById('scratch-status');
      if (st) {
        st.textContent = 'Saved ' + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        st.classList.remove('saving');
        st.classList.add('saved');
        setTimeout(function(){ if(st) st.classList.remove('saved'); }, 2000);
      }
    } catch(e) {
      var st = document.getElementById('scratch-status');
      if (st) { 
        st.textContent = 'Save failed'; 
        st.classList.add('error');
      }
      toast('Scratch pad save failed — storage may be full','error',3500,'save');
    }
  }, 400);
}

function clearScratchPad() {
  if (!confirm('Clear all scratch pad content? This cannot be undone.')) return;
  state.scratchpad = '';
  saveState();
  renderScratch();
  toast('Scratch pad cleared','info',3500,'scratch');
}

function copyScratchToClipboard() {
  var text = state.scratchpad || '';
  if (!text.trim()) {
    toast('Nothing to copy','info',3500,'copy');
    return;
  }
  navigator.clipboard.writeText(text).then(function() {
    toast('Copied to clipboard','success',3500,'copy');
  }).catch(function() {
    toast('Failed to copy','error',3500,'copy');
  });
}
