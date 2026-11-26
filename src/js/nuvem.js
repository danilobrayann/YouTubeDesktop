// ===== Módulo: Nuvem Telegram (estilo Drive) =====
// Depende de globais do renderer.js: api, formatBytes, tdPrompt, webUtils, downloads

// Telegram configuration
async function saveTelegramConfig() {
  const result = await api.saveTelegramConfig({
    enabled: setTelegramEnabled.checked,
    botToken: setTelegramBotToken.value.trim(),
    autoUpload: setTelegramAutoUpload.checked,
    deleteAfterUpload: setTelegramDeleteAfterUpload.checked
  });
  if (result && result.botUsername) {
    // Nome do bot obtido automaticamente — inicia conexão
    telegramConnectionStatus.textContent = `Bot: @${result.botUsername}`;
  }
}
if (setTelegramEnabled) setTelegramEnabled.addEventListener('change', saveTelegramConfig);
if (setTelegramBotToken) setTelegramBotToken.addEventListener('change', saveTelegramConfig);
if (setTelegramAutoUpload) setTelegramAutoUpload.addEventListener('change', saveTelegramConfig);
if (setTelegramDeleteAfterUpload) setTelegramDeleteAfterUpload.addEventListener('change', saveTelegramConfig);

// Login via Telegram (/start) — automático ao clicar no botão
if (btnTelegramLogin) {
  btnTelegramLogin.addEventListener('click', async () => {
    if (!setTelegramBotToken.value.trim()) {
      alert('Cole o token do bot primeiro.');
      return;
    }
    // Habilita automaticamente ao conectar
    setTelegramEnabled.checked = true;
    await saveTelegramConfig();
    btnTelegramLogin.disabled = true;
    btnTelegramLogin.textContent = 'Aguardando /start...';
    btnTelegramCancel.classList.remove('hidden');
    telegramConnectionStatus.textContent = 'Aguardando conexão...';
    telegramConnectionStatus.classList.remove('logged-in', 'logged-out');

    const result = await api.startTelegramWait();
    if (!result.success) {
      btnTelegramLogin.disabled = false;
      btnTelegramLogin.textContent = 'Conectar com Telegram';
      btnTelegramCancel.classList.add('hidden');
      alert(result.message);
      return;
    }
  });
}

if (btnTelegramCancel) {
  btnTelegramCancel.addEventListener('click', async () => {
    await api.cancelTelegramWait();
    btnTelegramLogin.disabled = false;
    btnTelegramLogin.textContent = 'Conectar com Telegram';
    btnTelegramCancel.classList.add('hidden');
    telegramConnectionStatus.textContent = 'Cancelado';
  });
}

// Listeners para sucesso/timeout do login
ipcRenderer.on('telegram-login-success', (event, data) => {
  const isGroup = data.chatType === 'group' || data.chatType === 'supergroup';
  telegramConnectionStatus.textContent = isGroup ? 'Conectado (Grupo)' : 'Conectado';
  telegramConnectionStatus.classList.add('logged-in');
  telegramConnectionStatus.classList.remove('logged-out');
  btnTelegramLogin.disabled = false;
  btnTelegramLogin.textContent = 'Conectado';
  btnTelegramCancel.classList.add('hidden');
  alert(`Conectado com sucesso! Arquivos serão salvos no ${isGroup ? 'grupo' : 'chat privado'}.`);
});

ipcRenderer.on('telegram-login-timeout', () => {
  telegramConnectionStatus.textContent = 'Tempo esgotado';
  telegramConnectionStatus.classList.add('logged-out');
  btnTelegramLogin.disabled = false;
  btnTelegramLogin.textContent = 'Conectar com Telegram';
  btnTelegramCancel.classList.add('hidden');
  alert('Tempo esgotado. Tente novamente.');
});

// ─── Nuvem Telegram (estilo Drive) ───────────────────────────────────────────
const tgCloud = {
  bytesTotal: 0,
  bytesDone: 0,
  filesTotal: 0,
  filesDone: 0,
  idleTimer: null,
  inflight: {},
  currentName: ''
};

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function telegramFileIconSvg(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const MAP = [
    [['mp3','m4a','ogg','opus','wav','flac','aac','wma'], 'i-music', 'aud'],
    [['mp4','mkv','webm','mov','avi','m4v'], 'i-listvideo', 'vid'],
    [['jpg','jpeg','png','webp','gif','bmp','svg'], 'i-image', 'img'],
    [['zip','rar','7z','tar','gz','tgz'], 'i-package', 'zip'],
    [['iso','img','dmg'], 'i-harddrive', 'iso'],
    [['apk','exe','msi'], 'i-cpu', 'app'],
    [['js','ts','html','css','json','py','java','cpp','c','rs','go','php','rb','sql'], 'i-filetext', 'code'],
    [['xls','xlsx','csv','ods'], 'i-list', 'doc'],
    [['ppt','pptx','odp'], 'i-monitor', 'doc'],
    [['epub','mobi','pdf','doc','docx','txt','rtf','odt'], 'i-filetext', 'doc'],
    [['torrent'], 'i-link', 'def'],
  ];
  for (const [exts, icon, cls] of MAP) if (exts.includes(ext)) return { icon, cls };
  return { icon: 'i-filetext', cls: 'def' };
}

function telegramFileIcon(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (['mp3', 'm4a', 'ogg', 'opus', 'wav', 'flac', 'aac', 'wma'].includes(ext)) return '🎵';
  if (['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v'].includes(ext)) return '🎬';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'tgz'].includes(ext)) return '🗜️';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return '🖼️';
  if (['pdf'].includes(ext)) return '📕';
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return '📝';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return '📊';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return '📽️';
  if (['iso', 'img', 'dmg'].includes(ext)) return '💿';
  if (['apk', 'exe', 'msi'].includes(ext)) return '🤖';
  if (['js', 'ts', 'html', 'css', 'json', 'py', 'java', 'cpp', 'c', 'rs', 'go', 'php', 'rb', 'sql'].includes(ext)) return '💻';
  if (['torrent'].includes(ext)) return '🧲';
  if (['epub', 'mobi'].includes(ext)) return '📚';
  return '📄';
}

function updateTelegramCloudUI() {
  if (!telegramCloud || !telegramCloudFill) return;
  const inflightBytes = Object.values(tgCloud.inflight).reduce((s, e) => s + (e.loaded || 0), 0);
  const effDone = tgCloud.bytesDone + inflightBytes;
  const pct = tgCloud.bytesTotal > 0
    ? Math.min(100, Math.round((effDone / tgCloud.bytesTotal) * 100))
    : (tgCloud.filesTotal > 0 ? Math.round((tgCloud.filesDone / tgCloud.filesTotal) * 100) : 0);
  telegramCloudFill.style.width = `${pct}%`;
  // Gradiente muda de cor conforme o progresso (azul → roxo → verde → dourado)
  const hue = 210 - (pct / 100) * 190;
  telegramCloudFill.style.background = `linear-gradient(90deg, hsl(${hue},85%,55%), hsl(${hue + 40},90%,60%))`;
  telegramCloud.style.setProperty('--cloud-hue', hue);
  telegramCloudPct.textContent = `${pct}%`;
  if (tgCloud.filesTotal > 0) {
    const namePart = tgCloud.currentName ? ` — ${tgCloud.currentName}` : '';
    telegramCloudLabel.textContent = tgCloud.filesDone >= tgCloud.filesTotal
      ? `Concluído — ${tgCloud.filesDone} arquivo(s)`
      : `Enviando ${tgCloud.filesDone + 1}/${tgCloud.filesTotal}${namePart} — ${formatBytes(effDone)} de ${formatBytes(tgCloud.bytesTotal)}`;
  } else {
    telegramCloudLabel.textContent = 'Nuvem Telegram';
  }
}

function resetTelegramCloud() {
  if (tgCloud.idleTimer) clearTimeout(tgCloud.idleTimer);
  tgCloud.idleTimer = setTimeout(() => {
    tgCloud.bytesTotal = tgCloud.bytesDone = tgCloud.filesTotal = tgCloud.filesDone = 0;
    tgCloud.inflight = {};
    tgCloud.currentName = '';
    telegramCloudFill.style.width = '0%';
    telegramCloudPct.textContent = '0%';
    telegramCloudLabel.textContent = 'Nuvem Telegram';
    renderTelegramFiles();
  }, 4000);
}

api.on('telegram-upload-event', (data) => {
  if (!data) return;
  if (data.type === 'start') {
    tgCloud.filesTotal++;
    tgCloud.bytesTotal += data.size || 0;
    tgCloud.currentName = data.fileName || '';
  } else if (data.type === 'progress') {
    // uploads são serializados — uma entrada por vez basta, mas guardo por nome p/ segurança
    const key = data.fileName || '_';
    tgCloud.inflight[key] = { loaded: data.loaded || 0, size: data.size || 0 };
    if (data.fileName) tgCloud.currentName = data.fileName;
  } else if (data.type === 'done' || data.type === 'error') {
    tgCloud.filesDone++;
    tgCloud.bytesDone += data.size || 0;
    tgCloud.inflight = {};
    if (tgCloud.filesDone >= tgCloud.filesTotal) {
      tgCloud.currentName = '';
      resetTelegramCloud();
    }
  }
  updateTelegramCloudUI();
});

let tgFolderFilter = '';

// Modal de input próprio — window.prompt() não existe no Electron
function tdPrompt(message, def = '') {
  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.className = 'td-prompt-overlay';
    ov.innerHTML = `<div class="td-prompt"><div class="td-prompt-msg"></div><input class="td-prompt-input" /><div class="td-prompt-btns"><button class="btn-primary td-ok">OK</button><button class="btn-secondary td-cancel">Cancelar</button></div></div>`;
    ov.querySelector('.td-prompt-msg').textContent = message;
    const inp = ov.querySelector('.td-prompt-input');
    inp.value = def || '';
    document.body.appendChild(ov);
    inp.focus(); inp.select();
    const done = (v) => { ov.remove(); resolve(v); };
    ov.querySelector('.td-ok').onclick = () => done(inp.value);
    ov.querySelector('.td-cancel').onclick = () => done(null);
    inp.onkeydown = (e) => { if (e.key === 'Enter') done(inp.value); if (e.key === 'Escape') done(null); };
    ov.addEventListener('click', (e) => { if (e.target === ov) done(null); });
  });
}

let tgFolderPath = '';
let tgView = 'drive'; // drive | recent | starred | archived | backups | trash
function setTgView(v) {
  tgView = v;
  if (v !== 'drive') tgFolderPath = '';
  if (v === 'trash' || v === 'backups') tgFolderPath = '';
  document.querySelectorAll('.tg-side-item').forEach(el => el.classList.toggle('active', el.dataset.tgview === v));
  renderTelegramFiles();
}
let tgTypeFilter = '';
let tgFolderSort = 'name';
const tgSelected = new Set();
const TG_FOLDER_COLORS = ['#3b82f6','#8b5cf6','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#06b6d4','#64748b'];
const TG_FOLDER_EMOJIS = ['📁','🎵','🎬','🖼️','📄','🗜️','📚','💼','🎮','❤️','⭐','🗂️'];

function tgFileUrl(p) { return 'file:///' + String(p).replace(/\\/g, '/'); }

// Seletor de estilo da pasta: cores + emojis
function showFolderStylePicker(folderPath, currentIcon) {
  const ov = document.createElement('div');
  ov.className = 'tg-style-overlay';
  const box = document.createElement('div');
  box.className = 'tg-style-box';
  box.innerHTML = `<div class="tg-style-title">Estilo da pasta</div>`;
  const colorsRow = document.createElement('div');
  colorsRow.className = 'tg-style-colors';
  TG_FOLDER_COLORS.forEach(c => {
    const dot = document.createElement('span');
    dot.className = 'tg-color-dot';
    dot.style.background = c;
    dot.onclick = async () => { await api.telegramSetFolderColor(folderPath, c); ov.remove(); renderTelegramFiles(); };
    colorsRow.appendChild(dot);
  });
  const noneDot = document.createElement('span');
  noneDot.className = 'tg-color-dot tg-color-none';
  noneDot.textContent = '✕';
  noneDot.title = 'Sem cor';
  noneDot.onclick = async () => { await api.telegramSetFolderColor(folderPath, ''); ov.remove(); renderTelegramFiles(); };
  colorsRow.appendChild(noneDot);
  const emojisRow = document.createElement('div');
  emojisRow.className = 'tg-style-emojis';
  TG_FOLDER_EMOJIS.forEach(em => {
    const s = document.createElement('span');
    s.className = 'tg-emoji-opt' + (em === currentIcon ? ' active' : '');
    s.textContent = em;
    s.onclick = async () => { await api.telegramSetFolderIcon(folderPath, em); ov.remove(); renderTelegramFiles(); };
    emojisRow.appendChild(s);
  });
  box.append(colorsRow, emojisRow);
  ov.appendChild(box);
  ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

function showTelegramPreview(f) {
  const ov = document.createElement('div');
  ov.className = 'tg-preview-overlay';
  const box = document.createElement('div');
  box.className = 'tg-preview-box';
  box.innerHTML = `<div class="tg-preview-title"></div><div class="tg-preview-body"><div class="maintenance-message">Baixando da nuvem...</div></div>`;
  box.querySelector('.tg-preview-title').textContent = f.fileName;
  const close = () => ov.remove();
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  document.body.appendChild(ov);
  api.telegramPreviewFile(f.id).then(res => {
    const body = box.querySelector('.tg-preview-body');
    body.replaceChildren();
    if (!res || !res.success) {
      body.innerHTML = `<div class="maintenance-message">${(res && res.message) || 'Não foi possível pré-visualizar.'}</div>`;
      const b = document.createElement('button');
      b.className = 'btn-primary'; b.textContent = '⬇ Baixar';
      b.onclick = async () => { b.disabled = true; await api.telegramDownloadFile(f.id); b.disabled = false; };
      body.appendChild(b);
      return;
    }
    const ext = (res.ext || '').toLowerCase();
    const url = tgFileUrl(res.path);
    if (['.mp3', '.m4a', '.ogg', '.opus', '.wav', '.flac', '.aac'].includes(ext)) {
      const a = document.createElement('audio'); a.controls = true; a.src = url; a.style.width = '100%'; body.appendChild(a);
    } else if (['.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4v'].includes(ext)) {
      const v = document.createElement('video'); v.controls = true; v.src = url; v.style.maxWidth = '100%'; v.style.maxHeight = '60vh'; body.appendChild(v);
    } else if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext)) {
      const img = document.createElement('img'); img.src = url; img.style.maxWidth = '100%'; img.style.maxHeight = '65vh'; body.appendChild(img);
    } else {
      body.innerHTML = `<div class="maintenance-message">Pré-visualização não disponível para este tipo.</div>`;
      const b = document.createElement('button');
      b.className = 'btn-primary'; b.textContent = '⬇ Baixar';
      b.onclick = async () => { b.disabled = true; const r = await api.telegramDownloadFile(f.id); b.disabled = false; if (r && r.success) alert(`Salvo em: ${r.path}`); };
      body.appendChild(b);
    }
  });
}

async function renderTelegramFiles() {
  if (!telegramFilesList) return;
  try {
    const allFiles = await api.telegramGetFiles();
    const foldersBar = document.getElementById('tg-folders-bar');
    const q = (document.getElementById('tg-search')?.value || '').trim().toLowerCase();
    const folderIcons = api.telegramGetFolderIcons ? await api.telegramGetFolderIcons() : {};
    const folderColors = api.telegramGetFolderColors ? await api.telegramGetFolderColors() : {};
    const favs = api.telegramGetFavorites ? await api.telegramGetFavorites() : { folders: [], files: [] };
    const allFolderStrings = new Set();
    allFiles.forEach(f => { if (f.folder) allFolderStrings.add(f.folder); });
    if (api.telegramGetFolders) (await api.telegramGetFolders()).forEach(cf => allFolderStrings.add(cf));

    const prefix = tgFolderPath ? tgFolderPath + '/' : '';
    const children = new Set();
    allFolderStrings.forEach(fo => {
      if (tgFolderPath === '') children.add(fo.split('/')[0]);
      else if (fo.startsWith(prefix)) {
        const seg = fo.slice(prefix.length).split('/')[0];
        if (seg) children.add(prefix + seg);
      }
    });

    if (foldersBar) {
      foldersBar.replaceChildren();
      const countUnder = (fp) => allFiles.filter(f => { const fo = f.folder || ''; return fo === fp || fo.startsWith(fp + '/'); }).length;
      const mkCard = (icon, name, sub, pathVal, title, actions, droppable) => {
        const card = document.createElement('div');
        card.className = 'tg-folder-card' + (tgFolderPath === pathVal ? ' active' : '');
        card.dataset.folderPath = pathVal;
        card.innerHTML = `<div class="tg-fc-icon">${icon}</div><div class="tg-fc-name" title="${title || name}">${name}</div><div class="tg-fc-sub">${sub}</div>`;
        card.title = title || name;
        if (pathVal && folderColors[pathVal]) card.style.setProperty('--fc-color', folderColors[pathVal]);
        card.addEventListener('click', (e) => {
          if (e.target.closest('.tg-folder-zip')) return;
          tgFolderPath = pathVal;
          setTgView('drive');
        });
        card.draggable = !!pathVal;
        card.addEventListener('dragstart', (e) => {
          if (pathVal) e.dataTransfer.setData('application/x-tg-folder', pathVal);
        });
        if (droppable && pathVal) {
          card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('tg-drop-target'); });
          card.addEventListener('dragleave', () => card.classList.remove('tg-drop-target'));
          card.addEventListener('drop', async (e) => {
            e.preventDefault(); e.stopPropagation();
            card.classList.remove('tg-drop-target');
            // Arquivos do PC arrastados direto pro card → sobem pra essa pasta
            if (e.dataTransfer.files && e.dataTransfer.files.length) {
              const paths = [...e.dataTransfer.files].map(f => { try { return webUtils.getPathForFile(f); } catch (_) { return ''; } }).filter(Boolean);
              if (paths.length) {
                await api.telegramUploadDropped([{ name: '', files: paths.map(p => ({ path: p, rel: '' })) }], pathVal);
                renderTelegramFiles();
              }
              return;
            }
            const fid = e.dataTransfer.getData('application/x-tg-file');
            const fdrop = e.dataTransfer.getData('application/x-tg-folder');
            if (fid) { await api.telegramMoveFile(fid, pathVal); renderTelegramFiles(); }
            else if (fdrop && fdrop !== pathVal && !pathVal.startsWith(fdrop + '/')) {
              const r = await api.telegramMoveFolder(fdrop, pathVal);
              if (r && r.success) renderTelegramFiles();
              else if (r && r.message) alert(r.message);
            }
          });
        }
        if (actions) card.appendChild(actions);
        return card;
      };
      const svgIcon = (id) => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
      foldersBar.appendChild(mkCard(svgIcon('i-homeicon'), 'Início', `${allFiles.filter(f => !f.trashDate).length} itens`, '', 'Raiz da nuvem', null, false));
      const folderStats = (fp) => {
        const fs2 = allFiles.filter(f => { const fo = f.folder || ''; return (fo === fp || fo.startsWith(fp + '/')) && !f.trashDate; });
        return {
          count: fs2.length,
          size: fs2.reduce((a, f) => a + (f.size || 0), 0),
          recent: fs2.reduce((a, f) => Math.max(a, f.date || 0), 0)
        };
      };
      const fSort = document.getElementById('tg-folders-sort')?.value || tgFolderSort;
      tgFolderSort = fSort;
      [...children].sort((a, b) => {
        if (fSort === 'size') return folderStats(b).size - folderStats(a).size;
        if (fSort === 'count') return folderStats(b).count - folderStats(a).count;
        if (fSort === 'recent') return folderStats(b).recent - folderStats(a).recent;
        return a.localeCompare(b);
      }).forEach(cp => {
        const seg = cp.split('/').pop();
        const icon = folderIcons[cp] || svgIcon('i-folder');
        const acts = document.createElement('div');
        acts.className = 'tg-fc-actions';
        const mkAct = (txt, ttl, fn) => { const s = document.createElement('span'); s.className = 'tg-folder-zip'; s.textContent = txt; s.title = ttl; s.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); return s; };
        acts.append(
          mkAct('⬇', 'Baixar pasta como .zip', async () => { const r = await api.telegramDownloadFolder(cp); if (r && r.success) alert(`Pasta salva em:\n${r.path}`); else if (!(r && r.canceled)) alert(r && r.message || 'Falha'); }),
          mkAct('✎', 'Renomear', async () => { const nn = await tdPrompt('Novo nome:', seg); if (nn && nn.trim()) { await api.telegramRenameFolder(cp, cp.slice(0, cp.length - seg.length) + nn.trim()); renderTelegramFiles(); } }),
          mkAct('🎨', 'Estilo (cor/ícone)', () => showFolderStylePicker(cp, icon)),
          mkAct(favs.folders.includes(cp) ? '★' : '☆', 'Favoritar', async () => { await api.telegramToggleFavorite('folder', cp); renderTelegramFiles(); }),
          mkAct('🗑', 'Excluir pasta', async () => { if (confirm(`Excluir "${cp}" e todos os arquivos?`)) { await api.telegramDeleteFolder(cp); if (tgFolderPath.startsWith(cp)) tgFolderPath = ''; renderTelegramFiles(); } })
        );
        foldersBar.appendChild(mkCard(icon, seg, `${countUnder(cp)} itens`, cp, `Pasta: ${cp}`, acts, true));
      });
      const trashCount = allFiles.filter(f => f.trashDate).length;
      // Favoritos
      const favCount = favs.folders.length + favs.files.length;
      const favCard = document.createElement('div');
      favCard.className = 'tg-folder-card' + (tgView === 'starred' ? ' active' : '');
      favCard.innerHTML = `<div class="tg-fc-icon">⭐</div><div class="tg-fc-name">Favoritos</div><div class="tg-fc-sub">${favCount} itens</div>`;
      favCard.addEventListener('click', () => setTgView(tgView === 'starred' ? 'drive' : 'starred'));
      foldersBar.appendChild(favCard);
      const trashCard = document.createElement('div');
      trashCard.className = 'tg-folder-card' + (tgView === 'trash' ? ' active' : '');
      trashCard.innerHTML = `<div class="tg-fc-icon">🗑️</div><div class="tg-fc-name">Lixeira</div><div class="tg-fc-sub">${trashCount} itens</div>`;
      trashCard.addEventListener('click', () => setTgView(tgView === 'trash' ? 'drive' : 'trash'));
      foldersBar.appendChild(trashCard);
      const addCard = document.createElement('div');
      addCard.className = 'tg-folder-card tg-folder-new';
      addCard.innerHTML = '<div class="tg-fc-icon">＋</div><div class="tg-fc-name">Nova pasta</div><div class="tg-fc-sub">criar</div>';
      addCard.addEventListener('click', async () => {
        const name = await tdPrompt('Nome da nova pasta:' + (tgFolderPath ? ` (em ${tgFolderPath})` : ''));
        if (!name || !name.trim()) return;
        const full = tgFolderPath ? `${tgFolderPath}/${name.trim()}` : name.trim();
        const res = await api.telegramCreateFolder(full);
        if (res && res.success) renderTelegramFiles();
        else alert(res && res.message || 'Falha ao criar pasta');
      });
      foldersBar.appendChild(addCard);
    }

    const bc = document.getElementById('tg-breadcrumb');
    if (bc) {
      bc.replaceChildren();
      const segs = tgFolderPath ? tgFolderPath.split('/') : [];
      const mkSeg = (label, pathVal) => {
        const s = document.createElement('span');
        s.className = 'tg-bc-seg' + (pathVal === tgFolderPath ? ' active' : '');
        s.textContent = label;
        s.onclick = () => { tgFolderPath = pathVal; setTgView('drive'); };
        return s;
      };
      bc.appendChild(mkSeg('🏠 Nuvem', ''));
      let acc = '';
      segs.forEach(sg => { acc = acc ? acc + '/' + sg : sg; bc.appendChild(document.createTextNode(' › ')); bc.appendChild(mkSeg(sg, acc)); });
    }

    let files;
    if (tgView === 'trash') {
      files = allFiles.filter(f => f.trashDate);
    } else if (tgView === 'starred') {
      const favFileIds = new Set(favs.files);
      const favFolders = favs.folders;
      files = allFiles.filter(f => {
        if (f.trashDate) return false;
        if (favFileIds.has(f.id)) return true;
        const fo = f.folder || '';
        return favFolders.some(fp => fo === fp || fo.startsWith(fp + '/'));
      });
    } else if (tgView === 'recent') {
      files = allFiles.filter(f => !f.trashDate);
    } else if (tgView === 'archived') {
      // Arquivados: arquivos com +30 dias que não são favoritos
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const favFileIds = new Set(favs.files);
      files = allFiles.filter(f => !f.trashDate && f.date && f.date < cutoff && !favFileIds.has(f.id));
    } else if (tgView === 'backups') {
      files = allFiles.filter(f => !f.trashDate && f.source === 'watch');
    } else if (q) {
      files = allFiles.filter(f => !f.trashDate && ((f.fileName || '').toLowerCase().includes(q) || (f.title || '').toLowerCase().includes(q)));
    } else {
      files = allFiles.filter(f => !f.trashDate && (f.folder || '') === tgFolderPath);
    }
    // Filtro por tipo
    if (tgTypeFilter && tgView !== 'trash') {
      const IMG = ['jpg','jpeg','png','webp','gif','bmp'];
      const VID = ['mp4','mkv','webm','mov','avi','m4v'];
      const AUD = ['mp3','m4a','ogg','opus','wav','flac','aac'];
      const ZIP = ['zip','rar','7z','tar','tgz','gz'];
      const ALL = [...IMG, ...VID, ...AUD, ...ZIP];
      files = files.filter(f => {
        const e = (f.fileName.split('.').pop() || '').toLowerCase();
        if (tgTypeFilter === 'img') return IMG.includes(e);
        if (tgTypeFilter === 'vid') return VID.includes(e);
        if (tgTypeFilter === 'aud') return AUD.includes(e);
        if (tgTypeFilter === 'zip') return ZIP.includes(e);
        if (tgTypeFilter === 'doc') return !ALL.includes(e);
        return true;
      });
    }
    const sort = document.getElementById('tg-sort')?.value || 'date';
    files.sort((a, b) => {
      if (sort === 'name') return (a.fileName || '').localeCompare(b.fileName || '');
      if (sort === 'size') return (b.size || 0) - (a.size || 0);
      if (sort === 'type') return (a.fileName || '').split('.').pop().localeCompare((b.fileName || '').split('.').pop());
      return new Date(b.date) - new Date(a.date);
    });
    telegramFilesList.replaceChildren();
    if (!files.length) {
      const empty = document.createElement('p');
      empty.className = 'maintenance-message';
      empty.style.margin = '0';
      empty.textContent = tgView === 'trash' ? 'Lixeira vazia.' : (q ? 'Nenhum arquivo encontrado.' : 'Nenhum arquivo nesta pasta.');
      telegramFilesList.appendChild(empty);
    }
    let totalSize = 0;
    const allFoldersForMove = [...allFolderStrings];
    files.forEach(f => {
      totalSize += f.size || 0;
      const row = document.createElement('div');
      row.className = 'telegram-file-row' + (tgSelected.has(f.id) ? ' selected' : '');
      row.draggable = tgView !== 'trash';
      row.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/x-tg-file', f.id);
        e.dataTransfer.effectAllowed = 'move';
      });
      if (tgView !== 'trash') {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'tg-row-check';
        cb.checked = tgSelected.has(f.id);
        cb.addEventListener('click', (e) => e.stopPropagation());
        cb.addEventListener('change', () => {
          if (cb.checked) tgSelected.add(f.id); else tgSelected.delete(f.id);
          row.classList.toggle('selected', cb.checked);
          updateTgBulkBar();
        });
        row.appendChild(cb);
      }
      const icon = document.createElement('span');
      icon.className = 'telegram-file-icon';
      const fi = telegramFileIconSvg(f.fileName);
      icon.innerHTML = `<svg class="icon tg-ico-${fi.cls}" aria-hidden="true"><use href="#${fi.icon}"/></svg>`;
      const info = document.createElement('div');
      info.className = 'telegram-file-info';
      const name = document.createElement('div');
      name.className = 'telegram-file-name tg-previewable';
      name.textContent = f.fileName;
      name.title = 'Clique para pré-visualizar';
      name.addEventListener('click', () => showTelegramPreview(f));
      const meta = document.createElement('div');
      meta.className = 'telegram-file-meta';
      const srcLabel = f.source === 'download' ? 'Download' : f.source === 'watch' ? 'Pasta vigiada' : 'Manual';
      const folderLabel = f.folder && !q ? '' : (f.folder ? ` • 📁 ${f.folder}` : '');
      meta.textContent = `${formatBytes(f.size)} • ${new Date(f.date).toLocaleDateString('pt-BR')} • ${srcLabel}${folderLabel}`;
      info.append(name, meta);
      const acts = document.createElement('div');
      acts.className = 'tg-row-acts';
      if (tgView === 'trash') {
        const res = document.createElement('button');
        res.className = 'btn-ghost btn-xs'; res.textContent = '↩'; res.title = 'Restaurar';
        res.onclick = async () => { await api.telegramRestoreFile(f.id); renderTelegramFiles(); };
        const pur = document.createElement('button');
        pur.className = 'btn-ghost btn-xs tg-folder-del'; pur.textContent = '✖'; pur.title = 'Excluir para sempre';
        pur.onclick = async () => { if (confirm(`Excluir "${f.fileName}" permanentemente?`)) { await api.telegramDeleteForever(f.id); renderTelegramFiles(); } };
        acts.append(res, pur);
      } else {
        const dl = document.createElement('button');
        dl.className = 'btn-ghost btn-xs telegram-file-dl'; dl.textContent = '⬇'; dl.title = 'Baixar da nuvem';
        dl.onclick = async () => { dl.disabled = true; const r = await api.telegramDownloadFile(f.id); if (r && r.success) alert(`Salvo em: ${r.path}`); else if (!(r && r.canceled)) alert(r && r.message || 'Falha'); dl.disabled = false; };
        const del = document.createElement('button');
        del.className = 'btn-ghost btn-xs telegram-file-del'; del.textContent = '🗑'; del.title = 'Mover para lixeira';
        del.onclick = async () => { del.disabled = true; await api.telegramDeleteFile(f.id); tgSelected.delete(f.id); renderTelegramFiles(); };
        const fav = document.createElement('button');
        fav.className = 'btn-ghost btn-xs'; fav.textContent = favs.files.includes(f.id) ? '★' : '☆'; fav.title = 'Favoritar';
        fav.onclick = async () => { await api.telegramToggleFavorite('file', f.id); renderTelegramFiles(); };
        const share = document.createElement('button');
        share.className = 'btn-ghost btn-xs'; share.textContent = '🔗'; share.title = 'Copiar link do Telegram';
        share.onclick = async () => {
          const cfg = await api.getTelegramConfig();
          if (cfg && cfg.chatType === 'group' || cfg && cfg.chatType === 'supergroup') {
            const internal = String(cfg.chatId || '').replace(/^-100/, '');
            const link = `https://t.me/c/${internal}/${f.messageId}`;
            try { await navigator.clipboard.writeText(link); alert('Link copiado!'); } catch (e) { prompt('Copie o link:', link); }
          } else {
            alert('Links públicos só funcionam quando os arquivos estão em um GRUPO do Telegram.\nPara compartilhar, mova os arquivos para uma pasta e envie /start no grupo do bot.');
          }
        };
        acts.append(dl, fav, share, del);
      }
      row.append(icon, info, acts);
      telegramFilesList.appendChild(row);
    });
    telegramCloudLabel.textContent = `${files.length} arquivo(s) • ${formatBytes(totalSize)} ${tgView === 'trash' ? 'na lixeira' : 'na nuvem'}`;
    // Armazenamento real usado na nuvem
    const storageBar = document.getElementById('tg-storage-bar');
    if (storageBar) {
      const usedAll = allFiles.filter(f => !f.trashDate).reduce((a, f) => a + (f.size || 0), 0);
      const cloudCount = allFiles.filter(f => !f.trashDate).length;
      storageBar.innerHTML = `<div class="tg-storage-head"><span>☁️ Armazenamento</span><span>${formatBytes(usedAll)}</span></div><div class="tg-storage-sub">${cloudCount} arquivo(s) na nuvem • sem limite fixo</div>`;
    }
    updateTgBulkBar();
  } catch (e) {}
}

function updateTgBulkBar() {
  let bar = document.getElementById('tg-bulkbar');
  if (tgSelected.size === 0) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'tg-bulkbar';
    bar.className = 'tg-bulkbar';
    document.querySelector('.nuvem-wrap')?.appendChild(bar);
  }
  bar.replaceChildren();
  const cnt = document.createElement('span');
  cnt.className = 'tg-bulk-count';
  cnt.textContent = `${tgSelected.size} selecionado(s)`;
  const mvBtn = document.createElement('button');
  mvBtn.className = 'btn-secondary btn-xs'; mvBtn.textContent = '📁 Mover';
  mvBtn.onclick = async () => {
    const dest = await tdPrompt('Mover para a pasta (vazio = Sem pasta):');
    if (dest === null) return;
    await api.telegramMoveFiles([...tgSelected], dest.trim());
    tgSelected.clear(); renderTelegramFiles();
  };
  const delBtn = document.createElement('button');
  delBtn.className = 'btn-secondary btn-xs'; delBtn.textContent = '🗑 Lixeira';
  delBtn.onclick = async () => {
    if (!confirm(`Mover ${tgSelected.size} arquivo(s) para a lixeira?`)) return;
    for (const id of [...tgSelected]) await api.telegramDeleteFile(id);
    tgSelected.clear(); renderTelegramFiles();
  };
  const clrBtn = document.createElement('button');
  clrBtn.className = 'btn-ghost btn-xs'; clrBtn.textContent = '✕';
  clrBtn.onclick = () => { tgSelected.clear(); renderTelegramFiles(); };
  bar.append(cnt, mvBtn, delBtn, clrBtn);
}

if (btnTelegramUploadFile) {
  btnTelegramUploadFile.addEventListener('click', async () => {
    btnTelegramUploadFile.disabled = true;
    try {
      const res = await api.telegramPickUploadFile(tgFolderPath);
      if (res && res.message) alert(res.message);
      else if (res && res.success) renderTelegramFiles();
    } finally {
      btnTelegramUploadFile.disabled = false;
    }
  });
}

if (btnTelegramUploadFolder) {
  btnTelegramUploadFolder.addEventListener('click', async () => {
    btnTelegramUploadFolder.disabled = true;
    btnTelegramUploadFolder.textContent = '⏳ Enviando...';
    try {
      const res = await api.telegramPickUploadFolder(tgFolderPath);
      if (res && res.success && res.total !== undefined) {
        alert(`${res.uploaded} enviado(s), ${res.failed} falha(s) de ${res.total} arquivo(s).`);
        renderTelegramFiles();
      } else if (res && res.message) {
        alert(res.message);
      }
    } finally {
      btnTelegramUploadFolder.disabled = false;
      btnTelegramUploadFolder.textContent = '📁 Enviar pasta';
    }
  });
}

if (btnTelegramWatchFolder) {
  btnTelegramWatchFolder.addEventListener('click', async () => {
    const res = await api.telegramPickWatchFolder();
    if (res && res.folders) renderWatchFolders(res.folders);
    else if (res && res.message) alert(res.message);
  });
}

if (btnTelegramRefreshFiles) {
  btnTelegramRefreshFiles.addEventListener('click', renderTelegramFiles);
}

// Drag & drop de arquivos/pastas na aba Nuvem
const nuvemWrap = document.querySelector('.nuvem-wrap');
if (nuvemWrap && api.telegramUploadDropped) {
  ['dragenter', 'dragover'].forEach(ev => nuvemWrap.addEventListener(ev, (e) => {
    e.preventDefault();
    nuvemWrap.classList.add('tg-drop-active');
  }));
  ['dragleave', 'drop'].forEach(ev => nuvemWrap.addEventListener(ev, (e) => {
    e.preventDefault();
    nuvemWrap.classList.remove('tg-drop-active');
  }));
  nuvemWrap.addEventListener('drop', async (e) => {
    const groups = [];
    // Traversia entradas para manter nome da pasta e subpastas
    const readDir = (entry, base, out) => new Promise((resolve) => {
      const reader = entry.createReader();
      const batch = () => reader.readEntries((entries) => {
        if (!entries.length) return resolve();
        let pending = entries.length;
        const next = () => { if (--pending === 0) batch(); };
        for (const en of entries) {
          if (en.isFile) {
            en.file((file) => {
              const p = api.tdGetPathForFile(file);
              if (p) out.push({ path: p, rel: (en.fullPath || '').startsWith(base) ? en.fullPath.slice(base.length) : (en.fullPath || '') });
              next();
            }, next);
          } else if (en.isDirectory) {
            readDir(en, base, out).then(next);
          } else next();
        }
      });
      batch();
    });
    for (const item of e.dataTransfer.items) {
      const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
      if (!entry) continue;
      if (entry.isFile) {
        entry.file((file) => {
          const p = api.tdGetPathForFile(file);
          if (p) groups.push({ name: '', files: [{ path: p, rel: '' }] });
        });
      } else if (entry.isDirectory) {
        const files = [];
        await readDir(entry, entry.fullPath, files);
        if (files.length) groups.push({ name: entry.name, files });
      }
    }
    if (!groups.length) {
      for (const f of e.dataTransfer.files) {
        const p = api.tdGetPathForFile(f);
        if (p) groups.push({ name: '', files: [{ path: p, rel: '' }] });
      }
    }
    if (!groups.length) { alert('Não foi possível ler os itens soltos.'); return; }
    const res = await api.telegramUploadDropped(groups, tgFolderPath);
    if (res && res.message && !res.success) alert(res.message);
    else if (res) alert(`Upload concluído: ${res.ok} enviado(s), ${res.fail} falha(s)`);
    renderTelegramFiles();
  });
}

// Busca / ordenação / limpar índice da nuvem
const tgSearch = document.getElementById('tg-search');
const tgSort = document.getElementById('tg-sort');
const btnTelegramClearIndex = document.getElementById('btn-telegram-clear-index');
if (tgSearch) tgSearch.addEventListener('input', renderTelegramFiles);
if (tgSort) tgSort.addEventListener('change', renderTelegramFiles);
const tgType = document.getElementById('tg-type');
if (tgType) tgType.addEventListener('change', () => { tgTypeFilter = tgType.value; renderTelegramFiles(); });
if (btnTelegramClearIndex) {
  btnTelegramClearIndex.addEventListener('click', async () => {
    if (!confirm('Limpar o índice local? Os arquivos continuam no Telegram, mas saem desta lista.')) return;
    await api.telegramClearIndex();
    renderTelegramFiles();
  });
}

// Sidebar Drive + engrenagem de configuração
document.querySelectorAll('.tg-side-item').forEach(el => {
  el.addEventListener('click', () => setTgView(el.dataset.tgview));
});
document.getElementById('btn-tg-backup-index')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-tg-backup-index');
  btn.disabled = true; btn.textContent = '⏳';
  const r = await api.telegramBackupIndex();
  btn.disabled = false; btn.textContent = '💾';
  if (r && r.success) alert('Índice da nuvem salvo no Telegram (turbodown-indice.json). Se formatar o PC, baixe esse arquivo e use Importar configurações.');
  else alert(r && r.message || 'Falha ao salvar índice');
});
document.getElementById('btn-tg-settings')?.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const nav = document.querySelector('.nav-item[data-tab="settings"]') || document.querySelector('.nav-item[data-tab="nuvem"]');
  const tab = document.getElementById('tab-nuvem');
  if (nav) nav.classList.add('active');
  if (tab) tab.classList.add('active');
  document.getElementById('telegram-config-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

api.on?.('telegram-files-changed', () => renderTelegramFiles());

async function refreshTelegramCloud() {
  try {
    const folders = await api.telegramGetWatchFolders();
    renderWatchFolders(folders);
  } catch (e) {}
  renderTelegramFiles();
}
