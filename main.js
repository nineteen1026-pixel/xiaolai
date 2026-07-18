const { app, BrowserWindow, screen, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { buildContext, parseWeather } = require('./context');

let win, tray;
let petsData = { current: 'psyduck', pets: {} };

// 读取角色数据
function loadPets() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'pets.json'), 'utf-8');
    petsData = JSON.parse(raw);
  } catch (e) {
    console.error('读取pets.json失败:', e);
  }
}

// 当前角色的图片转base64(注入页面)
function imgToBase64(filePath) {
  try {
    const buf = fs.readFileSync(path.join(__dirname, filePath));
    const ext = path.extname(filePath).slice(1);
    return `data:image/${ext};base64,${buf.toString('base64')}`;
  } catch (e) { return ''; }
}

// 组装角色帧动画(待机/跑步等),转成 base64 注入页面
function buildPetAnims(pet) {
  if (!pet.anims) return null;
  const anims = {};
  if (pet.anims.idle) anims.idle = imgToBase64(pet.anims.idle);
  // 优先注入整条跑步精灵图(一张),避免多帧 base64 过大导致切帧失败
  if (pet.anims.runStrip) anims.runStrip = imgToBase64(pet.anims.runStrip);
  if (pet.anims.runFrameCount) anims.runFrameCount = pet.anims.runFrameCount;
  if (Array.isArray(pet.anims.run)) {
    anims.run = pet.anims.run.map((p) => imgToBase64(p)).filter(Boolean);
    if (!anims.runFrameCount) anims.runFrameCount = anims.run.length;
  }
  if (anims.runStrip && !anims.runFrameCount) anims.runFrameCount = 8;
  return anims;
}

// 切换角色:注入图片+台词+移动风格+帧动画到页面
function switchPet(name) {
  const pet = petsData.pets[name];
  if (!pet) return;
  petsData.current = name;
  const imgB64 = imgToBase64(pet.img);
  const linesJson = JSON.stringify(pet.lines).replace(/'/g, "\\'");
  const moveStyle = pet.moveStyle || 'walk';
  const anims = buildPetAnims(pet);
  if (win && !win.isDestroyed()) {
    win.webContents.executeJavaScript(`
      if (window.__switchPet) {
        window.__switchPet(${JSON.stringify(name)}, ${JSON.stringify(pet.name)}, ${JSON.stringify(imgB64)}, ${JSON.stringify(pet.emoji)}, '${linesJson}', ${JSON.stringify(moveStyle)}, ${JSON.stringify(anims)});
      }
    `).catch(() => {});
  }
  updateTray();
}

// 情境台词每周更新:缓存到本地,本周内复用,无网络用旧缓存
const CONTEXT_CACHE = path.join(app.getPath('userData'), 'context-cache.json');

function getWeekKey() {
  // 返回 "YYYY-WW"(ISO周数),用于判断是否本周
  const d = new Date();
  const thurs = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + 3 - ((d.getDay() + 6) % 7)));
  const year = thurs.getFullYear();
  const week = 1 + Math.round(((thurs - new Date(Date.UTC(year, 0, 4))) / 86400000 - 3 + ((new Date(Date.UTC(year, 0, 4)).getDay() + 6) % 7)) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function applyContext(pool) {
  if (win && !win.isDestroyed()) {
    win.webContents.executeJavaScript(
      `window.__contextLines = ${JSON.stringify(pool)};`
    ).catch(() => {});
  }
}

function loadContext() {
  // 1. 读缓存,如果是本周 → 直接用(不请求网络)
  let cached = null;
  try {
    cached = JSON.parse(fs.readFileSync(CONTEXT_CACHE, 'utf-8'));
  } catch {}
  const thisWeek = getWeekKey();
  if (cached && cached.week === thisWeek && Array.isArray(cached.pool) && cached.pool.length) {
    applyContext(cached.pool);
    return; // 本周已更新过,不重复请求
  }
  // 2. 本周未更新 → 请求网络更新(天气+日期)
  fetchWeatherAndUpdate(cached);
}

// 网络热梗每月更新:从GitHub仓库的trending.json拉取,缓存30天,无网络用缓存或内置
const TRENDING_CACHE = path.join(app.getPath('userData'), 'trending-cache.json');
const TRENDING_URL = 'https://raw.githubusercontent.com/cs950809/desktop-pet/main/trending.json';

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function applyTrending(lines) {
  if (win && !win.isDestroyed()) {
    win.webContents.executeJavaScript(
      `window.__trendingLines = ${JSON.stringify(lines)};`
    ).catch(() => {});
  }
}

function loadTrending() {
  // 1. 本月已缓存 → 直接用
  let cached = null;
  try {
    cached = JSON.parse(fs.readFileSync(TRENDING_CACHE, 'utf-8'));
  } catch {}
  const thisMonth = getMonthKey();
  if (cached && cached.month === thisMonth && Array.isArray(cached.lines) && cached.lines.length) {
    applyTrending(cached.lines);
    return;
  }
  // 2. 本月未更新 → 拉取GitHub上的最新热梗
  const req = https.get(TRENDING_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      try {
        const d = JSON.parse(body);
        const lines = Array.isArray(d.lines) ? d.lines : [];
        if (lines.length) {
          applyTrending(lines);
          try { fs.writeFileSync(TRENDING_CACHE, JSON.stringify({ month: thisMonth, lines })); } catch {}
        } else { onTrendingFail(cached); }
      } catch { onTrendingFail(cached); }
    });
  });
  req.on('error', () => onTrendingFail(cached));
  req.setTimeout(8000, () => { req.destroy(); onTrendingFail(cached); });
}

function onTrendingFail(cached) {
  // 无网络/失败:用旧缓存(若有),否则不注入(页面用context.js内置热梗兜底)
  if (cached && Array.isArray(cached.lines) && cached.lines.length) {
    applyTrending(cached.lines);
  }
  // 没缓存也不报错,decide会用__contextLines(含内置热梗)
}

function fetchWeatherAndUpdate(fallbackCache) {
  const req = https.get('https://wttr.in/?format=j1', { headers: { 'User-Agent': 'curl/7.0' } }, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      try {
        const d = JSON.parse(body);
        const cur = d.current_condition[0];
        const desc = cur.weatherDesc[0].value;
        const tempC = parseInt(cur.temp_C);
        saveAndApply(desc, tempC);
      } catch {
        // 天气解析失败:用纯日期情境,但仍缓存
        saveAndApply('', null);
      }
    });
  });
  req.on('error', () => onNoNetwork(fallbackCache));
  req.setTimeout(8000, () => { req.destroy(); onNoNetwork(fallbackCache); });
}

function onNoNetwork(fallbackCache) {
  // 无网络:用旧缓存(若有),否则用纯日期兜底
  if (fallbackCache && Array.isArray(fallbackCache.pool) && fallbackCache.pool.length) {
    applyContext(fallbackCache.pool);
  } else {
    applyContext(buildContext('', null));
  }
}

function saveAndApply(desc, tempC) {
  const pool = buildContext(desc, tempC);
  applyContext(pool);
  try {
    fs.writeFileSync(CONTEXT_CACHE, JSON.stringify({ week: getWeekKey(), pool }));
  } catch {}
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().size;
  win = new BrowserWindow({
    width, height, x: 0, y: 0,
    title: 'desktop-pet',
    frame: false, transparent: true, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false,
    icon: path.join(__dirname, 'pokeball.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'duck_offline.html'));

  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      document.documentElement.style.background='transparent';
      document.body.style.background='transparent';
      const duck=document.getElementById('pet');
      if(duck){
        duck.style.left=(window.innerWidth-180)+'px';
        duck.style.top=(window.innerHeight-180)+'px';
      }
      window.__noAct=1;
      if(typeof window.decide==='function'){
        var _od=window.decide;
        window.decide=function(){ if(window.__noAct) return; return _od&&_od(); };
      }
      let curIgnore=true;
      document.addEventListener('mousemove',(e)=>{
        const el=document.elementFromPoint(e.clientX,e.clientY);
        const onDuck=!!(el && el.closest && el.closest('#pet'));
        if(onDuck && curIgnore){ curIgnore=false; window.petAPI.setIgnoreMouse(false); }
        else if(!onDuck && !curIgnore){ curIgnore=true; window.petAPI.setIgnoreMouse(true); }
      },true);
    `).catch(()=>{});
    // 注入角色切换函数(含moveStyle差异化移动)
    win.webContents.executeJavaScript(`
      window.__moveStyle = 'walk';
      window.__petAnims = null;
      window.__switchPet = function(name, displayName, imgB64, emoji, linesJson, moveStyle, anims) {
        window.__petName = displayName;
        window.__petEmoji = emoji;
        window.__moveStyle = moveStyle || 'walk';
        window.__petAnims = anims || null;
        try {
          window.__petLines = JSON.parse(linesJson);
          window.LINES = window.__petLines;
        } catch(e){}
        var img = document.getElementById('duckImg');
        if (img) { img.src = (anims && anims.idle) ? anims.idle : imgB64; }
        var hint = document.getElementById('hint');
        if (hint) { hint.textContent = emoji + ' ' + displayName + ' 上桌啦!'; }
        // 覆盖decide:根据moveStyle调整动作权重(不同角色移动方式不同)
        if (typeof window.__origDecide === 'undefined' && typeof window.decide === 'function') {
          window.__origDecide = window.decide;
        }
        window.decide = function(){
          if (window.__noAct) return;
          if (window.__petActLock) return;
          var s = window.__moveStyle;
          var idleSec = (Date.now() - (window.__lastInteract||Date.now())) / 1000;
          // 各风格的动作倾向
          var r = Math.random();
          var doWalk = 0, doJump = 0, doSleep = 0, doAct = 0;
          if (s === 'jumpy')      { doWalk=0.25; doJump=0.55; doAct=0.1; }   // 皮卡丘:爱跳
          else if (s === 'hyper') { doWalk=0.65; doJump=0.2; doAct=0.1; }    // 伊布:爱跑
          else if (s === 'lazy')  { doWalk=0.08; doJump=0.02; doSleep=0.55; doAct=0.1; } // 卡比兽/妙蛙:懒
          else if (s === 'float') { doWalk=0.1;  doJump=0.05; doAct=0.35; }   // 瓦斯/胖丁:漂浮少走
          else if (s === 'wobble'){ doWalk=0.15; doJump=0.1; doAct=0.45; }    // 可达鸭:晃动
          else if (s === 'human') { doWalk=0.7;  doJump=0;   doAct=0.2; }    // 码仔:拟人走路,不弹跳
          else                    { doWalk=0.4;  doJump=0.15; doAct=0.2; }    // walk:正常散步
          if (idleSec > 16 && doSleep > 0 && r < doSleep) {
            window.__petActLock = true;
            if (typeof window.startSleep === 'function') {
              window.startSleep();
              window.__lastInteract = Date.now();
              setTimeout(function(){ window.__petActLock = false; }, 600);
            }
            return;
          }
          if (idleSec > 1.5) {
            window.__petActLock = true;
            var back = function(){ window.__petActLock = false; window.__lastInteract = Date.now(); if(typeof window.startIdle==='function') window.startIdle(); };
            if (r < doWalk) {
              var tx = 14 + Math.random() * (window.innerWidth - 180);
              var ty = 14 + Math.random() * (window.innerHeight - 180);
              if (typeof window.walkTo === 'function') window.walkTo(tx, ty, back);
            } else if (r < doWalk + doJump) {
              if (typeof window.doJump === 'function') window.doJump(back);
            } else if (r < doWalk + doJump + doAct) {
              // 随机说话:60%概率用情境台词(天气/节气/诗词/热梗),40%用角色台词
              if (Math.random() < 0.6) {
                // 合并情境台词 + 网络热梗(若有)
                var pool = [];
                if (window.__contextLines) pool = pool.concat(window.__contextLines);
                if (window.__trendingLines) pool = pool.concat(window.__trendingLines);
                if (pool.length && window.say) window.say(pool[Math.floor(Math.random()*pool.length)]);
                else if (window.LINES) { var cats=['happy','bored','curious','greet','excited']; var c=cats[Math.floor(Math.random()*cats.length)]; if(window.LINES[c]&&window.say) window.say(window.LINES[c][Math.floor(Math.random()*window.LINES[c].length)]); }
              } else if (window.LINES) {
                var cats = ['happy','bored','curious','greet','excited','sing','hungry'];
                var c = cats[Math.floor(Math.random()*cats.length)];
                if (window.LINES[c] && window.say) window.say(window.LINES[c][Math.floor(Math.random()*window.LINES[c].length)]);
              }
              setTimeout(back, 1500);
            } else {
              setTimeout(back, 100);
            }
          }
        };
        // 触发一句招呼
        if (window.__petLines && window.__petLines.greet && window.say) {
          setTimeout(function(){
            var g = window.__petLines.greet;
            window.say(g[Math.floor(Math.random()*g.length)]);
          }, 800);
        }
      };
    `).catch(()=>{});
    // 加载初始角色
    setTimeout(() => switchPet(petsData.current || 'psyduck'), 300);
    // 获取天气,注入情境台词池(异步,失败有兜底)
    setTimeout(() => loadContext(), 1500);
    // 获取网络热梗(每月更新,无网络用缓存/内置兜底)
    setTimeout(() => loadTrending(), 2000);
  });

  ipcMain.on('set-ignore-mouse', (event, ignore) => {
    if (!win.isDestroyed()) win.setIgnoreMouseEvents(ignore, { forward: true });
  });

  win.on('closed', () => { win = null; });
}

function updateTray() {
  if (!tray) return;
  const petNames = Object.keys(petsData.pets);
  const petMenu = petNames.map(name => {
    const p = petsData.pets[name];
    const item = {
      label: (name === petsData.current ? '✓ ' : '') + p.emoji + ' ' + p.name,
      type: 'normal',
      click: () => switchPet(name),
    };
    // Windows: 加角色小图标(macOS菜单加图标会渲染失败,用emoji代替)
    if (process.platform !== 'darwin') {
      try {
        const icon = nativeImage.createFromPath(path.join(__dirname, p.img));
        if (!icon.isEmpty()) { item.icon = icon.resize({ width: 16, height: 16 }); }
      } catch {}
    }
    return item;
  });
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '角色切换', enabled: false },
    ...petMenu,
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]));
  const cur = petsData.pets[petsData.current];
  tray.setToolTip(cur ? `${cur.name} 桌面宠物` : '桌面宠物');
}

function createTray() {
  let img;
  if (process.platform === 'darwin') {
    // macOS:菜单栏必须用模板图(单色黑+透明),否则图标不显示
    try {
      img = nativeImage.createFromPath(path.join(__dirname, 'pokeballTemplate.png'));
      img.setTemplateImage(true);
    } catch {}
  } else {
    // Windows:彩色精灵球
    try { img = nativeImage.createFromPath(path.join(__dirname, 'pokeball.png')); } catch {}
    if (img && !img.isEmpty()) img = img.resize({ width: 16, height: 16 });
  }
  if (!img || img.isEmpty()) img = nativeImage.createEmpty();
  tray = new Tray(img);
  updateTray();
}

app.whenReady().then(() => {
  app.setName('desktop-pet');
  loadPets();
  createWindow();
  createTray();
});
app.on('window-all-closed', () => app.quit());
