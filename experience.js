/* Small usability improvements shared by the three pages. */
(() => {
  const toast = document.createElement('div');
  toast.className = 'save-toast'; toast.setAttribute('role', 'status'); toast.hidden = true;
  document.body.append(toast);
  let timer;
  function notify(text) { toast.textContent = text; toast.hidden = false; clearTimeout(timer); timer = setTimeout(() => { toast.hidden = true; }, 2400); }
  const footer = document.querySelector('.footer');
  const backup = document.createElement('section');
  backup.className = 'backup-tools'; backup.setAttribute('aria-label', '本地记录备份');
  backup.innerHTML = '<h2>把计划带在身边。</h2><p>导出行程、预算和清单记录，在另一台设备导入后继续。数据仅保存在当前浏览器，不会上传到服务器。</p><div class="backup-actions"><button class="close" type="button" id="exportBackup">导出记录 ↓</button><button class="close" type="button" id="importBackup">导入记录 ↑</button><input type="file" id="backupFile" accept=".json,application/json" hidden></div><p class="backup-status" role="status" id="backupStatus"></p>';
  footer?.before(backup);
  const checkboxKeys = new Set();
  document.querySelectorAll('[data-check]').forEach(el => checkboxKeys.add('roadbook-check-' + el.dataset.check));
  document.querySelectorAll('[data-prep]').forEach(el => checkboxKeys.add('winter-prep-' + el.dataset.prep));
  document.querySelectorAll('[data-shopping]').forEach(el => checkboxKeys.add('winter-shopping-' + el.dataset.shopping));
  function allowed(key) { return /^(winter-(trip-v1-(xinjiang|northeast)|prep-[a-z0-9-]{1,60}|shopping-[a-z0-9-]{1,60}|expedition-theme|ui-v1)|roadbook-check-\d{1,2}|road-verified-(xinjiang|northeast))$/.test(key); }
  function validate(key, value) {
    if (!allowed(key) || typeof value !== 'string' || value.length > 1000000) return false;
    if (/^(winter-(prep|shopping)-|roadbook-check-)/.test(key)) return ['0', '1'].includes(value);
    if (key === 'winter-expedition-theme') return ['day', 'night'].includes(value);
    let parsed; try { parsed = JSON.parse(value); } catch { return false; }
    if (key.startsWith('road-verified-')) return Number.isFinite(parsed) && parsed > 0;
    if (key === 'winter-ui-v1') return parsed && ['xinjiang', 'northeast'].includes(parsed.route) && Number.isInteger(parsed.day) && parsed.day >= 0 && parsed.day < 15;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !parsed.params || !parsed.days || typeof parsed.days !== 'object' || Array.isArray(parsed.days)) return false;
    if (JSON.stringify(parsed).includes('"__proto__"')) return false;
    for (const [day, record] of Object.entries(parsed.days)) {
      if (!/^([0-9]|1[0-4])$/.test(day) || !record || typeof record !== 'object' || Array.isArray(record)) return false;
      if (record.entries && (!Array.isArray(record.entries) || record.entries.some(e => !e || typeof e.category !== 'string' || !Number.isFinite(e.amount) || e.amount < 0))) return false;
    }
    return true;
  }
  document.getElementById('exportBackup').addEventListener('click', () => {
    try {
      const records = {};
      for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i), value = localStorage.getItem(key); if (allowed(key) && validate(key, value)) records[key] = value; }
      const blob = new Blob([JSON.stringify({ app: 'winter-roadbook', version: 1, exportedAt: new Date().toISOString(), records }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `winter-roadbook-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      document.getElementById('backupStatus').textContent = `已导出 ${Object.keys(records).length} 项记录，请妥善保管此文件。`;
    } catch { document.getElementById('backupStatus').textContent = '浏览器无法读取记录，请检查存储权限。'; }
  });
  const fileInput = document.getElementById('backupFile');
  document.getElementById('importBackup').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const status = document.getElementById('backupStatus'), file = fileInput.files[0]; if (!file) return;
    try {
      if (file.size > 3000000) throw Error('文件过大，请使用本站导出的备份文件。');
      const data = JSON.parse(await file.text());
      if (data.app !== 'winter-roadbook' || data.version !== 1 || !data.records || typeof data.records !== 'object' || Array.isArray(data.records)) throw Error('不是有效的路书备份文件。');
      const entries = Object.entries(data.records); if (entries.length > 200 || entries.some(([k, v]) => !validate(k, v))) throw Error('备份中含有无效记录，未导入任何数据。');
      if (!entries.length) throw Error('备份内没有可导入的记录。');
      if (!window.confirm(`导入 ${entries.length} 项记录？同名本地记录将被替换，备份中没有的记录将保留。建议先导出当前记录。`)) return;
      const previous = new Map(entries.map(([key]) => [key, localStorage.getItem(key)]));
      try { entries.forEach(([key, value]) => localStorage.setItem(key, value)); }
      catch { previous.forEach((value, key) => { try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch {} }); throw Error('浏览器空间不足或存储不可用，导入已撤回。'); }
      location.reload();
    } catch (error) { status.textContent = error.message || '导入失败，原记录未更改。'; }
    finally { fileInput.value = ''; }
  });
  const listItems = [...document.querySelectorAll('.prep-item')];
  if (listItems.length) {
    const tools = document.createElement('div'); tools.className = 'checklist-tools';
    tools.innerHTML = '<label class="tool-check"><input type="checkbox" id="pendingOnly">只看未完成</label><span class="tool-hint" id="pendingStatus" role="status"></span>';
    const anchor = document.querySelector('.prep-layout') || listItems[0].closest('section'); anchor.before(tools);
    const filter = document.getElementById('pendingOnly');
    function apply() {
      let remaining = 0;
      listItems.forEach(item => { const done = item.querySelector('input[type=checkbox]')?.checked; if (!done) remaining++; item.hidden = filter.checked && done; item.classList.toggle('completed-item', Boolean(done)); });
      document.getElementById('pendingStatus').textContent = remaining ? `还有 ${remaining} 项待完成` : '全部完成，出发前记得再次复查。';
      document.querySelectorAll('.prep-section').forEach(section => {
        let note = section.querySelector('.section-complete');
        if (!note) { note = document.createElement('p'); note.className = 'tool-hint section-complete'; note.textContent = '本组已全部完成。'; section.append(note); }
        const items = [...section.querySelectorAll('.prep-item')]; note.hidden = !filter.checked || !items.length || items.some(item => !item.hidden);
      });
    }
    filter.addEventListener('change', apply);
    document.addEventListener('change', event => { if (event.target.matches('[data-prep],[data-shopping]')) { apply(); notify(event.target.checked ? '已记录完成状态' : '已标记为待完成'); } }); apply();
  }
  if (typeof DATA !== 'undefined' && document.getElementById('timeline')) {
    const tools = document.createElement('div'); tools.className = 'roadbook-tools';
    tools.innerHTML = '<input type="search" id="daySearch" aria-label="搜索地点、住宿或风险" placeholder="搜索目的地、住宿或风险…"><select id="dayFilter" aria-label="筛选行程类型"><option value="all">全部行程</option><option value="travel">游玩与缓冲</option><option value="drive">运输与返程</option><option value="transfer">转场与抵达</option></select><button class="close" id="resumeDay" type="button">继续上次行程 ↗</button>';
    const timeline = document.getElementById('timeline'); timeline.before(tools);
    const result = document.createElement('p'); result.className = 'tool-hint'; result.setAttribute('role', 'status'); tools.after(result);
    const empty = document.createElement('p'); empty.className = 'empty-result'; empty.textContent = '没有匹配的行程，试试其他关键词或行程类型。'; empty.hidden = true; timeline.after(empty);
    function filterDays() {
      const term = document.getElementById('daySearch').value.trim().toLowerCase(), kind = document.getElementById('dayFilter').value;
      let count = 0;
      timeline.querySelectorAll('.day').forEach(item => {
        const day = DATA[current].days[Number(item.dataset.i)], type = day[2];
        const matches = kind === 'all' || (kind === 'travel' ? /游玩|缓冲|景观/.test(type) : kind === 'drive' ? /运输|返程/.test(type) : /转场|到达/.test(type));
        item.hidden = !matches || !item.textContent.toLowerCase().includes(term); if (!item.hidden) count++;
      });
      result.textContent = `显示 ${count} / 15 天 · 点击一天查看完整安排`; empty.hidden = count > 0;
    }
    const baseRender = renderRoute;
    renderRoute = function() {
      baseRender(); filterDays();
      try { localStorage.setItem('winter-ui-v1', JSON.stringify({ route: current, day: selectedDay })); } catch {}
    };
    try { const saved = JSON.parse(localStorage.getItem('winter-ui-v1') || 'null'); if (saved && Object.hasOwn(DATA, saved.route) && Number.isInteger(saved.day) && saved.day >= 0 && saved.day < 15) { current = saved.route; selectedDay = saved.day; } } catch {}
    document.getElementById('daySearch').addEventListener('input', filterDays);
    document.getElementById('dayFilter').addEventListener('change', filterDays);
    document.getElementById('resumeDay').addEventListener('click', () => setTrip(true));
    timeline.addEventListener('click', event => { if (event.target.closest('.day')) setTrip(true); });
    // Selecting a row re-renders it; restore keyboard entry through delegation.
    timeline.addEventListener('keydown', event => { if (event.target.closest('.day') && ['Enter', ' '].includes(event.key)) setTrip(true); });
    renderRoute();
    const live = document.createElement('p'); live.className = 'tool-hint'; live.textContent = '以下为当前日期起未来 7 天预报，并非 2027 出行日期预报。'; document.querySelector('.conditions-controls').before(live);
  }
})();
