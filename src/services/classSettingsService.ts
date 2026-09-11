import { storage } from './storage';
import { ClassInfo, ClassSettings } from '../types';

const COLLECTION = 'class_settings';
const DOC_ID = 'current_class';

const DEFAULT_SETTINGS: ClassInfo = {
  schoolName: 'THPT Chuyên',
  className: '12A1',
  academicYear: '2024 - 2025',
  schoolYear: '2024 - 2025',
  teacherName: 'Nguyễn Văn Minh',
  homeroomTeacher: 'Nguyễn Văn Minh',
  teacherPhone: '0912345678',
  teacherEmail: 'minh.gvcn@school.edu.vn',
  updatedAt: new Date().toISOString(),
};

export const classSettingsService = {
  async getInfo(): Promise<ClassInfo> {
    const data = await storage.getSingleDoc<ClassInfo>(COLLECTION, DOC_ID, DEFAULT_SETTINGS);
    return {
      ...DEFAULT_SETTINGS,
      ...data,
      className: data.className || DEFAULT_SETTINGS.className,
      teacherName: data.teacherName || data.homeroomTeacher || DEFAULT_SETTINGS.teacherName,
      academicYear: data.academicYear || data.schoolYear || DEFAULT_SETTINGS.academicYear,
    };
  },

  async updateInfo(info: Partial<ClassInfo>): Promise<ClassInfo> {
    const current = await this.getInfo();
    const toSave: ClassInfo = {
      ...current,
      ...info,
      homeroomTeacher: info.teacherName || current.teacherName,
      schoolYear: info.academicYear || current.academicYear,
      updatedAt: new Date().toISOString(),
    };
    return await storage.setSingleDoc<ClassInfo>(COLLECTION, DOC_ID, toSave);
  },

  async getSettings(): Promise<ClassSettings> {
    return await this.getInfo();
  },

  async saveSettings(settings: ClassSettings): Promise<ClassSettings> {
    return await this.updateInfo(settings);
  },
};
