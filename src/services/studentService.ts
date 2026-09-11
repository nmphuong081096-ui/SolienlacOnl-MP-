import { storage } from './storage';
import { Student } from '../types';

const COLLECTION = 'students';

function generateUniqueId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'std_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return 'std_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

export const studentService = {
  async getAll(): Promise<Student[]> {
    const list = await storage.getCollection<Student>(COLLECTION);
    // Sort strictly by original input file order (order), falling back to createdAt
    return list.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });
  },

  async getById(id: string): Promise<Student | null> {
    const list = await storage.getCollection<Student>(COLLECTION);
    return list.find((s) => s.id === id) || null;
  },

  async add(data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
    const list = await storage.getCollection<Student>(COLLECTION);
    const now = new Date().toISOString();
    const newStudent: Student = {
      ...data,
      order: data.order !== undefined ? data.order : list.length + 1,
      id: generateUniqueId(),
      createdAt: now,
      updatedAt: now,
    };
    return await storage.saveItem<Student>(COLLECTION, newStudent);
  },

  async update(student: Student): Promise<Student> {
    const updated: Student = {
      ...student,
      updatedAt: new Date().toISOString(),
    };
    return await storage.saveItem<Student>(COLLECTION, updated);
  },

  async delete(id: string): Promise<void> {
    await storage.deleteItem(COLLECTION, id);
  },

  async deleteAll(): Promise<void> {
    await storage.deleteAll(COLLECTION);
  },

  async importBatch(students: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Student[]> {
    const now = new Date().toISOString();
    const newItems: Student[] = students.map((s, idx) => ({
      ...s,
      order: s.order !== undefined ? s.order : idx + 1,
      id: generateUniqueId(),
      createdAt: now,
      updatedAt: now,
    }));
    await storage.saveBatch<Student>(COLLECTION, newItems);
    return newItems;
  },
};
