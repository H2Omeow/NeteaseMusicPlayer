// ==================== 全局变量 ====================
var API = '/api';
var BAPI = 'http://nekoh2o.top:3002';

// Cookie 存储键名（与原始项目一致）
var ncKey = 'napcat_nc_cookie', blKey = 'napcat_bl_cookie';
var ncGuestKey = 'nc_guest_cookie';

// 播放器状态
var lyrics = [], play = false, seeking = false;
var list = [], idx = -1;
var sType = 1;

// "我的"页面数据（拆分版新增）
var playHistory = JSON.parse(localStorage.getItem('my_history') || '[]');
var myFavorites = JSON.parse(localStorage.getItem('my_favorites') || '[]');
var customPlaylists = JSON.parse(localStorage.getItem('my_playlists') || '[]');

// ==================== 核心 API 请求封装（XHR，与原始一致） ====================
function fAPI(p) {
  return new Promise(function(r, j) {
    var x = new XMLHttpRequest();
    x.timeout = 12000;
    x.onload = function() { try { r(JSON.parse(x.responseText)); } catch(e) { j(e); } };
    x.onerror = function() { j(new Error('网络错误')); };
    x.ontimeout = function() { j(new Error('超时')); };
    x.open('GET', API + p, true);
    x.send();
  });
}

// ==================== 转义函数（与原始完全一致） ====================
function escH(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(s));
  return d.innerHTML;
}

function escA(s) {
  return (s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

// ==================== Toast（与原始一致：先移除旧toast） ====================
function toast(m) {
  var o = document.querySelector('.toast');
  if (o) o.remove();
  var t = document.createElement('div');
  t.className = 'toast';
  t.textContent = m;
  document.body.appendChild(t);
  setTimeout(function(){ t.remove(); }, 2000);
}

// ==================== API 检测（与原始一致的直接 XHR 方式） ====================
function chkAPI() {
  var x = new XMLHttpRequest();
  x.timeout = 4000;
  x.onload = function() {
    try {
      var d = JSON.parse(x.responseText);
      document.getElementById('apiS').innerHTML = (d.code === 200)
        ? '<span class="sdot on"></span>已连接'
        : '<span class="sdot off"></span>异常';
    } catch(e) { document.getElementById('apiS').innerHTML = '<span class="sdot off"></span>未连接'; }
  };
  x.onerror = function() { document.getElementById('apiS').innerHTML = '<span class="sdot off"></span>未连接'; };
  x.open('GET', API + '/personalized?limit=1', true);
  x.send();
}

// ==================== 时间格式化（与原始一致：padStart） ====================
function fmtT(t) {
  if (!t || isNaN(t)) return '00:00';
  var m = Math.floor(t / 60), s = Math.floor(t % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
