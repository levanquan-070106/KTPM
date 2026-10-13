const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const db = require('./db.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Thư mục uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
    cb(null, `${Date.now()}_${baseName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.docx', '.doc', '.pptx', '.ppt', '.pdf', '.xlsx', '.xls', '.zip', '.rar'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Định dạng ${ext} không được hỗ trợ!`));
  }
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve files
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(__dirname));

// ═══════════════════════════════════════════════════════════
//  API ROUTES – KẾT NỐI VỚI CƠ SỞ DỮ LIỆU SQLITE
// ═══════════════════════════════════════════════════════════

// Health check cho Keep-Alive chống ngủ đông
app.get('/api/health', (req, res) => {
  res.json({ ok: true, updatedAt: db.getUpdatedAt(), time: new Date().toISOString() });
});

// Helper lấy toàn bộ groups kèm mảng members
function getFullGroups() {
  const groups = db.prepare('SELECT id, class_id as classId, name, project, tech, leader_id as leaderId, description, created_at as createdAt FROM groups').all();
  const members = db.prepare('SELECT group_id as groupId, user_id as userId FROM group_members').all();
  return groups.map(g => ({
    ...g,
    members: members.filter(m => m.groupId === g.id).map(m => m.userId)
  }));
}

// 1. Bootstrap: Lấy toàn bộ dữ liệu ban đầu cho client
app.get('/api/bootstrap', (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, password, role, class_id as classId FROM users').all();
    const classes = db.prepare('SELECT id, name, code, semester, lecturer_id as lecturerId, total_weeks as totalWeeks, sem_start as semStart, active, created_at as createdAt FROM classes').all()
      .map(c => ({ ...c, active: Boolean(c.active) }));
    const groups = getFullGroups();
    const tasks = db.prepare('SELECT id, group_id as groupId, title, desc, status, assignee, deadline, created_by as createdBy, created_at as createdAt, done_at as doneAt, priority FROM tasks').all();
    const reports = db.prepare('SELECT id, group_id as groupId, week, summary, plan, files, submitted_at as submittedAt, submitted_by as submittedBy, status, grade, feedback, graded_at as gradedAt FROM reports').all()
      .map(r => ({ ...r, files: JSON.parse(r.files || '[]') }));
    const products = db.prepare('SELECT id, group_id as groupId, name, description, github, demo, video, self_score as selfScore, files, submitted_at as submittedAt, submitted_by as submittedBy, grade, feedback, graded_at as gradedAt FROM products').all();
    const grades = db.prepare('SELECT group_id as groupId, process_score as processScore, midterm_score as midtermScore, final_score as finalScore, total_score as totalScore, note, graded_by as gradedBy, graded_at as gradedAt FROM grades').all();

    res.json({
      success: true,
      updatedAt: db.getUpdatedAt(),
      data: { users, classes, groups, tasks, reports, products, grades }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 1b. Auto-Restore: Tự động khôi phục dữ liệu từ client nếu server vừa thức dậy sau ngủ đông
app.post('/api/restore', (req, res) => {
  try {
    const { updatedAt, data } = req.body || {};
    const clientTs = Number(updatedAt) || 0;
    const serverTs = db.getUpdatedAt();

    if (!data || clientTs <= serverTs) {
      return res.json({ success: true, restored: false, updatedAt: serverTs });
    }

    db.exec('BEGIN');
    try {
      if (Array.isArray(data.users) && data.users.length > 0) {
        db.prepare('DELETE FROM users').run();
        const insU = db.prepare('INSERT INTO users (id, name, email, password, role, class_id) VALUES (?, ?, ?, ?, ?, ?)');
        data.users.forEach(u => insU.run(u.id, u.name, u.email, u.password || '123456', u.role, u.classId || null));
      }

      if (Array.isArray(data.classes)) {
        db.prepare('DELETE FROM classes').run();
        const insC = db.prepare('INSERT INTO classes (id, name, code, semester, lecturer_id, total_weeks, sem_start, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        data.classes.forEach(c => insC.run(c.id, c.name, c.code || '', c.semester || '', c.lecturerId, c.totalWeeks || 16, c.semStart || '', c.active ? 1 : 0, c.createdAt || new Date().toISOString()));
      }

      if (Array.isArray(data.groups)) {
        db.prepare('DELETE FROM group_members').run();
        db.prepare('DELETE FROM groups').run();
        const insG = db.prepare('INSERT INTO groups (id, class_id, name, project, tech, leader_id, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        const insM = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
        const updUClass = db.prepare('UPDATE users SET class_id = COALESCE(class_id, ?) WHERE id = ?');
        data.groups.forEach(g => {
          insG.run(g.id, g.classId, g.name, g.project || '', g.tech || '', g.leaderId || '', g.description || '', g.createdAt || new Date().toISOString());
          if (Array.isArray(g.members)) {
            g.members.forEach(uid => {
              insM.run(g.id, uid);
              updUClass.run(g.classId, uid);
            });
          }
        });
      }

      if (Array.isArray(data.tasks)) {
        db.prepare('DELETE FROM tasks').run();
        const insT = db.prepare('INSERT INTO tasks (id, group_id, title, desc, status, assignee, deadline, created_by, created_at, done_at, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        data.tasks.forEach(t => insT.run(t.id, t.groupId, t.title, t.desc || '', t.status || 'todo', t.assignee || '', t.deadline || null, t.createdBy || '', t.createdAt || new Date().toISOString(), t.doneAt || null, t.priority || 'medium'));
      }

      if (Array.isArray(data.reports)) {
        db.prepare('DELETE FROM reports').run();
        const insR = db.prepare('INSERT INTO reports (id, group_id, week, summary, plan, files, submitted_at, submitted_by, status, grade, feedback, graded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        data.reports.forEach(r => insR.run(r.id, r.groupId, r.week, r.summary || '', r.plan || '', JSON.stringify(r.files || []), r.submittedAt || new Date().toISOString(), r.submittedBy || '', r.status || 'submitted', r.grade ?? null, r.feedback ?? null, r.gradedAt ?? null));
      }

      if (Array.isArray(data.products)) {
        db.prepare('DELETE FROM products').run();
        const insP = db.prepare('INSERT INTO products (id, group_id, name, description, github, demo, video, self_score, files, submitted_at, submitted_by, grade, feedback, graded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        data.products.forEach(p => insP.run(p.id, p.groupId, p.name || '', p.description || '', p.github || '', p.demo || '', p.video || '', p.selfScore ?? null, typeof p.files === 'string' ? p.files : JSON.stringify(p.files || []), p.submittedAt || new Date().toISOString(), p.submittedBy || '', p.grade ?? null, p.feedback ?? null, p.gradedAt ?? null));
      }

      if (Array.isArray(data.grades)) {
        db.prepare('DELETE FROM grades').run();
        const insGr = db.prepare('INSERT INTO grades (group_id, process_score, midterm_score, final_score, total_score, note, graded_by, graded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        data.grades.forEach(gr => insGr.run(gr.groupId, gr.processScore ?? null, gr.midtermScore ?? null, gr.finalScore ?? null, gr.totalScore ?? null, gr.note || '', gr.gradedBy || '', gr.gradedAt ?? null));
      }

      db.setUpdatedAt(clientTs);
      db.exec('COMMIT');
      console.log(`♻️ Đã tự động khôi phục dữ liệu SQLite từ bản lưu trình duyệt (ts=${clientTs})`);
      res.json({ success: true, restored: true, updatedAt: clientTs });
    } catch (innerErr) {
      db.exec('ROLLBACK');
      throw innerErr;
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Auth: Đăng nhập
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });

    const q = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, name, email, password, role, class_id as classId FROM users WHERE LOWER(email) = ? OR LOWER(email) = ?').get(q, q.replace('@edu.vn', '@ktpmud.edu'));

    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng!' });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Users CRUD
app.post('/api/users', (req, res) => {
  try {
    const { id, name, email, password, role, classId } = req.body;
    db.prepare('INSERT INTO users (id, name, email, password, role, class_id) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, email, password, role, classId || null);
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts, message: 'Đã thêm người dùng' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/users/:id', (req, res) => {
  try {
    const { name, email, password, role, classId } = req.body;
    if (password) {
      db.prepare('UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), password = ?, role = COALESCE(?, role), class_id = COALESCE(?, class_id) WHERE id = ?')
        .run(name, email, password, role, classId ?? null, req.params.id);
    } else {
      db.prepare('UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role), class_id = COALESCE(?, class_id) WHERE id = ?')
        .run(name, email, role, classId ?? null, req.params.id);
    }
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    db.prepare('DELETE FROM group_members WHERE user_id = ?').run(req.params.id);
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Classes CRUD
app.post('/api/classes', (req, res) => {
  try {
    const { id, name, code, semester, lecturerId, totalWeeks, semStart, active, createdAt } = req.body;
    db.prepare('INSERT INTO classes (id, name, code, semester, lecturer_id, total_weeks, sem_start, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, name, code, semester, lecturerId, totalWeeks || 16, semStart, active ? 1 : 0, createdAt || new Date().toISOString());
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/classes/:id', (req, res) => {
  try {
    const { name, code, semester, totalWeeks, semStart, active } = req.body;
    db.prepare('UPDATE classes SET name = ?, code = ?, semester = ?, total_weeks = ?, sem_start = ?, active = ? WHERE id = ?')
      .run(name, code, semester, totalWeeks || 16, semStart, active ? 1 : 0, req.params.id);
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/classes/:id', (req, res) => {
  try {
    const classGroups = db.prepare('SELECT id FROM groups WHERE class_id = ?').all(req.params.id);
    classGroups.forEach(g => {
      db.prepare('DELETE FROM group_members WHERE group_id = ?').run(g.id);
      db.prepare('DELETE FROM tasks WHERE group_id = ?').run(g.id);
      db.prepare('DELETE FROM reports WHERE group_id = ?').run(g.id);
      db.prepare('DELETE FROM grades WHERE group_id = ?').run(g.id);
    });
    db.prepare('DELETE FROM groups WHERE class_id = ?').run(req.params.id);
    db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Groups CRUD
app.post('/api/groups', (req, res) => {
  try {
    const { id, classId, name, project, tech, leaderId, description, createdAt, members } = req.body;
    db.prepare('INSERT INTO groups (id, class_id, name, project, tech, leader_id, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, classId, name, project, tech, leaderId, description, createdAt || new Date().toISOString());

    if (Array.isArray(members)) {
      const ins = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
      const updU = db.prepare('UPDATE users SET class_id = ? WHERE id = ?');
      members.forEach(m => {
        ins.run(id, m);
        if (classId) updU.run(classId, m);
      });
    }
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/groups/:id', (req, res) => {
  try {
    const { name, project, tech, leaderId, description, members, classId } = req.body;
    db.prepare('UPDATE groups SET name = COALESCE(?, name), project = COALESCE(?, project), tech = COALESCE(?, tech), leader_id = COALESCE(?, leader_id), description = COALESCE(?, description), class_id = COALESCE(?, class_id) WHERE id = ?')
      .run(name, project, tech, leaderId, description, classId ?? null, req.params.id);

    if (Array.isArray(members)) {
      db.prepare('DELETE FROM group_members WHERE group_id = ?').run(req.params.id);
      const ins = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
      const grpRow = db.prepare('SELECT class_id FROM groups WHERE id = ?').get(req.params.id);
      const updU = db.prepare('UPDATE users SET class_id = ? WHERE id = ?');
      members.forEach(m => {
        ins.run(req.params.id, m);
        if (grpRow?.class_id) updU.run(grpRow.class_id, m);
      });
    }
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/groups/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(req.params.id);
    db.prepare('DELETE FROM tasks WHERE group_id = ?').run(req.params.id);
    db.prepare('DELETE FROM reports WHERE group_id = ?').run(req.params.id);
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Tasks (Kanban) CRUD
app.post('/api/tasks', (req, res) => {
  try {
    const { id, groupId, title, desc, status, assignee, deadline, createdBy, createdAt, doneAt, priority } = req.body;
    db.prepare('INSERT INTO tasks (id, group_id, title, desc, status, assignee, deadline, created_by, created_at, done_at, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, groupId, title, desc, status, assignee, deadline, createdBy, createdAt || new Date().toISOString(), doneAt, priority || 'medium');
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  try {
    const { title, desc, status, assignee, deadline, doneAt, priority } = req.body;
    db.prepare('UPDATE tasks SET title = COALESCE(?, title), desc = COALESCE(?, desc), status = COALESCE(?, status), assignee = COALESCE(?, assignee), deadline = COALESCE(?, deadline), done_at = COALESCE(?, done_at), priority = COALESCE(?, priority) WHERE id = ?')
      .run(title, desc, status, assignee, deadline, doneAt, priority, req.params.id);
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Reports CRUD
app.post('/api/reports', (req, res) => {
  try {
    const { id, groupId, week, summary, plan, files, submittedAt, submittedBy, status, grade, feedback, gradedAt } = req.body;
    db.prepare('INSERT INTO reports (id, group_id, week, summary, plan, files, submitted_at, submitted_by, status, grade, feedback, graded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, groupId, week, summary, plan, JSON.stringify(files || []), submittedAt || new Date().toISOString(), submittedBy, status || 'submitted', grade, feedback, gradedAt);
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/reports/:id', (req, res) => {
  try {
    const { summary, plan, files, status, grade, feedback, gradedAt } = req.body;
    db.prepare('UPDATE reports SET summary = COALESCE(?, summary), plan = COALESCE(?, plan), files = COALESCE(?, files), status = COALESCE(?, status), grade = COALESCE(?, grade), feedback = COALESCE(?, feedback), graded_at = COALESCE(?, graded_at) WHERE id = ?')
      .run(summary, plan, files ? JSON.stringify(files) : null, status, grade, feedback, gradedAt, req.params.id);
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Products CRUD
app.post('/api/products', (req, res) => {
  try {
    const { id, groupId, name, description, github, demo, video, selfScore, files, submittedAt, submittedBy, grade, feedback, gradedAt } = req.body;
    db.prepare('INSERT INTO products (id, group_id, name, description, github, demo, video, self_score, files, submitted_at, submitted_by, grade, feedback, graded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, groupId, name, description, github, demo, video, selfScore, files, submittedAt || new Date().toISOString(), submittedBy, grade, feedback, gradedAt);
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const { name, description, github, demo, video, selfScore, files, grade, feedback, gradedAt } = req.body;
    db.prepare('UPDATE products SET name = COALESCE(?, name), description = COALESCE(?, description), github = COALESCE(?, github), demo = COALESCE(?, demo), video = COALESCE(?, video), self_score = COALESCE(?, self_score), files = COALESCE(?, files), grade = COALESCE(?, grade), feedback = COALESCE(?, feedback), graded_at = COALESCE(?, graded_at) WHERE id = ?')
      .run(name, description, github, demo, video, selfScore, files, grade, feedback, gradedAt, req.params.id);
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Grades CRUD
app.post('/api/grades', (req, res) => {
  try {
    const { groupId, processScore, midtermScore, finalScore, totalScore, note, gradedBy, gradedAt } = req.body;
    const exists = db.prepare('SELECT group_id FROM grades WHERE group_id = ?').get(groupId);
    if (exists) {
      db.prepare('UPDATE grades SET process_score = ?, midterm_score = ?, final_score = ?, total_score = ?, note = ?, graded_by = ?, graded_at = ? WHERE group_id = ?')
        .run(processScore, midtermScore, finalScore, totalScore, note, gradedBy, gradedAt || new Date().toISOString(), groupId);
    } else {
      db.prepare('INSERT INTO grades (group_id, process_score, midterm_score, final_score, total_score, note, graded_by, graded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(groupId, processScore, midtermScore, finalScore, totalScore, note, gradedBy, gradedAt || new Date().toISOString());
    }
    const ts = db.setUpdatedAt();
    res.json({ success: true, updatedAt: ts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. Upload file
app.post('/api/upload', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Chưa chọn file nào' });
    }
    const savedFiles = req.files.map(f => ({
      originalName: f.originalname,
      fileName: f.filename,
      size: f.size,
      path: `/uploads/${f.filename}`,
      type: path.extname(f.originalname).replace('.', '').toLowerCase()
    }));
    res.json({ success: true, files: savedFiles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Route mặc định
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Khởi chạy server
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   🚀 HỆ THỐNG KTPMUD ĐANG CHẠY VỚI SQLITE DATABASE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   🌐 Trên máy của bạn   : http://localhost:${PORT}`);
  console.log(`   👥 Bạn bè cùng Wi-Fi  : http://${localIP}:${PORT}`);
  console.log(`   🗄️ Database SQLite    : ${path.join(__dirname, 'database.sqlite')}`);
  console.log(`   📁 Thư mục uploads    : ${uploadsDir}`);
  console.log('   💡 Nhấn Ctrl + C để dừng server');
  console.log('═══════════════════════════════════════════════════════════');

  // Tự động Keep-Alive ping mỗi 10 phút trên Render để hạn chế ngủ đông
  const externalUrl = process.env.RENDER_EXTERNAL_URL || 'https://ktpm-gwde.onrender.com';
  if (process.env.RENDER || process.env.RENDER_EXTERNAL_URL) {
    setInterval(() => {
      fetch(`${externalUrl}/api/health`).catch(() => {});
    }, 10 * 60 * 1000);
  }
});

