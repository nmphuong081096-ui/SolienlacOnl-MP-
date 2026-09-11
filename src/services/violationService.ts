import { storage } from './storage';
import { ViolationRecord, ViolationTemplate, QuickViolationNote } from '../types';

export const DEFAULT_QUICK_VIOLATION_NOTES: QuickViolationNote[] = [
  { title: 'Không thuộc bài', points: 2 },
  { title: 'Không làm bài tập', points: 2 },
  { title: 'Nói chuyện riêng', points: 1 },
  { title: 'Sử dụng điện thoại', points: 3 },
  { title: 'Đi học muộn', points: 1 },
  { title: 'Không mặc đồng phục', points: 1 },
  { title: 'Mất trật tự', points: 1 },
  { title: 'Quên khăn quàng / thẻ HS', points: 1 },
  { title: 'Ngủ gật trong giờ', points: 1 },
  { title: 'Ăn quà vặt trong lớp', points: 1 },
  { title: 'Không mang sách vở', points: 1 },
  { title: 'Bỏ tiết', points: 5 },
];

const VIOLATIONS_COLLECTION = 'violations';
const TEMPLATES_COLLECTION = 'violation_templates';

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return prefix + '_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return prefix + '_' + Date.now().toString(36);
}

export const violationService = {
  // Violation Records
  async getAll(): Promise<ViolationRecord[]> {
    const list = await storage.getCollection<ViolationRecord>(VIOLATIONS_COLLECTION);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  },

  async getByStudent(studentId: string, onlyPublic = false): Promise<ViolationRecord[]> {
    const list = await this.getAll();
    return list.filter((r) => r.studentId === studentId && (!onlyPublic || r.isPublic));
  },

  async addRecord(data: Omit<ViolationRecord, 'id' | 'createdAt'>): Promise<ViolationRecord> {
    const newRecord: ViolationRecord = {
      ...data,
      id: generateId('vln'),
      createdAt: new Date().toISOString(),
    };
    return await storage.saveItem<ViolationRecord>(VIOLATIONS_COLLECTION, newRecord);
  },

  async updateRecord(record: ViolationRecord): Promise<ViolationRecord> {
    return await storage.saveItem<ViolationRecord>(VIOLATIONS_COLLECTION, record);
  },

  async deleteRecord(id: string): Promise<void> {
    await storage.deleteItem(VIOLATIONS_COLLECTION, id);
  },

  // Templates (fully editable by teacher, not locked/hardcoded)
  async getTemplates(): Promise<ViolationTemplate[]> {
    const list = await storage.getCollection<ViolationTemplate>(TEMPLATES_COLLECTION);
    return list.sort((a, b) => a.order - b.order);
  },

  async addTemplate(data: Omit<ViolationTemplate, 'id'>): Promise<ViolationTemplate> {
    const newTemplate: ViolationTemplate = {
      ...data,
      id: generateId('tpl'),
    };
    return await storage.saveItem<ViolationTemplate>(TEMPLATES_COLLECTION, newTemplate);
  },

  async updateTemplate(template: ViolationTemplate): Promise<ViolationTemplate> {
    return await storage.saveItem<ViolationTemplate>(TEMPLATES_COLLECTION, template);
  },

  async deleteTemplate(id: string): Promise<void> {
    await storage.deleteItem(TEMPLATES_COLLECTION, id);
  },

  async saveAllTemplates(templates: ViolationTemplate[]): Promise<void> {
    await storage.saveBatch<ViolationTemplate>(TEMPLATES_COLLECTION, templates);
  },

  // Quick infraction notes with points
  async getQuickNotes(): Promise<QuickViolationNote[]> {
    const doc = await storage.getSingleDoc<{
      notes?: (string | QuickViolationNote)[];
      quickNotes?: (QuickViolationNote | string)[];
    }>('class_settings', 'violation_quick_notes', {
      quickNotes: DEFAULT_QUICK_VIOLATION_NOTES,
    });

    const defaultMap = new Map(DEFAULT_QUICK_VIOLATION_NOTES.map((n) => [n.title.toLowerCase(), n.points]));

    if (doc?.quickNotes && Array.isArray(doc.quickNotes) && doc.quickNotes.length > 0) {
      return doc.quickNotes.map((item: any) => {
        if (typeof item === 'string') {
          return {
            title: item,
            points: defaultMap.get(item.toLowerCase()) ?? 2,
          };
        }
        return {
          title: item?.title || 'Lỗi vi phạm',
          points: typeof item?.points === 'number' ? item.points : (defaultMap.get((item?.title || '').toLowerCase()) ?? 2),
        };
      });
    }

    if (doc?.notes && Array.isArray(doc.notes) && doc.notes.length > 0) {
      return doc.notes.map((item: any) => {
        if (typeof item === 'string') {
          return {
            title: item,
            points: defaultMap.get(item.toLowerCase()) ?? 2,
          };
        }
        return {
          title: item?.title || 'Lỗi vi phạm',
          points: typeof item?.points === 'number' ? item.points : (defaultMap.get((item?.title || '').toLowerCase()) ?? 2),
        };
      });
    }

    return DEFAULT_QUICK_VIOLATION_NOTES;
  },

  async saveQuickNotes(notes: QuickViolationNote[]): Promise<void> {
    await storage.setSingleDoc('class_settings', 'violation_quick_notes', {
      quickNotes: notes,
      notes: notes.map((n) => n.title),
    });
  },
};
