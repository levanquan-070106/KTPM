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
      class_id TEXT,
      mssv TEXT,
      original_email TEXT,
      requested_class_id TEXT,
      last_login TEXT
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

  // Đảm bảo bảng users cũ (nếu có) có cột class_id, mssv, original_email, requested_class_id
  try { db.exec('ALTER TABLE users ADD COLUMN class_id TEXT'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN mssv TEXT'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN original_email TEXT'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN requested_class_id TEXT'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN last_login TEXT'); } catch {}

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

  // Classes
  const insertClass = db.prepare('INSERT INTO classes (id, name, code, semester, lecturer_id, total_weeks, sem_start, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const classes = [["c1","KTPM sáng t4","IT4082E","HK1 2026-2027","u1",16,"2026-08-17",1,"2026-08-17"],["c2","KTPMUD – K67A","IT4082E-A","HK2 2025-2026","u1",16,"2026-01-13",0,"2026-01-13"]];
  classes.forEach(c => insertClass.run(...c));

  // Users
  const insertUser = db.prepare('INSERT INTO users (id, name, email, password, role, class_id, mssv, original_email, requested_class_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const users = [["u1","TS. Hoàng Quang Huy","gv1@edu.vn","123456","giaovien",null,null,null,null],["u_202413994","TRẦN NGUYỄN PHÚC BÌNH","trannguyenphucbinh@gmail.com","123456","sinhvien","c1","202413994","trannguyenphucbinh@gmail.com",null],["u_20233410","Lê Đức Hoàng","lehoangg160@gmail.com","123456","nhomt","c1","20233410","lehoangg160@gmail.com",null],["u_20239696","PHAL  SOVANNARITH","rithkh568@gmail.com","123456","nhomt","c1","20239696","rithkh568@gmail.com",null],["u_202413981","ĐINH MAI ANH","maianh29122006@gmail.com","123456","nhomt","c1","202413981","maianh29122006@gmail.com",null],["u_202414275","PHẠM BÌNH PHƯƠNG NAM","pnam70653@gmail.com","123456","sinhvien","c1","202414275","pnam70653@gmail.com",null],["u_202414021","VÕ TẤN ĐẠT","votandatcbn@gmail.com","123456","nhomt","c1","202414021","votandatcbn@gmail.com",null],["u_202414357","PHÙNG TUẤN TÀI","minhtienphung072@gmail.com","123456","nhomt","c1","202414357","minhtienphung072@gmail.com",null],["u_202414097","TRẦN NGUYỄN HOÀNG HẢI","tnhh17506@gmail.com","123456","nhomt","c1","202414097","tnhh17506@gmail.com",null],["u_202414322","TRẦN MINH QUÂN","minhquantran20062006@gmail.com","123456","nhomt","c1","202414322","minhquantran20062006@gmail.com",null],["u_202414215","NGUYỄN DUY LINH","linhduy111206@gmail.com","123456","nhomt","c1","202414215","linhduy111206@gmail.com",null],["u_202414086","BÙI ĐỨC DUY","duylhp9@gmail.com","123456","nhomt","c1","202414086","duylhp9@gmail.com",null],["u_202414047","NGÔ VĂN ĐỨC","ngoduc7749@gmail.com","123456","nhomt","c1","202414047","ngoduc7749@gmail.com",null],["u_202414269","NGUYỄN ĐỨC MƯỜI","ndmuoi06@gmail.com","123456","nhomt","c1","202414269","ndmuoi06@gmail.com",null],["u_202414237","NGUYỄN ĐỨC MẠNH","nguyenmanh18042000@gmail.com","123456","nhomt","c1","202414237","nguyenmanh18042000@gmail.com",null],["u_202414205","TRẦN ĐỨC LÂM","-tranlam592006@gmail.com","123456","sinhvien","c1","202414205","-tranlam592006@gmail.com",null],["u_202414174","LÊ VĂN HUY","huyvanle04112006@gmail.com","123456","nhomt","c1","202414174","huyvanle04112006@gmail.com",null],["u_202414335","VŨ NGỌC QUANG","vungocquang1362006@gmail.com","123456","sinhvien","c1","202414335","vungocquang1362006@gmail.com",null],["u_202414422","NGUYỄN PHI TRƯỜNG","nguyenphitruong1652006@gmail.com","123456","sinhvien","c1","202414422","nguyenphitruong1652006@gmail.com",null],["u_202414410","NGUYỄN VĂN TRỌNG","nguyentrong1082020@gmail.com","123456","sinhvien","c1","202414410","nguyentrong1082020@gmail.com",null],["u_202414375","DƯƠNG VĂN THẮNG","duongvan20068c@gmail.com","123456","nhomt","c1","202414375","duongvan20068c@gmail.com",null],["u_202414231","LÊ MINH LONG","-minhlonga12006@gmail.com","123456","nhomt","c1","202414231","-minhlonga12006@gmail.com",null],["u_202414408","TRẦN ĐỨC TRÍ","tranductri2301@gmail.com","123456","sinhvien","c1","202414408","tranductri2301@gmail.com",null],["u_202414431","TRỊNH ANH TUẤN","tuanttrinhanh596@gmail.com","123456","sinhvien","c1","202414431","tuanttrinhanh596@gmail.com",null],["u_202414446","TRẦN THỊ VÂN","tranvan130106@gmail.com","123456","sinhvien","c1","202414446","tranvan130106@gmail.com",null],["u_202414241","TÔ TIẾN MẠNH","totienmanh456@gmail.com","123456","nhomt","c1","202414241","totienmanh456@gmail.com",null],["u_202414384","TRẦN THỊ THU THẢO","thut01764@gmail.com","123456","nhomt","c1","202414384","thut01764@gmail.com",null],["u_20233305","Nguyễn Thành Đạt","cloudddd5225@gmail.com","123456","sinhvien","c1","20233305","cloudddd5225@gmail.com",null],["u_202414071","TRẦN ĐÌNH VIỆT DŨNG","tdung6517@gmail.com","123456","sinhvien","c1","202414071","tdung6517@gmail.com",null],["u_202414030","VŨ MINH ĐẠT","kayc23604@gmail.com","123456","nhomt","c1","202414030","kayc23604@gmail.com",null],["u_202414088","HOÀNG ĐỨC DUY","ducduy161100@gmail.com","123456","sinhvien","c1","202414088","ducduy161100@gmail.com",null],["u_202414028","DƯƠNG VĂN ĐẠT","datdv41026@gmail.com","123456","sinhvien","c1","202414028","datdv41026@gmail.com",null],["u_202414085","ĐẶNG VĂN DUY","dangduy89pc@gmail.com","123456","nhomt","c1","202414085","dangduy89pc@gmail.com",null],["u_202414072","NGUYỄN TIẾN DŨNG","nguyentiendung171006@gmail.com","123456","sinhvien","c1","202414072","nguyentiendung171006@gmail.com",null],["u_202414122","NGUYỄN MINH HÒA","nmhoaaa.066@gmail.com","123456","sinhvien","c1","202414122","nmhoaaa.066@gmail.com",null],["u_202414434","MAI ĐỨC TUẤN","maituan2210206@gmail.com","123456","sinhvien","c1","202414434","maituan2210206@gmail.com",null],["u_202414138","TRẦN THÁI HỢP","thaihop6406@gmail.com","123456","sinhvien","c1","202414138","thaihop6406@gmail.com",null],["u_202414265","LÊ ANH MINH","-kubiphonhe@gmail.com","123456","nhomt","c1","202414265","-kubiphonhe@gmail.com",null],["u_202414217","ĐÀO THỊ HẢI LINH","daohailinh10@gmail.com","123456","nhomt","c1","202414217","daohailinh10@gmail.com",null],["u_20233544","Lưu Nhật Nam","namfa7071@gmail.com","123456","sinhvien","c1","20233544","namfa7071@gmail.com",null],["u_202414289","CAO THỊ ÁNH NGUYỆT","anhnguyet10042006@gmail.com","123456","nhomt","c1","202414289","anhnguyet10042006@gmail.com",null],["u_202414349","NGUYỄN HOÀNG SƠN","nguyenhoangsonc2@gmail.com","123456","sinhvien","c1","202414349","nguyenhoangsonc2@gmail.com",null],["u3","LÊ VĂN QUÂN","lethiquan01@gmail.com","123456","nhomt","c1","202414324","lethiquan01@gmail.com",null],["u4","Đỗ Xuân Nguyện","doxuannguyen29@gmail.com","123456","sinhvien","c1","202414288","doxuannguyen29@gmail.com",null],["u_202412345","Quân Lê","lethiquan02@gmail.com","123456","sinhvien",null,"202412345","lethiquan02@gmail.com","c1"]];
  users.forEach(u => insertUser.run(...u));

  // Groups
  const insertGroup = db.prepare('INSERT INTO groups (id, class_id, name, project, tech, leader_id, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const insertMember = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
  const rawGroups = [{"id":"g_nh_m_01","classId":"c1","name":"Nhóm 01","project":"Hệ thống hỗ trợ người chăm sóc theo dõi điều trị ngoại trú cho bệnh nhân cao tuổi mắc bệnh đái tháo đường type 2","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414357","members":["u_202413994","u_202414357","u_202414408"],"description":"Hệ thống hỗ trợ người chăm sóc theo dõi điều trị ngoại trú cho bệnh nhân cao tuổi mắc bệnh đái tháo đường type 2"},{"id":"g_nh_m_05","classId":"c1","name":"Nhóm 05","project":"hệ thống kiểm soát chế độ ăn cho người quan tâm tới sức khỏe","tech":"React · Node.js · PostgreSQL","leaderId":"u_20233410","members":["u_20233410","u_20233305","u_20233544"],"description":"hệ thống kiểm soát chế độ ăn cho người quan tâm tới sức khỏe"},{"id":"g_nh_m_50","classId":"c1","name":"Nhóm 50","project":"Hệ thống quản lí chuỗi nhà hàng","tech":"React · Node.js · PostgreSQL","leaderId":"u_20239696","members":["u_20239696"],"description":"Hệ thống quản lí chuỗi nhà hàng"},{"id":"g_nh_m_56","classId":"c1","name":"Nhóm 56","project":"Hệ thống mua bán đồ cũ cho sinh viên","tech":"React · Node.js · PostgreSQL","leaderId":"u_202413981","members":["u_202413981"],"description":"Hệ thống mua bán đồ cũ cho sinh viên"},{"id":"g_nh_m_11","classId":"c1","name":"Nhóm 11","project":"Hệ thống quảng bá dịch vụ và đặt lịch khám dành cho phòng khám nha khoa tư nhân","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414215","members":["u_202414275","u_202414215","u_202414072"],"description":"Hệ thống quảng bá dịch vụ và đặt lịch khám dành cho phòng khám nha khoa tư nhân"},{"id":"g_nh_m_04","classId":"c1","name":"Nhóm 04","project":"Hệ thống quản lý sân bóng (nhận đặt sân và tổ chức giải đấu)","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414021","members":["u_202414021"],"description":"Hệ thống quản lý sân bóng (nhận đặt sân và tổ chức giải đấu)"},{"id":"g_nh_m_27","classId":"c1","name":"Nhóm 27","project":"Xây dựng hệ thống quản lý bệnh nhân suy tim","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414097","members":["u_202414097"],"description":"Xây dựng hệ thống quản lý bệnh nhân suy tim"},{"id":"g_nh_m_07","classId":"c1","name":"Nhóm 07","project":"Hệ thống quản lí bệnh nhân suy tim","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414322","members":["u_202414322","u_202414335"],"description":"Hệ thống quản lí bệnh nhân suy tim"},{"id":"g_nh_m_37","classId":"c1","name":"Nhóm 37","project":"Hệ thống quản lý thiết bị y tế","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414086","members":["u_202414086"],"description":"Hệ thống quản lý thiết bị y tế"},{"id":"g_nh_m_10","classId":"c1","name":"Nhóm 10","project":"Hệ thống quản lý thiết bị y tế","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414047","members":["u_202414047","u_202414088"],"description":"Hệ thống quản lý thiết bị y tế"},{"id":"g_nh_m_57","classId":"c1","name":"Nhóm 57","project":"Hệ thống phân tích tĩnh và chuẩn hóa tự động định dạng tài liệu báo cáo học thuật","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414269","members":["u_202414269"],"description":"Hệ thống phân tích tĩnh và chuẩn hóa tự động định dạng tài liệu báo cáo học thuật"},{"id":"g_nh_m_02","classId":"c1","name":"Nhóm 02","project":"thiết kế & xây dựng website bản đồ lịch sử Việt Nam","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414237","members":["u_202414237","u_202414431","u_202414071"],"description":"thiết kế & xây dựng website bản đồ lịch sử Việt Nam"},{"id":"g_nh_m_31","classId":"c1","name":"Nhóm 31","project":"Thiết kế và xây dựng hệ thống tổng hợp thông tin, hỗ trợ mua bán linh kiện điện tử","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414265","members":["u_202414205","u_202414410","u_202414265"],"description":"Thiết kế và xây dựng hệ thống tổng hợp thông tin, hỗ trợ mua bán linh kiện điện tử"},{"id":"g_nh_m_62","classId":"c1","name":"Nhóm 62","project":"Xây dựng hệ thống quản lý cơ sở vật chất ký túc xá B5 HUST","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414174","members":["u_202414174","u_202414138"],"description":"Xây dựng hệ thống quản lý cơ sở vật chất ký túc xá B5 HUST"},{"id":"g_nh_m_29","classId":"c1","name":"Nhóm 29","project":"Quản lí trang trại chắn nuôi gà ứng dụng tại Quảng Bình","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414241","members":["u_202414422","u_202414241","u_202414434"],"description":"Quản lí trang trại chắn nuôi gà ứng dụng tại Quảng Bình"},{"id":"g_nh_m_32","classId":"c1","name":"Nhóm 32","project":"Hệ thống hỗ trợ quản lý và bán hàng cho cửa hàng nội thất gỗ tại Thái Nguyên","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414375","members":["u_202414375","u_202414028"],"description":"Hệ thống hỗ trợ quản lý và bán hàng cho cửa hàng nội thất gỗ tại Thái Nguyên"},{"id":"g_nh_m_49","classId":"c1","name":"Nhóm 49","project":"Hệ thống quản lý thiết bị y tế","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414231","members":["u_202414231"],"description":"Hệ thống quản lý thiết bị y tế"},{"id":"g_nh_m_28","classId":"c1","name":"Nhóm 28","project":"Hệ thống quản lý hiệu thuốc","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414289","members":["u_202414446","u_202414122","u_202414289"],"description":"Hệ thống quản lý hiệu thuốc"},{"id":"g_nh_m_18","classId":"c1","name":"Nhóm 18","project":"Xây dựng nền tảng kết nối và ghép nhóm người chơi cầu lông ở Hà Nội","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414384","members":["u_202414384"],"description":"Xây dựng nền tảng kết nối và ghép nhóm người chơi cầu lông ở Hà Nội"},{"id":"g_nh_m_06","classId":"c1","name":"Nhóm 06","project":"Hệ thống hỗ trợ tra cứu & phân tích thuốc","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414030","members":["u_202414030"],"description":"Hệ thống hỗ trợ tra cứu & phân tích thuốc"},{"id":"g_nh_m_26","classId":"c1","name":"Nhóm 26","project":"Trao đổi tài liệu cũ","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414085","members":["u_202414085","u_202414349"],"description":"Trao đổi tài liệu cũ"},{"id":"g_nh_m_33","classId":"c1","name":"Nhóm 33","project":"Quản lí cửa hàng bán sách","tech":"React · Node.js · PostgreSQL","leaderId":"u_202414217","members":["u_202414217"],"description":"Quản lí cửa hàng bán sách"},{"id":"g_nh_m_19","classId":"c1","name":"Nhóm 19","project":"Hệ thống quản lý tiến độ thực hiện project môn KTPMUD ( dự kiến )","tech":"React · Node.js · PostgreSQL","leaderId":"u3","members":["u3","u4"],"description":"Hệ thống quản lý tiến độ thực hiện project môn KTPMUD ( dự kiến )"}];
  rawGroups.forEach(g => {
    insertGroup.run(g.id, g.classId, g.name, g.project, g.tech, g.leaderId, g.description, new Date().toISOString());
    if (Array.isArray(g.members)) {
      g.members.forEach(uid => { try { insertMember.run(g.id, uid); } catch {} });
    }
  });

  // Tasks for Nhóm 19
  const insertTask = db.prepare('INSERT INTO tasks (id, group_id, title, desc, status, assignee, deadline, created_by, created_at, done_at, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const tasks = [
    ['t1', 'g_nh_m_19', 'Phân tích yêu cầu hệ thống', 'Khảo sát nhu cầu, viết SRS', 'done', 'u4', '2026-09-05', 'u3', '2026-08-21', '2026-09-04', 'high'],
    ['t2', 'g_nh_m_19', 'Thiết kế database schema', 'Vẽ ERD, viết DDL', 'done', 'u3', '2026-09-12', 'u3', '2026-08-21', '2026-09-11', 'high'],
    ['t3', 'g_nh_m_19', 'Xây dựng API backend', 'Express + JWT + PostgreSQL', 'doing', 'u3', '2026-10-15', 'u3', '2026-09-01', null, 'high'],
    ['t4', 'g_nh_m_19', 'Xây dựng giao diện frontend', 'React + Tailwind, responsive', 'doing', 'u4', '2026-10-18', 'u3', '2026-09-01', null, 'medium'],
    ['t5', 'g_nh_m_19', 'Module Kanban board', 'Drag & drop, cập nhật realtime', 'todo', 'u4', '2026-10-25', 'u3', '2026-09-15', null, 'medium'],
    ['t6', 'g_nh_m_19', 'Module xuất báo cáo Excel', 'Dùng SheetJS', 'todo', 'u3', '2026-10-28', 'u3', '2026-09-15', null, 'low'],
    ['t7', 'g_nh_m_19', 'Viết tài liệu kỹ thuật', 'API docs, README', 'review', 'u4', '2026-10-13', 'u3', '2026-09-01', null, 'medium'],
  ];
  tasks.forEach(t => insertTask.run(...t));

  // Reports for Nhóm 19
  const insertReport = db.prepare('INSERT INTO reports (id, group_id, week, summary, plan, files, submitted_at, submitted_by, status, grade, feedback, graded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (let w = 1; w <= 8; w++) {
    const files = JSON.stringify([
      { name: 'baocao_tuan' + w + '.docx', size: 350000, type: 'docx' },
      ...(w % 2 === 0 ? [{ name: 'slide_tuan' + w + '.pptx', size: 1200000, type: 'pptx' }] : [])
    ]);
    insertReport.run(
      'r' + w, 'g_nh_m_19', w,
      'Tuần ' + w + ': Báo cáo tiến độ phát triển hệ thống KTPMUD',
      'Triển khai giai đoạn tiếp theo',
      files,
      String(new Date('2026-08-17T00:00:00Z').getTime() + (w * 7 - 1) * 86400000),
      'u3',
      w <= 7 ? 'graded' : 'submitted',
      w <= 7 ? parseFloat((7 + w * 0.2).toFixed(1)) : null,
      w <= 7 ? 'Báo cáo đầy đủ và chi tiết. Nhóm làm việc tích cực.' : null,
      w <= 7 ? new Date().toISOString() : null
    );
  }

  // Grades for Nhóm 19
  const insertGrade = db.prepare('INSERT INTO grades (group_id, process_score, midterm_score, final_score, total_score, note, graded_by, graded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertGrade.run('g_nh_m_19', 8.2, 7.5, null, null, 'Nhóm làm việc chủ động', 'u1', new Date().toISOString());

  // Đánh dấu dữ liệu gốc ban đầu
  db.setUpdatedAt(Date.now());
  console.log('✅ Đã nạp dữ liệu mẫu vào SQLite thành công!');
}

// Khởi chạy schema
initSchema();

module.exports = db;

