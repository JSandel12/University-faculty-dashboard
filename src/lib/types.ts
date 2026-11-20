export type UserRole = "student" | "staff";

export interface StudentProfile {
  studentCardNo: string;
  faculty: string;
  facultyEn: string;
  facultyShort: string;
  program: string;
  programEn: string;
  course: number;
  groupCode: string;
  studyForm: string;
  studyFormEn: string;
  gpa: number;
  attendancePct: number;
  creditsEarned: number;
  creditsTotal: number;
  scholarshipStatus: string;
  scholarshipStatusEn: string;
  advisorName: string;
  validUntil: string;
  photoInitials: string;
  accentTone: string;
}

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  fullName: string;
  fullNameEn: string;
  email: string;
  department?: string;
  departmentEn?: string;
  profile?: StudentProfile;
}

export type PublicUser = Omit<UserRecord, "passwordHash">;

export type ScheduleStatus =
  | "normal"
  | "room_changed"
  | "teacher_replaced"
  | "online"
  | "cancelled";

export interface ScheduleItem {
  id: string;
  groupCode: string;
  dayIndex: number; // 0 = Mon .. 5 = Sat
  startTime: string;
  endTime: string;
  subject: string;
  subjectEn: string;
  kind: "lecture" | "seminar" | "language" | "exam";
  room: string;
  originalRoom?: string;
  lecturer: string;
  status: ScheduleStatus;
  changeNote?: string;
  changeNoteEn?: string;
  updatedAt: string;
}

export interface GradeItem {
  id: string;
  studentId: string;
  semester: number;
  subject: string;
  subjectEn: string;
  credits: number;
  controlType: "exam" | "credit" | "diff_credit";
  score100: number | null;
  gradeLabel: string;
  gradeLabelEn: string;
  gradeNumeric: number | null; // 2..5 or null for upcoming/pass-fail
  status: "passed" | "upcoming" | "retake_needed";
  examDate?: string;
  lecturer: string;
}

export type RequestTypeCode =
  | "study_cert"
  | "visa_cert"
  | "military_cert"
  | "retake_permit"
  | "transcript"
  | "custom_appeal";

export type RequestStatus = "submitted" | "in_review" | "ready" | "rejected";

export const DEAN_APPOINTMENT_SLOTS = [
  "10:00",
  "10:10",
  "10:20",
  "11:30",
  "14:10",
  "14:20",
  "14:30",
  "15:00",
] as const;

export interface CertificateRequest {
  id: string;
  studentId: string;
  studentName: string;
  groupCode: string;
  typeCode: RequestTypeCode;
  title: string;
  titleEn: string;
  purpose: string;
  deliveryFormat: "digital_pdf" | "paper_pickup";
  appointmentSlot?: string;
  appointmentWindow?: string;
  queueTicket?: string;
  status: RequestStatus;
  staffComment?: string;
  verificationCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  targetStudentId: string | null; // null = broadcast or group-scoped
  targetGroup: string | null; // null = all students
  category: "schedule" | "deadline" | "request" | "dean_news";
  urgent: boolean;
  title: string;
  titleEn: string;
  body: string;
  bodyEn: string;
  createdAt: string;
  readBy: string[];
}

export interface DecanatDatabase {
  users: UserRecord[];
  schedule: ScheduleItem[];
  grades: GradeItem[];
  requests: CertificateRequest[];
  notifications: NotificationItem[];
}
