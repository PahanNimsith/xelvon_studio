/* ══════════════════════════════════════════════════════
   AUTH — Supabase client, login, signup, logout
   Xelvon Studio v11
══════════════════════════════════════════════════════ */
var SUPABASE_URL = 'https://afcldfvaudtshfsrruij.supabase.co';
var SUPABASE_KEY = 'sb_publishable_xNsMRzcnWw_GOAaEPZv8eA_KHbJ-KWX';
var _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
var _currentUser = null;

/* Image compression */
function compressImage(file, maxW, maxH, quality) {
  maxW = maxW || 200; maxH = maxH || 200; quality = quality || 0.72;
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var w = img.width, h = img.height;
        if (w > maxW || h > maxH) {
          var ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function showAuthOverlay(tab) {
  var el = document.getElementById('auth-overlay');
  if (el) el.style.display = 'flex';
  switchAuthTab(tab || 'login');
}

function hideAuthOverlay() {
  var el = document.getElementById('auth-overlay');
  if (el) el.style.display = 'none';
}

function switchAuthTab(tab) {
  var lf = document.getElementById('auth-login-form');
  var sf = document.getElementById('auth-signup-form');
  if (lf) lf.style.display = tab === 'login'  ? 'flex' : 'none';
  if (sf) sf.style.display = tab === 'signup' ? 'flex' : 'none';
  document.querySelectorAll('.auth-tab').forEach(function(el) {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  document.querySelectorAll('.auth-error').forEach(function(el) {
    el.textContent = '';
  });
  var firstInp = (tab === 'login')
    ? document.getElementById('login-email')
    : document.getElementById('signup-name');
  if (firstInp) setTimeout(function(){ firstInp.focus(); }, 80);
}

async function authLogin() {
  var email = document.getElementById('login-email').value.trim();
  var pass  = document.getElementById('login-pass').value;
  var errEl = document.getElementById('login-error');
  var btn   = document.getElementById('login-btn');
  errEl.textContent = '';

  if (!email || !pass) { errEl.textContent = 'Email and password required.'; return; }
  btn.disabled = true; btn.textContent = 'Signing in...';

  var res = await _sb.auth.signInWithPassword({ email: email, password: pass });
  if (res.error) {
    errEl.textContent = res.error.message;
    btn.disabled = false; btn.textContent = 'Sign In';
    return;
  }
  _currentUser = res.data.user;
  await bootApp();
}

async function authSignup() {
  var name  = document.getElementById('signup-name').value.trim();
  var email = document.getElementById('signup-email').value.trim();
  var pass  = document.getElementById('signup-pass').value;
  var errEl = document.getElementById('signup-error');
  var btn   = document.getElementById('signup-btn');
  errEl.textContent = '';

  if (!name)  { errEl.textContent = 'Display name is required.'; return; }
  if (!email) { errEl.textContent = 'Email is required.'; return; }
  if (pass.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }

  btn.disabled = true; btn.textContent = 'Creating account...';

  var res = await _sb.auth.signUp({ email: email, password: pass });
  if (res.error) {
    errEl.textContent = res.error.message;
    btn.disabled = false; btn.textContent = 'Create Account';
    return;
  }
  _currentUser = res.data.user;
  state = makeSeed();
  state.profile.name = name;
  await bootApp();
}

function authLogout() {
  showConfirm({
    title: 'Sign Out',
    message: 'Are you sure you want to sign out of Xelvon Studio?',
    confirmLabel: 'Sign Out',
    confirmStyle: 'danger',
    onConfirm: _doAuthLogout
  });
}

async function _doAuthLogout() {
  await _sb.auth.signOut();
  _currentUser = null;
  state = {};
  var app = document.getElementById('app');
  if (app) app.style.opacity = '0';
  setTimeout(function() {
    ['login-email','login-pass','signup-name','signup-email','signup-pass'].forEach(function(id){
      var el = document.getElementById(id); if (el) el.value = '';
    });
    showAuthOverlay('login');
  }, 320);
}

async function checkAuthSession() {
  var res = await _sb.auth.getSession();
  if (res.data && res.data.session && res.data.session.user) {
    _currentUser = res.data.session.user;
    return true;
  }
  return false;
}
