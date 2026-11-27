// ═══════════════════════════════════════════════════════════
//  KTPMUD – Core Data Store  (localStorage-based)
// ═══════════════════════════════════════════════════════════

const K = {
  USERS:     'ktpmud_users',
  CLASSES:   'ktpmud_classes',     // Lớp học (nhiều lớp)
  GROUPS:    'ktpmud_groups',      // Nhóm (thuộc 1 lớp)
  REPORTS:   'ktpmud_reports',     // Báo cáo tuần (file đính kèm)
  TASKS:     'ktpmud_tasks',       // Công việc (Kanban)
  PRODUCTS:  'ktpmud_products',    // Sản phẩm cuối kỳ
  GRADES:    'ktpmud_grades',      // Điểm
  SESSION:   'ktpmud_session',     // Người dùng hiện tại
  CUR_CLASS: 'ktpmud_cur_class',   // Lớp đang xem
  UPDATED_AT:'ktpmud_updated_at',  // Dấu thời gian đồng bộ dữ liệu
};

// ── Raw DB helpers ──────────────────────────────────────────
const _get = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const _getObj = k => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
const _set = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (err) {
    console.warn('localStorage quota error for ' + k + ':', err);
    if (k === K.REPORTS && Array.isArray(v)) {
      const light = v.map(r => ({
        ...r,
        files: (r.files || []).map(f => {
          if (f.dataUrl && f.dataUrl.length > 50000) {
            const { dataUrl, ...rest } = f;
            return rest;
          }
          return f;
        })
      }));
      try { localStorage.setItem(k, JSON.stringify(light)); } catch (e) {}
    }
  }
};
// sessionStorage helpers – riêng biệt theo từng tab (hỗ trợ đăng nhập 2 tài khoản cùng lúc)
const _ssGet = k => { try { return JSON.parse(sessionStorage.getItem(k)) || null; } catch { return null; } };
const _ssSet = (k, v) => sessionStorage.setItem(k, JSON.stringify(v));
const _ssDel = k => sessionStorage.removeItem(k);

// ── Server API sync helper ──────────────────────────────────
const _api = async (url, method = 'GET', body = null) => {
  if (!location.protocol.startsWith('http')) return null;
  const isMutation = method !== 'GET' && !url.includes('/auth/') && !url.includes('/restore');
  let localTs = 0;
  if (isMutation) {
    localTs = Date.now();
    localStorage.setItem(K.UPDATED_AT, String(localTs));
  }
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const json = await res.json();
    if (isMutation && json && json.updatedAt) {
      const cur = Number(localStorage.getItem(K.UPDATED_AT) || 0);
      localStorage.setItem(K.UPDATED_AT, String(Math.max(cur, Number(json.updatedAt))));
    }
    return json;
  } catch (e) {
    return null;
  }
};

// ── DB API ──────────────────────────────────────────────────
const DB = {
  users() { return _get(K.USERS); },
  findUser(email) {
    if (!email) return null;
    const q = email.trim().toLowerCase();
    const users = this.users();
    // Ưu tiên tài khoản đã được phân lớp trước để tránh chọn nhầm tài khoản chờ duyệt trùng lặp
    const sorted = [...users].sort((a, b) => {
      const aHas = Boolean(this.userClassId(a));
      const bHas = Boolean(this.userClassId(b));
      if (aHas === bHas) return 0;
      return aHas ? -1 : 1;
    });
    // 1. So khớp chính xác email hệ thống hoặc email gốc
    let found = sorted.find(u => 
      u.email.toLowerCase() === q || 
      (u.originalEmail && u.originalEmail.toLowerCase() === q)
    );
    if (found) return found;

    // 2. So khớp phần username trước dấu @ (cho phép xxx và xxx@edu.vn)
    const userPart = q.split('@')[0];
    return sorted.find(u => 
      u.email.toLowerCase().split('@')[0] === userPart ||
      (u.originalEmail && u.originalEmail.toLowerCase().split('@')[0] === userPart) ||
      (u.mssv && (q.includes(u.mssv) || userPart === u.mssv || u.mssv.endsWith(userPart)))
    );
  },
  findUserById(id) { return this.users().find(u => u.id === id); },
  userClassId(u) {
    if (!u) return null;
    if (typeof u === 'string') u = this.findUserById(u);
    if (!u) return null;
    if (u.classId) return u.classId;
    const grp = this.groupOfUser(u.id);
    if (grp?.classId) return grp.classId;
    if (['u3','u4'].includes(u.id)) return 'c1';
    if (['u9','u10','u11','u12'].includes(u.id)) return 'c2';
    return null;
  },
  studentsByClass(cid) {
    const students = this.users().filter(u => u.role === 'sinhvien' || u.role === 'nhomt');
    if (!cid || cid === 'all') return students;
    return students.filter(u => this.userClassId(u) === cid);
  },
  addUser(u) {
    const arr = this.users(); arr.push(u); _set(K.USERS, arr);
    _api('/api/users', 'POST', u);
  },
  updateUser(upd) {
    const arr = this.users();
    const i = arr.findIndex(u => u.id === upd.id);
    if (i >= 0) { arr[i] = {...arr[i], ...upd}; _set(K.USERS, arr); }
    _api(`/api/users/${upd.id}`, 'PUT', upd);
  },
  deleteUser(id) {
    _set(K.USERS, this.users().filter(u => u.id !== id));
    // Tự động gỡ thành viên khỏi tất cả các nhóm khi xóa tài khoản
    const updatedGroups = this.groups().map(g => {
      let changed = false;
      let newMembers = g.members || [];
      if (newMembers.includes(id)) {
        newMembers = newMembers.filter(m => m !== id);
        changed = true;
      }
      let newLeader = g.leaderId;
      if (g.leaderId === id) {
        newLeader = newMembers[0] || null;
        changed = true;
      }
      return changed ? { ...g, members: newMembers, leaderId: newLeader } : g;
    });
    _set(K.GROUPS, updatedGroups);
    _api(`/api/users/${id}`, 'DELETE');
  },

  // ─ Classes ─
  classes() { return _get(K.CLASSES); },
  findClass(id) { return this.classes().find(c => c.id === id); },
  addClassroom(c) {
    const arr = this.classes(); arr.push(c); _set(K.CLASSES, arr);
    _api('/api/classes', 'POST', c);
  },
  updateClass(upd) {
    const arr = this.classes();
    const i = arr.findIndex(c => c.id === upd.id);
    if (i >= 0) { arr[i] = {...arr[i], ...upd}; _set(K.CLASSES, arr); }
    _api(`/api/classes/${upd.id}`, 'PUT', upd);
  },
  deleteClass(id) {
    // 1. Xóa các sinh viên/nhóm trưởng thuộc lớp này để không còn bị trùng lặp tài khoản khi tạo lớp mới
    const usersInClass = this.users().filter(u => u.role !== 'giaovien' && (u.classId === id || this.userClassId(u) === id));
    usersInClass.forEach(u => {
      _api(`/api/users/${u.id}`, 'DELETE');
    });
    _set(K.USERS, this.users().filter(u => u.role === 'giaovien' || (u.classId !== id && this.userClassId(u) !== id)));

    // 2. Xóa các nhóm, công việc, báo cáo thuộc lớp này
    const classGroupIds = this.groups().filter(g => g.classId === id).map(g => g.id);
    _set(K.TASKS, this.tasks().filter(t => !classGroupIds.includes(t.groupId)));
    _set(K.REPORTS, this.reports().filter(r => !classGroupIds.includes(r.groupId)));
    _set(K.GRADES, this.grades().filter(gr => !classGroupIds.includes(gr.groupId)));
    _set(K.GROUPS, this.groups().filter(g => g.classId !== id));

    // 3. Xóa lớp
    _set(K.CLASSES, this.classes().filter(c => c.id !== id));
    _api(`/api/classes/${id}`, 'DELETE');
  },

  // ─ Groups ─
  groups() { return _get(K.GROUPS); },
  groupsByClass(cid) { return this.groups().filter(g => g.classId === cid); },
  findGroup(id) { return this.groups().find(g => g.id === id); },
  groupOfUser(uid) { return this.groups().find(g => g.members.includes(uid)); },
  addGroup(g) {
    const arr = this.groups(); arr.push(g); _set(K.GROUPS, arr);
    if (g.classId && Array.isArray(g.members)) {
      const uArr = this.users().map(u => g.members.includes(u.id) ? {...u, classId: g.classId} : u);
      _set(K.USERS, uArr);
    }
    _api('/api/groups', 'POST', g);
  },
  updateGroup(upd) {
    const arr = this.groups();
    const i = arr.findIndex(g => g.id === upd.id);
    if (i >= 0) {
      arr[i] = {...arr[i], ...upd};
      _set(K.GROUPS, arr);
      const cid = arr[i].classId;
      if (cid && Array.isArray(arr[i].members)) {
        const uArr = this.users().map(u => arr[i].members.includes(u.id) ? {...u, classId: cid} : u);
        _set(K.USERS, uArr);
      }
    }
    _api(`/api/groups/${upd.id}`, 'PUT', upd);
  },
  deleteGroup(id) {
    _set(K.GROUPS, this.groups().filter(g => g.id !== id));
    _set(K.REPORTS, this.reports().filter(r => r.groupId !== id));
    _set(K.TASKS, this.tasks().filter(t => t.groupId !== id));
    _api(`/api/groups/${id}`, 'DELETE');
  },

  // ─ Reports ─
  reports() { return _get(K.REPORTS); },
  reportsByGroup(gid) { return this.reports().filter(r => r.groupId === gid); },
  reportByGroupWeek(gid, w) { return this.reports().find(r => r.groupId === gid && r.week === w); },
  addReport(r) {
    const arr = this.reports(); arr.push(r); _set(K.REPORTS, arr);
    _api('/api/reports', 'POST', r);
  },
  updateReport(upd) {
    const arr = this.reports();
    const i = arr.findIndex(r => r.id === upd.id);
    if (i >= 0) { arr[i] = {...arr[i], ...upd}; _set(K.REPORTS, arr); }
    _api(`/api/reports/${upd.id}`, 'PUT', upd);
  },

  // ─ Tasks (Kanban) ─
  tasks() { return _get(K.TASKS); },
  tasksByGroup(gid) { return this.tasks().filter(t => t.groupId === gid); },
  findTask(id) { return this.tasks().find(t => t.id === id); },
  addTask(t) {
    const arr = this.tasks(); arr.push(t); _set(K.TASKS, arr);
    _api('/api/tasks', 'POST', t);
  },
  updateTask(upd) {
    const arr = this.tasks();
    const i = arr.findIndex(t => t.id === upd.id);
    if (i >= 0) { arr[i] = {...arr[i], ...upd}; _set(K.TASKS, arr); }
    _api(`/api/tasks/${upd.id}`, 'PUT', upd);
  },
  deleteTask(id) {
    _set(K.TASKS, this.tasks().filter(t => t.id !== id));
    _api(`/api/tasks/${id}`, 'DELETE');
  },

  // ─ Products ─
  products() { return _get(K.PRODUCTS); },
  productByGroup(gid) { return this.products().find(p => p.groupId === gid); },
  addProduct(p) {
    const arr = this.products(); arr.push(p); _set(K.PRODUCTS, arr);
    _api('/api/products', 'POST', p);
  },
  updateProduct(upd) {
    const arr = this.products();
    const i = arr.findIndex(p => p.id === upd.id);
    if (i >= 0) { arr[i] = {...arr[i], ...upd}; _set(K.PRODUCTS, arr); }
    _api(`/api/products/${upd.id}`, 'PUT', upd);
  },

  // ─ Grades ─
  grades() { return _get(K.GRADES); },
  gradeByGroup(gid) { return this.grades().find(g => g.groupId === gid) || null; },
  setGrade(upd) {
    const arr = this.grades();
    const i = arr.findIndex(g => g.groupId === upd.groupId);
    if (i >= 0) { arr[i] = {...arr[i], ...upd}; }
    else { arr.push(upd); }
    _set(K.GRADES, arr);
    _api('/api/grades', 'POST', upd);
  },

  // ─ Session (sessionStorage để mỗi tab là một tài khoản riêng biệt) ─
  session() {
    let s = _ssGet(K.SESSION);
    if (!s) {
      s = _getObj(K.SESSION);
      if (s) {
        _ssSet(K.SESSION, s);
        try { localStorage.removeItem(K.SESSION); } catch {}
      }
    }
    // Tự động đồng bộ với thông tin tài khoản mới nhất trong cơ sở dữ liệu
    if (s && (s.id || s.email)) {
      const allUsers = this.users();
      const candidates = allUsers.filter(u => 
        (s.id && u.id === s.id) || 
        (u.email && u.email.toLowerCase() === s.email?.toLowerCase()) || 
        (u.originalEmail && u.originalEmail.toLowerCase() === s.email?.toLowerCase())
      );

      // Nếu hệ thống đã tải danh sách tài khoản mà tài khoản này không còn tồn tại (đã bị xóa)
      if (allUsers.length > 0 && candidates.length === 0 && s.role !== 'giaovien') {
        this.clearSession();
        return null;
      }

      candidates.sort((a, b) => {
        const aHas = Boolean(this.userClassId(a));
        const bHas = Boolean(this.userClassId(b));
        if (aHas === bHas) return 0;
        return aHas ? -1 : 1;
      });
      const fresh = candidates[0];
      if (fresh) {
        if (fresh.classId !== s.classId || fresh.role !== s.role || fresh.mssv !== s.mssv || fresh.id !== s.id) {
          s = { ...s, ...fresh };
          _ssSet(K.SESSION, s);
        }
      }
    }
    return s;
  },
  setSession(u) {
    _ssSet(K.SESSION, u);
  },
  clearSession() {
    _ssDel(K.SESSION);
    try { localStorage.removeItem(K.SESSION); } catch {}
  },

  // ─ Current class (hỗ trợ lọc lớp riêng theo tab) ─
  curClassId() {
    const v = sessionStorage.getItem(K.CUR_CLASS) || localStorage.getItem(K.CUR_CLASS);
    return (!v || v === 'all') ? null : v;
  },
  setCurClass(id) {
    sessionStorage.setItem(K.CUR_CLASS, id || 'all');
    localStorage.setItem(K.CUR_CLASS, id || 'all');
  },
};

// ── Utilities ───────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

const fmtDate = s => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
};
const fmtDateTime = s => {
  if (!s) return '—';
  return new Date(s).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
};
const fmtBytes = b => b < 1024 ? b+'B' : b < 1048576 ? (b/1024).toFixed(1)+'KB' : (b/1048576).toFixed(1)+'MB';

const fileIcon = name => {
  if (!name) return '📄';
  const ext = name.split('.').pop().toLowerCase();
  return {docx:'📝',doc:'📝',pptx:'📊',ppt:'📊',pdf:'📋',xlsx:'📈',xls:'📈',zip:'📦',rar:'📦'}[ext] || '📄';
};

/* ════ UNIVERSAL FILE STORAGE & VIEWING HELPERS ════ */
const FileStore = (() => {
  let _db = null;
  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((res, rej) => {
      if (typeof indexedDB === 'undefined') return res(null);
      const req = indexedDB.open('ktpmud_files', 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('files', { keyPath: 'key' });
      req.onsuccess = e => { _db = e.target.result; res(_db); };
      req.onerror = () => rej(req.error);
    });
  }
  return {
    async put(key, dataUrl) {
      const db = await open();
      if (!db) return;
      return new Promise((res, rej) => {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put({ key, dataUrl });
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
    },
    async get(key) {
      const db = await open();
      if (!db) return null;
      return new Promise((res, rej) => {
        const tx = db.transaction('files', 'readonly');
        const req = tx.objectStore('files').get(key);
        req.onsuccess = () => res(req.result?.dataUrl || null);
        req.onerror = () => rej(req.error);
      });
    },
    async del(key) {
      const db = await open();
      if (!db) return;
      return new Promise((res, rej) => {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').delete(key);
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
    }
  };
})();

function downloadFileUnified(f) {
  if (typeof f === 'string') f = { name: f };
  if (!f || !f.name) return;
  
  if (f.path) {
    const fullUrl = f.path.startsWith('http') ? f.path : (location.origin + f.path);
    const a = document.createElement('a'); a.href = fullUrl; a.download = f.name; a.target = '_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast(`⬇️ Đang tải ${f.name}...`, 'info');
    return;
  }
  if (f.dataUrl) {
    const a = document.createElement('a'); a.href = f.dataUrl; a.download = f.name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast(`⬇️ Đang tải ${f.name}...`, 'info');
    return;
  }
  if (f.fileKey) {
    FileStore.get(f.fileKey).then(dataUrl => {
      if (dataUrl) {
        const a = document.createElement('a'); a.href = dataUrl; a.download = f.name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        showToast(`⬇️ Đang tải ${f.name}...`, 'info');
      } else {
        generateSampleFileDownload(f);
      }
    }).catch(() => generateSampleFileDownload(f));
    return;
  }
  generateSampleFileDownload(f);
}

function generateSampleFileDownload(f) {
  const content = `========================================================\n` +
    `TÀI LIỆU DỰ ÁN: ${f.name || 'TaiLieu.docx'}\n` +
    `Hệ thống Quản lý Tiến độ Project KTPMUD - ĐHBK Hà Nội\n` +
    `========================================================\n\n` +
    `• Tên file: ${f.name}\n` +
    `• Dung lượng: ${fmtBytes(f.size || 512000)}\n` +
    `• Trạng thái: File tài liệu đính kèm của nhóm sinh viên\n` +
    `• Nội dung: Báo cáo tiến độ hoàn thiện đề tài, kiến trúc hệ thống và slide thuyết trình.\n\n` +
    `--------------------------------------------------------\n` +
    `Ngày tải xuống: ${new Date().toLocaleString('vi-VN')}\n`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = f.name ? (f.name.endsWith('.txt') ? f.name : f.name + '.txt') : 'TaiLieu.txt';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  showToast(`✅ Đã tải tài liệu: ${f.name}`, 'success');
}

const _loadedScripts = {};
function loadScriptOnce(src) {
  if (_loadedScripts[src]) return _loadedScripts[src];
  _loadedScripts[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Không thể tải thư viện xem tài liệu: ' + src));
    document.head.appendChild(s);
  });
  return _loadedScripts[src];
}

function dataUrlToArrayBuffer(dataUrl) {
  const byteStr = atob(dataUrl.split(',')[1]);
  const ab = new ArrayBuffer(byteStr.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
  return ab;
}

async function resolveFileSource(f) {
  if (f.path) {
    const fullUrl = f.path.startsWith('http') ? f.path : (location.origin + f.path);
    return { type: 'url', url: fullUrl };
  }
  if (f.dataUrl) {
    return { type: 'dataUrl', dataUrl: f.dataUrl };
  }
  if (f.fileKey) {
    const dataUrl = await FileStore.get(f.fileKey);
    if (dataUrl) return { type: 'dataUrl', dataUrl };
  }
  return null;
}

async function getFileArrayBuffer(srcInfo) {
  if (srcInfo.type === 'dataUrl') {
    return dataUrlToArrayBuffer(srcInfo.dataUrl);
  }
  const res = await fetch(srcInfo.url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.arrayBuffer();
}

function escapeHtmlSafe(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function viewFileUnified(f) {
  if (typeof f === 'string') f = { name: f };
  if (!f || !f.name) return;

  const srcInfo = await resolveFileSource(f);
  if (!srcInfo) {
    showFileSampleModal(f);
    return;
  }

  const ext = (f.name || '').split('.').pop().toLowerCase();
  const modalId = 'm-doc-viewer';
  let m = document.getElementById(modalId);
  if (!m) {
    m = document.createElement('div');
    m.id = modalId;
    m.className = 'modal-overlay';
    m.style.zIndex = '2000';
    document.body.appendChild(m);
  }

  const jsonStr = encodeURIComponent(JSON.stringify(f));
  m.innerHTML = `
    <div class="modal" style="max-width:980px;width:95vw;height:88vh;display:flex;flex-direction:column;padding:18px 22px">
      <div class="modal-header" style="margin-bottom:12px;flex-shrink:0">
        <div class="modal-title" style="display:flex;align-items:center;gap:8px;min-width:0">
          <span>${fileIcon(f.name)}</span>
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtmlSafe(f.name)}</span>
          <span class="badge badge-gray" style="font-size:11px;flex-shrink:0">${fmtBytes(f.size || 0)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <button type="button" class="btn btn-primary btn-sm" onclick="downloadFileUnified(JSON.parse(decodeURIComponent('${jsonStr}')))">⬇️ Tải về</button>
          <button type="button" class="modal-close" onclick="closeModal('${modalId}')">✕</button>
        </div>
      </div>
      <div id="doc-viewer-body" style="flex:1;overflow:auto;background:#f3f4f6;border:1px solid var(--border);border-radius:8px;position:relative">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);gap:8px">
          <div style="font-size:28px">⏳</div>
          <div style="font-size:13px;font-weight:600">Đang tải nội dung tài liệu...</div>
        </div>
      </div>
    </div>
  `;
  openModal(modalId);

  const body = document.getElementById('doc-viewer-body');
  try {
    if (ext === 'pdf') {
      let pdfUrl = srcInfo.url;
      if (srcInfo.type === 'dataUrl') {
        const ab = dataUrlToArrayBuffer(srcInfo.dataUrl);
        pdfUrl = URL.createObjectURL(new Blob([ab], { type: 'application/pdf' }));
      }
      body.innerHTML = `<iframe src="${pdfUrl}" style="width:100%;height:100%;min-height:68vh;border:none;background:#fff"></iframe>`;
      return;
    }

    if (ext === 'docx') {
      if (!window.mammoth) {
        await loadScriptOnce('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js');
      }
      const ab = await getFileArrayBuffer(srcInfo);
      const result = await window.mammoth.convertToHtml({ arrayBuffer: ab });
      body.innerHTML = `
        <style>
          .docx-paper { max-width: 790px; margin: 20px auto; background: #fff; padding: 36px 44px; border-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); line-height: 1.7; font-size: 14px; color: #111827; }
          .docx-paper h1, .docx-paper h2, .docx-paper h3 { margin: 14px 0 8px; font-weight: 700; color: #111; }
          .docx-paper p { margin-bottom: 10px; }
          .docx-paper table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
          .docx-paper table td, .docx-paper table th { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; }
          .docx-paper ul, .docx-paper ol { margin: 8px 0 12px 22px; }
          .docx-paper img { max-width: 100%; height: auto; margin: 10px 0; }
        </style>
        <div class="docx-paper">${result.value || '<p style="color:#6b7280">(Tài liệu trống)</p>'}</div>
      `;
      return;
    }

    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      if (!window.XLSX) {
        await loadScriptOnce('https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js');
      }
      const ab = await getFileArrayBuffer(srcInfo);
      const wb = window.XLSX.read(ab, { type: 'array' });
      const sheetsHtml = wb.SheetNames.map(name => `
        <div style="margin-bottom:20px">
          <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#374151">📊 Sheet: ${escapeHtmlSafe(name)}</div>
          <div style="overflow:auto;background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:10px">
            ${window.XLSX.utils.sheet_to_html(wb.Sheets[name])}
          </div>
        </div>
      `).join('');
      body.innerHTML = `
        <style>
          #doc-viewer-body table { border-collapse: collapse; font-size: 12px; width: 100%; }
          #doc-viewer-body td, #doc-viewer-body th { border: 1px solid #e5e7eb; padding: 5px 8px; white-space: nowrap; }
          #doc-viewer-body tr:first-child { background: #f9fafb; font-weight: 700; }
        </style>
        <div style="padding:16px">${sheetsHtml}</div>
      `;
      return;
    }

    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      const imgSrc = srcInfo.type === 'dataUrl' ? srcInfo.dataUrl : srcInfo.url;
      body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100%;padding:16px"><img src="${imgSrc}" style="max-width:100%;max-height:74vh;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,.1)"/></div>`;
      return;
    }

    if (['txt', 'md', 'json', 'log'].includes(ext)) {
      const ab = await getFileArrayBuffer(srcInfo);
      const text = new TextDecoder('utf-8').decode(ab);
      body.innerHTML = `<pre style="margin:16px;padding:20px;background:#fff;border:1px solid #e5e7eb;border-radius:6px;white-space:pre-wrap;font-size:13px;line-height:1.6">${escapeHtmlSafe(text)}</pre>`;
      return;
    }

    if ((ext === 'pptx' || ext === 'ppt' || ext === 'doc') && srcInfo.type === 'url' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      const embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(srcInfo.url)}`;
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;height:100%">
          <div style="background:#fffbeb;border-bottom:1px solid #fde68a;padding:6px 12px;font-size:12px;color:#92400e;display:flex;justify-content:space-between;align-items:center">
            <span>Đang hiển thị qua trình xem Office Online. Nếu khung bên dưới không tải được, hãy bấm <strong>⬇️ Tải về</strong> ở góc trên.</span>
          </div>
          <iframe src="${embedUrl}" style="flex:1;width:100%;min-height:64vh;border:none;background:#fff"></iframe>
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:32px;text-align:center;gap:12px">
        <div style="font-size:42px">${fileIcon(f.name)}</div>
        <div style="font-weight:700;font-size:15px;color:#111827">Định dạng .${escapeHtmlSafe(ext)} chưa hỗ trợ xem trực tiếp ngoại tuyến</div>
        <div style="font-size:13px;color:#6b7280;max-width:420px">Trình duyệt hiện hỗ trợ xem trực tiếp định dạng <strong>.docx, .pdf, .xlsx, ảnh, .txt</strong> (và <strong>.pptx/.doc</strong> khi chạy trực tuyến). Bạn có thể tải file về máy để mở bằng Office.</div>
        <button type="button" class="btn btn-primary" onclick="downloadFileUnified(JSON.parse(decodeURIComponent('${jsonStr}')))">⬇️ Tải ${escapeHtmlSafe(f.name)} về máy</button>
      </div>
    `;
  } catch (err) {
    console.error('Doc viewer error:', err);
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:32px;text-align:center;gap:12px">
        <div style="font-size:40px">⚠️</div>
        <div style="font-weight:700;font-size:15px;color:#991b1b">Không thể hiển thị trực tiếp file này</div>
        <div style="font-size:13px;color:#6b7280;max-width:420px">${escapeHtmlSafe(err.message)} — Bạn vẫn có thể tải file về máy để xem.</div>
        <button type="button" class="btn btn-primary" onclick="downloadFileUnified(JSON.parse(decodeURIComponent('${jsonStr}')))">⬇️ Tải về máy</button>
      </div>
    `;
  }
}

function showFileSampleModal(f) {
  const modalId = 'm-sample-file-preview';
  let m = document.getElementById(modalId);
  if (!m) {
    m = document.createElement('div');
    m.id = modalId;
    m.className = 'modal-overlay';
    document.body.appendChild(m);
  }
  m.innerHTML = `
    <div class="modal modal-md">
      <div class="modal-header">
        <div class="modal-title">📄 Chi tiết tài liệu: ${f.name}</div>
        <button class="modal-close" onclick="closeModal('${modalId}')">✕</button>
      </div>
      <div style="background:var(--gray-50);padding:16px;border-radius:var(--radius-sm);margin-bottom:16px">
        <div class="flex items-center gap-3 mb-3">
          <div style="font-size:36px">${fileIcon(f.name)}</div>
          <div>
            <div class="font-bold text-sm">${f.name}</div>
            <div class="text-xs text-muted">Dung lượng: ${fmtBytes(f.size || 512000)} · Định dạng: ${((f.name||'').split('.').pop()||'DOCX').toUpperCase()}</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.6">
          Tài liệu đính kèm của sinh viên trong tiến độ đồ án. Bạn có thể tải file về máy tính hoặc mở xem trực tiếp.
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('${modalId}')">Đóng</button>
        <button type="button" class="btn btn-primary" onclick="generateSampleFileDownload({name:'${f.name}', size:${f.size || 512000}})">⬇️ Tải file về máy</button>
      </div>
    </div>
  `;
  openModal(modalId);
}

function getInitials(name) {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return (p[0][0] + (p.length > 1 ? p[p.length-1][0] : '')).toUpperCase();
}
function avatarBg(name) {
  const palette = ['#111','#333','#555','#222','#444','#666'];
  let h = 0; for (const c of name||'?') h = (h + c.charCodeAt(0)) % palette.length;
  return palette[h];
}

function roleLabel(role) {
  return {giaovien:'Giảng viên', nhomt:'Nhóm trưởng', sinhvien:'Sinh viên'}[role] || role;
}
function roleBadge(role) {
  const map = {
    giaovien: `<span class="badge badge-black">GV</span>`,
    nhomt:    `<span class="badge badge-gray" style="font-weight:700">NT</span>`,
    sinhvien: `<span class="badge badge-outline">SV</span>`,
  };
  return map[role] || '';
}

function gradeLetterFromScore(s) {
  if (s >= 9.0) return 'A+'; if (s >= 8.5) return 'A';
  if (s >= 8.0) return 'B+'; if (s >= 7.0) return 'B';
  if (s >= 6.5) return 'C+'; if (s >= 5.5) return 'C';
  if (s >= 5.0) return 'D+'; if (s >= 4.0) return 'D';
  return 'F';
}
function scoreClass(s) {
  if (s >= 8.0) return 'score-a'; if (s >= 7.0) return 'score-b';
  if (s >= 5.5) return 'score-c'; if (s >= 4.0) return 'score-d';
  return 'score-f';
}

// Tính mốc thời gian bắt đầu của lớp: ưu tiên semStart (ngày bắt đầu học kỳ) hoặc createdAt (ngày tạo lớp)
function classStartDate(classOrId) {
  let cls = null;
  if (!classOrId) {
    const curCid = (typeof DB !== 'undefined') ? DB.curClassId() : null;
    cls = curCid ? DB.findClass(curCid) : null;
  } else if (typeof classOrId === 'string') {
    cls = DB.findClass(classOrId);
  } else if (typeof classOrId === 'object') {
    cls = classOrId;
  }
  const dateStr = cls?.semStart || cls?.createdAt;
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date('2026-08-17');
}

// Tuần hiện tại: tính từ ngày tạo/bắt đầu lớp, mỗi tuần 7 ngày
function currentWeek(classOrId) {
  const start = classStartDate(classOrId);
  const diffMs = new Date() - start;
  // Nếu chưa đến ngày bắt đầu thì tính là tuần 1
  if (diffMs < 0) return 1;
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 3600 * 1000)) + 1;
  return Math.max(1, Math.min(diffWeeks, 16));
}

// Hạn nộp báo cáo: Tuần 1 là 7 ngày sau ngày tạo/bắt đầu lớp (lúc 23:59:59 của ngày thứ 7)
// Tuần w: start + w * 7 ngày (lúc 23:59:59)
function weekDeadline(w, classOrId) {
  const start = classStartDate(classOrId);
  // Tuần 1 = start + 7 ngày; Tuần w = start + w * 7 ngày
  const d = new Date(start.getTime() + (w * 7) * 24 * 3600 * 1000);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isLate(submittedAt, w, classOrId) {
  if (!submittedAt) return false;
  return new Date(submittedAt) > weekDeadline(w, classOrId);
}

// Auth guard
function requireAuth(redirectToLogin = true) {
  const u = DB.session();
  if (!u && redirectToLogin) window.location.href = 'login.html';
  return u;
}
function logout() { DB.clearSession(); window.location.href = 'login.html'; }

// Toast
function showToast(msg, type='info') {
  let stack = document.getElementById('toast-stack');
  if (!stack) { stack = document.createElement('div'); stack.id = 'toast-stack'; stack.className = 'toast-stack'; document.body.appendChild(stack); }
  const t = document.createElement('div');
  const icons = {success:'✅', error:'❌', warning:'⚠️', info:'ℹ️'};
  t.className = `toast toast-${type==='error'?'error':type==='success'?'success':type==='warning'?'warning':'info'}`;
  t.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  stack.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 3500);
}

// Modal helpers
function openModal(id)  { const m = document.getElementById(id); if (m) { m.classList.add('open'); document.body.style.overflow='hidden'; } }
function closeModal(id) { const m = document.getElementById(id); if (m) { m.classList.remove('open'); document.body.style.overflow=''; } }
document.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay')) { e.target.classList.remove('open'); document.body.style.overflow=''; } });

// Navigate
function navigate(url) { window.location.href = url; }

// ── SEED DATA ────────────────────────────────────────────────
function seedIfNeeded(force = false) {
  const users = DB.users();
  const classes = DB.classes();
  const hasClasses = classes.length > 0;
  const hasNewUser = users.some(u => u.email === 'gv1@edu.vn');

  // Cập nhật tài khoản tác giả u3 (Lê Văn Quân) có email Google và MSSV nếu chưa có
  const existingUsers = DB.users();
  const u3Idx = existingUsers.findIndex(u => u.id === 'u3');
  if (u3Idx >= 0 && (!existingUsers[u3Idx].email.includes('gmail') || !existingUsers[u3Idx].mssv)) {
    existingUsers[u3Idx].email = 'lethiquan01@gmail.com';
    existingUsers[u3Idx].originalEmail = 'lethiquan01@gmail.com';
    existingUsers[u3Idx].mssv = '202414324';
    _set(K.USERS, existingUsers);
  }

  // Nếu người dùng đã từng khởi tạo dữ liệu hoặc đã có lớp/người dùng, không tự động nạp lại mẫu gây trùng lặp
  const hasSeededBefore = localStorage.getItem('ktpmud_seeded');
  if (!force && (hasSeededBefore || users.length > 0 || hasClasses)) return;
  localStorage.setItem('ktpmud_seeded', 'true');

  // Users (Phân tách rõ sinh viên thuộc từng lớp học: c1 = K68A, c2 = K68B)
  _set(K.USERS, [
    { id:'u1', name:'TS. Hoàng Quang Huy',  email:'gv1@edu.vn', password:'123456', role:'giaovien', classId:null },
    { id:'u2', name:'PGS. Nguyễn Thị Lan',  email:'gv2@edu.vn', password:'123456', role:'giaovien', classId:null },
    { id:'u3', name:'Lê Văn Quân',          email:'lethiquan01@gmail.com', password:'123456', role:'nhomt', classId:'c1', mssv:'202414324', originalEmail:'lethiquan01@gmail.com' },
    { id:'u4', name:'Đỗ Xuân Nguyện',       email:'doxuannguyen29@gmail.com', password:'123456', role:'sinhvien', classId:'c1', mssv:'202414288', originalEmail:'doxuannguyen29@gmail.com' },
    { id:'u5', name:'Trần Thị Mai',          email:'sv2@edu.vn', password:'123456', role:'sinhvien', classId:'c1' },
    { id:'u6', name:'Phạm Minh Tú',          email:'nt2@edu.vn', password:'123456', role:'nhomt',    classId:'c1' },
    { id:'u7', name:'Nguyễn Bảo Châu',       email:'sv3@edu.vn', password:'123456', role:'sinhvien', classId:'c1' },
    { id:'u8', name:'Hoàng Thị Hà',          email:'sv4@edu.vn', password:'123456', role:'sinhvien', classId:'c1' },
    { id:'u9', name:'Vũ Công Đức',           email:'nt3@edu.vn', password:'123456', role:'nhomt',    classId:'c2' },
    { id:'u10',name:'Bùi Thị Lan',           email:'sv5@edu.vn', password:'123456', role:'sinhvien', classId:'c2' },
    { id:'u11',name:'Cao Văn Nam',           email:'sv6@edu.vn', password:'123456', role:'sinhvien', classId:'c2' },
    { id:'u12',name:'Đinh Thị Thảo',         email:'sv7@edu.vn', password:'123456', role:'sinhvien', classId:'c2' },
  ]);

  // Classes
  _set(K.CLASSES, [
    { id:'c1', name:'KTPMUD – K68A', code:'IT4082E-A', semester:'HK1 2026-2027', lecturerId:'u1', totalWeeks:16, semStart:'2026-08-17', createdAt:'2026-08-17', active:true },
    { id:'c2', name:'KTPMUD – K68B', code:'IT4082E-B', semester:'HK1 2026-2027', lecturerId:'u1', totalWeeks:16, semStart:'2026-08-17', createdAt:'2026-08-17', active:true },
    { id:'c3', name:'KTPMUD – K67A', code:'IT4082E-A', semester:'HK2 2025-2026', lecturerId:'u2', totalWeeks:16, semStart:'2026-01-13', createdAt:'2026-01-13', active:false },
  ]);

  // Groups
  _set(K.GROUPS, [
    { id:'g_nh_m_19', classId:'c1', name:'Nhóm 19', project:'Hệ thống quản lý tiến độ project KTPMUD', tech:'React · Node.js · PostgreSQL', leaderId:'u3', members:['u3','u4','u5'], createdAt:'2026-08-20', description:'Xây dựng nền tảng web quản lý tiến độ dự án cho môn KTPMUD, tích hợp kanban, báo cáo tuần và hệ thống chấm điểm.' },
    { id:'g2', classId:'c1', name:'Nhóm 20', project:'Ứng dụng đặt lịch phòng học thông minh',  tech:'Vue.js · Laravel · MySQL',      leaderId:'u6', members:['u6','u7','u8'], createdAt:'2026-08-20', description:'Phát triển ứng dụng đặt lịch phòng học, quản lý tài nguyên và thông báo tự động.' },
    { id:'g3', classId:'c2', name:'Nhóm 01', project:'Chatbot hỗ trợ sinh viên đại học',         tech:'Angular · Spring Boot · MongoDB', leaderId:'u9', members:['u9','u10','u11','u12'], createdAt:'2026-08-20', description:'Phát triển chatbot AI hỗ trợ sinh viên tra cứu thông tin, đăng ký môn học.' },
  ]);

  // Tasks (Kanban) for group 1
  const now = new Date();
  _set(K.TASKS, [
    { id:'t1', groupId:'g_nh_m_19', title:'Phân tích yêu cầu hệ thống', desc:'Khảo sát nhu cầu, viết SRS', status:'done', assignee:'u4', deadline:'2026-09-05', createdBy:'u3', createdAt:'2026-08-21', doneAt:'2026-09-04', priority:'high' },
    { id:'t2', groupId:'g_nh_m_19', title:'Thiết kế database schema', desc:'Vẽ ERD, viết DDL', status:'done', assignee:'u3', deadline:'2026-09-12', createdBy:'u3', createdAt:'2026-08-21', doneAt:'2026-09-11', priority:'high' },
    { id:'t3', groupId:'g_nh_m_19', title:'Xây dựng API backend', desc:'Express + JWT + PostgreSQL', status:'doing', assignee:'u3', deadline:'2026-10-15', createdBy:'u3', createdAt:'2026-09-01', doneAt:null, priority:'high' },
    { id:'t4', groupId:'g_nh_m_19', title:'Xây dựng giao diện frontend', desc:'React + Tailwind, responsive', status:'doing', assignee:'u5', deadline:'2026-10-18', createdBy:'u3', createdAt:'2026-09-01', doneAt:null, priority:'medium' },
    { id:'t5', groupId:'g_nh_m_19', title:'Module Kanban board', desc:'Drag & drop, cập nhật realtime', status:'todo', assignee:'u4', deadline:'2026-10-25', createdBy:'u3', createdAt:'2026-09-15', doneAt:null, priority:'medium' },
    { id:'t6', groupId:'g_nh_m_19', title:'Module xuất báo cáo Excel', desc:'Dùng SheetJS', status:'todo', assignee:'u5', deadline:'2026-10-28', createdBy:'u3', createdAt:'2026-09-15', doneAt:null, priority:'low' },
    { id:'t7', groupId:'g_nh_m_19', title:'Viết tài liệu kỹ thuật', desc:'API docs, README', status:'review', assignee:'u4', deadline:'2026-10-13', createdBy:'u3', createdAt:'2026-10-01', doneAt:null, priority:'medium' },
    // group 2
    { id:'t8', groupId:'g2', title:'Thiết kế UI/UX Figma', desc:'Wireframe + prototype', status:'done', assignee:'u7', deadline:'2026-09-10', createdBy:'u6', createdAt:'2026-08-22', doneAt:'2026-09-09', priority:'high' },
    { id:'t9', groupId:'g2', title:'Cài đặt Laravel backend', desc:'Auth, CRUD phòng học', status:'doing', assignee:'u6', deadline:'2026-10-20', createdBy:'u6', createdAt:'2026-09-05', doneAt:null, priority:'high' },
  ]);

  // Reports for group 1 (weeks 1-8)
  const SEMESTER_START = new Date('2026-08-17T00:00:00Z');
  const reps = [];
  for (let w = 1; w <= 8; w++) {
    reps.push({
      id: `r${w}`,
      groupId: 'g1',
      week: w,
      summary: `Tuần ${w}: ${['Khảo sát và phân tích yêu cầu','Thiết kế database ERD','Cài đặt project structure','Phát triển API authentication','Xây dựng dashboard UI','Module báo cáo tuần','Module chấm điểm GV','Testing và sửa lỗi'][w-1]}`,
      files: [
        { name: `baocao_tuan${w}.docx`, size: Math.round(Math.random()*500+200)*1024, type: 'docx' },
        ...(w % 2 === 0 ? [{ name: `slide_tuan${w}.pptx`, size: Math.round(Math.random()*2000+500)*1024, type: 'pptx' }] : []),
      ],
      submittedAt: new Date(SEMESTER_START.getTime() + (w*7-1)*24*3600*1000).toISOString(),
      submittedBy: 'u3',
      status: w <= 7 ? 'graded' : 'submitted',
      grade: w <= 7 ? parseFloat((7 + w * 0.2).toFixed(1)) : null,
      feedback: w <= 7 ? 'Báo cáo đầy đủ và chi tiết. Nhóm làm việc tích cực. Cần bổ sung thêm biểu đồ minh họa.' : null,
      gradedAt: w <= 7 ? new Date(SEMESTER_START.getTime() + (w*7+2)*24*3600*1000).toISOString() : null,
    });
  }
  // Group 2: weeks 1-5
  for (let w = 1; w <= 5; w++) {
    reps.push({ id:`r2${w}`, groupId:'g2', week:w, summary:`Tuần ${w}: Tiến độ phát triển ứng dụng đặt lịch phòng học`, files:[{name:`report_w${w}.docx`, size:300*1024, type:'docx'}], submittedAt: new Date(SEMESTER_START.getTime()+(w*7)*24*3600*1000).toISOString(), submittedBy:'u6', status: w<=4?'graded':'submitted', grade:w<=4?parseFloat((6.5+w*0.3).toFixed(1)):null, feedback:w<=4?'Nhóm cần bổ sung thêm tiến độ chi tiết hơn.':null, gradedAt:null });
  }
  _set(K.REPORTS, reps);

  // Products (Sản phẩm cuối kỳ mẫu)
  _set(K.PRODUCTS, [
    {
      id: 'p1',
      groupId: 'g1',
      name: 'Hệ thống Quản lý Tiến độ Project (KTPMUD)',
      description: 'Hệ thống web hoàn chỉnh hỗ trợ giảng viên theo dõi tiến độ đồ án phần mềm theo từng tuần, quản lý Kanban cá nhân, nộp báo cáo kèm slide và bảng điểm tự động hóa.',
      github: 'https://github.com/levanquan-070106/KTPM',
      demo: 'https://ktpm-gwde.onrender.com',
      video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      selfScore: 9.0,
      files: [
        { name: 'BaoCao_CuoiKy_Nhom01.docx', size: 1250000, type: 'docx' },
        { name: 'Slide_ThuyetTrinh_KTPMUD.pptx', size: 3450000, type: 'pptx' },
        { name: 'KienTruc_HeThong_API.pdf', size: 850000, type: 'pdf' }
      ],
      submittedAt: new Date().toISOString(),
      submittedBy: 'u3',
      grade: 9.2,
      feedback: 'Sản phẩm hoàn thiện xuất sắc. Giao diện trực quan, tính năng phân quyền nhóm rõ ràng và tích hợp đầy đủ quy trình kiểm thử.',
      gradedAt: new Date().toISOString()
    },
    {
      id: 'p2',
      groupId: 'g2',
      name: 'Ứng dụng Đặt lịch và Quản lý Phòng học Thông minh',
      description: 'Ứng dụng di động và web portal quản lý việc mượn và đặt trước phòng thực hành công nghệ thông tin cho sinh viên và cán bộ giảng dạy.',
      github: 'https://github.com/example/room-booking-ktpm',
      demo: 'https://room-booking-demo.vercel.app',
      video: '',
      selfScore: 8.5,
      files: [
        { name: 'BaoCao_NghiemThu_Nhom02.docx', size: 980000, type: 'docx' },
        { name: 'Slide_Demo_RoomBooking.pptx', size: 2100000, type: 'pptx' }
      ],
      submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      submittedBy: 'u6',
      grade: null,
      feedback: null,
      gradedAt: null
    }
  ]);

  // Grades
  _set(K.GRADES, [
    { groupId:'g_nh_m_19', processScore:8.2, midtermScore:7.5, finalScore:null, totalScore:null, note:'', gradedBy:'u1', gradedAt:null },
    { groupId:'g2', processScore:7.0, midtermScore:6.5, finalScore:null, totalScore:null, note:'', gradedBy:'u1', gradedAt:null },
  ]);

  console.log('✅ Seed data initialized');
}

// Đồng bộ dữ liệu 2 chiều thông minh giữa Trình duyệt và SQLite Server
async function syncFromSQLite(silent = false) {
  if (typeof window === 'undefined' || !location.protocol.startsWith('http')) return;
  try {
    const res = await _api('/api/bootstrap');
    if (res && res.success && res.data) {
      const serverTs = Number(res.updatedAt || 0);
      const localTs = Number(localStorage.getItem(K.UPDATED_AT) || 0);

      // Luôn gộp người dùng mới từ server (đặc biệt là tài khoản đăng ký qua Google đang chờ duyệt)
      const serverUsers = res.data.users || [];
      const localUsers = DB.users();
      const localMap = new Map();
      localUsers.forEach(u => localMap.set(u.id, u));
      serverUsers.forEach(su => {
        if (!localMap.has(su.id)) {
          localMap.set(su.id, {
            ...su,
            classId: su.classId || null
          });
        } else {
          const ex = localMap.get(su.id);
          if (su.originalEmail && !ex.originalEmail) ex.originalEmail = su.originalEmail;
          if (su.classId && !ex.classId) ex.classId = su.classId;
        }
      });
      const normalizedLocalUsers = Array.from(localMap.values()).map(u => ({
        ...u,
        classId: (u.role === 'sinhvien' || u.role === 'nhomt') ? (u.classId || DB.userClassId(u)) : null
      }));
      _set(K.USERS, normalizedLocalUsers);

      // Nếu Server vừa thức dậy sau ngủ đông (serverTs < localTs) và trình duyệt đang giữ bản lưu mới hơn:
      // Tự động đẩy ngược dữ liệu từ trình duyệt lên khôi phục lại SQLite Server!
      if (localTs > serverTs && normalizedLocalUsers.length > 0) {
        await _api('/api/restore', 'POST', {
          updatedAt: localTs,
          data: {
            users: normalizedLocalUsers,
            classes: DB.classes(),
            groups: DB.groups(),
            tasks: DB.tasks(),
            reports: DB.reports(),
            products: DB.products(),
            grades: DB.grades()
          }
        });
      } else {
        // Ngược lại, cập nhật dữ liệu mới nhất từ Server về trình duyệt
        _set(K.CLASSES, res.data.classes);
        _set(K.GROUPS, res.data.groups);
        const normalizedServerUsers = (res.data.users || []).map(u => ({
          ...u,
          classId: u.classId || ((u.role === 'sinhvien' || u.role === 'nhomt') ? DB.userClassId(u) : null)
        }));
        _set(K.USERS, normalizedServerUsers);
        _set(K.TASKS, res.data.tasks);
        _set(K.REPORTS, res.data.reports);
        _set(K.PRODUCTS, res.data.products);
        _set(K.GRADES, res.data.grades);
        if (serverTs > 0) {
          localStorage.setItem(K.UPDATED_AT, String(serverTs));
        }

        // Kiểm tra lớp hiện tại có còn tồn tại không
        const curCid = localStorage.getItem(K.CUR_CLASS);
        if (!curCid || (curCid !== 'all' && !res.data.classes.some(c => c.id === curCid))) {
          const firstClass = res.data.classes[0]?.id || 'all';
          localStorage.setItem(K.CUR_CLASS, firstClass);
        }
      }

      // Cập nhật lại session người dùng hiện tại nếu vừa được duyệt lớp hoặc đổi quyền (tuyệt đối không gọi location.reload() để tránh loop)
      const curSess = DB.session();
      if (curSess) {
        const serverUsers = res.data.users || [];
        const candidates = serverUsers.filter(u => 
          (curSess.id && u.id === curSess.id) || 
          (u.email && u.email.toLowerCase() === curSess.email?.toLowerCase()) || 
          (u.originalEmail && u.originalEmail.toLowerCase() === curSess.email?.toLowerCase())
        );

        // Nếu tài khoản đã bị Giảng viên xóa khỏi Server
        if (serverUsers.length > 0 && candidates.length === 0 && curSess.role !== 'giaovien') {
          DB.clearSession();
          alert('⚠️ Tài khoản này đã bị xóa khỏi hệ thống bởi Giảng viên!');
          window.location.href = 'login.html';
          return;
        }

        candidates.sort((a, b) => {
          const aHas = Boolean(DB.userClassId(a));
          const bHas = Boolean(DB.userClassId(b));
          if (aHas === bHas) return 0;
          return aHas ? -1 : 1;
        });
        const fresh = candidates[0];
        if (fresh) {
          DB.setSession({ ...curSess, ...fresh });
        }
      }

      // Cập nhật lại giao diện ngay sau khi đồng bộ xong (chỉ khi không ở chế độ silent và không có input đang nhập)
      if (!silent && !document.getElementById('req-mssv')) {
        if (typeof window.render === 'function') {
          try { window.render(); } catch (e) { console.warn('Re-render error:', e); }
        }
        if (typeof window.updateTableAndFilters === 'function') {
          try { window.updateTableAndFilters(); } catch (e) {}
        }
      }
    }
  } catch (err) {
    console.warn('Sync SQLite failed:', err);
  }
}

if (typeof window !== 'undefined') {
  window.syncFromSQLite = syncFromSQLite;
  if (location.protocol.startsWith('http')) {
    syncFromSQLite();
  }
}



