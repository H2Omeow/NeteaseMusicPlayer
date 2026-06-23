const express = require('express');
const serveIndex = require('serve-index');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 4096; // 网页访问端口，可自行修改

// 1. 提供前端 HTML/CSS/JS 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 2. 智能兼容壁纸路径：优先使用你 Linux 系统根目录下的绝对路径 /data/wallpaper
let wallpaperPath = '/data/wallpaper';
if (!fs.existsSync(wallpaperPath)) {
    // 兼容本地测试环境
    wallpaperPath = path.join(__dirname, 'data/wallpaper');
}

console.log(`[壁纸模块] 正在从物理路径加载壁纸: ${wallpaperPath}`);

// 3. 完美映射并启用目录浏览
app.use('/data/wallpaper', 
    express.static(wallpaperPath), 
    serveIndex(wallpaperPath, { 'icons': true, 'view': 'details' })
);

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`超级播放器已成功启动！`);
    console.log(`请在浏览器访问: http://localhost:${PORT}`);
    console.log(`=================================`);
});
