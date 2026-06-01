/* ══════════════════════════════════════════════════════
   STATE — seed data, runtime state, migration guard
   Xelvon Studio v15
══════════════════════════════════════════════════════ */
var state = {};
var activeDocId = null;
var currentView = 'dashboard';

function makeSeed() {
  return {
    profile: { name:'', role:'', avatar:null },
    theme: 'theme-light',
    phases: [],
    links: [],
    documents: [],
    scratchpad: '',
    tags: ['planning','research','dev','design','content','urgent'],
    trash: [],
    activityLog: [],
    pomodoroSettings: { work:25, shortBreak:5 },
    archivedPhases: [],
    todayPlans: [],
    docFolders: [],
    todayPhaseRecords: [],
    sidebarCollapsed: false,
    boardView: 'list',  // v12: default to list view
    filesView: 'list',  // v12: default to list view
    _lastDeletedTask: null,
    _completedTasksCollapsed: {}  // v12: track collapsed state per phase
  };
}

/* Migration guard */
function migrateState() {
  if (!state.trash) state.trash = [];
  if (!state.activityLog) state.activityLog = [];
  if (!state.links) state.links = [];
  if (!state.documents) state.documents = [];
  if (!state.scratchpad) state.scratchpad = '';
  if (!state.tags) state.tags = ['planning','research','dev','design','content','urgent'];
  if (!state.profile) state.profile = { name:'', role:'', avatar:null };
  if (!state.phases) state.phases = [];
  if (!state.archivedPhases) state.archivedPhases = [];
  if (!state.todayPlans) state.todayPlans = [];
  if (!state.docFolders) state.docFolders = [];
  if (!state.todayPhaseRecords) state.todayPhaseRecords = [];
  if (!state.pomodoroSettings) state.pomodoroSettings = { work:25, shortBreak:5 };
  if (state.sidebarCollapsed === undefined) state.sidebarCollapsed = false;
  if (!state.boardView) state.boardView = 'list';  // v12: default to list
  if (!state.filesView) state.filesView = 'list';  // v12: default to list
  if (state._lastDeletedTask === undefined) state._lastDeletedTask = null;
  if (!state._completedTasksCollapsed) state._completedTasksCollapsed = {};  // v12
  state.documents.forEach(function(d){ if (!d.folderId) d.folderId = null; });
  state.phases.forEach(function(ph) {
    if (!ph.tasks) ph.tasks = [];
    if (!ph.dailyPlans) ph.dailyPlans = [];
    if (!ph.completedTasks) ph.completedTasks = [];  // v12: completed tasks storage
    ph.tasks.forEach(function(t) {
      if (!t.tags) t.tags = [];
      if (!t.checklist) t.checklist = [];
      if (t.timeSpent == null) t.timeSpent = 0;
    });
  });
}

/* Load from localStorage / seed */
function loadState() {
  var tag = document.getElementById('xelvon-data');
  var tagData = tag ? tag.textContent.trim() : '';
  var lsData = null;
  try { lsData = localStorage.getItem('xelvon_v4'); } catch(e){}

  if (tagData.length > 4) {
    try { state = JSON.parse(tagData); } catch(e){ state = makeSeed(); }
  } else if (lsData && lsData.length > 4) {
    try { state = JSON.parse(lsData); } catch(e){ state = makeSeed(); }
  } else {
    state = makeSeed();
  }
  migrateState();
}
