/* ══════════════════════════════════════════════════════
   FILES VIEW — v12 Updates
   Features:
   - Unified view toggle style (matches Board)
   - Cut/copy/paste with visual animations
   - Enhanced right-click context menu
   - Keyboard shortcuts (Ctrl+A, Ctrl+C/X/V, Del, F2)
   - Multi-selection support
   - Removed duplicate buttons
   - Created/Modified dates and export
══════════════════════════════════════════════════════ */
var _filesCtxTarget   = null;
var _filesBreadcrumb  = [];
var _filesSelectedIds = [];  // v12: multi-selection
var _filesEditorDocId = null;
var _filesShowNewFolder = false;
var _filesClipboard   = null;
var _filesViewMode    = 'list'; // v12: default to list (matches board)
var _filesEditFolderId = null;
var _newFolderColor = '';

/* ── Keyboard shortcuts — active only when Files view is open ── */
document.addEventListener('keydown', function(e) {
  if (currentView !== 'docs') return;
  var tag = (e.target.tagName||'').toLowerCase();
  if (tag==='input'||tag==='textarea'||e.target.isContentEditable) return;

  // v12: Ctrl+A to select all
  if ((e.ctrlKey||e.metaKey) && e.key==='a' && !_filesEditorDocId) {
    e.preventDefault();
    filesSelectAll();
    return;
  }

  if ((e.key==='Delete'||e.key==='Backspace') && _filesSelectedIds.length > 0 && !_filesEditorDocId) {
    e.preventDefault();
    filesTrashSelected();
  } else if (e.key==='Backspace' && _filesSelectedIds.length === 0 && !_filesEditorDocId) {
    e.preventDefault();
    if (_filesBreadcrumb.length > 0) { _filesBreadcrumb.pop(); _renderFilesBrowser(); }
  } else if ((e.ctrlKey||e.metaKey) && e.key==='c' && _filesSelectedIds.length > 0 && !_filesEditorDocId) {
    e.preventDefault();
    filesCopy();
  } else if ((e.ctrlKey||e.metaKey) && e.key==='x' && _filesSelectedIds.length > 0 && !_filesEditorDocId) {
    e.preventDefault();
    filesCut();
  } else if ((e.ctrlKey||e.metaKey) && e.key==='v' && _filesClipboard && !_filesEditorDocId) {
    e.preventDefault();
    filesPaste();
  } else if (e.key==='F2' && _filesSelectedIds.length === 1 && !_filesEditorDocId) {
    e.preventDefault();
    filesRenamePrompt(_filesSelectedIds[0].type, _filesSelectedIds[0].id);
  } else if (e.key==='Escape' && !_filesEditorDocId) {
    e.preventDefault();
    _filesSelectedIds = [];
    _filesClipboard = null;
    document.querySelectorAll('.file-card.selected,.file-card.cut').forEach(function(el){ 
      el.classList.remove('selected','cut'); 
    });
  }
});

// v12: Select all files and folders
function filesSelectAll() {
  var currentFolderId = _getCurrentFolderId();
  var folders = (state.docFolders||[]).filter(function(f){ return (f.parentId||null) === currentFolderId; });
  var docs = (state.documents||[]).filter(function(d){ return (d.folderId||null) === currentFolderId; });
  
  _filesSelectedIds = [];
  folders.forEach(function(f){ _filesSelectedIds.push({ type:'folder', id:f.id }); });
  docs.forEach(function(d){ _filesSelectedIds.push({ type:'doc', id:d.id }); });
  
  document.querySelectorAll('.file-card').forEach(function(el){ el.classList.add('selected'); });
  toast('Selected '+_filesSelectedIds.length+' items','info',3500,'select');
}

// v12: Copy selected items
function filesCopy() {
  if (_filesSelectedIds.length === 0) return;
  _filesClipboard = { op:'copy', items: JSON.parse(JSON.stringify(_filesSelectedIds)) };
  document.querySelectorAll('.file-card.cut').forEach(function(el){ el.classList.remove('cut'); });
  toast('Copied '+_filesSelectedIds.length+' item(s) — Ctrl+V to paste','info',3500,'copy');
}

// v12: Cut selected items with visual feedback
function filesCut() {
  if (_filesSelectedIds.length === 0) return;
  _filesClipboard = { op:'cut', items: JSON.parse(JSON.stringify(_filesSelectedIds)) };
  
  // Visual feedback - grey out cut items
  _filesSelectedIds.forEach(function(item) {
    var el = document.querySelector('.file-card[data-id="'+item.id+'"]');
    if (el) el.classList.add('cut');
  });
  
  toast('Cut '+_filesSelectedIds.length+' item(s) — Ctrl+V to paste','info',3500,'cut');
}

// v12: Paste with animation
function filesPaste() {
  if (!_filesClipboard || !_filesClipboard.items || _filesClipboard.items.length === 0) return;
  var dest = _getCurrentFolderId();
  var pastedCount = 0;
  
  _filesClipboard.items.forEach(function(item) {
    if (item.type === 'doc') {
      var d = (state.documents||[]).find(function(x){ return x.id===item.id; });
      if (!d) return;
      if (_filesClipboard.op === 'copy') {
        var copy = JSON.parse(JSON.stringify(d));
        copy.id = uid(); 
        copy.title = copy.title+' (Copy)'; 
        copy.folderId = dest; 
        copy.createdAt = new Date().toISOString(); 
        copy.updatedAt = new Date().toISOString();
        state.documents.push(copy);
      } else {
        d.folderId = dest; 
        d.updatedAt = new Date().toISOString();
      }
      pastedCount++;
    } else if (item.type === 'folder') {
      var f = (state.docFolders||[]).find(function(x){ return x.id===item.id; });
      if (!f) return;
      if (_filesClipboard.op === 'copy') {
        var newId = uid();
        var fcopy = JSON.parse(JSON.stringify(f));
        fcopy.id = newId; 
        fcopy.name = fcopy.name+' (Copy)'; 
        fcopy.parentId = dest;
        state.docFolders.push(fcopy);
        // Also copy documents inside
        (state.documents||[]).filter(function(d){ return d.folderId===f.id; }).forEach(function(d){
          var dc = JSON.parse(JSON.stringify(d)); 
          dc.id = uid(); 
          dc.folderId = newId; 
          dc.createdAt = new Date().toISOString(); 
          dc.updatedAt = new Date().toISOString();
          state.documents.push(dc);
        });
      } else {
        f.parentId = dest;
      }
      pastedCount++;
    }
  });
  
  if (_filesClipboard.op === 'cut') _filesClipboard = null;
  _filesSelectedIds = [];
  saveState(); 
  _renderFilesBrowser();
  toast(pastedCount+' item(s) pasted','success',3500,'paste');
}

// v12: Trash selected items
function filesTrashSelected() {
  if (_filesSelectedIds.length === 0) return;
  
  _filesSelectedIds.forEach(function(item) {
    if (item.type === 'folder') {
      filesTrashFolder(item.id, true);
    } else {
      filesTrashDoc(item.id, true);
    }
  });
  
  var count = _filesSelectedIds.length;
  _filesSelectedIds = [];
  saveState();
  _renderFilesBrowser();
  toast(count+' item(s) moved to trash','info',3500,'trash');
}

document.addEventListener('click', function(e){
  if (!e.target.closest('#files-ctx-menu') && !e.target.closest('[data-fctx]')) hideFilesCtxMenu();
});

/* ══ MAIN RENDER ══ */
function renderDocList() {
  var wrap = document.getElementById('docs-layout');
  if (!wrap) return;
  
  // v12: Use persisted view mode
  _filesViewMode = state.filesView || 'list';
  
  if (!document.getElementById('files-browser')) {
    wrap.innerHTML = _buildFilesShell();
  }
  _renderFilesBrowser();
  if (_filesEditorDocId) _openFilesEditor(_filesEditorDocId);
}

function _buildFilesShell() {
  // v12: Unified toolbar style matching Board view
  return (
    '<div id="files-browser" style="padding:0 24px 24px;">'+
      '<div class="files-topbar">'+
        '<div class="files-breadcrumb" id="files-breadcrumb"></div>'+
        '<div class="files-toolbar-actions">'+
          // v12: View toggle matching Board style
          '<div class="view-toggle" role="group" aria-label="Files view">'+
            '<button id="files-view-list" class="vt-btn'+(state.filesView==='list' || !state.filesView?' active':'')+'" onclick="filesToggleViewMode(\'list\')" aria-pressed="'+(state.filesView==='list')+'">'+
              '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>List'+
            '</button>'+
            '<button id="files-view-grid" class="vt-btn'+(state.filesView==='grid'?' active':'')+'" onclick="filesToggleViewMode(\'grid\')" aria-pressed="'+(state.filesView==='grid')+'">'+
              '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>Grid'+
            '</button>'+
          '</div>'+
          // v12: Minimal create buttons (removed duplicate)
          '<button class="files-create-btn" onclick="filesToggleNewFolder()" title="New Folder">'+
            '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>'+
          '</button>'+
          '<button class="files-create-btn" onclick="filesNewDoc()" title="New Document">'+
            '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>'+
          '</button>'+
        '</div>'+
      '</div>'+
      '<div id="files-new-folder-card" style="display:none;"></div>'+
      '<div class="files-grid" id="files-grid" oncontextmenu="filesCtxOnEmpty(event)"></div>'+
    '</div>'+
    '<div id="files-editor-view">'+
      '<div style="padding:0 24px;" id="files-editor-inner">'+
        '<div class="files-editor-topbar">'+
          '<button class="files-back-btn" onclick="filesCloseEditor()">'+
            '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>Back to Files'+
          '</button>'+
          '<input class="files-editor-title-inp" id="files-doc-title" placeholder="Document title..." oninput="filesUpdateTitle(this.value)" onchange="filesUpdateTitle(this.value)">'+
          '<span class="files-editor-saved" id="files-doc-saved">Saved</span>'+
        '</div>'+
        '<div class="files-editor-toolbar" id="files-editor-toolbar">'+
          '<button class="doc-tb-btn" onclick="filesDocCmd(\'bold\')" title="Bold"><svg viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg></button>'+
          '<button class="doc-tb-btn" onclick="filesDocCmd(\'italic\')" title="Italic"><svg viewBox="0 0 24 24"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg></button>'+
          '<button class="doc-tb-btn" onclick="filesDocCmd(\'underline\')" title="Underline"><svg viewBox="0 0 24 24"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg></button>'+
          '<div class="doc-tb-sep"></div>'+
          '<button class="doc-tb-btn" onclick="filesDocCmd(\'formatBlock\',\'H2\')" title="Heading">H</button>'+
          '<button class="doc-tb-btn" onclick="filesDocCmd(\'insertUnorderedList\')" title="Bullet list"><svg viewBox="0 0 24 24"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><line x1="4" y1="6" x2="4.01" y2="6"/><line x1="4" y1="12" x2="4.01" y2="12"/><line x1="4" y1="18" x2="4.01" y2="18"/></svg></button>'+
          '<button class="doc-tb-btn" onclick="filesDocCmd(\'insertOrderedList\')" title="Numbered list"><svg viewBox="0 0 24 24"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg></button>'+
          '<div class="doc-tb-sep"></div>'+
          '<button class="doc-tb-btn" onclick="filesDocCmd(\'undo\')" title="Undo"><svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.36"/></svg></button>'+
          '<button class="doc-tb-btn" onclick="filesDocCmd(\'redo\')" title="Redo"><svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-3.36"/></svg></button>'+
        '</div>'+
        '<div class="files-doc-body" id="files-doc-body" contenteditable="true" data-placeholder="Start writing..." spellcheck="true"></div>'+
      '</div>'+
    '</div>'+
    '<div id="files-ctx-menu">'+
      '<button class="fctx-item" id="fctx-open" onclick="filesCtxOpen()"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Open</button>'+
      '<button class="fctx-item" id="fctx-rename" onclick="filesCtxRename()"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Rename</button>'+
      '<div class="fctx-sep" id="fctx-sep1"></div>'+
      '<button class="fctx-item" id="fctx-cut" onclick="filesCtxCut()"><svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>Cut</button>'+
      '<button class="fctx-item" id="fctx-copy" onclick="filesCtxCopy()"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</button>'+
      '<button class="fctx-item" id="fctx-paste" onclick="filesCtxPaste()"><svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>Paste</button>'+
      '<div class="fctx-sep"></div>'+
      '<button class="fctx-item" id="fctx-new-doc" onclick="filesNewDoc()"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>New Document</button>'+
      '<button class="fctx-item" id="fctx-new-folder" onclick="filesToggleNewFolder()"><svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>New Folder</button>'+
      '<div class="fctx-sep"></div>'+
      '<button class="fctx-item danger" id="fctx-delete" onclick="filesCtxDelete()"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>Move to Trash</button>'+
    '</div>'
  );
}

// v12: Toggle view mode and persist
function filesToggleViewMode(mode) {
  _filesViewMode = mode;
  state.filesView = mode;  // v12: persist
  saveState();
  
  var grid = document.getElementById('files-grid');
  if (grid) {
    grid.className = 'files-' + mode;
    grid.id = 'files-grid';
  }
  var listBtn = document.getElementById('files-view-list');
  var gridBtn = document.getElementById('files-view-grid');
  if (listBtn) listBtn.classList.toggle('active', mode === 'list');
  if (gridBtn) gridBtn.classList.toggle('active', mode === 'grid');
  _renderFilesBrowser();
}

/* ══ FILE BROWSER ══ */
function _renderFilesBrowser() {
  var browser = document.getElementById('files-browser');
  var editor  = document.getElementById('files-editor-view');
  if (browser) browser.style.display = '';
  if (editor)  editor.classList.remove('open');
  _renderBreadcrumb();
  var grid = document.getElementById('files-grid');
  if (!grid) return;

  var currentFolderId = _getCurrentFolderId();
  var folders = (state.docFolders||[]).filter(function(f){ return (f.parentId||null) === currentFolderId; });
  var docs    = (state.documents||[]).filter(function(d){ return (d.folderId||null) === currentFolderId; });

  if (!folders.length && !docs.length && !_filesShowNewFolder) {
    grid.innerHTML =
      '<div class="files-empty" style="grid-column:1/-1;">'+
        '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'+
        '<p>No files here yet.</p>'+
        '<p style="font-size:.72rem;color:var(--text3);">Right-click or use the buttons above to create.</p>'+
      '</div>';
    return;
  }
  var html = '';
  folders.forEach(function(f){ html += _folderCard(f); });
  docs.forEach(function(d){ html += _docCard(d); });
  grid.innerHTML = html;
  grid.className = 'files-' + _filesViewMode;

  _renderNewFolderCard();
  
  // Restore selection state
  _filesSelectedIds.forEach(function(item) {
    var el = document.querySelector('.file-card[data-id="'+item.id+'"]');
    if (el) el.classList.add('selected');
  });
  
  // Restore cut visual state
  if (_filesClipboard && _filesClipboard.op === 'cut') {
    _filesClipboard.items.forEach(function(item) {
      var el = document.querySelector('.file-card[data-id="'+item.id+'"]');
      if (el) el.classList.add('cut');
    });
  }
}

/* ── Inline folder creation card ── */
function _renderNewFolderCard() {
  var wrap = document.getElementById('files-new-folder-card');
  if (!wrap) return;
  if (!_filesShowNewFolder) { wrap.style.display='none'; return; }
  if (!_newFolderColor) _newFolderColor = FOLDER_COLORS[0];
  var isEdit = _filesShowNewFolder === 'edit';
  var existingFolder = isEdit ? (state.docFolders||[]).find(function(x){ return x.id===_filesEditFolderId; }) : null;
  var currentName = existingFolder ? existingFolder.name : '';
  wrap.style.display = '';
  wrap.innerHTML =
    '<div class="files-new-folder-panel">'+
      '<div style="font-size:.8rem;font-weight:700;margin-bottom:10px;color:var(--text);">'+
        (isEdit ? 'Edit Folder' : 'New Folder')+
      '</div>'+
      '<input id="new-folder-name-inp" class="form-input" value="'+esc(currentName)+'" placeholder="Folder name" style="margin-bottom:10px;" '+
        'onkeydown="if(event.key===\'Enter\')filesCommitNewFolder();if(event.key===\'Escape\')filesCancelNewFolder()">'+
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">'+
        FOLDER_COLORS.map(function(clr){
          return '<div class="folder-color-opt'+(clr===_newFolderColor?' selected':'')+'" style="background:'+clr+';" '+
            'onclick="filesPickNewFolderColor(\''+clr+'\')" role="radio" aria-label="Color '+clr+'" tabindex="0"></div>';
        }).join('')+
      '</div>'+
      '<div style="display:flex;gap:8px;">'+
        '<button class="btn btn-ghost" style="font-size:.75rem;" onclick="filesCancelNewFolder()">Cancel</button>'+
        '<button class="btn btn-primary" style="font-size:.75rem;" onclick="filesCommitNewFolder()">'+(isEdit?'Save':'Create')+'</button>'+
      '</div>'+
    '</div>';
  setTimeout(function(){
    var inp=document.getElementById('new-folder-name-inp');
    if(inp){ inp.focus(); if(!isEdit) inp.select(); else { inp.setSelectionRange(inp.value.length,inp.value.length); } }
  }, 50);
}

function filesPickNewFolderColor(c) {
  _newFolderColor = c;
  _renderNewFolderCard();
}

function filesToggleNewFolder() {
  hideFilesCtxMenu();
  _filesShowNewFolder = _filesShowNewFolder ? false : 'new';
  _filesEditFolderId = null;
  _newFolderColor = FOLDER_COLORS[0];
  _renderFilesBrowser();
}

function filesEditFolder(fid) {
  var f = (state.docFolders||[]).find(function(x){ return x.id===fid; });
  if (!f) return;
  _filesEditFolderId = fid;
  _newFolderColor = f.color || FOLDER_COLORS[0];
  _filesShowNewFolder = 'edit';
  hideFilesCtxMenu();
  _renderFilesBrowser();
}

function filesCancelNewFolder() {
  _filesShowNewFolder = false;
  _filesEditFolderId = null;
  _renderFilesBrowser();
}

function filesCommitNewFolder() {
  var inp = document.getElementById('new-folder-name-inp');
  var name = inp ? inp.value.trim() : '';
  if (!name) { toast('Enter a folder name','error',3500,'folder'); if(inp) inp.focus(); return; }
  if (!state.docFolders) state.docFolders = [];

  if (_filesShowNewFolder === 'edit' && _filesEditFolderId) {
    var f = state.docFolders.find(function(x){ return x.id===_filesEditFolderId; });
    if (f) {
      f.name = name;
      f.color = _newFolderColor || f.color || FOLDER_COLORS[0];
      _filesBreadcrumb.forEach(function(s){ if(s.id===f.id) s.name=f.name; });
      logActivity('Updated folder "'+f.name+'"');
      toast('Folder updated','success',3500,'folder');
    }
  } else {
    var currentFolder = _getCurrentFolderId();
    var f = { id:uid(), name:name, color:_newFolderColor||FOLDER_COLORS[0], parentId:currentFolder, createdAt:new Date().toISOString() };
    state.docFolders.push(f);
    logActivity('Created folder "'+f.name+'"');
    toast('Folder created','success',3500,'folder');
  }
  _filesShowNewFolder = false;
  _filesEditFolderId = null;
  saveState(); _renderFilesBrowser();
}

/* ── Cards ── */
function _folderCard(f) {
  var children = (state.documents||[]).filter(function(d){ return d.folderId===f.id; });
  var color    = f.color || '#5B6CFF';
  var createdDate = f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '';
  var isSelected = _filesSelectedIds.some(function(s){ return s.type==='folder' && s.id===f.id; });
  var isCut = _filesClipboard && _filesClipboard.op==='cut' && _filesClipboard.items.some(function(i){ return i.type==='folder' && i.id===f.id; });
  
  return (
    '<div class="file-card'+(isSelected?' selected':'')+(isCut?' cut':'')+'" data-fctx="folder" data-fctx-id="'+f.id+'"'+
      ' data-id="'+f.id+'" data-type="folder"'+
      ' onclick="filesSelectCard(event,this)"'+
      ' ondblclick="filesOpenFolder(\''+f.id+'\')"'+
      ' oncontextmenu="filesCtxShow(event,\'folder\',\''+f.id+'\')"'+
      '>'+
      '<div class="file-card-icon">'+
        '<svg viewBox="0 0 24 24" fill="'+esc(color)+'" opacity=".9"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'+
      '</div>'+
      '<div class="file-card-name">'+esc(f.name)+'</div>'+
      '<div class="file-card-meta">'+children.length+' item'+(children.length!==1?'s':'')+(createdDate?' - '+createdDate:'')+'</div>'+
    '</div>'
  );
}

function _docCard(d) {
  var createdDate = d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '';
  var modifiedDate = d.updatedAt ? new Date(d.updatedAt).toLocaleDateString() : '';
  var isSelected = _filesSelectedIds.some(function(s){ return s.type==='doc' && s.id===d.id; });
  var isCut = _filesClipboard && _filesClipboard.op==='cut' && _filesClipboard.items.some(function(i){ return i.type==='doc' && i.id===d.id; });
  
  return (
    '<div class="file-card'+(isSelected?' selected':'')+(isCut?' cut':'')+'" data-fctx="doc" data-fctx-id="'+d.id+'"'+
      ' data-id="'+d.id+'" data-type="doc"'+
      ' onclick="filesSelectCard(event,this)"'+
      ' ondblclick="filesOpenDoc(\''+d.id+'\')"'+
      ' oncontextmenu="filesCtxShow(event,\'doc\',\''+d.id+'\')"'+
      '>'+
      '<div class="file-card-icon">'+
        '<svg viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'+
      '</div>'+
      '<div class="file-card-name">'+esc(d.title||'Untitled')+'</div>'+
      '<div class="file-card-meta">'+
        (modifiedDate ? 'Modified '+modifiedDate : '')+
        (createdDate && modifiedDate !== createdDate ? ' - Created '+createdDate : '')+
      '</div>'+
    '</div>'
  );
}

/* ══ NAVIGATION ══ */
function _getCurrentFolderId() {
  if (!_filesBreadcrumb.length) return null;
  var last = _filesBreadcrumb[_filesBreadcrumb.length-1];
  return last.type === 'folder' ? last.id : null;
}

function _renderBreadcrumb() {
  var el = document.getElementById('files-breadcrumb');
  if (!el) return;
  var html = '<span class="bc-seg" onclick="filesGoRoot()">Files</span>';
  _filesBreadcrumb.forEach(function(seg, i){
    if (seg.type === 'folder') {
      html += '<span class="bc-sep">></span>';
      if (i === _filesBreadcrumb.length-1) {
        html += '<span class="bc-current">'+esc(seg.name)+'</span>';
      } else {
        html += '<span class="bc-seg" onclick="filesNavTo('+i+')">'+esc(seg.name)+'</span>';
      }
    }
  });
  el.innerHTML = html;
}

function filesGoRoot() {
  _filesBreadcrumb = []; _filesEditorDocId = null; _filesShowNewFolder = false;
  _filesSelectedIds = [];
  _renderFilesBrowser();
}

function filesNavTo(idx) {
  _filesBreadcrumb = _filesBreadcrumb.slice(0, idx+1); _filesEditorDocId = null;
  _filesSelectedIds = [];
  _renderFilesBrowser();
}

function filesOpenFolder(fid) {
  var f = (state.docFolders||[]).find(function(x){ return x.id===fid; });
  if (!f) return;
  _filesBreadcrumb.push({ type:'folder', id:fid, name:f.name }); _filesEditorDocId = null;
  _filesSelectedIds = [];
  _renderFilesBrowser();
}

// v12: Multi-select with Ctrl/Cmd click
function filesSelectCard(event, el) {
  var type = el.dataset.type;
  var id = el.dataset.id;
  
  if (event.ctrlKey || event.metaKey) {
    // Toggle selection
    var idx = _filesSelectedIds.findIndex(function(s){ return s.type===type && s.id===id; });
    if (idx === -1) {
      _filesSelectedIds.push({ type: type, id: id });
      el.classList.add('selected');
    } else {
      _filesSelectedIds.splice(idx, 1);
      el.classList.remove('selected');
    }
  } else {
    // Single selection
    document.querySelectorAll('.file-card.selected').forEach(function(c){ c.classList.remove('selected'); });
    _filesSelectedIds = [{ type: type, id: id }];
    el.classList.add('selected');
  }
}

/* ══ DOCUMENT EDITOR ══ */
function filesOpenDoc(id) {
  _filesEditorDocId = id;
  _openFilesEditor(id);
}

function _openFilesEditor(id) {
  var d = (state.documents||[]).find(function(x){ return x.id===id; });
  if (!d) return;
  var browser = document.getElementById('files-browser');
  var editor  = document.getElementById('files-editor-view');
  if (browser) browser.style.display = 'none';
  if (editor)  editor.classList.add('open');
  
  document.getElementById('files-doc-title').value = d.title||'';
  document.getElementById('files-doc-body').innerHTML = d.body||'';
  document.getElementById('files-doc-body').focus();
  _autoSaveEditor();
}

function filesCloseEditor() {
  _filesEditorDocId = null;
  _renderFilesBrowser();
}

function filesUpdateTitle(val) {
  if (!_filesEditorDocId) return;
  var d = (state.documents||[]).find(function(x){ return x.id===_filesEditorDocId; });
  if (d) {
    d.title = val;
    d.updatedAt = new Date().toISOString();
    saveState();
    logActivity('Document updated: "'+val+'"');
  }
}

function _autoSaveEditor() {
  if (!_filesEditorDocId) return;
  var body = document.getElementById('files-doc-body');
  if (!body) return;
  var d = (state.documents||[]).find(function(x){ return x.id===_filesEditorDocId; });
  if (d) {
    d.body = body.innerHTML;
    d.updatedAt = new Date().toISOString();
    saveState();
    var saved = document.getElementById('files-doc-saved');
    if (saved) {
      saved.textContent = 'Saved';
      setTimeout(function(){ if(saved) saved.textContent = 'Saved'; }, 2000);
    }
  }
}

function filesDocCmd(cmd, val) {
  document.execCommand(cmd, false, val);
  _autoSaveEditor();
  document.getElementById('files-doc-body').focus();
}

function filesNewDoc() {
  hideFilesCtxMenu();
  if (!state.documents) state.documents = [];
  var currentFolderId = _getCurrentFolderId();
  var newDoc = {
    id: uid(),
    title: 'Untitled',
    body: '',
    folderId: currentFolderId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.documents.push(newDoc);
  logActivity('Created document');
  saveState();
  _renderFilesBrowser();
  toast('Document created — double-click to edit','info',3500,'doc');
}

function filesRenamePrompt(type, id) {
  if (type === 'folder') {
    filesEditFolder(id);
  } else {
    var d = (state.documents||[]).find(function(x){ return x.id===id; });
    if (!d) return;
    var newName = prompt('Rename document:', d.title||'');
    if (newName && newName.trim()) {
      d.title = newName.trim();
      d.updatedAt = new Date().toISOString();
      logActivity('Renamed document to "'+d.title+'"');
      saveState();
      _renderFilesBrowser();
      toast('Document renamed','success',3500,'doc');
    }
  }
}

function filesTrashFolder(id, silent) {
  var f = (state.docFolders||[]).find(function(x){ return x.id===id; });
  if (!f) return;
  if (!state.trash) state.trash = [];
  state.trash.push({ type:'folder', folder:JSON.parse(JSON.stringify(f)), deletedAt:new Date().toISOString() });
  state.docFolders = (state.docFolders||[]).filter(function(x){ return x.id!==id; });
  (state.documents||[]).filter(function(d){ return d.folderId===id; }).forEach(function(d){ filesTrashDoc(d.id, true); });
  logActivity('Folder moved to trash');
  if (!silent) {
    saveState();
    _renderFilesBrowser();
    toast('Folder moved to trash','info',3500,'trash');
  }
}

function filesTrashDoc(id, silent) {
  var d = (state.documents||[]).find(function(x){ return x.id===id; });
  if (!d) return;
  if (!state.trash) state.trash = [];
  state.trash.push({ type:'document', document:JSON.parse(JSON.stringify(d)), deletedAt:new Date().toISOString() });
  state.documents = (state.documents||[]).filter(function(x){ return x.id!==id; });
  logActivity('Document moved to trash');
  if (!silent) {
    saveState();
    _renderFilesBrowser();
    toast('Document moved to trash','info',3500,'trash');
  }
}

function filesCtxShow(e, type, id) {
  e.preventDefault();
  e.stopPropagation();
  
  // If not already selected, select this item
  if (!_filesSelectedIds.some(function(s){ return s.type===type && s.id===id; })) {
    document.querySelectorAll('.file-card.selected').forEach(function(c){ c.classList.remove('selected'); });
    _filesSelectedIds = [{ type: type, id: id }];
    var el = document.querySelector('.file-card[data-id="'+id+'"]');
    if (el) el.classList.add('selected');
  }
  
  var menu = document.getElementById('files-ctx-menu');
  if (!menu) return;
  
  // Show all items
  document.getElementById('fctx-open').style.display = '';
  document.getElementById('fctx-rename').style.display = '';
  document.getElementById('fctx-sep1').style.display = '';
  document.getElementById('fctx-delete').style.display = '';
  document.getElementById('fctx-cut').style.display = '';
  document.getElementById('fctx-copy').style.display = '';
  document.getElementById('fctx-paste').style.display = _filesClipboard ? '' : 'none';
  
  menu.style.left = e.clientX + 'px';
  menu.style.top  = e.clientY + 'px';
  menu.style.display = 'block';
}

function hideFilesCtxMenu() {
  var menu = document.getElementById('files-ctx-menu');
  if (menu) menu.style.display = 'none';
}

function filesCtxOpen() {
  if (_filesSelectedIds.length === 0) return;
  var item = _filesSelectedIds[0];
  if (item.type === 'folder') {
    filesOpenFolder(item.id);
  } else {
    filesOpenDoc(item.id);
  }
  hideFilesCtxMenu();
}

function filesCtxRename() {
  if (_filesSelectedIds.length === 0) return;
  var item = _filesSelectedIds[0];
  filesRenamePrompt(item.type, item.id);
  hideFilesCtxMenu();
}

function filesCtxCut() {
  filesCut();
  hideFilesCtxMenu();
}

function filesCtxCopy() {
  filesCopy();
  hideFilesCtxMenu();
}

function filesCtxPaste() {
  filesPaste();
  hideFilesCtxMenu();
}

function filesCtxDelete() {
  filesTrashSelected();
  hideFilesCtxMenu();
}

// v14: Right-click on empty space shows New Document and New Folder
function filesCtxOnEmpty(e) {
  e.preventDefault();
  e.stopPropagation();
  _filesSelectedIds = [];
  document.querySelectorAll('.file-card.selected').forEach(function(c){ c.classList.remove('selected'); });
  
  var menu = document.getElementById('files-ctx-menu');
  if (!menu) return;
  
  // v14: Show New Document and New Folder, hide item-specific options
  document.getElementById('fctx-open').style.display = 'none';
  document.getElementById('fctx-rename').style.display = 'none';
  document.getElementById('fctx-sep1').style.display = 'none';
  document.getElementById('fctx-delete').style.display = 'none';
  document.getElementById('fctx-cut').style.display = 'none';
  document.getElementById('fctx-copy').style.display = 'none';
  document.getElementById('fctx-paste').style.display = _filesClipboard ? '' : 'none';
  // v14: Show New Document and New Folder options
  document.getElementById('fctx-new-doc').style.display = '';
  document.getElementById('fctx-new-folder').style.display = '';
  
  menu.style.left = e.clientX + 'px';
  menu.style.top  = e.clientY + 'px';
  menu.style.display = 'block';
}
