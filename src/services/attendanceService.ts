import { storage } from './storage';
import { AttendanceRecord, AttendanceSession, AttendanceStatus } from '../types';

const COLLECTION = 'attendance';

export const attendanceService = {
  async getAll(): Promise<AttendanceRecord[]> {
    return await storage.getCollection<AttendanceRecord>(COLLECTION);
  },

  async getByDateAndSession(date: string, session: AttendanceSession): Promise<AttendanceRecord[]> {
    const list = await storage.getCollection<AttendanceRecord>(COLLECTION);
    return list.filter((r) => r.date === date && r.session === session);
  },

  async getHistoryByStudent(studentId: string): Promise<AttendanceRecord[]> {
    const list = await storage.getCollection<AttendanceRecord>(COLLECTION);
    return list
      .filter((r) => r.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  async saveRecord(
    studentId: string,
    date: string,
    session: AttendanceSession,
    status: AttendanceStatus,
    reason?: string
  ): Promise<AttendanceRecord> {
    const id = `${studentId}_${date}_${session}`;
    const record: AttendanceRecord = {
      id,
      studentId,
      date,
      session,
      status,
      reason: reason || '',
      recordedAt: new Date().toISOString(),
    };
    return await storage.saveItem<AttendanceRecord>(COLLECTION, record);
  },

  async saveBatch(records: AttendanceRecord[]): Promise<void> {
    // Ensure all have valid deterministic composite keys to prevent duplicates
    const sanitized = records.map((r) => ({
      ...r,
      id: `${r.studentId}_${r.date}_${r.session}`,
      recordedAt: new Date().toISOString(),
    }));
    await storage.saveBatch<AttendanceRecord>(COLLECTION, sanitized);
  },

  async deleteRecord(studentId: string, date: string, session: AttendanceSession): Promise<void> {
    const id = `${studentId}_${date}_${session}`;
    await storage.deleteItem(COLLECTION, id);
  },
};
