import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { createSeedDatabase } from "./seed";
import type {
  CertificateRequest,
  DecanatDatabase,
  GradeItem,
  NotificationItem,
  PublicUser,
  RequestStatus,
  ScheduleItem,
  ScheduleStatus,
  UserRecord,
} from "./types";

function getPostgresUrl(): string | undefined {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || undefined;
}

function getLocalDbPath(): string {
  const candidates = [
    process.env.DATA_DIR,
    fs.existsSync("/data") ? "/data" : undefined,
    path.join(process.cwd(), "data"),
  ].filter(Boolean) as string[];

  for (const dir of candidates) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const testPath = path.join(dir, ".write-check");
      fs.writeFileSync(testPath, "ok");
      fs.unlinkSync(testPath);
      return path.join(dir, "decanat-db.json");
    } catch {
      // try next writable location
    }
  }
  return "/tmp/mgimo-decanat-db.json";
}

let cachedFileDbPath: string | null = null;

function readLocalDb(): DecanatDatabase {
  if (!cachedFileDbPath) {
    cachedFileDbPath = getLocalDbPath();
  }
  if (!fs.existsSync(cachedFileDbPath)) {
    const seeded = createSeedDatabase();
    fs.writeFileSync(cachedFileDbPath, JSON.stringify(seeded, null, 2), "utf8");
    return seeded;
  }
  const raw = fs.readFileSync(cachedFileDbPath, "utf8");
  return JSON.parse(raw) as DecanatDatabase;
}

function writeLocalDb(db: DecanatDatabase): void {
  if (!cachedFileDbPath) {
    cachedFileDbPath = getLocalDbPath();
  }
  fs.writeFileSync(cachedFileDbPath, JSON.stringify(db, null, 2), "utf8");
}

let pgInitialized = false;

async function ensurePgSchema() {
  const url = getPostgresUrl();
  if (!url) return null;
  const sql = neon(url);
  if (pgInitialized) return sql;

  await sql`
    CREATE TABLE IF NOT EXISTS decanat_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      full_name TEXT NOT NULL,
      full_name_en TEXT NOT NULL,
      email TEXT NOT NULL,
      department TEXT,
      department_en TEXT,
      profile JSONB
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS decanat_schedule (
      id TEXT PRIMARY KEY,
      group_code TEXT NOT NULL,
      day_index INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      subject TEXT NOT NULL,
      subject_en TEXT NOT NULL,
      kind TEXT NOT NULL,
      room TEXT NOT NULL,
      original_room TEXT,
      lecturer TEXT NOT NULL,
      status TEXT NOT NULL,
      change_note TEXT,
      change_note_en TEXT,
      updated_at TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS decanat_grades (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      semester INTEGER NOT NULL,
      subject TEXT NOT NULL,
      subject_en TEXT NOT NULL,
      credits INTEGER NOT NULL,
      control_type TEXT NOT NULL,
      score_100 INTEGER,
      grade_label TEXT NOT NULL,
      grade_label_en TEXT NOT NULL,
      grade_numeric INTEGER,
      status TEXT NOT NULL,
      exam_date TEXT,
      lecturer TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS decanat_requests (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      group_code TEXT NOT NULL,
      type_code TEXT NOT NULL,
      title TEXT NOT NULL,
      title_en TEXT NOT NULL,
      purpose TEXT NOT NULL,
      delivery_format TEXT NOT NULL,
      status TEXT NOT NULL,
      staff_comment TEXT,
      verification_code TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS decanat_notifications (
      id TEXT PRIMARY KEY,
      target_student_id TEXT,
      target_group TEXT,
      category TEXT NOT NULL,
      urgent BOOLEAN NOT NULL DEFAULT FALSE,
      title TEXT NOT NULL,
      title_en TEXT NOT NULL,
      body TEXT NOT NULL,
      body_en TEXT NOT NULL,
      created_at TEXT NOT NULL,
      read_by JSONB NOT NULL DEFAULT '[]'::jsonb
    )
  `;

  const existing = await sql`SELECT COUNT(*)::int AS cnt FROM decanat_users`;
  const count = Number(existing[0]?.cnt ?? 0);
  if (count === 0) {
    const seed = createSeedDatabase();
    for (const u of seed.users) {
      await sql`
        INSERT INTO decanat_users (id, username, password_hash, role, full_name, full_name_en, email, department, department_en, profile)
        VALUES (${u.id}, ${u.username}, ${u.passwordHash}, ${u.role}, ${u.fullName}, ${u.fullNameEn}, ${u.email}, ${u.department ?? null}, ${u.departmentEn ?? null}, ${u.profile ? JSON.stringify(u.profile) : null}::jsonb)
        ON CONFLICT (id) DO NOTHING
      `;
    }
    for (const s of seed.schedule) {
      await sql`
        INSERT INTO decanat_schedule (id, group_code, day_index, start_time, end_time, subject, subject_en, kind, room, original_room, lecturer, status, change_note, change_note_en, updated_at)
        VALUES (${s.id}, ${s.groupCode}, ${s.dayIndex}, ${s.startTime}, ${s.endTime}, ${s.subject}, ${s.subjectEn}, ${s.kind}, ${s.room}, ${s.originalRoom ?? null}, ${s.lecturer}, ${s.status}, ${s.changeNote ?? null}, ${s.changeNoteEn ?? null}, ${s.updatedAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    for (const g of seed.grades) {
      await sql`
        INSERT INTO decanat_grades (id, student_id, semester, subject, subject_en, credits, control_type, score_100, grade_label, grade_label_en, grade_numeric, status, exam_date, lecturer)
        VALUES (${g.id}, ${g.studentId}, ${g.semester}, ${g.subject}, ${g.subjectEn}, ${g.credits}, ${g.controlType}, ${g.score100}, ${g.gradeLabel}, ${g.gradeLabelEn}, ${g.gradeNumeric}, ${g.status}, ${g.examDate ?? null}, ${g.lecturer})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    for (const r of seed.requests) {
      await sql`
        INSERT INTO decanat_requests (id, student_id, student_name, group_code, type_code, title, title_en, purpose, delivery_format, status, staff_comment, verification_code, created_at, updated_at)
        VALUES (${r.id}, ${r.studentId}, ${r.studentName}, ${r.groupCode}, ${r.typeCode}, ${r.title}, ${r.titleEn}, ${r.purpose}, ${r.deliveryFormat}, ${r.status}, ${r.staffComment ?? null}, ${r.verificationCode}, ${r.createdAt}, ${r.updatedAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    for (const n of seed.notifications) {
      await sql`
        INSERT INTO decanat_notifications (id, target_student_id, target_group, category, urgent, title, title_en, body, body_en, created_at, read_by)
        VALUES (${n.id}, ${n.targetStudentId}, ${n.targetGroup}, ${n.category}, ${n.urgent}, ${n.title}, ${n.titleEn}, ${n.body}, ${n.bodyEn}, ${n.createdAt}, ${JSON.stringify(n.readBy)}::jsonb)
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }

  pgInitialized = true;
  return sql;
}

export function stripPassword(user: UserRecord): PublicUser {
  const { passwordHash: _ignored, ...rest } = user;
  void _ignored;
  return rest;
}

function mapPgUser(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id),
    username: String(row.username),
    passwordHash: String(row.password_hash),
    role: row.role as UserRecord["role"],
    fullName: String(row.full_name),
    fullNameEn: String(row.full_name_en),
    email: String(row.email),
    department: row.department ? String(row.department) : undefined,
    departmentEn: row.department_en ? String(row.department_en) : undefined,
    profile: (row.profile as UserRecord["profile"]) ?? undefined,
  };
}

function mapPgSchedule(row: Record<string, unknown>): ScheduleItem {
  return {
    id: String(row.id),
    groupCode: String(row.group_code),
    dayIndex: Number(row.day_index),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    subject: String(row.subject),
    subjectEn: String(row.subject_en),
    kind: row.kind as ScheduleItem["kind"],
    room: String(row.room),
    originalRoom: row.original_room ? String(row.original_room) : undefined,
    lecturer: String(row.lecturer),
    status: row.status as ScheduleStatus,
    changeNote: row.change_note ? String(row.change_note) : undefined,
    changeNoteEn: row.change_note_en ? String(row.change_note_en) : undefined,
    updatedAt: String(row.updated_at),
  };
}

function mapPgGrade(row: Record<string, unknown>): GradeItem {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    semester: Number(row.semester),
    subject: String(row.subject),
    subjectEn: String(row.subject_en),
    credits: Number(row.credits),
    controlType: row.control_type as GradeItem["controlType"],
    score100: row.score_100 === null || row.score_100 === undefined ? null : Number(row.score_100),
    gradeLabel: String(row.grade_label),
    gradeLabelEn: String(row.grade_label_en),
    gradeNumeric:
      row.grade_numeric === null || row.grade_numeric === undefined
        ? null
        : Number(row.grade_numeric),
    status: row.status as GradeItem["status"],
    examDate: row.exam_date ? String(row.exam_date) : undefined,
    lecturer: String(row.lecturer),
  };
}

function mapPgRequest(row: Record<string, unknown>): CertificateRequest {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    studentName: String(row.student_name),
    groupCode: String(row.group_code),
    typeCode: row.type_code as CertificateRequest["typeCode"],
    title: String(row.title),
    titleEn: String(row.title_en),
    purpose: String(row.purpose),
    deliveryFormat: row.delivery_format as CertificateRequest["deliveryFormat"],
    status: row.status as RequestStatus,
    staffComment: row.staff_comment ? String(row.staff_comment) : undefined,
    verificationCode: String(row.verification_code),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPgNotification(row: Record<string, unknown>): NotificationItem {
  return {
    id: String(row.id),
    targetStudentId: row.target_student_id ? String(row.target_student_id) : null,
    targetGroup: row.target_group ? String(row.target_group) : null,
    category: row.category as NotificationItem["category"],
    urgent: Boolean(row.urgent),
    title: String(row.title),
    titleEn: String(row.title_en),
    body: String(row.body),
    bodyEn: String(row.body_en),
    createdAt: String(row.created_at),
    readBy: Array.isArray(row.read_by) ? (row.read_by as string[]) : [],
  };
}

export function getStorageMode(): "postgres" | "local_file" {
  return getPostgresUrl() ? "postgres" : "local_file";
}

export async function findUserByUsername(username: string): Promise<UserRecord | null> {
  const normalized = username.trim().toLowerCase();
  const sql = await ensurePgSchema();
  if (sql) {
    const rows = await sql`
      SELECT * FROM decanat_users WHERE LOWER(username) = ${normalized} LIMIT 1
    `;
    return rows[0] ? mapPgUser(rows[0]) : null;
  }
  const db = readLocalDb();
  return db.users.find((u) => u.username.toLowerCase() === normalized) ?? null;
}

export async function findUserById(userId: string): Promise<UserRecord | null> {
  const sql = await ensurePgSchema();
  if (sql) {
    const rows = await sql`
      SELECT * FROM decanat_users WHERE id = ${userId} LIMIT 1
    `;
    return rows[0] ? mapPgUser(rows[0]) : null;
  }
  const db = readLocalDb();
  return db.users.find((u) => u.id === userId) ?? null;
}

export async function listStudentsPublic(): Promise<PublicUser[]> {
  const sql = await ensurePgSchema();
  if (sql) {
    const rows = await sql`
      SELECT * FROM decanat_users WHERE role = 'student' ORDER BY full_name ASC
    `;
    return rows.map((r) => stripPassword(mapPgUser(r)));
  }
  const db = readLocalDb();
  return db.users.filter((u) => u.role === "student").map(stripPassword);
}

export async function getScheduleForGroup(groupCode: string): Promise<ScheduleItem[]> {
  const sql = await ensurePgSchema();
  if (sql) {
    const rows = await sql`
      SELECT * FROM decanat_schedule
      WHERE group_code = ${groupCode}
      ORDER BY day_index ASC, start_time ASC
    `;
    return rows.map(mapPgSchedule);
  }
  const db = readLocalDb();
  return db.schedule
    .filter((s) => s.groupCode === groupCode)
    .sort((a, b) => a.dayIndex - b.dayIndex || a.startTime.localeCompare(b.startTime));
}

export async function getAllSchedule(): Promise<ScheduleItem[]> {
  const sql = await ensurePgSchema();
  if (sql) {
    const rows = await sql`
      SELECT * FROM decanat_schedule
      ORDER BY group_code ASC, day_index ASC, start_time ASC
    `;
    return rows.map(mapPgSchedule);
  }
  const db = readLocalDb();
  return [...db.schedule].sort(
    (a, b) =>
      a.groupCode.localeCompare(b.groupCode) ||
      a.dayIndex - b.dayIndex ||
      a.startTime.localeCompare(b.startTime)
  );
}

export async function updateScheduleItem(
  id: string,
  patch: {
    status: ScheduleStatus;
    room: string;
    changeNote?: string;
    changeNoteEn?: string;
  }
): Promise<ScheduleItem | null> {
  const now = new Date().toISOString();
  const sql = await ensurePgSchema();
  if (sql) {
    const existingRows = await sql`SELECT * FROM decanat_schedule WHERE id = ${id} LIMIT 1`;
    if (!existingRows[0]) return null;
    const existing = mapPgSchedule(existingRows[0]);
    const originalRoom = existing.originalRoom ?? existing.room;

    const updated = await sql`
      UPDATE decanat_schedule
      SET status = ${patch.status},
          room = ${patch.room},
          original_room = ${originalRoom},
          change_note = ${patch.changeNote ?? null},
          change_note_en = ${patch.changeNoteEn ?? null},
          updated_at = ${now}
      WHERE id = ${id}
      RETURNING *
    `;
    return updated[0] ? mapPgSchedule(updated[0]) : null;
  }

  const db = readLocalDb();
  const item = db.schedule.find((s) => s.id === id);
  if (!item) return null;
  if (!item.originalRoom && item.room !== patch.room) {
    item.originalRoom = item.room;
  }
  item.status = patch.status;
  item.room = patch.room;
  item.changeNote = patch.changeNote;
  item.changeNoteEn = patch.changeNoteEn;
  item.updatedAt = now;
  writeLocalDb(db);
  return item;
}

export async function getGradesForStudent(studentId: string): Promise<GradeItem[]> {
  const sql = await ensurePgSchema();
  if (sql) {
    const rows = await sql`
      SELECT * FROM decanat_grades
      WHERE student_id = ${studentId}
      ORDER BY semester DESC, id ASC
    `;
    return rows.map(mapPgGrade);
  }
  const db = readLocalDb();
  return db.grades
    .filter((g) => g.studentId === studentId)
    .sort((a, b) => b.semester - a.semester);
}

export async function getRequestsForStudent(
  studentId: string
): Promise<CertificateRequest[]> {
  const sql = await ensurePgSchema();
  if (sql) {
    const rows = await sql`
      SELECT * FROM decanat_requests
      WHERE student_id = ${studentId}
      ORDER BY created_at DESC
    `;
    return rows.map(mapPgRequest);
  }
  const db = readLocalDb();
  return db.requests
    .filter((r) => r.studentId === studentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAllRequests(): Promise<CertificateRequest[]> {
  const sql = await ensurePgSchema();
  if (sql) {
    const rows = await sql`
      SELECT * FROM decanat_requests
      ORDER BY created_at DESC
    `;
    return rows.map(mapPgRequest);
  }
  const db = readLocalDb();
  return [...db.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRequestById(
  id: string
): Promise<CertificateRequest | null> {
  const sql = await ensurePgSchema();
  if (sql) {
    const rows = await sql`
      SELECT * FROM decanat_requests WHERE id = ${id} LIMIT 1
    `;
    return rows[0] ? mapPgRequest(rows[0]) : null;
  }
  const db = readLocalDb();
  return db.requests.find((r) => r.id === id) ?? null;
}

export async function createRequest(
  req: CertificateRequest
): Promise<CertificateRequest> {
  const sql = await ensurePgSchema();
  if (sql) {
    const rows = await sql`
      INSERT INTO decanat_requests (
        id, student_id, student_name, group_code, type_code, title, title_en,
        purpose, delivery_format, status, staff_comment, verification_code, created_at, updated_at
      ) VALUES (
        ${req.id}, ${req.studentId}, ${req.studentName}, ${req.groupCode}, ${req.typeCode},
        ${req.title}, ${req.titleEn}, ${req.purpose}, ${req.deliveryFormat}, ${req.status},
        ${req.staffComment ?? null}, ${req.verificationCode}, ${req.createdAt}, ${req.updatedAt}
      )
      RETURNING *
    `;
    return mapPgRequest(rows[0]);
  }
  const db = readLocalDb();
  db.requests.unshift(req);
  writeLocalDb(db);
  return req;
}

export async function updateRequestStatus(
  id: string,
  status: RequestStatus,
  staffComment?: string
): Promise<CertificateRequest | null> {
  const now = new Date().toISOString();
  const sql = await ensurePgSchema();
  if (sql) {
    const rows = await sql`
      UPDATE decanat_requests
      SET status = ${status},
          staff_comment = ${staffComment ?? null},
          updated_at = ${now}
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0] ? mapPgRequest(rows[0]) : null;
  }
  const db = readLocalDb();
  const found = db.requests.find((r) => r.id === id);
  if (!found) return null;
  found.status = status;
  if (staffComment !== undefined) {
    found.staffComment = staffComment;
  }
  found.updatedAt = now;
  writeLocalDb(db);
  return found;
}

export async function getNotificationsForUser(
  userId: string,
  role: "student" | "staff",
  groupCode?: string
): Promise<NotificationItem[]> {
  const sql = await ensurePgSchema();
  let items: NotificationItem[];
  if (sql) {
    const rows = await sql`
      SELECT * FROM decanat_notifications ORDER BY created_at DESC
    `;
    items = rows.map(mapPgNotification);
  } else {
    const db = readLocalDb();
    items = [...db.notifications].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  if (role === "staff") {
    return items;
  }

  return items.filter((n) => {
    if (n.targetStudentId) return n.targetStudentId === userId;
    if (n.targetGroup) return n.targetGroup === groupCode;
    return true;
  });
}

export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const sql = await ensurePgSchema();
  if (sql) {
    const rows = await sql`
      SELECT read_by FROM decanat_notifications WHERE id = ${notificationId} LIMIT 1
    `;
    if (!rows[0]) return false;
    const readBy: string[] = Array.isArray(rows[0].read_by)
      ? (rows[0].read_by as string[])
      : [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      await sql`
        UPDATE decanat_notifications
        SET read_by = ${JSON.stringify(readBy)}::jsonb
        WHERE id = ${notificationId}
      `;
    }
    return true;
  }
  const db = readLocalDb();
  const item = db.notifications.find((n) => n.id === notificationId);
  if (!item) return false;
  if (!item.readBy.includes(userId)) {
    item.readBy.push(userId);
    writeLocalDb(db);
  }
  return true;
}

export async function createNotification(
  notification: NotificationItem
): Promise<NotificationItem> {
  const sql = await ensurePgSchema();
  if (sql) {
    const rows = await sql`
      INSERT INTO decanat_notifications (
        id, target_student_id, target_group, category, urgent,
        title, title_en, body, body_en, created_at, read_by
      ) VALUES (
        ${notification.id}, ${notification.targetStudentId}, ${notification.targetGroup},
        ${notification.category}, ${notification.urgent},
        ${notification.title}, ${notification.titleEn},
        ${notification.body}, ${notification.bodyEn},
        ${notification.createdAt}, ${JSON.stringify(notification.readBy)}::jsonb
      )
      RETURNING *
    `;
    return mapPgNotification(rows[0]);
  }
  const db = readLocalDb();
  db.notifications.unshift(notification);
  writeLocalDb(db);
  return notification;
}
