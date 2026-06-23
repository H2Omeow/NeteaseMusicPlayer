// ==================== 歌曲播放入口 ====================
// pSongNow：拆分版新增的"点击即插播"逻辑（当前播放后插入）
function pSongNow(id, nm, ar, pc) {
  var song = {id:id, nm:nm, ar:ar, pc:pc};
  if (list.length === 0) {
    list.push(song);
    playByIdx(0);
    return;
  }
  var existingIdx = list.findIndex(function(s){ return s.id === id; });
  if (existingIdx === idx) { tPlay(); return; }
  if (existingIdx !== -1) {
    list.splice(existingIdx, 1);
    if (existingIdx < idx) idx--;
  }
  list.splice(idx + 1, 0, song);
  playByIdx(idx + 1);
}

// pSong：原始兼容入口（简单追加逻辑，用于 rSong 渲染的旧卡片）
function pSong(id, nm, ar, pc) {
  if (list.length === 0) {
    list.push({id:id,nm:nm,ar:ar,pc:pc});
    playByIdx(0);
  } else {
    list.push({id:id,nm:nm,ar:ar,pc:pc});
    toast('已添加到播放列表');
  }
}

// ==================== 核心播放逻辑 ====================
function playByIdx(i) {
  idx = i;
  var s = list[idx];
  document.getElementById('pBar').style.display = 'flex';
  document.getElementById('pTtl').textContent = s.nm;
  document.getElementById('pArt').textContent = s.ar;
  document.getElementById('pCvr').src = s.pc + '?param=100y100';
  document.getElementById('fpTtl').textContent = s.nm;
  document.getElementById('fpArt').textContent = s.ar;
  document.getElementById('fpCvr').src = s.pc + '?param=400y400';
  document.getElementById('statusCover').src = s.pc + '?param=100y100';  // ← 新增
  document.getElementById('nowPlaying').textContent = s.nm;
  document.getElementById('statusArtist').textContent = s.ar;            // ← 新增
  var cnt = parseInt(document.getElementById('playedCnt').textContent) || 0;
  
  addToHistory(s);
  fLrc(s.id);
  
  var q = document.getElementById('qSel').value;
  var ck = getNCookie();
  var brMap = { 'standard': 128000, 'higher': 192000, 'exhigh': 320000, 'lossless': 999000 };
  var backupBr = brMap[q] || 320000;
  
  fAPI('/song/url/v1?id=' + s.id + '&level=' + q + (ck ? '&cookie=' + encodeURIComponent(ck) : ''))
  .then(function(d) {
    if (d && d.code === 200 && d.data && d.data[0] && d.data[0].url) {
      loadAudioSrc(d.data[0].url);
    } else {
      tryBackupSongUrl(s.id, backupBr, ck);
    }
  })
  .catch(function() {
    tryBackupSongUrl(s.id, backupBr, ck);
  });
}

function tryBackupSongUrl(id, br, ck) {
  fAPI('/song/url?id=' + id + '&br=' + br + (ck ? '&cookie=' + encodeURIComponent(ck) : ''))
  .then(function(d) {
    if (d && d.code === 200 && d.data && d.data[0] && d.data[0].url) {
      loadAudioSrc(d.data[0].url);
    } else {
      toast('音频获取受阻 (可能为VIP或无版权歌曲)');
    }
  })
  .catch(function() {
    toast('音频服务异常，请稍后重试');
  });
}

function loadAudioSrc(url) {
  var a = document.getElementById('aPlayer');
  if (a) {
    a.src = url;
    a.play()
    .then(function() { play = true; upIcn(); })
    .catch(function() { toast('请手动点击播放按钮'); });
  }
}

function tPlay() {
  var a = document.getElementById('aPlayer');
  if (!a.src) return;
  if (a.paused) { a.play().catch(function(){}); play = true; }
  else { a.pause(); play = false; }
  upIcn();
}

function upIcn() {
  var i = play ? 'fa-pause' : 'fa-play';
  document.getElementById('pIcn').className = 'fas ' + i;
  document.getElementById('fpIcn').className = 'fas ' + i;
  var fpCvr = document.getElementById('fpCvr');
  if (play) fpCvr.classList.add('playing');
  else fpCvr.classList.remove('playing');
}

function tFull() { 
  var fp = document.getElementById('fullP');
  fp.classList.toggle('show'); 
  if (fp.classList.contains('show')) document.body.classList.add('fs-mode');
  else document.body.classList.remove('fs-mode');
}

function prev() { if (idx > 0) playByIdx(idx - 1); }
function next() { if (idx < list.length - 1) playByIdx(idx + 1); }

// ==================== 进度条拖动（与原始一致：seeking 标志 + currentTarget） ====================
function seek(e) {
  if (seeking) { seeking = false; return; }
  if (e.type === 'touchstart') seeking = true;
  var b = e.currentTarget, r = b.getBoundingClientRect();
  var x = e.clientX != null ? e.clientX : (e.changedTouches && e.changedTouches[0] && e.changedTouches[0].clientX);
  if (x == null) return;
  var pct = Math.max(0, Math.min(1, (x - r.left) / r.width));
  var a = document.getElementById('aPlayer');
  if (a.duration && isFinite(a.duration)) a.currentTime = pct * a.duration;
}

// ==================== 歌词系统（与原始完全一致） ====================
function fLrc(id) {
  var ul = document.getElementById('lyrUl');
  ul.innerHTML = '<li>正在寻找精准同步歌词...</li>';
  lyrics = [];
  
  fAPI('/lyric/new?id=' + id).then(function(d) {
    var lrc = (d.yrc && d.yrc.lyric) || (d.lrc && d.lrc.lyric) || '';
    var tlr = (d.tlyric && d.tlyric.lyric) || '';
    if (lrc) {
      renderParsedLrc(lrc, tlr);
    } else {
      tryBackupLrc(id);
    }
  })
  .catch(function() {
    tryBackupLrc(id);
  });
}

function tryBackupLrc(id) {
  fAPI('/lyric?id=' + id).then(function(d) {
    var lrc = (d.lrc && d.lrc.lyric) || '';
    var tlr = (d.tlyric && d.tlyric.lyric) || '';
    if (lrc) {
      renderParsedLrc(lrc, tlr);
    } else {
      document.getElementById('lyrUl').innerHTML = '<li>暂无歌词</li>';
    }
  })
  .catch(function() {
    document.getElementById('lyrUl').innerHTML = '<li>歌词加载异常</li>';
  });
}

function renderParsedLrc(lrc, tlr) {
  var ul = document.getElementById('lyrUl');
  if (!ul) return;
  var ma = pLrc(lrc), ta = pLrc(tlr);
  
  lyrics = ma.map(function(m) {
    var t = ta.find(function(x) { return Math.abs(x.time - m.time) < 0.5; });
    if (t) m.t = t.text;
    return m;
  });
  
  if (lyrics.length > 0) {
    ul.innerHTML = lyrics.map(function(l, i) {
      var txt = '';
      if (l.words) {
        txt = l.words.map(function(w) {
          return '<span class="wc" data-t="' + w.t + '" data-d="' + (w.d||0) + '"><span class="wg">' + escH(w.ch) + '</span><span class="wp">' + escH(w.ch) + '</span></span>';
        }).join('');
      } else {
        txt = escH(l.text);
      }
      return '<li id="l' + i + '">' + txt + (l.t ? '<span class="lt">' + escH(l.t) + '</span>' : '') + '</li>';
    }).join('');
  } else { ul.innerHTML = '<li>暂无歌词</li>'; }
}

function pLrc(s) {
  if (!s) return [];
  var ls = s.split(String.fromCharCode(10)), r = [];
  for (var i = 0; i < ls.length; i++) {
    var l = ls[i];
    if (!l) continue;
    if (l.charAt(0) === '{') {
      try {
        var j = JSON.parse(l);
        if (j.t !== undefined && j.c) {
          var txt = j.c.map(function(x){return x.tx||''}).join('');
          if (txt) r.push({time:j.t/1000,text:txt});
        }
      } catch(e){}
      continue;
    }
    var i1 = l.indexOf('['), i2 = l.indexOf(']');
    if (i1 === -1 || i2 === -1) continue;
    var m = l.substring(i1 + 1, i2), t = l.substring(i2 + 1).trim();
    if (!t) continue;
    var words = [];
    var wRe = /\(\d+,\d+,\d+\)/g;
    var parts = t.split(wRe);
    var tsList = [];
    var tsRe2 = /\((\d+,\d+,\d+)\)/g;
    var tMa;
    while ((tMa = tsRe2.exec(t)) !== null) {
      var tp = tMa[1].split(',');
      tsList.push({t:parseInt(tp[0])/1000, d:parseInt(tp[1])/1000});
    }
    for (var ti = 0; ti < tsList.length && ti + 1 < parts.length; ti++) {
      var txt = parts[ti + 1];
      if (txt) words.push({ch:txt, t:tsList[ti].t, d:tsList[ti].d});
    }
    var plain = t.replace(wRe,'').trim();
    if (!plain) continue;
    var p = m.split(','), tm = 0;
    if (p.length === 2) tm = parseInt(p[0]) / 1000;
    else { var tp = m.split(':'); if (tp.length === 2) tm = parseInt(tp[0]) * 60 + parseFloat(tp[1]); }
    if (tm > 0 && plain) r.push({time:tm,text:plain,words:words.length > 0 ? words : null});
  }
  return r.sort(function(a,b){return a.time-b.time});
}

var rafId = null;
function rafWords() {
  if (!lyrics.length || !play) { rafId = null; return; }
  var ct = document.getElementById('aPlayer').currentTime;
  var idx2 = -1;
  for (var j = lyrics.length - 1; j >= 0; j--) { if (lyrics[j].time <= ct) { idx2 = j; break; } }
  var li = document.getElementById('l' + (idx2 < 0 ? 0 : idx2));
  if (li) {
    var cw = li.querySelectorAll('.wc');
    for (var k = 0; k < cw.length; k++) {
      var wt = parseFloat(cw[k].getAttribute('data-t') || 0);
      var wd = parseFloat(cw[k].getAttribute('data-d') || 0);
      var p = (ct - wt) / wd;
      if (p >= 1) {
        cw[k].classList.add('done');
        cw[k].classList.remove('active');
        var po = cw[k].querySelector('.wp');
        if (po) po.style.width = '100%';
      } else if (p > 0) {
        cw[k].classList.remove('done');
        cw[k].classList.add('active');
        var pt = p * 100;
        var po = cw[k].querySelector('.wp');
        if (po) po.style.width = pt + '%';
      } else {
        cw[k].classList.remove('done','active');
        var po = cw[k].querySelector('.wp');
        if (po) po.style.width = '0%';
      }
    }
  }
  rafId = requestAnimationFrame(rafWords);
}

// ==================== 播放列表管理 ====================
function shPL() { renderPL(); document.getElementById('plModal').classList.add('show'); }
function hdPL() { document.getElementById('plModal').classList.remove('show'); }

function flipAnim(container, oldRects) {
  var items = container.querySelectorAll('.pl-item');
  var anims = [];
  items.forEach(function(it) {
    var id;
    // 尝试从 data-i 或 data-ci 获取歌曲 id
    var di = it.getAttribute('data-i');
    if (di !== null) {
      id = list[parseInt(di)].id;
    } else {
      var dci = it.getAttribute('data-ci');
      if (dci !== null && activeCustomPlIdx >= 0) {
        id = customPlaylists[activeCustomPlIdx].songs[parseInt(dci)].id;
      }
    }
    if (!id || !oldRects[id]) return;
    var newRect = it.getBoundingClientRect();
    var oldRect = oldRects[id];
    var dx = oldRect.left - newRect.left;
    var dy = oldRect.top - newRect.top;
    if (dx === 0 && dy === 0) return;
    anims.push({ el: it, dx: dx, dy: dy });
  });
  if (anims.length === 0) return;

  // 第一帧：设置反向位移（无过渡）
  anims.forEach(function(a) {
    a.el.style.transition = 'none';
    a.el.style.transform = 'translate(' + a.dx + 'px, ' + a.dy + 'px)';
  });

  // 第二帧：移除位移，启动弹性过渡
  requestAnimationFrame(function() {
    anims.forEach(function(a) {
      a.el.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1.2)';
      a.el.style.transform = '';
      var elRef = a.el;
      var onEnd = function() {
        elRef.style.transition = '';
        elRef.style.transform = '';
        elRef.removeEventListener('transitionend', onEnd);
      };
      elRef.addEventListener('transitionend', onEnd);
    });
  });
}

function renderPL() {
  var el = document.getElementById('plList');
  var em = document.getElementById('plEmpty');
  if (list.length === 0) { el.innerHTML = ''; em.style.display = 'block'; return; }
  em.style.display = 'none';
  
  el.innerHTML = list.map(function(s, i) {
    return '<div class="s-item pl-item" draggable="true" data-i="' + i + '" onclick="plClick(' + i + ')">'
      + '<span class="drag-hdl" onclick="event.stopPropagation()"><i class="fas fa-grip-lines"></i></span>'
      + '<img src="' + s.pc + '?param=100y100" alt="" loading="lazy" />'
      + '<div class="s-info"><div class="sn" style="' + (idx === i ? 'color:var(--primary)' : '') + '">' + escH(s.nm) + '</div><div class="sa">' + escH(s.ar) + '</div></div>'
      + '<span class="pl-del" onclick="event.stopPropagation();rmPL(' + i + ')" title="删除"><i class="fas fa-times"></i></span>'
      + '</div>';
  }).join('');


  var dragSrc = -1;
  el.ondragstart = function(e) {
    var item = e.target.closest('.pl-item');
    if (!item) return;
    dragSrc = parseInt(item.getAttribute('data-i'));
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragSrc));
  };
  el.ondragend = function(e) {
    el.querySelectorAll('.pl-item').forEach(function(x) { x.classList.remove('dragging','drag-over'); });
  };

  el.ondragover = function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // 穿透拖拽幽灵：临时隐藏被拖拽元素
    var dragged = el.querySelector('.pl-item.dragging');
    if (dragged) dragged.style.display = 'none';
    var below = document.elementFromPoint(e.clientX, e.clientY);
    if (dragged) dragged.style.display = '';
    var item = below ? below.closest('.pl-item') : null;

    el.querySelectorAll('.drag-over').forEach(function(x) { x.classList.remove('drag-over'); });
    if (item && parseInt(item.getAttribute('data-i')) !== dragSrc) {
      item.classList.add('drag-over');
    }
  };

  el.ondrop = function(e) {
    e.preventDefault();
    var item = el.querySelector('.pl-item.drag-over');
    el.querySelectorAll('.pl-item').forEach(function(x) { x.classList.remove('dragging','drag-over'); });
    if (!item || dragSrc < 0) { dragSrc = -1; return; }
    var to = parseInt(item.getAttribute('data-i'));
    if (dragSrc === to) { dragSrc = -1; return; }

    // FLIP: 记录旧位置
    var oldRects = {};
    el.querySelectorAll('.pl-item').forEach(function(it) {
      var di = parseInt(it.getAttribute('data-i'));
      oldRects[list[di].id] = it.getBoundingClientRect();
    });

    var song = list.splice(dragSrc, 1)[0];
    list.splice(to, 0, song);
    if (idx === dragSrc) idx = to;
    else if (dragSrc < to && idx > dragSrc && idx <= to) idx--;
    else if (dragSrc > to && idx >= to && idx < dragSrc) idx++;
    dragSrc = -1;
    renderPL();

    requestAnimationFrame(function() {
      flipAnim(el, oldRects);
    });
  };

  var touchSrc = -1;
  el.ontouchstart = function(e) {
    var item = e.target.closest('.pl-item');
    if (!item) return;
    touchSrc = parseInt(item.getAttribute('data-i'));
  };
  el.ontouchmove = function(e) {
    if (touchSrc < 0) return;
    var items = el.querySelectorAll('.pl-item');
    el.querySelectorAll('.drag-over').forEach(function(x) { x.classList.remove('drag-over'); });
    var y = e.touches[0].clientY;
    for (var ti = 0; ti < items.length; ti++) {
      var r = items[ti].getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) { items[ti].classList.add('drag-over'); break; }
    }
  };

  el.ontouchend = function(e) {
    if (touchSrc < 0) return;
    el.querySelectorAll('.pl-item').forEach(function(x) { x.classList.remove('dragging','drag-over'); });
    var items = el.querySelectorAll('.pl-item');
    var y = e.changedTouches[0].clientY;
    var to = -1;
    for (var ti = 0; ti < items.length; ti++) {
      var r = items[ti].getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) { to = ti; break; }
    }
    if (to < 0 || touchSrc === to) { touchSrc = -1; return; }

    // FLIP: 记录旧位置
    var oldRects = {};
    items.forEach(function(it) {
      var di = parseInt(it.getAttribute('data-i'));
      oldRects[list[di].id] = it.getBoundingClientRect();
    });

    var song = list.splice(touchSrc, 1)[0];
    list.splice(to, 0, song);
    if (idx === touchSrc) idx = to;
    else if (touchSrc < to && idx > touchSrc && idx <= to) idx--;
    else if (touchSrc > to && idx >= to && idx < touchSrc) idx++;
    touchSrc = -1;
    renderPL();

    requestAnimationFrame(function() {
      flipAnim(el, oldRects);
    });
  };
}

function plClick(i) {
  if (idx === i && document.getElementById('aPlayer').src) { hdPL(); return; }
  playByIdx(i);
  hdPL();
}

function rmPL(i) {
  if (i < 0 || i >= list.length) return;
  list.splice(i, 1);
  if (list.length === 0) { idx = -1; }
  else if (idx === i) {
    if (i >= list.length) idx = list.length - 1;
    playByIdx(idx);
  } else if (idx > i) { idx--; }
  renderPL();
}

// ==================== 历史记录 ====================
function addToHistory(song) {
  var index = playHistory.findIndex(function(s){ return s.id === song.id; });
  if(index > -1) playHistory.splice(index, 1);
  playHistory.unshift(song);
  if(playHistory.length > 100) playHistory.pop();
  localStorage.setItem('my_history', JSON.stringify(playHistory));
}

// ==================== 收藏功能 ====================
function isFav(id) {
  return myFavorites.some(function(s){ return s.id === id; });
}

function favSong(id, nm, ar, pc, btn) {
  var index = myFavorites.findIndex(function(s){ return s.id === id; });
  if (index > -1) {
    myFavorites.splice(index, 1);
    btn.innerHTML = '<i class="far fa-heart"></i>';
    btn.querySelector('i').style.color = '';
  } else {
    myFavorites.push({id:id, nm:nm, ar:ar, pc:pc});
    btn.innerHTML = '<i class="fas fa-heart"></i>';
    btn.querySelector('i').style.color = 'var(--primary)';
  }
  localStorage.setItem('my_favorites', JSON.stringify(myFavorites));
  if(document.getElementById('mineFavorites').style.display !== 'none') {
    renderMineFavorites();
  }
}

// ==================== 添加到歌单（拆分版新增） ====================
var pendingAddSong = null;
function openAddPlModal(id, nm, ar, pc) {
  pendingAddSong = {id:id, nm:nm, ar:ar, pc:pc};
  renderAddPlModal();
  document.getElementById('addPlModal').classList.add('show');
}

function renderAddPlModal() {
  var el = document.getElementById('addPlTargetList');
  var html = '<div class="modal-menu-item" onclick="execAddPl(-1)"><i class="fas fa-play-circle" style="color:var(--primary);margin-right:8px;"></i>当前播放列表</div>';
  html += '<div class="modal-menu-item" onclick="createNewPl()"><i class="fas fa-plus" style="margin-right:8px;"></i>新建自定义歌单...</div>';
  customPlaylists.forEach(function(p, i) {
    html += '<div class="modal-menu-item" onclick="execAddPl(' + i + ')"><i class="fas fa-list" style="margin-right:8px;"></i>' + escH(p.name) + ' <span style="opacity:0.5;font-size:12px;">(' + p.songs.length + ')</span></div>';
  });
  el.innerHTML = html;
}

function execAddPl(plIdx) {
  if (!pendingAddSong) return;
  if (plIdx === -1) {
    list.push(pendingAddSong);
    toast('已加入到当前播放列表尾部');
  } else {
    if (!customPlaylists[plIdx].songs.some(function(s){return s.id === pendingAddSong.id})) {
      customPlaylists[plIdx].songs.push(pendingAddSong);
      saveCustomPl();
      toast('成功添加到 ' + customPlaylists[plIdx].name);
    } else {
      toast('歌曲已在歌单中');
    }
  }
  document.getElementById('addPlModal').classList.remove('show');
}

function createNewPl() {
  var name = prompt('请输入新歌单名称:');
  if (name && name.trim()) {
    customPlaylists.push({id: Date.now().toString(), name: name.trim(), songs: []});
    saveCustomPl();
    if (pendingAddSong) {
      renderAddPlModal();
      execAddPl(customPlaylists.length - 1);
    }
  }
}

function saveCustomPl() {
  localStorage.setItem('my_playlists', JSON.stringify(customPlaylists));
}

// ==================== 自定义歌单管理（拆分版新增） ====================
var activeCustomPlIdx = -1;
function openCustomPl(idx) {
  activeCustomPlIdx = idx;
  document.getElementById('cPlTitle').innerHTML = '<i class="fas fa-list" style="color:var(--primary);margin-right:8px"></i>' + escH(customPlaylists[idx].name);
  renderCustomPl();
  document.getElementById('customPlModal').classList.add('show');
}

function renderCustomPl() {
  var el = document.getElementById('cPlList');
  if (activeCustomPlIdx < 0) return;
  var songs = customPlaylists[activeCustomPlIdx].songs;
  if (songs.length === 0) { el.innerHTML = '<div class="pl-empty">歌单为空，快去搜索并添加吧</div>'; return; }
  
  el.innerHTML = songs.map(function(s, i) {
    return '<div class="s-item pl-item" draggable="true" data-ci="' + i + '" onclick="playCustomPlSong(' + i + ')">'
      + '<span class="drag-hdl" onclick="event.stopPropagation()"><i class="fas fa-grip-lines"></i></span>'
      + '<img src="' + s.pc + '?param=100y100" alt="" loading="lazy" />'
      + '<div class="s-info"><div class="sn">' + escH(s.nm) + '</div><div class="sa">' + escH(s.ar) + '</div></div>'
      + '<span class="pl-del" onclick="event.stopPropagation();rmCustomPlSong(' + i + ')" title="删除"><i class="fas fa-times"></i></span>'
      + '</div>';
  }).join('');

    var dragSrc = -1;
    el.ondragstart = function(e) {
        var item = e.target.closest('.pl-item');
        if (!item) return;
        dragSrc = parseInt(item.getAttribute('data-ci'));
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(dragSrc));
    };
    el.ondragend = function(e) { el.querySelectorAll('.pl-item').forEach(function(x) { x.classList.remove('dragging','drag-over'); }); };

    el.ondragover = function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var dragged = el.querySelector('.pl-item.dragging');
        if (dragged) dragged.style.display = 'none';
        var below = document.elementFromPoint(e.clientX, e.clientY);
        if (dragged) dragged.style.display = '';
        var item = below ? below.closest('.pl-item') : null;

        el.querySelectorAll('.drag-over').forEach(function(x) { x.classList.remove('drag-over'); });
        if (item && parseInt(item.getAttribute('data-ci')) !== dragSrc) {
          item.classList.add('drag-over');
        }
    };

    el.ondrop = function(e) {
        e.preventDefault();
        var item = el.querySelector('.pl-item.drag-over');
        el.querySelectorAll('.pl-item').forEach(function(x) { x.classList.remove('dragging','drag-over'); });
        if (!item || dragSrc < 0) { dragSrc = -1; return; }
        var to = parseInt(item.getAttribute('data-ci'));
        if (dragSrc === to) { dragSrc = -1; return; }

        var oldRects = {};
        el.querySelectorAll('.pl-item').forEach(function(it) {
          var dci = parseInt(it.getAttribute('data-ci'));
          oldRects[songs[dci].id] = it.getBoundingClientRect();
        });

        var song = songs.splice(dragSrc, 1)[0];
        songs.splice(to, 0, song);
        saveCustomPl(); renderCustomPl(); if(document.getElementById('minePlaylists').style.display !== 'none') renderMinePlaylists();

        requestAnimationFrame(function() {
          flipAnim(el, oldRects);
        });
    };

    var touchSrc = -1;
    el.ontouchstart = function(e) {
        var item = e.target.closest('.pl-item');
        if (!item) return;
        touchSrc = parseInt(item.getAttribute('data-ci'));
    };
    el.ontouchmove = function(e) {
        if (touchSrc < 0) return;
        var items = el.querySelectorAll('.pl-item');
        el.querySelectorAll('.drag-over').forEach(function(x) { x.classList.remove('drag-over'); });
        var y = e.touches[0].clientY;
        for (var ti = 0; ti < items.length; ti++) {
          var r = items[ti].getBoundingClientRect();
          if (y >= r.top && y <= r.bottom) { items[ti].classList.add('drag-over'); break; }
        }
    };
    el.ontouchend = function(e) {
        if (touchSrc < 0) return;
        el.querySelectorAll('.pl-item').forEach(function(x) { x.classList.remove('dragging','drag-over'); });
        var items = el.querySelectorAll('.pl-item');
        var y = e.changedTouches[0].clientY;
        var to = -1;
        for (var ti = 0; ti < items.length; ti++) {
          var r = items[ti].getBoundingClientRect();
          if (y >= r.top && y <= r.bottom) { to = ti; break; }
        }
        if (to < 0 || touchSrc === to) { touchSrc = -1; return; }

        var oldRects = {};
        items.forEach(function(it) {
          var dci = parseInt(it.getAttribute('data-ci'));
          oldRects[songs[dci].id] = it.getBoundingClientRect();
        });

        var song = songs.splice(touchSrc, 1)[0];
        songs.splice(to, 0, song);
        saveCustomPl(); renderCustomPl(); if(document.getElementById('minePlaylists').style.display !== 'none') renderMinePlaylists();

        requestAnimationFrame(function() {
          flipAnim(el, oldRects);
        });
        touchSrc = -1;
    };
}
	

function playCustomPlSong(i) {
  if (activeCustomPlIdx < 0) return;
  var song = customPlaylists[activeCustomPlIdx].songs[i];
  if (song) {
    list.push(song);
    playByIdx(list.length - 1);
    document.getElementById('customPlModal').classList.remove('show');
  }
}

function rmCustomPlSong(i) {
  if (activeCustomPlIdx < 0) return;
  customPlaylists[activeCustomPlIdx].songs.splice(i, 1);
  saveCustomPl();
  renderCustomPl();
  if (document.getElementById('minePlaylists').style.display !== 'none') renderMinePlaylists();
}

// ==================== 音频事件绑定（与原始一致） ====================
(function() {
  var ae = document.getElementById('aPlayer');
  if (!ae) return;

  ae.addEventListener('timeupdate', function() {
    var pct = this.duration ? (this.currentTime / this.duration * 100) : 0;
    document.getElementById('prgF').style.width = pct + '%';
    document.getElementById('fpPrg').style.width = pct + '%';
    document.getElementById('curT').textContent = fmtT(this.currentTime);
    document.getElementById('durT').textContent = fmtT(this.duration);
    document.getElementById('fpDur').textContent = fmtT(this.duration);
    document.getElementById('fpCurT').textContent = fmtT(this.currentTime);
    if (!lyrics.length) return;
    var idx2 = -1;
    for (var j = lyrics.length - 1; j >= 0; j--) { if (lyrics[j].time <= this.currentTime) { idx2 = j; break; } }
    var target = idx2 < 0 ? 0 : idx2;
    var li = document.getElementById('l' + target);
    if (li) {
      if (li.getAttribute('data-active') !== '1') {
        document.querySelectorAll('#lyrUl li').forEach(function(el) { el.classList.remove('active'); el.removeAttribute('data-active'); });
        li.classList.add('active');
        li.setAttribute('data-active', '1');
        li.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  });

  ae.addEventListener('play', function() {
    play = true; upIcn();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(rafWords);
  });

  ae.addEventListener('pause', function() {
    play = false; upIcn();
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  });

  ae.addEventListener('ended', function() {
    play = false; upIcn();
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (idx < list.length - 1) next();
  });
})();


// ==================== 卡片折叠切换 ====================
function toggleCollapse(header) {
  var card = header.closest('.collapsible-card');
  if (!card) return;
  card.classList.toggle('collapsed');
}

// ==================== 顶部状态栏播放图标同步 ====================
(function() {
  var ae = document.getElementById('aPlayer');
  if (!ae) return;
  ae.addEventListener('play', function() {
    var icon = document.getElementById('statusPlayIcon');
    if (icon) icon.innerHTML = '<i class="fas fa-pause"></i>';
  });
  ae.addEventListener('pause', function() {
    var icon = document.getElementById('statusPlayIcon');
    if (icon) icon.innerHTML = '<i class="fas fa-play"></i>';
  });
  // 初始状态
  var icon = document.getElementById('statusPlayIcon');
  if (icon) icon.innerHTML = '<i class="fas fa-play"></i>';
})();
