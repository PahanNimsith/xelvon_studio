/* ══════════════════════════════════════════════════════
   APP — Boot sequence + Sidebar render
   Xelvon Studio v14
   v14 Features:
   - Fixed profile menu in collapsed sidebar
   - Version v14
   - Click-outside to close pomodoro
══════════════════════════════════════════════════════ */

function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  saveState();
  
  // v13: Smooth animation class toggle
  var sidebar = document.getElementById('sidebar');
  var app = document.getElementById('app');
  if (sidebar) {
    sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
    sidebar.classList.add('animating');
    setTimeout(function(){ sidebar.classList.remove('animating'); }, 300);
  }
  if (app) {
    app.classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
  }
  
  renderSidebar();
  document.querySelectorAll('.sb-item').forEach(function(el){ el.classList.remove('active'); });
  var navEl = document.getElementById('nav-'+currentView);
  if (navEl) navEl.classList.add('active');
}

/* Theme dot background color */
function _themeDotStyle(t) {
  var colors = THEME_DOT_COLORS[t] || { fill: 'var(--surface2)', border: 'var(--border)' };
  return 'background:'+colors.fill+';border-color:'+colors.border+';';
}

/* Theme names for title attribute */
function _themeDotTitle(t) {
  var names = {
    'theme-light': 'Light',
    'theme-dark': 'Dark',
    'theme-light-glow': 'Light Glow',
    'theme-dark-glow': 'Dark Glow'
  };
  return names[t] || t;
}

/* Boot sequence */
document.addEventListener('DOMContentLoaded', async function() {
  // v13: Add class to hide scrollbar during splash
  document.documentElement.classList.add('splash-active');
  
  var isAuthed = await checkAuthSession();

  if (!isAuthed) {
    var splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('hide');
      setTimeout(function(){ 
        splash.style.display = 'none'; 
        document.documentElement.classList.remove('splash-active');
      }, 550);
    }
    showAuthOverlay('login');
    return;
  }

  await bootApp();
});

async function bootApp() {
  hideAuthOverlay();

  var sbData = await loadFromSupabase();
  if (sbData && sbData.phases) {
    state = sbData;
    migrateState();
  } else {
    loadState();
  }

  if (!state.profile.name && _currentUser && _currentUser.email) {
    state.profile.name = _currentUser.email.split('@')[0];
  }

  /* Auto-fail yesterday's pending plans */
  var autoFailed = 0;
  (state.todayPlans||[]).forEach(function(p) {
    if (p.date < TODAY_STR && (!p.status || p.status === 'pending')) {
      p.status = 'auto-failed';
      p.completedAt = p.date + 'T23:59:00.000Z';
      p.autoFailed = true;
      autoFailed++;
    }
  });
  (state.phases||[]).forEach(function(ph) {
    (ph.dailyPlans||[]).forEach(function(p) {
      if (p.date < TODAY_STR && (!p.status || p.status === 'pending')) {
        p.status = 'auto-failed';
        p.completedAt = p.date + 'T23:59:00.000Z';
        p.autoFailed = true;
        autoFailed++;
      }
    });
  });
  if (autoFailed > 0) { saveState(); }

  /* v16: Splash stays minimal; progress animation happens on Dashboard. */

  var appBootEl = document.getElementById('app');
  if (appBootEl) appBootEl.classList.toggle('sidebar-collapsed', !!state.sidebarCollapsed);

  renderSidebar();
  renderTopbar();
  applyTheme();
  applyProfile();
  updateSavePill('saved');
  navigate('dashboard');
  updateBadges();
  initGlobalShortcuts();

  setTimeout(function(){
    var splash = document.getElementById('splash');
    var app    = document.getElementById('app');
    if (splash) splash.classList.add('hide');
    if (app)    app.style.opacity = '1';
    setTimeout(function(){ 
      if(splash) splash.style.display='none'; 
      document.documentElement.classList.remove('splash-active');
    }, 550);
  }, 1050);
}

function _showSplashProgress() {
  /* v16: Deprecated. Splash progress was intentionally removed. */
}


/* Global keyboard shortcuts */
function initGlobalShortcuts() {
  document.addEventListener('keydown', function(e) {
    /* Ctrl+S — save */
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveState();
      updateSavePill('saved');
      toast('Saved', 'success');
    }
    /* Ctrl+Z on board — undo last task delete */
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && currentView === 'board' && state._lastDeletedTask) {
      e.preventDefault();
      undoLastTaskDelete();
    }
  });
}

function undoLastTaskDelete() {
  if (!state._lastDeletedTask) return;
  var item = state._lastDeletedTask;
  var phase = state.phases.find(function(p){ return p.id === item.phaseId; });
  if (phase) {
    phase.tasks.push(item.task);
    state.trash = state.trash.filter(function(t){ return !(t.type === 'task' && t.task && t.task.id === item.task.id); });
    state._lastDeletedTask = null;
    saveState();
    renderBoard();
    updateBadges();
    toast('Task restored', 'success');
  }
}

/* Sidebar render */
function renderSidebar() {
  var nav = document.getElementById('sidebar');
  if (!nav) return;
  var p = state.profile || {};
  var rawInitials = (p.name||'').trim().split(/\s+/).map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2);
  var initials = rawInitials || '?';
  var isCollapsed = state.sidebarCollapsed || false;
  if (isCollapsed) nav.classList.add('collapsed'); else nav.classList.remove('collapsed');
  
  // v13: Avatar with image support
  var avatarHtml = p.avatar 
    ? '<img src="'+esc(p.avatar)+'" alt="Avatar">'
    : initials;
  
  // v13: Different icons for collapse/expand states
  var toggleIconExpand = '<svg viewBox="0 0 24 24" class="sb-logo-toggle-icon"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>';
  var toggleIconCollapse = '<svg viewBox="0 0 24 24" class="sb-logo-toggle-icon"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>';
  var currentToggleIcon = isCollapsed ? toggleIconCollapse : toggleIconExpand;
  var toggleTooltipText = isCollapsed ? 'Expand' : 'Collapse';
  
  nav.innerHTML =
    '<div class="sb-logo" onclick="toggleSidebar()" title="'+(isCollapsed?'Expand':'Collapse')+' sidebar">'+
      '<div class="sb-logo-icon">'+
        '<svg viewBox="0 0 24 24" class="sb-logo-main-icon"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>'+
        currentToggleIcon+
      '</div>'+
      '<div class="sb-logo-text"><div class="sb-logo-name">Xelvon Studio</div><div class="sb-logo-ver">v'+APP_VERSION+'</div></div>'+
      '<span class="sb-logo-tooltip">'+toggleTooltipText+'</span>'+
    '</div>'+
    '<div class="sb-section">'+
      '<div class="sb-label">Workspace</div>'+
      _sbItem('dashboard','<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>','Dashboard')+
      _sbItem('board','<svg viewBox="0 0 24 24"><rect x="3" y="3" width="5" height="19"/><rect x="10" y="3" width="5" height="11"/><rect x="17" y="3" width="5" height="15"/></svg>','Board')+
      _sbItem('today','<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>','Today',
        '<span id="today-badge" class="sb-item-badge" style="display:none" aria-label="Urgent tasks"></span>')+
    '</div>'+
    '<div class="sb-section">'+
      '<div class="sb-label">Resources</div>'+
      _sbItem('links','<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>','Links')+
      _sbItem('docs','<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>','Files')+
      _sbItem('scratch','<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>','Scratch')+
    '</div>'+
    '<div class="sb-section">'+
      '<div class="sb-label">Tools</div>'+
      '<div class="sb-item" onclick="togglePomodoro()" role="button" tabindex="0" aria-label="Toggle Pomodoro timer">'+
        '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span class="sb-item-text">Pomodoro</span>'+
        '<span class="sb-tooltip">Pomodoro</span>'+
      '</div>'+
      '<div class="sb-item" onclick="openSearch()" role="button" tabindex="0" aria-label="Search">'+
        '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span class="sb-item-text">Search</span>'+
        '<span class="kb-shortcut"><span class="kb-key">Cmd</span><span class="kb-plus">+</span><span class="kb-key">K</span></span>'+
        '<span class="sb-tooltip">Search</span>'+
      '</div>'+
    '</div>'+
    '<div class="sb-section">'+
      '<div class="sb-label">Data</div>'+
      _sbItem2('Trash','<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
        'openModal(\'trash-modal\')',
        '<span id="trash-badge" class="sb-item-badge" style="display:none" aria-label="Trashed items"></span>')+
      _sbItem2('Backup','<svg viewBox="0 0 24 24"><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h3.8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="13"/></svg>',
        'openModal(\'backup-modal\')') +
    '</div>'+
    '<div class="sb-bottom">'+
      '<div class="sb-themes-wrap">'+
        '<div class="sb-theme-dots" role="group" aria-label="Theme selector">'+
          THEMES.map(function(t){
            var active = state.theme===t;
            return '<div class="sb-theme-dot'+(active?' active':'')+'"'+
              ' style="'+_themeDotStyle(t)+'"'+
              ' data-t="'+t+'"'+
              ' onclick="event.stopPropagation();setTheme(\''+t+'\')"'+
              ' title="'+_themeDotTitle(t)+'"'+
              ' role="radio" aria-checked="'+active+'" tabindex="0">'+
            '</div>';
          }).join('')+
        '</div>'+
      '</div>'+
      // v14: Profile — collapsed just opens modal, expanded shows avatar upload
      '<div class="sb-profile-v13" onclick="openModal(\'profile-modal\')">'+
        '<div class="sb-avatar-wrap" onclick="event.stopPropagation();'+(isCollapsed ? 'openModal(\'profile-modal\')' : 'triggerAvatarUpload()')+'">'+
          '<div class="sb-avatar" id="sb-avatar">'+avatarHtml+'</div>'+
          (isCollapsed ? '' :
            '<div class="sb-avatar-edit">'+
              '<svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>'+
            '</div>'
          )+
          '<input type="file" id="avatar-upload-input" accept="image/*" style="display:none" onchange="handleAvatarUpload(event)">'+
        '</div>'+
        '<div class="sb-profile-info">'+
          '<div class="sb-profile-name" id="sb-name">'+(p.name||'Set up profile')+'</div>'+
          '<div class="sb-profile-role" id="sb-role">'+(p.role||'Click to edit')+'</div>'+
        '</div>'+
        '<span class="sb-tooltip">Profile</span>'+
      '</div>'+
      '<button class="sb-logout-btn" onclick="authLogout()" title="Sign out" aria-label="Sign out">'+
        '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'+
        '<span>Sign Out</span>'+
      '</button>'+
    '</div>';
}

// v13: Avatar upload trigger
function triggerAvatarUpload() {
  var input = document.getElementById('avatar-upload-input');
  if (input) input.click();
}

// v13: Handle avatar upload with WebP compression
function handleAvatarUpload(event) {
  var file = event.target.files && event.target.files[0];
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast('Please select an image file', 'error');
    return;
  }
  
  // Validate file size (max 5MB before compression)
  if (file.size > 5 * 1024 * 1024) {
    toast('Image too large (max 5MB)', 'error');
    return;
  }
  
  // Show loading
  toast('Processing image...', 'info');
  
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      // Compress and convert to WebP
      var canvas = document.createElement('canvas');
      var maxSize = 200; // Max avatar size
      var width = img.width;
      var height = img.height;
      
      // Scale down if needed
      if (width > height) {
        if (width > maxSize) {
          height = Math.round(height * maxSize / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round(width * maxSize / height);
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to WebP with quality compression
      var webpDataUrl;
      try {
        webpDataUrl = canvas.toDataURL('image/webp', 0.7);
      } catch(err) {
        // Fallback to JPEG if WebP not supported
        webpDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      }
      
      // Check compressed size
      var base64Size = Math.round((webpDataUrl.length - 22) * 3 / 4);
      if (base64Size > 100 * 1024) { // Max 100KB after compression
        toast('Image still too large after compression', 'error');
        return;
      }
      
      // Save to state
      state.profile.avatar = webpDataUrl;
      saveState();
      applyProfile();
      renderSidebar();
      toast('Avatar updated', 'success');
    };
    img.onerror = function() {
      toast('Failed to load image', 'error');
    };
    img.src = e.target.result;
  };
  reader.onerror = function() {
    toast('Failed to read file', 'error');
  };
  reader.readAsDataURL(file);
  
  // Reset input
  event.target.value = '';
}

function _sbItem(view, iconSvg, label, extra) {
  return '<div class="sb-item" id="nav-'+view+'" onclick="navigate(\''+view+'\')" role="button" tabindex="0" aria-label="'+label+'">'+
    iconSvg+'<span class="sb-item-text">'+label+'</span>'+(extra||'')+
    '<span class="sb-tooltip">'+label+'</span>'+
  '</div>';
}
function _sbItem2(label, iconSvg, onclickFn, extra) {
  return '<div class="sb-item" onclick="'+onclickFn+'" role="button" tabindex="0" aria-label="'+label+'">'+
    iconSvg+'<span class="sb-item-text">'+label+'</span>'+(extra||'')+
    '<span class="sb-tooltip">'+label+'</span>'+
  '</div>';
}

/* Topbar render */
function renderTopbar() {
  var tb = document.getElementById('topbar');
  if (!tb) return;
  tb.innerHTML =
    '<span class="tb-title" id="tb-title">Dashboard</span>'+
    '<span class="tb-sep" aria-hidden="true">|</span>'+
    '<div class="tb-search" role="search">'+
      '<svg class="tb-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'+
      '<input type="search" placeholder="Search... (Cmd + K)" onfocus="openSearch();this.blur()" aria-label="Open search">'+
    '</div>'+
    '<div class="tb-spacer"></div>'+
    '<div id="save-pill" class="save-pill" title="Saved"></div>'+
    '<button id="tb-action-btn" class="tb-btn tb-btn-primary" onclick="handleTopAction()" aria-label="Primary action">'+
      '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'+
      '<span id="tb-action-label">New Task</span>'+
    '</button>';
}
