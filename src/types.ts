export interface Student {
  id: string; // Unique internal ID, never name or SBD
  order?: number; // STT in original imported Excel file
  fullName: string;
  gender: 'Nam' | 'Nữ' | 'Khác' | string;
  dob?: string; // YYYY-MM-DD or DD/MM/YYYY
  parentPhone?: string;
  parentName?: string;
  address?: string;
  isBoarding: boolean; // Bán trú
  usesBus: boolean; // Xe bus
  notes?: string; // Ghi chú nội bộ
  createdAt: string;
  updatedAt: string;
}

export interface ClassInfo {
  schoolName: string;
  className: string;
  academicYear?: string;
  schoolYear?: string;
  teacherName: string;
  homeroomTeacher?: string;
  teacherPhone?: string;
  teacherEmail?: string;
  updatedAt?: string;
}

export type ClassSettings = ClassInfo;

export type AttendanceSession = 'morning' | 'afternoon';
export type AttendanceStatus = 'present' | 'excused' | 'unexcused' | 'late';

export interface AttendanceRecord {
  id: string; // Unique composite key: `${studentId}_${date}_${session}`
  studentId: string;
  date: string; // YYYY-MM-DD
  session: AttendanceSession;
  status: AttendanceStatus;
  reason?: string;
  recordedAt: string;
}

export interface AssessmentBatch {
  id: string;
  name: string; // e.g. "Khảo sát đầu năm", "Giữa kỳ 1"
  semester: string; // "Học kỳ 1", "Học kỳ 2"
  subjects: string[]; // ["Toán", "Ngữ văn", "Tiếng Anh", "Vật lý", "Hóa học"]
  date: string;
  notes?: string;
  createdAt: string;
}

export interface AssessmentScore {
  id: string; // Unique key: `${batchId}_${studentId}_${subject}`
  batchId: string;
  studentId: string;
  subject: string;
  score: number | null; // null represents "—" (no score / blank)
  rawScore?: string; // Original string representation e.g. "8.5"
  comment?: string;
  updatedAt: string;
}

export interface AssessmentImportLog {
  id: string;
  batchId: string;
  fileName: string;
  importedAt: string;
  matchedCount: number;
  needCheckCount: number;
  unmatchedCount: number;
  missingCount: number;
}

export interface QuickViolationNote {
  title: string;
  points: number;
}

export interface ViolationTemplate {
  id: string;
  title: string;
  defaultPoints: number; // Điểm trừ mặc định
  category: string;
  order: number;
}

export interface ViolationRecord {
  id: string;
  studentId: string;
  title: string;
  date: string; // YYYY-MM-DD
  session?: AttendanceSession | 'all_day';
  pointsDeducted: number;
  isPublic: boolean; // Hiển thị trên Sổ liên lạc phụ huynh
  notes?: string;
  createdAt: string;
}

export interface CompetitionTransaction {
  id: string;
  studentId?: string; // Optional: specific student or entire class
  type: 'plus' | 'minus';
  points: number;
  month: string; // YYYY-MM
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface ParentToken {
  id?: string;
  token: string;
  studentId: string;
  status: 'active' | 'revoked';
  teacherNote?: string;
  createdAt: string;
  revokedAt?: string;
}

export type ParentPortalToken = ParentToken;

export interface ParentStudentData {
  student: Student;
  classInfo: {
    className: string;
    academicYear: string;
    teacherName: string;
    teacherPhone?: string;
    schoolName?: string;
  };
  teacherNote?: string;
  attendance: AttendanceRecord[];
  assessments: {
    batch: AssessmentBatch;
    scores: Record<string, number | null>;
  }[];
  violations: ViolationRecord[];
}

export type EmulationRank = 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';

/**
 * Emulation score calculation rule:
 * Initial month score: 100
 * finalScore = 100 + sum(plus) - sum(minus)
 * Ranks:
 * 90 - 100: Tốt
 * 80 - 89: Khá
 * 50 - 79: Đạt
 * < 50: Chưa đạt
 */
export function calculateEmulationRank(score: number): EmulationRank {
  if (score >= 90) return 'Tốt';
  if (score >= 80) return 'Khá';
  if (score >= 50) return 'Đạt';
  return 'Chưa đạt';
}
