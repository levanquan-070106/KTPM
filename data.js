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
const _set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

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
    let found = users.find(u => u.email.toLowerCase() === q);
    if (found) return found;
    const userPart = q.split('@')[0];
    return users.find(u => u.email.toLowerCase().split('@')[0] === userPart);
  },
  findUserById(id) { return this.users().find(u => u.id === id); },
  userClassId(u) {
    if (!u) return null;
    if (typeof u === 'string') u = this.findUserById(u);
    if (!u) return null;
    if (u.classId) return u.classId;
    const grp = this.groupOfUser(u.id);
    if (grp?.classId) return grp.classId;
    if (['u3','u4','u5','u6','u7','u8'].includes(u.id)) return 'c1';
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
    _set(K.CLASSES, this.classes().filter(c => c.id !== id));
    _set(K.GROUPS,  this.groups().filter(g => g.classId !== id));
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

  // ─ Session ─
  session() { return _getObj(K.SESSION); },
  setSession(u) { _set(K.SESSION, u); },
  clearSession() { localStorage.removeItem(K.SESSION); },

  // ─ Current class ─
  curClassId() {
    const v = localStorage.getItem(K.CUR_CLASS);
    return (!v || v === 'all') ? null : v;
  },
  setCurClass(id) { localStorage.setItem(K.CUR_CLASS, id || 'all'); },
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

const SEMESTER_START = new Date('2026-08-17');
function currentWeek() {
  const diff = Math.floor((new Date() - SEMESTER_START) / (7*24*3600*1000)) + 1;
  return Math.max(1, Math.min(diff, 16));
}
function weekDeadline(w) {
  const d = new Date(SEMESTER_START.getTime() + (w*7 - 2)*24*3600*1000);
  d.setHours(23,59,59); return d;
}
function isLate(submittedAt, w) {
  return new Date(submittedAt) > weekDeadline(w);
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

  if (!force && users.length > 0 && hasClasses && hasNewUser) return;

  // Users (Phân tách rõ sinh viên thuộc từng lớp học: c1 = K68A, c2 = K68B)
  _set(K.USERS, [
    { id:'u1', name:'TS. Hoàng Quang Huy',  email:'gv1@edu.vn', password:'123456', role:'giaovien', classId:null },
    { id:'u2', name:'PGS. Nguyễn Thị Lan',  email:'gv2@edu.vn', password:'123456', role:'giaovien', classId:null },
    { id:'u3', name:'Lê Văn Quân',           email:'nt1@edu.vn', password:'123456', role:'nhomt',    classId:'c1' },
    { id:'u4', name:'Đỗ Xuân Nguyện',        email:'sv1@edu.vn', password:'123456', role:'sinhvien', classId:'c1' },
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
    { id:'g1', classId:'c1', name:'Nhóm 19', project:'Hệ thống quản lý tiến độ project KTPMUD', tech:'React · Node.js · PostgreSQL', leaderId:'u3', members:['u3','u4','u5'], createdAt:'2026-08-20', description:'Xây dựng nền tảng web quản lý tiến độ dự án cho môn KTPMUD, tích hợp kanban, báo cáo tuần và hệ thống chấm điểm.' },
    { id:'g2', classId:'c1', name:'Nhóm 20', project:'Ứng dụng đặt lịch phòng học thông minh',  tech:'Vue.js · Laravel · MySQL',      leaderId:'u6', members:['u6','u7','u8'], createdAt:'2026-08-20', description:'Phát triển ứng dụng đặt lịch phòng học, quản lý tài nguyên và thông báo tự động.' },
    { id:'g3', classId:'c2', name:'Nhóm 01', project:'Chatbot hỗ trợ sinh viên đại học',         tech:'Angular · Spring Boot · MongoDB', leaderId:'u9', members:['u9','u10','u11','u12'], createdAt:'2026-08-20', description:'Phát triển chatbot AI hỗ trợ sinh viên tra cứu thông tin, đăng ký môn học.' },
  ]);

  // Tasks (Kanban) for group 1
  const now = new Date();
  _set(K.TASKS, [
    { id:'t1', groupId:'g1', title:'Phân tích yêu cầu hệ thống', desc:'Khảo sát nhu cầu, viết SRS', status:'done', assignee:'u4', deadline:'2026-09-05', createdBy:'u3', createdAt:'2026-08-21', doneAt:'2026-09-04', priority:'high' },
    { id:'t2', groupId:'g1', title:'Thiết kế database schema', desc:'Vẽ ERD, viết DDL', status:'done', assignee:'u3', deadline:'2026-09-12', createdBy:'u3', createdAt:'2026-08-21', doneAt:'2026-09-11', priority:'high' },
    { id:'t3', groupId:'g1', title:'Xây dựng API backend', desc:'Express + JWT + PostgreSQL', status:'doing', assignee:'u3', deadline:'2026-10-15', createdBy:'u3', createdAt:'2026-09-01', doneAt:null, priority:'high' },
    { id:'t4', groupId:'g1', title:'Xây dựng giao diện frontend', desc:'React + Tailwind, responsive', status:'doing', assignee:'u5', deadline:'2026-10-18', createdBy:'u3', createdAt:'2026-09-01', doneAt:null, priority:'medium' },
    { id:'t5', groupId:'g1', title:'Module Kanban board', desc:'Drag & drop, cập nhật realtime', status:'todo', assignee:'u4', deadline:'2026-10-25', createdBy:'u3', createdAt:'2026-09-15', doneAt:null, priority:'medium' },
    { id:'t6', groupId:'g1', title:'Module xuất báo cáo Excel', desc:'Dùng SheetJS', status:'todo', assignee:'u5', deadline:'2026-10-28', createdBy:'u3', createdAt:'2026-09-15', doneAt:null, priority:'low' },
    { id:'t7', groupId:'g1', title:'Viết tài liệu kỹ thuật', desc:'API docs, README', status:'review', assignee:'u4', deadline:'2026-10-13', createdBy:'u3', createdAt:'2026-10-01', doneAt:null, priority:'medium' },
    // group 2
    { id:'t8', groupId:'g2', title:'Thiết kế UI/UX Figma', desc:'Wireframe + prototype', status:'done', assignee:'u7', deadline:'2026-09-10', createdBy:'u6', createdAt:'2026-08-22', doneAt:'2026-09-09', priority:'high' },
    { id:'t9', groupId:'g2', title:'Cài đặt Laravel backend', desc:'Auth, CRUD phòng học', status:'doing', assignee:'u6', deadline:'2026-10-20', createdBy:'u6', createdAt:'2026-09-05', doneAt:null, priority:'high' },
  ]);

  // Reports for group 1 (weeks 1-8)
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

  // Grades
  _set(K.GRADES, [
    { groupId:'g1', processScore:8.2, midtermScore:7.5, finalScore:null, totalScore:null, note:'', gradedBy:'u1', gradedAt:null },
    { groupId:'g2', processScore:7.0, midtermScore:6.5, finalScore:null, totalScore:null, note:'', gradedBy:'u1', gradedAt:null },
  ]);

  console.log('✅ Seed data initialized');
}

// Đồng bộ dữ liệu 2 chiều thông minh giữa Trình duyệt và SQLite Server
async function syncFromSQLite() {
  if (typeof window === 'undefined' || !location.protocol.startsWith('http')) return;
  try {
    const res = await _api('/api/bootstrap');
    if (res && res.success && res.data) {
      const serverTs = Number(res.updatedAt || 0);
      const localTs = Number(localStorage.getItem(K.UPDATED_AT) || 0);

      // Chuẩn hóa classId cho user trên trình duyệt nếu chưa có
      const normalizedLocalUsers = DB.users().map(u => ({
        ...u,
        classId: (u.role === 'sinhvien' || u.role === 'nhomt') ? DB.userClassId(u) : null
      }));
      if (normalizedLocalUsers.length > 0) _set(K.USERS, normalizedLocalUsers);

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

      // Cập nhật lại giao diện ngay sau khi đồng bộ xong
      if (typeof window.render === 'function') {
        try { window.render(); } catch (e) { console.warn('Re-render error:', e); }
      }
    }
  } catch (err) {
    console.warn('Sync SQLite failed:', err);
  }
}

if (typeof window !== 'undefined' && location.protocol.startsWith('http')) {
  syncFromSQLite();
}



