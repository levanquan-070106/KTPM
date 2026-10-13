// ═══════════════════════════════════════════════════════════
//  KTPMUD – Layout Builder (Sidebar + Topbar)
// ═══════════════════════════════════════════════════════════

function getNavConfig(role) {
  const all = [
    { id:'dashboard', icon:'⊞', label:'Tổng quan', href:'dashboard.html' },
  ];
  const gvItems = [
    { section:'QUẢN LÝ LỚP' },
    { id:'classes',  icon:'🏫', label:'Lớp học',        href:'classes.html' },
    { id:'groups',   icon:'👥', label:'Nhóm dự án',     href:'groups.html' },
    { id:'students', icon:'🎓', label:'Sinh viên',       href:'students.html' },
    { section:'BÁO CÁO & ĐIỂM' },
    { id:'reports',  icon:'📋', label:'Báo cáo tuần',   href:'reports.html' },
    { id:'grading',  icon:'✍️', label:'Nhập điểm',      href:'grading.html' },
    { id:'gradebook',icon:'📊', label:'Bảng điểm',      href:'gradebook.html' },
    { section:'HỆ THỐNG' },
    { id:'users',    icon:'⚙️', label:'Tài khoản',      href:'users.html' },
  ];
  const ntItems = [
    { section:'NHÓM CỦA TÔI' },
    { id:'mygroup',  icon:'👥', label:'Nhóm của tôi',   href:'mygroup.html' },
    { id:'kanban',   icon:'⬜', label:'Kanban Board',    href:'kanban.html' },
    { id:'members',  icon:'👤', label:'Thành viên',      href:'members.html' },
    { section:'BÁO CÁO' },
    { id:'reports',  icon:'📋', label:'Báo cáo tuần',   href:'reports.html' },
    { id:'product',  icon:'📦', label:'Sản phẩm cuối kỳ', href:'product.html' },
    { section:'KẾT QUẢ' },
    { id:'grades',   icon:'🏆', label:'Điểm số',        href:'grades.html' },
  ];
  const svItems = [
    { section:'DỰ ÁN' },
    { id:'mygroup',  icon:'👥', label:'Nhóm của tôi',   href:'mygroup.html' },
    { id:'kanban',   icon:'⬜', label:'Kanban Board',    href:'kanban.html' },
    { section:'BÁO CÁO' },
    { id:'reports',  icon:'📋', label:'Báo cáo tuần',   href:'reports.html' },
    { id:'product',  icon:'📦', label:'Sản phẩm cuối kỳ', href:'product.html' },
    { section:'KẾT QUẢ' },
    { id:'grades',   icon:'🏆', label:'Điểm số',        href:'grades.html' },
  ];
  const byRole = { giaovien:[...all,...gvItems], nhomt:[...all,...ntItems], sinhvien:[...all,...svItems] };
  return byRole[role] || all;
}

function buildSidebar(user, pageId) {
  const nav = getNavConfig(user.role);
  const navHtml = nav.map(item => {
    if (item.section) return `<div class="sidebar-section-label">${item.section}</div>`;
    const active = item.id === pageId ? 'active' : '';
    const badge = item.badge ? `<span class="ni-badge">${item.badge}</span>` : '';
    return `<div class="nav-item ${active}" onclick="navigate('${item.href}')">
      <span class="ni-icon">${item.icon}</span>
      <span>${item.label}</span>
      ${badge}
    </div>`;
  }).join('');

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="logo-mark">📐</div>
        <div>
          <div class="logo-text">KTPMUD</div>
          <div class="logo-sub">Quản lý Dự án</div>
        </div>
      </div>
      <nav class="sidebar-nav">${navHtml}</nav>
      <div class="sidebar-bottom">
        <div class="sidebar-user">
          <div class="avatar" style="background:${avatarBg(user.name)}">${getInitials(user.name)}</div>
          <div class="su-info">
            <div class="su-name">${user.name}</div>
            <div class="su-role">${roleLabel(user.role)}</div>
          </div>
          <button class="btn-logout" onclick="logout()" title="Đăng xuất">⏻</button>
        </div>
      </div>
    </aside>`;
}

function buildTopbar(user, title) {
  // Class selector for lecturer
  let classEl = '';
  if (user.role === 'giaovien') {
    const classes = DB.classes().filter(c => c.lecturerId === user.id);
    const rawCur = localStorage.getItem(K.CUR_CLASS);
    const curId = (rawCur === 'all' || classes.some(c => c.id === rawCur)) ? rawCur : (classes[0]?.id || 'all');
    if (!rawCur && classes[0]) DB.setCurClass(classes[0].id);
    classEl = `<div class="topbar-class">
      🏫
      <select id="class-switcher" onchange="switchClass(this.value)">
        ${classes.map(c => `<option value="${c.id}" ${c.id===curId?'selected':''}>${c.name}</option>`).join('')}
        <option value="all" ${curId==='all'?'selected':''}>🌐 Tất cả các lớp (${classes.length})</option>
      </select>
    </div>`;
  } else {
    const uCid = DB.userClassId(user);
    const cls = uCid ? DB.findClass(uCid) : null;
    if (cls) classEl = `<div class="topbar-class">🏫 <span>${cls.name}</span></div>`;
  }

  return `
    <header class="topbar">
      <div class="topbar-title">${title}</div>
      ${classEl}
      <div class="topbar-actions">
        <button class="topbar-icon-btn" title="Thông báo">🔔</button>
        <div class="avatar" style="background:${avatarBg(user.name)};cursor:pointer" title="${user.name}">${getInitials(user.name)}</div>
      </div>
    </header>`;
}

function switchClass(classId) {
  DB.setCurClass(classId);
  const sel = document.getElementById('class-switcher');
  if (sel) sel.value = classId || 'all';
  if (typeof window.render === 'function') {
    window.render();
  } else {
    location.reload();
  }
}

// ── Main init function ──────────────────────────────────────
function initPage(title, pageId) {
  const user = requireAuth();
  if (!user) return null;

  const sidebar = buildSidebar(user, pageId);
  const topbar  = buildTopbar(user, title);

  const root = document.getElementById('app');
  if (!root) return user;

  const inner = root.innerHTML;
  root.outerHTML = `
    <div class="app-shell" id="app">
      ${sidebar}
      <main class="main">
        ${topbar}
        <div class="page" id="page-content">${inner}</div>
      </main>
    </div>`;

  return user;
}

// ── Excel Export (using SheetJS CDN) ───────────────────────
function exportExcel(data, headers, filename, sheetName='Sheet1') {
  if (typeof XLSX === 'undefined') {
    showToast('Đang tải thư viện Excel...', 'info');
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => doExport(data, headers, filename, sheetName);
    document.head.appendChild(s);
    return;
  }
  doExport(data, headers, filename, sheetName);
}

function doExport(data, headers, filename, sheetName) {
  const ws = XLSX.utils.json_to_sheet(data, { header: headers });

  // Style header row
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) {
      ws[addr].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1F2937' } },
        alignment: { horizontal: 'center' }
      };
    }
  }

  // Auto column width
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 14) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
  showToast(`✅ Đã xuất file ${filename}`, 'success');
}
