window.addEventListener('DOMContentLoaded', function() {
  // 1. 安全执行所有核心模块初始化（无论前面报错与否，都不会阻断后面）
  try { initGuestCookie(); } catch(e) { console.error('Guest load error:', e); }
  try { loadCookies(); } catch(e) { console.error('Cookies load error:', e); }
  try { chkAPI(); } catch(e) { console.error('API check error:', e); }
  try { initBg(); } catch(e) { console.error('Wallpaper init error:', e); }
  try { loadThemeSettings(); } catch(e) { console.error('Theme load error:', e); }
  
  try {
    var savedMask = localStorage.getItem('theme_mask_opacity');
    if (savedMask) {
      var maskRange = document.getElementById('maskOpacityRange');
      if (maskRange) maskRange.value = savedMask;
      changeMaskOpacity(savedMask);
    }
  } catch(e) { console.error(e); }

  // 2. 安全绑定所有输入框及按钮事件
  var ncIpt = document.getElementById('ncCookie');
  var blIpt = document.getElementById('blCookie');
  if (ncIpt) ncIpt.addEventListener('input', function() { saveCookie('nc'); });
  if (blIpt) blIpt.addEventListener('input', function() { saveCookie('bl'); });

  var sIpt = document.getElementById('sIpt');
  if (sIpt) {
    sIpt.addEventListener('keydown', function(e) { 
      if (e.key === 'Enter') { hideSug(); sBtn(); } 
      if (e.key === 'Escape') hideSug(); 
    });
  }

  var sBtnEl = document.getElementById('sBtn');
  if (sBtnEl) sBtnEl.addEventListener('click', sBtn);

  var biIpt = document.getElementById('biIpt');
  if (biIpt) {
    biIpt.addEventListener('keydown', function(e) { 
      if (e.key === 'Enter') biSearch(); 
    });
  }

  var biBtnEl = document.getElementById('biBtn');
  if (biBtnEl) biBtnEl.addEventListener('click', biSearch);
});

// 3. 全局冒泡事件监听（无需等待 DOM 树构建即可安全绑定）
document.addEventListener('click', function(e) { 
  var drop = document.getElementById('sDrop'); 
  if (drop && !e.target.closest('.s-wrap')) drop.classList.remove('show'); 
});

document.addEventListener('keydown', function(e) {
  // 屏蔽输入框中的空格误触播放
  if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') { 
    e.preventDefault(); 
    tPlay(); 
  }
  // ESC 键全局退出全屏或弹窗
  if (e.code === 'Escape') { 
    var fullP = document.getElementById('fullP');
    if (fullP) fullP.classList.remove('show'); 
    document.body.classList.remove('fs-mode');
    if (typeof hdCL === 'function') hdCL(); 
  }
});
