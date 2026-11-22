// ═══════════════════════════════════════════════════════════
//  KTPMUD – Layout Builder (Sidebar + Topbar)
// ═══════════════════════════════════════════════════════════

function getNavConfig(userOrRole) {
  const user = typeof userOrRole === 'object' ? userOrRole : DB.session();
  const role = user?.role || (typeof userOrRole === 'string' ? userOrRole : 'sinhvien');
  const isConfirmed = role === 'giaovien' || Boolean(DB.userClassId(user));

  const all = [
    { id:'dashboard', icon:'⊞', label:'Tổng quan', href:'dashboard.html' },
  ];

  // Nếu tài khoản Google chưa được xác nhận qua file Excel hoặc Giảng viên/Nhóm trưởng
  if (!isConfirmed) {
    return [
      ...all,
      { section:'HƯỚNG DẪN' },
      { id:'guide', icon:'📖', label:'HD sử dụng & Giới thiệu', href:'guide.html' }
    ];
  }

  const gvItems = [
    { section:'QUẢN LÝ LỚP' },
    { id:'classes',  icon:'🏫', label:'Lớp học',        href:'classes.html' },
    { id:'groups',   icon:'👥', label:'Nhóm dự án',     href:'groups.html' },
    { id:'students', icon:'🎓', label:'Sinh viên',       href:'students.html' },
    { section:'BÁO CÁO & ĐIỂM' },
    { id:'reports',  icon:'📋', label:'Báo cáo tuần',   href:'reports.html' },
    { id:'product',  icon:'📦', label:'Sản phẩm cuối kỳ', href:'product.html' },
    { id:'grading',  icon:'✍️', label:'Nhập điểm',      href:'grading.html' },
    { id:'gradebook',icon:'📊', label:'Bảng điểm',      href:'gradebook.html' },
    { section:'HỆ THỐNG' },
    { id:'users',    icon:'⚙️', label:'Tài khoản',      href:'users.html' },
    { section:'TRỢ GIÚP' },
    { id:'guide',    icon:'📖', label:'HD sử dụng & Giới thiệu', href:'guide.html' },
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
    { section:'TRỢ GIÚP' },
    { id:'guide',    icon:'📖', label:'HD sử dụng & Giới thiệu', href:'guide.html' },
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
    { section:'TRỢ GIÚP' },
    { id:'guide',    icon:'📖', label:'HD sử dụng & Giới thiệu', href:'guide.html' },
  ];
  const byRole = { giaovien:[...all,...gvItems], nhomt:[...all,...ntItems], sinhvien:[...all,...svItems] };
  return byRole[role] || all;
}

function buildSidebar(user, pageId) {
  const nav = getNavConfig(user);
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

function getNotifications(user) {
  if (!user) return [];
  const notifs = [];
  const isGV = user.role === 'giaovien';

  if (isGV) {
    // 1. Sinh viên / tài khoản chờ duyệt
    const unassigned = DB.users().filter(u => u.role !== 'giaovien' && !DB.userClassId(u));
    if (unassigned.length > 0) {
      notifs.push({
        id: 'unassigned-users',
        icon: '⏳',
        title: 'Tài khoản chờ phê duyệt',
        desc: `Có ${unassigned.length} tài khoản mới xin vào lớp đang chờ duyệt`,
        link: 'users.html',
        time: 'Cần xử lý'
      });
    }

    // 2. Báo cáo tuần chờ chấm
    const pendingReports = DB.reports().filter(r => r.status === 'submitted');
    if (pendingReports.length > 0) {
      notifs.push({
        id: 'pending-reports',
        icon: '📋',
        title: 'Báo cáo tuần chờ chấm điểm',
        desc: `Có ${pendingReports.length} báo cáo tuần từ các nhóm sinh viên đang chờ chấm`,
        link: 'reports.html',
        time: 'Báo cáo mới'
      });
    }

    // 3. Sản phẩm cuối kỳ chờ nghiệm thu
    const products = DB.products().filter(p => !p.grade);
    if (products.length > 0) {
      notifs.push({
        id: 'pending-products',
        icon: '📦',
        title: 'Sản phẩm cuối kỳ chờ chấm',
        desc: `Có ${products.length} nhóm đã nộp sản phẩm cuối kỳ`,
        link: 'grading.html',
        time: 'Cuối kỳ'
      });
    }
  } else {
    // Sinh viên & Nhóm trưởng
    const myGrp = DB.groupOfUser(user.id);
    const uCid = DB.userClassId(user);
    const cls = uCid ? DB.findClass(uCid) : null;

    if (cls) {
      notifs.push({
        id: 'cls-info',
        icon: '🏫',
        title: 'Lớp học hiện tại',
        desc: `Bạn đang ở lớp ${cls.name} (${cls.semester})`,
        link: 'dashboard.html',
        time: 'Đã kích hoạt'
      });
    }

    if (myGrp) {
      const graded = DB.reportsByGroup(myGrp.id).filter(r => r.status === 'graded');
      if (graded.length > 0) {
        const last = graded[graded.length - 1];
        notifs.push({
          id: `grade-w${last.week}`,
          icon: '⭐',
          title: `Đã có điểm báo cáo tuần ${last.week}`,
          desc: `Giảng viên đã chấm: ${last.grade}/10${last.feedback ? ` - "${last.feedback}"` : ''}`,
          link: 'reports.html',
          time: 'Điểm mới'
        });
      }

      const w = typeof currentWeek === 'function' ? currentWeek(uCid) : 1;
      const rep = DB.reportByGroupWeek(myGrp.id, w);
      if (!rep || rep.status === 'draft') {
        notifs.push({
          id: `remind-w${w}`,
          icon: '⏰',
          title: `Nhắc nộp báo cáo tuần ${w}`,
          desc: `Tuần ${w} chưa nộp báo cáo. Hãy hoàn thành báo cáo đính kèm file!`,
          link: 'reports.html',
          time: 'Nhắc nhở'
        });
      }
    } else if (user.requestedClassId) {
      const rCls = DB.findClass(user.requestedClassId);
      notifs.push({
        id: 'pending-cls',
        icon: '⏳',
        title: 'Đang chờ duyệt vào lớp',
        desc: `Yêu cầu xin vào lớp ${rCls ? rCls.name : ''} đang chờ Giảng viên phê duyệt`,
        link: 'dashboard.html',
        time: 'Đang chờ'
      });
    }
  }
  return notifs;
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

  const notifs = getNotifications(user);

  return `
    <header class="topbar">
      <div class="topbar-title">${title}</div>
      ${classEl}
      <div class="topbar-actions">
        <a href="guide.html" class="btn btn-secondary btn-sm" style="display:inline-flex;align-items:center;text-decoration:none;font-weight:600;font-size:12px;padding:6px 11px">
          Giới thiệu & Hướng dẫn
        </a>
        <div style="position:relative">
          <button class="topbar-icon-btn" onclick="toggleNotifications(event)" title="Thông báo" style="position:relative">
            🔔
            ${notifs.length > 0 ? `<span style="position:absolute;top:5px;right:5px;width:8px;height:8px;background:#ef4444;border-radius:50%;border:1.5px solid #fff"></span>` : ''}
          </button>
          <div id="notif-dropdown" style="display:none;position:absolute;right:0;top:44px;width:320px;background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);box-shadow:0 12px 30px rgba(0,0,0,0.15);z-index:9999;overflow:hidden">
            <div style="padding:12px 16px;background:var(--gray-50);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
              <strong style="font-size:13px;color:var(--gray-900)">🔔 Thông báo (${notifs.length})</strong>
              <span class="badge ${notifs.length > 0 ? 'badge-black' : 'badge-gray'}" style="font-size:10px">${notifs.length > 0 ? 'Mới' : 'Trống'}</span>
            </div>
            <div style="max-height:360px;overflow-y:auto">
              ${notifs.length === 0 ? `
                <div style="padding:28px 16px;text-align:center;color:var(--text-muted);font-size:13px">
                  🎉 Không có thông báo mới nào
                </div>
              ` : notifs.map(n => `
                <div onclick="navigate('${n.link}')" style="padding:11px 16px;display:flex;gap:12px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .15s" onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background='transparent'">
                  <div style="font-size:20px;line-height:1;margin-top:2px">${n.icon}</div>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13px;font-weight:700;color:var(--gray-900);margin-bottom:3px">${n.title}</div>
                    <div style="font-size:12px;color:var(--text-secondary);line-height:1.4">${n.desc}</div>
                    <div style="font-size:10.5px;color:var(--gray-500);margin-top:4px;font-weight:600">${n.time}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="avatar" style="background:${avatarBg(user.name)};cursor:pointer" title="${user.name}">${getInitials(user.name)}</div>
      </div>
    </header>`;
}

window.toggleNotifications = function(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const d = document.getElementById('notif-dropdown');
  if (d) {
    d.style.display = (d.style.display === 'none' || !d.style.display) ? 'block' : 'none';
  }
};

document.addEventListener('click', e => {
  const d = document.getElementById('notif-dropdown');
  if (d && d.style.display === 'block') {
    if (!e.target.closest('#notif-dropdown') && !e.target.closest('.topbar-icon-btn')) {
      d.style.display = 'none';
    }
  }
});

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

  // Kiểm tra tài khoản đã được xác nhận vào lớp học chưa (qua file Excel, GV hoặc Nhóm trưởng)
  const isConfirmed = user.role === 'giaovien' || Boolean(DB.userClassId(user));
  if (!isConfirmed && pageId !== 'dashboard' && pageId !== 'guide') {
    window.location.href = 'dashboard.html';
    return null;
  }

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
