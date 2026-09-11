import { storage } from './storage';
import { AssessmentBatch, AssessmentScore, AssessmentImportLog } from '../types';

const BATCHES_COLLECTION = 'assessment_batches';
const SCORES_COLLECTION = 'assessment_scores';
const LOGS_COLLECTION = 'assessment_logs';

function generateBatchId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'batch_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return 'batch_' + Date.now().toString(36);
}

export const assessmentService = {
  // Batches
  async getBatches(): Promise<AssessmentBatch[]> {
    const batches = await storage.getCollection<AssessmentBatch>(BATCHES_COLLECTION);
    return batches.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createBatch(data: Omit<AssessmentBatch, 'id' | 'createdAt'>): Promise<AssessmentBatch> {
    const batch: AssessmentBatch = {
      ...data,
      id: generateBatchId(),
      createdAt: new Date().toISOString(),
    };
    return await storage.saveItem<AssessmentBatch>(BATCHES_COLLECTION, batch);
  },

  async updateBatch(batch: AssessmentBatch): Promise<AssessmentBatch> {
    return await storage.saveItem<AssessmentBatch>(BATCHES_COLLECTION, batch);
  },

  async deleteBatch(batchId: string): Promise<void> {
    // Delete batch definition
    await storage.deleteItem(BATCHES_COLLECTION, batchId);

    // Delete all associated scores
    const allScores = await storage.getCollection<AssessmentScore>(SCORES_COLLECTION);
    const scoresToDelete = allScores.filter((s) => s.batchId === batchId);
    for (const score of scoresToDelete) {
      await storage.deleteItem(SCORES_COLLECTION, score.id);
    }

    // Delete all associated import logs
    const allLogs = await storage.getCollection<AssessmentImportLog>(LOGS_COLLECTION);
    const logsToDelete = allLogs.filter((l) => l.batchId === batchId);
    for (const log of logsToDelete) {
      await storage.deleteItem(LOGS_COLLECTION, log.id);
    }
  },

  async deleteImportLog(logId: string): Promise<void> {
    await storage.deleteItem(LOGS_COLLECTION, logId);
  },

  // Scores
  async getScoresByBatch(batchId: string): Promise<AssessmentScore[]> {
    const scores = await storage.getCollection<AssessmentScore>(SCORES_COLLECTION);
    return scores.filter((s) => s.batchId === batchId);
  },

  async getScoresByStudent(studentId: string): Promise<{ batch: AssessmentBatch; scores: AssessmentScore[] }[]> {
    const batches = await this.getBatches();
    const allScores = await storage.getCollection<AssessmentScore>(SCORES_COLLECTION);
    const studentScores = allScores.filter((s) => s.studentId === studentId);

    const result: { batch: AssessmentBatch; scores: AssessmentScore[] }[] = [];
    for (const batch of batches) {
      const scoresForBatch = studentScores.filter((s) => s.batchId === batch.id);
      if (scoresForBatch.length > 0) {
        result.push({ batch, scores: scoresForBatch });
      }
    }
    return result;
  },

  async saveScore(
    batchId: string,
    studentId: string,
    subject: string,
    score: number | null,
    comment?: string
  ): Promise<AssessmentScore> {
    const id = `${batchId}_${studentId}_${encodeURIComponent(subject)}`;
    const scoreRecord: AssessmentScore = {
      id,
      batchId,
      studentId,
      subject,
      score,
      rawScore: score !== null ? String(score) : '—',
      comment: comment || '',
      updatedAt: new Date().toISOString(),
    };
    return await storage.saveItem<AssessmentScore>(SCORES_COLLECTION, scoreRecord);
  },

  async saveScoresBatch(scores: Omit<AssessmentScore, 'id' | 'updatedAt'>[]): Promise<void> {
    const now = new Date().toISOString();
    const records: AssessmentScore[] = scores.map((s) => ({
      ...s,
      id: `${s.batchId}_${s.studentId}_${encodeURIComponent(s.subject)}`,
      rawScore: s.score !== null ? String(s.score) : '—',
      updatedAt: now,
    }));
    await storage.saveBatch<AssessmentScore>(SCORES_COLLECTION, records);
  },

  async deleteScore(batchId: string, studentId: string, subject: string): Promise<void> {
    const id = `${batchId}_${studentId}_${encodeURIComponent(subject)}`;
    await storage.deleteItem(SCORES_COLLECTION, id);
  },

  // Import Logs
  async getImportLogs(batchId: string): Promise<AssessmentImportLog[]> {
    const logs = await storage.getCollection<AssessmentImportLog>(LOGS_COLLECTION);
    return logs
      .filter((l) => l.batchId === batchId)
      .sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  },

  async saveImportLog(log: Omit<AssessmentImportLog, 'id' | 'importedAt'>): Promise<AssessmentImportLog> {
    const newLog: AssessmentImportLog = {
      ...log,
      id: 'log_' + Date.now().toString(36),
      importedAt: new Date().toISOString(),
    };
    return await storage.saveItem<AssessmentImportLog>(LOGS_COLLECTION, newLog);
  },
};
