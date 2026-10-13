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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve files
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(__dirname));

// ═══════════════════════════════════════════════════════════
//  API ROUTES – KẾT NỐI VỚI CƠ SỞ DỮ LIỆU SQLITE
// ═══════════════════════════════════════════════════════════

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
    const users = db.prepare('SELECT id, name, email, password, role FROM users').all();
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
      data: { users, classes, groups, tasks, reports, products, grades }
    });
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
    const user = db.prepare('SELECT id, name, email, password, role FROM users WHERE LOWER(email) = ? OR LOWER(email) = ?').get(q, q.replace('@edu.vn', '@ktpmud.edu'));

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
    const { id, name, email, password, role } = req.body;
    db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)').run(id, name, email, password, role);
    res.json({ success: true, message: 'Đã thêm người dùng' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/users/:id', (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (password) {
      db.prepare('UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE id = ?').run(name, email, password, role, req.params.id);
    } else {
      db.prepare('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?').run(name, email, role, req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    db.prepare('DELETE FROM group_members WHERE user_id = ?').run(req.params.id);
    res.json({ success: true });
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/classes/:id', (req, res) => {
  try {
    const { name, code, semester, totalWeeks, semStart, active } = req.body;
    db.prepare('UPDATE classes SET name = ?, code = ?, semester = ?, total_weeks = ?, sem_start = ?, active = ? WHERE id = ?')
      .run(name, code, semester, totalWeeks || 16, semStart, active ? 1 : 0, req.params.id);
    res.json({ success: true });
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
    res.json({ success: true });
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
      members.forEach(m => ins.run(id, m));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/groups/:id', (req, res) => {
  try {
    const { name, project, tech, leaderId, description, members } = req.body;
    db.prepare('UPDATE groups SET name = COALESCE(?, name), project = COALESCE(?, project), tech = COALESCE(?, tech), leader_id = COALESCE(?, leader_id), description = COALESCE(?, description) WHERE id = ?')
      .run(name, project, tech, leaderId, description, req.params.id);

    if (Array.isArray(members)) {
      db.prepare('DELETE FROM group_members WHERE group_id = ?').run(req.params.id);
      const ins = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
      members.forEach(m => ins.run(req.params.id, m));
    }
    res.json({ success: true });
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
    res.json({ success: true });
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  try {
    const { title, desc, status, assignee, deadline, doneAt, priority } = req.body;
    db.prepare('UPDATE tasks SET title = COALESCE(?, title), desc = COALESCE(?, desc), status = COALESCE(?, status), assignee = COALESCE(?, assignee), deadline = COALESCE(?, deadline), done_at = COALESCE(?, done_at), priority = COALESCE(?, priority) WHERE id = ?')
      .run(title, desc, status, assignee, deadline, doneAt, priority, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ success: true });
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/reports/:id', (req, res) => {
  try {
    const { summary, plan, files, status, grade, feedback, gradedAt } = req.body;
    db.prepare('UPDATE reports SET summary = COALESCE(?, summary), plan = COALESCE(?, plan), files = COALESCE(?, files), status = COALESCE(?, status), grade = COALESCE(?, grade), feedback = COALESCE(?, feedback), graded_at = COALESCE(?, graded_at) WHERE id = ?')
      .run(summary, plan, files ? JSON.stringify(files) : null, status, grade, feedback, gradedAt, req.params.id);
    res.json({ success: true });
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const { name, description, github, demo, video, selfScore, files, grade, feedback, gradedAt } = req.body;
    db.prepare('UPDATE products SET name = COALESCE(?, name), description = COALESCE(?, description), github = COALESCE(?, github), demo = COALESCE(?, demo), video = COALESCE(?, video), self_score = COALESCE(?, self_score), files = COALESCE(?, files), grade = COALESCE(?, grade), feedback = COALESCE(?, feedback), graded_at = COALESCE(?, graded_at) WHERE id = ?')
      .run(name, description, github, demo, video, selfScore, files, grade, feedback, gradedAt, req.params.id);
    res.json({ success: true });
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
    res.json({ success: true });
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
});
