import { storage } from './storage';
import { CompetitionTransaction, calculateEmulationRank, EmulationRank } from '../types';

const COLLECTION = 'competition_transactions';

function generateTxId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'ctx_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return 'ctx_' + Date.now().toString(36);
}

export interface MonthSummary {
  month: string;
  baseScore: number;
  totalPlus: number;
  totalMinus: number;
  finalScore: number;
  rank: EmulationRank;
  transactions: CompetitionTransaction[];
}

export const competitionService = {
  async getAll(): Promise<CompetitionTransaction[]> {
    const list = await storage.getCollection<CompetitionTransaction>(COLLECTION);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getByMonth(month: string, studentId?: string): Promise<CompetitionTransaction[]> {
    const list = await this.getAll();
    return list.filter((t) => {
      const matchMonth = t.month === month;
      if (!matchMonth) return false;
      if (studentId) {
        // Transactions can be for specific student or whole class
        return !t.studentId || t.studentId === studentId;
      }
      return true;
    });
  },

  async addTransaction(
    data: Omit<CompetitionTransaction, 'id' | 'createdAt'>
  ): Promise<CompetitionTransaction> {
    const tx: CompetitionTransaction = {
      ...data,
      id: generateTxId(),
      createdAt: new Date().toISOString(),
    };
    return await storage.saveItem<CompetitionTransaction>(COLLECTION, tx);
  },

  async deleteTransaction(id: string): Promise<void> {
    await storage.deleteItem(COLLECTION, id);
  },

  async getMonthlySummary(month: string, studentId?: string): Promise<MonthSummary> {
    const transactions = await this.getByMonth(month, studentId);
    let totalPlus = 0;
    let totalMinus = 0;

    for (const t of transactions) {
      if (t.type === 'plus') {
        totalPlus += Number(t.points) || 0;
      } else if (t.type === 'minus') {
        totalMinus += Number(t.points) || 0;
      }
    }

    const baseScore = 100;
    const finalScore = baseScore + totalPlus - totalMinus;
    const rank = calculateEmulationRank(finalScore);

    return {
      month,
      baseScore,
      totalPlus,
      totalMinus,
      finalScore,
      rank,
      transactions,
    };
  },
};
