import { storage } from './storage';
import {
  ParentToken,
  ParentStudentData,
  Student,
  AttendanceRecord,
  AssessmentBatch,
  AssessmentScore,
  ViolationRecord,
  ClassInfo
} from '../types';

const COLLECTION = 'parent_tokens';

function generateSecureToken(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return 'ptk_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export const parentPortalService = {
  async getAll(): Promise<ParentToken[]> {
    const list = await storage.getCollection<ParentToken & { id: string }>(COLLECTION);
    return list;
  },

  async getTokenByStudent(studentId: string): Promise<ParentToken | null> {
    const all = await this.getAll();
    const tokenObj = all.find((t) => t.studentId === studentId && t.status === 'active');
    return tokenObj || null;
  },

  async getOrCreateToken(studentId: string): Promise<ParentToken> {
    const existing = await this.getTokenByStudent(studentId);
    if (existing) {
      return existing;
    }
    return await this.createToken(studentId);
  },

  async getByToken(token: string): Promise<ParentToken | null> {
    if (!token || token.trim() === '') return null;
    const all = await this.getAll();
    const found = all.find((t) => t.token === token.trim() && t.status === 'active');
    return found || null;
  },

  async createToken(studentId: string): Promise<ParentToken> {
    // Revoke any existing active token for this student
    const all = await this.getAll();
    for (const t of all.filter((x) => x.studentId === studentId && x.status === 'active')) {
      await storage.saveItem(COLLECTION, {
        ...t,
        id: t.token,
        status: 'revoked',
        revokedAt: new Date().toISOString(),
      });
    }

    const token = generateSecureToken();
    const newToken: ParentToken & { id: string } = {
      id: token,
      token,
      studentId,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    await storage.saveItem(COLLECTION, newToken);
    return newToken;
  },

  async regenerateToken(studentId: string): Promise<ParentToken> {
    return await this.createToken(studentId);
  },

  async revokeToken(studentId: string): Promise<void> {
    const all = await this.getAll();
    const active = all.filter((t) => t.studentId === studentId && t.status === 'active');
    for (const t of active) {
      await storage.saveItem(COLLECTION, {
        ...t,
        id: t.token,
        status: 'revoked',
        revokedAt: new Date().toISOString(),
      });
    }
  },

  async updateTeacherNote(studentId: string, note: string): Promise<void> {
    const current = await this.getOrCreateToken(studentId);
    await storage.saveItem(COLLECTION, {
      ...current,
      id: current.token,
      teacherNote: note,
    });
  },

  buildParentUrl(token: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    return `${origin}${pathname}?token=${token}`;
  },

  // Gather parent student view securely for this token ONLY
  async getStudentDataByToken(token: string): Promise<ParentStudentData | null> {
    const tokenRecord = await this.getByToken(token);
    if (!tokenRecord) return null;

    const studentId = tokenRecord.studentId;

    // Load students to find this student
    const allStudents = await storage.getCollection<Student>('students');
    const student = allStudents.find((s) => s.id === studentId);
    if (!student) return null;

    // Load class settings
    const rawClass = await storage.getSingleDoc<ClassInfo>('class_settings', 'current_class', {
      schoolName: 'THPT',
      className: 'Lớp Chủ Nhiệm',
      academicYear: '2024 - 2025',
      teacherName: 'GVCN',
    });

    const classInfo = {
      className: rawClass.className || 'Lớp Chủ Nhiệm',
      academicYear: rawClass.academicYear || rawClass.schoolYear || '2024 - 2025',
      teacherName: rawClass.teacherName || rawClass.homeroomTeacher || 'GVCN',
      teacherPhone: rawClass.teacherPhone,
      schoolName: rawClass.schoolName,
    };

    // Load attendance for this student only
    const allAttendance = await storage.getCollection<AttendanceRecord>('attendance');
    const attendance = allAttendance
      .filter((a) => a.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date));

    // Load assessment batches & scores for this student only
    const batches = await storage.getCollection<AssessmentBatch>('assessment_batches');
    const allScores = await storage.getCollection<AssessmentScore>('assessment_scores');

    const assessments = batches.map((batch) => {
      const studentBatchScores = allScores.filter(
        (s) => s.batchId === batch.id && s.studentId === studentId
      );
      const scoresMap: Record<string, number | null> = {};
      for (const subj of batch.subjects) {
        const found = studentBatchScores.find((s) => s.subject === subj);
        if (found && found.score !== null && found.score !== undefined) {
          scoresMap[subj] = found.score;
        }
      }
      // Also include any other recorded subjects for this student in this batch
      for (const sc of studentBatchScores) {
        if (sc.score !== null && sc.score !== undefined && scoresMap[sc.subject] === undefined) {
          scoresMap[sc.subject] = sc.score;
        }
      }
      return {
        batch,
        scores: scoresMap,
      };
    });

    // Load violations (only public ones) for this student
    const allViolations = await storage.getCollection<ViolationRecord>('violations');
    const violations = allViolations
      .filter((v) => v.studentId === studentId && v.isPublic)
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      student,
      classInfo,
      teacherNote: tokenRecord.teacherNote,
      attendance,
      assessments,
      violations,
    };
  },
};
