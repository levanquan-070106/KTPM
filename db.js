// ═══════════════════════════════════════════════════════════
//  KTPMUD – SQLite Database Module (node:sqlite)
// ═══════════════════════════════════════════════════════════

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new DatabaseSync(dbPath);

// Kích hoạt WAL mode để tối ưu hiệu năng và tránh lock database
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Khởi tạo các bảng SQL
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      class_id TEXT
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT,
      semester TEXT NOT NULL,
      lecturer_id TEXT NOT NULL,
      total_weeks INTEGER DEFAULT 16,
      sem_start TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      name TEXT NOT NULL,
      project TEXT NOT NULL,
      tech TEXT,
      leader_id TEXT,
      description TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      title TEXT NOT NULL,
      desc TEXT,
      status TEXT NOT NULL,
      assignee TEXT NOT NULL,
      deadline TEXT,
      created_by TEXT,
      created_at TEXT,
      done_at TEXT,
      priority TEXT DEFAULT 'medium'
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      week INTEGER NOT NULL,
      summary TEXT NOT NULL,
      plan TEXT,
      files TEXT,
      submitted_at TEXT,
      submitted_by TEXT,
      status TEXT DEFAULT 'submitted',
      grade REAL,
      feedback TEXT,
      graded_at TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      github TEXT,
      demo TEXT,
      video TEXT,
      self_score REAL,
      files TEXT,
      submitted_at TEXT,
      submitted_by TEXT,
      grade REAL,
      feedback TEXT,
      graded_at TEXT
    );

    CREATE TABLE IF NOT EXISTS grades (
      group_id TEXT PRIMARY KEY,
      process_score REAL,
      midterm_score REAL,
      final_score REAL,
      total_score REAL,
      note TEXT,
      graded_by TEXT,
      graded_at TEXT
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Đảm bảo bảng users cũ (nếu có) có cột class_id
  try { db.exec('ALTER TABLE users ADD COLUMN class_id TEXT'); } catch {}

  // Seed data ban đầu nếu bảng users trống
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count === 0) {
    seedInitialData();
  }

  // Tự động gán class_id cho các sinh viên chưa có class_id dựa trên nhóm hiện tại hoặc mặc định
  try {
    db.exec(`
      UPDATE users SET class_id = (
        SELECT g.class_id FROM group_members gm JOIN groups g ON gm.group_id = g.id WHERE gm.user_id = users.id LIMIT 1
      ) WHERE class_id IS NULL AND role IN ('sinhvien', 'nhomt');
    `);
    db.exec(`UPDATE users SET class_id = 'c1' WHERE id IN ('u3','u4','u5','u6','u7','u8') AND class_id IS NULL`);
    db.exec(`UPDATE users SET class_id = 'c2' WHERE id IN ('u9','u10','u11','u12') AND class_id IS NULL`);
  } catch {}
}

db.getUpdatedAt = function() {
  try {
    const row = db.prepare("SELECT value FROM meta WHERE key = 'updated_at'").get();
    return row ? Number(row.value) || 0 : 0;
  } catch {
    return 0;
  }
};

db.setUpdatedAt = function(ts = Date.now()) {
  try {
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('updated_at', ?)").run(String(ts));
    return Number(ts);
  } catch {
    return 0;
  }
};

function seedInitialData() {
  console.log('🌱 Đang nạp dữ liệu mẫu vào SQLite database...');

  // Users (Phân tách rõ sinh viên thuộc từng lớp học: c1 = K68A, c2 = K68B)
  const insertUser = db.prepare('INSERT INTO users (id, name, email, password, role, class_id) VALUES (?, ?, ?, ?, ?, ?)');
  const users = [
    ['u1', 'TS. Hoàng Quang Huy',  'gv1@edu.vn', '123456', 'giaovien', null],
    ['u2', 'PGS. Nguyễn Thị Lan',  'gv2@edu.vn', '123456', 'giaovien', null],
    ['u3', 'Lê Văn Quân',          'nt1@edu.vn', '123456', 'nhomt',    'c1'],
    ['u4', 'Đỗ Xuân Nguyện',       'sv1@edu.vn', '123456', 'sinhvien', 'c1'],
    ['u5', 'Trần Thị Mai',         'sv2@edu.vn', '123456', 'sinhvien', 'c1'],
    ['u6', 'Phạm Minh Tú',         'nt2@edu.vn', '123456', 'nhomt',    'c1'],
    ['u7', 'Nguyễn Bảo Châu',      'sv3@edu.vn', '123456', 'sinhvien', 'c1'],
    ['u8', 'Hoàng Thị Hà',         'sv4@edu.vn', '123456', 'sinhvien', 'c1'],
    ['u9', 'Vũ Công Đức',          'nt3@edu.vn', '123456', 'nhomt',    'c2'],
    ['u10','Bùi Thị Lan',          'sv5@edu.vn', '123456', 'sinhvien', 'c2'],
    ['u11','Cao Văn Nam',          'sv6@edu.vn', '123456', 'sinhvien', 'c2'],
    ['u12','Đinh Thị Thảo',        'sv7@edu.vn', '123456', 'sinhvien', 'c2'],
  ];
  users.forEach(u => insertUser.run(...u));

  // Classes
  const insertClass = db.prepare('INSERT INTO classes (id, name, code, semester, lecturer_id, total_weeks, sem_start, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const classes = [
    ['c1', 'KTPMUD – K68A', 'IT4082E-A', 'HK1 2026-2027', 'u1', 16, '2026-08-17', 1, '2026-08-17'],
    ['c2', 'KTPMUD – K68B', 'IT4082E-B', 'HK1 2026-2027', 'u1', 16, '2026-08-17', 1, '2026-08-17'],
    ['c3', 'KTPMUD – K67A', 'IT4082E-A', 'HK2 2025-2026', 'u2', 16, '2026-01-13', 0, '2026-01-13'],
  ];
  classes.forEach(c => insertClass.run(...c));

  // Groups
  const insertGroup = db.prepare('INSERT INTO groups (id, class_id, name, project, tech, leader_id, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertGroup.run('g1', 'c1', 'Nhóm 19', 'Hệ thống quản lý tiến độ project KTPMUD', 'React · Node.js · PostgreSQL', 'u3', 'Xây dựng nền tảng web quản lý tiến độ dự án cho môn KTPMUD, tích hợp kanban, báo cáo tuần và hệ thống chấm điểm.', '2026-08-20');
  insertGroup.run('g2', 'c1', 'Nhóm 20', 'Ứng dụng đặt lịch phòng học thông minh',  'Vue.js · Laravel · MySQL',      'u6', 'Phát triển ứng dụng đặt lịch phòng học, quản lý tài nguyên và thông báo tự động.', '2026-08-20');
  insertGroup.run('g3', 'c2', 'Nhóm 01', 'Chatbot hỗ trợ sinh viên đại học',         'Angular · Spring Boot · MongoDB', 'u9', 'Phát triển chatbot AI hỗ trợ sinh viên tra cứu thông tin, đăng ký môn học.', '2026-08-20');

  // Members
  const insertMember = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
  [['g1','u3'],['g1','u4'],['g1','u5'],['g2','u6'],['g2','u7'],['g2','u8'],['g3','u9'],['g3','u10'],['g3','u11'],['g3','u12']].forEach(m => insertMember.run(...m));

  // Tasks
  const insertTask = db.prepare('INSERT INTO tasks (id, group_id, title, desc, status, assignee, deadline, created_by, created_at, done_at, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const tasks = [
    ['t1', 'g1', 'Phân tích yêu cầu hệ thống', 'Khảo sát nhu cầu, viết SRS', 'done', 'u4', '2026-09-05', 'u3', '2026-08-21', '2026-09-04', 'high'],
    ['t2', 'g1', 'Thiết kế database schema', 'Vẽ ERD, viết DDL', 'done', 'u3', '2026-09-12', 'u3', '2026-08-21', '2026-09-11', 'high'],
    ['t3', 'g1', 'Xây dựng API backend', 'Express + JWT + PostgreSQL', 'doing', 'u3', '2026-10-15', 'u3', '2026-09-01', null, 'high'],
    ['t4', 'g1', 'Xây dựng giao diện frontend', 'React + Tailwind, responsive', 'doing', 'u5', '2026-10-18', 'u3', '2026-09-01', null, 'medium'],
    ['t5', 'g1', 'Module Kanban board', 'Drag & drop, cập nhật realtime', 'todo', 'u4', '2026-10-25', 'u3', '2026-09-15', null, 'medium'],
    ['t6', 'g1', 'Module xuất báo cáo Excel', 'Dùng SheetJS', 'todo', 'u5', '2026-10-28', 'u3', '2026-09-15', null, 'low'],
    ['t7', 'g1', 'Viết tài liệu kỹ thuật', 'API docs, README', 'review', 'u4', '2026-10-13', 'u3', '2026-09-01', null, 'medium'],
    ['t8', 'g2', 'Thiết kế UI/UX Figma', 'Wireframe + prototype', 'done', 'u7', '2026-09-10', 'u6', '2026-08-22', '2026-09-09', 'high'],
    ['t9', 'g2', 'Cài đặt Laravel backend', 'Auth, CRUD phòng học', 'doing', 'u6', '2026-10-20', 'u6', '2026-09-05', null, 'high'],
  ];
  tasks.forEach(t => insertTask.run(...t));

  // Reports
  const insertReport = db.prepare('INSERT INTO reports (id, group_id, week, summary, plan, files, submitted_at, submitted_by, status, grade, feedback, graded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (let w = 1; w <= 8; w++) {
    const files = JSON.stringify([
      { name: `baocao_tuan${w}.docx`, size: 350000, type: 'docx' },
      ...(w % 2 === 0 ? [{ name: `slide_tuan${w}.pptx`, size: 1200000, type: 'pptx' }] : [])
    ]);
    insertReport.run(
      `r${w}`, 'g1', w,
      `Tuần ${w}: Báo cáo tiến độ phát triển hệ thống KTPMUD`,
      'Triển khai giai đoạn tiếp theo',
      files,
      new Date('2026-08-17T00:00:00Z').getTime() + (w * 7 - 1) * 86400000 + '',
      'u3',
      w <= 7 ? 'graded' : 'submitted',
      w <= 7 ? parseFloat((7 + w * 0.2).toFixed(1)) : null,
      w <= 7 ? 'Báo cáo đầy đủ và chi tiết. Nhóm làm việc tích cực.' : null,
      w <= 7 ? new Date().toISOString() : null
    );
  }

  // Grades
  const insertGrade = db.prepare('INSERT INTO grades (group_id, process_score, midterm_score, final_score, total_score, note, graded_by, graded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertGrade.run('g1', 8.2, 7.5, null, null, 'Nhóm làm việc chủ động', 'u1', new Date().toISOString());
  insertGrade.run('g2', 7.0, 6.5, null, null, 'Cần đẩy nhanh tiến độ backend', 'u1', new Date().toISOString());

  // Đánh dấu dữ liệu gốc ban đầu có updated_at = 0
  db.setUpdatedAt(0);
  console.log('✅ Đã nạp dữ liệu mẫu vào SQLite thành công!');
}

// Khởi chạy schema
initSchema();

module.exports = db;

