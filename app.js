(() => {
'use strict';
// V32 player, laid out like the Magnus player (top brand + menu, bottom transport, choice sheet with free input, start / episode / end cards).
const $ = id => document.getElementById(id);
const va = $('va'), vb = $('vb'), idle = $('vidle'); let front = va, back = vb;
const voice = new Audio();
const NAMES = {RIA: 'Rian', MIL: 'Mila', VES: 'Vessa'};
// 字幕跟随系统语言：英文系统只显示英文，中文系统中英双语；?lang=zh|en 或 #zh|#en 可强制
const HL = (new URLSearchParams(location.search).get('lang') || location.hash.slice(1)).toLowerCase();
const EN = HL === 'en' ? true : HL === 'zh' ? false : !/^zh/i.test((navigator.languages && navigator.languages[0]) || navigator.language || '');
const T = (zh, en) => EN ? en : zh;
const store = {get(k){ try { return localStorage.getItem('sea32-' + k); } catch(e){ return null; } }, set(k, v){ try { localStorage.setItem('sea32-' + k, v); } catch(e){} }, del(k){ try { localStorage.removeItem('sea32-' + k); } catch(e){} }};
// 中文系统：默认中英双语，可在菜单切换为仅英文；英文系统：只有英文
let subEn = EN || store.get('sub') === 'en';
function applyLang(){ document.body.classList.toggle('en-only', EN); document.body.classList.toggle('sub-en', subEn); document.documentElement.lang = EN ? 'en' : 'zh-CN';
  $('mSub').hidden = EN; $('mSubV').textContent = subEn ? '仅英文' : '中英双语'; }
$('epName').textContent = T('人鱼王子的假新娘', 'The Sea Prince’s Almost Bride');
$('sayIn').placeholder = T('或者，用你自己的话对他说…', 'Or say it your way…');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = t => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
function mode(m){ document.body.className = document.body.className.replace(/\b(start|choosing|playing|carding|ended)\b/g, '').trim() + ' ' + m; applyLang(); }
mode('start');
// 媒体根地址：页面里有 <meta name="media-base"> 时，视频和图片从该地址加载（Artifact 版用 GitHub Pages 托管的素材）
const BASE = (document.querySelector('meta[name="media-base"]') || {}).content || '';
const media = p => p && !/^(https?:|data:)/.test(p) ? BASE + p : p;
$('stage').style.backgroundImage = `url(${media('assets/cover-v32.jpg')})`;

let data, shots, EPS = [];
let st = {shot: null, ep: 0, answers: {}, path: [], checkpoint: null, doneId: null};
let loadTok = 0, holdUntil = 0, lastKey = '', qteLeft = 0, qteStamp = 0;

// subtitles
const subs = $('subs');
function showSub(c){
  if (!c){ subs.innerHTML = ''; subs.className = ''; return; }
  const her = c.speaker === 'SKY';
  subs.className = her ? 'her' : c.sys ? 'sys' : '';
  const who = her ? T('你', 'You') : NAMES[c.speaker] || '';
  subs.innerHTML = (who ? `<div class="who">${esc(who)}</div>` : '') + (c.zh && !EN ? `<div class="zh">${esc(c.zh)}</div>` : '') + (c.en ? `<div class="en">${esc(c.en)}</div>` : '');
}
// 地点 / 时间字卡（cue.speaker === 'CARD'）显示在画面正中
const card = $('card'); let cardKey = '';
function showCard(c){ const k = c ? c.start + c.en : ''; if (k === cardKey) return; cardKey = k; card.hidden = !c; card.innerHTML = c ? (c.zh && !EN && !subEn ? `<div class="zh">${esc(c.zh)}</div>` : '') + `<div class="en">${esc(c.en)}</div>` : ''; }
function tick(){
  const s = st.shot;
  if (!s || !document.body.classList.contains('playing')){ showCard(null); duck = false; return; }
  const t = front.currentTime - (s.media_in || 0), live = (s.cues || []).filter(q => t >= q.start && t < q.end);
  showCard(live.find(q => q.speaker === 'CARD') || null);
  const c = live.find(q => q.speaker !== 'CARD');
  duck = !!c;
  if (performance.now() < holdUntil) return;
  const key = s.id + '|' + (c ? c.start : '');
  if (key !== lastKey){ lastKey = key; showSub(c); }
}

// 配乐：两个播放器交替，按镜头的 bgm 字段换曲时交叉淡入淡出，只在需要时才加载下一首；记住每首播到的位置。
// 有台词时压低，暂停、切到后台时淡出。
const bgmA = new Audio(), bgmB = new Audio(); let bgmFront = bgmA, bgmCur = null, duck = false; const bgmPos = {};
[bgmA, bgmB].forEach(a => { a.loop = true; a.volume = 0; a.preload = 'auto'; });
const bgmUrl = k => media(`assets/bgm/${k}.mp3`);
let bgmWant = null;
const SILENT = 'data:audio/wav;base64,UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
// 正在播的镜头和下一镜都已下载进内存，才去加载配乐，避免和视频抢带宽
function videoHealthy(){
  const s = st.shot, ids = s ? [s.id, ...nextIds(s)] : [EPS[st.ep] && EPS[st.ep].entry];
  return ids.filter(id => shots && shots[id]).every(id => blobs.has(id) || failed.has(id));
}
function setBgm(k){ if (k) bgmWant = k; }
function switchBgm(k){
  if (!k || k === bgmCur) return;
  if (bgmCur) bgmPos[bgmCur] = bgmFront.currentTime;
  const nxt = bgmFront === bgmA ? bgmB : bgmA, pos = bgmPos[k] || 0;
  nxt.src = bgmUrl(k);
  nxt.addEventListener('loadedmetadata', () => { try { nxt.currentTime = nxt.duration ? pos % nxt.duration : 0; } catch(e){} }, {once: true});
  bgmFront = nxt; bgmCur = k;
}
function unlockBgm(){ [bgmA, bgmB].forEach(a => { if (!a.getAttribute('src')) a.src = SILENT; a.play().then(() => { if (a.getAttribute('src') === SILENT) a.pause(); }).catch(() => {}); }); }  // 在点击里先播一次，手机上之后才能自动播放
function bgmTarget(){
  const b = document.body.classList;
  if (document.hidden) return 0;
  if (b.contains('playing')) return !$('buffering').hidden ? .26 : front.paused ? 0 : duck ? .12 : .3;
  if (b.contains('choosing')) return .2;
  if (b.contains('carding')) return .26;
  if (b.contains('ended')) return .22;
  return 0;
}
setInterval(() => {
  if (bgmWant && bgmWant !== bgmCur && videoHealthy()) switchBgm(bgmWant);
  const tgt = bgmTarget();
  for (const a of [bgmA, bgmB]){
    const want = a === bgmFront ? tgt : 0, d = want - a.volume;
    a.volume = Math.abs(d) > .012 ? Math.max(0, Math.min(1, a.volume + Math.sign(d) * .012)) : want;
    if (want > 0 && a.paused && a.getAttribute('src') && a.getAttribute('src') !== SILENT) a.play().catch(() => {});
    if (want === 0 && a.volume < .01 && !a.paused) a.pause();
  }
}, 50);

// playback
function syncIcon(){ $('playIco').innerHTML = front.paused ? '<path d="M8 5.5v13l10.5-6.5z"/>' : '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>'; if (!front.paused) $('paused').hidden = true; }
function swap(){ const f = front; front = back; back = f; front.classList.add('on'); back.classList.remove('on'); syncIcon(); }
// 预取：把接下来几个镜头（含分支和选择点的等待循环）按顺序整段下载进内存，切镜时直接从内存播放，不再等网络。
// 正在播的镜头若还在走网络、缓冲不足 4 秒，先不预取，带宽全给它。
const blobs = new Map(), loading = new Map(), failed = new Set(); let want = [];
const cancel = k => { const c = loading.get(k); if (c){ c.abort(); loading.delete(k); } };
const bufferedTo = v => v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0;
// 自适应三档：按实测下载速度选择 高清（原生 480p，接近原片，约 2.5Mbps）/ 标准（480p，约 1Mbps）/ 轻量（360p，约 0.3Mbps）
let bw = 0, tier = 'video';  // bw：下载速度 KB/s（滑动平均）；首镜先用标准档，测到速度后再升降
const variant = u => tier === 'video' ? u : u.replace('assets/video/', `assets/${tier}/`);
const urlOf = k => variant(k.endsWith('#idle') ? shots[k.slice(0, -5)].idle_src : shots[k].src);
const srcFor = (id, isIdle) => blobs.get(isIdle ? id + '#idle' : id) || urlOf(isIdle ? id + '#idle' : id);
function lookahead(root){
  const out = [root], seen = new Set([root]); let layer = [root];
  for (let d = 0; d <= 7 && layer.length; d++){
    const nx = [];
    for (const id of layer){
      const s = shots[id]; if (!s) continue;
      if (s.interaction && s.idle_src) out.push(id + '#idle');
      for (const n of nextIds(s)) if (shots[n] && !seen.has(n)){ seen.add(n); out.push(n); nx.push(n); }
    }
    layer = nx;
  }
  return out;
}
function warm(root){
  root = root || (st.shot && st.shot.id); if (!root) return;
  want = lookahead(root);
  const busy = new Set([front, back, idle].map(v => v.getAttribute('src')));
  for (const [k, u] of [...blobs]) if (blobs.size > 30 && !want.includes(k) && !busy.has(u)){ URL.revokeObjectURL(u); blobs.delete(k); }
  pump();
}
function pump(){
  if (!shots) return;
  const s = st.shot;
  if (s && front.dataset.id === s.id && !String(front.getAttribute('src')).startsWith('blob:')){
    const end = bufferedTo(front), full = end >= (front.duration || Infinity) - .3, ahead = end - front.currentTime;
    if (!full && ahead < 2) [...loading.keys()].forEach(cancel);  // 正在播的镜头快断了：停掉所有预取
    if (!full && ahead < 4) return;
  }
  if (loading.size) return;
  const k = want.find(k => !blobs.has(k) && !failed.has(k)); if (!k) return;
  const ctl = new AbortController(); loading.set(k, ctl);
  const t0 = performance.now();
  fetch(urlOf(k), {signal: ctl.signal}).then(r => { if (!r.ok) throw Error(r.status); return r.blob(); })
    .then(b => {
      blobs.set(k, URL.createObjectURL(b));
      const kbs = b.size / 1024 / Math.max(.05, (performance.now() - t0) / 1000);
      if (b.size > 100000) bw = bw ? bw * .6 + kbs * .4 : kbs;
      // 需要的速度留 1.5 倍余量：高清约 320KB/s → 480 以上用高清；标准约 125KB/s → 190 以上用标准；更慢用轻量（带回差，避免来回跳）
      if (bw > (tier === 'video-hd' ? 400 : 480)) tier = 'video-hd';
      else if (bw > (tier === 'video-lite' ? 230 : 190)) tier = 'video';
      else tier = 'video-lite';
    }).catch(e => { if (e.name !== 'AbortError') failed.add(k); })
    .finally(() => { if (loading.get(k) === ctl) loading.delete(k); pump(); });
}
setInterval(pump, 400);
const nextIds = s => { const x = s.interaction; return x ? (x.type === 'qte' ? [x.target, x.miss] : x.options.map(o => o.target)) : [s.next]; };
const epIndex = id => Math.max(0, EPS.findIndex(e => e.id === id));
const epLabel = i => T(`第 ${i + 1} 集 · ${EPS[i].zh}`, `Episode ${i + 1}`);
// 下一镜还没下完：停在当前画面转圈，等它完整下完再播（最多 20 秒），避免在镜头中间一卡一卡
let waitTok = 0;
function playShot(id, opts = {}){
  const tok = ++waitTok, t0 = performance.now();
  const ready = () => blobs.has(id) || failed.has(id) || !(loading.has(id) || want.includes(id)) || performance.now() - t0 > 20000;
  if (ready()) return startShot(id, opts);
  $('buffering').hidden = false;
  (function poll(){ if (tok !== waitTok) return; if (ready()){ $('buffering').hidden = true; startShot(id, opts); } else setTimeout(poll, 150); })();
}
function startShot(id, {offset = 0} = {}){
  const s = shots[id]; if (!s) return showEnd();
  closeChoice(); hideCards(); hideIdle(); $('buffering').hidden = true;
  st.shot = s; st.doneId = null; st.ep = epIndex(s.episode); markReached(st.ep);
  setBgm(s.bgm);
  mode('playing'); lastKey = ''; if (performance.now() >= holdUntil) showSub(null);
  $('epName').textContent = epLabel(st.ep); $('chap').textContent = `EP${st.ep + 1}`;
  if (!front.classList.contains('on') && s.poster) $('stage').style.backgroundImage = `url(${s.poster})`;  // 视频还没出来时先显示本镜首帧
  if (!blobs.has(id)) cancel(id);  // 不在内存里就直接走网络，取消重复的预取
  const tok = ++loadTok, v = back;
  v.loop = false; v.muted = false; v.poster = s.poster || '';
  if (v.dataset.id !== id || v.getAttribute('src') !== srcFor(id)){ v.dataset.id = id; v.src = srcFor(id); }
  const go = () => {
    if (tok !== loadTok) return;
    try { v.currentTime = (s.media_in || 0) + offset; } catch(e){}
    v.defaultPlaybackRate = rate; v.playbackRate = rate;
    v.play().then(() => { if (tok !== loadTok) return; swap(); const old = back; setTimeout(() => { if (old !== front) old.pause(); }, 250); })
      .catch(err => { if (tok !== loadTok || err.name === 'AbortError') return; swap(); $('paused').hidden = false; toast(T('点一下画面继续播放', 'Tap to keep playing')); });
  };
  if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, {once: true});
  $('paused').hidden = true;
  warm(id); save(id);
}
function onEnd(){
  const s = st.shot; if (!s || st.doneId === s.id) return; st.doneId = s.id; front.pause();
  if (s.interaction) return openChoice(s);
  const n = shots[s.next]; if (!n) return showEnd();
  if (n.episode !== s.episode) return epIntro(epIndex(n.episode), st.ep);
  playShot(n.id);
}
[va, vb].forEach(v => {
  v.addEventListener('ended', () => { if (v === front) onEnd(); });
  v.addEventListener('play', () => { if (v === front) syncIcon(); });
  v.addEventListener('waiting', () => { if (v === front && document.body.classList.contains('playing')) $('buffering').hidden = false; });
  v.addEventListener('playing', () => { if (v === front) $('buffering').hidden = true; });
  v.addEventListener('pause', () => { if (v === front && !v.ended) syncIcon(); });
});
function startIdle(s){ if (!s.idle_src) return; idle.src = srcFor(s.id, true); idle.currentTime = 0; idle.play().then(() => { if (st.shot === s && document.body.classList.contains('choosing')) idle.classList.add('on'); }).catch(() => {}); }
function hideIdle(){ idle.classList.remove('on'); idle.pause(); }

// episode card
let epTimer;
function epIntro(i, prev){
  const E = EPS[i]; mode('carding'); hideIdle(); showSub(null); front.pause(); closeChoice();
  st.ep = i; markReached(i); $('epName').textContent = epLabel(i);
  setBgm(shots[E.entry] && shots[E.entry].bgm);
  $('epDone').textContent = prev != null && prev < i ? T(`第 ${prev + 1} 集 · 完`, `End of Episode ${prev + 1}`) : '';
  $('epNum').textContent = `EPISODE ${i + 1}`; $('epT').textContent = EN ? E.en : `第 ${i + 1} 集 · ${E.zh}`; $('epTe').textContent = EN ? '' : E.en;
  $('epCard').hidden = false; warm(E.entry); save(E.entry, true);
  const go = () => { clearTimeout(epTimer); $('epCard').hidden = true; playShot(E.entry); };
  // 自动继续：卡片停 3.5 秒后，等开头 3 镜都下载进内存再开播（最多再等 20 秒）；手动点「继续观看」立即开始
  const first = []; for (let id = E.entry; id && shots[id] && first.length < 3; ){ first.push(id); const s = shots[id]; id = s.interaction ? null : s.next; }
  const t0 = performance.now(), auto = () => {
    const n = first.filter(id => blobs.has(id) || failed.has(id)).length;
    if (n === first.length || performance.now() - t0 > 23500){ $('epBuf').textContent = ''; return go(); }
    $('epBuf').textContent = T(`正在缓冲 ${n}/${first.length}`, `Buffering ${n}/${first.length}`);
    epTimer = setTimeout(auto, 300);
  };
  $('epBuf').textContent = '';
  clearTimeout(epTimer); epTimer = setTimeout(auto, 3500);
  $('epGo').onclick = go;
}

// choices
function openChoice(s){
  const x = s.interaction;
  st.checkpoint = {id: s.id, answers: {...st.answers}, path: st.path.slice()};
  mode('choosing'); startIdle(s);
  const last = (s.cues || []).slice(-1)[0]; showSub(last || null);
  $('cue').innerHTML = `<span class="zh">${esc(x.zh)}</span><span class="en">${esc(x.en)}</span>`;
  const qte = x.type === 'qte';
  const opts = qte ? [{en: (x.label || x).en, zh: (x.label || x).zh, target: x.target, value: 'hit'}] : x.options;
  $('opts').innerHTML = '';
  opts.forEach(o => { const b = document.createElement('button'); b.className = 'opt' + (qte ? ' qte' : ''); b.innerHTML = `<span class="zh">${esc(o.zh)}</span><span class="en">${esc(o.en)}</span>`; b.onclick = () => choose(o); $('opts').append(b); });
  $('say').hidden = qte; $('clock').hidden = !qte; $('sayIn').value = ''; $('sayBtn').disabled = false;
  if (qte){ qteLeft = x.seconds * 1000; qteStamp = performance.now(); }
  busy = true; setTimeout(() => { $('sheet').classList.add('show'); subs.style.bottom = ($('sheet').offsetHeight + 24) + 'px'; }, 150);
  setTimeout(() => busy = false, 500);  // 面板刚出现时不接受点击，防止误触
  warm(s.id); save(s.id);
}
function closeChoice(){ $('sheet').classList.remove('show'); subs.style.bottom = ''; voice.pause(); }
let busy = false;
function choose(o){
  const s = st.shot, x = s && s.interaction; if ((busy && o.value !== 'miss') || !x || !document.body.classList.contains('choosing')) return;
  busy = true; setTimeout(() => busy = false, 700);
  // 改选时，清掉本集之后的旧选择
  const path = episodePath(true), i = path.findIndex(p => p.id === s.id);
  path.slice(i + 1).forEach(p => { if (p.interaction) delete st.answers[p.interaction.key]; });
  st.answers[x.key] = o.value;
  st.path.push(o.value === 'miss' ? {zh: '没来得及靠近', en: 'Didn’t move in time'} : {zh: o.zh, en: o.en});
  const n = shots[o.target];
  if (n && n.episode !== s.episode) return epIntro(epIndex(n.episode), st.ep);
  playShot(o.target);
}

// free input：之后接 realtime 模型时，用 window.SeaPrince.setResponder(fn) 替换本地匹配
const KW = {
  claim: {play: ['配合', '好', '行', '先', '找', '朋友', '米粒', 'ok', 'okay', 'sure', 'fine', 'play', 'along', 'friend', 'mila', 'yes'], challenge: ['反问', '新娘', '凭什么', '什么', '谁', '不', '解释', 'why', 'what', 'bride', 'bluff', 'explain', 'no']},
  terms: {A: ['收', '通行证', '拿', '谢谢', 'take', 'pass', 'thanks', 'keep'], B: ['条件', '先说', '谈', '规则', '要求', 'terms', 'condition', 'first', 'rule', 'deal']},
  glow: {A: ['光', '鳞', '紧张', '害羞', '脸红', '可爱', 'glow', 'nervous', 'blush', 'tease', 'cute', 'shy'], B: ['保密', '没看见', '不说', '秘密', '假装', 'secret', "won't tell", 'pretend', 'nothing']},
  swim: {A: ['手', '牵', '拉', '一起', 'hand', 'hold', 'together'], B: ['自己', '旁边', '身旁', '身边', 'myself', 'beside', 'own', 'alone']},
};
const norm = s => ' ' + s.toLowerCase().replace(/[’']/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ') + ' ';
const hit = (t, k) => /[\u4e00-\u9fff]/.test(k) ? t.includes(k) : t.includes(' ' + k + ' ') || t.includes(' ' + k);
async function localResponder(text, ctx){
  const t = norm(text), kw = KW[ctx.interaction.key] || {};
  const pick = ctx.options.findIndex(o => (kw[o.value] || []).some(k => hit(t, k)));
  return pick >= 0 ? {pick, reply: {zh: '像是这个选择，点一下就这么做。', en: 'Sounds like this one. Tap it.', sys: true}}
    : {pick: null, reply: {zh: '他在等你的回答。点上面的选项，或者换个说法。', en: 'He’s waiting for your answer. Tap an option, or say it another way.', sys: true}};
}
let responder = localResponder;
const ctxNow = () => { const s = st.shot, x = s.interaction; return {shot: s.id, episode: EPS[st.ep].id, lang: EN ? 'en' : 'zh', interaction: x, options: x.options || [], lastLine: (s.cues || []).slice(-1)[0] || null, path: st.path.slice()}; };
$('say').addEventListener('submit', async e => {
  e.preventDefault();
  const raw = $('sayIn').value.trim(), s = st.shot; if (!raw || !s || !s.interaction || s.interaction.type === 'qte') return;
  $('sayIn').value = ''; $('sayBtn').disabled = true;
  showSub(/[\u4e00-\u9fff]/.test(raw) && !EN ? {zh: raw, speaker: 'SKY'} : {en: raw, speaker: 'SKY'});
  const at = s.id; let r = null;
  try { [r] = await Promise.all([responder(raw, ctxNow()), new Promise(ok => setTimeout(ok, 420))]); } catch(err){ console.warn(err); }
  $('sayBtn').disabled = false;
  if (!r || st.shot !== s || st.shot.id !== at || !document.body.classList.contains('choosing')) return;
  if (r.reply){ showSub(r.reply); if (r.reply.audio){ voice.src = r.reply.audio; voice.play().catch(() => {}); } }
  $('opts').querySelectorAll('.opt').forEach((b, i) => b.classList.toggle('hint', i === r.pick));
  if (r.choose != null && s.interaction.options[r.choose]) setTimeout(() => choose(s.interaction.options[r.choose]), 900);
});

// end
let reached = Math.max(0, +store.get('reached') || 0), finished = store.get('finished') === '1';
function showEnd(){
  mode('ended'); hideIdle(); closeChoice(); showSub(null); front.pause();
  if (!finished){ finished = true; store.set('finished', '1'); renderEps(); }
  $('endKicker').textContent = T(`第 ${st.ep + 1} 集 · 完`, `End of Episode ${st.ep + 1}`);
  $('endPath').innerHTML = st.path.map((p, i) => `<li><b>0${i + 1}</b><span>${esc(T(p.zh, p.en))}</span></li>`).join('');
  $('endCard').hidden = false; store.del('save');
}
$('endRestart').onclick = () => startEp(0);
$('endBack').onclick = back2choice;
$('endEps').onclick = () => openMenu(true);
function back2choice(){ const cp = st.checkpoint; if (!cp) return startEp(0); st.answers = {...cp.answers}; st.path = cp.path.slice(); const s = shots[cp.id]; playShot(cp.id, {offset: Math.max(0, s.duration - 1.5)}); }
function startEp(i){
  const keepKeys = new Set(data.shots.filter(s => epIndex(s.episode) < i && s.interaction).map(s => s.interaction.key));
  st.answers = Object.fromEntries(Object.entries(st.answers).filter(([k]) => keepKeys.has(k)));
  st.path = []; st.checkpoint = null; hideCards(); closeMenu(); epIntro(i, null);
}
function hideCards(){ ['startCard', 'epCard', 'endCard'].forEach(x => $(x).hidden = true); clearTimeout(epTimer); }

// save / continue
function save(id, card){ if (!data) return; store.set('save', JSON.stringify({id, card: !!card, answers: st.answers, path: st.path, version: data.version})); }
function resume(){
  let c; try { c = JSON.parse(store.get('save')); } catch(e){}
  if (!c || !shots[c.id]) return startEp(0);
  st.answers = c.answers || {}; st.path = c.path || []; hideCards();
  if (c.card) return epIntro(epIndex(shots[c.id].episode), null);
  playShot(c.id);
}

// start
$('startBtn').onclick = () => { setBgm('open'); unlockBgm(); startEp(0); };
$('resumeBtn').onclick = () => { unlockBgm(); resume(); };

// controls
function togglePause(){ if (!document.body.classList.contains('playing')) return; if (front.paused){ front.play().catch(() => {}); $('paused').hidden = true; } else { front.pause(); $('paused').hidden = false; } }
$('stage').addEventListener('click', e => { if (e.target.closest('button,input,#sheet,#bar,#menu,.card,#top')) return; togglePause(); });
$('playBtn').onclick = togglePause;
$('mSub').onclick = () => { subEn = !subEn; store.set('sub', subEn ? 'en' : 'zh'); applyLang(); lastKey = ''; };
// playback speed
const RATES = [0.75, 1, 1.25, 1.5, 2]; let rate = RATES.includes(+store.get('rate')) ? +store.get('rate') : 1;
const fmtRate = r => (r % 1 ? String(r) : r.toFixed(1)) + 'x';
function applyRate(){ [va, vb].forEach(v => { v.defaultPlaybackRate = rate; v.playbackRate = rate; }); $('speedBtn').textContent = fmtRate(rate); $('speedMenu').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.r === rate)); }
$('speedMenu').innerHTML = RATES.slice().reverse().map(r => `<button data-r="${r}">${fmtRate(r)}</button>`).join('');
function closeSpeed(){ $('speedMenu').hidden = true; $('speedBtn').setAttribute('aria-expanded', 'false'); }
$('speedBtn').onclick = e => { e.stopPropagation(); const m = $('speedMenu'); m.hidden = !m.hidden; $('speedBtn').setAttribute('aria-expanded', String(!m.hidden)); };
$('speedMenu').querySelectorAll('button').forEach(b => b.onclick = e => { e.stopPropagation(); rate = +b.dataset.r; store.set('rate', String(rate)); applyRate(); closeSpeed(); });
applyRate();

// progress：整集进度，点按或拖动跳转；还没做的选择之后不能跳过去
function chosenNext(s, preview){ const x = s.interaction; if (!x) return s.next; const v = st.answers[x.key]; if (v === undefined) return preview ? (x.type === 'qte' ? x.target : x.options[0].target) : null; if (x.type === 'qte') return v === 'miss' ? x.miss : x.target; return (x.options.find(o => o.value === v) || x.options[0]).target; }
function episodePath(preview){ const E = EPS[st.ep]; let id = E.entry; const out = [], seen = new Set(); while (id && shots[id] && !seen.has(id)){ const s = shots[id]; if (s.episode !== E.id) break; seen.add(id); out.push(s); id = chosenNext(s, preview); } return out; }
const track = $('track'); let dragging = false, swallow = false;
function setBar(p){ const pc = Math.max(0, Math.min(100, p * 100)); $('fill').style.width = pc + '%'; $('knob').style.left = pc + '%'; track.setAttribute('aria-valuenow', Math.round(pc)); }
function epClock(){ const s = st.shot; if (!s) return {elapsed: 0, total: 0}; const all = episodePath(true), i = all.findIndex(p => p.id === s.id); if (i < 0) return {elapsed: 0, total: 0}; const total = all.reduce((a, p) => a + p.duration, 0), before = all.slice(0, i).reduce((a, p) => a + p.duration, 0); return {elapsed: before + Math.min(s.duration, Math.max(0, front.currentTime - (s.media_in || 0))), total}; }
function barNow(){ const c = epClock(); return c.total ? c.elapsed / c.total : 0; }
const clockText = x => { const v = Math.max(0, Math.floor(x || 0)); return Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0'); };
function showTime(elapsed, total){ const t = clockText(Math.min(elapsed, total)) + ' / ' + clockText(total); if ($('time').textContent !== t) $('time').textContent = t; }
const fracAt = x => { const r = track.querySelector('i').getBoundingClientRect(); return Math.max(0, Math.min(1, (x - r.left) / r.width)); };
function seekEpisode(f){
  const all = episodePath(true), ok = episodePath(false), total = all.reduce((a, p) => a + p.duration, 0), limit = ok.reduce((a, p) => a + p.duration, 0);
  const want = f * total, blocked = want > limit - .1 && ok.length < all.length; let t = Math.max(0, Math.min(want, blocked ? limit - 1.5 : limit - .15)), acc = 0, sel = ok[0];
  for (const p of ok){ sel = p; if (t < acc + p.duration) break; acc += p.duration; }
  if (blocked) toast(T('先完成这里的选择，再继续向前', 'Make this choice to continue'));
  const off = Math.max(0, t - acc);
  if (sel.id === st.shot.id){ front.currentTime = (sel.media_in || 0) + off; st.doneId = null; lastKey = ''; if (front.paused && $('paused').hidden) front.play().catch(() => {}); }
  else playShot(sel.id, {offset: off});
}
track.addEventListener('pointerdown', e => { if (!st.shot) return; dragging = true; track.classList.add('drag'); track.setPointerCapture(e.pointerId); setBar(fracAt(e.clientX)); e.preventDefault(); });
track.addEventListener('pointermove', e => { if (dragging){ const f = fracAt(e.clientX), c = epClock(); setBar(f); showTime(f * c.total, c.total); } });
track.addEventListener('pointerup', e => { if (!dragging) return; dragging = false; track.classList.remove('drag'); seekEpisode(fracAt(e.clientX)); });
track.addEventListener('pointercancel', () => { dragging = false; track.classList.remove('drag'); });
track.addEventListener('keydown', e => { if (!st.shot || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return; e.preventDefault(); seekEpisode(barNow() + (e.key === 'ArrowRight' ? .04 : -.04)); });
(function loop(now){
  const s = st.shot, playing = document.body.classList.contains('playing');
  if (playing && s && !front.paused && front.currentTime >= (s.media_out || front.duration || 1e9) - .04) onEnd();
  if (playing && !dragging){ const c = epClock(); setBar(c.total ? c.elapsed / c.total : 0); showTime(c.elapsed, c.total); }
  if (document.body.classList.contains('choosing') && s && s.interaction && s.interaction.type === 'qte' && !document.hidden && $('menu').hidden){
    qteLeft = Math.max(0, qteLeft - Math.min(now - qteStamp, 100)); $('clock').firstChild.style.width = (qteLeft / (s.interaction.seconds * 1000) * 100) + '%';
    if (qteLeft === 0) choose({target: s.interaction.miss, value: 'miss'});
  }
  qteStamp = now; tick(); requestAnimationFrame(loop);
})(performance.now());

// menu：看过的集可回看；看完全部剧情后全部解锁、可任意切换
const LOCK = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const epLen = i => { const E = EPS[i]; let id = E.entry, t = 0; const seen = new Set(); while (id && shots[id] && shots[id].episode === E.id && !seen.has(id)){ seen.add(id); const s = shots[id]; t += s.duration; id = s.interaction ? (s.interaction.type === 'qte' ? s.interaction.target : s.interaction.options[0].target) : s.next; } return t; };
function renderEps(){
  if (!data) return;
  $('epHint').textContent = T('看完全部剧情后，可任意切换集数', 'Finish the story to unlock every episode'); $('epHint').hidden = finished;
  $('epList').innerHTML = EPS.map((e, i) => { const open = finished || i <= reached; return `<button class="ep${open ? '' : ' locked'}${i === st.ep && !document.body.classList.contains('start') ? ' on' : ''}" data-ep="${i}" ${open ? '' : 'disabled aria-disabled="true"'}><span><b>EP${i + 1}</b>${esc(T(e.zh, e.en))}</span><small>${open ? fmt(epLen(i)) : LOCK}</small></button>`; }).join('');
  $('epList').querySelectorAll('.ep:not(.locked)').forEach(b => b.onclick = () => { front.pause(); startEp(+b.dataset.ep); });
}
function markReached(i){ if (i > reached){ reached = i; store.set('reached', String(i)); renderEps(); } }
function closeMenu(){ $('menu').hidden = true; $('menuBtn').setAttribute('aria-expanded', 'false'); }
function openMenu(force){ const m = $('menu'); if (!m.hidden && !force) return closeMenu(); renderEps(); m.hidden = false; $('menuBtn').setAttribute('aria-expanded', 'true'); }
$('menuBtn').onclick = () => openMenu();
document.addEventListener('pointerdown', e => { swallow = false; if (!$('speedMenu').hidden && !e.target.closest('#speedWrap')){ closeSpeed(); swallow = true; } if ($('menu').hidden || e.target.closest('#menu,#menuBtn,#endEps')) return; closeMenu(); swallow = true; }, true);
document.addEventListener('click', e => { if (swallow && !e.target.closest('#menu,#menuBtn,#speedWrap')){ e.stopPropagation(); e.preventDefault(); } swallow = false; }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape'){ closeSpeed(); closeMenu(); } });
$('mBack').onclick = () => { closeMenu(); hideCards(); back2choice(); };
$('mRestart').onclick = () => startEp(0);
function toast(t){ const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 1800); }
document.addEventListener('visibilitychange', () => { if (document.hidden && document.body.classList.contains('playing') && !front.paused){ front.pause(); $('paused').hidden = false; } });

applyLang();
fetch('data.json').then(r => { if (!r.ok) throw Error('data'); return r.json(); }).then(d => {
  d.shots.forEach(s => { s.src = media(s.src); s.poster = media(s.poster); s.idle_src = media(s.idle_src); });
  data = d; shots = Object.fromEntries(d.shots.map(s => [s.id, s])); EPS = d.episodes;
  const moments = d.shots.filter(s => s.interaction).length;
  const mins = Math.round(EPS.reduce((a, e, i) => a + epLen(i), 0) / 60);
  $('meta').innerHTML = [T(`${EPS.length} 集`, `${EPS.length} episodes`), T(`${moments} 次互动`, `${moments} choices`), T(`约 ${mins} 分钟`, `≈${mins} min`), T('请打开声音', 'Sound on')].map(x => `<span>${x}</span>`).join('');
  $('startBtn').disabled = false; renderEps();
  try { const c = JSON.parse(store.get('save')); $('resumeBtn').hidden = !(c && shots[c.id] && c.version === d.version); } catch(e){}
}).catch(() => toast(T('剧集数据加载失败，请刷新', 'Could not load the story. Please refresh.')));

window.SeaPrince = {
  // fn(text, ctx) => Promise<{reply?:{en,zh,speaker?,audio?,sys?}, pick?:index, choose?:index}>
  setResponder(fn){ responder = typeof fn === 'function' ? fn : localResponder; },
  state: () => ({shot: st.shot && st.shot.id, episode: EPS[st.ep] && EPS[st.ep].id, mode: (document.body.className.match(/\b(start|choosing|playing|carding|ended)\b/) || [])[1], answers: {...st.answers}, path: st.path.slice(), rate, subEn, bandwidthKBs: Math.round(bw), tier, bgm: bgmCur, bgmVolume: +bgmFront.volume.toFixed(2), bgmPlaying: !bgmFront.paused}),
};
})();
