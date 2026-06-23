function chkAPI() {
  // 使用统一封装的 fAPI，自带超时和异常拦截，彻底杜绝卡死
  fAPI('/personalized?limit=1')
    .then(function(d) {
      document.getElementById('apiS').innerHTML = (d && d.code === 200)
        ? '<span class="sdot on"></span>已连接'
        : '<span class="sdot off"></span>异常';
    })
    .catch(function(e) {
      document.getElementById('apiS').innerHTML = '<span class="sdot off"></span>' + (e.message === '超时' ? '连接超时' : '未连接');
    });
}

function fetchSug() {
  var q = document.getElementById("sIpt").value.trim();
  var drop = document.getElementById("sDrop");
  if (q.length < 2) { drop.classList.remove("show"); return; }
  fAPI("/search/suggest?keywords=" + encodeURIComponent(q)).then(function(d) {
    if (d.code === 200 && d.result) {
      var items = [];
      if (d.result.songs) d.result.songs.slice(0, 6).forEach(function(s) { items.push(s.name); });
      if (d.result.artists) d.result.artists.slice(0, 3).forEach(function(a) { items.push(a.name); });
      if (d.result.albums) d.result.albums.slice(0, 3).forEach(function(a) { items.push(a.name); });
      if (items.length > 0) {
        drop.innerHTML = items.map(function(nm) {
          return "<div class=\"si\" onclick=\"fillSug('" + escA(nm) + "')\">" + escH(nm) + "</div>";
        }).join("");
        drop.classList.add("show");
      } else { drop.classList.remove("show"); }
    } else { drop.classList.remove("show"); }
  }).catch(function() { document.getElementById("sDrop").classList.remove("show"); });
}

var sugDelayTimer = null;
function sugDelay() {
  if (sugDelayTimer) clearTimeout(sugDelayTimer);
  sugDelayTimer = setTimeout(fetchSug, 300);
}

function fillSug(q) {
  document.getElementById("sIpt").value = q;
  document.getElementById("sDrop").classList.remove("show");
  sBtn();
}

function hideSug() { document.getElementById("sDrop").classList.remove("show"); }

function loadBili() {
  var grid = document.getElementById("biGrid");
  fetch(BAPI + "/hot").then(function(r) { return r.json(); }).then(function(d) {
    if (d.code === 0 && d.data && d.data.list) {
      grid.innerHTML = d.data.list.map(function(v) {
        var pic = v.pic || "";
        var title = v.title || "";
        var uname = v.owner ? v.owner.name : "";
        var play = v.stat ? (v.stat.view || 0) : 0;
        return "<div class=\"sc\" onclick=\"window.open('https://www.bilibili.com/video/' + v.bvid)\"><img src=\"" + pic + "@200w_200h.webp\" alt=\"\" loading=\"lazy\" /><div class=\"sn\">" + escH(title) + "</div><div class=\"sa\">" + escH(uname) + " · " + fmtPlay(play) + "</div></div>";
      }).join("");
    } else { grid.innerHTML = "<div style=\"padding:16px;color:var(--text-secondary)\">加载失败</div>"; }
  }).catch(function() { grid.innerHTML = "<div style=\"padding:16px;color:var(--text-secondary)\">API 连接失败</div>"; });
}

function fmtPlay(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return n;
}

function biSearch() {
  var q = document.getElementById("biIpt").value.trim();
  if (!q) return;
  document.getElementById("biRecSec").style.display = "none";
  document.getElementById("biRes").style.display = "block";
  document.getElementById("biResGrid").innerHTML = "<div class=\"spin\" style=\"margin:16px\"></div>";
  fetch(BAPI + "/search?keyword=" + encodeURIComponent(q) + "&p=1").then(function(r) { return r.json(); }).then(function(d) {
    if (d.code === 0 && d.data && d.data.result) {
      var videos = null;
      for (var i = 0; i < d.data.result.length; i++) {
        if (d.data.result[i].result_type === "video") {
          videos = d.data.result[i].data;
          break;
        }
      }
      if (videos && videos.length > 0) {
        document.getElementById("biCnt").textContent = "共 " + videos.length + " 个视频";
        document.getElementById("biResGrid").innerHTML = videos.map(function(v) {
          var pic = v.pic || "";
          var title = v.title || "";
          var uname = v.author || "";
          var play = v.play || 0;
          return "<div class=\"sc\" onclick=\"window.open('https://www.bilibili.com/video/' + v.bvid)\"><img src=\"" + pic + "@200w_200h.webp\" alt=\"\" loading=\"lazy\" /><div class=\"sn\">" + escH(title) + "</div><div class=\"sa\">" + escH(uname) + " · " + fmtPlay(play) + "</div></div>";
        }).join("");
      } else { document.getElementById("biResGrid").innerHTML = "<div style=\"padding:16px;color:var(--text-secondary)\">未找到视频</div>"; }
    } else { document.getElementById("biResGrid").innerHTML = "<div style=\"padding:16px;color:var(--text-secondary)\">搜索失败</div>"; }
  }).catch(function() { document.getElementById("biResGrid").innerHTML = "<div style=\"padding:16px;color:var(--text-secondary)\">搜索失败</div>"; });
}

function loadRec() {
  var rg = document.getElementById('recGrid'), pr = document.getElementById('plRow');
  
  fAPI('/personalized?limit=8').then(function(d) {
    if (d.code === 200 && d.result) {
      pr.innerHTML = d.result.map(function(p) {
        return '<div class="plc" onclick="ldPL(\'' + p.id + '\')"><img src="' + p.picUrl + '?param=200y200" alt="" loading=\"lazy\" /><div class="pn">' + escH(p.name) + '</div></div>';
      }).join('');
    } else {
      pr.innerHTML = '<div style="padding:16px;color:var(--text-secondary)">无法加载推荐歌单</div>';
    }
  }).catch(function() { 
    pr.innerHTML = '<div style="padding:16px;color:var(--text-secondary)">API 连接失败</div>'; 
  });
  
  fAPI('/recommend/songs').then(function(d) {
    if (d.code === 200 && d.data && d.data.dailySongs) {
      rSong(d.data.dailySongs.slice(0,20),'recGrid');
    } else {
      // 降级请求兜底推荐
      fAPI('/top/song?type=0&limit=20').then(function(t) { 
        if(t.code === 200 && t.data) rSong(t.data,'recGrid'); 
        else rg.innerHTML = '<div style="padding:16px;color:var(--text-secondary)">无推荐数据</div>';
      }).catch(function() { 
        rg.innerHTML = '<div style="padding:16px;color:var(--text-secondary)">API 连接失败</div>'; 
      });
    }
  }).catch(function() { 
    rg.innerHTML = '<div style="padding:16px;color:var(--text-secondary)">API 连接失败</div>'; 
  });
}

function sBtn() {
  var q = document.getElementById('sIpt').value.trim();
  if (!q) return;
  document.getElementById('recSec').style.display = 'none';
  document.getElementById('sRes').style.display = 'block';
  document.getElementById('resGrid').innerHTML = '<div class="spin" style="margin:16px"></div>';
  fAPI('/search?keywords=' + encodeURIComponent(q) + '&limit=30').then(function(d) {
    if (d.code === 200 && d.result && d.result.songs) {
      var s = d.result.songs;
      document.getElementById('resCnt').textContent = '共 ' + s.length + ' 首';
      var ids = s.map(function(x) { return x.id; }).join(',');
      fAPI('/song/detail?ids=' + ids).then(function(dd) {
        if (dd.code === 200 && dd.songs) {
          rSong(dd.songs, 'resGrid');
        } else {
          rSong(s, 'resGrid');
        }
      }).catch(function() {
        rSong(s, 'resGrid');
      });
    } else { document.getElementById('resGrid').innerHTML = '<div style="padding:16px;color:var(--text-secondary)">未找到结果</div>'; }
  }).catch(function() { document.getElementById('resGrid').innerHTML = '<div style="padding:16px;color:var(--text-secondary)">搜索失败</div>'; });
}

function ldPL(id) {
  document.getElementById('recSec').style.display = 'none';
  document.getElementById('sRes').style.display = 'block';
  document.getElementById('resCnt').textContent = '加载中...';
  document.getElementById('resGrid').innerHTML = '<div class="spin" style="margin:16px"></div>';
  fAPI('/playlist/detail?id=' + id).then(function(d) {
    if (d.code === 200 && d.playlist && d.playlist.tracks) {
      var s = d.playlist.tracks.slice(0, 30);
      document.getElementById('resCnt').textContent = '歌单 \u00b7 ' + s.length + ' 首';
      rSong(s, 'resGrid');
    }
  }).catch(function() { document.getElementById('resGrid').innerHTML = '<div style="padding:16px;color:var(--text-secondary)">加载失败</div>'; });
}

function rSong(songs, cid) {
  document.getElementById(cid).innerHTML = songs.map(function(s) {
    var sid = s.id || '', nm = s.name || '未知';
    var ar = (s.ar&&s.ar[0]) ? (s.ar[0].name||'未知') : (s.artists&&s.artists[0]) ? (s.artists[0].name||'未知') : '未知';
    var pc = (s.al&&s.al.picUrl) ? s.al.picUrl : '';
    if (!pc && s.album) pc = s.album.picUrl || (s.album.artist && s.album.artist.img1v1Url) || '';
    if (!pc) pc = (s.artists&&s.artists[0]&&s.artists[0].img1v1Url) ? s.artists[0].img1v1Url : '';
    
    // 调用 ui.js 中定义的全局渲染函数
    return buildSongCardHtml({id: sid, nm: nm, ar: ar, pc: pc});
  }).join('');
}
